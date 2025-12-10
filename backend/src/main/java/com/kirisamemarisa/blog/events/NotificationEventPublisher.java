package com.kirisamemarisa.blog.events;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import jakarta.annotation.PreDestroy;
import java.io.IOException;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArraySet;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/**
 * 简单的用户级 SSE 推送管理，用于通知（好友申请、系统通知等）。
 * key = userId
 */
@Component
public class NotificationEventPublisher {
    private static final Logger logger = LoggerFactory.getLogger(NotificationEventPublisher.class);

    private final Map<Long, Set<SseEmitter>> emitters = new ConcurrentHashMap<>();

    // Executor to decouple SSE writes from request threads so failures don't affect callers
    private final ExecutorService executor = Executors.newCachedThreadPool(r -> {
        Thread t = new Thread(r, "sse-notification-%d".formatted(Thread.currentThread().getId()));
        t.setDaemon(true);
        return t;
    });

    public SseEmitter subscribe(Long userId, Object initial) {
        SseEmitter emitter = new SseEmitter(0L);
        emitters.computeIfAbsent(userId, k -> new CopyOnWriteArraySet<>()).add(emitter);
        emitter.onCompletion(() -> remove(userId, emitter));
        emitter.onTimeout(() -> remove(userId, emitter));
        emitter.onError(e -> {
            logger.info("SSE emitter error for user {}: {}", userId, e == null ? "<null>" : e.toString());
            remove(userId, emitter);
        });
        if (initial != null) {
            try {
                emitter.send(SseEmitter.event().name("init").data(initial));
            } catch (IOException ignored) {
                logger.debug("Failed to send initial named event to user {}: connection may be closed", userId);
            } catch (Exception ex) {
                logger.warn("Unexpected error sending initial named event to user {}: {}", userId, ex.toString());
            }
            try {
                emitter.send(initial);
            } catch (IOException ignored) {
                logger.debug("Failed to send initial default event to user {}: connection may be closed", userId);
            } catch (Exception ex) {
                logger.warn("Unexpected error sending initial default event to user {}: {}", userId, ex.toString());
            }
        }
        logger.info("SSE subscribed for user {}", userId);
        return emitter;
    }

    public void sendNotification(Long userId, Object payload) {
        try {
            Set<SseEmitter> set = emitters.get(userId);
            if (set == null || set.isEmpty())
                return;

            List<SseEmitter> snapshot = new ArrayList<>(set);
            for (SseEmitter em : snapshot) {
                executor.submit(() -> {
                    try {
                        try {
                            em.send(SseEmitter.event().name("notification").data(payload));
                        } catch (IOException e) {
                            logger.debug("Failed to send named notification to user {} emitter: {}", userId, e.toString());
                            remove(userId, em);
                            return;
                        } catch (Exception e) {
                            logger.warn("Unexpected error sending named notification to user {}: {}", userId, e.toString());
                        }

                        try {
                            em.send(payload);
                        } catch (IOException e) {
                            logger.debug("Failed to send default notification to user {} emitter: {}", userId, e.toString());
                            remove(userId, em);
                        } catch (Exception e) {
                            logger.warn("Unexpected error sending default notification to user {}: {}", userId, e.toString());
                        }
                    } catch (Throwable t) {
                        logger.warn("Unhandled throwable while delivering notification to user {} emitter: {}", userId, t.toString());
                        try {
                            remove(userId, em);
                        } catch (Exception ignore) {
                        }
                    }
                });
            }
        } catch (Throwable t) {
            logger.warn("Unexpected throwable in sendNotification for user {}: {}", userId, t.toString());
        }
    }

    private void remove(Long userId, SseEmitter em) {
        Set<SseEmitter> set = emitters.get(userId);
        if (set != null) {
            set.remove(em);
            if (set.isEmpty())
                emitters.remove(userId);
        }
        logger.info("SSE removed for user {}", userId);
    }

    public boolean isOnline(Long userId) {
        Set<SseEmitter> set = emitters.get(userId);
        return set != null && !set.isEmpty();
    }

    @PreDestroy
    public void shutdown() {
        try {
            executor.shutdownNow();
        } catch (Exception ex) {
            logger.debug("Error shutting down SSE executor: {}", ex.toString());
        }
    }
}
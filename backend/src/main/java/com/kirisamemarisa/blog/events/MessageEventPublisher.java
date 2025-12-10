package com.kirisamemarisa.blog.events;

import com.kirisamemarisa.blog.dto.PrivateMessageDTO;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.io.IOException;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArraySet;

/**
 * 简单的会话级 SSE 推送管理。
 * key = 排序后两个用户ID组合: min-max
 */
@Component
public class MessageEventPublisher {

    private static final Logger logger = LoggerFactory.getLogger(MessageEventPublisher.class);
    private final Map<String, Set<SseEmitter>> emitters = new ConcurrentHashMap<>();

    public SseEmitter subscribe(Long meId, Long otherId, List<PrivateMessageDTO> initial) {
        String key = key(meId, otherId);
        SseEmitter emitter = new SseEmitter(0L); // 不超时
        emitters.computeIfAbsent(key, k -> new CopyOnWriteArraySet<>()).add(emitter);
        emitter.onCompletion(() -> remove(key, emitter));
        emitter.onTimeout(() -> remove(key, emitter));
        emitter.onError(e -> remove(key, emitter));
        try {
            emitter.send(SseEmitter.event().name("init").data(initial));
        } catch (IOException ignored) {}
        return emitter;
    }

    public void broadcast(Long aId, Long bId, List<PrivateMessageDTO> conversation) {
        String key = key(aId, bId);
        Set<SseEmitter> set = emitters.get(key);
        if (set == null) return;
        List<SseEmitter> dead = new ArrayList<>();
        for (SseEmitter em : set) {
            try {
                em.send(SseEmitter.event().name("update").data(conversation));
            } catch (IOException ioe) {
                dead.add(em);
            } catch (Exception e) {
                logger.warn("Unexpected error broadcasting message for key {}: {}", key, e.toString());
            }
        }
        for (SseEmitter d : dead) remove(key, d);
    }

    private void remove(String key, SseEmitter em) {
        Set<SseEmitter> set = emitters.get(key);
        if (set != null) {
            set.remove(em);
            if (set.isEmpty()) emitters.remove(key);
        }
    }

    private String key(Long a, Long b) {
        long min = Math.min(a, b);
        long max = Math.max(a, b);
        return min + "-" + max;
    }
}

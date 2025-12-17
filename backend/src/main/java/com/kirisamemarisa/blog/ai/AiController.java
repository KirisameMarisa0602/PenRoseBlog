package com.kirisamemarisa.blog.ai;

import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.util.Map;

@RestController
@RequestMapping("/api/ai")
public class AiController {
    private final AiClientService aiClientService;

    public AiController(AiClientService aiClientService) {
        this.aiClientService = aiClientService;
    }

    @PostMapping("/chat")
    public ResponseEntity<Map<String, Object>> chat(@RequestBody Map<String, Object> payload) {
        Object m = payload.get("message");
        String message = m == null ? null : String.valueOf(m);
        String model = null;
        Object md = payload.get("model");
        if (md != null)
            model = String.valueOf(md);
        if (message == null || message.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "message is required"));
        }
        try {
            String reply = aiClientService.chat(message, model);
            return ResponseEntity.ok(Map.of("reply", reply));
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(500).body(Map.of("error", e.getMessage()));
        }
    }

    /**
     * Chat with optional attachments (images or text). Body example:
     * {
     * "message": "explain this",
     * "attachments": [
     * {"mime":"image/png","name":"a.png","dataUrl":"data:image/png;base64,..."},
     * {"mime":"text/plain","name":"note.txt","text":"..."}
     * ]
     * }
     */
    @PostMapping(path = "/chat/attachments", consumes = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<Map<String, Object>> chatWithAttachments(@RequestBody Map<String, Object> payload) {
        Object m = payload.get("message");
        String message = m == null ? null : String.valueOf(m);
        String model = null;
        Object md = payload.get("model");
        if (md != null)
            model = String.valueOf(md);
        if (message == null || message.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "message is required"));
        }
        Object atts = payload.get("attachments");
        java.util.List<java.util.Map<String, Object>> attachments = java.util.Collections.emptyList();
        if (atts instanceof java.util.List<?> list) {
            attachments = new java.util.ArrayList<>();
            for (Object o : list) {
                if (o instanceof java.util.Map<?, ?> mm) {
                    java.util.Map<String, Object> one = new java.util.HashMap<>();
                    mm.forEach((k, v) -> one.put(String.valueOf(k), v));
                    attachments.add(one);
                }
            }
        }
        try {
            String reply = aiClientService.chatWithAttachments(message, attachments, model);
            return ResponseEntity.ok(Map.of("reply", reply));
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(500).body(Map.of("error", e.getMessage()));
        }
    }

    /**
     * True SSE endpoint that proxies upstream streaming tokens.
     * It forwards OpenAI-compatible streaming and emits text chunks to the client.
     * Supports POST for larger payloads.
     */
    @PostMapping(path = "/chat/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter chatStreamPost(@RequestBody Map<String, Object> payload) {
        SseEmitter emitter = new SseEmitter(0L);
        Object m = payload.get("message");
        String message = m == null ? null : String.valueOf(m);
        String model = null;
        Object md = payload.get("model");
        if (md != null)
            model = String.valueOf(md);

        if (message == null || message.isBlank()) {
            try {
                emitter.send(SseEmitter.event().data("{" + "\"error\":\"message is required\"" + "}"));
                emitter.complete();
            } catch (Exception e) {
                emitter.completeWithError(e);
            }
            return emitter;
        }

        // Use a separate thread to avoid blocking the servlet thread
        String finalModel = model;
        new Thread(() -> {
            try {
                aiClientService.streamChat(message, finalModel, emitter);
            } catch (Exception e) {
                emitter.completeWithError(e);
            }
        }).start();

        return emitter;
    }

    @org.springframework.web.bind.annotation.GetMapping(path = "/chat/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter chatStream(@org.springframework.web.bind.annotation.RequestParam("message") String message,
            @org.springframework.web.bind.annotation.RequestParam(value = "model", required = false) String model) {
        // Forward to POST logic for consistency, or keep as legacy
        return chatStreamPost(Map.of("message", message, "model", model != null ? model : ""));
    }
}

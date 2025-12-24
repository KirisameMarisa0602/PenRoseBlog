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
    private final com.kirisamemarisa.blog.service.BlogPostService blogPostService;

    public AiController(AiClientService aiClientService, com.kirisamemarisa.blog.service.BlogPostService blogPostService) {
        this.aiClientService = aiClientService;
        this.blogPostService = blogPostService;
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

        // Context handling
        String contextType = (String) payload.get("contextType"); // READING, EDITING, GLOBAL
        Object contextIdObj = payload.get("contextId");
        Long contextId = null;
        if (contextIdObj instanceof Number) {
            contextId = ((Number) contextIdObj).longValue();
        } else if (contextIdObj instanceof String) {
            try {
                contextId = Long.parseLong((String) contextIdObj);
            } catch (Exception e) {
            }
        }
        String contextContent = (String) payload.get("contextContent"); // For drafts

        System.out.println("[AiController] Chat Stream Request: contextType=" + contextType + ", contextId=" + contextId);

        StringBuilder systemPrompt = new StringBuilder();
        systemPrompt.append("你是一个轻社交博客文章交流网站的智能助手(Maid)。你的语气轻松、专业且乐于助人。\n");

        if ("READING".equalsIgnoreCase(contextType)) {
            systemPrompt.append("当前模式：[辅助阅读]\n");
            systemPrompt.append("你的核心任务是：\n");
            systemPrompt.append("1. 帮助用户生成文章大纲、摘要。\n");
            systemPrompt.append("2. 结合上下文解答用户关于文章内容的疑问。\n");
            systemPrompt.append("3. 解释文章中的专业术语。\n");
            
            if (contextId != null) {
                try {
                    Long currentUserId = com.kirisamemarisa.blog.common.JwtUtil.getCurrentUserId();
                    System.out.println("[AiController] Fetching blog post " + contextId + " for user " + currentUserId);
                    com.kirisamemarisa.blog.dto.BlogPostDTO post = blogPostService.getById(contextId, currentUserId);
                    if (post != null) {
                        System.out.println("[AiController] Blog post found: " + post.getTitle());
                        systemPrompt.append("\n\n[当前阅读文章上下文]\n");
                        systemPrompt.append("标题: ").append(post.getTitle()).append("\n");
                        String content = post.getContent();
                        if (content != null && content.length() > 15000) {
                            content = content.substring(0, 15000) + "...(截断)";
                        }
                        systemPrompt.append("正文: \n").append(content).append("\n");
                    } else {
                        System.out.println("[AiController] Blog post not found");
                    }
                } catch (Exception e) {
                    System.out.println("[AiController] Error fetching blog post: " + e.getMessage());
                    e.printStackTrace();
                }
            }
        } else if ("EDITING".equalsIgnoreCase(contextType)) {
            systemPrompt.append("当前模式：[辅助写作]\n");
            systemPrompt.append("你的核心任务是：\n");
            systemPrompt.append("1. 提供Markdown格式的写作示例或代码段。\n");
            systemPrompt.append("2. 对用户的草稿进行润色、续写。\n");
            systemPrompt.append("3. 建议文章结构的优化（如标题层级）。\n");
            systemPrompt.append("4. 解答用户在编辑过程中的技术或写作疑问。\n");

            if (contextContent != null && !contextContent.isBlank()) {
                System.out.println("[AiController] Using editing context, length=" + contextContent.length());
                systemPrompt.append("\n\n[用户正在编辑的文章草稿]\n");
                if (contextContent.length() > 15000) {
                    contextContent = contextContent.substring(0, 15000) + "...(截断)";
                }
                systemPrompt.append(contextContent).append("\n");
            }
        } else {
            systemPrompt.append("你能够回答关于编程、写作和本站功能的问题。请引导用户去阅读文章或开始写作。\n");
        }

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
                aiClientService.streamChat(message, systemPrompt.toString(), finalModel, emitter);
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

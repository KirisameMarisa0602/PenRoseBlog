package com.kirisamemarisa.blog.common;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.context.request.async.AsyncRequestNotUsableException;
import org.springframework.web.multipart.MaxUploadSizeExceededException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import java.util.List;
import java.util.stream.Collectors;
import java.io.IOException;

// Tomcat specific client abort exception (optional at runtime)
// Avoid compile-time dependency: reference by FQN in instanceof checks via reflection guard

@RestControllerAdvice
public class GlobalExceptionHandler {
    private static final Logger logger = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    // 参数校验异常统一处理
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ApiResponse<Void> handleValidationException(MethodArgumentNotValidException ex) {
        List<String> errors = ex.getBindingResult()
                .getFieldErrors()
                .stream()
                .map(f -> f.getField() + ": " + f.getDefaultMessage())
                .collect(Collectors.toList());
        String msg = errors.isEmpty() ? "参数校验失败" : String.join(", ", errors);
        return new ApiResponse<>(HttpStatus.BAD_REQUEST.value(), msg, null);
    }

    // 其他已知业务异常（可自定义异常类）
    @ExceptionHandler(BusinessException.class)
    public ApiResponse<Void> handleBusinessException(BusinessException ex) {
        return new ApiResponse<>(HttpStatus.BAD_REQUEST.value(), ex.getMessage(), null);
    }

    // 处理 IllegalStateException，通常用于业务逻辑校验失败
    @ExceptionHandler(IllegalStateException.class)
    public ApiResponse<Void> handleIllegalStateException(IllegalStateException ex) {
        return new ApiResponse<>(HttpStatus.BAD_REQUEST.value(), ex.getMessage(), null);
    }

    // 处理 IllegalArgumentException，通常用于参数校验失败
    @ExceptionHandler(IllegalArgumentException.class)
    public ApiResponse<Void> handleIllegalArgumentException(IllegalArgumentException ex) {
        return new ApiResponse<>(HttpStatus.BAD_REQUEST.value(), ex.getMessage(), null);
    }

    // 文件上传大小超限异常
    @ExceptionHandler(MaxUploadSizeExceededException.class)
    public ApiResponse<Void> handleMaxUploadSizeExceededException(MaxUploadSizeExceededException ex) {
        return new ApiResponse<>(HttpStatus.BAD_REQUEST.value(), "文件大小超过限制 (128MB)", null);
    }

    // 未知异常统一处理
    @ExceptionHandler(AsyncRequestNotUsableException.class)
    public Object handleAsyncNotUsable(AsyncRequestNotUsableException ex) {
        // This happens when the servlet async request for an SSE emitter has
        // become unusable (client disconnected). It is benign for the original
        // request that triggered the notification — log at debug and swallow.
        logger.debug("Async request not usable (likely SSE client disconnected): {}", ex.toString());
        return null;
    }

    // Client disconnected during SSE or streaming: treat as benign, do not log as
    // server error
    @ExceptionHandler(IOException.class)
    public Object handleIoException(IOException ex, HttpServletRequest request, HttpServletResponse response) {
        if (isSseRequest(request, response) || isClientAbort(ex)) {
            logger.debug("IO exception on streaming/SSE (likely client disconnected): {}", safeMsg(ex));
            return null;
        }
        return new ApiResponse<>(HttpStatus.INTERNAL_SERVER_ERROR.value(), "服务器内部错误", null);
    }

    @ExceptionHandler(Exception.class)
    public Object handleException(Exception ex, HttpServletRequest request, HttpServletResponse response) {
        if (isSseRequest(request, response)) {
            // Can't write JSON into an SSE response. The client likely disconnected or
            // the response is an SSE stream — set status and stop.
            try {
                response.setStatus(HttpStatus.INTERNAL_SERVER_ERROR.value());
            } catch (IllegalStateException ise) {
                logger.debug("Response already committed, cannot set status for SSE response");
            }
            return null;
        }
        logger.error("服务器内部错误", ex);
        return new ApiResponse<>(HttpStatus.INTERNAL_SERVER_ERROR.value(), "服务器内部错误", null);
    }

    private boolean isSseRequest(HttpServletRequest request, HttpServletResponse response) {
        try {
            String ct = response != null ? response.getContentType() : null;
            if (ct != null && ct.contains("text/event-stream"))
                return true;
        } catch (Exception ignore) {
        }
        try {
            String accept = request != null ? request.getHeader("Accept") : null;
            if (accept != null && accept.contains("text/event-stream"))
                return true;
        } catch (Exception ignore) {
        }
        return false;
    }

    private boolean isClientAbort(Throwable ex) {
        if (ex == null)
            return false;
        // Common messages across platforms
        String msg = safeMsg(ex).toLowerCase();
        if (msg.contains("broken pipe") || msg.contains("connection reset") || msg.contains("connection aborted"))
            return true;
        // Windows CN message seen: "你的主机中的软件中止了一个已建立的连接"
        if (safeMsg(ex).contains("你的主机中的软件中止了一个已建立的连接"))
            return true;
        // Tomcat specific ClientAbortException
        try {
            Class<?> cae = Class.forName("org.apache.catalina.connector.ClientAbortException");
            if (cae.isInstance(ex))
                return true;
        } catch (ClassNotFoundException ignore) {
        }
        return false;
    }

    private String safeMsg(Throwable t) {
        String m = t.getMessage();
        return m == null ? t.toString() : m;
    }
}

package com.kirisamemarisa.blog.common;

/**
 * 业务异常，统一用于Service层主动抛出业务错误，由全局异常处理器捕获并返回ApiResponse。
 */
public class BusinessException extends RuntimeException {
    private final int code;

    public BusinessException(String message) {
        super(message);
        this.code = 400;
    }

    public BusinessException(int code, String message) {
        super(message);
        this.code = code;
    }

    public int getCode() {
        return code;
    }
}

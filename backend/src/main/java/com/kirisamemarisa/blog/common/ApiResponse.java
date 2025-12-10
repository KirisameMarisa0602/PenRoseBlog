package com.kirisamemarisa.blog.common;

public class ApiResponse<T> {
    //状态码
    private int code;    
    
    //提示信息
    private String msg;  
    
    //数据
    private T data;        

    //无参构造
    public ApiResponse() {}

    //全参构造
    public ApiResponse(int code, String msg, T data) {
        this.code = code;
        this.msg = msg;
        this.data = data;
    }

    // Getter and Setter
    public int getCode() { return code; }
    public void setCode(int code) { this.code = code; }
    public String getMsg() { return msg; }
    public void setMsg(String msg) { this.msg = msg; }
    public T getData() { return data; }
    public void setData(T data) { this.data = data; }
}

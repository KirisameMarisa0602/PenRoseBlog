package com.kirisamemarisa.blog.dto;

import jakarta.validation.constraints.NotBlank;

public class SendVerificationCodeDTO {
    @NotBlank(message = "手机号不能为空")
    private String phoneNumber;

    // Getters and Setters
    public String getPhoneNumber() { return phoneNumber; }
    public void setPhoneNumber(String phoneNumber) { this.phoneNumber = phoneNumber; }
}

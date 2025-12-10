package com.kirisamemarisa.blog.service;

public interface VerificationCodeService {
    /**
     * Send verification code to phone number
     * @param phoneNumber phone number
     * @return true if sent successfully
     */
    boolean sendVerificationCode(String phoneNumber);

    /**
     * Verify the code
     * @param phoneNumber phone number
     * @param code verification code
     * @return true if valid
     */
    boolean verifyCode(String phoneNumber, String code);
}

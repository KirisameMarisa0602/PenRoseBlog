package com.kirisamemarisa.blog.service;

import com.kirisamemarisa.blog.dto.LoginResponseDTO;

public interface OAuth2LoginService {
    /**
     * Handle QQ OAuth2 login
     * @param code authorization code
     * @param state CSRF token
     * @return login response with token
     */
    LoginResponseDTO loginWithQQ(String code, String state);

    /**
     * Handle WeChat OAuth2 login
     * @param code authorization code
     * @param state CSRF token
     * @return login response with token
     */
    LoginResponseDTO loginWithWeChat(String code, String state);

    /**
     * Handle phone number login
     * @param phoneNumber phone number
     * @param verificationCode verification code
     * @return login response with token
     */
    LoginResponseDTO loginWithPhone(String phoneNumber, String verificationCode);
}

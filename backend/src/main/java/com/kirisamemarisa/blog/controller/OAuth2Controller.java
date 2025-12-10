package com.kirisamemarisa.blog.controller;

import com.kirisamemarisa.blog.common.ApiResponse;
import com.kirisamemarisa.blog.dto.LoginResponseDTO;
import com.kirisamemarisa.blog.dto.OAuth2LoginDTO;
import com.kirisamemarisa.blog.dto.PhoneLoginDTO;
import com.kirisamemarisa.blog.dto.SendVerificationCodeDTO;
import com.kirisamemarisa.blog.service.OAuth2LoginService;
import com.kirisamemarisa.blog.service.VerificationCodeService;
import jakarta.validation.Valid;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
public class OAuth2Controller {
    private static final Logger logger = LoggerFactory.getLogger(OAuth2Controller.class);

    @Autowired
    private OAuth2LoginService oauth2LoginService;

    @Autowired
    private VerificationCodeService verificationCodeService;

    /**
     * OAuth2 login endpoint (supports QQ and WeChat)
     */
    @PostMapping("/oauth2/login")
    public ApiResponse<LoginResponseDTO> oauth2Login(@RequestBody @Valid OAuth2LoginDTO dto) {
        logger.info("OAuth2 login request from provider: {}", dto.getProvider());
        
        LoginResponseDTO response;
        if ("QQ".equalsIgnoreCase(dto.getProvider())) {
            response = oauth2LoginService.loginWithQQ(dto.getCode(), dto.getState());
        } else if ("WECHAT".equalsIgnoreCase(dto.getProvider())) {
            response = oauth2LoginService.loginWithWeChat(dto.getCode(), dto.getState());
        } else {
            return new ApiResponse<>(400, "不支持的登录提供者", null);
        }
        
        return new ApiResponse<>(200, "登录成功", response);
    }

    /**
     * Send verification code to phone
     */
    @PostMapping("/verification-code/send")
    public ApiResponse<Void> sendVerificationCode(@RequestBody @Valid SendVerificationCodeDTO dto) {
        logger.info("Send verification code request for phone: {}", dto.getPhoneNumber());
        
        boolean success = verificationCodeService.sendVerificationCode(dto.getPhoneNumber());
        if (success) {
            return new ApiResponse<>(200, "验证码已发送", null);
        } else {
            return new ApiResponse<>(500, "验证码发送失败", null);
        }
    }

    /**
     * Phone number login with verification code
     */
    @PostMapping("/phone/login")
    public ApiResponse<LoginResponseDTO> phoneLogin(@RequestBody @Valid PhoneLoginDTO dto) {
        logger.info("Phone login request for: {}", dto.getPhoneNumber());
        
        LoginResponseDTO response = oauth2LoginService.loginWithPhone(
            dto.getPhoneNumber(), 
            dto.getVerificationCode()
        );
        
        return new ApiResponse<>(200, "登录成功", response);
    }
}

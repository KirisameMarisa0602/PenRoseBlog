package com.kirisamemarisa.blog.service;

import com.kirisamemarisa.blog.dto.ChangePasswordDTO;
import com.kirisamemarisa.blog.dto.LoginResponseDTO;
import com.kirisamemarisa.blog.dto.UserLoginDTO;
import com.kirisamemarisa.blog.dto.UserRegisterDTO;
import com.kirisamemarisa.blog.dto.UserProfileDTO;
import com.kirisamemarisa.blog.dto.UserStatsDTO;
import org.springframework.web.multipart.MultipartFile;

public interface UserService {
    void register(UserRegisterDTO dto);

    LoginResponseDTO login(UserLoginDTO dto);

    UserProfileDTO getUserProfileDTO(Long userId);

    boolean updateUserProfile(Long userId, UserProfileDTO dto);

    String getUsernameById(Long userId);

    String uploadAvatar(Long userId, MultipartFile file);

    String uploadBackground(Long userId, MultipartFile file);

    String uploadQqQrCode(Long userId, MultipartFile file);

    String uploadWechatQrCode(Long userId, MultipartFile file);

    Long registerAndReturnId(UserRegisterDTO dto);

    boolean changePassword(Long userId, ChangePasswordDTO dto);

    UserStatsDTO getUserStats(Long userId);
}

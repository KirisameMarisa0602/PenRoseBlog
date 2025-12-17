package com.kirisamemarisa.blog.controller;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import com.kirisamemarisa.blog.common.ApiResponse;
import com.kirisamemarisa.blog.dto.ChangePasswordDTO;
import com.kirisamemarisa.blog.dto.UserLoginDTO;
import com.kirisamemarisa.blog.dto.UserRegisterDTO;
import com.kirisamemarisa.blog.dto.UserProfileDTO;
import com.kirisamemarisa.blog.dto.UserStatsDTO;
import com.kirisamemarisa.blog.dto.LoginResponseDTO;
import com.kirisamemarisa.blog.service.UserService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/user")
public class UserController {
    private final UserService userService;

    public UserController(UserService userService) {
        this.userService = userService;
    }

    // 注册接口，返回新用户ID
    @PostMapping("/register")
    public ApiResponse<Long> register(@RequestBody @Valid UserRegisterDTO userRegisterDTO) {
        Long userId = userService.registerAndReturnId(userRegisterDTO);
        return new ApiResponse<>(200, "注册成功", userId);
    }

    // 登录接口
    @PostMapping("/login")
    public ApiResponse<LoginResponseDTO> login(@RequestBody @Valid UserLoginDTO userLoginDTO) {
        LoginResponseDTO resp = userService.login(userLoginDTO);
        return new ApiResponse<>(200, "登录成功", resp);
    }

    // 获取用户个人信息
    @GetMapping("/profile/{userId}")
    public ApiResponse<UserProfileDTO> getProfile(@PathVariable Long userId) {
        UserProfileDTO dto = userService.getUserProfileDTO(userId);
        if (dto == null) {
            return new ApiResponse<>(404, "用户信息不存在", null);
        }
        return new ApiResponse<>(200, "获取成功", dto);
    }

    // 更新用户个人信息
    @PutMapping("/profile/{userId}")
    public ApiResponse<Void> updateProfile(@PathVariable Long userId,
            @RequestBody @Valid UserProfileDTO userProfileDTO) {
        Long currentUserId = com.kirisamemarisa.blog.common.JwtUtil.getCurrentUserId();
        if (currentUserId == null || !currentUserId.equals(userId)) {
            return new ApiResponse<>(403, "无权修改他人资料", null);
        }
        boolean ok = userService.updateUserProfile(userId, userProfileDTO);
        return ok ? new ApiResponse<>(200, "更新成功", null)
                : new ApiResponse<>(400, "更新失败", null);
    }

    // 上传用户头像
    @PostMapping("/profile/{userId}/avatar")
    public ApiResponse<String> uploadAvatar(@PathVariable Long userId,
            @RequestParam("file") MultipartFile file) {
        Long currentUserId = com.kirisamemarisa.blog.common.JwtUtil.getCurrentUserId();
        if (currentUserId == null || !currentUserId.equals(userId)) {
            return new ApiResponse<>(403, "无权修改他人资料", null);
        }
        String url = userService.uploadAvatar(userId, file);
        return new ApiResponse<>(200, "上传成功", url);
    }

    // 上传用户背景
    @PostMapping("/profile/{userId}/background")
    public ApiResponse<String> uploadBackground(@PathVariable Long userId,
            @RequestParam("file") MultipartFile file) {
        Long currentUserId = com.kirisamemarisa.blog.common.JwtUtil.getCurrentUserId();
        if (currentUserId == null || !currentUserId.equals(userId)) {
            return new ApiResponse<>(403, "无权修改他人资料", null);
        }
        String url = userService.uploadBackground(userId, file);
        return new ApiResponse<>(200, "上传成功", url);
    }

    // 上传QQ二维码
    @PostMapping("/profile/{userId}/qq-qrcode")
    public ApiResponse<String> uploadQqQrCode(@PathVariable Long userId,
            @RequestParam("file") MultipartFile file) {
        Long currentUserId = com.kirisamemarisa.blog.common.JwtUtil.getCurrentUserId();
        if (currentUserId == null || !currentUserId.equals(userId)) {
            return new ApiResponse<>(403, "无权修改他人资料", null);
        }
        String url = userService.uploadQqQrCode(userId, file);
        return new ApiResponse<>(200, "上传成功", url);
    }

    // 上传微信二维码
    @PostMapping("/profile/{userId}/wechat-qrcode")
    public ApiResponse<String> uploadWechatQrCode(@PathVariable Long userId,
            @RequestParam("file") MultipartFile file) {
        Long currentUserId = com.kirisamemarisa.blog.common.JwtUtil.getCurrentUserId();
        if (currentUserId == null || !currentUserId.equals(userId)) {
            return new ApiResponse<>(403, "无权修改他人资料", null);
        }
        String url = userService.uploadWechatQrCode(userId, file);
        return new ApiResponse<>(200, "上传成功", url);
    }

    // 修改密码
    @PostMapping("/change-password")
    public ApiResponse<Void> changePassword(@RequestBody @Valid ChangePasswordDTO dto) {
        Long currentUserId = com.kirisamemarisa.blog.common.JwtUtil.getCurrentUserId();
        if (currentUserId == null) {
            return new ApiResponse<>(401, "未登录", null);
        }
        boolean success = userService.changePassword(currentUserId, dto);
        return success ? new ApiResponse<>(200, "密码修改成功", null)
                : new ApiResponse<>(400, "密码修改失败", null);
    }

    @GetMapping("/{userId}/stats")
    public ApiResponse<UserStatsDTO> getUserStats(@PathVariable Long userId) {
        UserStatsDTO stats = userService.getUserStats(userId);
        return new ApiResponse<>(200, "获取成功", stats);
    }
}

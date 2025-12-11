package com.kirisamemarisa.blog.service.impl;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import com.kirisamemarisa.blog.common.BusinessException;
import com.kirisamemarisa.blog.common.JwtUtil;
import com.kirisamemarisa.blog.dto.ChangePasswordDTO;
import com.kirisamemarisa.blog.dto.LoginResponseDTO;
import com.kirisamemarisa.blog.dto.UserLoginDTO;
import com.kirisamemarisa.blog.dto.UserRegisterDTO;
import com.kirisamemarisa.blog.dto.UserProfileDTO;
import com.kirisamemarisa.blog.mapper.UserMapper;
import com.kirisamemarisa.blog.mapper.UserProfileMapper;
import com.kirisamemarisa.blog.model.User;
import com.kirisamemarisa.blog.model.UserProfile;
import com.kirisamemarisa.blog.repository.UserRepository;
import com.kirisamemarisa.blog.repository.UserProfileRepository;
import com.kirisamemarisa.blog.repository.FollowRepository;
import com.kirisamemarisa.blog.repository.BlogPostRepository;
import com.kirisamemarisa.blog.service.UserService;
import com.kirisamemarisa.blog.dto.UserStatsDTO;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.File;
import java.io.IOException;
import java.util.Optional;
import java.util.UUID;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.Files;

@Service
public class UserServiceImpl implements UserService {
    private static final Logger logger = LoggerFactory.getLogger(UserServiceImpl.class);
    @Autowired
    private UserRepository userRepository;
    @Autowired
    private UserProfileRepository userProfileRepository;
    @Autowired
    private UserMapper userMapper;
    @Autowired
    private UserProfileMapper userProfileMapper;
    @Autowired
    private FollowRepository followRepository;
    @Autowired
    private BlogPostRepository blogPostRepository;

    private final BCryptPasswordEncoder passwordEncoder = new BCryptPasswordEncoder();

    @Value("${resource.avatar-location}")
    private String avatarLocation;
    @Value("${resource.background-location}")
    private String backgroundLocation;

    @Override
    @Transactional
    public void register(UserRegisterDTO dto) {
        logger.debug("register called for username={}", dto != null ? dto.getUsername() : null);
        if (dto == null)
            throw new BusinessException("请求体为空");
        String username = dto.getUsername();
        String password = dto.getPassword();
        if (username == null || !username.matches("^[A-Za-z0-9_]{5,15}$"))
            throw new BusinessException("用户名格式不合法");
        if (password == null || !password.matches("^(?=.*[A-Za-z])(?=.*\\d)[A-Za-z\\d]{8,12}$"))
            throw new BusinessException("密码格式不合法");
        if (userRepository.findByUsername(username) != null)
            throw new BusinessException("用户名已存在");
        User user = userMapper.toUser(dto);
        user.setPassword(passwordEncoder.encode(password));
        user = userRepository.save(user);
        userRepository.flush();
        // user = userRepository.findByUsername(user.getUsername()); // 重新获取托管对象，确保id有值
        // 注册后自动创建 user_profile
        UserProfile profile = new UserProfile();
        profile.setUser(user);
        profile.setNickname("Cat" + user.getId());
        userProfileRepository.save(profile);
    }

    @Override
    public LoginResponseDTO login(UserLoginDTO dto) {
        logger.debug("login attempt for username={}", dto != null ? dto.getUsername() : null);
        if (dto == null)
            throw new BusinessException("请求体为空");
        String username = dto.getUsername();
        String password = dto.getPassword();
        if (username == null || password == null)
            throw new BusinessException("用户名或密码为空");
        User dbUser = userRepository.findByUsername(username);
        if (dbUser == null)
            throw new BusinessException("用户不存在");
        if (!passwordEncoder.matches(password, dbUser.getPassword()))
            throw new BusinessException("密码错误");
        String token = JwtUtil.generateToken(dbUser.getId(), dbUser.getUsername());
        // 查询用户profile
        UserProfile profile = userProfileRepository.findById(dbUser.getId()).orElse(null);
        LoginResponseDTO resp = new LoginResponseDTO();
        resp.setToken(token);
        resp.setUserId(dbUser.getId());
        if (profile != null) {
            resp.setNickname(profile.getNickname());
            resp.setAvatarUrl(profile.getAvatarUrl());
            resp.setBackgroundUrl(profile.getBackgroundUrl());
            resp.setGender(profile.getGender());
        } else {
            resp.setNickname("");
            resp.setAvatarUrl("");
            resp.setBackgroundUrl("");
            resp.setGender(dbUser.getGender() != null ? dbUser.getGender() : "");
        }
        return resp;
    }

    @Override
    public UserProfileDTO getUserProfileDTO(Long userId) {
        logger.debug("getUserProfileDTO userId={}", userId);
        if (userId == null)
            return null;
        Optional<UserProfile> opt = userProfileRepository.findById(userId);
        return opt.map(userProfileMapper::toDTO).orElse(null);
    }

    @Override
    public boolean updateUserProfile(Long userId, UserProfileDTO dto) {
        logger.debug("updateUserProfile userId={}", userId);
        if (userId == null || dto == null)
            return false;
        Optional<User> userOpt = userRepository.findById(userId);
        if (userOpt.isEmpty())
            return false;
        User user = userOpt.get();

        UserProfile profile = userProfileRepository.findById(userId).orElseGet(() -> {
            UserProfile p = new UserProfile();
            p.setUser(user); // MapsId 会同步主键
            return p;
        });

        profile.setNickname(dto.getNickname());
        profile.setAvatarUrl(dto.getAvatarUrl());
        profile.setBackgroundUrl(dto.getBackgroundUrl());

        // 修复：同步性别字段到 User 表
        if (dto.getGender() != null) {
            user.setGender(dto.getGender());
            userRepository.save(user);
        }

        userProfileRepository.save(profile);
        return true;
    }

    @Override
    public String getUsernameById(Long userId) {
        if (userId == null)
            return null;
        return userRepository.findById(userId).map(User::getUsername).orElse(null);
    }

    @Override
    public String uploadAvatar(Long userId, MultipartFile file) {
        if (userId == null || file == null || file.isEmpty())
            throw new BusinessException("文件为空");
        String ext = org.springframework.util.StringUtils.getFilenameExtension(file.getOriginalFilename());
        String filename = UUID.randomUUID() + (ext != null ? "." + ext : "");
        Path baseDir = Paths.get(toLocalPath(avatarLocation)).toAbsolutePath().normalize();
        Path userDir = baseDir.resolve(String.valueOf(userId)).normalize();
        try {
            if (!userDir.startsWith(baseDir)) throw new BusinessException("非法的用户目录");
            Files.createDirectories(userDir);
        } catch (IOException e) {
            throw new BusinessException("头像目录创建失败");
        }
        // 路径安全校验，防止路径穿越
        if (filename.contains("..") || filename.contains("/") || filename.contains("\\")) {
            throw new BusinessException("非法文件名");
        }
        Path destPath = userDir.resolve(filename).normalize();
        try {
            File dest = destPath.toFile();
            file.transferTo(dest);
        } catch (IOException e) {
            throw new BusinessException("头像上传失败");
        }
        String url = "/avatar/" + userId + "/" + filename;
        UserProfile profile = userProfileRepository.findById(userId).orElseGet(() -> {
            UserProfile p = new UserProfile();
            p.setUser(userRepository.findById(userId).orElseThrow(() -> new BusinessException("用户不存在")));
            return p;
        });
        profile.setAvatarUrl(url);
        userProfileRepository.save(profile);
        return url;
    }

    @Override
    public String uploadBackground(Long userId, MultipartFile file) {
        if (userId == null || file == null || file.isEmpty())
            throw new BusinessException("文件为空");
        String ext = org.springframework.util.StringUtils.getFilenameExtension(file.getOriginalFilename());
        String filename = UUID.randomUUID() + (ext != null ? "." + ext : "");
        Path baseDir = Paths.get(toLocalPath(backgroundLocation)).toAbsolutePath().normalize();
        Path userDir = baseDir.resolve(String.valueOf(userId)).normalize();
        try {
            if (!userDir.startsWith(baseDir)) throw new BusinessException("非法的用户目录");
            Files.createDirectories(userDir);
        } catch (IOException e) {
            throw new BusinessException("背景目录创建失败");
        }
        // 路径安全校验，防止路径穿越
        if (filename.contains("..") || filename.contains("/") || filename.contains("\\")) {
            throw new BusinessException("非法文件名");
        }
        Path destPath = userDir.resolve(filename).normalize();
        try {
            File dest = destPath.toFile();
            file.transferTo(dest);
        } catch (IOException e) {
            throw new BusinessException("背景上传失败");
        }
        String url = "/background/" + userId + "/" + filename;
        UserProfile profile = userProfileRepository.findById(userId).orElseGet(() -> {
            UserProfile p = new UserProfile();
            p.setUser(userRepository.findById(userId).orElseThrow(() -> new BusinessException("用户不存在")));
            return p;
        });
        profile.setBackgroundUrl(url);
        userProfileRepository.save(profile);
        return url;
    }

    private String toLocalPath(String configured) {
        if (configured == null) return "";
        String v = configured;
        if (v.startsWith("file:")) v = v.substring(5);
        if (!v.endsWith(File.separator) && !v.endsWith("/")) {
            v = v + File.separator;
        }
        return v.replace('/', File.separatorChar);
    }

    @Override
    @Transactional
    public Long registerAndReturnId(UserRegisterDTO dto) {
        if (dto == null)
            throw new BusinessException("请求体为空");
        String username = dto.getUsername();
        String password = dto.getPassword();
        if (username == null || !username.matches("^[A-Za-z0-9_]{5,15}$"))
            throw new BusinessException("用户名格式不合法");
        if (password == null || !password.matches("^(?=.*[A-Za-z])(?=.*\\d)[A-Za-z\\d]{8,12}$"))
            throw new BusinessException("密码格式不合法");
        if (userRepository.findByUsername(username) != null)
            throw new BusinessException("用户名已存在");
        User user = userMapper.toUser(dto);
        user.setPassword(passwordEncoder.encode(password));
        user = userRepository.save(user);
        userRepository.flush();
        // user = userRepository.findByUsername(user.getUsername()); // 重新获取托管对象，确保id有值
        // 注册后自动创建 user_profile
        UserProfile profile = new UserProfile();
        profile.setUser(user);
        profile.setNickname("Cat" + user.getId());
        userProfileRepository.save(profile);
        return user.getId();
    }

    @Override
    @Transactional
    public boolean changePassword(Long userId, ChangePasswordDTO dto) {
        logger.debug("changePassword for userId={}", userId);
        if (userId == null || dto == null) {
            throw new BusinessException("请求参数为空");
        }
        
        Optional<User> userOpt = userRepository.findById(userId);
        if (userOpt.isEmpty()) {
            throw new BusinessException("用户不存在");
        }
        
        User user = userOpt.get();
        
        // 如果是第三方登录用户（没有密码），不允许修改密码
        if (user.getPassword() == null || user.getPassword().isEmpty()) {
            throw new BusinessException("第三方登录用户无法修改密码");
        }
        
        // 验证旧密码
        if (!passwordEncoder.matches(dto.getOldPassword(), user.getPassword())) {
            throw new BusinessException("旧密码错误");
        }
        
        // 设置新密码
        user.setPassword(passwordEncoder.encode(dto.getNewPassword()));
        userRepository.save(user);
        
        logger.info("Password changed successfully for userId={}", userId);
        return true;
    }

    @Override
    public UserStatsDTO getUserStats(Long userId) {
        User user = userRepository.findById(userId).orElse(null);
        if (user == null) {
            return new UserStatsDTO(0, 0, 0);
        }
        long following = followRepository.countByFollower(user);
        long followers = followRepository.countByFollowee(user);
        long articles = blogPostRepository.countByUserId(userId);
        return new UserStatsDTO(following, followers, articles);
    }
}

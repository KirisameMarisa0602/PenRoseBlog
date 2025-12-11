package com.kirisamemarisa.blog.service.impl;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.kirisamemarisa.blog.common.BusinessException;
import com.kirisamemarisa.blog.common.JwtUtil;
import com.kirisamemarisa.blog.dto.LoginResponseDTO;
import com.kirisamemarisa.blog.model.User;
import com.kirisamemarisa.blog.model.UserProfile;
import com.kirisamemarisa.blog.repository.UserProfileRepository;
import com.kirisamemarisa.blog.repository.UserRepository;
import com.kirisamemarisa.blog.service.OAuth2LoginService;
import com.kirisamemarisa.blog.service.VerificationCodeService;
import okhttp3.OkHttpClient;
import okhttp3.Request;
import okhttp3.Response;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.IOException;
import java.util.UUID;

@Service
public class OAuth2LoginServiceImpl implements OAuth2LoginService {
    private static final Logger logger = LoggerFactory.getLogger(OAuth2LoginServiceImpl.class);

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private UserProfileRepository userProfileRepository;

    @Autowired
    private VerificationCodeService verificationCodeService;

    @Value("${oauth2.qq.app-id:}")
    private String qqAppId;

    @Value("${oauth2.qq.app-key:}")
    private String qqAppKey;

    @Value("${oauth2.qq.redirect-uri:}")
    private String qqRedirectUri;

    @Value("${oauth2.wechat.app-id:}")
    private String wechatAppId;

    @Value("${oauth2.wechat.app-secret:}")
    private String wechatAppSecret;

    @Value("${oauth2.wechat.redirect-uri:}")
    private String wechatRedirectUri;

    @Value("${oauth2.github.client-id:}")
    private String githubClientId;

    @Value("${oauth2.github.client-secret:}")
    private String githubClientSecret;

    @Value("${oauth2.github.redirect-uri:}")
    private String githubRedirectUri;

    private final OkHttpClient httpClient = new OkHttpClient();
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Override
    @Transactional
    public LoginResponseDTO loginWithQQ(String code, String state) {
        logger.info("QQ login with code: {}, state: {}", code, state);

        if (qqAppId == null || qqAppId.isEmpty() || qqAppKey == null || qqAppKey.isEmpty()) {
            logger.error("QQ OAuth2 configuration is missing");
            throw new BusinessException("QQ登录配置未完成");
        }

        try {
            // Step 1: Exchange code for access token
            String accessToken = getQQAccessToken(code);

            // Step 2: Get OpenID
            String openId = getQQOpenId(accessToken);

            // Step 3: Get user info
            JsonNode userInfo = getQQUserInfo(accessToken, openId);

            // Step 4: Find or create user
            User user = userRepository.findByQqOpenId(openId);
            if (user == null) {
                user = createUserFromQQ(openId, userInfo);
            }

            // Step 5: Generate JWT token and return
            return generateLoginResponse(user);

        } catch (Exception e) {
            logger.error("QQ login failed", e);
            throw new BusinessException("QQ登录失败: " + e.getMessage());
        }
    }

    @Override
    @Transactional
    public LoginResponseDTO loginWithWeChat(String code, String state) {
        logger.info("WeChat login with code: {}, state: {}", code, state);

        if (wechatAppId == null || wechatAppId.isEmpty() || wechatAppSecret == null || wechatAppSecret.isEmpty()) {
            logger.error("WeChat OAuth2 configuration is missing");
            throw new BusinessException("微信登录配置未完成");
        }

        try {
            // Step 1: Exchange code for access token and openid
            JsonNode tokenData = getWeChatAccessToken(code);
            String accessToken = tokenData.get("access_token").asText();
            String openId = tokenData.get("openid").asText();
            String unionId = tokenData.has("unionid") ? tokenData.get("unionid").asText() : openId;

            // Step 2: Get user info
            JsonNode userInfo = getWeChatUserInfo(accessToken, openId);

            // Step 3: Find or create user
            User user = userRepository.findByWechatUnionId(unionId);
            if (user == null) {
                user = createUserFromWeChat(unionId, userInfo);
            }

            // Step 4: Generate JWT token and return
            return generateLoginResponse(user);

        } catch (Exception e) {
            logger.error("WeChat login failed", e);
            throw new BusinessException("微信登录失败: " + e.getMessage());
        }
    }

    @Override
    @Transactional
    public LoginResponseDTO loginWithGitHub(String code, String state) {
        logger.info("GitHub login with code: {}, state: {}", code, state);

        if (githubClientId == null || githubClientId.isEmpty() || githubClientSecret == null || githubClientSecret.isEmpty()) {
            logger.error("GitHub OAuth2 configuration is missing");
            throw new BusinessException("GitHub登录配置未完成");
        }

        try {
            // Step 1: Exchange code for access token
            String accessToken = getGitHubAccessToken(code);

            // Step 2: Get user info
            JsonNode userInfo = getGitHubUserInfo(accessToken);
            String githubId = String.valueOf(userInfo.get("id").asLong());

            // Step 3: Find or create user
            User user = userRepository.findByGithubId(githubId);
            if (user == null) {
                user = createUserFromGitHub(githubId, userInfo);
            }

            // Step 4: Generate JWT token and return
            return generateLoginResponse(user);

        } catch (Exception e) {
            logger.error("GitHub login failed", e);
            throw new BusinessException("GitHub登录失败: " + e.getMessage());
        }
    }

    @Override
    @Transactional
    public LoginResponseDTO loginWithPhone(String phoneNumber, String verificationCode) {
        logger.info("Phone login for: {}", phoneNumber);

        // Verify the code
        if (!verificationCodeService.verifyCode(phoneNumber, verificationCode)) {
            throw new BusinessException("验证码错误或已过期");
        }

        // Find or create user
        User user = userRepository.findByPhoneNumber(phoneNumber);
        if (user == null) {
            user = createUserFromPhone(phoneNumber);
        }

        return generateLoginResponse(user);
    }

    private String getQQAccessToken(String code) throws IOException {
        String url = String.format(
                "https://graph.qq.com/oauth2.0/token?grant_type=authorization_code&client_id=%s&client_secret=%s&code=%s&redirect_uri=%s",
                qqAppId, qqAppKey, code, qqRedirectUri);

        Request request = new Request.Builder().url(url).build();
        try (Response response = httpClient.newCall(request).execute()) {
            if (!response.isSuccessful()) {
                throw new IOException("Failed to get QQ access token: " + response);
            }
            String body = response.body().string();
            // QQ returns: access_token=XXX&expires_in=7776000&refresh_token=XXX
            String[] parts = body.split("&");
            for (String part : parts) {
                if (part.startsWith("access_token=")) {
                    return part.substring("access_token=".length());
                }
            }
            throw new IOException("Access token not found in response");
        }
    }

    private String getQQOpenId(String accessToken) throws IOException {
        String url = String.format("https://graph.qq.com/oauth2.0/me?access_token=%s", accessToken);

        Request request = new Request.Builder().url(url).build();
        try (Response response = httpClient.newCall(request).execute()) {
            if (!response.isSuccessful()) {
                throw new IOException("Failed to get QQ OpenID: " + response);
            }
            String body = response.body().string();
            // Response format: callback( {"client_id":"YOUR_APPID","openid":"YOUR_OPENID"}
            // );
            int start = body.indexOf("{");
            int end = body.lastIndexOf("}") + 1;
            if (start >= 0 && end > start) {
                JsonNode json = objectMapper.readTree(body.substring(start, end));
                return json.get("openid").asText();
            }
            throw new IOException("OpenID not found in response");
        }
    }

    private JsonNode getQQUserInfo(String accessToken, String openId) throws IOException {
        String url = String.format(
                "https://graph.qq.com/user/get_user_info?access_token=%s&oauth_consumer_key=%s&openid=%s",
                accessToken, qqAppId, openId);

        Request request = new Request.Builder().url(url).build();
        try (Response response = httpClient.newCall(request).execute()) {
            if (!response.isSuccessful()) {
                throw new IOException("Failed to get QQ user info: " + response);
            }
            return objectMapper.readTree(response.body().string());
        }
    }

    private JsonNode getWeChatAccessToken(String code) throws IOException {
        String url = String.format(
                "https://api.weixin.qq.com/sns/oauth2/access_token?appid=%s&secret=%s&code=%s&grant_type=authorization_code",
                wechatAppId, wechatAppSecret, code);

        Request request = new Request.Builder().url(url).build();
        try (Response response = httpClient.newCall(request).execute()) {
            if (!response.isSuccessful()) {
                throw new IOException("Failed to get WeChat access token: " + response);
            }
            return objectMapper.readTree(response.body().string());
        }
    }

    private JsonNode getWeChatUserInfo(String accessToken, String openId) throws IOException {
        String url = String.format(
                "https://api.weixin.qq.com/sns/userinfo?access_token=%s&openid=%s&lang=zh_CN",
                accessToken, openId);

        Request request = new Request.Builder().url(url).build();
        try (Response response = httpClient.newCall(request).execute()) {
            if (!response.isSuccessful()) {
                throw new IOException("Failed to get WeChat user info: " + response);
            }
            return objectMapper.readTree(response.body().string());
        }
    }

    private String getGitHubAccessToken(String code) throws IOException {
        String url = String.format(
                "https://github.com/login/oauth/access_token?client_id=%s&client_secret=%s&code=%s",
                githubClientId, githubClientSecret, code);

        Request request = new Request.Builder()
                .url(url)
                .header("Accept", "application/json")
                .post(okhttp3.RequestBody.create(null, new byte[0]))
                .build();
        try (Response response = httpClient.newCall(request).execute()) {
            if (!response.isSuccessful()) {
                throw new IOException("Failed to get GitHub access token: " + response);
            }
            JsonNode json = objectMapper.readTree(response.body().string());
            if (json.has("access_token")) {
                return json.get("access_token").asText();
            }
            throw new IOException("Access token not found in response: " + json);
        }
    }

    private JsonNode getGitHubUserInfo(String accessToken) throws IOException {
        String url = "https://api.github.com/user";

        Request request = new Request.Builder()
                .url(url)
                .header("Authorization", "Bearer " + accessToken)
                .header("Accept", "application/json")
                .build();
        try (Response response = httpClient.newCall(request).execute()) {
            if (!response.isSuccessful()) {
                throw new IOException("Failed to get GitHub user info: " + response);
            }
            return objectMapper.readTree(response.body().string());
        }
    }

    private User createUserFromGitHub(String githubId, JsonNode userInfo) {
        User user = new User();
        // Use UUID to ensure username uniqueness
        user.setUsername("gh_" + UUID.randomUUID().toString().substring(0, 8));
        user.setGithubId(githubId);
        user.setLoginProvider("GITHUB");
        // Set random password to satisfy DB constraint
        user.setPassword(UUID.randomUUID().toString());

        userRepository.save(user);
        userRepository.flush();

        // Create user profile
        UserProfile profile = new UserProfile();
        profile.setUser(user);
        String nickname = userInfo.has("name") && !userInfo.get("name").isNull() ? userInfo.get("name").asText() : 
                          (userInfo.has("login") ? userInfo.get("login").asText() : "GitHub User");
        profile.setNickname(nickname);
        if (userInfo.has("avatar_url") && !userInfo.get("avatar_url").isNull()) {
            profile.setAvatarUrl(userInfo.get("avatar_url").asText());
        }
        userProfileRepository.save(profile);

        logger.info("Created new user from GitHub: {}", user.getUsername());
        return user;
    }

    private User createUserFromQQ(String openId, JsonNode userInfo) {
        User user = new User();
        // Use UUID to ensure username uniqueness
        user.setUsername("qq_" + UUID.randomUUID().toString().substring(0, 8));
        user.setQqOpenId(openId);
        user.setLoginProvider("QQ");
        // Set random password to satisfy DB constraint
        user.setPassword(UUID.randomUUID().toString());

        // Extract gender from QQ user info
        if (userInfo.has("gender")) {
            String gender = userInfo.get("gender").asText();
            user.setGender("男".equals(gender) ? "男" : "女".equals(gender) ? "女" : "保密");
        }

        userRepository.save(user);
        userRepository.flush();

        // Create user profile
        UserProfile profile = new UserProfile();
        profile.setUser(user);
        profile.setNickname(userInfo.has("nickname") ? userInfo.get("nickname").asText() : "QQ用户");
        if (userInfo.has("figureurl_qq_2")) {
            profile.setAvatarUrl(userInfo.get("figureurl_qq_2").asText());
        }
        userProfileRepository.save(profile);

        logger.info("Created new user from QQ: {}", user.getUsername());
        return user;
    }

    private User createUserFromWeChat(String unionId, JsonNode userInfo) {
        User user = new User();
        // Use UUID to ensure username uniqueness
        user.setUsername("wx_" + UUID.randomUUID().toString().substring(0, 8));
        user.setWechatUnionId(unionId);
        user.setLoginProvider("WECHAT");
        // Set random password to satisfy DB constraint
        user.setPassword(UUID.randomUUID().toString());

        // Extract gender from WeChat user info
        if (userInfo.has("sex")) {
            int sex = userInfo.get("sex").asInt();
            user.setGender(sex == 1 ? "男" : sex == 2 ? "女" : "保密");
        }

        userRepository.save(user);
        userRepository.flush();

        // Create user profile
        UserProfile profile = new UserProfile();
        profile.setUser(user);
        profile.setNickname(userInfo.has("nickname") ? userInfo.get("nickname").asText() : "微信用户");
        if (userInfo.has("headimgurl")) {
            profile.setAvatarUrl(userInfo.get("headimgurl").asText());
        }
        userProfileRepository.save(profile);

        logger.info("Created new user from WeChat: {}", user.getUsername());
        return user;
    }

    private User createUserFromPhone(String phoneNumber) {
        User user = new User();
        // Use anonymized username with last 4 digits + timestamp
        String anonymized = "user_" + phoneNumber.substring(7) + "_" + System.currentTimeMillis() % 10000;
        user.setUsername(anonymized);
        user.setPhoneNumber(phoneNumber);
        user.setLoginProvider("PHONE");
        // Set random password to satisfy DB constraint
        user.setPassword(UUID.randomUUID().toString());

        userRepository.save(user);
        userRepository.flush();

        // Create user profile
        UserProfile profile = new UserProfile();
        profile.setUser(user);
        profile.setNickname("手机用户" + phoneNumber.substring(7));
        userProfileRepository.save(profile);

        logger.info("Created new user from phone: {}", user.getUsername());
        return user;
    }

    private LoginResponseDTO generateLoginResponse(User user) {
        String token = JwtUtil.generateToken(user.getId(), user.getUsername());
        UserProfile profile = userProfileRepository.findById(user.getId()).orElse(null);

        LoginResponseDTO resp = new LoginResponseDTO();
        resp.setToken(token);
        resp.setUserId(user.getId());

        if (profile != null) {
            resp.setNickname(profile.getNickname());
            resp.setAvatarUrl(profile.getAvatarUrl());
            resp.setBackgroundUrl(profile.getBackgroundUrl());
            resp.setGender(profile.getGender() != null ? profile.getGender() : user.getGender());
        } else {
            resp.setNickname("");
            resp.setAvatarUrl("");
            resp.setBackgroundUrl("");
            resp.setGender(user.getGender() != null ? user.getGender() : "");
        }

        return resp;
    }
}

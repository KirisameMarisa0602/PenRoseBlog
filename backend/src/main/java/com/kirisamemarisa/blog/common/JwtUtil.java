package com.kirisamemarisa.blog.common;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.SignatureAlgorithm;
import io.jsonwebtoken.security.Keys;
import io.jsonwebtoken.Claims;
import java.util.Date;
import java.security.Key;
import java.nio.charset.StandardCharsets;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import jakarta.annotation.PostConstruct;

@Component
public class JwtUtil {
    private static final Logger logger = LoggerFactory.getLogger(JwtUtil.class);

    // 静态 Key，供静态方法使用
    private static Key key;

    // 注入配置中的密钥字符串（在 application.properties 中配置 jwt.secret）
    @Value("${jwt.secret:}")
    private String jwtSecret;

    // JWT有效期
    private static final long EXPIRATION = 1000L * 60 * 60 * 24 * 7; // 7天

    @PostConstruct
    public void init() {
        if (jwtSecret == null || jwtSecret.length() == 0) {
            logger.warn("[JWT] jwt.secret is empty in configuration; tokens generated in this runtime may not be compatible across restarts.");
            // generate a runtime key as fallback (not recommended for production)
            key = Keys.secretKeyFor(SignatureAlgorithm.HS256);
        } else {
            // Create key from configured secret. Ensure correct charset
            try {
                key = Keys.hmacShaKeyFor(jwtSecret.getBytes(StandardCharsets.UTF_8));
                logger.info("[JWT] Key initialized from configuration (jwt.secret), length={}", jwtSecret.length());
            } catch (Exception e) {
                logger.error("[JWT] Failed to initialize key from jwt.secret: {}", e.getMessage(), e);
                // fallback to runtime-generated key to avoid NPEs
                key = Keys.secretKeyFor(SignatureAlgorithm.HS256);
            }
        }
    }

    // 从token中获取userId
    public static Long getUserIdFromToken(String token) {
        try {
            Claims claims = parseToken(token);
            if (claims == null) {
                logger.debug("[JWT] parseToken returned null claims for token={}", token);
                return null;
            }
            Object userIdObj = claims.get("userId");
            logger.debug("[JWT] token={}", token);
            logger.debug("[JWT] claims={}", claims);
            logger.debug("[JWT] userIdObj={}, type={}", userIdObj,
                    userIdObj == null ? "null" : userIdObj.getClass().getName());
            if (userIdObj instanceof Number) {
                Long val = ((Number) userIdObj).longValue();
                logger.debug("[JWT] userId as Number: {}", val);
                return val;
            } else if (userIdObj instanceof String) {
                Long val = Long.parseLong((String) userIdObj);
                logger.debug("[JWT] userId as String: {}", val);
                return val;
            }
        } catch (Exception e) {
            logger.error("[JWT] getUserIdFromToken error", e);
        }
        return null;
    }

    // 生成JWT的方法，包含userId和username
    public static String generateToken(Long userId, String username) {
        return Jwts.builder()// JWT构建器

                // 头部
                .setSubject(username)// 主题，用户名标识
                .claim("userId", userId) // 将userId写入JWT的payload
                .claim("username", username) // 将username写入JWT的payload
                .setIssuedAt(new Date())// JWT签发时间
                .setExpiration(new Date(System.currentTimeMillis() + EXPIRATION))// JWT设置过期时间
                .signWith(key)// 使用HS256算法和密钥签名

                .compact();// 生成JWT
    }

    // 解析JWT的方法（自动剥离可选的 "Bearer " 前缀）
    public static Claims parseToken(String token) {
        if (token == null) {
            logger.debug("[JWT] parseToken received null token");
            return null;
        }
        String raw = token;
        if (raw.startsWith("Bearer ")) {
            raw = raw.substring(7).trim();
        }
        try {
            return Jwts.parserBuilder()// 解析器构建器
                    .setSigningKey(key)// 设置密钥
                    .build()// 构建
                    .parseClaimsJws(raw)// 解析、验证JWT
                    .getBody();// 获取JWT的主体部分（Claims）声明体
        } catch (Exception e) {
            logger.error("[JWT] parseToken error for token (first 64 chars): {}", raw.length() > 64 ? raw.substring(0, 64) : raw, e);
            throw e;
        }
    }

    // 验证JWT是否有效
    public static boolean isTokenValid(String token) {
        try {
            // 获取JWT声明体
            Claims claims = parseToken(token);
            if (claims == null) return false;
            // 检查JWT是否过期
            return claims.getExpiration().after(new Date());
        } catch (Exception e) {
            return false;
        }
    }
}

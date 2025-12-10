package com.kirisamemarisa.blog.service.impl;

import com.kirisamemarisa.blog.service.VerificationCodeService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.util.Random;
import java.util.concurrent.TimeUnit;

@Service
public class VerificationCodeServiceImpl implements VerificationCodeService {
    private static final Logger logger = LoggerFactory.getLogger(VerificationCodeServiceImpl.class);
    private static final String CODE_PREFIX = "verification:code:";
    private static final int CODE_LENGTH = 6;
    private static final int CODE_EXPIRE_MINUTES = 5;

    @Autowired(required = false)
    private StringRedisTemplate redisTemplate;

    @Override
    public boolean sendVerificationCode(String phoneNumber) {
        if (phoneNumber == null || !phoneNumber.matches("^1[3-9]\\d{9}$")) {
            logger.warn("Invalid phone number: {}", phoneNumber);
            return false;
        }

        // Generate 6-digit code
        String code = generateCode();
        logger.info("Generated verification code for phone {}: {}", phoneNumber, code);

        // Store in Redis with 5 minutes expiration
        if (redisTemplate != null) {
            try {
                String key = CODE_PREFIX + phoneNumber;
                redisTemplate.opsForValue().set(key, code, CODE_EXPIRE_MINUTES, TimeUnit.MINUTES);
                logger.info("Stored verification code in Redis for phone: {}", phoneNumber);
            } catch (Exception e) {
                logger.error("Failed to store verification code in Redis", e);
                return false;
            }
        } else {
            logger.warn("Redis template is not available, code storage skipped");
        }

        // TODO: Integrate with real SMS service provider (Aliyun, Tencent Cloud, etc.)
        // For now, just log that a code was sent (without exposing the actual code)
        logger.info("SMS verification code would be sent to {}", phoneNumber);

        return true;
    }

    @Override
    public boolean verifyCode(String phoneNumber, String code) {
        if (phoneNumber == null || code == null) {
            return false;
        }

        if (redisTemplate != null) {
            try {
                String key = CODE_PREFIX + phoneNumber;
                String storedCode = redisTemplate.opsForValue().get(key);

                if (storedCode != null && storedCode.equals(code)) {
                    // Delete the code after successful verification
                    redisTemplate.delete(key);
                    logger.info("Verification code verified successfully for phone: {}", phoneNumber);
                    return true;
                }
            } catch (Exception e) {
                logger.error("Failed to verify code from Redis", e);
                return false;
            }
        } else {
            logger.warn("Redis template is not available, verification skipped");
        }

        logger.warn("Verification code verification failed for phone: {}", phoneNumber);
        return false;
    }

    private String generateCode() {
        Random random = new Random();
        StringBuilder code = new StringBuilder();
        for (int i = 0; i < CODE_LENGTH; i++) {
            code.append(random.nextInt(10));
        }
        return code.toString();
    }
}

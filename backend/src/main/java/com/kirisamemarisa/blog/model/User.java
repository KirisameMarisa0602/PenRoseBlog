package com.kirisamemarisa.blog.model;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import jakarta.persistence.*;

@Entity
@Table(name = "user")
// 用户表结构
public class User {
    private static final Logger logger = LoggerFactory.getLogger(User.class);
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    // 主键id自增
    private Long id;

    @Column(nullable = false, unique = true, length = 15)
    // 用户名，唯一非空，5-15字符，仅数字、字母、下划线
    private String username;

    @Column(length = 150)
    // 密码，8-12位，仅数字和字母，加密后最长100字符（第三方登录时可为空）
    private String password;

    @Column(length = 2)
    // 性别，取值范围：男、女、保密
    private String gender;

    @Column(length = 20)
    // 手机号码，用于手机验证码登录
    private String phoneNumber;

    @Column(length = 50, unique = true)
    // QQ OpenID，用于QQ登录
    private String qqOpenId;

    @Column(length = 50, unique = true)
    // 微信 UnionID，用于微信登录
    private String wechatUnionId;

    @Column(length = 50, unique = true)
    // GitHub ID，用于GitHub登录
    private String githubId;

    @Column(length = 20)
    // 第三方登录提供者类型：LOCAL, QQ, WECHAT, PHONE, GITHUB
    private String loginProvider;

    @Column(name = "created_at", updatable = false)
    private java.time.LocalDateTime createdAt;

    @Column(name = "updated_at")
    private java.time.LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        createdAt = java.time.LocalDateTime.now();
        updatedAt = createdAt;
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = java.time.LocalDateTime.now();
    }

    // Getters、Setters方法
    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getUsername() {
        return username;
    }

    public void setUsername(String username) {
        this.username = username;
    }

    public String getPassword() {
        return password;
    }

    public void setPassword(String password) {
        this.password = password;
    }

    public String getGender() {
        return gender;
    }

    public void setGender(String gender) {
        this.gender = gender;
    }

    public String getPhoneNumber() {
        return phoneNumber;
    }

    public void setPhoneNumber(String phoneNumber) {
        this.phoneNumber = phoneNumber;
    }

    public String getQqOpenId() {
        return qqOpenId;
    }

    public void setQqOpenId(String qqOpenId) {
        this.qqOpenId = qqOpenId;
    }

    public String getWechatUnionId() {
        return wechatUnionId;
    }

    public void setWechatUnionId(String wechatUnionId) {
        this.wechatUnionId = wechatUnionId;
    }

    public String getGithubId() {
        return githubId;
    }

    public void setGithubId(String githubId) {
        this.githubId = githubId;
    }

    public String getLoginProvider() {
        return loginProvider;
    }

    public void setLoginProvider(String loginProvider) {
        this.loginProvider = loginProvider;
    }
}

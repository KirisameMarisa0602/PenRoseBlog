package com.kirisamemarisa.blog.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public class UserRegisterDTO {
    @NotBlank(message = "用户名不能为空")
    @Pattern(regexp = "^[A-Za-z0-9_]{5,15}$", message = "用户名格式不合法")
    private String username;

    @NotBlank(message = "密码不能为空")
    @Pattern(regexp = "^(?=.*[A-Za-z])(?=.*\\d)[A-Za-z\\d]{8,12}$", message = "密码格式不合法")
    private String password;

    @Size(max = 2, message = "性别字段长度不能超过2位")
    private String gender;

    // Getters and Setters
    public String getUsername() { return username; }
    public void setUsername(String username) { this.username = username; }
    public String getPassword() { return password; }
    public void setPassword(String password) { this.password = password; }
    public String getGender() { return gender; }
    public void setGender(String gender) { this.gender = gender; }
}

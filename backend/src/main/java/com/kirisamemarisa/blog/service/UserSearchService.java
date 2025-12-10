package com.kirisamemarisa.blog.service;

import java.util.List;

public interface UserSearchService {
    /**
     * 根据用户名模糊搜索，返回User和UserProfile的组合
     */
    List<Object[]> searchByUsernameWithProfile(String username, int page, int size);

    /**
     * 根据昵称模糊搜索，返回User和UserProfile的组合
     */
    List<Object[]> searchByNicknameWithProfile(String nickname, int page, int size);

    long countByUsername(String username);
    long countByNickname(String nickname);
}

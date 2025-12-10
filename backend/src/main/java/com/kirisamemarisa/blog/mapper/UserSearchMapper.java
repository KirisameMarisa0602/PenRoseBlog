package com.kirisamemarisa.blog.mapper;

import com.kirisamemarisa.blog.dto.UserSearchDTO;
import com.kirisamemarisa.blog.model.User;
import com.kirisamemarisa.blog.model.UserProfile;

public class UserSearchMapper {
    public static UserSearchDTO toDTO(User user, UserProfile userProfile) {
        UserSearchDTO dto = new UserSearchDTO();
        dto.setId(user.getId());
        dto.setUsername(user.getUsername());
        dto.setGender(user.getGender());
        if (userProfile != null) {
            dto.setNickname(userProfile.getNickname());
            dto.setAvatarUrl(userProfile.getAvatarUrl());
        }
        return dto;
    }
}


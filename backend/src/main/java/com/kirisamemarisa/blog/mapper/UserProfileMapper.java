package com.kirisamemarisa.blog.mapper;

import com.kirisamemarisa.blog.dto.UserProfileDTO;
import com.kirisamemarisa.blog.model.UserProfile;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.Mappings;

@Mapper(componentModel = "spring")
public interface UserProfileMapper {
    @Mappings({
        @Mapping(source = "user.gender", target = "gender"),
        @Mapping(source = "user.username", target = "username")
    })
    UserProfileDTO toDTO(UserProfile userProfile);
}


package com.kirisamemarisa.blog.mapper;

import com.kirisamemarisa.blog.dto.UserSimpleDTO;
import com.kirisamemarisa.blog.model.User;
import com.kirisamemarisa.blog.model.UserProfile;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.Mappings;
import org.mapstruct.factory.Mappers;

@Mapper(componentModel = "spring")
public interface UserSimpleMapper {
    UserSimpleMapper INSTANCE = Mappers.getMapper(UserSimpleMapper.class);

    @Mappings({
        @Mapping(target = "id", source = "user.id"),
        @Mapping(target = "nickname", source = "profile.nickname"),
        @Mapping(target = "avatarUrl", source = "profile.avatarUrl")
    })
    UserSimpleDTO toDTO(User user, UserProfile profile);
}


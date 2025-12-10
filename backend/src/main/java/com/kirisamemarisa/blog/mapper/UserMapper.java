package com.kirisamemarisa.blog.mapper;

import com.kirisamemarisa.blog.dto.UserRegisterDTO;
import com.kirisamemarisa.blog.dto.UserLoginDTO;
import com.kirisamemarisa.blog.model.User;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.Mappings;
import org.mapstruct.ReportingPolicy;

@Mapper(componentModel = "spring", unmappedTargetPolicy = ReportingPolicy.IGNORE)
public interface UserMapper {
    // Mapper for User entity
    @Mappings({
            @Mapping(target = "id", ignore = true),
            @Mapping(target = "username", source = "username"),
            @Mapping(target = "password", source = "password"),
            @Mapping(target = "gender", source = "gender"),
            @Mapping(target = "phoneNumber", ignore = true),
            @Mapping(target = "qqOpenId", ignore = true),
            @Mapping(target = "wechatUnionId", ignore = true),
            @Mapping(target = "loginProvider", ignore = true)
    })
    User toUser(UserRegisterDTO dto);

    @Mappings({
            @Mapping(target = "id", ignore = true),
            @Mapping(target = "username", source = "username"),
            @Mapping(target = "password", source = "password"),
            @Mapping(target = "gender", ignore = true),
            @Mapping(target = "phoneNumber", ignore = true),
            @Mapping(target = "qqOpenId", ignore = true),
            @Mapping(target = "wechatUnionId", ignore = true),
            @Mapping(target = "loginProvider", ignore = true)
    })
    User toUser(UserLoginDTO dto);

    @Mappings({
            @Mapping(target = "username", source = "username"),
            @Mapping(target = "password", source = "password"),
            @Mapping(target = "gender", source = "gender")
    })
    UserRegisterDTO toRegisterDTO(User user);
}

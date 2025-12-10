package com.kirisamemarisa.blog.mapper;

import com.kirisamemarisa.blog.dto.FollowDTO;
import com.kirisamemarisa.blog.model.Follow;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.Mappings;
import org.mapstruct.factory.Mappers;

@Mapper(componentModel = "spring")
public interface FollowMapper {
    FollowMapper INSTANCE = Mappers.getMapper(FollowMapper.class);

    @Mappings({
        @Mapping(source = "follower.id", target = "followerId"),
        @Mapping(source = "followee.id", target = "followeeId")
    })
    FollowDTO toDTO(Follow follow);

    @Mappings({
        @Mapping(target = "follower", ignore = true),
        @Mapping(target = "followee", ignore = true),
        @Mapping(target = "id", ignore = true),
        @Mapping(target = "createdAt", ignore = true)
    })
    Follow toEntity(FollowDTO dto);
}


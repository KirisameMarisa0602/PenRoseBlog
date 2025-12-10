package com.kirisamemarisa.blog.mapper;

import com.kirisamemarisa.blog.dto.CommentDTO;
import com.kirisamemarisa.blog.model.Comment;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper(componentModel = "spring")
public interface CommentMapper {
    @Mapping(target = "blogPostId", source = "blogPost.id")
    @Mapping(target = "userId", source = "user.id")
    @Mapping(target = "nickname", ignore = true)
    @Mapping(target = "avatarUrl", ignore = true)
    @Mapping(target = "likedByCurrentUser", ignore = true)
    CommentDTO toDTO(Comment comment);
}

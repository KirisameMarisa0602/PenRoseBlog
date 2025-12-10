package com.kirisamemarisa.blog.mapper;

import com.kirisamemarisa.blog.dto.CommentReplyDTO;
import com.kirisamemarisa.blog.model.CommentReply;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper(componentModel = "spring")
public interface CommentReplyMapper {

    @Mapping(target = "commentId", source = "comment.id")
    @Mapping(target = "userId", source = "user.id")
    @Mapping(target = "nickname", ignore = true)
    @Mapping(target = "avatarUrl", ignore = true)
    @Mapping(target = "likedByCurrentUser", ignore = true)
    CommentReplyDTO toDTO(CommentReply reply);
}

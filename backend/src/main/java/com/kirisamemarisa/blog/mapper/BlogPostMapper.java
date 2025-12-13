package com.kirisamemarisa.blog.mapper;

import com.kirisamemarisa.blog.dto.BlogPostCreateDTO;
import com.kirisamemarisa.blog.dto.BlogPostDTO;
import com.kirisamemarisa.blog.dto.BlogPostUpdateDTO;
import com.kirisamemarisa.blog.model.BlogPost;
import com.kirisamemarisa.blog.model.Tag;
import com.kirisamemarisa.blog.model.UserProfile;
import org.mapstruct.*;
import org.mapstruct.ReportingPolicy;

import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@Mapper(componentModel = "spring", unmappedTargetPolicy = ReportingPolicy.IGNORE)
public interface BlogPostMapper {
    @Mappings({
            // map title from DTO to entity
            @Mapping(target = "title", source = "title"),
            @Mapping(target = "user", ignore = true),
            @Mapping(target = "likeCount", ignore = true),
            @Mapping(target = "commentCount", ignore = true),
            @Mapping(target = "shareCount", ignore = true),
            @Mapping(target = "favoriteCount", ignore = true),
            @Mapping(target = "repostCount", ignore = true),
            @Mapping(target = "repost", ignore = true),
            @Mapping(target = "originalPost", ignore = true),
            @Mapping(target = "comments", ignore = true),
            @Mapping(target = "createdAt", ignore = true),
            @Mapping(target = "updatedAt", ignore = true),
            @Mapping(target = "category", ignore = true),
            @Mapping(target = "tags", ignore = true),
            @Mapping(target = "deleted", ignore = true)
    })
    BlogPost toEntity(BlogPostCreateDTO dto);

    @Mappings({
            @Mapping(target = "userId", source = "user.id"),
            @Mapping(target = "originalPostId", source = "originalPost.id", ignore = true),
            @Mapping(target = "likedByCurrentUser", ignore = true),
            @Mapping(target = "favoritedByCurrentUser", ignore = true),
            @Mapping(target = "viewCount", ignore = true), // populated separately by service
            // these author fields are populated by toDTOWithProfile when profile is
            // available
            @Mapping(target = "authorNickname", ignore = true),
            @Mapping(target = "authorAvatarUrl", ignore = true),
            // map title from entity to DTO
            @Mapping(target = "title", source = "title"),
            @Mapping(target = "coverImageUrl", source = "coverImageUrl"),
            @Mapping(target = "categoryName", source = "category.name"),
            @Mapping(target = "tags", expression = "java(mapTagsToStrings(entity.getTags()))")
    })
    BlogPostDTO toDTO(BlogPost entity);

    default BlogPostDTO toDTOWithProfile(BlogPost entity, UserProfile profile) {
        BlogPostDTO dto = toDTO(entity);
        if (dto == null)
            return null;
        if (profile != null) {
            dto.setAuthorNickname(profile.getNickname());
            dto.setAuthorAvatarUrl(profile.getAvatarUrl());
        } else {
            // fallback: if profile missing, try to set nickname from User.username
            if (entity != null && entity.getUser() != null && entity.getUser().getUsername() != null) {
                dto.setAuthorNickname(entity.getUser().getUsername());
            } else {
                dto.setAuthorNickname("");
            }
            dto.setAuthorAvatarUrl("");
        }
        return dto;
    }

    @Mappings({
            @Mapping(target = "title", ignore = true),
            @Mapping(target = "user", ignore = true),
            @Mapping(target = "likeCount", ignore = true),
            @Mapping(target = "commentCount", ignore = true),
            @Mapping(target = "shareCount", ignore = true),
            @Mapping(target = "favoriteCount", ignore = true),
            @Mapping(target = "repostCount", ignore = true),
            @Mapping(target = "repost", ignore = true),
            @Mapping(target = "originalPost", ignore = true),
            @Mapping(target = "comments", ignore = true),
            @Mapping(target = "createdAt", ignore = true),
            @Mapping(target = "updatedAt", ignore = true),
            // map updatable fields from BlogPostUpdateDTO
            @Mapping(target = "coverImageUrl", source = "coverImageUrl"),
            @Mapping(target = "content", source = "content"),
            @Mapping(target = "directory", source = "directory"),
            @Mapping(target = "category", ignore = true),
            @Mapping(target = "tags", ignore = true),
            @Mapping(target = "deleted", ignore = true)
    })
    void updateEntityFromDTO(BlogPostUpdateDTO dto, @MappingTarget BlogPost entity);

    // Helper method to convert Set<Tag> to List<String>
    default List<String> mapTagsToStrings(Set<Tag> tags) {
        if (tags == null || tags.isEmpty()) {
            return java.util.Collections.emptyList();
        }
        return tags.stream()
                .map(Tag::getName)
                .collect(Collectors.toList());
    }
}

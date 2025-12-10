package com.kirisamemarisa.blog.mapper;

import com.kirisamemarisa.blog.dto.BlogViewStatsDTO;
import com.kirisamemarisa.blog.model.BlogViewStats;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.Mappings;

@Mapper(componentModel = "spring")
@SuppressWarnings("unused")
public interface BlogViewStatsMapper {

    @Mappings({
            @Mapping(target = "blogPostId", source = "blogPost.id"),
            @Mapping(target = "viewCount", source = "viewCount")
    })
    BlogViewStatsDTO toDTO(BlogViewStats entity);
}

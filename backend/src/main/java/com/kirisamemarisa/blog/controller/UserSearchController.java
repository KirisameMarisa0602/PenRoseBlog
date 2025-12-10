package com.kirisamemarisa.blog.controller;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import com.kirisamemarisa.blog.common.ApiResponse;
import com.kirisamemarisa.blog.dto.PageResult;
import com.kirisamemarisa.blog.dto.UserSearchDTO;
import com.kirisamemarisa.blog.model.User;
import com.kirisamemarisa.blog.model.UserProfile;
import com.kirisamemarisa.blog.service.UserSearchService;
import com.kirisamemarisa.blog.mapper.UserSearchMapper;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.stream.Collectors;

/**
 * 用户搜索接口控制器。
 * 路径示例：
 * /api/users/search?username=cj_test1
 * /api/users/search?nickname=小明
 */
@RestController
public class UserSearchController {
    private static final Logger logger = LoggerFactory.getLogger(UserSearchController.class);

    private final UserSearchService userSearchService;

    public UserSearchController(UserSearchService userSearchService) {
        this.userSearchService = userSearchService;
    }

    @GetMapping("/api/users/search")
    public ApiResponse<PageResult<UserSearchDTO>> search(
            @RequestParam(required = false) String username,
            @RequestParam(required = false) String nickname,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {

        List<Object[]> list;
        long total;
        if (username != null && !username.isBlank()) {
            list = userSearchService.searchByUsernameWithProfile(username, page, size);
            total = userSearchService.countByUsername(username);
        } else if (nickname != null && !nickname.isBlank()) {
            list = userSearchService.searchByNicknameWithProfile(nickname, page, size);
            total = userSearchService.countByNickname(nickname);
        } else {
            return new ApiResponse<>(400, "参数缺失：需提供 username 或 nickname", null);
        }

        List<UserSearchDTO> dtoList = list.stream()
                .map(arr -> UserSearchMapper.toDTO((User) arr[0], (UserProfile) arr[1]))
                .toList();

        return new ApiResponse<>(200, "OK", new PageResult<>(dtoList, total, page, size));
    }
}

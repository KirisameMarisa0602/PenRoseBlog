package com.kirisamemarisa.blog.service;

import com.kirisamemarisa.blog.dto.PageResult;
import com.kirisamemarisa.blog.dto.UserSimpleDTO;
import com.kirisamemarisa.blog.model.User;
import java.util.List;

public interface FriendService {
    boolean isFriend(User a, User b);

    List<User> listFriends(User me);

    List<Long> listFriendIds(User me);

    List<UserSimpleDTO> listFriendDTOs(User me);

    PageResult<UserSimpleDTO> pageFriendDTOs(User me, int page, int size);

    void deleteFriend(User me, User friend);
}

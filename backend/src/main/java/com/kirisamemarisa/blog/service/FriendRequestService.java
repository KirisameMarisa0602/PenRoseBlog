package com.kirisamemarisa.blog.service;

import com.kirisamemarisa.blog.dto.FriendRequestDTO;
import com.kirisamemarisa.blog.model.User;

import java.util.List;

public interface FriendRequestService {
    FriendRequestDTO sendRequest(User sender, User receiver, String message);
    List<FriendRequestDTO> pendingFor(User receiver);
    FriendRequestDTO respond(Long requestId, User receiver, boolean accept);
}

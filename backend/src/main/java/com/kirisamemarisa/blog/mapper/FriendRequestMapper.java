package com.kirisamemarisa.blog.mapper;

import com.kirisamemarisa.blog.dto.FriendRequestDTO;
import com.kirisamemarisa.blog.dto.NotificationDTO;
import com.kirisamemarisa.blog.model.FriendRequest;

import java.util.ArrayList;
import java.util.List;

public class FriendRequestMapper {
    public static FriendRequestDTO toDTO(FriendRequest fr) {
        if (fr == null)
            return null;
        FriendRequestDTO dto = new FriendRequestDTO();
        dto.setId(fr.getId());
        dto.setSenderId(fr.getSender() != null ? fr.getSender().getId() : null);
        dto.setSenderUsername(fr.getSender() != null ? fr.getSender().getUsername() : null);
        dto.setReceiverId(fr.getReceiver() != null ? fr.getReceiver().getId() : null);
        dto.setMessage(fr.getMessage());
        dto.setStatus(fr.getStatus() != null ? fr.getStatus().name() : null);
        return dto;
    }

    public static NotificationDTO toNotification(FriendRequest fr) {
        if (fr == null)
            return null;
        NotificationDTO n = new NotificationDTO();
        n.setType("FRIEND_REQUEST");
        n.setRequestId(fr.getId());
        n.setReferenceId(fr.getId());
        n.setSenderId(fr.getSender() != null ? fr.getSender().getId() : null);
        n.setReceiverId(fr.getReceiver() != null ? fr.getReceiver().getId() : null);
        n.setMessage(fr.getMessage());
        n.setStatus(fr.getStatus() != null ? fr.getStatus().name() : null);
        n.setCreatedAt(fr.getCreatedAt());
        return n;
    }

    public static List<FriendRequestDTO> toDTOList(List<FriendRequest> list) {
        List<FriendRequestDTO> out = new ArrayList<>();
        if (list == null)
            return out;
        for (FriendRequest fr : list)
            out.add(toDTO(fr));
        return out;
    }
}

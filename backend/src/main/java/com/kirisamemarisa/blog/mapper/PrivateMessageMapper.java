package com.kirisamemarisa.blog.mapper;

import com.kirisamemarisa.blog.model.PrivateMessage;
import com.kirisamemarisa.blog.model.User;
import com.kirisamemarisa.blog.dto.PrivateMessageDTO;

public class PrivateMessageMapper {
    public static PrivateMessageDTO toDTO(PrivateMessage message) {
        if (message == null) return null;
        PrivateMessageDTO dto = new PrivateMessageDTO();
        dto.setId(message.getId());
        dto.setSenderId(message.getSender() != null ? message.getSender().getId() : null);
        dto.setReceiverId(message.getReceiver() != null ? message.getReceiver().getId() : null);
        dto.setText(message.getText());
        dto.setMediaUrl(message.getMediaUrl());
        dto.setType(message.getType());
        dto.setCreatedAt(message.getCreatedAt());
        return dto;
    }

    public static PrivateMessage toEntity(PrivateMessageDTO dto, User sender, User receiver) {
        if (dto == null) return null;
        PrivateMessage message = new PrivateMessage();
        message.setId(dto.getId());
        message.setSender(sender);
        message.setReceiver(receiver);
        message.setText(dto.getText());
        message.setMediaUrl(dto.getMediaUrl());
        message.setType(dto.getType());
        // createdAt由JPA自动生成
        return message;
    }
}


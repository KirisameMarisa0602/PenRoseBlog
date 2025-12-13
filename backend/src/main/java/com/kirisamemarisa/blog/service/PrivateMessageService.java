package com.kirisamemarisa.blog.service;

import com.kirisamemarisa.blog.model.PrivateMessage;
import com.kirisamemarisa.blog.model.User;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.List;

public interface PrivateMessageService {
    PrivateMessage sendText(User sender, User receiver, String text);

    PrivateMessage sendMedia(User sender, User receiver, PrivateMessage.MessageType type, String mediaUrl,
            String caption);

    // 旧接口（建议废弃或仅用于少量数据场景）
    List<PrivateMessage> conversation(User a, User b);

    // 新增：分页获取会话
    Page<PrivateMessage> conversationPage(User a, User b, Pageable pageable);

    boolean canSendMedia(User sender, User receiver);

    boolean hasReplied(User sender, User receiver);

    void revokeMessage(Long messageId, Long userId);

    void deleteMessage(Long messageId, Long userId);

    // 供控制器使用的会话辅助统计与状态更新
    long countUnreadTotal(Long userId);
    int markConversationRead(Long otherUserId, Long meUserId);
}
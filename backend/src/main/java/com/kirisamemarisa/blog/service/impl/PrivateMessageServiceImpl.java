package com.kirisamemarisa.blog.service.impl;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import com.kirisamemarisa.blog.model.PrivateMessage;
import com.kirisamemarisa.blog.model.User;
import com.kirisamemarisa.blog.repository.PrivateMessageRepository;
import com.kirisamemarisa.blog.service.FollowService;
import com.kirisamemarisa.blog.service.FriendService;
import com.kirisamemarisa.blog.service.PrivateMessageService;
import com.kirisamemarisa.blog.events.MessageEventPublisher;
import com.kirisamemarisa.blog.service.PrivateMessageDtoService;
import com.kirisamemarisa.blog.dto.PrivateMessageDTO;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;

@Service
@Transactional
public class PrivateMessageServiceImpl implements PrivateMessageService {
    private static final Logger logger = LoggerFactory.getLogger(PrivateMessageServiceImpl.class);
    private final PrivateMessageRepository messageRepository;
    private final FollowService followService;
    private final FriendService friendService;
    private final MessageEventPublisher publisher;
    private final PrivateMessageDtoService dtoService;

    public PrivateMessageServiceImpl(PrivateMessageRepository messageRepository,
            FollowService followService,
            FriendService friendService,
            MessageEventPublisher publisher,
            PrivateMessageDtoService dtoService) {
        this.messageRepository = messageRepository;
        this.followService = followService;
        this.friendService = friendService;
        this.publisher = publisher;
        this.dtoService = dtoService;
    }

    @Override
    public PrivateMessage sendText(User sender, User receiver, String text) {
        // 拉黑功能移除：不进行拦截

        PrivateMessage msg = new PrivateMessage();
        msg.setSender(sender);
        msg.setReceiver(receiver);
        msg.setText(text);
        msg.setType(PrivateMessage.MessageType.TEXT);

        boolean isFriend = friendService.isFriend(sender, receiver);
        boolean replied = hasReplied(sender, receiver);

        if (!isFriend && !replied) {
            long count = messageRepository.countUnreadBetween(receiver.getId(), sender.getId());
            if (count > 0) {
                // 限制逻辑
            }
        }
        PrivateMessage saved = messageRepository.save(msg);
        try {
            PrivateMessageDTO dto = dtoService.toDtoSingle(saved);
            publisher.broadcast(sender.getId(), receiver.getId(), List.of(dto));
        } catch (Exception e) {
            logger.error("Failed to broadcast message", e);
        }
        return saved;
    }

    @Override
    public PrivateMessage sendMedia(User sender, User receiver, PrivateMessage.MessageType type, String mediaUrl,
            String caption) {
        // 拉黑功能移除：不进行拦截

        if (!canSendMedia(sender, receiver)) {
            throw new IllegalStateException("发送媒体需互相关注或对方已回复。");
        }

        PrivateMessage msg = new PrivateMessage();
        msg.setSender(sender);
        msg.setReceiver(receiver);
        msg.setType(type);
        msg.setMediaUrl(mediaUrl);
        msg.setText(caption);

        PrivateMessage saved = messageRepository.save(msg);
        try {
            PrivateMessageDTO dto = dtoService.toDtoSingle(saved);
            publisher.broadcast(sender.getId(), receiver.getId(), List.of(dto));
        } catch (Exception e) {
            logger.error("Failed to broadcast message", e);
        }
        return saved;
    }

    @Override
    public List<PrivateMessage> conversation(User a, User b) {
        // 兼容旧接口，但建议前端全面迁移到分页接口
        List<PrivateMessage> ab = new ArrayList<>(
                messageRepository.findBySenderAndReceiverWithParticipantsOrderByCreatedAtAsc(a, b));
        List<PrivateMessage> ba = messageRepository.findBySenderAndReceiverWithParticipantsOrderByCreatedAtAsc(b, a);
        ab.addAll(ba);
        ab.sort(java.util.Comparator.comparing(PrivateMessage::getCreatedAt));
        return ab;
    }

    @Override
    public Page<PrivateMessage> conversationPage(User a, User b, Pageable pageable) {
        return messageRepository.findConversationBetween(a, b, pageable);
    }

    @Override
    public boolean canSendMedia(User sender, User receiver) {
        return friendService.isFriend(sender, receiver) || hasReplied(sender, receiver);
    }

    @Override
    public boolean hasReplied(User sender, User receiver) {
        // 只要查到一条即可
        List<PrivateMessage> replies = messageRepository
                .findBySenderAndReceiverWithParticipantsOrderByCreatedAtAsc(receiver, sender);
        return !replies.isEmpty();
    }

    @Override
    public void revokeMessage(Long messageId, Long userId) {
        PrivateMessage msg = messageRepository.findById(messageId)
                .orElseThrow(() -> new IllegalArgumentException("消息不存在"));
        if (!msg.getSender().getId().equals(userId)) {
            throw new IllegalStateException("只能撤回自己发送的消息");
        }
        // 2 minutes limit
        if (java.time.Instant.now().minusSeconds(120).isAfter(msg.getCreatedAt())) {
            throw new IllegalStateException("超过2分钟无法撤回");
        }
        msg.setRecalled(true);
        PrivateMessage saved = messageRepository.save(msg);
        try {
            PrivateMessageDTO dto = dtoService.toDtoSingle(saved);
            publisher.broadcast(msg.getSender().getId(), msg.getReceiver().getId(), List.of(dto));
        } catch (Exception e) {
            logger.error("Failed to broadcast recall", e);
        }
    }

    @Override
    public void deleteMessage(Long messageId, Long userId) {
        PrivateMessage msg = messageRepository.findById(messageId)
                .orElseThrow(() -> new IllegalArgumentException("消息不存在"));
        if (msg.getSender().getId().equals(userId)) {
            msg.setDeletedBySender(true);
        } else if (msg.getReceiver().getId().equals(userId)) {
            msg.setDeletedByReceiver(true);
        } else {
            throw new IllegalStateException("无权删除此消息");
        }
        messageRepository.save(msg);
    }

    @Override
    public long countUnreadTotal(Long userId) {
        if (userId == null) return 0L;
        return messageRepository.countUnreadTotal(userId);
    }

    @Override
    public int markConversationRead(Long otherUserId, Long meUserId) {
        if (otherUserId == null || meUserId == null) return 0;
        return messageRepository.markConversationRead(otherUserId, meUserId);
    }
}

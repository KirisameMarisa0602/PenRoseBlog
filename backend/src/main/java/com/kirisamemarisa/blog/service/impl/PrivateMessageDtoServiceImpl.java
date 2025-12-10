package com.kirisamemarisa.blog.service.impl;

import com.kirisamemarisa.blog.dto.ConversationSummaryDTO;
import com.kirisamemarisa.blog.dto.NotificationDTO;
import com.kirisamemarisa.blog.dto.PageResult;
import com.kirisamemarisa.blog.dto.PrivateMessageDTO;
import com.kirisamemarisa.blog.events.MessageEventPublisher;
import com.kirisamemarisa.blog.model.PrivateMessage;
import com.kirisamemarisa.blog.model.User;
import com.kirisamemarisa.blog.model.UserProfile;
import com.kirisamemarisa.blog.repository.PrivateMessageRepository;
import com.kirisamemarisa.blog.repository.UserProfileRepository;
import com.kirisamemarisa.blog.service.BlogUrlPreviewService;
import com.kirisamemarisa.blog.service.NotificationService;
import com.kirisamemarisa.blog.service.PrivateMessageDtoService;
import org.springframework.data.domain.Page;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class PrivateMessageDtoServiceImpl implements PrivateMessageDtoService {

    private final UserProfileRepository userProfileRepository;
    private final PrivateMessageRepository privateMessageRepository;
    private final NotificationService notificationService;
    private final BlogUrlPreviewService blogUrlPreviewService;

    public PrivateMessageDtoServiceImpl(UserProfileRepository userProfileRepository,
            PrivateMessageRepository privateMessageRepository,
            NotificationService notificationService,
            BlogUrlPreviewService blogUrlPreviewService) {
        this.userProfileRepository = userProfileRepository;
        this.privateMessageRepository = privateMessageRepository;
        this.notificationService = notificationService;
        this.blogUrlPreviewService = blogUrlPreviewService;
    }

    private Map<Long, UserProfile> loadProfilesForMessages(List<PrivateMessage> messages) {
        Set<Long> userIds = new HashSet<>();
        for (PrivateMessage m : messages) {
            if (m.getSender() != null)
                userIds.add(m.getSender().getId());
            if (m.getReceiver() != null)
                userIds.add(m.getReceiver().getId());
        }
        Map<Long, UserProfile> profileMap = new HashMap<>();
        if (!userIds.isEmpty()) {
            List<UserProfile> profiles = userProfileRepository.findAllById(userIds);
            profiles.forEach(p -> profileMap.put(p.getId(), p));
        }
        return profileMap;
    }

    private PrivateMessageDTO toDTO(PrivateMessage msg, Map<Long, UserProfile> profileMap) {
        PrivateMessageDTO dto = new PrivateMessageDTO();
        dto.setId(msg.getId());
        dto.setSenderId(msg.getSender().getId());
        dto.setReceiverId(msg.getReceiver().getId());
        dto.setType(msg.getType());
        dto.setCreatedAt(msg.getCreatedAt());
        dto.setRecalled(msg.isRecalled());

        if (msg.isRecalled()) {
            dto.setText(null);
            dto.setMediaUrl(null);
        } else {
            dto.setText(msg.getText());
            dto.setMediaUrl(msg.getMediaUrl());
        }

        Long sid = msg.getSender() != null ? msg.getSender().getId() : null;
        Long rid = msg.getReceiver() != null ? msg.getReceiver().getId() : null;

        if (sid != null) {
            UserProfile sp = profileMap != null ? profileMap.get(sid) : null;
            if (sp != null) {
                dto.setSenderNickname(sp.getNickname());
                dto.setSenderAvatarUrl(sp.getAvatarUrl());
            } else {
                dto.setSenderNickname(msg.getSender() != null ? msg.getSender().getUsername() : "");
                dto.setSenderAvatarUrl("");
            }
        }
        if (rid != null) {
            UserProfile rp = profileMap != null ? profileMap.get(rid) : null;
            if (rp != null) {
                dto.setReceiverNickname(rp.getNickname());
                dto.setReceiverAvatarUrl(rp.getAvatarUrl());
            } else {
                dto.setReceiverNickname(msg.getReceiver() != null ? msg.getReceiver().getUsername() : "");
                dto.setReceiverAvatarUrl("");
            }
        }

        dto.setBlogPreview(blogUrlPreviewService.extractPreviewFromText(dto.getText()));

        return dto;
    }

    @Override
    public PageResult<PrivateMessageDTO> buildConversationPage(User me, User other, Page<PrivateMessage> page) {
        List<PrivateMessage> content = page.getContent();
        Map<Long, UserProfile> profileMap = loadProfilesForMessages(content);
        List<PrivateMessageDTO> dtoList = content.stream()
                .map(m -> toDTO(m, profileMap))
                .collect(Collectors.toList());
        Collections.reverse(dtoList);
        return new PageResult<>(dtoList, page.getTotalElements(), page.getNumber(), page.getSize());
    }

    @Override
    public List<PrivateMessageDTO> buildInitialHistory(User me, User other, Page<PrivateMessage> page) {
        List<PrivateMessage> content = page.getContent();
        Map<Long, UserProfile> profileMap = loadProfilesForMessages(content);
        List<PrivateMessageDTO> dtoList = content.stream()
                .map(m -> toDTO(m, profileMap))
                .collect(Collectors.toList());
        Collections.reverse(dtoList);
        return dtoList;
    }

    @Override
    public PrivateMessageDTO toDtoSingle(PrivateMessage msg) {
        Map<Long, UserProfile> map = new HashMap<>();
        if (msg.getSender() != null)
            userProfileRepository.findById(msg.getSender().getId()).ifPresent(p -> map.put(p.getId(), p));
        if (msg.getReceiver() != null)
            userProfileRepository.findById(msg.getReceiver().getId()).ifPresent(p -> map.put(p.getId(), p));
        return toDTO(msg, map);
    }

    private String choosePreview(PrivateMessage m) {
        if (m.getType() != null && m.getType() != PrivateMessage.MessageType.TEXT) {
            String base = m.getType().name();
            String t = m.getText();
            if (t != null && !t.isEmpty()) {
                String cut = t.length() > 20 ? t.substring(0, 20) + "..." : t;
                return base + ":" + cut;
            }
            return base;
        }
        String t = m.getText();
        if (t == null)
            return "";
        return t.length() > 40 ? t.substring(0, 40) + "..." : t;
    }

    @Override
    public PageResult<ConversationSummaryDTO> buildConversationSummaryPage(User me) {
        Map<Long, ConversationSummaryDTO> map = new LinkedHashMap<>();

        privateMessageRepository.findBySenderWithReceiverOrderByCreatedAtDesc(me).forEach(m -> {
            User receiver = m.getReceiver();
            Long otherId = receiver != null ? receiver.getId() : null;
            if (otherId == null)
                return;
            ConversationSummaryDTO cur = map.get(otherId);
            if (cur == null || m.getCreatedAt().isAfter(cur.getLastAt())) {
                ConversationSummaryDTO s = new ConversationSummaryDTO();
                s.setOtherId(otherId);
                UserProfile prof = userProfileRepository.findById(otherId).orElse(null);
                if (prof != null) {
                    s.setNickname(prof.getNickname());
                    s.setAvatarUrl(prof.getAvatarUrl());
                } else {
                    s.setNickname(receiver.getUsername());
                    s.setAvatarUrl("");
                }
                s.setLastMessage(choosePreview(m));
                s.setLastAt(m.getCreatedAt());
                map.put(otherId, s);
            }
        });

        privateMessageRepository.findByReceiverWithSenderOrderByCreatedAtDesc(me).forEach(m -> {
            User sender = m.getSender();
            Long otherId = sender != null ? sender.getId() : null;
            if (otherId == null)
                return;
            ConversationSummaryDTO cur = map.get(otherId);
            if (cur == null || m.getCreatedAt().isAfter(cur.getLastAt())) {
                ConversationSummaryDTO s = new ConversationSummaryDTO();
                UserProfile prof2 = userProfileRepository.findById(otherId).orElse(null);
                s.setOtherId(otherId);
                if (prof2 != null) {
                    s.setNickname(prof2.getNickname());
                    s.setAvatarUrl(prof2.getAvatarUrl());
                } else {
                    s.setNickname(sender.getUsername());
                    s.setAvatarUrl("");
                }
                s.setLastMessage(choosePreview(m));
                s.setLastAt(m.getCreatedAt());
                map.put(otherId, s);
            }
        });

        List<ConversationSummaryDTO> list = new ArrayList<>(map.values());
        list.forEach(s -> {
            long unread = privateMessageRepository.countUnreadBetween(me.getId(), s.getOtherId());
            s.setUnreadCount(unread);
        });
        list.sort(Comparator.comparing(ConversationSummaryDTO::getLastAt).reversed());
        return new PageResult<>(list, list.size(), 0, list.size());
    }

    @Override
    public void sendPmNotification(PrivateMessage msg) {
        try {
            if (notificationService == null)
                return;
            NotificationDTO dto = new NotificationDTO();
            dto.setType("PRIVATE_MESSAGE");
            dto.setSenderId(msg.getSender() != null ? msg.getSender().getId() : null);
            dto.setReceiverId(msg.getReceiver() != null ? msg.getReceiver().getId() : null);
            dto.setMessage(choosePreview(msg));
            dto.setStatus(null);
            dto.setCreatedAt(Instant.now());
            dto.setReferenceId(msg.getId());

            Long receiverId = dto.getReceiverId();
            if (receiverId != null && !receiverId.equals(dto.getSenderId())) {
                notificationService.sendNotification(receiverId, dto);
            }
        } catch (Exception ignored) {
        }
    }

    @Override
    public List<PrivateMessageDTO> buildLatestPageForBroadcast(User me, User other, Page<PrivateMessage> page) {
        List<PrivateMessage> content = page.getContent();
        Map<Long, UserProfile> profileMap = loadProfilesForMessages(content);
        List<PrivateMessageDTO> dtoList = content.stream()
                .map(m -> toDTO(m, profileMap))
                .collect(Collectors.toList());
        Collections.reverse(dtoList);
        return dtoList;
    }
}

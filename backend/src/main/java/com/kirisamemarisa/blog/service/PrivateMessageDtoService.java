package com.kirisamemarisa.blog.service;

import com.kirisamemarisa.blog.dto.ConversationSummaryDTO;
import com.kirisamemarisa.blog.dto.PageResult;
import com.kirisamemarisa.blog.dto.PrivateMessageDTO;
import com.kirisamemarisa.blog.model.PrivateMessage;
import com.kirisamemarisa.blog.model.User;
import org.springframework.data.domain.Page;

import java.util.List;

public interface PrivateMessageDtoService {

    PageResult<PrivateMessageDTO> buildConversationPage(User me, User other, Page<PrivateMessage> page);

    List<PrivateMessageDTO> buildInitialHistory(User me, User other, Page<PrivateMessage> page);

    PrivateMessageDTO toDtoSingle(PrivateMessage msg);

    PageResult<ConversationSummaryDTO> buildConversationSummaryPage(User me);

    void sendPmNotification(PrivateMessage msg);

    List<PrivateMessageDTO> buildLatestPageForBroadcast(User me, User other, Page<PrivateMessage> page);
}

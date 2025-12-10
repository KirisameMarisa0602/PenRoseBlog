//前端调用撤回/删除接口时使用的DTO
package com.kirisamemarisa.blog.dto;

public class PrivateMessageOperationDTO {
    // 要操作的消息ID
    private Long messageId;

    public PrivateMessageOperationDTO() {
    }

    public PrivateMessageOperationDTO(Long messageId) {
        this.messageId = messageId;
    }

    public Long getMessageId() {
        return messageId;
    }

    public void setMessageId(Long messageId) {
        this.messageId = messageId;
    }
}

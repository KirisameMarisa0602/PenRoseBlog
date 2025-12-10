package com.kirisamemarisa.blog.repository;

import com.kirisamemarisa.blog.model.PrivateMessage;
import com.kirisamemarisa.blog.model.User;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface PrivateMessageRepository extends JpaRepository<PrivateMessage, Long> {

        // 优化核心：分页查询两人之间的对话（无论谁发给谁），按时间倒序排列（最新的在前面）
        // 使用 Left Join Fetch 避免 N+1 问题
        // user1 为当前查看者，需过滤掉 user1 已删除的消息
        @Query("SELECT pm FROM PrivateMessage pm " +
                        "LEFT JOIN FETCH pm.sender s " +
                        "LEFT JOIN FETCH pm.receiver r " +
                        "WHERE (" +
                        "  (pm.sender = :user1 AND pm.receiver = :user2 AND pm.deletedBySender = false) " +
                        "  OR " +
                        "  (pm.receiver = :user1 AND pm.sender = :user2 AND pm.deletedByReceiver = false)" +
                        ") " +
                        "ORDER BY pm.createdAt DESC")
        Page<PrivateMessage> findConversationBetween(@Param("user1") User user1,
                        @Param("user2") User user2,
                        Pageable pageable);

        // 保留原有方法用于列表展示
        @Query("select pm from PrivateMessage pm join fetch pm.receiver r where pm.sender = :sender order by pm.createdAt desc")
        List<PrivateMessage> findBySenderWithReceiverOrderByCreatedAtDesc(@Param("sender") User sender);

        @Query("select pm from PrivateMessage pm join fetch pm.sender s where pm.receiver = :receiver order by pm.createdAt desc")
        List<PrivateMessage> findByReceiverWithSenderOrderByCreatedAtDesc(@Param("receiver") User receiver);

        // 下面这两个可以废弃或保留用于兼容旧逻辑，但建议尽量不使用以避免全表查询
        List<PrivateMessage> findBySenderAndReceiverOrderByCreatedAtAsc(User sender, User receiver);

        @Query("select pm from PrivateMessage pm join fetch pm.sender s join fetch pm.receiver r where pm.sender = :sender and pm.receiver = :receiver order by pm.createdAt asc")
        List<PrivateMessage> findBySenderAndReceiverWithParticipantsOrderByCreatedAtAsc(@Param("sender") User sender,
                        @Param("receiver") User receiver);

        @Query("select count(pm) from PrivateMessage pm where pm.receiver.id = :receiverId and pm.readByReceiver = false")
        long countUnreadTotal(@Param("receiverId") Long receiverId);

        @Query("select count(pm) from PrivateMessage pm where pm.receiver.id = :receiverId and pm.sender.id = :senderId and pm.readByReceiver = false")
        long countUnreadBetween(@Param("receiverId") Long receiverId, @Param("senderId") Long senderId);

        @Modifying
        @Query("update PrivateMessage pm set pm.readByReceiver = true " +
                        "where pm.sender.id = :senderId and pm.receiver.id = :receiverId and pm.readByReceiver = false")
        int markConversationRead(@Param("senderId") Long senderId, @Param("receiverId") Long receiverId);
}
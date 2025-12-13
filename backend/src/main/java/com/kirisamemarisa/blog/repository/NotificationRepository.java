package com.kirisamemarisa.blog.repository;

import com.kirisamemarisa.blog.model.Notification;
import com.kirisamemarisa.blog.model.NotificationType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.Collection;

@Repository
public interface NotificationRepository extends JpaRepository<Notification, Long> {
    Page<Notification> findByReceiverIdOrderByCreatedAtDesc(Long receiverId, Pageable pageable);

    Page<Notification> findByReceiverIdAndTypeInOrderByCreatedAtDesc(Long receiverId,
            Collection<NotificationType> types, Pageable pageable);

    long countByReceiverIdAndIsReadFalse(Long receiverId);

    @Modifying
    @Query("UPDATE Notification n SET n.isRead = true WHERE n.receiverId = :userId")
    void markAllAsRead(Long userId);

    @Modifying
    @Query("UPDATE Notification n SET n.isRead = true WHERE n.receiverId = :userId AND n.type IN :types")
    void markAllAsRead(Long userId, Collection<NotificationType> types);
}

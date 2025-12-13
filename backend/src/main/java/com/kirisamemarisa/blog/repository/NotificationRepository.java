package com.kirisamemarisa.blog.repository;

import com.kirisamemarisa.blog.model.Notification;
import com.kirisamemarisa.blog.model.NotificationType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Collection;

@Repository
public interface NotificationRepository extends JpaRepository<Notification, Long> {
    Page<Notification> findByReceiverIdOrderByCreatedAtDesc(Long receiverId, Pageable pageable);

    Page<Notification> findByReceiverIdAndTypeInOrderByCreatedAtDesc(Long receiverId,
            Collection<NotificationType> types, Pageable pageable);

    long countByReceiverIdAndIsReadFalse(Long receiverId);

    @Modifying(clearAutomatically = true)
    @Query("UPDATE Notification n SET n.isRead = true WHERE n.receiverId = :userId")
    void markAllAsRead(@Param("userId") Long userId);

    @Modifying(clearAutomatically = true)
    @Query("UPDATE Notification n SET n.isRead = true WHERE n.receiverId = :userId AND n.type IN :types")
    void markAllAsRead(@Param("userId") Long userId, @Param("types") Collection<NotificationType> types);

    long countByReceiverIdAndIsReadFalseAndTypeIn(Long receiverId, Collection<NotificationType> types);
}

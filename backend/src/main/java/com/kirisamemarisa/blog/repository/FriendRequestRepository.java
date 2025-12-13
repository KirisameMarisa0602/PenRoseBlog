package com.kirisamemarisa.blog.repository;

import com.kirisamemarisa.blog.model.FriendRequest;
import com.kirisamemarisa.blog.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface FriendRequestRepository extends JpaRepository<FriendRequest, Long> {
    List<FriendRequest> findByReceiverAndStatus(User receiver, FriendRequest.Status status);

    Optional<FriendRequest> findBySenderAndReceiverAndStatus(User sender, User receiver, FriendRequest.Status status);

    Optional<FriendRequest> findBySenderAndReceiver(User sender, User receiver);

    List<FriendRequest> findBySenderAndStatus(User sender, FriendRequest.Status status);

    long countByReceiverIdAndStatus(Long receiverId, FriendRequest.Status status);
}

package com.kirisamemarisa.blog.repository;

import com.kirisamemarisa.blog.model.BlockedUser;
import com.kirisamemarisa.blog.model.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface BlockedUserRepository extends JpaRepository<BlockedUser, Long> {

    Optional<BlockedUser> findByBlockerAndBlocked(User blocker, User blocked);

    boolean existsByBlockerAndBlocked(User blocker, User blocked);

    void deleteByBlockerAndBlocked(User blocker, User blocked);
}
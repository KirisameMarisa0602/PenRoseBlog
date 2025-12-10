package com.kirisamemarisa.blog.repository;

import com.kirisamemarisa.blog.model.UserProfile;
import org.springframework.data.jpa.repository.JpaRepository;

public interface UserProfileRepository extends JpaRepository<UserProfile, Long> {
    // 主键即 user_id, 直接使用 findById(userId)
}

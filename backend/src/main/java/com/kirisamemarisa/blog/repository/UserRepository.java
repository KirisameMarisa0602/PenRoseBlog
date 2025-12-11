package com.kirisamemarisa.blog.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import com.kirisamemarisa.blog.model.User;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;
import org.springframework.data.domain.Pageable;

public interface UserRepository extends JpaRepository<User, Long> {
    User findByUsername(String username);

    @Query("SELECT u, up FROM User u LEFT JOIN UserProfile up ON u.id = up.id WHERE u.username LIKE %:username%")
    List<Object[]> searchByUsernameWithProfile(@Param("username") String username, Pageable pageable);
    @Query("SELECT u, up FROM User u LEFT JOIN UserProfile up ON u.id = up.id WHERE up.nickname LIKE %:nickname%")
    List<Object[]> searchByNicknameWithProfile(@Param("nickname") String nickname, Pageable pageable);
    @Query("SELECT COUNT(u) FROM User u WHERE u.username LIKE %:username%")
    long countByUsername(@Param("username") String username);
    @Query("SELECT COUNT(up) FROM UserProfile up WHERE up.nickname LIKE %:nickname%")
    long countByNickname(@Param("nickname") String nickname);
}

package com.kirisamemarisa.blog.repository;

import com.kirisamemarisa.blog.model.Follow;
import com.kirisamemarisa.blog.model.User;
import com.kirisamemarisa.blog.model.UserProfile;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface FollowRepository extends JpaRepository<Follow, Long> {
    Optional<Follow> findByFollowerAndFollowee(User follower, User followee);
    List<Follow> findByFollower(User follower);
    List<Follow> findByFollowee(User followee);

    @Query(value = "SELECT f.follower, p FROM Follow f JOIN UserProfile p ON f.follower.id = p.id WHERE f.followee = :user",
           countQuery = "SELECT COUNT(f) FROM Follow f WHERE f.followee = :user")
    List<Object[]> findFollowersWithProfile(@Param("user") User user, Pageable pageable);
    @Query(value = "SELECT f.followee, p FROM Follow f JOIN UserProfile p ON f.followee.id = p.id WHERE f.follower = :user",
           countQuery = "SELECT COUNT(f) FROM Follow f WHERE f.follower = :user")
    List<Object[]> findFollowingWithProfile(@Param("user") User user, Pageable pageable);
    long countByFollowee(User user);
    long countByFollower(User user);
}

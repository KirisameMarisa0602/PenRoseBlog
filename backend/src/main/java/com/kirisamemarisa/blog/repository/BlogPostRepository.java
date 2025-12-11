package com.kirisamemarisa.blog.repository;

import com.kirisamemarisa.blog.model.BlogPost;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface BlogPostRepository extends JpaRepository<BlogPost, Long> {

        // 用于校验“只有作者能删除”
        Optional<BlogPost> findByIdAndUserId(Long id, Long userId);

        // 搜索：标题包含 OR 标签名包含
        @Query("SELECT DISTINCT b FROM BlogPost b LEFT JOIN b.tags t LEFT JOIN b.category c WHERE " +
                        "(:keyword IS NULL OR :keyword = '' OR b.title LIKE %:keyword% OR t.name LIKE %:keyword%) " +
                        "AND (:userId IS NULL OR b.user.id = :userId) " +
                        "AND (:directory IS NULL OR :directory = '' OR b.directory = :directory) " +
                        "AND (:categoryName IS NULL OR :categoryName = '' OR c.name = :categoryName) " +
                        "AND (:status IS NULL OR :status = '' OR b.status = :status OR (:status = 'PUBLISHED' AND b.status IS NULL))")
        Page<BlogPost> search(@Param("keyword") String keyword,
                        @Param("userId") Long userId,
                        @Param("directory") String directory,
                        @Param("categoryName") String categoryName,
                        @Param("status") String status,
                        Pageable pageable);

        // 获取用户的所有目录
        @Query("SELECT DISTINCT b.directory FROM BlogPost b WHERE b.user.id = :userId AND b.directory IS NOT NULL AND b.directory <> ''")
        List<String> findDirectoriesByUserId(@Param("userId") Long userId);

        // 获取用户收藏的文章
        @Query("SELECT b FROM BlogPost b JOIN BlogPostFavorite f ON b.id = f.blogPost.id LEFT JOIN b.category c WHERE f.user.id = :userId AND (:categoryName IS NULL OR :categoryName = '' OR c.name = :categoryName)")
        Page<BlogPost> findFavoritesByUserId(@Param("userId") Long userId, @Param("categoryName") String categoryName,
                        Pageable pageable);

        // 获取用户收藏文章的所有分类
        @Query("SELECT DISTINCT c.name FROM BlogPostFavorite f JOIN f.blogPost p JOIN p.category c WHERE f.user.id = :userId")
        List<String> findFavoriteCategories(@Param("userId") Long userId);
}

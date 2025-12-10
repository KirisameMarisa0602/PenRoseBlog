package com.kirisamemarisa.blog.model;

import jakarta.persistence.*;

@Entity
@Table(
        name = "comment_reply_like",
        uniqueConstraints = @UniqueConstraint(columnNames = { "reply_id", "user_id" })
)
public class CommentReplyLike {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // 被点赞的回复
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "reply_id", nullable = false)
    private CommentReply reply;

    // 点赞用户
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    public Long getId() { return id; }

    public CommentReply getReply() { return reply; }
    public void setReply(CommentReply reply) { this.reply = reply; }

    public User getUser() { return user; }
    public void setUser(User user) { this.user = user; }
}

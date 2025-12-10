package com.kirisamemarisa.blog.service;

import com.kirisamemarisa.blog.model.User;

public interface BlockService {

    /**
     * 当前用户 blocker 拉黑 target。
     */
    void block(User blocker, User target);

    /**
     * 当前用户 blocker 取消拉黑 target。
     */
    void unblock(User blocker, User target);

    /**
     * blocker 是否已拉黑 target。
     */
    boolean isBlocked(User blocker, User target);

    /**
     * 任意两个用户之间：a 是否已被 b 拉黑。
     * 这里仅保留一个方向：a 被 b 拉黑，就返回 true。
     */
    boolean isBlockedBy(User blocked, User blocker);
}
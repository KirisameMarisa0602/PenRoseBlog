package com.kirisamemarisa.blog.service.impl;

import com.kirisamemarisa.blog.model.BlockedUser;
import com.kirisamemarisa.blog.model.User;
import com.kirisamemarisa.blog.repository.BlockedUserRepository;
import com.kirisamemarisa.blog.service.BlockService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
public class BlockServiceImpl implements BlockService {

    private final BlockedUserRepository blockedUserRepository;

    public BlockServiceImpl(BlockedUserRepository blockedUserRepository) {
        this.blockedUserRepository = blockedUserRepository;
    }

    @Override
    public void block(User blocker, User target) {
        if (blocker == null || target == null || blocker.getId().equals(target.getId())) {
            return;
        }
        boolean exists = blockedUserRepository.existsByBlockerAndBlocked(blocker, target);
        if (exists) return;

        BlockedUser bu = new BlockedUser();
        bu.setBlocker(blocker);
        bu.setBlocked(target);
        blockedUserRepository.save(bu);
    }

    @Override
    public void unblock(User blocker, User target) {
        if (blocker == null || target == null || blocker.getId().equals(target.getId())) {
            return;
        }
        blockedUserRepository.deleteByBlockerAndBlocked(blocker, target);
    }

    @Override
    public boolean isBlocked(User blocker, User target) {
        if (blocker == null || target == null || blocker.getId().equals(target.getId())) {
            return false;
        }
        return blockedUserRepository.existsByBlockerAndBlocked(blocker, target);
    }

    @Override
    public boolean isBlockedBy(User blocked, User blocker) {
        // 语义：blocked 是否被 blocker 拉黑
        return isBlocked(blocker, blocked);
    }
}
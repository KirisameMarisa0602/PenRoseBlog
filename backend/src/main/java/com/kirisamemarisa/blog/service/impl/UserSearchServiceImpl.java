package com.kirisamemarisa.blog.service.impl;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import com.kirisamemarisa.blog.repository.UserRepository;
import com.kirisamemarisa.blog.service.UserSearchService;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import java.util.List;

@Service
public class UserSearchServiceImpl implements UserSearchService {
    private static final Logger logger = LoggerFactory.getLogger(UserSearchServiceImpl.class);
    private final UserRepository userRepository;

    public UserSearchServiceImpl(UserRepository userRepository) {
        this.userRepository = userRepository;
        logger.debug("UserSearchServiceImpl initialized with userRepository={}", userRepository != null);
    }

    @Override
    public List<Object[]> searchByUsernameWithProfile(String username, int page, int size) {
        logger.debug("searchByUsernameWithProfile username={} page={} size={}", username, page, size);
        return userRepository.searchByUsernameWithProfile(username, PageRequest.of(page, size));
    }

    @Override
    public List<Object[]> searchByNicknameWithProfile(String nickname, int page, int size) {
        logger.debug("searchByNicknameWithProfile nickname={} page={} size={}", nickname, page, size);
        return userRepository.searchByNicknameWithProfile(nickname, PageRequest.of(page, size));
    }

    @Override
    public long countByUsername(String username) {
        return userRepository.countByUsername(username);
    }

    @Override
    public long countByNickname(String nickname) {
        return userRepository.countByNickname(nickname);
    }
}

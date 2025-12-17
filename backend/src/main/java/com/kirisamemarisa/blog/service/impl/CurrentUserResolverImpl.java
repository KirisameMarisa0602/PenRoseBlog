package com.kirisamemarisa.blog.service.impl;

import com.kirisamemarisa.blog.model.User;
import com.kirisamemarisa.blog.repository.UserRepository;
import com.kirisamemarisa.blog.service.CurrentUserResolver;
import org.springframework.stereotype.Service;
import org.springframework.security.core.userdetails.UserDetails;

@Service
public class CurrentUserResolverImpl implements CurrentUserResolver {

    private final UserRepository userRepository;

    public CurrentUserResolverImpl(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    @Override
    public User resolve(Object principal) {
        if (principal instanceof Long userId) {
            return userRepository.findById(userId).orElse(null);
        }
        if (principal instanceof UserDetails userDetails) {
            return userRepository.findByUsername(userDetails.getUsername());
        }
        return null;
    }
}

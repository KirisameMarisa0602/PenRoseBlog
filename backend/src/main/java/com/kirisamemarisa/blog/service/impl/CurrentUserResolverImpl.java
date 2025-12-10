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
    public User resolve(UserDetails principal, Long headerUserId) {
        if (principal != null) {
            return userRepository.findByUsername(principal.getUsername());
        }
        if (headerUserId != null) {
            return userRepository.findById(headerUserId).orElse(null);
        }
        return null;
    }
}

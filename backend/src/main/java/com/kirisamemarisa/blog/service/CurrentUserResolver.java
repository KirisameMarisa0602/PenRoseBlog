package com.kirisamemarisa.blog.service;

import com.kirisamemarisa.blog.model.User;
import org.springframework.security.core.userdetails.UserDetails;

public interface CurrentUserResolver {

    User resolve(Object principal);
}

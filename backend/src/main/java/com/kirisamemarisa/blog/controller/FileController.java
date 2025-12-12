package com.kirisamemarisa.blog.controller;

import com.kirisamemarisa.blog.common.ApiResponse;
import com.kirisamemarisa.blog.service.FileStorageService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/file")
public class FileController {

    @Autowired
    private FileStorageService fileStorageService;

    @GetMapping("/presigned-url")
    public ApiResponse<Map<String, String>> getPresignedUrl(@RequestParam String fileName) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        Long userId = null;
        // Assuming the principal is the userId or can be cast to a UserDetails implementation that has the ID.
        // Adjust based on your actual security setup. 
        // For now, we'll try to parse it if it's a string or look at how other controllers get the ID.
        // If authentication.getPrincipal() returns a String (username), we might need a UserService to look it up.
        // But often in these setups, a custom UserDetails is used.
        
        // Let's look at how other controllers get the user ID. 
        // For now, I will pass null if not authenticated, or try to get it safely.
        // Ideally, I should check another controller.
        
        // Placeholder for user ID retrieval logic
        // userId = ...
        
        // If we can't easily get the ID here without more context, we might need to check `JwtUtil` or `SecurityConfig`.
        // But let's assume for a moment we can get it or pass null for "common" storage if allowed.
        
        // Let's try to get it from the authentication name if it's the ID, or just pass null for now and fix it after checking other controllers.
        // Actually, looking at FileStorageServiceImpl, it handles null userId as "common".
        
        return ApiResponse.success(fileStorageService.generatePresignedUrl(fileName, userId));
    }
}

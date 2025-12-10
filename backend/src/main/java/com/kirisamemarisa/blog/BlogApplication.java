package com.kirisamemarisa.blog;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.autoconfigure.security.servlet.UserDetailsServiceAutoConfiguration;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import com.kirisamemarisa.blog.config.ResourceProperties;

import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication(exclude = { UserDetailsServiceAutoConfiguration.class })
@EnableConfigurationProperties(ResourceProperties.class)
@EnableScheduling
public class BlogApplication {

    public static void main(String[] args) {
        SpringApplication.run(BlogApplication.class, args);
    }

}

package com.kirisamemarisa.blog.config;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.Customizer;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;
import org.springframework.web.filter.CorsFilter;

@Configuration
@EnableConfigurationProperties(ResourceProperties.class)
public class SecurityConfig {

    @Autowired
    private JwtAuthenticationFilter jwtAuthenticationFilter;

    @Bean
    // 定义安全过滤链
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
                .cors(Customizer.withDefaults()) // Enable CORS with default config (uses CorsFilter bean)
                .csrf(AbstractHttpConfigurer::disable)// 跨站请求防护禁用
                .authorizeHttpRequests(auth -> auth
                        // .requestMatchers("/api/public/**", "/files/**", "/sources/**",
                        // "/site_assets/**")
                        .requestMatchers("/api/public/**", "/files/**", "/sources/**", "/site_assets/**", "/avatar/**",
                                "/background/**", "/profile/**")
                        .permitAll()
                        .requestMatchers("/api/user/login", "/api/user/register").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/user/profile/**", "/api/user/*/stats").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/blogpost/**", "/api/blogpost").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/comment/**", "/api/comment-reply/**").permitAll()
                        .requestMatchers("/api/blogview/**").permitAll()
                        .requestMatchers("/api/users/search").permitAll()
                        .requestMatchers("/api/friends/subscribe", "/api/messages/subscribe/**").permitAll() // Allow
                                                                                                             // SSE
                                                                                                             // subscriptions
                        .anyRequest().authenticated())
                .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class);
        return http.build();
    }

    @Bean
    // 定义跨域资源共享过滤器
    public CorsFilter corsFilter() {
        // 跨域资源共享配置对象
        CorsConfiguration config = new CorsConfiguration();
        config.addAllowedOriginPattern("*");// 允许所有来源（域名）
        config.addAllowedHeader("*");// 允许所有请求头
        config.addAllowedMethod("*");// 允许所有请求方法
        config.setAllowCredentials(true);// 允许携带凭证（如Cookie）
        // 定义基于URL的跨域配置源
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        // 将跨域配置应用到所有URL路径
        source.registerCorsConfiguration("/**", config);
        return new CorsFilter(source);
    }
}

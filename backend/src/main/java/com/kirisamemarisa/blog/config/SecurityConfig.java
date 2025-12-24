package com.kirisamemarisa.blog.config;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.http.SessionCreationPolicy;
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
            // JWT 模式：无状态，避免默认 session 行为引入歧义
            .sessionManagement(sm -> sm.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            // REST API：禁用默认表单登录/HTTP Basic，防止 401 时跳转页面
            .formLogin(AbstractHttpConfigurer::disable)
            .httpBasic(AbstractHttpConfigurer::disable)
            .exceptionHandling(eh -> eh.authenticationEntryPoint((req, res, ex) -> {
                res.setStatus(HttpStatus.UNAUTHORIZED.value());
                res.setContentType("application/json;charset=UTF-8");
                res.getWriter().write("{\"code\":401,\"message\":\"未认证\",\"data\":null}");
            }))
                .authorizeHttpRequests(auth -> auth
                // 预检请求必须放行，否则跨域请求会在浏览器侧被拦截
                .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
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
                        .anyRequest().authenticated())
                .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class);
        return http.build();
    }

    @Bean
    // 定义跨域资源共享过滤器
    public CorsFilter corsFilter() {
        // 跨域资源共享配置对象
        CorsConfiguration config = new CorsConfiguration();
        // 限制允许的来源
        config.setAllowedOriginPatterns(java.util.Arrays.asList(
                // local dev
            "http://localhost:*",
            "http://127.0.0.1:*",
            "https://localhost:*",
            "https://127.0.0.1:*",
                // production IP / domain (如使用 HTTPS，请确保这里也覆盖)
            "http://62.234.102.189",
            "http://62.234.102.189:*",
            "https://62.234.102.189",
            "https://62.234.102.189:*"
        ));
        config.addAllowedHeader("*"); // 允许所有请求头
        config.addAllowedMethod("*"); // 允许所有请求方法
        // 与通配来源同时开启凭证将导致浏览器拒绝；Bearer Token 方案无需 Cookie
        config.setAllowCredentials(true); // 允许凭证（如果前端需要发送 Cookie 或认证头）
        // 预检缓存（减少 OPTIONS 次数）
        config.setMaxAge(3600L);
        // 定义基于URL的跨域配置源
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        // 将跨域配置应用到所有URL路径
        source.registerCorsConfiguration("/**", config);
        return new CorsFilter(source);
    }
}

package com.kirisamemarisa.blog.config;

import com.qcloud.cos.COSClient;
import com.qcloud.cos.ClientConfig;
import com.qcloud.cos.auth.BasicCOSCredentials;
import com.qcloud.cos.auth.COSCredentials;
import com.qcloud.cos.region.Region;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class CosConfig {

    private final CosProperties cosProperties;

    public CosConfig(CosProperties cosProperties) {
        this.cosProperties = cosProperties;
    }

    @Bean
    public COSClient cosClient() {
        COSCredentials cred = new BasicCOSCredentials(cosProperties.getSecretId(), cosProperties.getSecretKey());
        ClientConfig clientConfig = new ClientConfig(new Region(cosProperties.getRegion()));

        // 如果开启了全球加速
        if (cosProperties.isEnableAccelerate()) {
            // 开启全球加速域名
            // 注意：需要在腾讯云控制台开启该功能
            // 域名格式会变为: <bucket>.cos-accelerate.<region>.myqcloud.com
            // 或者 <bucket>.cos.accelerate.myqcloud.com (取决于 SDK 版本和配置)
            // SDK 会自动处理
            // 修正：使用 setUseAccelerate 方法 (适用于 5.6.x 版本)
            // 如果 SDK 版本较旧，可能需要升级或使用其他方式
            try {
                // 尝试调用 setUseAccelerate (常见于 5.6.x)
                clientConfig.getClass().getMethod("setUseAccelerate", boolean.class).invoke(clientConfig, true);
            } catch (Exception e) {
                // 如果方法不存在，尝试 setUseCosAccelerate (部分版本)
                try {
                    clientConfig.getClass().getMethod("setUseCosAccelerate", boolean.class).invoke(clientConfig, true);
                } catch (Exception ex) {
                    // 如果都不存在，打印警告
                    System.err.println("Warning: Could not enable COS acceleration. Please check SDK version.");
                }
            }
        }

        return new COSClient(cred, clientConfig);
    }
}

package com.kirisamemarisa.blog.events;

import com.kirisamemarisa.blog.dto.NotificationDTO;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.amqp.core.AmqpAdmin;
import org.springframework.amqp.core.Binding;
import org.springframework.amqp.core.BindingBuilder;
import org.springframework.amqp.core.Queue;
import org.springframework.amqp.core.TopicExchange;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.amqp.support.converter.Jackson2JsonMessageConverter;
import org.springframework.amqp.support.converter.MessageConverter;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.stereotype.Component;
import org.springframework.amqp.core.AnonymousQueue;

/**
 * Simple RabbitMQ bridge: publish NotificationMessage to exchange with routing key 'notification.{userId}',
 * and each instance creates an exclusive anonymous queue bound to the exchange so all instances receive messages
 * and forward to local SSE emitters.
 */
@Configuration
class RabbitConfig {
    @Value("${app.rabbitmq.exchange:blog.notifications}")
    private String exchangeName;

    @Bean
    public TopicExchange notificationExchange() {
        return new TopicExchange(exchangeName, true, false);
    }

    @Bean
    public AnonymousQueue notificationQueue() {
        // anonymous exclusive auto-delete queue ensures each instance receives a copy
        return new AnonymousQueue();
    }

    @Bean
    public Binding binding(AnonymousQueue notificationQueue, TopicExchange notificationExchange) {
        return BindingBuilder.bind(notificationQueue).to(notificationExchange).with("notification.#");
    }

    @Bean
    public MessageConverter messageConverter() {
        return new Jackson2JsonMessageConverter();
    }

}

@Component
public class RabbitNotificationBridge {
    private static final Logger logger = LoggerFactory.getLogger(RabbitNotificationBridge.class);

    private final RabbitTemplate rabbitTemplate;
    private final NotificationEventPublisher publisher;
    private final String exchangeName;

    public RabbitNotificationBridge(RabbitTemplate rabbitTemplate, NotificationEventPublisher publisher,
                                    @Value("${app.rabbitmq.exchange:blog.notifications}") String exchangeName) {
        this.rabbitTemplate = rabbitTemplate;
        this.publisher = publisher;
        this.exchangeName = exchangeName;
        // configure converter
        this.rabbitTemplate.setMessageConverter(new Jackson2JsonMessageConverter());
    }

    public void publish(NotificationMessage msg) {
        if (msg == null || msg.getReceiverId() == null) return;
        try {
            // routing key by receiver id
            String routingKey = "notification." + msg.getReceiverId();
            rabbitTemplate.convertAndSend(exchangeName, routingKey, msg);
        } catch (Exception ex) {
            logger.warn("Failed to publish notification to RabbitMQ: {}", ex.toString());
            // fallback: send locally
            try {
                publisher.sendNotification(msg.getReceiverId(), toDto(msg));
            } catch (Exception e) {
                logger.warn("Failed to fallback-send notification locally: {}", e.toString());
            }
        }
    }

    @RabbitListener(queues = "#{notificationQueue.name}")
    public void onMessage(NotificationMessage msg) {
        if (msg == null) return;
        try {
            // deliver to local emitters only
            publisher.sendNotification(msg.getReceiverId(), toDto(msg));
        } catch (Exception ex) {
            logger.warn("Failed to deliver rabbit notification to local emitters: {}", ex.toString());
        }
    }

    private NotificationDTO toDto(NotificationMessage m) {
        NotificationDTO d = new NotificationDTO();
        d.setType(m.getType());
        d.setRequestId(m.getRequestId());
        d.setSenderId(m.getSenderId());
        d.setReceiverId(m.getReceiverId());
        d.setMessage(m.getMessage());
        d.setStatus(m.getStatus());
        d.setCreatedAt(m.getCreatedAt());
        d.setReferenceId(m.getReferenceId());
        d.setReferenceExtraId(m.getReferenceExtraId());
        return d;
    }
}

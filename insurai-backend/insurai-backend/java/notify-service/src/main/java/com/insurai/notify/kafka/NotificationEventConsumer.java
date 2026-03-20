package com.insurai.notify.kafka;

import com.insurai.notify.dto.NotificationEvent;
import com.insurai.notify.service.NotificationDispatcher;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
@Slf4j
public class NotificationEventConsumer {

    private final NotificationDispatcher notificationDispatcher;

    @KafkaListener(topics = "notification-events", groupId = "notify-service-group")
    public void consume(NotificationEvent event) {
        try {
            log.info("Received notification event: {} for {}", event.getEventId(), event.getRecipientEmail());
            notificationDispatcher.dispatch(event);
        } catch (Exception e) {
            log.error("Error processing notification event {}: {}", event.getEventId(), e.getMessage());
        }
    }
}

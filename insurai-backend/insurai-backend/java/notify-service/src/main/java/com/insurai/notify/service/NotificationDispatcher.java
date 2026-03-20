package com.insurai.notify.service;

import com.insurai.notify.dto.NotificationEvent;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.Map;

/**
 * Routes notifications to appropriate channel (email, etc.)
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class NotificationDispatcher {

    private final EmailService emailService;
    private final TemplateService templateService;

    public void dispatch(NotificationEvent event) {
        if (event.getRecipientEmail() == null || event.getRecipientEmail().isBlank()) {
            log.warn("Notification event {} has no recipient email - skipping", event.getEventId());
            return;
        }

        if ("EMAIL".equalsIgnoreCase(event.getChannel())) {
            dispatchToEmail(event);
        } else {
            log.warn("Unsupported notification channel: {} for event {}", event.getChannel(), event.getEventId());
        }
    }

    private void dispatchToEmail(NotificationEvent event) {
        String subject = event.getSubject() != null ? event.getSubject() : "InsurAI Notification";
        Map<String, Object> templateData = event.getTemplateData() != null
                ? new HashMap<>(event.getTemplateData())
                : new HashMap<>();
        if (event.getRecipientName() != null) {
            templateData.put("recipientName", event.getRecipientName());
        }
        String body = templateService.render(event.getTemplateName(), templateData);
        emailService.sendEmail(event.getRecipientEmail(), subject, body);
    }
}

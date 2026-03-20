package com.insurai.notify.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.Map;

/**
 * Simple string replacement for email templates.
 * Templates: policy-approved, policy-rejected, claim-submitted, claim-approved, claim-fraud-flagged, renewal-reminder, workflow-assigned, compliance-alert
 */
@Service
@Slf4j
public class TemplateService {

    private static final Map<String, String> TEMPLATES = Map.of(
            "policy-approved", "Dear {{recipientName}},\n\nYour policy {{policyNumber}} has been approved.\nHolder: {{holderName}}\nApproved at: {{approvedAt}}\n\nBest regards,\nInsurAI Team",
            "policy-rejected", "Dear {{recipientName}},\n\nYour policy {{policyNumber}} has been rejected.\nHolder: {{holderName}}\n\nBest regards,\nInsurAI Team",
            "claim-submitted", "Dear {{recipientName}},\n\nYour claim {{claimNumber}} has been submitted successfully.\nPolicy: {{policyNumber}}\nSubmitted at: {{submittedAt}}\n\nBest regards,\nInsurAI Team",
            "claim-approved", "Dear {{recipientName}},\n\nYour claim {{claimNumber}} has been approved.\nPolicy: {{policyNumber}}\nApproved at: {{approvedAt}}\n\nBest regards,\nInsurAI Team",
            "claim-fraud-flagged", "Dear {{recipientName}},\n\nYour claim {{claimNumber}} has been flagged for review.\nPolicy: {{policyNumber}}\nPlease contact support for more information.\n\nBest regards,\nInsurAI Team",
            "renewal-reminder", "Dear {{recipientName}},\n\nYour policy {{policyNumber}} is due for renewal.\nHolder: {{holderName}}\nRenewal date: {{renewalDate}}\n\nBest regards,\nInsurAI Team",
            "workflow-assigned", "Dear {{recipientName}},\n\nA workflow has been assigned to you.\nPolicy: {{policyNumber}}\nAssigned at: {{assignedAt}}\n\nBest regards,\nInsurAI Team",
            "compliance-alert", "Dear {{recipientName}},\n\nCompliance alert for policy {{policyNumber}}.\nDetails: {{details}}\n\nBest regards,\nInsurAI Team"
    );

    public String render(String templateName, Map<String, Object> templateData) {
        String template = TEMPLATES.getOrDefault(templateName, "Dear {{recipientName}},\n\n{{subject}}\n\nBest regards,\nInsurAI Team");

        if (templateData == null) {
            return template;
        }

        String result = template;
        for (Map.Entry<String, Object> entry : templateData.entrySet()) {
            String placeholder = "{{" + entry.getKey() + "}}";
            String value = entry.getValue() != null ? entry.getValue().toString() : "";
            result = result.replace(placeholder, value);
        }

        return result;
    }
}

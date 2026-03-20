package com.insurai.policy.service;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import java.time.Year;

@Component
public class PolicyNumberGenerator {

    private static final String PREFIX = "POL";
    private static final String FORMAT = "%s-%d-%04d";

    private final JdbcTemplate jdbcTemplate;

    public PolicyNumberGenerator(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    public String generate() {
        int year = Year.now().getValue();
        Integer seq = jdbcTemplate.queryForObject(
                "SELECT nextval('policy_number_seq')",
                Integer.class
        );
        return String.format(FORMAT, PREFIX, year, seq);
    }
}

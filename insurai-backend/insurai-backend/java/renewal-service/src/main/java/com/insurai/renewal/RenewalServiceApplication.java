package com.insurai.renewal;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class RenewalServiceApplication {

    public static void main(String[] args) {
        SpringApplication.run(RenewalServiceApplication.class, args);
    }
}

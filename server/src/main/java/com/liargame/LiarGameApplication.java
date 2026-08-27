package com.liargame;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@EnableScheduling
@SpringBootApplication
public class LiarGameApplication {

    public static void main(String[] args) {
        SpringApplication.run(LiarGameApplication.class, args);
    }
}

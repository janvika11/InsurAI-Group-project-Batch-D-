package com.insurai.claims.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.UUID;

@Service
@Slf4j
public class DocumentStorageService {

    private static final String UPLOAD_DIR = "./uploads/claims/";

    public String save(MultipartFile file, UUID claimId, UUID uploadedBy) throws IOException {
        Path basePath = Paths.get(UPLOAD_DIR, claimId.toString());
        Files.createDirectories(basePath);

        String originalFilename = file.getOriginalFilename();
        String extension = originalFilename != null && originalFilename.contains(".")
                ? originalFilename.substring(originalFilename.lastIndexOf("."))
                : "";
        String storedFilename = UUID.randomUUID() + extension;
        Path targetPath = basePath.resolve(storedFilename);

        Files.copy(file.getInputStream(), targetPath);
        String relativePath = UPLOAD_DIR + claimId + "/" + storedFilename;
        log.info("Saved document {} for claim {}", relativePath, claimId);
        return relativePath;
    }
}

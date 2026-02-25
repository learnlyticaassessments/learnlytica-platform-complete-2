FROM eclipse-temurin:17-jdk-alpine

# Install Maven and Gradle
RUN apk add --no-cache maven gradle

# Install common testing libraries
RUN mkdir -p /root/.m2/repository

# Copy Maven settings for dependencies
RUN mkdir -p /workspace

# Install JUnit 5, Mockito, and other common testing libraries
# These will be downloaded when Maven runs

# Security: Create non-root user
RUN addgroup -g 1001 -S coderunner && \
    adduser -u 1001 -S coderunner -G coderunner

# Set working directory
WORKDIR /workspace

# Switch to non-root user
USER coderunner

# Resource limits enforced by Docker run command:
# CPU: 1 core, Memory: 512MB, Network: Disabled, Timeout: 30s

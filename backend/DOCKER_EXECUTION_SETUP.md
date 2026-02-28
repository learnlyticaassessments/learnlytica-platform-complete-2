# Docker Execution Setup

## Prerequisites

1. Docker installed and running
2. Node.js backend server

## Build Execution Images

```bash
cd docker/execution-environments

# Build Node.js image
docker build -t learnlytica/executor-node:latest -f Dockerfile.node .

# Build Python image
docker build -t learnlytica/executor-python:latest -f Dockerfile.python .

# Build .NET image
docker build -t learnlytica/executor-dotnet:latest -f Dockerfile.dotnet .
```

## Verify Images

```bash
docker images | grep learnlytica
```

## Test Execution

```bash
# Test Node.js execution
docker run --rm \
  --network none \
  --cpus="1" \
  --memory="512m" \
  learnlytica/executor-node:latest \
  node -e "console.log('Hello')"

# Test Python execution
docker run --rm \
  --network none \
  --cpus="1" \
  --memory="512m" \
  learnlytica/executor-python:latest \
  python -c "print('Hello')"

# Test .NET execution
docker run --rm \
  --cpus="1" \
  --memory="512m" \
  learnlytica/executor-dotnet:latest \
  dotnet --version
```

## Security Features

- ✅ No network access (--network none)
- ✅ CPU limit (1 core)
- ✅ Memory limit (512MB)
- ✅ Timeout (30 seconds)
- ✅ Non-root user
- ✅ Read-only filesystem (except /workspace)
- ✅ Automatic cleanup (--rm)

## Production Deployment

For production, consider:
- Using container orchestration (Kubernetes)
- Pod security policies
- Resource quotas
- Network policies
- Image scanning
- Regular updates

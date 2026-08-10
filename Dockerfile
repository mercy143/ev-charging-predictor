# ==========================================
# STAGE 1: Frontend Optimization Compilation
# ==========================================
FROM node:20-alpine AS frontend-builder

WORKDIR /frontend
COPY frontend/package*.json ./
# FIX: Use npm install with force flag to resolve cross-platform build dependencies
RUN npm install --force
COPY frontend/ ./
RUN npm run build

# ==========================================
# STAGE 2: Python Production Runtime Setup
# ==========================================
FROM python:3.11-slim AS runtime

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

# Install lightweight system tools required for numpy/pandas matrices
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Optimize Python package layer caching
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend scripts and raw datasets over to container context folder
COPY . /app
# Pull down the compiled React production static bundles from Stage 1
COPY --from=frontend-builder /frontend/dist /app/frontend/dist

# Automatically execute training cycle during assembly
RUN python train.py

EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]

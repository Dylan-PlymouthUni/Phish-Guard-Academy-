FROM python:3.11-slim

# Install system dependencies (Tesseract OCR + Node.js for React build)
RUN apt-get update && apt-get install -y \
    tesseract-ocr \
    tesseract-ocr-eng \
    nodejs \
    npm \
    curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Build React frontend
WORKDIR /app/phish-guard-academy
RUN npm ci && npm run build

# Back to app root
WORKDIR /app

# Expose port
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

# Run server (use python -m to ensure uvicorn is found)
CMD ["python", "-m", "uvicorn", "ml.api:app", "--host", "0.0.0.0", "--port", "8000"]

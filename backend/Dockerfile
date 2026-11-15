# Backend Dockerfile - Smart Campus FastAPI
FROM python:3.11-slim

WORKDIR /app

# Install python dependencies with generous timeout and retries for resilient builds on any connection speed
COPY requirements.txt .
RUN pip install --no-cache-dir --default-timeout=1000 --retries=10 -r requirements.txt

# Copy application source
COPY . .

# Expose FastAPI port
EXPOSE 8000

# Health check using Python's built-in urllib (no external curl or apt package needed)
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/health')" || exit 1

# Start Uvicorn server (respects dynamic PaaS $PORT, defaults to 8000)
CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]


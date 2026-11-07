# Backend Dockerfile - Smart Campus FastAPI
FROM python:3.11-slim

WORKDIR /app

# Install python dependencies directly (pre-compiled binary wheels, zero apt downloads)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application source
COPY . .

# Expose FastAPI port
EXPOSE 8000

# Health check using Python's built-in urllib (no external curl or apt package needed)
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/health')" || exit 1

# Start Uvicorn server
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]


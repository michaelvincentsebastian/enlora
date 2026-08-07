FROM python:3.12-slim

WORKDIR /app

# System deps for psycopg2 and boto3
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    libpq-dev \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application source
COPY . .

# Platform API on port 8001 (storage API is a separate process on 8000)
EXPOSE 8001

CMD ["uvicorn", "enlora_platform.api.main:app", "--host", "0.0.0.0", "--port", "8001"]

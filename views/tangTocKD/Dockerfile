FROM python:3.11-slim

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first for better caching
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy parser script
COPY parser-tangtoc.py .

# Make script executable
RUN chmod +x parser-tangtoc.py

# Create uploads directory
RUN mkdir -p /app/uploads

# Set entrypoint
ENTRYPOINT ["python3", "parser-tangtoc.py"]

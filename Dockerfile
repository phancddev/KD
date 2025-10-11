FROM node:18-alpine

# Install Python, pip, and netcat for database health check
RUN apk add --no-cache python3 py3-pip netcat-openbsd

# Tạo thư mục làm việc
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install Node.js dependencies
RUN npm ci --only=production

# Copy Python requirements and install
COPY scripts/requirements.txt ./scripts/
RUN pip3 install --no-cache-dir --break-system-packages -r scripts/requirements.txt

# Copy source code
COPY . .

# Create uploads directories
RUN mkdir -p uploads/avatars uploads/temp

# Make Python scripts executable
RUN chmod +x scripts/csv_parser.py
RUN chmod +x scripts/parser-tangtoc.py

# Copy and make entrypoint executable
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

# Expose port
EXPOSE 2701

# Use entrypoint to run migrations before starting app
ENTRYPOINT ["/docker-entrypoint.sh"]
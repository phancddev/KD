FROM node:18-alpine

# Install Python and pip
RUN apk add --no-cache python3 py3-pip

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

# Create uploads directory
RUN mkdir -p uploads

# Make Python script executable
RUN chmod +x scripts/csv_parser.py

# Expose port
EXPOSE 2701

# Start the application
CMD ["npm", "start"]
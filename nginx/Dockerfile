FROM nginx:alpine

# Install openssl for generating self-signed certificates if needed
RUN apk add --no-cache openssl

# Copy custom nginx configuration
COPY nginx.conf /etc/nginx/nginx.conf
COPY conf.d/ /etc/nginx/conf.d/

# Create directory for SSL certificates
RUN mkdir -p /etc/nginx/ssl

# Create a default self-signed certificate (will be replaced by real certs)
RUN openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
    -keyout /etc/nginx/ssl/default.key \
    -out /etc/nginx/ssl/default.crt \
    -subj "/C=VN/ST=Vietnam/L=HCM/O=NQD/OU=IT/CN=localhost"

# Expose ports
EXPOSE 80 443

CMD ["nginx", "-g", "daemon off;"]
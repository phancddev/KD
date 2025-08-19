-- Tạo bảng login_logs để lưu trữ thông tin đăng nhập chi tiết
CREATE TABLE IF NOT EXISTS login_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  username VARCHAR(50) NOT NULL,
  ip_address VARCHAR(45) NOT NULL,
  user_agent TEXT,
  device_type ENUM('desktop', 'mobile', 'tablet', 'unknown') DEFAULT 'unknown',
  browser_name VARCHAR(100),
  browser_version VARCHAR(50),
  os_name VARCHAR(100),
  os_version VARCHAR(50),
  device_model VARCHAR(200),
  country VARCHAR(100),
  city VARCHAR(100),
  timezone VARCHAR(50),
  login_status ENUM('success', 'failed', 'logout') DEFAULT 'success',
  login_method ENUM('password', 'session', 'auto') DEFAULT 'password',
  session_id VARCHAR(255),
  login_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  logout_at TIMESTAMP NULL,
  session_duration INT NULL,
  is_suspicious BOOLEAN DEFAULT FALSE,
  suspicious_reason TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user_id (user_id),
  INDEX idx_ip_address (ip_address),
  INDEX idx_login_at (login_at),
  INDEX idx_status (login_status)
);

-- Tạo bảng user_sessions để theo dõi phiên đăng nhập
CREATE TABLE IF NOT EXISTS user_sessions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  session_id VARCHAR(255) NOT NULL UNIQUE,
  ip_address VARCHAR(45) NOT NULL,
  user_agent TEXT,
  device_info JSON,
  login_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  is_active BOOLEAN DEFAULT TRUE,
  logout_reason ENUM('manual', 'timeout', 'forced', 'error') NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_session_id (session_id),
  INDEX idx_user_id (user_id),
  INDEX idx_active (is_active)
);

-- Tạo bảng device_fingerprints để theo dõi thiết bị
CREATE TABLE IF NOT EXISTS device_fingerprints (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  fingerprint_hash VARCHAR(255) NOT NULL,
  device_type ENUM('desktop', 'mobile', 'tablet', 'unknown') DEFAULT 'unknown',
  browser_name VARCHAR(100),
  browser_version VARCHAR(50),
  os_name VARCHAR(100),
  os_version VARCHAR(50),
  device_model VARCHAR(200),
  screen_resolution VARCHAR(50),
  color_depth INT,
  timezone VARCHAR(50),
  language VARCHAR(10),
  first_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  login_count INT DEFAULT 1,
  is_trusted BOOLEAN DEFAULT FALSE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE KEY unique_user_fingerprint (user_id, fingerprint_hash),
  INDEX idx_fingerprint_hash (fingerprint_hash),
  INDEX idx_device_type (device_type)
);

-- Tạo bảng ip_geolocation để cache thông tin địa lý
CREATE TABLE IF NOT EXISTS ip_geolocation (
  id INT AUTO_INCREMENT PRIMARY KEY,
  ip_address VARCHAR(45) NOT NULL UNIQUE,
  country VARCHAR(100),
  country_code VARCHAR(10),
  region VARCHAR(100),
  city VARCHAR(100),
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  timezone VARCHAR(50),
  isp VARCHAR(200),
  org VARCHAR(200),
  first_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  lookup_count INT DEFAULT 1,
  INDEX idx_ip_address (ip_address),
  INDEX idx_country (country),
  INDEX idx_city (city)
); 
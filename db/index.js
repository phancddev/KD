import mysql from 'mysql2/promise';
import config from '../config.js';

// Tạo pool kết nối
const pool = mysql.createPool({
  host: config.db.host,
  port: config.db.port,
  user: config.db.user,
  password: config.db.password,
  database: config.db.database,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Kiểm tra kết nối
async function testConnection() {
  try {
    const connection = await pool.getConnection();
    console.log('Kết nối đến MariaDB thành công!');
    connection.release();
    return true;
  } catch (error) {
    console.error('Không thể kết nối đến MariaDB:', error);
    return false;
  }
}

// Khởi tạo cơ sở dữ liệu
async function initDatabase() {
  try {
    // Đọc và thực thi file SQL khởi tạo
    const fs = await import('fs');
    const path = await import('path');

    const initSqlPath = path.join(process.cwd(), 'db', 'init', '01-init.sql');
    const tangtocSqlPath = path.join(process.cwd(), 'db', 'init', '01-tangtoc-migration.sql');
    const adminSqlPath = path.join(process.cwd(), 'db', 'init', '02-create-admin.sql');
    const tangtocReportsSqlPath = path.join(process.cwd(), 'db', 'init', '02-tangtoc-reports-migration.sql');
    const dataNodesSqlPath = path.join(process.cwd(), 'db', 'init', '04-host-dan-data-node-migration.sql');

    try {
      // Thực thi script khởi tạo chính
      const initSql = fs.readFileSync(initSqlPath, 'utf8');
      const statements = initSql.split(';').filter(stmt => stmt.trim());

      for (const statement of statements) {
        if (statement.trim()) {
          await pool.query(statement);
        }
      }

      // Thực thi script migration Tăng Tốc
      const tangtocSql = fs.readFileSync(tangtocSqlPath, 'utf8');
      const tangtocStatements = tangtocSql.split(';').filter(stmt => stmt.trim());

      for (const statement of tangtocStatements) {
        if (statement.trim()) {
          await pool.query(statement);
        }
      }

      // Thực thi script tạo admin
      const adminSql = fs.readFileSync(adminSqlPath, 'utf8');
      const adminStatements = adminSql.split(';').filter(stmt => stmt.trim());

      for (const statement of adminStatements) {
        if (statement.trim()) {
          await pool.query(statement);
        }
      }

      // Thực thi script migration báo lỗi Tăng Tốc
      console.log('⚙️  Đang chạy migration báo lỗi Tăng Tốc...');
      const tangtocReportsSql = fs.readFileSync(tangtocReportsSqlPath, 'utf8');
      const tangtocReportsStatements = tangtocReportsSql.split(';').filter(stmt => stmt.trim());

      for (const statement of tangtocReportsStatements) {
        if (statement.trim()) {
          await pool.query(statement);
        }
      }

      // Thực thi script migration Data Nodes
      console.log('⚙️  Đang chạy migration Data Nodes...');
      const dataNodesSql = fs.readFileSync(dataNodesSqlPath, 'utf8');
      const dataNodesStatements = dataNodesSql.split(';').filter(stmt => stmt.trim());

      for (const statement of dataNodesStatements) {
        if (statement.trim()) {
          await pool.query(statement);
        }
      }

      // Sau khi init từ file, chạy migrations an toàn
      await runMigrations();
      console.log('Khởi tạo cơ sở dữ liệu thành công!');
      return true;
    } catch (fileError) {
      console.error('Lỗi khi đọc file SQL:', fileError);
      // Fallback: tạo các bảng cơ bản
      console.log('Sử dụng fallback: tạo bảng cơ bản...');
      await createBasicTables();
      // Dù fallback hay không cũng chạy migrations an toàn
      await runMigrations();
      return true;
    }
  } catch (error) {
    console.error('Lỗi khởi tạo cơ sở dữ liệu:', error);
    return false;
  }
}

// Fallback function để tạo bảng cơ bản
async function createBasicTables() {
  // Tạo bảng users
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id INT AUTO_INCREMENT PRIMARY KEY,
      username VARCHAR(50) NOT NULL UNIQUE,
      password VARCHAR(255) NOT NULL,
      email VARCHAR(100) UNIQUE,
      full_name VARCHAR(100) NOT NULL,
      is_admin BOOLEAN DEFAULT FALSE,
      is_active BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      last_login TIMESTAMP NULL,
      last_ip VARCHAR(45) NULL
    )
  `);

  // Tạo bảng questions (với đầy đủ cột cho Tăng Tốc)
  await pool.query(`
    CREATE TABLE IF NOT EXISTS questions (
      id INT AUTO_INCREMENT PRIMARY KEY,
      question_number INT NULL,
      text TEXT NOT NULL,
      answer TEXT NOT NULL,
      image_url TEXT NULL,
      category ENUM('khoidong', 'vuotchuongngaivat', 'tangtoc', 'vedich') DEFAULT 'khoidong',
      difficulty ENUM('easy', 'medium', 'hard') DEFAULT 'medium',
      time_limit INT NULL,
      created_by INT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
    )
  `);

  // Tạo bảng answers (đáp án bổ sung)
  await pool.query(`
    CREATE TABLE IF NOT EXISTS answers (
      id INT AUTO_INCREMENT PRIMARY KEY,
      question_id INT NOT NULL,
      answer TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE
    )
  `);

  // Tạo bảng rooms
  await pool.query(`
    CREATE TABLE IF NOT EXISTS rooms (
      id INT AUTO_INCREMENT PRIMARY KEY,
      code VARCHAR(10) NOT NULL UNIQUE,
      name VARCHAR(100) NOT NULL,
      created_by INT NOT NULL,
      status ENUM('waiting', 'playing', 'finished') DEFAULT 'waiting',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      finished_at TIMESTAMP NULL,
      FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  // Tạo bảng room_participants
  await pool.query(`
    CREATE TABLE IF NOT EXISTS room_participants (
      id INT AUTO_INCREMENT PRIMARY KEY,
      room_id INT NOT NULL,
      user_id INT NOT NULL,
      score INT DEFAULT 0,
      joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE KEY unique_room_user (room_id, user_id)
    )
  `);

  // Tạo bảng game_sessions
  await pool.query(`
    CREATE TABLE IF NOT EXISTS game_sessions (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      room_id INT NULL,
      is_solo BOOLEAN DEFAULT FALSE,
      score INT DEFAULT 0,
      total_questions INT NOT NULL,
      correct_answers INT DEFAULT 0,
      started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      finished_at TIMESTAMP NULL,
      timezone VARCHAR(50) DEFAULT 'Asia/Ho_Chi_Minh',
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE SET NULL
    )
  `);

  // Tạo bảng user_answers
  await pool.query(`
    CREATE TABLE IF NOT EXISTS user_answers (
      id INT AUTO_INCREMENT PRIMARY KEY,
      session_id INT NOT NULL,
      question_id INT NOT NULL,
      user_answer TEXT NOT NULL,
      is_correct BOOLEAN DEFAULT FALSE,
      answer_time INT,
      answered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (session_id) REFERENCES game_sessions(id) ON DELETE CASCADE,
      FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE
    )
  `);

  // Tạo bảng login_logs
  await pool.query(`
    CREATE TABLE IF NOT EXISTS login_logs (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NULL,
      username VARCHAR(50) NOT NULL,
      ip_address VARCHAR(45) NOT NULL,
      user_agent TEXT,
      device_type VARCHAR(20),
      browser_name VARCHAR(50),
      browser_version VARCHAR(20),
      os_name VARCHAR(50),
      os_version VARCHAR(20),
      device_model VARCHAR(100),
      country VARCHAR(100),
      city VARCHAR(100),
      timezone VARCHAR(50),
      login_status ENUM('success', 'failed') NOT NULL,
      login_method VARCHAR(20) DEFAULT 'password',
      session_id VARCHAR(255),
      login_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      logout_at TIMESTAMP NULL,
      session_duration INT NULL,
      is_suspicious BOOLEAN DEFAULT FALSE,
      suspicious_reason TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
    )
  `);

  // Tạo bảng ip_geolocation
  await pool.query(`
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
      lookup_count INT DEFAULT 1
    )
  `);

  // Tạo bảng question_reports
  await pool.query(`
    CREATE TABLE IF NOT EXISTS question_reports (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NULL,
      session_id INT NULL,
      room_id INT NULL,
      mode ENUM('solo','room') NOT NULL,
      question_id INT NULL,
      question_text TEXT NOT NULL,
      correct_answer TEXT NOT NULL,
      user_answer TEXT NULL,
      report_text TEXT NOT NULL,
      accepted_answers JSON NULL,
      status ENUM('open','resolved') DEFAULT 'open',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      resolved_at TIMESTAMP NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
      FOREIGN KEY (session_id) REFERENCES game_sessions(id) ON DELETE SET NULL,
      FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE SET NULL,
      FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE SET NULL
    )
  `);

  // Bảng đề xuất đáp án
  await pool.query(`
    CREATE TABLE IF NOT EXISTS answer_suggestions (
      id INT AUTO_INCREMENT PRIMARY KEY,
      report_id INT NOT NULL,
      question_id INT NULL,
      user_id INT NULL,
      suggested_answer TEXT NOT NULL,
      status ENUM('pending','approved','rejected') DEFAULT 'pending',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (report_id) REFERENCES question_reports(id) ON DELETE CASCADE,
      FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE SET NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
    )
  `);

  // Log xử lý đề xuất đáp án
  await pool.query(`
    CREATE TABLE IF NOT EXISTS answer_suggestion_logs (
      id INT AUTO_INCREMENT PRIMARY KEY,
      suggestion_id INT NOT NULL,
      admin_id INT NULL,
      action VARCHAR(20) NOT NULL,
      old_value TEXT NULL,
      new_value TEXT NULL,
      note TEXT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (suggestion_id) REFERENCES answer_suggestions(id) ON DELETE CASCADE,
      FOREIGN KEY (admin_id) REFERENCES users(id) ON DELETE SET NULL
    )
  `);

  console.log('Tạo bảng cơ bản thành công!');
}

// Chạy các migration an toàn cho DB hiện hữu (idempotent)
async function runMigrations() {
  try {
    // Migration cho hệ thống Tăng Tốc
    await ensureColumnExists(
      'questions',
      'question_number',
      "ADD COLUMN question_number INT NULL AFTER id"
    );
    
    await ensureColumnExists(
      'questions',
      'image_url',
      "ADD COLUMN image_url TEXT NULL AFTER answer"
    );
    
    await ensureColumnExists(
      'questions',
      'time_limit',
      "ADD COLUMN time_limit INT NULL AFTER difficulty"
    );

    // Đảm bảo cột accepted_answers tồn tại trong question_reports
    await ensureColumnExists(
      'question_reports',
      'accepted_answers',
      "ADD COLUMN accepted_answers JSON NULL AFTER report_text"
    );

    // Đảm bảo bảng answers tồn tại (trong trường hợp DB cũ)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS answers (
        id INT AUTO_INCREMENT PRIMARY KEY,
        question_id INT NOT NULL,
        answer TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE
      )
    `);

    // Đảm bảo bảng question_reports tồn tại (nếu thiếu)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS question_reports (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NULL,
        session_id INT NULL,
        room_id INT NULL,
        mode ENUM('solo','room') NOT NULL,
        question_id INT NULL,
        question_text TEXT NOT NULL,
        correct_answer TEXT NOT NULL,
        user_answer TEXT NULL,
        report_text TEXT NOT NULL,
        accepted_answers JSON NULL,
        status ENUM('open','resolved') DEFAULT 'open',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        resolved_at TIMESTAMP NULL,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
        FOREIGN KEY (session_id) REFERENCES game_sessions(id) ON DELETE SET NULL,
        FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE SET NULL,
        FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE SET NULL
      )
    `);

    // Đảm bảo các bảng đề xuất tồn tại
    await pool.query(`
      CREATE TABLE IF NOT EXISTS answer_suggestions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        report_id INT NOT NULL,
        question_id INT NULL,
        user_id INT NULL,
        suggested_answer TEXT NOT NULL,
        status ENUM('pending','approved','rejected') DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (report_id) REFERENCES question_reports(id) ON DELETE CASCADE,
        FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE SET NULL,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
      )
    `);

    // Đảm bảo bảng tangtoc_answers tồn tại
    await pool.query(`
      CREATE TABLE IF NOT EXISTS tangtoc_answers (
        id INT AUTO_INCREMENT PRIMARY KEY,
        question_id INT NOT NULL,
        answer TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE
      )
    `);
    // Indexes cho tangtoc_answers
    try {
      await pool.query('CREATE INDEX idx_tangtoc_answers_question_id ON tangtoc_answers(question_id)');
    } catch (e) {}
    try {
      await pool.query('CREATE UNIQUE INDEX ux_tangtoc_answers_qid_answer ON tangtoc_answers(question_id, answer(255))');
    } catch (e) {}

    // Đảm bảo bảng tangtoc_question_reports tồn tại
    await pool.query(`
      CREATE TABLE IF NOT EXISTS tangtoc_question_reports (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NULL,
        session_id INT NULL,
        room_id INT NULL,
        mode ENUM('solo','room') NOT NULL,
        question_id INT NULL,
        question_text TEXT NOT NULL,
        image_url TEXT NULL,
        correct_answer TEXT NOT NULL,
        user_answer TEXT NULL,
        report_text TEXT NOT NULL,
        accepted_answers JSON NULL,
        status ENUM('open','resolved') DEFAULT 'open',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        resolved_at TIMESTAMP NULL,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
        FOREIGN KEY (session_id) REFERENCES game_sessions(id) ON DELETE SET NULL,
        FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE SET NULL,
        FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE SET NULL
      )
    `);

    // Migration an toàn: Đổi tên cột question_image_url thành image_url (cho hệ thống cũ)
    try {
      const [checkColumn] = await pool.query(
        `SELECT COUNT(*) AS cnt FROM information_schema.COLUMNS
         WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'tangtoc_question_reports' AND COLUMN_NAME = 'question_image_url'`,
        [config.db.database]
      );
      if (checkColumn && checkColumn[0] && Number(checkColumn[0].cnt) > 0) {
        console.log('⚙️  Đổi tên cột question_image_url thành image_url trong tangtoc_question_reports...');
        await pool.query('ALTER TABLE tangtoc_question_reports CHANGE COLUMN question_image_url image_url TEXT NULL');
      }
    } catch (e) {
      console.error('Lỗi khi đổi tên cột question_image_url:', e.message);
    }

    // Đảm bảo bảng tangtoc_answer_suggestions tồn tại
    await pool.query(`
      CREATE TABLE IF NOT EXISTS tangtoc_answer_suggestions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        report_id INT NOT NULL,
        question_id INT NULL,
        user_id INT NULL,
        suggested_answer TEXT NOT NULL,
        status ENUM('pending','approved','rejected') DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (report_id) REFERENCES tangtoc_question_reports(id) ON DELETE CASCADE,
        FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE SET NULL,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
      )
    `);

    // Đảm bảo bảng tangtoc_answer_suggestion_logs tồn tại
    await pool.query(`
      CREATE TABLE IF NOT EXISTS tangtoc_answer_suggestion_logs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        suggestion_id INT NOT NULL,
        admin_id INT NULL,
        action VARCHAR(20) NOT NULL,
        old_value TEXT NULL,
        new_value TEXT NULL,
        note TEXT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (suggestion_id) REFERENCES tangtoc_answer_suggestions(id) ON DELETE CASCADE,
        FOREIGN KEY (admin_id) REFERENCES users(id) ON DELETE SET NULL
      )
    `);

    // Đảm bảo bảng tangtoc_question_deletion_logs tồn tại
    await pool.query(`
      CREATE TABLE IF NOT EXISTS tangtoc_question_deletion_logs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        question_id INT NOT NULL,
        question_text TEXT NOT NULL,
        question_answer TEXT NOT NULL,
        question_image_url TEXT NULL,
        question_number INT NULL,
        question_category VARCHAR(50) NULL,
        question_difficulty ENUM('easy', 'medium', 'hard') DEFAULT 'medium',
        question_created_by INT NULL,
        question_created_at TIMESTAMP NULL,
        deleted_by INT NOT NULL,
        deleted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        deletion_reason TEXT NULL,
        report_id INT NULL,
        can_restore BOOLEAN DEFAULT TRUE,
        restored_at TIMESTAMP NULL,
        restored_by INT NULL,
        FOREIGN KEY (deleted_by) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (question_created_by) REFERENCES users(id) ON DELETE SET NULL,
        FOREIGN KEY (report_id) REFERENCES tangtoc_question_reports(id) ON DELETE SET NULL,
        FOREIGN KEY (restored_by) REFERENCES users(id) ON DELETE SET NULL
      )
    `);

    // Đảm bảo bảng deleted_tangtoc_question_answers tồn tại
    await pool.query(`
      CREATE TABLE IF NOT EXISTS deleted_tangtoc_question_answers (
        id INT AUTO_INCREMENT PRIMARY KEY,
        log_id INT NOT NULL,
        answer_text TEXT NOT NULL,
        created_at TIMESTAMP NULL,
        FOREIGN KEY (log_id) REFERENCES tangtoc_question_deletion_logs(id) ON DELETE CASCADE
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS answer_suggestion_logs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        suggestion_id INT NOT NULL,
        admin_id INT NULL,
        action VARCHAR(20) NOT NULL,
        old_value TEXT NULL,
        new_value TEXT NULL,
        note TEXT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (suggestion_id) REFERENCES answer_suggestions(id) ON DELETE CASCADE,
        FOREIGN KEY (admin_id) REFERENCES users(id) ON DELETE SET NULL
      )
    `);

    // Đảm bảo bảng question_deletion_logs tồn tại
    await pool.query(`
      CREATE TABLE IF NOT EXISTS question_deletion_logs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        question_id INT NOT NULL,
        question_text TEXT NOT NULL,
        question_answer TEXT NOT NULL,
        question_category VARCHAR(50) NULL,
        question_difficulty ENUM('easy', 'medium', 'hard') DEFAULT 'medium',
        question_created_by INT NULL,
        question_created_at TIMESTAMP NULL,
        deleted_by INT NOT NULL,
        deleted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        deletion_reason TEXT NULL,
        report_id INT NULL,
        can_restore BOOLEAN DEFAULT TRUE,
        restored_at TIMESTAMP NULL,
        restored_by INT NULL,
        FOREIGN KEY (deleted_by) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (question_created_by) REFERENCES users(id) ON DELETE SET NULL,
        FOREIGN KEY (report_id) REFERENCES question_reports(id) ON DELETE SET NULL,
        FOREIGN KEY (restored_by) REFERENCES users(id) ON DELETE SET NULL
      )
    `);

    // Đảm bảo bảng deleted_question_answers tồn tại
    await pool.query(`
      CREATE TABLE IF NOT EXISTS deleted_question_answers (
        id INT AUTO_INCREMENT PRIMARY KEY,
        log_id INT NOT NULL,
        answer_text TEXT NOT NULL,
        created_at TIMESTAMP NULL,
        FOREIGN KEY (log_id) REFERENCES question_deletion_logs(id) ON DELETE CASCADE
      )
    `);

    // Tạo index cho bảng questions (Tăng Tốc)
    try {
      await pool.query('CREATE INDEX idx_questions_category ON questions(category)');
    } catch (e) {
      // Index đã tồn tại, bỏ qua
    }
    try {
      await pool.query('CREATE INDEX idx_questions_tangtoc ON questions(category, question_number)');
    } catch (e) {
      // Index đã tồn tại, bỏ qua
    }
    try {
      await pool.query('CREATE INDEX idx_questions_difficulty ON questions(difficulty)');
    } catch (e) {
      // Index đã tồn tại, bỏ qua
    }

    // Tạo index cho bảng logs
    try {
      await pool.query('CREATE INDEX idx_question_deletion_logs_deleted_at ON question_deletion_logs(deleted_at)');
    } catch (e) {
      // Index đã tồn tại, bỏ qua
    }
    try {
      await pool.query('CREATE INDEX idx_question_deletion_logs_deleted_by ON question_deletion_logs(deleted_by)');
    } catch (e) {
      // Index đã tồn tại, bỏ qua
    }
    try {
      await pool.query('CREATE INDEX idx_question_deletion_logs_can_restore ON question_deletion_logs(can_restore)');
    } catch (e) {
      // Index đã tồn tại, bỏ qua
    }
    try {
      await pool.query('CREATE INDEX idx_question_deletion_logs_question_id ON question_deletion_logs(question_id)');
    } catch (e) {
      // Index đã tồn tại, bỏ qua
    }

    // Tạo index cho bảng tangtoc_question_reports
    try {
      await pool.query('CREATE INDEX idx_tangtoc_question_reports_status ON tangtoc_question_reports(status)');
    } catch (e) {}
    try {
      await pool.query('CREATE INDEX idx_tangtoc_question_reports_created_at ON tangtoc_question_reports(created_at)');
    } catch (e) {}
    try {
      await pool.query('CREATE INDEX idx_tangtoc_question_reports_user_id ON tangtoc_question_reports(user_id)');
    } catch (e) {}
    try {
      await pool.query('CREATE INDEX idx_tangtoc_question_reports_question_id ON tangtoc_question_reports(question_id)');
    } catch (e) {}

    // Tạo index cho bảng tangtoc_question_deletion_logs
    try {
      await pool.query('CREATE INDEX idx_tangtoc_question_deletion_logs_deleted_at ON tangtoc_question_deletion_logs(deleted_at)');
    } catch (e) {}
    try {
      await pool.query('CREATE INDEX idx_tangtoc_question_deletion_logs_deleted_by ON tangtoc_question_deletion_logs(deleted_by)');
    } catch (e) {}
    try {
      await pool.query('CREATE INDEX idx_tangtoc_question_deletion_logs_can_restore ON tangtoc_question_deletion_logs(can_restore)');
    } catch (e) {}
    try {
      await pool.query('CREATE INDEX idx_tangtoc_question_deletion_logs_question_id ON tangtoc_question_deletion_logs(question_id)');
    } catch (e) {}

    // ===== MIGRATION CHO HỆ THỐNG DATA NODES =====
    console.log('⚙️  Đang chạy migration cho hệ thống Data Nodes...');

    // Bảng data_nodes
    await pool.query(`
      CREATE TABLE IF NOT EXISTS data_nodes (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL COMMENT 'Tên server phụ',
        host VARCHAR(255) NOT NULL COMMENT 'IP hoặc domain của server phụ',
        port INT NOT NULL COMMENT 'Port để kết nối',
        status ENUM('online', 'offline', 'error') DEFAULT 'offline' COMMENT 'Trạng thái kết nối',
        storage_used BIGINT DEFAULT 0 COMMENT 'Dung lượng đã sử dụng (bytes)',
        storage_total BIGINT DEFAULT 0 COMMENT 'Tổng dung lượng (bytes)',
        last_ping DATETIME NULL COMMENT 'Lần ping cuối cùng',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY unique_port (port),
        INDEX idx_status (status)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Quản lý các server phụ (data nodes)'
    `);

    // Bảng matches
    await pool.query(`
      CREATE TABLE IF NOT EXISTS matches (
        id INT AUTO_INCREMENT PRIMARY KEY,
        code VARCHAR(20) NOT NULL COMMENT 'Mã trận đấu (unique)',
        name VARCHAR(255) NOT NULL COMMENT 'Tên trận đấu',
        host_user_id INT NOT NULL COMMENT 'ID người tạo trận đấu',
        max_players INT DEFAULT 4 COMMENT 'Số người chơi tối đa',
        status ENUM('draft', 'ready', 'playing', 'finished') DEFAULT 'draft' COMMENT 'Trạng thái trận đấu',
        data_node_id INT NULL COMMENT 'ID của data node lưu trữ dữ liệu',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        started_at DATETIME NULL COMMENT 'Thời gian bắt đầu',
        finished_at DATETIME NULL COMMENT 'Thời gian kết thúc',
        UNIQUE KEY unique_code (code),
        FOREIGN KEY (host_user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (data_node_id) REFERENCES data_nodes(id) ON DELETE SET NULL,
        INDEX idx_status (status),
        INDEX idx_host (host_user_id),
        INDEX idx_created (created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Quản lý các trận đấu'
    `);

    // Bảng match_questions
    await pool.query(`
      CREATE TABLE IF NOT EXISTS match_questions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        match_id INT NOT NULL COMMENT 'ID trận đấu',
        section ENUM('khoi_dong_rieng', 'khoi_dong_chung', 'vcnv', 'tang_toc', 've_dich') NOT NULL COMMENT 'Phần thi',
        question_order INT NOT NULL COMMENT 'Thứ tự câu hỏi trong phần thi',
        player_index INT NULL COMMENT 'Index người chơi (cho khởi động riêng và về đích)',
        question_type ENUM('text', 'image', 'video') NOT NULL DEFAULT 'text' COMMENT 'Loại câu hỏi',
        question_text TEXT NULL COMMENT 'Nội dung câu hỏi (text)',
        media_url TEXT NULL COMMENT 'URL media (image/video) từ data node',
        media_type VARCHAR(50) NULL COMMENT 'Loại media (image/jpeg, video/mp4, etc)',
        answer_text TEXT NULL COMMENT 'Đáp án đúng',
        answer_options JSON NULL COMMENT 'Các lựa chọn (nếu có)',
        points INT DEFAULT 10 COMMENT 'Điểm số',
        time_limit INT NULL COMMENT 'Thời gian giới hạn (giây)',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (match_id) REFERENCES matches(id) ON DELETE CASCADE,
        INDEX idx_match_section (match_id, section),
        INDEX idx_order (match_id, section, question_order)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Câu hỏi theo từng phần thi'
    `);

    // Bảng match_participants (người tham gia trận đấu)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS match_participants (
        id INT AUTO_INCREMENT PRIMARY KEY,
        match_id INT NOT NULL COMMENT 'ID trận đấu',
        user_id INT NOT NULL COMMENT 'ID người chơi',
        player_index INT NOT NULL COMMENT 'Vị trí người chơi (0-3)',
        is_host BOOLEAN DEFAULT FALSE COMMENT 'Có phải host không',
        status ENUM('waiting', 'ready', 'playing', 'finished') DEFAULT 'waiting' COMMENT 'Trạng thái',
        joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (match_id) REFERENCES matches(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE KEY unique_match_user (match_id, user_id),
        UNIQUE KEY unique_match_index (match_id, player_index),
        INDEX idx_match (match_id),
        INDEX idx_user (user_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Người chơi tham gia trận đấu'
    `);

    // Bảng match_players (thông tin người chơi trong game)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS match_players (
        id INT AUTO_INCREMENT PRIMARY KEY,
        match_id INT NOT NULL COMMENT 'ID trận đấu',
        user_id INT NULL COMMENT 'ID người chơi (NULL nếu chưa join)',
        player_index INT NOT NULL COMMENT 'Vị trí người chơi (0-3)',
        player_name VARCHAR(255) NULL COMMENT 'Tên người chơi',
        score INT DEFAULT 0 COMMENT 'Điểm số',
        joined_at DATETIME NULL COMMENT 'Thời gian tham gia',
        FOREIGN KEY (match_id) REFERENCES matches(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
        UNIQUE KEY unique_match_player (match_id, player_index),
        INDEX idx_match (match_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Người chơi trong trận đấu'
    `);

    // Bảng match_answers
    await pool.query(`
      CREATE TABLE IF NOT EXISTS match_answers (
        id INT AUTO_INCREMENT PRIMARY KEY,
        match_id INT NOT NULL COMMENT 'ID trận đấu',
        question_id INT NOT NULL COMMENT 'ID câu hỏi',
        player_id INT NOT NULL COMMENT 'ID người chơi',
        answer TEXT NULL COMMENT 'Câu trả lời',
        is_correct BOOLEAN DEFAULT FALSE COMMENT 'Đúng/Sai',
        points_earned INT DEFAULT 0 COMMENT 'Điểm nhận được',
        answer_time FLOAT NULL COMMENT 'Thời gian trả lời (giây)',
        answered_at DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT 'Thời gian trả lời',
        FOREIGN KEY (match_id) REFERENCES matches(id) ON DELETE CASCADE,
        FOREIGN KEY (question_id) REFERENCES match_questions(id) ON DELETE CASCADE,
        FOREIGN KEY (player_id) REFERENCES match_players(id) ON DELETE CASCADE,
        INDEX idx_match_player (match_id, player_id),
        INDEX idx_question (question_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Câu trả lời của người chơi'
    `);

    // Bảng match_results
    await pool.query(`
      CREATE TABLE IF NOT EXISTS match_results (
        id INT AUTO_INCREMENT PRIMARY KEY,
        match_id INT NOT NULL COMMENT 'ID trận đấu',
        player_id INT NOT NULL COMMENT 'ID người chơi',
        final_score INT DEFAULT 0 COMMENT 'Điểm cuối cùng',
        rank INT NULL COMMENT 'Xếp hạng',
        total_correct INT DEFAULT 0 COMMENT 'Tổng số câu đúng',
        total_questions INT DEFAULT 0 COMMENT 'Tổng số câu hỏi',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (match_id) REFERENCES matches(id) ON DELETE CASCADE,
        FOREIGN KEY (player_id) REFERENCES match_players(id) ON DELETE CASCADE,
        UNIQUE KEY unique_match_player_result (match_id, player_id),
        INDEX idx_match (match_id),
        INDEX idx_rank (match_id, rank)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Kết quả trận đấu'
    `);

    // Bảng match_events
    await pool.query(`
      CREATE TABLE IF NOT EXISTS match_events (
        id INT AUTO_INCREMENT PRIMARY KEY,
        match_id INT NOT NULL COMMENT 'ID trận đấu',
        event_type ENUM('start', 'pause', 'resume', 'finish', 'player_join', 'player_leave', 'question_start', 'question_end', 'section_change') NOT NULL COMMENT 'Loại sự kiện',
        event_data JSON NULL COMMENT 'Dữ liệu sự kiện',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (match_id) REFERENCES matches(id) ON DELETE CASCADE,
        INDEX idx_match_type (match_id, event_type),
        INDEX idx_created (created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Lịch sử sự kiện trận đấu'
    `);

    // Bảng match_upload_logs (log upload files)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS match_upload_logs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        match_id INT NOT NULL COMMENT 'ID trận đấu',
        data_node_id INT NOT NULL COMMENT 'ID data node',
        file_name VARCHAR(255) NOT NULL COMMENT 'Tên file',
        file_type VARCHAR(50) NOT NULL COMMENT 'Loại file',
        file_size BIGINT NOT NULL COMMENT 'Kích thước file (bytes)',
        storage_path VARCHAR(500) NOT NULL COMMENT 'Đường dẫn lưu trữ',
        stream_url VARCHAR(500) NOT NULL COMMENT 'URL stream',
        upload_status ENUM('uploading', 'success', 'failed') DEFAULT 'uploading',
        error_message TEXT NULL COMMENT 'Thông báo lỗi nếu có',
        uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (match_id) REFERENCES matches(id) ON DELETE CASCADE,
        FOREIGN KEY (data_node_id) REFERENCES data_nodes(id) ON DELETE CASCADE,
        INDEX idx_match (match_id),
        INDEX idx_node (data_node_id),
        INDEX idx_status (upload_status)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Log upload files lên data nodes'
    `);

    console.log('✅ Tất cả migrations đã hoàn tất!');
  } catch (err) {
    console.error('Lỗi khi chạy migrations:', err);
  }
}

// Helper: thêm cột nếu chưa tồn tại
async function ensureColumnExists(tableName, columnName, alterClause) {
  const [rows] = await pool.query(
    `SELECT COUNT(*) AS cnt FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
    [config.db.database, tableName, columnName]
  );
  const exists = rows && rows[0] && Number(rows[0].cnt) > 0;
  if (!exists) {
    console.log(`⚙️  Thêm cột ${columnName} vào bảng ${tableName}...`);
    await pool.query(`ALTER TABLE ${tableName} ${alterClause}`);
  }
}

export { pool, testConnection, initDatabase };
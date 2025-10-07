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
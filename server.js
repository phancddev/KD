import express from 'express';
import session from 'express-session';
import cookieParser from 'cookie-parser';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { createServer } from 'http';
import config from './config.js';
import { testConnection, initDatabase, pool } from './db/index.js';
import { createUser, findUserByUsername, authenticateUser, isUserAdmin } from './db/users.js';
import { initSocketIO, getIO, addOnlineUser, removeOnlineUser, updateUserActivity } from './socket/index.js';
import { initTangTocSocket, getTangTocParticipants } from './socket/kdtangtoc.js';
import { collectDeviceInfo, generateDeviceFingerprint, detectSuspiciousActivity, getIpInfo } from './utils/user-agent-parser.js';
import { saveLoginLog, updateLogoutLog, saveIpGeolocation } from './db/login-logs.js';
import adminRoutes from './routes/admin.js';
console.log('🚀 Imported adminRoutes successfully');

import adminApiRoutes from './routes/admin-api.js';
console.log('🚀 Imported adminApiRoutes successfully');

import tangtocAdminApiRoutes from './routes/tangtoc-admin-api.js';
console.log('🚀 Imported tangtocAdminApiRoutes successfully');


import tangTocRoutes from './views/tangTocKD/server-routes.js';
console.log('🚀 Imported tangTocRoutes successfully');
import { getRandomTangTocQuestions } from './views/tangTocKD/questions-parser.js';
import { getUserGameHistoryByMonth, getPlayerRankingByMonth, getUserGameStats, getGameSessionDetails, createGameSession, finishGameSession } from './db/game-sessions.js';
import { getRandomQuestions } from './db/questions.js';
import { createQuestionReport, addAnswerSuggestion } from './db/reports.js';

console.log('🚀 Tất cả imports hoàn tất');

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = config.server.port;

// Public: TangToc questions (no session required) - register VERY early
app.get('/api/tangtoc/questions', async (req, res) => {
  try {
    console.log('🔍 [PUBLIC-API-EARLY] /api/tangtoc/questions called');
    const questions = await getRandomTangTocQuestions();
    console.log('✅ [PUBLIC-API-EARLY] fetched tangtoc questions count =', Array.isArray(questions) ? questions.length : 'N/A');
    res.setHeader('Access-Control-Allow-Origin', '*');
    return res.json(questions);
  } catch (error) {
    console.error('❌ Lỗi khi lấy câu hỏi Tăng Tốc (public early):', error);
    console.error('   code:', error?.code, 'errno:', error?.errno, 'sqlState:', error?.sqlState, 'sqlMessage:', error?.sqlMessage);
    console.error('   sql:', error?.sql);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Fully public endpoint (non-admin, no session) outside of /api to avoid interference
app.get('/public/tangtoc/questions', async (req, res) => {
  try {
    console.log('🔍 [PUBLIC] /public/tangtoc/questions called');
    const questions = await getRandomTangTocQuestions();
    console.log('✅ [PUBLIC] fetched tangtoc questions count =', Array.isArray(questions) ? questions.length : 'N/A');
    res.setHeader('Access-Control-Allow-Origin', '*');
    return res.json(questions);
  } catch (error) {
    console.error('❌ Lỗi khi lấy câu hỏi Tăng Tốc (public /public):', error);
    console.error('   code:', error?.code, 'errno:', error?.errno, 'sqlState:', error?.sqlState, 'sqlMessage:', error?.sqlMessage);
    console.error('   sql:', error?.sql);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Test route for debugging
app.get('/api/tangtoc-test', (req, res) => {
  console.log('🔍 TangToc test route called!');
  res.json({ message: 'TangToc Reports API is working!' });
});

app.get('/test-simple', (req, res) => {
  console.log('🔍 Simple test route called!');
  res.json({ message: 'Simple test works!' });
});

// Middleware
app.use(cookieParser());
// CORS headers for all routes (allow external images and API consumption)
app.use((req, res, next) => {
  if (req.url.includes('tangtoc-report-question')) {
    console.log('🔍 TangToc report request detected:', req.method, req.url);
  }
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }
  next();
});
// Tin cậy proxy để req.ip đọc từ X-Forwarded-For khi đứng sau Nginx/Proxy
app.set('trust proxy', true);

// Middleware để xác định IP address của client (chuẩn hóa IPv6-mapped IPv4)
app.use((req, res, next) => {
  function normalizeIp(ip) {
    if (!ip) return '127.0.0.1';
    if (Array.isArray(ip)) ip = ip[0];
    if (typeof ip === 'string') {
      // Lấy IP đầu tiên nếu có danh sách qua proxy
      ip = ip.split(',')[0].trim();
      if (ip.startsWith('::ffff:')) ip = ip.substring(7);
      if (ip === '::1') ip = '127.0.0.1';
    }
    return ip;
  }

  const forwarded = req.headers['x-forwarded-for'];
  const sourceIp = forwarded || req.ip || req.connection?.remoteAddress;
  req.clientIP = normalizeIp(sourceIp);
  next();
});

// Parse JSON và form data (nhưng không xử lý multipart/form-data)
// Tăng giới hạn body size để hỗ trợ bulk operations lớn
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ limit: '100mb', extended: true }));

// Debug middleware để xem request sau khi đã parse body
app.use((req, res, next) => {
  console.log('🔍 Request method:', req.method);
  console.log('🔍 Request URL:', req.url);
  console.log('🔍 Request headers:', req.headers);
  console.log('🔍 Request body type:', typeof req.body);
  console.log('🔍 Request body:', req.body);
  next();
});

app.use(express.static(join(__dirname, 'public')));
// Serve Tang Tốc client assets
app.use('/tangTocKD', express.static(join(__dirname, 'views', 'tangTocKD')));
app.use(session({
  secret: config.session.secret,
  resave: false,
  saveUninitialized: false, // Chỉ tạo session khi cần
  cookie: { 
    secure: false, // Set to true if using HTTPS
    httpOnly: true, // Prevent XSS attacks
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    sameSite: 'lax' // CSRF protection
  },
  name: 'nqd_session' // Custom session name
}));

// Khởi tạo database khi khởi động server
async function initApp() {
  try {
    const connected = await testConnection();
    if (connected) {
      await initDatabase();
      console.log('Khởi tạo ứng dụng thành công!');
    } else {
      console.error('Không thể kết nối đến database. Vui lòng kiểm tra cấu hình.');
    }
  } catch (error) {
    console.error('Lỗi khởi tạo ứng dụng:', error);
  }
}

// API Routes
app.get('/api/features/registration-status', (req, res) => {
  res.json({
    enabled: config.features.enableRegistration,
    message: config.features.enableRegistration 
      ? 'Chức năng đăng ký đang hoạt động' 
      : 'Chức năng đăng ký đã bị tắt'
  });
});

// Public API: lấy câu hỏi ngẫu nhiên cho người chơi (không giới hạn admin)
app.get('/api/questions/random', async (req, res) => {
  try {
    const count = parseInt(req.query.count) || 12;
    const category = req.query.category || 'khoidong';
    let questions = await getRandomQuestions(count, category);
    // Fallback nếu không có câu hỏi cho category được yêu cầu
    if (!Array.isArray(questions) || questions.length === 0) {
      // Thử với 'general' (nếu DB cũ còn dùng)
      try {
        const general = await getRandomQuestions(count, 'general');
        if (Array.isArray(general) && general.length > 0) {
          return res.json(general);
        }
      } catch {}
      // Thử không filter category
      try {
        const any = await getRandomQuestions(count, null);
        if (Array.isArray(any) && any.length > 0) {
          return res.json(any);
        }
      } catch {}
    }
    res.json(questions);
  } catch (error) {
    console.error('Lỗi khi lấy câu hỏi ngẫu nhiên (public):', error);
    res.status(500).json({ success: false, error: 'Không thể lấy câu hỏi ngẫu nhiên' });
  }
});

// Public API: Tăng Tốc - lấy câu hỏi (ưu tiên định nghĩa sớm để tránh bị router /api khác chặn)
app.get('/api/tangtoc/questions', async (req, res) => {
  try {
    console.log('🔍 [PUBLIC-API] /api/tangtoc/questions called');
    const questions = await getRandomTangTocQuestions();
    console.log('✅ [PUBLIC-API] fetched tangtoc questions count =', Array.isArray(questions) ? questions.length : 'N/A');
    return res.json(questions);
  } catch (error) {
    console.error('❌ Lỗi khi lấy câu hỏi Tăng Tốc (public):', error);
    console.error('   code:', error?.code, 'errno:', error?.errno, 'sqlState:', error?.sqlState, 'sqlMessage:', error?.sqlMessage);
    console.error('   sql:', error?.sql);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Public non-/api path as fallback to avoid any /api middlewares interfering
app.get('/tangtoc/questions', async (req, res) => {
  try {
    console.log('🔍 [PUBLIC-NOAPI] /tangtoc/questions called');
    const questions = await getRandomTangTocQuestions();
    console.log('✅ [PUBLIC-NOAPI] fetched tangtoc questions count =', Array.isArray(questions) ? questions.length : 'N/A');
    return res.json(questions);
  } catch (error) {
    console.error('❌ Lỗi khi lấy câu hỏi Tăng Tốc (public non-api):', error);
    console.error('   code:', error?.code, 'errno:', error?.errno, 'sqlState:', error?.sqlState, 'sqlMessage:', error?.sqlMessage);
    console.error('   sql:', error?.sql);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Routes
app.get('/', (req, res) => {
  if (req.session.user) {
    res.sendFile(join(__dirname, 'views', 'home.html'));
  } else {
    res.sendFile(join(__dirname, 'index.html'));
  }
});

app.get('/login', (req, res) => {
  if (req.session.user) {
    return res.redirect('/');
  }
  
  res.sendFile(join(__dirname, 'views', 'login.html'));
});

app.post('/login', async (req, res) => {
  const { username, password } = req.body;
  
  try {
    if (!username || !password) {
      return res.redirect('/login?error=1');
    }
    
    const user = await authenticateUser(username, password, req.clientIP);
    
    if (user) {
      // Thu thập thông tin thiết bị chi tiết
      const deviceInfo = collectDeviceInfo(req);
      const deviceFingerprint = generateDeviceFingerprint(deviceInfo);
      
      // Lấy thông tin IP geolocation
      let ipInfo = null;
      console.log('🔍 Login - req.clientIP:', req.clientIP);
      console.log('🔍 Login - req.connection.remoteAddress:', req.connection?.remoteAddress);
      console.log('🔍 Login - req.headers.x-forwarded-for:', req.headers['x-forwarded-for']);
      
      try {
        if (req.clientIP && req.clientIP !== '::1' && req.clientIP !== '127.0.0.1') {
          console.log('🔍 Login - Gọi getIpInfo với IP:', req.clientIP);
          ipInfo = await getIpInfo(req.clientIP);
          console.log('🔍 Login - IP info:', ipInfo);
          await saveIpGeolocation(ipInfo);
        } else {
          console.log('🔍 Login - Bỏ qua IP geolocation vì IP không hợp lệ:', req.clientIP);
        }
      } catch (geoError) {
        console.error('Lỗi khi lấy thông tin IP:', geoError);
      }
      
      // Kiểm tra hoạt động đáng ngờ
      const suspicious = detectSuspiciousActivity(deviceInfo, []);
      
      // Lưu login log chi tiết
      const logId = await saveLoginLog({
        userId: user.id,
        username: user.username,
        ipAddress: req.clientIP,
        userAgent: deviceInfo.userAgent,
        deviceType: deviceInfo.device.type,
        browserName: deviceInfo.browser.name,
        browserVersion: deviceInfo.browser.version,
        osName: deviceInfo.os.name,
        osVersion: deviceInfo.os.version,
        deviceModel: deviceInfo.device.model,
        country: ipInfo?.country || 'Unknown',
        city: ipInfo?.city || 'Unknown',
        timezone: ipInfo?.timezone || 'Unknown',
        loginStatus: 'success',
        loginMethod: 'password',
        sessionId: req.sessionID,
        isSuspicious: suspicious.isSuspicious,
        suspiciousReason: suspicious.reasons.join(', ') || null
      });
      
      // Lưu log ID vào session để cập nhật khi logout
      req.session.loginLogId = logId;
      
      req.session.user = {
        id: user.id,
        username: user.username,
        email: user.email,
        fullName: user.full_name,
        loginTime: new Date()
      };
      
      console.log('🔍 Login thành công - Session user:', req.session.user);
      console.log('🔍 Login thành công - User ID type:', typeof req.session.user.id);
      console.log('🔍 Login thành công - User ID value:', req.session.user.id);
      
      // Thêm người dùng vào danh sách online
      addOnlineUser(user.id, user.username, req.clientIP);
      
      return res.redirect('/');
    } else {
      // Log đăng nhập thất bại
      const deviceInfo = collectDeviceInfo(req);
      const suspicious = detectSuspiciousActivity(deviceInfo, []);
      
      await saveLoginLog({
        userId: null,
        username: username,
        ipAddress: req.clientIP,
        userAgent: deviceInfo.userAgent,
        deviceType: deviceInfo.device.type,
        browserName: deviceInfo.browser.name,
        browserVersion: deviceInfo.browser.version,
        osName: deviceInfo.os.name,
        osVersion: deviceInfo.os.version,
        deviceModel: deviceInfo.device.model,
        country: 'Unknown',
        city: 'Unknown',
        timezone: 'Unknown',
        loginStatus: 'failed',
        loginMethod: 'password',
        sessionId: null,
        isSuspicious: suspicious.isSuspicious,
        suspiciousReason: suspicious.reasons.join(', ') || null
      });
      
      return res.redirect('/login?error=2');
    }
  } catch (error) {
    console.error('Lỗi đăng nhập:', error);
    return res.redirect('/login?error=3');
  }
});

// API: người dùng gửi báo lỗi câu hỏi/đáp án
app.post('/api/report-question', async (req, res) => {
  console.log('🔍 Old report-question route called:', req.url);
  if (!req.session.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  try {
    const { mode, questionId, questionText, correctAnswer, userAnswer, reportText, sessionId, roomId, suggestions } = req.body || {};
    if (!['solo', 'room'].includes(mode)) {
      return res.status(400).json({ error: 'Thiếu hoặc sai mode' });
    }
    if (!questionText || !correctAnswer) {
      return res.status(400).json({ error: 'Thiếu dữ liệu bắt buộc' });
    }
    const suggestionList = Array.isArray(suggestions)
      ? suggestions.map(s => (typeof s === 'string' ? s : (s && s.value ? s.value : ''))).map(v => (v || '').toString().trim()).filter(Boolean)
      : [];
    const reportTextToSave = (reportText && reportText.toString().trim())
      ? reportText.toString().trim()
      : (suggestionList.length > 0 ? `Đề xuất đáp án: ${suggestionList.join(' | ')}` : '');
    if (!reportTextToSave) {
      return res.status(400).json({ error: 'Cần nhập mô tả hoặc ít nhất 1 đáp án đề xuất' });
    }
    const { id } = await createQuestionReport({
      userId: req.session.user.id,
      sessionId: sessionId || null,
      roomId: roomId || null,
      mode,
      questionId: questionId || null,
      questionText,
      correctAnswer,
      userAnswer: userAnswer || null,
      reportText: reportTextToSave,
      acceptedAnswers: req.body.acceptedAnswers || null
    });
    // Lưu các đề xuất đáp án nếu có
    for (const trimmed of suggestionList) {
      await addAnswerSuggestion({ reportId: id, questionId: questionId || null, userId: req.session.user.id, suggestedAnswer: trimmed });
    }
    return res.json({ success: true, id });
  } catch (error) {
    console.error('Lỗi khi tạo report:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.get('/register', (req, res) => {
  // Kiểm tra xem chức năng register có được bật không
  if (!config.features.enableRegistration) {
    return res.status(403).send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Chức năng đăng ký đã bị tắt</title>
        <style>
          body { 
            font-family: 'Poppins', Arial, sans-serif; 
            text-align: center; 
            padding: 50px; 
            background: linear-gradient(135deg, #f3f4f6, #e5e7eb);
            min-height: 100vh;
            margin: 0;
          }
          .container {
            max-width: 600px;
            margin: 0 auto;
            background: white;
            padding: 40px;
            border-radius: 16px;
            box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
          }
          .error { 
            color: #dc2626; 
            font-size: 28px; 
            margin-bottom: 20px; 
            font-weight: 600;
          }
          .message { 
            color: #6b7280; 
            font-size: 16px; 
            margin-bottom: 30px; 
            line-height: 1.6;
          }
          .contact-info {
            background: #f9fafb;
            border: 1px solid #e5e7eb;
            border-radius: 12px;
            padding: 24px;
            margin: 30px 0;
            text-align: left;
          }
          .contact-title {
            color: #374151;
            font-size: 18px;
            font-weight: 600;
            margin-bottom: 16px;
            text-align: center;
          }
          .contact-item {
            display: flex;
            align-items: center;
            margin-bottom: 16px;
            padding: 12px;
            background: white;
            border-radius: 8px;
            border: 1px solid #e5e7eb;
          }
          .contact-icon {
            width: 40px;
            height: 40px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            margin-right: 16px;
            font-size: 18px;
          }
          .facebook-icon {
            background: #1877f2;
            color: white;
          }
          .email-icon {
            background: #ea4335;
            color: white;
          }
          .contact-details h4 {
            margin: 0 0 4px 0;
            color: #374151;
            font-size: 16px;
            font-weight: 600;
          }
          .contact-details p {
            margin: 0;
            color: #6b7280;
            font-size: 14px;
          }
          .contact-link {
            color: #1877f2;
            text-decoration: none;
            font-weight: 500;
          }
          .contact-link:hover {
            text-decoration: underline;
          }
          .back-link { 
            color: #dc2626; 
            text-decoration: none; 
            font-weight: 600;
            background: #fef2f2;
            padding: 12px 24px;
            border-radius: 8px;
            border: 1px solid #fecaca;
            transition: all 0.3s ease;
            display: inline-block;
          }
          .back-link:hover {
            background: #fee2e2;
            border-color: #fca5a5;
          }
        </style>
        <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600&display=swap" rel="stylesheet">
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
      </head>
      <body>
        <div class="container">
          <div class="error">⚠️ Chức năng đăng ký đã bị tắt</div>
          <div class="message">
            Hiện tại không thể tạo tài khoản mới. Vui lòng liên hệ quản trị viên để được hỗ trợ.
          </div>
          
          <div class="contact-info">
            <div class="contact-title">📞 Thông tin liên hệ</div>
            
            <div class="contact-item">
              <div class="contact-icon facebook-icon">
                <i class="fab fa-facebook-f"></i>
              </div>
              <div class="contact-details">
                <h4>Facebook</h4>
                <p>
                  <a href="https://www.facebook.com/phan.cong.dung.239055" target="_blank" class="contact-link">
                    Phan Công Dũng
                  </a>
                </p>
              </div>
            </div>
            
            <div class="contact-item">
              <div class="contact-icon email-icon">
                <i class="fas fa-envelope"></i>
              </div>
              <div class="contact-details">
                <h4>Email</h4>
                <p>
                  <a href="mailto:phancddev@gmail.com" class="contact-link">
                    phancddev@gmail.com
                  </a>
                </p>
              </div>
            </div>
          </div>
          
          <a href="/login" class="back-link">← Quay lại trang đăng nhập</a>
        </div>
      </body>
      </html>
    `);
  }
  
  if (req.session.user) {
    return res.redirect('/');
  }
  
  res.sendFile(join(__dirname, 'views', 'register.html'));
});

app.post('/register', async (req, res) => {
  // Kiểm tra xem chức năng register có được bật không
  if (!config.features.enableRegistration) {
    return res.status(403).json({
      error: 'Chức năng đăng ký đã bị tắt',
      message: 'Hiện tại không thể tạo tài khoản mới'
    });
  }
  
  const { username, password, confirmPassword, email, fullName } = req.body;
  
  try {
    // Kiểm tra dữ liệu đầu vào
    if (!username || !password || !confirmPassword) {
      return res.redirect('/register?error=4');
    }
    
    if (password !== confirmPassword) {
      return res.redirect('/register?error=2');
    }
    
    // Kiểm tra username đã tồn tại chưa
    const existingUser = await findUserByUsername(username);
    if (existingUser) {
      return res.redirect('/register?error=1');
    }
    
    // Tạo người dùng mới
    const newUser = await createUser(username, password, email, fullName);
    
    // Đăng nhập tự động sau khi đăng ký
    req.session.user = {
      id: newUser.id,
      username: newUser.username,
      email: newUser.email,
      fullName: newUser.fullName
    };
    
    return res.redirect('/');
  } catch (error) {
    console.error('Lỗi đăng ký:', error);
    return res.redirect('/register?error=5');
  }
});

app.get('/logout', async (req, res) => {
  // Lấy thông tin người dùng trước khi xóa session
  const userId = req.session.user?.id;
  const loginLogId = req.session.loginLogId;
  
  // Cập nhật login log nếu có
  if (loginLogId) {
    try {
      const logoutTime = new Date();
      const loginTime = req.session.user?.loginTime || new Date();
      const sessionDuration = Math.floor((logoutTime - loginTime) / 1000); // Tính bằng giây
      
      await updateLogoutLog(loginLogId, logoutTime, sessionDuration);
    } catch (error) {
      console.error('Lỗi khi cập nhật logout log:', error);
    }
  }
  
  // Xóa session
  req.session.destroy();
  
  // Xóa người dùng khỏi danh sách online
  if (userId) {
    removeOnlineUser(userId);
  }
  
  res.redirect('/login');
});

app.get('/room-battle', (req, res) => {
  if (!req.session.user) {
    return res.redirect('/login');
  }
  
  res.sendFile(join(__dirname, 'views', 'room-battle.html'));
});

app.get('/solo-battle', (req, res) => {
  if (!req.session.user) {
    return res.redirect('/login');
  }
  
  res.sendFile(join(__dirname, 'views', 'solo-battle.html'));
});

app.get('/tangtoc-solo', (req, res) => {
  if (!req.session.user) {
    return res.redirect('/login');
  }
  
  res.sendFile(join(__dirname, 'views', 'tangTocKD', 'solo-battle-tangtoc.html'));
});

app.get('/tangtoc-room', (req, res) => {
  if (!req.session.user) {
    return res.redirect('/login');
  }
  
  res.sendFile(join(__dirname, 'views', 'tangTocKD', 'room-battle-tangtoc.html'));
});

// Participants API cho Tang Tốc room (phục vụ UI tangtoc-room)
app.get('/api/room/:roomId/participants', (req, res) => {
  try {
    const list = getTangTocParticipants(req.params.roomId);
    res.json(list);
  } catch (e) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.get('/history', (req, res) => {
  if (!req.session.user) {
    return res.redirect('/login');
  }
  
  res.sendFile(join(__dirname, 'views', 'history.html'));
});

app.get('/ranking', (req, res) => {
  if (!req.session.user) {
    return res.redirect('/login');
  }
  
  res.sendFile(join(__dirname, 'views', 'ranking.html'));
});

// Test socket route
app.get('/test-socket', (req, res) => {
  res.sendFile(join(__dirname, 'test_socket.html'));
});

// API lấy thông tin người dùng hiện tại
app.get('/api/user', async (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  try {
    const isAdmin = await isUserAdmin(req.session.user.id);
    
    res.json({
      ...req.session.user,
      isAdmin
    });
  } catch (error) {
    console.error('Lỗi khi lấy thông tin người dùng:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// API lịch sử trận đấu của người dùng
app.get('/api/user/history', async (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  try {
    const { month, year } = req.query;
    
    let history;
    if (month && year) {
      history = await getUserGameHistoryByMonth(req.session.user.id, parseInt(month), parseInt(year));
    } else {
      history = await getUserGameHistory(req.session.user.id);
    }
    
    res.json(history);
  } catch (error) {
    console.error('Lỗi khi lấy lịch sử trận đấu:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// API lấy chi tiết trận đấu
app.get('/api/game/:gameId', async (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  try {
    const gameId = parseInt(req.params.gameId);
    const gameDetails = await getGameSessionDetails(gameId);
    
    if (!gameDetails) {
      return res.status(404).json({ error: 'Game not found' });
    }
    
    // Kiểm tra xem người dùng có quyền xem trận đấu này không
    if (gameDetails.userId !== req.session.user.id) {
      const isAdmin = await isUserAdmin(req.session.user.id);
      if (!isAdmin) {
        return res.status(403).json({ error: 'Forbidden' });
      }
    }
    
    res.json(gameDetails);
  } catch (error) {
    console.error('Lỗi khi lấy chi tiết trận đấu:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// API lấy bảng xếp hạng
app.get('/api/ranking', async (req, res) => {
  try {
    const { month, year } = req.query;
    
    console.log(`Ranking API called with month: ${month}, year: ${year}`);
    
    if (!month || !year) {
      return res.status(400).json({ error: 'Month and year are required' });
    }
    
    const ranking = await getPlayerRankingByMonth(parseInt(year), parseInt(month));
    
    // Lấy ID của người dùng hiện tại nếu đã đăng nhập
    const currentUserId = req.session.user ? req.session.user.id : null;
    
    console.log(`Ranking data: ${ranking.length} players, current user: ${currentUserId}`);
    
    res.json({
      ranking: ranking,
      currentUserId: currentUserId
    });
  } catch (error) {
    console.error('Lỗi khi lấy bảng xếp hạng:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// API lấy thống kê người dùng
app.get('/api/user/stats', async (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  try {
    const stats = await getUserGameStats(req.session.user.id);
    
    res.json(stats);
  } catch (error) {
    console.error('Lỗi khi lấy thống kê người dùng:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// API lưu kết quả trận đấu solo
app.post('/api/solo-game/finish', async (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  try {
    const { score, correctAnswers, totalQuestions } = req.body;
    
    if (score === undefined || correctAnswers === undefined || totalQuestions === undefined) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    // Tạo phiên chơi solo và lưu kết quả
    const gameSession = await createGameSession(req.session.user.id, null, true, totalQuestions);
    await finishGameSession(gameSession.id, score, correctAnswers);
    
    res.json({ success: true, sessionId: gameSession.id });
  } catch (error) {
    console.error('Lỗi khi lưu kết quả trận đấu solo:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// TangToc reporting routes (public) - must be before tangTocRoutes
app.get('/api/tangtoc-test', (req, res) => {
  console.log('🔍 TangToc test route called!');
  res.json({ message: 'TangToc Reports API is working!' });
});

// TangToc routes (đăng ký trước để bắt /api/tangtoc/... trước khi vào router /api chung)
app.use('/', tangTocRoutes);

// TangToc reporting routes
// Mount dưới /api để expose public route POST /tangtoc-report-question
app.use('/api', tangtocAdminApiRoutes);

// Admin routes
app.use('/admin', adminRoutes);
app.use('/api/admin', adminApiRoutes);
app.use('/api/admin', tangtocAdminApiRoutes);

// Test route để kiểm tra routing (sau khi admin routes được đăng ký)
app.get('/test', (req, res) => {
  res.json({ message: 'Server routing is working!' });
});

// Heartbeat endpoint để cập nhật trạng thái online của người dùng
app.post('/api/heartbeat', (req, res) => {
  if (req.session.user && req.session.user.id) {
    updateUserActivity(req.session.user.id);
    res.json({ success: true });
  } else {
    res.status(401).json({ error: 'Unauthorized' });
  }
});

// Khởi tạo HTTP server
const server = createServer(app);

// Khởi tạo Socket.IO
const io = initSocketIO(server);
// Khởi tạo socket riêng cho Tăng Tốc room
initTangTocSocket(io);

// Khởi động server
server.listen(PORT, () => {
  console.log(`Server đang chạy tại http://localhost:${PORT}`);
  initApp();
});

// Middleware kiểm tra quyền admin
async function checkAdmin(req, res, next) {
  if (!req.session.user) {
    return res.redirect('/login');
  }
  
  try {
    const isAdmin = await isUserAdmin(req.session.user.id);
    if (!isAdmin) {
      return res.status(403).send('Bạn không có quyền truy cập trang này');
    }
    
    next();
  } catch (error) {
    console.error('Lỗi khi kiểm tra quyền admin:', error);
    return res.status(500).send('Đã xảy ra lỗi khi xác thực quyền admin');
  }
}

// Admin dashboard routes
app.get('/admin/dashboard', checkAdmin, (req, res) => {
  res.sendFile(join(__dirname, 'views', 'admin', 'dashboard.html'));
});

app.get('/admin/users', checkAdmin, (req, res) => {
  res.sendFile(join(__dirname, 'views', 'admin', 'users.html'));
});

app.get('/admin/game-history', checkAdmin, (req, res) => {
  res.sendFile(join(__dirname, 'views', 'admin', 'game-history.html'));
});

app.get('/admin/reports', checkAdmin, (req, res) => {
  res.sendFile(join(__dirname, 'views', 'admin', 'reports.html'));
});

app.get('/admin/question-logs', checkAdmin, (req, res) => {
  res.sendFile(join(__dirname, 'views', 'admin', 'question-logs.html'));
});

app.get('/admin/tangtoc-questions', checkAdmin, (req, res) => {
  res.sendFile(join(__dirname, 'views', 'tangTocKD', 'admin-tangtoc-questions.html'));
});
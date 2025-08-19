import express from 'express';
import { getAllUsers, findUserById, createUser, updateUser, deleteUser, setAdminStatus } from '../db/users.js';
import { getAllQuestions, createQuestion, updateQuestion, deleteQuestion, importQuestionsFromCSV } from '../db/questions.js';
import { getUserGameStats, getUserGameHistory, getUserGameHistoryByMonth, getGameSessionDetails, getGameHistory, countGameHistory } from '../db/game-sessions.js';
import multer from 'multer';
import { isUserAdmin } from '../db/users.js';

console.log('🚀 Loading admin-api.js routes...');

const router = express.Router();

console.log('🚀 Router được tạo trong admin-api.js');

// Test route để kiểm tra routing
router.get('/test', (req, res) => {
  console.log('🚀 Test route được gọi');
  res.json({ message: 'Admin API routing is working!' });
});

// Middleware kiểm tra quyền admin
async function checkAdmin(req, res, next) {
  console.log('🚀 checkAdmin middleware được gọi cho URL:', req.url);
  console.log('🔍 checkAdmin middleware - Session ID:', req.sessionID);
  console.log('🔍 checkAdmin middleware - Session:', JSON.stringify(req.session, null, 2));
  console.log('🔍 checkAdmin middleware - User:', req.session.user);
  console.log('🔍 checkAdmin middleware - User ID type:', typeof req.session.user?.id);
  console.log('🔍 checkAdmin middleware - User ID value:', req.session.user?.id);
  
  if (!req.session.user) {
    console.log('❌ checkAdmin: Không có user trong session');
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  if (!req.session.user.id || isNaN(req.session.user.id)) {
    console.log('❌ checkAdmin: User ID không hợp lệ:', req.session.user.id);
    return res.status(401).json({ error: 'Invalid user ID in session' });
  }
  
  try {
    console.log('🔍 checkAdmin: Kiểm tra quyền admin cho user ID:', req.session.user.id);
    const isAdmin = await isUserAdmin(req.session.user.id);
    console.log('🔍 checkAdmin: Kết quả isAdmin:', isAdmin);
    
    if (!isAdmin) {
      console.log('❌ checkAdmin: User không có quyền admin');
      return res.status(403).json({ error: 'Forbidden' });
    }
    
    console.log('✅ checkAdmin: User có quyền admin, cho phép tiếp tục');
    next();
  } catch (error) {
    console.error('❌ Lỗi khi kiểm tra quyền admin:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}

// Cấu hình multer để xử lý upload file
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    cb(null, file.fieldname + '-' + Date.now() + '-' + file.originalname);
  }
});

const upload = multer({ storage: storage });

// Lấy thống kê tổng quan cho dashboard
router.get('/stats', checkAdmin, async (req, res) => {
  try {
    // Lấy tổng số người dùng
    const users = await getAllUsers();
    const totalUsers = users.length;
    
    // Lấy số người dùng đang online (giả lập)
    const onlineUsers = global.onlineUsers ? global.onlineUsers.size : 0;
    
    // Lấy số trận đấu hôm nay (giả lập)
    const todayGames = global.todayGames || 0;
    
    // Lấy tổng số câu hỏi
    const questions = await getAllQuestions();
    const totalQuestions = questions.length;
    
    res.json({
      totalUsers,
      onlineUsers,
      todayGames,
      totalQuestions
    });
  } catch (error) {
    console.error('Lỗi khi lấy thống kê tổng quan:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Lấy danh sách người dùng đang online
router.get('/online-users', checkAdmin, async (req, res) => {
  try {
    // Nếu chưa có danh sách người dùng online, trả về mảng rỗng
    if (!global.onlineUsers) {
      return res.json([]);
    }
    
    // Lấy thông tin chi tiết của mỗi người dùng online
    const onlineUsersArray = [];
    
    for (const [userId, userSession] of global.onlineUsers.entries()) {
      const user = await findUserById(userId);
      
      if (user) {
        onlineUsersArray.push({
          id: user.id,
          username: user.username,
          fullName: user.full_name,
          email: user.email,
          isAdmin: user.is_admin === 1,
          ip: userSession.ip || 'Unknown',
          loginTime: userSession.loginTime,
          inGame: userSession.inGame || false,
          gameId: userSession.gameId
        });
      }
    }
    
    res.json(onlineUsersArray);
  } catch (error) {
    console.error('Lỗi khi lấy danh sách người dùng đang online:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Lấy danh sách trận đấu đang diễn ra
router.get('/active-games', checkAdmin, async (req, res) => {
  try {
    // Nếu chưa có danh sách trận đấu đang diễn ra, trả về mảng rỗng
    if (!global.activeGames) {
      return res.json([]);
    }
    
    // Lấy thông tin chi tiết của mỗi trận đấu đang diễn ra
    const activeGamesArray = [];
    
    for (const [gameId, game] of global.activeGames.entries()) {
      const participants = [];
      
      // Lấy thông tin người tham gia
      for (const participant of game.participants) {
        const user = await findUserById(participant.id);
        
        if (user) {
          participants.push({
            id: user.id,
            username: user.username,
            fullName: user.full_name,
            score: participant.score || 0
          });
        }
      }
      
      activeGamesArray.push({
        id: gameId,
        isSolo: game.isSolo,
        roomId: game.roomId,
        roomName: game.roomName,
        roomCode: game.roomCode,
        startedAt: game.startedAt,
        currentQuestion: game.currentQuestionIndex + 1,
        totalQuestions: game.questions.length,
        participants: participants,
        playerName: game.isSolo ? participants[0]?.username : null
      });
    }
    
    res.json(activeGamesArray);
  } catch (error) {
    console.error('Lỗi khi lấy danh sách trận đấu đang diễn ra:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Lấy hoạt động gần đây
router.get('/activities', checkAdmin, async (req, res) => {
  try {
    // Nếu chưa có danh sách hoạt động gần đây, trả về mảng rỗng
    if (!global.recentActivities) {
      return res.json([]);
    }
    
    res.json(global.recentActivities);
  } catch (error) {
    console.error('Lỗi khi lấy hoạt động gần đây:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Đăng xuất người dùng
router.post('/kick-user/:userId', checkAdmin, async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);
    
    // Nếu chưa có danh sách người dùng online, trả về lỗi
    if (!global.onlineUsers) {
      return res.status(400).json({ error: 'No online users' });
    }
    
    // Kiểm tra người dùng có online không
    if (!global.onlineUsers.has(userId)) {
      return res.status(404).json({ error: 'User not online' });
    }
    
    // Lấy thông tin phiên người dùng
    const userSession = global.onlineUsers.get(userId);
    
    // Xóa phiên người dùng
    global.onlineUsers.delete(userId);
    
    // Cập nhật số người dùng online
    const onlineUsers = global.onlineUsers.size;
    
    // Thêm hoạt động mới
    addActivity({
      username: req.session.user.username,
      action: `đã đăng xuất người dùng ${userSession.username}`,
      timestamp: new Date()
    });
    
    // Gửi sự kiện thông báo cho client
    if (global.io) {
      global.io.emit('user_logout', {
        userId,
        username: userSession.username,
        onlineUsers
      });
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error('Lỗi khi đăng xuất người dùng:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Kết thúc trận đấu
router.post('/end-game/:gameId', checkAdmin, async (req, res) => {
  try {
    const gameId = parseInt(req.params.gameId);
    
    // Nếu chưa có danh sách trận đấu đang diễn ra, trả về lỗi
    if (!global.activeGames) {
      return res.status(400).json({ error: 'No active games' });
    }
    
    // Kiểm tra trận đấu có tồn tại không
    if (!global.activeGames.has(gameId)) {
      return res.status(404).json({ error: 'Game not found' });
    }
    
    // Lấy thông tin trận đấu
    const game = global.activeGames.get(gameId);
    
    // Thêm hoạt động mới
    addActivity({
      username: req.session.user.username,
      action: `đã kết thúc trận đấu ${game.isSolo ? 'tự đấu' : 'đấu phòng'} #${gameId}`,
      timestamp: new Date()
    });
    
    // Gửi sự kiện kết thúc trận đấu cho client
    if (global.io) {
      // Gửi sự kiện game_over cho tất cả người tham gia
      const roomCode = game.roomCode;
      if (roomCode) {
        global.io.to(roomCode).emit('game_over', {
          message: 'Trận đấu đã bị kết thúc bởi admin',
          results: game.participants.map(p => ({
            userId: p.id,
            username: p.username,
            score: p.score || 0
          }))
        });
      }
    }
    
    // Xóa trận đấu khỏi danh sách
    global.activeGames.delete(gameId);
    
    res.json({ success: true });
  } catch (error) {
    console.error('Lỗi khi kết thúc trận đấu:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Lấy danh sách người dùng
router.get('/users', checkAdmin, async (req, res) => {
  try {
    const users = await getAllUsers();
    
    // Lấy thông tin chi tiết hơn cho mỗi người dùng
    const usersWithDetails = await Promise.all(users.map(async (user) => {
      // Lấy thống kê trận đấu của người dùng
      const stats = await getUserGameStats(user.id);
      
      // Kiểm tra người dùng có đang online không
      const isOnline = global.onlineUsers ? global.onlineUsers.has(user.id) : false;
      
      return {
        id: user.id,
        username: user.username,
        fullName: user.full_name,
        email: user.email,
        isAdmin: user.is_admin === 1,
        isActive: user.is_active === 1,
        createdAt: user.created_at,
        lastLogin: user.last_login,
        isOnline,
        stats
      };
    }));
    
    res.json(usersWithDetails);
  } catch (error) {
    console.error('Lỗi khi lấy danh sách người dùng:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Xem trước danh sách sẽ xóa (đặt trước route động /users/:userId để tránh nuốt đường dẫn)
router.get('/users/preview-delete', checkAdmin, async (req, res) => {
  try {
    const { fromDate, toDate, fromHour, toHour, fromTime, toTime, inactiveDays, onlyLocked, onlyNonAdmin } = req.query;
    const { getUsersForDeletion } = await import('../db/users.js');
    const users = await getUsersForDeletion({
      fromDate: fromDate || null,
      toDate: toDate || null,
      fromHour: fromHour && fromHour !== '' ? parseInt(fromHour) : undefined,
      toHour: toHour && toHour !== '' ? parseInt(toHour) : undefined,
      fromTime: fromTime || null,
      toTime: toTime || null,
      inactiveDays: inactiveDays && inactiveDays !== '' ? parseInt(inactiveDays) : null,
      onlyLocked: onlyLocked === 'true',
      onlyNonAdmin: onlyNonAdmin === 'true',
      excludeUserId: req.session.user.id
    });
    res.json({ users, totalCount: users.length });
  } catch (error) {
    console.error('Lỗi khi xem trước danh sách xóa:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Lấy thông tin chi tiết người dùng
router.get('/users/:userId', checkAdmin, async (req, res) => {
  try {
    console.log('🔍 Route /users/:userId - req.params:', req.params);
    console.log('🔍 Route /users/:userId - req.params.userId:', req.params.userId);
    console.log('🔍 Route /users/:userId - typeof req.params.userId:', typeof req.params.userId);
    
    const userId = parseInt(req.params.userId);
    console.log('🔍 Route /users/:userId - parsed userId:', userId);
    console.log('🔍 Route /users/:userId - isNaN(userId):', isNaN(userId));
    
    if (isNaN(userId)) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }
    
    const user = await findUserById(userId);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Lấy thống kê trận đấu của người dùng
    const stats = await getUserGameStats(userId);
    
    // Lấy lịch sử đăng nhập chi tiết từ database
    const { getUserLoginHistory } = await import('../db/login-logs.js');
    const loginHistory = await getUserLoginHistory(userId, 100, 0);
    
    // Kiểm tra người dùng có đang online không
    const isOnline = global.onlineUsers ? global.onlineUsers.has(userId) : false;
    
    // Lấy thông tin phiên người dùng nếu đang online
    const userSession = isOnline ? global.onlineUsers.get(userId) : null;
    
    const userDetails = {
      id: user.id,
      username: user.username,
      fullName: user.full_name,
      email: user.email,
      isAdmin: user.is_admin === 1,
      isActive: user.is_active === 1,
      createdAt: user.created_at,
      lastLogin: user.last_login,
      isOnline,
      ip: userSession ? userSession.ip : null,
      currentGame: userSession && userSession.inGame ? userSession.gameId : null,
      stats,
      loginHistory
    };
    
    res.json(userDetails);
  } catch (error) {
    console.error('Lỗi khi lấy thông tin chi tiết người dùng:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Lấy tất cả login logs
router.get('/login-logs', checkAdmin, async (req, res) => {
  try {
    const { getAllLoginLogs, countLoginLogs } = await import('../db/login-logs.js');
    
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const offset = (page - 1) * limit;
    
    // Lấy filters từ query params
    const filters = {
      userId: req.query.userId && !isNaN(parseInt(req.query.userId)) ? parseInt(req.query.userId) : null,
      username: req.query.username || null,
      ipAddress: req.query.ipAddress || null,
      deviceType: req.query.deviceType || null,
      loginStatus: req.query.loginStatus || null,
      fromDate: req.query.fromDate || null,
      toDate: req.query.toDate || null,
      fromHour: req.query.fromHour && !isNaN(parseInt(req.query.fromHour)) ? parseInt(req.query.fromHour) : null,
      toHour: req.query.toHour && !isNaN(parseInt(req.query.toHour)) ? parseInt(req.query.toHour) : null,
      isSuspicious: req.query.isSuspicious !== undefined ? req.query.isSuspicious === 'true' : null
    };
    
    const [logs, total] = await Promise.all([
      getAllLoginLogs(filters, limit, offset),
      countLoginLogs(filters)
    ]);
    
    res.json({
      logs,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Lỗi khi lấy login logs:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Lấy thống kê đăng nhập
router.get('/login-stats', checkAdmin, async (req, res) => {
  try {
    const { getLoginStats } = await import('../db/login-logs.js');
    
    const filters = {
      fromDate: req.query.fromDate || null,
      toDate: req.query.toDate || null
    };
    
    const stats = await getLoginStats(filters);
    res.json(stats);
  } catch (error) {
    console.error('Lỗi khi lấy thống kê đăng nhập:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Xóa người dùng
router.delete('/users/:userId', checkAdmin, async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);
    
    // Kiểm tra không xóa chính mình
    if (userId === req.session.user.id) {
      return res.status(400).json({ error: 'Không thể xóa chính mình' });
    }
    
    const { deleteUser } = await import('../db/users.js');
    const success = await deleteUser(userId);
    
    if (success) {
      res.json({ success: true, message: 'Đã xóa người dùng thành công' });
    } else {
      res.status(404).json({ error: 'Không tìm thấy người dùng' });
    }
  } catch (error) {
    console.error('Lỗi khi xóa người dùng:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Xóa hàng loạt người dùng
router.post('/users/bulk-delete', checkAdmin, async (req, res) => {
  try {
    const { userIds } = req.body;
    
    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({ error: 'Danh sách người dùng không hợp lệ' });
    }
    
    // Kiểm tra không xóa chính mình
    if (userIds.includes(req.session.user.id)) {
      return res.status(400).json({ error: 'Không thể xóa chính mình' });
    }
    
    const { deleteUsers } = await import('../db/users.js');
    const result = await deleteUsers(userIds);
    
    res.json({ 
      success: true, 
      deletedCount: result.deletedCount,
      message: `Đã xóa ${result.deletedCount} người dùng thành công`
    });
  } catch (error) {
    console.error('Lỗi khi xóa hàng loạt người dùng:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Xóa người dùng theo thời gian
router.post('/users/delete-by-date', checkAdmin, async (req, res) => {
  try {
    const { fromDate, toDate, fromTime, toTime, onlyLocked, onlyNonAdmin } = req.body;
    
    if (!fromDate || !toDate) {
      return res.status(400).json({ error: 'Thiếu thông tin thời gian' });
    }
    
    const { deleteUsersByDate } = await import('../db/users.js');
    const result = await deleteUsersByDate({
      fromDate,
      toDate,
      fromTime: fromTime || null,
      toTime: toTime || null,
      onlyLocked: onlyLocked || false,
      onlyNonAdmin: onlyNonAdmin || false,
      excludeUserId: req.session.user.id // Không xóa chính mình
    });
    
    res.json({ 
      success: true, 
      deletedCount: result.deletedCount,
      message: `Đã xóa ${result.deletedCount} người dùng thành công`
    });
  } catch (error) {
    console.error('Lỗi khi xóa người dùng theo thời gian:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Xóa người dùng theo giờ (múi giờ Việt Nam)
router.post('/users/delete-by-hour', checkAdmin, async (req, res) => {
  try {
    const { fromHour, toHour, fromDate, toDate, onlyLocked, onlyNonAdmin } = req.body;
    
    if (fromHour === undefined || toHour === undefined) {
      return res.status(400).json({ error: 'Phải cung cấp fromHour và toHour' });
    }
    
    if (fromHour < 0 || fromHour > 23 || toHour < 0 || toHour > 23) {
      return res.status(400).json({ error: 'Giờ phải từ 0-23' });
    }
    
    const { deleteUsersByHour } = await import('../db/users.js');
    const result = await deleteUsersByHour({
      fromHour: parseInt(fromHour),
      toHour: parseInt(toHour),
      fromDate: fromDate || null,
      toDate: toDate || null,
      onlyLocked: onlyLocked || false,
      onlyNonAdmin: onlyNonAdmin || false,
      excludeUserId: req.session.user.id // Không xóa chính mình
    });
    
    res.json({ 
      success: true, 
      deletedCount: result.deletedCount,
      message: `Đã xóa ${result.deletedCount} người dùng trong khoảng giờ ${fromHour}:00-${toHour}:59 thành công`
    });
  } catch (error) {
    console.error('Lỗi khi xóa người dùng theo giờ:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Xóa người dùng theo giờ trong ngày cụ thể
router.post('/users/delete-by-hour-in-day', checkAdmin, async (req, res) => {
  try {
    const { date, fromHour, toHour, onlyLocked, onlyNonAdmin } = req.body;
    
    if (!date || fromHour === undefined || toHour === undefined) {
      return res.status(400).json({ error: 'Phải cung cấp date, fromHour và toHour' });
    }
    
    if (fromHour < 0 || fromHour > 23 || toHour < 0 || toHour > 23) {
      return res.status(400).json({ error: 'Giờ phải từ 0-23' });
    }
    
    const { deleteUsersByHourInDay } = await import('../db/users.js');
    const result = await deleteUsersByHourInDay({
      date,
      fromHour: parseInt(fromHour),
      toHour: parseInt(toHour),
      onlyLocked: onlyLocked || false,
      onlyNonAdmin: onlyNonAdmin || false,
      excludeUserId: req.session.user.id // Không xóa chính mình
    });
    
    res.json({ 
      success: true, 
      deletedCount: result.deletedCount,
      message: `Đã xóa ${result.deletedCount} người dùng trong ngày ${date} từ ${fromHour}:00-${toHour}:59 thành công`
    });
  } catch (error) {
    console.error('Lỗi khi xóa người dùng theo giờ trong ngày:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Xóa người dùng không hoạt động
router.post('/users/delete-inactive', checkAdmin, async (req, res) => {
  try {
    const { inactiveDays, onlyLocked, onlyNonAdmin } = req.body;
    
    if (!inactiveDays || inactiveDays < 1) {
      return res.status(400).json({ error: 'Số ngày không hợp lệ' });
    }
    
    const { deleteInactiveUsers } = await import('../db/users.js');
    const result = await deleteInactiveUsers({
      inactiveDays: parseInt(inactiveDays),
      onlyLocked: onlyLocked || false,
      onlyNonAdmin: onlyNonAdmin || false,
      excludeUserId: req.session.user.id // Không xóa chính mình
    });
    
    res.json({ 
      success: true, 
      deletedCount: result.deletedCount,
      message: `Đã xóa ${result.deletedCount} người dùng không hoạt động thành công`
    });
  } catch (error) {
    console.error('Lỗi khi xóa người dùng không hoạt động:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Xem trước danh sách sẽ xóa
router.get('/users/preview-delete', checkAdmin, async (req, res) => {
  try {
    const { fromDate, toDate, fromHour, toHour, inactiveDays, onlyLocked, onlyNonAdmin } = req.query;
    
    const { getUsersForDeletion } = await import('../db/users.js');
    const users = await getUsersForDeletion({
      fromDate: fromDate || null,
      toDate: toDate || null,
      fromHour: fromHour && fromHour !== '' ? parseInt(fromHour) : undefined,
      toHour: toHour && toHour !== '' ? parseInt(toHour) : undefined,
      inactiveDays: inactiveDays && inactiveDays !== '' ? parseInt(inactiveDays) : null,
      onlyLocked: onlyLocked === 'true',
      onlyNonAdmin: onlyNonAdmin === 'true',
      excludeUserId: req.session.user.id
    });
    
    res.json({ 
      users,
      totalCount: users.length
    });
  } catch (error) {
    console.error('Lỗi khi xem trước danh sách xóa:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Lấy lịch sử trận đấu
router.get('/game-history', checkAdmin, async (req, res) => {
  try {
    const { userId, type, from, to, page = 1, limit = 10 } = req.query;
    
    const isSolo = type === 'solo' ? true : (type === 'room' ? false : null);
    const pageNumber = Math.max(parseInt(page) || 1, 1);
    const pageSize = Math.max(parseInt(limit) || 10, 1);
    const offset = (pageNumber - 1) * pageSize;
    
    const [total, games] = await Promise.all([
      countGameHistory({
        userId: userId ? parseInt(userId) : null,
        isSolo,
        from: from ? new Date(from) : null,
        to: to ? new Date(to) : null
      }),
      getGameHistory({
        userId: userId ? parseInt(userId) : null,
        isSolo,
        from: from ? new Date(from) : null,
        to: to ? new Date(to) : null,
        offset,
        limit: pageSize
      })
    ]);
    
    res.json({
      games,
      pagination: {
        total,
        page: pageNumber,
        limit: pageSize,
        pages: Math.ceil(total / pageSize)
      }
    });
  } catch (error) {
    console.error('Lỗi khi lấy lịch sử trận đấu:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Lấy chi tiết trận đấu
router.get('/game-history/:gameId', checkAdmin, async (req, res) => {
  try {
    const gameId = parseInt(req.params.gameId);
    const gameDetails = await getGameSessionDetails(gameId);
    
    if (!gameDetails) {
      return res.status(404).json({ error: 'Game not found' });
    }
    
    res.json(gameDetails);
  } catch (error) {
    console.error('Lỗi khi lấy chi tiết trận đấu:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Thêm hoạt động mới
function addActivity(activity) {
  if (!global.recentActivities) {
    global.recentActivities = [];
  }
  
  // Thêm vào đầu mảng
  global.recentActivities.unshift(activity);
  
  // Giới hạn số lượng hoạt động lưu trữ
  const maxActivities = 100;
  if (global.recentActivities.length > maxActivities) {
    global.recentActivities = global.recentActivities.slice(0, maxActivities);
  }
}

export default router;
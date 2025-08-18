import express from 'express';
import { getAllUsers, findUserById, createUser, updateUser, deleteUser, setAdminStatus } from '../db/users.js';
import { getAllQuestions, createQuestion, updateQuestion, deleteQuestion, importQuestionsFromCSV } from '../db/questions.js';
import { getUserGameStats, getUserGameHistory, getUserGameHistoryByMonth, getGameSessionDetails, getGameHistory, countGameHistory } from '../db/game-sessions.js';
import multer from 'multer';
import { isUserAdmin } from '../db/users.js';

const router = express.Router();

// Middleware kiểm tra quyền admin
async function checkAdmin(req, res, next) {
  if (!req.session.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  try {
    const isAdmin = await isUserAdmin(req.session.user.id);
    if (!isAdmin) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    
    next();
  } catch (error) {
    console.error('Lỗi khi kiểm tra quyền admin:', error);
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

// Lấy thông tin chi tiết người dùng
router.get('/users/:userId', checkAdmin, async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);
    const user = await findUserById(userId);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Lấy thống kê trận đấu của người dùng
    const stats = await getUserGameStats(userId);
    
    // Lấy lịch sử đăng nhập của người dùng (giả lập)
    const loginHistory = global.loginHistory ? global.loginHistory.filter(log => log.userId === userId) : [];
    
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
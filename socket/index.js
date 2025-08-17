import { Server } from 'socket.io';
import { getRandomQuestions, checkAnswer } from '../db/questions.js';
import { createRoom, findRoomByCode, joinRoom, getRoomParticipants, updateRoomStatus, updateParticipantScore, getRoomResults } from '../db/rooms.js';
import { createGameSession, finishGameSession, saveUserAnswer, getUserGameHistory } from '../db/game-sessions.js';

let io;

// Khởi tạo Socket.IO
export function initSocketIO(server) {
  io = new Server(server);
  
  // Lưu trữ thông tin phòng
  const rooms = new Map();
  
  // Khởi tạo biến toàn cục để theo dõi người dùng online
  if (!global.onlineUsers) {
    global.onlineUsers = new Map();
  }
  
  // Khởi tạo biến toàn cục để theo dõi trận đấu đang diễn ra
  if (!global.activeGames) {
    global.activeGames = new Map();
  }
  
  // Khởi tạo biến toàn cục để lưu trữ hoạt động gần đây
  if (!global.recentActivities) {
    global.recentActivities = [];
  }
  
  // Khởi tạo biến toàn cục để lưu trữ lịch sử đăng nhập
  if (!global.loginHistory) {
    global.loginHistory = [];
  }
  
  // Khởi tạo biến toàn cục để đếm số trận đấu hôm nay
  if (!global.todayGames) {
    global.todayGames = 0;
  }
  
  // Lưu trữ đối tượng io để sử dụng ở nơi khác
  global.io = io;
  
  io.on('connection', (socket) => {
    console.log('Người dùng kết nối:', socket.id);
    
    // Xử lý khi người dùng tạo phòng mới
    socket.on('create_room', async (data, callback) => {
      try {
        const { userId, username, roomName } = data;
        
        // Tạo phòng trong database
        const room = await createRoom(roomName, userId);
        
        // Lưu thông tin phòng trong bộ nhớ
        rooms.set(room.code, {
          id: room.id,
          code: room.code,
          name: room.name,
          createdBy: userId,
          participants: [{
            id: userId,
            username: username,
            socketId: socket.id,
            score: 0,
            isCreator: true
          }],
          status: 'waiting',
          questions: [],
          currentQuestionIndex: -1,
          startTime: null
        });
        
        // Tham gia socket vào room
        socket.join(room.code);
        
        callback({
          success: true,
          room: {
            id: room.id,
            code: room.code,
            name: room.name
          }
        });
      } catch (error) {
        console.error('Lỗi khi tạo phòng:', error);
        callback({ success: false, error: 'Không thể tạo phòng' });
      }
    });
    
    // Xử lý khi người dùng tham gia phòng
    socket.on('join_room', async (data, callback) => {
      try {
        const { userId, username, roomCode } = data;
        
        // Kiểm tra phòng có tồn tại không
        const roomInfo = await findRoomByCode(roomCode);
        if (!roomInfo) {
          return callback({ success: false, error: 'Phòng không tồn tại' });
        }
        
        // Kiểm tra phòng có trong bộ nhớ không
        if (!rooms.has(roomCode)) {
          // Tạo thông tin phòng trong bộ nhớ nếu chưa có
          const participants = await getRoomParticipants(roomInfo.id);
          
          rooms.set(roomCode, {
            id: roomInfo.id,
            code: roomCode,
            name: roomInfo.name,
            createdBy: roomInfo.createdBy,
            participants: [],
            status: roomInfo.status,
            questions: [],
            currentQuestionIndex: -1,
            startTime: null
          });
        }
        
        const room = rooms.get(roomCode);
        
        // Kiểm tra trạng thái phòng
        if (room.status !== 'waiting') {
          return callback({ success: false, error: 'Phòng đã bắt đầu hoặc kết thúc' });
        }
        
        // Kiểm tra người dùng đã tham gia phòng chưa
        const existingParticipant = room.participants.find(p => p.id === userId);
        if (existingParticipant) {
          // Cập nhật socketId nếu người dùng đã tham gia trước đó
          existingParticipant.socketId = socket.id;
        } else {
          // Tham gia phòng trong database
          await joinRoom(room.id, userId);
          
          // Thêm người dùng vào danh sách trong bộ nhớ
          room.participants.push({
            id: userId,
            username: username,
            socketId: socket.id,
            score: 0,
            isCreator: false
          });
        }
        
        // Tham gia socket vào room
        socket.join(roomCode);
        
        // Thông báo cho tất cả người trong phòng
        io.to(roomCode).emit('participant_joined', {
          participants: room.participants.map(p => ({
            id: p.id,
            username: p.username,
            isCreator: p.isCreator
          }))
        });
        
        callback({
          success: true,
          room: {
            id: room.id,
            code: room.code,
            name: room.name,
            participants: room.participants.map(p => ({
              id: p.id,
              username: p.username,
              isCreator: p.isCreator
            }))
          }
        });
      } catch (error) {
        console.error('Lỗi khi tham gia phòng:', error);
        callback({ success: false, error: 'Không thể tham gia phòng' });
      }
    });
    
    // Xử lý khi chủ phòng bắt đầu trò chơi
    socket.on('start_game', async (data, callback) => {
      try {
        const { roomCode, userId } = data;
        
        // Kiểm tra phòng có tồn tại không
        if (!rooms.has(roomCode)) {
          return callback({ success: false, error: 'Phòng không tồn tại' });
        }
        
        const room = rooms.get(roomCode);
        
        // Kiểm tra người dùng có phải là chủ phòng không
        if (room.createdBy !== userId) {
          return callback({ success: false, error: 'Chỉ chủ phòng mới có thể bắt đầu trò chơi' });
        }
        
        // Kiểm tra số lượng người tham gia
        if (room.participants.length < 1) {
          return callback({ success: false, error: 'Cần ít nhất 1 người tham gia để bắt đầu' });
        }
        
        // Lấy câu hỏi ngẫu nhiên
        const questions = await getRandomQuestions(12);
        room.questions = questions;
        room.currentQuestionIndex = -1;
        room.status = 'playing';
        
        // Cập nhật trạng thái phòng trong database
        await updateRoomStatus(room.id, 'playing');
        
        // Tạo phiên chơi cho mỗi người tham gia
        for (const participant of room.participants) {
          const session = await createGameSession(participant.id, room.id, false, questions.length);
          participant.sessionId = session.id;
        }
        
        // Thông báo cho tất cả người trong phòng
        io.to(roomCode).emit('game_starting', {
          message: 'Trò chơi sắp bắt đầu',
          countDown: 3
        });
        
        // Đếm ngược 3 giây trước khi bắt đầu
        setTimeout(() => {
          nextQuestion(room);
        }, 3000);
        
        callback({ success: true });
      } catch (error) {
        console.error('Lỗi khi bắt đầu trò chơi:', error);
        callback({ success: false, error: 'Không thể bắt đầu trò chơi' });
      }
    });
    
    // Xử lý khi người dùng trả lời câu hỏi
    socket.on('submit_answer', async (data, callback) => {
      try {
        const { roomCode, userId, userAnswer, answerTime } = data;
        
        // Kiểm tra phòng có tồn tại không
        if (!rooms.has(roomCode)) {
          return callback({ success: false, error: 'Phòng không tồn tại' });
        }
        
        const room = rooms.get(roomCode);
        
        // Kiểm tra trạng thái phòng
        if (room.status !== 'playing') {
          return callback({ success: false, error: 'Phòng không trong trạng thái chơi' });
        }
        
        // Kiểm tra người dùng có trong phòng không
        const participant = room.participants.find(p => p.id === userId);
        if (!participant) {
          return callback({ success: false, error: 'Người dùng không trong phòng' });
        }
        
        // Đánh dấu người dùng đã trả lời
        participant.hasAnswered = true;
        
        // Lấy câu hỏi hiện tại
        const currentQuestion = room.questions[room.currentQuestionIndex];
        if (!currentQuestion) {
          return callback({ success: false, error: 'Không có câu hỏi hiện tại' });
        }
        
        // Kiểm tra đáp án
        const isCorrect = checkAnswer(userAnswer, currentQuestion.answer);
        
        // Tính điểm - mỗi câu đúng được 10 điểm
        let points = 0;
        if (isCorrect) {
          points = 10; // Cố định 10 điểm cho mỗi câu đúng
          participant.score += points;
        }
        
        // Lưu kết quả câu trả lời cho người dùng
        if (!participant.answers) {
          participant.answers = [];
        }
        participant.answers[room.currentQuestionIndex] = {
          questionId: currentQuestion.id,
          userAnswer,
          isCorrect,
          answerTime
        };
        
        // Lưu câu trả lời vào database
        await saveUserAnswer(
          participant.sessionId,
          currentQuestion.id,
          userAnswer,
          isCorrect,
          answerTime
        );
        
        // Thông báo kết quả cho người dùng
        callback({
          success: true,
          isCorrect,
          correctAnswer: currentQuestion.answer,
          points,
          totalScore: participant.score
        });
        
        // Thông báo cho tất cả người trong phòng về trạng thái mới
        io.to(roomCode).emit('participant_answered', {
          userId,
          username: participant.username,
          hasAnswered: true
        });
        
        // Kiểm tra xem tất cả người dùng đã trả lời chưa
        const allAnswered = room.participants.every(p => p.hasAnswered);
        if (allAnswered) {
          // Nếu tất cả đã trả lời, chuyển sang câu hỏi tiếp theo
          setTimeout(() => {
            nextQuestion(room);
          }, 2000);
        }
      } catch (error) {
        console.error('Lỗi khi trả lời câu hỏi:', error);
        callback({ success: false, error: 'Không thể xử lý câu trả lời' });
      }
    });
    
    // Xử lý khi người dùng ngắt kết nối
    socket.on('disconnect', () => {
      console.log('Người dùng ngắt kết nối:', socket.id);
      
      // Tìm phòng mà người dùng đang tham gia
      for (const [roomCode, room] of rooms.entries()) {
        const participantIndex = room.participants.findIndex(p => p.socketId === socket.id);
        
        if (participantIndex !== -1) {
          const participant = room.participants[participantIndex];
          
          // Đánh dấu người dùng đã ngắt kết nối
          participant.disconnected = true;
          
          // Thông báo cho tất cả người trong phòng
          io.to(roomCode).emit('participant_disconnected', {
            userId: participant.id,
            username: participant.username
          });
          
          // Nếu tất cả người dùng đã ngắt kết nối, dọn dẹp phòng
          const allDisconnected = room.participants.every(p => p.disconnected);
          if (allDisconnected) {
            rooms.delete(roomCode);
          }
          
          break;
        }
      }
    });
  });
  
  return io;
}

// Hàm chuyển sang câu hỏi tiếp theo
async function nextQuestion(room) {
  room.currentQuestionIndex++;
  
  // Kiểm tra nếu đã hết câu hỏi
  if (room.currentQuestionIndex >= room.questions.length) {
    return endGame(room);
  }
  
  // Lấy câu hỏi tiếp theo
  const question = room.questions[room.currentQuestionIndex];
  
  // Đặt lại trạng thái trả lời của người tham gia
  room.participants.forEach(p => {
    p.hasAnswered = false;
  });
  
  // Ghi nhớ thời gian bắt đầu câu hỏi
  room.startTime = Date.now();
  
  // Tính thời gian còn lại cho toàn bộ trò chơi (60 giây tổng)
  const totalTimeLimit = 60; // 60 giây cho toàn bộ 12 câu hỏi
  const timePerQuestion = Math.floor(totalTimeLimit / room.questions.length); // Chia đều thời gian cho mỗi câu
  
  // Gửi câu hỏi cho tất cả người tham gia
  io.to(room.code).emit('new_question', {
    questionNumber: room.currentQuestionIndex + 1,
    totalQuestions: room.questions.length,
    question: {
      id: question.id,
      text: question.text,
      options: question.options
    },
    timeLimit: timePerQuestion, // Thời gian cho câu hỏi hiện tại
    totalTimeLeft: totalTimeLimit - (room.currentQuestionIndex * timePerQuestion) // Thời gian còn lại tổng
  });
  
  // Đặt hẹn giờ để tự động chuyển sang câu hỏi tiếp theo sau khi hết thời gian
  setTimeout(() => {
    // Kiểm tra xem phòng còn tồn tại không
    if (rooms.has(room.code) && room.currentQuestionIndex === room.currentQuestionIndex) {
      // Tự động chuyển sang câu hỏi tiếp theo
      io.to(room.code).emit('question_timeout');
      
      // Lưu câu trả lời là "không trả lời" cho những người chưa trả lời
      room.participants.forEach(async (p) => {
        if (!p.hasAnswered && !p.disconnected) {
          await saveUserAnswer(
            p.sessionId,
            question.id,
            null, // Không có câu trả lời
            false,
            timePerQuestion // Hết thời gian
          );
        }
      });
      
      setTimeout(() => {
        nextQuestion(room);
      }, 2000);
    }
  }, timePerQuestion * 1000); // Sử dụng thời gian đã tính toán
}

// Hàm kết thúc trò chơi
async function endGame(room) {
  try {
    // Cập nhật trạng thái phòng
    room.status = 'finished';
    await updateRoomStatus(room.id, 'finished');
    
    // Cập nhật điểm số của người tham gia trong database
    for (const participant of room.participants) {
      if (!participant.disconnected) {
        // Đếm số câu trả lời đúng
        let correctAnswers = 0;
        room.questions.forEach((question, index) => {
          const isCorrect = participant.answers && participant.answers[index] && participant.answers[index].isCorrect;
          if (isCorrect) {
            correctAnswers++;
          }
        });
        
        await updateParticipantScore(room.id, participant.id, participant.score);
        await finishGameSession(participant.sessionId, participant.score, correctAnswers);
      }
    }
    
    // Lấy kết quả từ database
    const results = await getRoomResults(room.id);
    
    // Gửi kết quả cho tất cả người tham gia
    io.to(room.code).emit('game_over', {
      results: results
    });
    
    // Giữ phòng trong bộ nhớ một thời gian trước khi xóa
    setTimeout(() => {
      if (rooms.has(room.code)) {
        rooms.delete(room.code);
      }
    }, 3600000); // 1 giờ
  } catch (error) {
    console.error('Lỗi khi kết thúc trò chơi:', error);
  }
}

// Lấy đối tượng io
// Thêm người dùng vào danh sách online
export function addOnlineUser(userId, username, ip) {
  if (!global.onlineUsers) {
    global.onlineUsers = new Map();
  }
  
  global.onlineUsers.set(userId, {
    userId,
    username,
    ip,
    loginTime: new Date(),
    inGame: false
  });
  
  // Thêm vào lịch sử đăng nhập
  if (!global.loginHistory) {
    global.loginHistory = [];
  }
  
  global.loginHistory.push({
    userId,
    username,
    ip,
    timestamp: new Date(),
    status: 'success'
  });
  
  // Thêm hoạt động mới
  addActivity({
    username,
    action: 'đã đăng nhập vào hệ thống',
    timestamp: new Date()
  });
  
  // Gửi sự kiện thông báo cho admin
  if (global.io) {
    global.io.emit('user_login', {
      userId,
      username,
      onlineUsers: global.onlineUsers.size
    });
  }
}

// Xóa người dùng khỏi danh sách online
export function removeOnlineUser(userId) {
  if (!global.onlineUsers) {
    return;
  }
  
  // Lấy thông tin người dùng trước khi xóa
  const userSession = global.onlineUsers.get(userId);
  
  if (userSession) {
    // Xóa người dùng khỏi danh sách
    global.onlineUsers.delete(userId);
    
    // Thêm hoạt động mới
    addActivity({
      username: userSession.username,
      action: 'đã đăng xuất khỏi hệ thống',
      timestamp: new Date()
    });
    
    // Gửi sự kiện thông báo cho admin
    if (global.io) {
      global.io.emit('user_logout', {
        userId,
        username: userSession.username,
        onlineUsers: global.onlineUsers.size
      });
    }
  }
}

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

export function getIO() {
  return io;
}
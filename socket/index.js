import { Server } from 'socket.io';
import { getRandomQuestions, checkAnswer } from '../db/questions.js';
import { createRoom, findRoomByCode, joinRoom, getRoomParticipants, updateRoomStatus, updateParticipantScore, getRoomResults } from '../db/rooms.js';
import { createGameSession, finishGameSession, saveUserAnswer, getUserGameHistory } from '../db/game-sessions.js';

let io;

// Khởi tạo Socket.IO
// Lưu trữ timer cho từng phòng (global scope)
const roomTimers = new Map();
// Lưu trữ thông tin phòng (global scope) - PERSISTENT để giữ người dùng kể cả reload
const rooms = new Map();
// Lưu trữ thông tin người dùng đang online để reconnect
const userSessions = new Map();

export function initSocketIO(server) {
  io = new Server(server);
  
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
        
        // Lưu thông tin phòng trong bộ nhớ - PERSISTENT
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
          startTime: null,
          totalTimeRemaining: 60, // 60 giây tổng cho tất cả câu hỏi
          gameStartTime: null,
          gameHistory: [], // Lưu lịch sử các trận đấu
          currentGame: null // Trận đấu hiện tại nếu có
        });
        
        // Lưu session người dùng để reconnect
        userSessions.set(userId, {
          socketId: socket.id,
          roomCode: room.code,
          username: username,
          isCreator: true,
          lastSeen: Date.now()
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
            startTime: null,
            gameHistory: [],
            currentGame: null
          });
        }
        
        const room = rooms.get(roomCode);
        
        // Kiểm tra trạng thái phòng
        if (room.status !== 'waiting' && room.status !== 'finished') {
          return callback({ success: false, error: 'Phòng đã bắt đầu hoặc kết thúc' });
        }
        
        // Kiểm tra người dùng đã tham gia phòng chưa
        const existingParticipant = room.participants.find(p => p.id === userId);
        if (existingParticipant) {
          // Cập nhật socketId nếu người dùng đã tham gia trước đó (reconnect)
          existingParticipant.socketId = socket.id;
          existingParticipant.lastSeen = Date.now();
          existingParticipant.disconnected = false;
          
          console.log(`🔄 ${username} reconnect vào phòng ${roomCode}`);
        } else {
          // Tham gia phòng trong database
          await joinRoom(room.id, userId);
          
          // Thêm người dùng vào danh sách trong bộ nhớ
          room.participants.push({
            id: userId,
            username: username,
            socketId: socket.id,
            score: 0,
            isCreator: false,
            lastSeen: Date.now(),
            disconnected: false
          });
        }
        
        // Lưu session người dùng để reconnect
        userSessions.set(userId, {
          socketId: socket.id,
          roomCode: roomCode,
          username: username,
          isCreator: room.createdBy === userId,
          lastSeen: Date.now()
        });
        
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
            createdBy: room.createdBy, // Thêm createdBy vào response
            participants: room.participants.map(p => ({
              id: p.id,
              username: p.username,
              isCreator: p.isCreator
            })),
            status: room.status,
            currentGame: room.currentGame
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
        console.log('🎮 start_game event received:', data);
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
        
        // Lấy câu hỏi ngẫu nhiên từ API (giống solo battle)
        console.log('🔍 Đang lấy câu hỏi...');
        const questions = await fetchQuestionsFromAPI(20);
        console.log('✅ Đã lấy', questions.length, 'câu hỏi');
        
        // Tạo trận đấu mới
        const gameId = Date.now();
        room.currentGame = {
          id: gameId,
          startTime: Date.now(),
          questions: questions,
          status: 'starting',
          participants: room.participants.map(p => ({
            id: p.id,
            username: p.username,
            score: 0,
            finished: false,
            resultSubmitted: false
          }))
        };
        
        room.questions = questions;
        room.currentQuestionIndex = -1;
        room.status = 'playing';
        
        // Cập nhật trạng thái phòng trong database
        await updateRoomStatus(room.id, 'playing');
        
        // Tạo thứ tự câu hỏi khác nhau cho mỗi người tham gia
        for (const participant of room.participants) {
          console.log('👤 Setup participant:', participant.username);
          const session = await createGameSession(participant.id, room.id, false, questions.length);
          participant.sessionId = session.id;
          
          // Tạo thứ tự câu hỏi ngẫu nhiên cho participant này
          participant.questionOrder = shuffleArray([...Array(questions.length).keys()]);
          participant.currentQuestionIndex = -1;
          participant.answers = [];
          console.log('🔀 Question order for', participant.username, ':', participant.questionOrder);
        }
        
        // Thông báo cho tất cả người trong phòng
        io.to(roomCode).emit('game_starting', {
          message: 'Trò chơi sắp bắt đầu',
          countDown: 3
        });
        
        // Đếm ngược 3 giây trước khi gửi câu hỏi đầu tiên, sau đó chờ thêm 5 giây intro mới bắt đầu đếm 60s
        setTimeout(() => {
          console.log('🎮 Gửi câu hỏi đầu tiên, đợi 5s intro rồi mới bắt đầu game timer cho phòng:', roomCode);
          // Đặt trước giá trị thời gian tổng để client hiển thị 60s trong lúc intro
          room.totalTimeRemaining = 60;
          nextQuestion(room);
          setTimeout(() => {
            console.log('⏰ Bắt đầu game timer sau intro 5s cho phòng:', roomCode);
            startGameTimer(room);
          }, 5000);
        }, 3000);
        
        callback({ success: true });
      } catch (error) {
        console.error('Lỗi khi bắt đầu trò chơi:', error);
        callback({ success: false, error: 'Không thể bắt đầu trò chơi' });
      }
    });
    
    // Xử lý khi người chơi hoàn thành game cá nhân
    socket.on('finish_game', async (data, callback) => {
      try {
        const { roomCode, userId, score, completionTime, questionsAnswered, allAnswers } = data;
        
        // Kiểm tra phòng có tồn tại không
        if (!rooms.has(roomCode)) {
          return callback({ success: false, error: 'Phòng không tồn tại' });
        }
        
        const room = rooms.get(roomCode);
        
        // Tìm participant
        const participant = room.participants.find(p => p.id === userId);
        if (!participant) {
          return callback({ success: false, error: 'Người dùng không trong phòng' });
        }
        
        // ✅ Cập nhật kết quả từ client (client đã tự tính điểm)
        participant.score = score;
        participant.completionTime = completionTime;
        participant.questionsAnswered = questionsAnswered;
        participant.allAnswers = allAnswers || [];
        participant.finished = true;
        participant.resultSubmitted = true; // Đánh dấu đã nhận kết quả
        participant.submitTime = Date.now();
        
        console.log(`✅ ${participant.username} submitted result:`);
        console.log(`📊 Final score: ${score}`);
        console.log(`⏱️ Completion time: ${completionTime}s`);
        console.log(`📝 Questions answered: ${questionsAnswered}`);
        console.log(`🕐 Submit time: ${new Date(participant.submitTime).toLocaleTimeString()}`);
        
        // Thông báo cho tất cả người trong phòng
        io.to(roomCode).emit('player_finished', {
          userId,
          username: participant.username,
          score,
          completionTime,
          questionsAnswered
        });
        
        // Kiểm tra xem tất cả người chơi đã gửi kết quả chưa
        const allSubmitted = room.participants.every(p => p.resultSubmitted);
        const submittedCount = room.participants.filter(p => p.resultSubmitted).length;
        
        console.log(`📊 Results submitted: ${submittedCount}/${room.participants.length}`);
        
        if (allSubmitted) {
          console.log('🎯 Tất cả người chơi đã gửi kết quả! Hiển thị kết quả ngay...');
          
          // Clear timer và xử lý kết quả ngay
          if (roomTimers.has(roomCode)) {
            clearInterval(roomTimers.get(roomCode));
            roomTimers.delete(roomCode);
          }
          
          processFinalResults(room);
        } else {
          console.log(`⏳ Chờ ${room.participants.length - submittedCount} người còn lại gửi kết quả...`);
        }
        
        callback({ success: true });
      } catch (error) {
        console.error('Lỗi khi hoàn thành game:', error);
        callback({ success: false, error: 'Không thể hoàn thành game' });
      }
    });

    // ❌ Bỏ submit_answer handler - Client tự check answer local để tối ưu tốc độ
    // Client sẽ chỉ gửi kết quả cuối cùng qua finish_game event
    
    // Xử lý khi chủ phòng kết thúc phòng
    socket.on('end_room', async (data, callback) => {
      try {
        const { roomCode, userId } = data;
        
        // Kiểm tra phòng có tồn tại không
        if (!rooms.has(roomCode)) {
          return callback({ success: false, error: 'Phòng không tồn tại' });
        }
        
        const room = rooms.get(roomCode);
        
        // Kiểm tra người dùng có phải chủ phòng không
        if (room.createdBy !== userId) {
          return callback({ success: false, error: 'Chỉ chủ phòng mới có thể kết thúc phòng' });
        }
        
        // Thông báo cho tất cả người trong phòng
        io.to(roomCode).emit('room_ended', {
          message: 'Phòng đã được kết thúc bởi chủ phòng'
        });
        
        // Xóa phòng
        rooms.delete(roomCode);
        
        // Xóa session của tất cả người dùng trong phòng
        room.participants.forEach(p => {
          userSessions.delete(p.id);
        });
        
        callback({ success: true });
      } catch (error) {
        console.error('Lỗi khi kết thúc phòng:', error);
        callback({ success: false, error: 'Không thể kết thúc phòng' });
      }
    });
    
    // Xử lý khi chủ phòng kết thúc game
    socket.on('end_game', async (data, callback) => {
      try {
        const { roomCode, userId } = data;
        
        // Kiểm tra phòng có tồn tại không
        if (!rooms.has(roomCode)) {
          return callback({ success: false, error: 'Phòng không tồn tại' });
        }
        
        const room = rooms.get(roomCode);
        
        // Kiểm tra người dùng có phải chủ phòng không
        if (room.createdBy !== userId) {
          return callback({ success: false, error: 'Chỉ chủ phòng mới có thể kết thúc game' });
        }
        
        // Kết thúc game ngay lập tức
        endGame(room);
        
        callback({ success: true });
      } catch (error) {
        console.error('Lỗi khi kết thúc game:', error);
        callback({ success: false, error: 'Không thể kết thúc game' });
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
          
          // Đánh dấu người dùng đã ngắt kết nối nhưng KHÔNG xóa khỏi phòng
          participant.disconnected = true;
          participant.lastSeen = Date.now();
          
          // Cập nhật session
          if (userSessions.has(participant.id)) {
            const session = userSessions.get(participant.id);
            session.lastSeen = Date.now();
            session.disconnected = true;
          }
          
          // Thông báo cho tất cả người trong phòng
          io.to(roomCode).emit('participant_disconnected', {
            userId: participant.id,
            username: participant.username
          });
          
          // KHÔNG xóa phòng khi người dùng disconnect - giữ phòng để reconnect
          break;
        }
      }
    });
  });
  
  return io;
}

// Hàm chuyển sang câu hỏi tiếp theo
async function nextQuestion(room) {
  console.log('📋 nextQuestion called for room:', room.code);
  console.log('📋 Room participants:', room.participants.length);
  console.log('📋 Room questions:', room.questions.length);
  
  // Ghi nhớ thời gian bắt đầu câu hỏi
  room.startTime = Date.now();
  
  // Gửi thông báo cho tất cả người tham gia rằng có câu hỏi mới
  // Mỗi client sẽ tự lấy câu hỏi theo thứ tự riêng của mình
  console.log('📤 Gửi event new_question_start cho phòng:', room.code);
  console.log('📤 Data gửi:', {
    totalQuestions: room.questions.length,
    totalTimeLeft: room.totalTimeRemaining,
    hasQuestionData: !!room.questions
  });
  
  io.to(room.code).emit('new_question_start', {
    totalQuestions: room.questions.length,
    totalTimeLeft: room.totalTimeRemaining,
    questionData: room.questions // Gửi tất cả câu hỏi cho client
  });
}

// Bắt đầu timer tổng cho phòng với collection period 65 giây
function startGameTimer(room) {
  console.log('⏰ Bắt đầu game timer cho phòng:', room.code);
  console.log('📊 Participants:', room.participants.map(p => p.username));
  
  // Xóa timer cũ nếu có
  if (roomTimers.has(room.code)) {
    clearInterval(roomTimers.get(room.code));
  }
  
  room.gameStartTime = Date.now();
  room.collectionStartTime = Date.now();
  room.totalTimeRemaining = 60; // Game time for clients
  room.collectionTimeRemaining = 65; // Collection time for server
  room.gamePhase = 'playing'; // playing -> collecting -> finished
  
  // Initialize participant tracking
  room.participants.forEach(p => {
    p.finished = false;
    p.score = 0;
    p.completionTime = null;
    p.questionsAnswered = 0;
    p.resultSubmitted = false;
  });
  
  const timer = setInterval(() => {
    room.collectionTimeRemaining--;
    
    // Update game time (60s for clients)
    if (room.totalTimeRemaining > 0) {
      room.totalTimeRemaining--;
      
      // Gửi timer update cho clients
      io.to(room.code).emit('timer_update', {
        totalTimeLeft: room.totalTimeRemaining
      });
      
      // Log every 10s during game
      if (room.totalTimeRemaining % 10 === 0) {
        console.log(`⏰ Game timer: ${room.totalTimeRemaining}s left`);
      }
      
      // Game time finished - start collection phase
      if (room.totalTimeRemaining <= 0) {
        console.log('🎮 Game time finished! Starting result collection phase...');
        room.gamePhase = 'collecting';
        io.to(room.code).emit('game_time_finished');
      }
    }
    
    // Collection phase
    if (room.gamePhase === 'collecting') {
      const collectingTime = room.collectionTimeRemaining;
      console.log(`📊 Collection phase: ${collectingTime}s left, submitted: ${room.participants.filter(p => p.resultSubmitted).length}/${room.participants.length}`);
    }
    
    // Collection time finished - show results
    if (room.collectionTimeRemaining <= 0) {
      console.log('📋 Collection time finished! Processing final results...');
      clearInterval(timer);
      roomTimers.delete(room.code);
      
      // Process final results
      processFinalResults(room);
    }
  }, 1000);
  
  roomTimers.set(room.code, timer);
}

// Xử lý kết quả cuối cùng
function processFinalResults(room) {
  console.log('🏆 Processing final results for room:', room.code);
  
  // Log all participants status
  console.log('👥 Final participants status:');
  room.participants.forEach(p => {
    console.log(`   ${p.username}: submitted=${p.resultSubmitted}, score=${p.score}, time=${p.completionTime}, questions=${p.questionsAnswered}`);
  });
  
  // Tính toán ranking với tất cả participants
  const results = room.participants
    .map(p => ({
      userId: p.id,
      username: p.username,
      score: p.score || 0,
      completionTime: p.completionTime || 60,
      questionsAnswered: p.questionsAnswered || 0,
      submitted: p.resultSubmitted
    }))
    .sort((a, b) => {
      // Sắp xếp theo điểm số giảm dần, rồi theo thời gian tăng dần
      if (a.score !== b.score) {
        return b.score - a.score;
      }
      return a.completionTime - b.completionTime;
    })
    .map((result, index) => ({
      ...result,
      rank: index + 1
    }));
  
  console.log('🏆 Final ranking:', results);
  
  // Lưu kết quả vào DB cho từng người chơi
  (async () => {
    try {
      for (const participant of room.participants) {
        // Tránh lưu nhiều lần nếu đã lưu rồi
        if (participant.sessionSaved) continue;
        
        const sessionId = participant.sessionId;
        if (!sessionId) continue;
        
        const submittedAnswers = Array.isArray(participant.allAnswers) ? participant.allAnswers : [];
        const correctCount = submittedAnswers.filter(a => a && a.isCorrect).length;
        
        // Lưu từng câu trả lời được gửi từ client
        if (submittedAnswers.length > 0) {
          const saveOps = submittedAnswers.map(a => {
            const questionId = a.questionId;
            const userAnswer = a.userAnswer === undefined || a.userAnswer === null ? 'none' : String(a.userAnswer);
            const isCorrect = !!a.isCorrect;
            const answerTime = Number.isFinite(a.answerTime) ? a.answerTime : null;
            return saveUserAnswer(sessionId, questionId, userAnswer, isCorrect, answerTime);
          });
          await Promise.allSettled(saveOps);
        }
        
        // Nếu còn thiếu câu chưa trả lời, có thể lưu là không trả lời (tùy chọn)
        // const totalQuestions = Array.isArray(room.questions) ? room.questions.length : 0;
        // if (totalQuestions > submittedAnswers.length) {
        //   const answeredIds = new Set(submittedAnswers.map(a => a.questionId));
        //   const missingOps = room.questions
        //     .filter(q => !answeredIds.has(q.id))
        //     .map(q => saveUserAnswer(sessionId, q.id, null, false, 0));
        //   await Promise.allSettled(missingOps);
        // }
        
        // Kết thúc phiên chơi với điểm và số câu đúng
        await finishGameSession(sessionId, participant.score || 0, correctCount);
        participant.sessionSaved = true;
      }
      
      // Tăng bộ đếm trận đấu hôm nay
      if (typeof global.todayGames === 'number') {
        global.todayGames += 1;
      }
    } catch (err) {
      console.error('Lỗi khi lưu lịch sử phòng vào DB:', err);
    }
  })();
  
  // Lưu kết quả vào lịch sử phòng
  if (room.currentGame) {
    room.gameHistory.push({
      gameId: room.currentGame.id,
      startTime: room.currentGame.startTime,
      endTime: Date.now(),
      results: results,
      participants: room.participants.length
    });
  }
  
  // Cập nhật trạng thái phòng về waiting để có thể chơi tiếp
  room.status = 'waiting';
  room.currentGame = null;
  
  // Reset trạng thái người tham gia để chuẩn bị trận mới
  room.participants.forEach(p => {
    p.score = 0;
    p.finished = false;
    p.resultSubmitted = false;
    p.completionTime = null;
    p.questionsAnswered = 0;
    p.answers = [];
    p.currentQuestionIndex = -1;
  });
  
  // Cập nhật trạng thái phòng trong database
  updateRoomStatus(room.id, 'waiting').catch(console.error);
  
  // Gửi kết quả cuối cùng
  io.to(room.code).emit('game_results', { 
    results,
    canPlayAgain: true,
    message: 'Trận đấu kết thúc! Bạn có thể chơi tiếp hoặc quay về phòng chờ.'
  });
  
  // KHÔNG xóa phòng - giữ phòng để chơi tiếp
  console.log('✅ Phòng được giữ lại để chơi tiếp:', room.code);
}

// Lưu câu trả lời cho tất cả câu hỏi còn lại
async function saveRemainingAnswers(room) {
  for (const participant of room.participants) {
    if (!participant.disconnected) {
      // Lưu tất cả câu hỏi còn lại của participant này
      for (let i = participant.currentQuestionIndex + 1; i < room.questions.length; i++) {
        const questionIndex = participant.questionOrder[i];
        const question = room.questions[questionIndex];
        
        await saveUserAnswer(
          participant.sessionId,
          question.id,
          null, // Không có câu trả lời
          false,
          0 // Hết thời gian
        );
      }
    }
  }
}

// Hàm kết thúc trò chơi
async function endGame(room) {
  try {
    // Dừng timer
    if (roomTimers.has(room.code)) {
      clearInterval(roomTimers.get(room.code));
      roomTimers.delete(room.code);
    }
    
    // Cập nhật trạng thái phòng về waiting để có thể chơi tiếp
    room.status = 'waiting';
    room.currentGame = null;
    
    // Reset trạng thái người tham gia để chuẩn bị trận mới
    room.participants.forEach(p => {
      p.score = 0;
      p.finished = false;
      p.resultSubmitted = false;
      p.completionTime = null;
      p.questionsAnswered = 0;
      p.answers = [];
      p.currentQuestionIndex = -1;
    });
    
    // Cập nhật trạng thái phòng trong database
    await updateRoomStatus(room.id, 'waiting');
    
    // Gửi thông báo kết thúc game cho tất cả người tham gia
    io.to(room.code).emit('game_ended', {
      message: 'Trận đấu đã kết thúc! Bạn có thể chơi tiếp hoặc quay về phòng chờ.',
      canPlayAgain: true
    });
    
    // KHÔNG xóa phòng - giữ phòng để chơi tiếp
    console.log('✅ Phòng được giữ lại để chơi tiếp sau khi end game:', room.code);
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

// Helper function: Lấy câu hỏi từ API (giống solo battle)
async function fetchQuestionsFromAPI(count = 20) {
  try {
    console.log('🔍 Fetching questions from database, count:', count);
    // Sử dụng direct database call thay vì HTTP API để tránh vấn đề circular call
    const questions = await getRandomQuestions(count);
    console.log('📋 Questions fetched:', questions ? questions.length : 0);
    
    if (!questions || !Array.isArray(questions) || questions.length === 0) {
      console.log('❌ No questions found in database');
      throw new Error('Không có câu hỏi nào trong database');
    }
    
    console.log('✅ Questions ready:', questions.length);
    return questions;
  } catch (error) {
    console.error('❌ Lỗi khi lấy câu hỏi:', error);
    throw error;
  }
}

// Helper function: Shuffle array
function shuffleArray(array) {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export function getIO() {
  return io;
}
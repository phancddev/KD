import { getRandomTangTocQuestions } from '../views/tangTocKD/questions-parser.js';
import { findUserById } from '../db/users.js';
import { createGameSession, finishGameSession, saveUserAnswer } from '../db/game-sessions.js';

// In-memory storage for Tang Tốc rooms
const tangTocRooms = new Map(); // roomId -> roomState
const tangTocRoomCodeToId = new Map(); // roomCode -> roomId

function generateRoomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

function getTimeLimitByQuestionNumber(questionNumber) {
  const limits = { 1: 10, 2: 20, 3: 30, 4: 45 };
  return limits[Number(questionNumber)] || 10;
}

function buildResults(room) {
  const results = room.participants
    .map(p => ({
      userId: p.userId,
      username: (p.fullName && String(p.fullName).trim()) || p.username,
      score: p.score || 0,
      timeSpent: p.timeSpent || 0,
      totalQuestions: room.questions.length
    }))
    .sort((a, b) => {
      if (a.score !== b.score) return b.score - a.score;
      return a.timeSpent - b.timeSpent;
    });
  return results;
}

function normalizeText(t){
  return (t||'').toString().trim().toLowerCase();
}

function isAnswerCorrect(userAnswer, question){
  const u = normalizeText(userAnswer);
  if (u === normalizeText(question.answer)) return true;
  const acc = Array.isArray(question.acceptedAnswers) ? question.acceptedAnswers : [];
  for (const a of acc){
    const txt = typeof a === 'string' ? a : (a && a.answer ? a.answer : '');
    if (u === normalizeText(txt)) return true;
  }
  return false;
}

async function startQuestion(io, room, index) {
  if (!room || index >= room.questions.length) {
    // End battle
    const results = buildResults(room);
    io.to(room.code).emit('battleEnded', { results });
    room.status = 'waiting';
    clearTimeout(room.currentTimer);
    room.currentTimer = null;
    return;
  }

  room.currentQuestionIndex = index;
  const question = room.questions[index];
  const timeLimit = getTimeLimitByQuestionNumber(question.questionNumber);

  // Khởi tạo vùng lưu bài trả lời cuối cùng theo câu hỏi
  if (!room.submissions) room.submissions = {};
  room.submissions[index] = new Map(); // socketId -> { answer, isCorrect, timeMs }
  room.currentQuestionStart = Date.now();

  io.to(room.code).emit('questionStarted', {
    questionIndex: index,
    question: {
      id: question.id,
      text: question.text,
      answer: question.answer, // gửi cả đáp án như solo để client tự check nhanh
      acceptedAnswers: question.acceptedAnswers || [],
      imageUrl: question.imageUrl || null,
      timeLimit
    }
  });

  // Auto-advance after time limit
  clearTimeout(room.currentTimer);
  room.currentTimer = setTimeout(() => {
    // Tính điểm cho câu hỏi này theo luật tốc độ nộp
    try {
      const map = room.submissions && room.submissions[index] ? room.submissions[index] : new Map();
      // Lấy danh sách người trả lời đúng cùng thời gian nộp (ms)
      const correctList = [];
      for (const p of room.participants) {
        const rec = map.get(p.socketId);
        if (rec) {
          // Check đáp án với tất cả đáp án chính + phụ khi hết thời gian
          const isCorrect = isAnswerCorrect(rec.answer, question);
          // Cập nhật lại isCorrect trong record
          rec.isCorrect = isCorrect;
          if (isCorrect) {
            correctList.push({ socketId: p.socketId, userId: p.userId, timeMs: rec.timeMs });
          }
        }
      }
      correctList.sort((a,b)=>a.timeMs-b.timeMs);
      // Chấm điểm: 1st=40, 2nd=30, 3rd=20, 4th+=10
      const pointsForRank = (rank) => {
        if (rank === 1) return 40;
        if (rank === 2) return 30;
        if (rank === 3) return 20;
        return 10;
      };
      const awarded = new Set();
      correctList.forEach((item, idx) => {
        const rank = idx + 1;
        const pts = pointsForRank(rank);
        const participant = room.participants.find(p=>p.socketId===item.socketId);
        if (participant) {
          participant.score = (participant.score||0) + pts;
          participant.timeSpent = (participant.timeSpent||0) + Math.floor(item.timeMs/1000);
          awarded.add(participant.socketId);
        }
      });
      // Cộng thời gian cho người không có bài/hoặc sai: coi như hết giờ
      for (const p of room.participants) {
        if (!awarded.has(p.socketId)) {
          const rec = map.get(p.socketId);
          const spent = rec ? Math.floor(rec.timeMs/1000) : timeLimit;
          p.timeSpent = (p.timeSpent||0) + Math.min(timeLimit, spent);
        }
      }
      // Gửi cập nhật xếp hạng sau khi chấm điểm câu
      const ranking = room.participants
        .map(p=>({ userId: p.userId, username: (p.fullName&&String(p.fullName).trim())||p.username, score: p.score||0, timeSpent: p.timeSpent||0 }))
        .sort((a,b)=> (b.score-a.score) || (a.timeSpent-b.timeSpent));
      io.to(room.code).emit('rankingUpdate', { questionIndex: index, ranking });
      // Lưu câu trả lời vào DB cho tất cả thí sinh
      for (const p of room.participants) {
        const rec = map.get(p.socketId);
        if (rec && p.sessionId) {
          try {
            saveUserAnswer(
              p.sessionId,
              question.id,
              String(rec.answer ?? ''),
              !!(rec && rec.isCorrect),
              Math.max(0, rec.timeMs || 0)
            ).catch(() => {});
          } catch {}
        }
      }

      // Gửi kết quả cá nhân để client play sound đúng/sai (đồng bộ tất cả thí sinh)
      for (const p of room.participants) {
        const rec = map.get(p.socketId);
        const isCorrect = !!(rec && rec.isCorrect);
        const userAnswer = rec ? rec.answer : '';
        io.to(p.socketId).emit('questionResult', { 
          questionIndex: index, 
          isCorrect, 
          userAnswer,
          correctAnswer: question.answer,
          acceptedAnswers: question.acceptedAnswers || []
        });
      }
    } catch {}
    io.to(room.code).emit('questionEnded', { questionIndex: index });
    startQuestion(io, room, index + 1);
  }, timeLimit * 1000);
}

export function initTangTocSocket(io) {
  io.on('connection', (socket) => {
    // Create a new Tang Tốc room
    socket.on('createRoom', async (data = {}) => {
      try {
        const roomId = Date.now().toString();
        const code = generateRoomCode();
        const name = data.name || `Phòng Tăng Tốc ${code}`;
        const rawUserId = data.userId || socket.id;
        let dbUser = null;
        try { if (Number.isFinite(Number(rawUserId))) dbUser = await findUserById(Number(rawUserId)); } catch {}
        const username = (dbUser && dbUser.username) || data.username || `User-${socket.id.substring(0, 4)}`;
        const fullName = (dbUser && dbUser.full_name && String(dbUser.full_name).trim()) || (data.fullName && String(data.fullName).trim()) || username;
        const userId = (dbUser && dbUser.id) || rawUserId;
        const avatar = (dbUser && dbUser.avatar) || null;

        const roomState = {
          id: roomId,
          code,
          name,
          hostId: socket.id,
          status: 'waiting',
          participants: [{ socketId: socket.id, userId, username, fullName, avatar, score: 0, timeSpent: 0 }],
          questions: [],
          currentQuestionIndex: -1,
          currentTimer: null
        };

        tangTocRooms.set(roomId, roomState);
        tangTocRoomCodeToId.set(code, roomId);

        socket.join(code);
        socket.emit('roomJoined', { roomId, roomCode: code, roomName: name, isHost: true });
        // Inform host about current participants list (including self)
        io.to(roomState.code).emit('participantList', roomState.participants.map(p => ({
          id: p.userId,
          username: p.username,
          fullName: (p.fullName && String(p.fullName).trim()) || p.username,
          isHost: roomState.hostId === p.socketId
        })));
      } catch (e) {
        socket.emit('error', { message: 'Không thể tạo phòng Tăng Tốc' });
      }
    });

    // Join existing room by code
    socket.on('joinRoom', async ({ roomCode, username, userId, fullName } = {}) => {
      try {
        if (!roomCode || !tangTocRoomCodeToId.has(roomCode)) {
          return socket.emit('error', { message: 'Phòng không tồn tại' });
        }
        const roomId = tangTocRoomCodeToId.get(roomCode);
        const room = tangTocRooms.get(roomId);
        if (!room) return socket.emit('error', { message: 'Phòng không tồn tại' });

        const rawUserId = userId || socket.id;
        let dbUser = null;
        try { if (Number.isFinite(Number(rawUserId))) dbUser = await findUserById(Number(rawUserId)); } catch {}
        const displayName = (dbUser && dbUser.username) || username || `User-${socket.id.substring(0, 4)}`;
        const displayFullName = (dbUser && dbUser.full_name && String(dbUser.full_name).trim()) || (fullName && String(fullName).trim()) || displayName;
        const uid = (dbUser && dbUser.id) || rawUserId;
        const displayAvatar = (dbUser && dbUser.avatar) || null;
        if (!room.participants.find(p => p.socketId === socket.id)) {
          room.participants.push({ socketId: socket.id, userId: uid, username: displayName, fullName: displayFullName, avatar: displayAvatar, score: 0, timeSpent: 0 });
        }

        socket.join(room.code);
        socket.emit('roomJoined', { roomId: room.id, roomCode: room.code, roomName: room.name, isHost: room.hostId === socket.id });
        // Notify everyone a participant joined and also send refreshed list to host/clients
        io.to(room.code).emit('participantJoined', { userId: uid, fullName: displayFullName });
        io.to(room.code).emit('participantList', room.participants.map(p => ({
          id: p.userId,
          username: p.username,
          fullName: (p.fullName && String(p.fullName).trim()) || p.username,
          isHost: room.hostId === p.socketId
        })));
      } catch (e) {
        socket.emit('error', { message: 'Không thể tham gia phòng' });
      }
    });

    // Host starts the battle: server fetches questions using solo logic
    socket.on('startBattle', async ({ roomId } = {}) => {
      try {
        const room = tangTocRooms.get(roomId);
        if (!room) return socket.emit('error', { message: 'Phòng không tồn tại' });
        if (room.hostId !== socket.id) return socket.emit('error', { message: 'Chỉ chủ phòng mới được bắt đầu' });

        // Reset scores and game state for new battle
        room.participants.forEach(p => {
          p.score = 0;
          p.timeSpent = 0;
          p.sessionId = null;
        });
        room.currentQuestionIndex = -1;
        room.submissions = {};
        room.status = 'starting';

        const questions = await getRandomTangTocQuestions();
        // Normalize times like solo (1:10,2:20,3:30,4:45)
        room.questions = (questions || []).map(q => ({
          ...q,
          timeLimit: getTimeLimitByQuestionNumber(q.questionNumber)
        }));

        // Send questions immediately so clients can prepare, then start after 5s
        io.to(room.code).emit('battleStarted', { questions: room.questions });

        setTimeout(() => {
          room.status = 'playing';
          // Tạo session DB cho từng người chơi
          (async () => {
            for (const p of room.participants) {
              if (!p.sessionId) {
                try {
                  // room.id ở đây là in-memory, không tồn tại trong DB -> để null để tránh lỗi FK
                  const session = await createGameSession(p.userId, null, false, room.questions.length, 'tangtoc');
                  p.sessionId = session.id;
                } catch {}
              }
            }
          })();
          startQuestion(io, room, 0);
        }, 5000);
      } catch (e) {
        socket.emit('error', { message: 'Không thể bắt đầu trận đấu' });
      }
    });

    // Client submits answer result per question (chỉ là preview)
    socket.on('submitAnswer', ({ roomId, questionIndex, answer, timeLeft } = {}) => {
      const room = tangTocRooms.get(roomId);
      if (!room) return;
      const participant = room.participants.find(p => p.socketId === socket.id);
      if (!participant) return;

      const q = room.questions[questionIndex];
      if (!q || room.currentQuestionIndex !== questionIndex) return;
      
      // Tính thời gian nộp theo ms từ lúc bắt đầu câu hỏi
      const now = Date.now();
      const timeMs = Math.max(0, now - (room.currentQuestionStart || now));
      
      // Chỉ lưu đáp án, chưa check đúng/sai (sẽ check khi hết thời gian)
      if (!room.submissions) room.submissions = {};
      if (!room.submissions[questionIndex]) room.submissions[questionIndex] = new Map();
      // luôn ghi đè bằng lần nộp mới nhất
      room.submissions[questionIndex].set(socket.id, { answer, timeMs });

      // Notify others for UI update
      io.to(room.code).emit('participantAnswer', {
        userId: participant.userId,
        username: participant.username,
        questionIndex,
        hasAnswered: true
      });
    });

    // Host ends room
    socket.on('endRoom', ({ roomId } = {}) => {
      const room = tangTocRooms.get(roomId);
      if (!room) return;
      if (room.hostId !== socket.id) return;

      clearTimeout(room.currentTimer);
      io.to(room.code).emit('battleEnded', { results: buildResults(room) });
      io.to(room.code).emit('room_ended', { message: 'Phòng đã được kết thúc' });
      tangTocRoomCodeToId.delete(room.code);
      tangTocRooms.delete(roomId);
    });

    // Host ends current battle but keep room
    socket.on('endGame', ({ roomId } = {}) => {
      const room = tangTocRooms.get(roomId);
      if (!room) return;
      if (room.hostId !== socket.id) return;
      clearTimeout(room.currentTimer);
      const results = buildResults(room);
      io.to(room.code).emit('battleEnded', { results });
      // Kết thúc sessions
      (async () => {
        for (const p of room.participants) {
          if (p.sessionId) {
            try { await finishGameSession(p.sessionId, p.score || 0, p.score || 0); } catch {}
          }
        }
      })();
      room.status = 'waiting';
      room.questions = [];
      room.currentQuestionIndex = -1;
    });

    // Cleanup on disconnect
    socket.on('disconnect', () => {
      for (const room of tangTocRooms.values()) {
        const idx = room.participants.findIndex(p => p.socketId === socket.id);
        if (idx !== -1) {
          const [p] = room.participants.splice(idx, 1);
          io.to(room.code).emit('participantLeft', { userId: p.userId, username: p.username });
        }
      }
    });
  });
}

export function getTangTocParticipants(roomId) {
  const room = tangTocRooms.get(roomId);
  if (!room) return [];
  return room.participants.map(p => ({
    id: p.userId,
    username: p.username,
    fullName: (p.fullName && String(p.fullName).trim()) || p.username,
    avatar: p.avatar || null,
    isHost: room.hostId === p.socketId
  }));
}



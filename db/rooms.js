import { pool } from './index.js';

// Tạo mã phòng ngẫu nhiên
function generateRoomCode() {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return code;
}

// Tạo phòng mới
async function createRoom(name, createdBy) {
  try {
    // Tạo mã phòng ngẫu nhiên và đảm bảo không trùng
    let roomCode;
    let isUnique = false;
    
    while (!isUnique) {
      roomCode = generateRoomCode();
      const [existingRooms] = await pool.query('SELECT id FROM rooms WHERE code = ?', [roomCode]);
      isUnique = existingRooms.length === 0;
    }
    
    const [result] = await pool.query(
      'INSERT INTO rooms (code, name, created_by) VALUES (?, ?, ?)',
      [roomCode, name, createdBy]
    );
    
    // Tự động thêm người tạo vào phòng
    await pool.query(
      'INSERT INTO room_participants (room_id, user_id) VALUES (?, ?)',
      [result.insertId, createdBy]
    );
    
    return {
      id: result.insertId,
      code: roomCode,
      name,
      createdBy,
      status: 'waiting',
      participants: 1
    };
  } catch (error) {
    console.error('Lỗi khi tạo phòng mới:', error);
    throw error;
  }
}

// Tìm phòng theo mã
async function findRoomByCode(code) {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM rooms WHERE code = ?',
      [code]
    );
    
    if (rows.length === 0) return null;
    
    const room = rows[0];
    
    // Lấy số lượng người tham gia
    const [participantsResult] = await pool.query(
      'SELECT COUNT(*) as count FROM room_participants WHERE room_id = ?',
      [room.id]
    );
    
    const participants = participantsResult[0].count;
    
    return {
      id: room.id,
      code: room.code,
      name: room.name,
      createdBy: room.created_by,
      status: room.status,
      createdAt: room.created_at,
      finishedAt: room.finished_at,
      participants
    };
  } catch (error) {
    console.error('Lỗi khi tìm phòng:', error);
    throw error;
  }
}

// Tham gia phòng
async function joinRoom(roomId, userId) {
  try {
    // Kiểm tra phòng có tồn tại và đang ở trạng thái chờ
    const [roomResult] = await pool.query(
      'SELECT * FROM rooms WHERE id = ? AND status = "waiting"',
      [roomId]
    );
    
    if (roomResult.length === 0) {
      throw new Error('Phòng không tồn tại hoặc đã bắt đầu');
    }
    
    // Kiểm tra người dùng đã tham gia phòng chưa
    const [participantResult] = await pool.query(
      'SELECT * FROM room_participants WHERE room_id = ? AND user_id = ?',
      [roomId, userId]
    );
    
    if (participantResult.length > 0) {
      return { alreadyJoined: true };
    }
    
    // Thêm người dùng vào phòng
    await pool.query(
      'INSERT INTO room_participants (room_id, user_id) VALUES (?, ?)',
      [roomId, userId]
    );
    
    return { success: true };
  } catch (error) {
    console.error('Lỗi khi tham gia phòng:', error);
    throw error;
  }
}

// Lấy danh sách người tham gia phòng
async function getRoomParticipants(roomId) {
  try {
    const [rows] = await pool.query(
      `SELECT rp.*, u.username, u.full_name 
       FROM room_participants rp
       JOIN users u ON rp.user_id = u.id
       WHERE rp.room_id = ?`,
      [roomId]
    );
    
    return rows.map(row => ({
      id: row.id,
      userId: row.user_id,
      username: row.username,
      fullName: row.full_name,
      score: row.score,
      joinedAt: row.joined_at
    }));
  } catch (error) {
    console.error('Lỗi khi lấy danh sách người tham gia:', error);
    throw error;
  }
}

// Cập nhật trạng thái phòng
async function updateRoomStatus(roomId, status) {
  try {
    let query = 'UPDATE rooms SET status = ?';
    const params = [status];
    
    if (status === 'finished') {
      query += ', finished_at = CURRENT_TIMESTAMP';
    }
    
    query += ' WHERE id = ?';
    params.push(roomId);
    
    await pool.query(query, params);
    
    return { success: true };
  } catch (error) {
    console.error('Lỗi khi cập nhật trạng thái phòng:', error);
    throw error;
  }
}

// Cập nhật điểm số người tham gia
async function updateParticipantScore(roomId, userId, score) {
  try {
    await pool.query(
      'UPDATE room_participants SET score = ? WHERE room_id = ? AND user_id = ?',
      [score, roomId, userId]
    );
    
    return { success: true };
  } catch (error) {
    console.error('Lỗi khi cập nhật điểm số:', error);
    throw error;
  }
}

// Lấy kết quả phòng
async function getRoomResults(roomId) {
  try {
    const [rows] = await pool.query(
      `SELECT rp.*, u.username, u.full_name 
       FROM room_participants rp
       JOIN users u ON rp.user_id = u.id
       WHERE rp.room_id = ?
       ORDER BY rp.score DESC`,
      [roomId]
    );
    
    return rows.map((row, index) => ({
      rank: index + 1,
      userId: row.user_id,
      username: row.username,
      fullName: row.full_name,
      score: row.score
    }));
  } catch (error) {
    console.error('Lỗi khi lấy kết quả phòng:', error);
    throw error;
  }
}

export {
  createRoom,
  findRoomByCode,
  joinRoom,
  getRoomParticipants,
  updateRoomStatus,
  updateParticipantScore,
  getRoomResults
};
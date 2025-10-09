/**
 * Match Reader for KD Server
 * Đọc match.json từ Data Nodes qua Socket.IO
 */

import { getDataNodeSocket } from './socket/data-node-server.js';
import { emitWithTimeout } from './socket/socket-helpers.js';

/**
 * Tạo trận đấu mới trên Data Node
 * SỬ DỤNG TIMEOUT để tránh hang forever
 */
export async function createMatchOnDataNode(dataNodeId, matchData) {
  const socket = getDataNodeSocket(dataNodeId);

  if (!socket) {
    throw new Error(`Data Node ${dataNodeId} không kết nối`);
  }

  console.log(`📤 [CREATE_MATCH] Sending to node ${dataNodeId} with 30s timeout...`);
  const response = await emitWithTimeout(socket, 'create_match', matchData, 30000);
  console.log(`✅ [CREATE_MATCH] Response received from node ${dataNodeId}`);

  return response.data;
}

/**
 * Đọc match.json từ Data Node
 * SỬ DỤNG TIMEOUT để tránh hang forever
 */
export async function getMatchFromDataNode(dataNodeId, matchId) {
  const socket = getDataNodeSocket(dataNodeId);

  if (!socket) {
    throw new Error(`Data Node ${dataNodeId} không kết nối`);
  }

  console.log(`📤 [GET_MATCH] Sending to node ${dataNodeId} with 15s timeout...`);
  const response = await emitWithTimeout(socket, 'get_match', { matchId }, 15000);
  console.log(`✅ [GET_MATCH] Response received from node ${dataNodeId}`);

  return response.data;
}

/**
 * Thêm câu hỏi vào match.json trên Data Node
 * SỬ DỤNG TIMEOUT
 */
export async function addQuestionToDataNode(dataNodeId, matchId, questionData) {
  const socket = getDataNodeSocket(dataNodeId);

  if (!socket) {
    throw new Error(`Data Node ${dataNodeId} không kết nối`);
  }

  console.log(`📤 [ADD_QUESTION] Sending to node ${dataNodeId} with 20s timeout...`);
  const response = await emitWithTimeout(socket, 'add_question', { matchId, ...questionData }, 20000);
  console.log(`✅ [ADD_QUESTION] Response received from node ${dataNodeId}`);

  return response.data;
}

/**
 * Cập nhật câu hỏi trong match.json trên Data Node
 * SỬ DỤNG TIMEOUT
 */
export async function updateQuestionInDataNode(dataNodeId, matchId, updateData) {
  const socket = getDataNodeSocket(dataNodeId);

  if (!socket) {
    throw new Error(`Data Node ${dataNodeId} không kết nối`);
  }

  console.log(`📤 [UPDATE_QUESTION] Sending to node ${dataNodeId} with 20s timeout...`);
  const response = await emitWithTimeout(socket, 'update_question', { matchId, ...updateData }, 20000);
  console.log(`✅ [UPDATE_QUESTION] Response received from node ${dataNodeId}`);

  return response.data;
}

/**
 * Xóa câu hỏi từ match.json trên Data Node
 * SỬ DỤNG TIMEOUT
 */
export async function deleteQuestionFromDataNode(dataNodeId, matchId, section, playerIndex, order) {
  const socket = getDataNodeSocket(dataNodeId);

  if (!socket) {
    throw new Error(`Data Node ${dataNodeId} không kết nối`);
  }

  console.log(`📤 [DELETE_QUESTION] Sending to node ${dataNodeId} with 15s timeout...`);
  await emitWithTimeout(socket, 'delete_question', { matchId, section, playerIndex, order }, 15000);
  console.log(`✅ [DELETE_QUESTION] Response received from node ${dataNodeId}`);

  return true;
}

/**
 * Gán câu hỏi cho thí sinh khác
 * SỬ DỤNG TIMEOUT
 */
export async function assignPlayerToQuestion(dataNodeId, matchId, section, currentPlayerIndex, questionOrder, newPlayerIndex) {
  const socket = getDataNodeSocket(dataNodeId);

  if (!socket) {
    throw new Error(`Data Node ${dataNodeId} không kết nối`);
  }

  console.log(`📤 [ASSIGN_PLAYER] Sending to node ${dataNodeId} with 15s timeout...`);
  const response = await emitWithTimeout(socket, 'assign_player', {
    matchId,
    section,
    currentPlayerIndex,
    questionOrder,
    newPlayerIndex
  }, 15000);
  console.log(`✅ [ASSIGN_PLAYER] Response received from node ${dataNodeId}`);

  return response.data;
}

/**
 * Xóa trận đấu từ Data Node
 * SỬ DỤNG TIMEOUT
 */
export async function deleteMatchFromDataNode(dataNodeId, matchId) {
  const socket = getDataNodeSocket(dataNodeId);

  if (!socket) {
    throw new Error(`Data Node ${dataNodeId} không kết nối`);
  }

  console.log(`📤 [DELETE_MATCH] Sending to node ${dataNodeId} with 20s timeout...`);
  await emitWithTimeout(socket, 'delete_match', { matchId }, 20000);
  console.log(`✅ [DELETE_MATCH] Response received from node ${dataNodeId}`);

  return true;
}

/**
 * Lấy danh sách tất cả trận đấu từ Data Node
 */
export async function getAllMatchesFromDataNode(dataNodeId) {
  return new Promise((resolve, reject) => {
    const socket = getDataNodeSocket(dataNodeId);
    
    if (!socket) {
      return reject(new Error(`Data Node ${dataNodeId} không kết nối`));
    }
    
    socket.emit('get_all_matches', {}, (response) => {
      if (response.success) {
        resolve(response.data);
      } else {
        reject(new Error(response.error || 'Không thể lấy danh sách trận đấu'));
      }
    });
  });
}

/**
 * Cập nhật trạng thái trận đấu
 */
export async function updateMatchStatusOnDataNode(dataNodeId, matchId, status) {
  return new Promise((resolve, reject) => {
    const socket = getDataNodeSocket(dataNodeId);
    
    if (!socket) {
      return reject(new Error(`Data Node ${dataNodeId} không kết nối`));
    }
    
    socket.emit('update_match_status', { matchId, status }, (response) => {
      if (response.success) {
        resolve(true);
      } else {
        reject(new Error(response.error || 'Không thể cập nhật trạng thái'));
      }
    });
  });
}

/**
 * Lấy tất cả trận đấu từ tất cả Data Nodes
 */
export async function getAllMatchesFromAllDataNodes() {
  const { getDataNodes } = await import('./db/data-nodes.js');
  const dataNodes = await getDataNodes();
  
  const allMatches = [];
  
  for (const node of dataNodes) {
    if (node.status === 'online') {
      try {
        const matches = await getAllMatchesFromDataNode(node.id);
        
        // Thêm thông tin data node vào mỗi match
        const matchesWithNode = matches.map(match => ({
          ...match,
          data_node_id: node.id,
          data_node_name: node.name
        }));
        
        allMatches.push(...matchesWithNode);
      } catch (error) {
        console.error(`❌ Lỗi khi lấy matches từ Data Node ${node.id}:`, error.message);
      }
    }
  }
  
  return allMatches;
}

/**
 * Tìm trận đấu theo ID từ tất cả Data Nodes
 */
export async function findMatchById(matchId) {
  const { getDataNodes } = await import('./db/data-nodes.js');
  const dataNodes = await getDataNodes();
  
  for (const node of dataNodes) {
    if (node.status === 'online') {
      try {
        const match = await getMatchFromDataNode(node.id, matchId);
        return {
          match,
          dataNodeId: node.id,
          dataNodeName: node.name
        };
      } catch (error) {
        // Trận đấu không có trên node này, thử node khác
        continue;
      }
    }
  }
  
  throw new Error(`Không tìm thấy trận đấu ${matchId} trên bất kỳ Data Node nào`);
}


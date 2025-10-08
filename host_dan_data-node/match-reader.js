/**
 * Match Reader for KD Server
 * Đọc match.json từ Data Nodes qua Socket.IO
 */

import { getDataNodeSocket } from './socket/data-node-server.js';

/**
 * Tạo trận đấu mới trên Data Node
 */
export async function createMatchOnDataNode(dataNodeId, matchData) {
  return new Promise((resolve, reject) => {
    const socket = getDataNodeSocket(dataNodeId);
    
    if (!socket) {
      return reject(new Error(`Data Node ${dataNodeId} không kết nối`));
    }
    
    socket.emit('create_match', matchData, (response) => {
      if (response.success) {
        resolve(response.data);
      } else {
        reject(new Error(response.error || 'Không thể tạo trận đấu'));
      }
    });
  });
}

/**
 * Đọc match.json từ Data Node
 */
export async function getMatchFromDataNode(dataNodeId, matchId) {
  return new Promise((resolve, reject) => {
    const socket = getDataNodeSocket(dataNodeId);
    
    if (!socket) {
      return reject(new Error(`Data Node ${dataNodeId} không kết nối`));
    }
    
    socket.emit('get_match', { matchId }, (response) => {
      if (response.success) {
        resolve(response.data);
      } else {
        reject(new Error(response.error || 'Không thể đọc trận đấu'));
      }
    });
  });
}

/**
 * Thêm câu hỏi vào match.json trên Data Node
 */
export async function addQuestionToDataNode(dataNodeId, matchId, questionData) {
  return new Promise((resolve, reject) => {
    const socket = getDataNodeSocket(dataNodeId);
    
    if (!socket) {
      return reject(new Error(`Data Node ${dataNodeId} không kết nối`));
    }
    
    socket.emit('add_question', { matchId, ...questionData }, (response) => {
      if (response.success) {
        resolve(response.data);
      } else {
        reject(new Error(response.error || 'Không thể thêm câu hỏi'));
      }
    });
  });
}

/**
 * Xóa câu hỏi từ match.json trên Data Node
 */
export async function deleteQuestionFromDataNode(dataNodeId, matchId, section, playerIndex, order) {
  return new Promise((resolve, reject) => {
    const socket = getDataNodeSocket(dataNodeId);
    
    if (!socket) {
      return reject(new Error(`Data Node ${dataNodeId} không kết nối`));
    }
    
    socket.emit('delete_question', { matchId, section, playerIndex, order }, (response) => {
      if (response.success) {
        resolve(true);
      } else {
        reject(new Error(response.error || 'Không thể xóa câu hỏi'));
      }
    });
  });
}

/**
 * Xóa trận đấu từ Data Node
 */
export async function deleteMatchFromDataNode(dataNodeId, matchId) {
  return new Promise((resolve, reject) => {
    const socket = getDataNodeSocket(dataNodeId);
    
    if (!socket) {
      return reject(new Error(`Data Node ${dataNodeId} không kết nối`));
    }
    
    socket.emit('delete_match', { matchId }, (response) => {
      if (response.success) {
        resolve(true);
      } else {
        reject(new Error(response.error || 'Không thể xóa trận đấu'));
      }
    });
  });
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


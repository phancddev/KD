/**
 * Socket.IO Server để quản lý kết nối với Data Nodes
 */

import { Server } from 'socket.io';
import {
  getDataNodeByPort,
  updateDataNodeStatus,
  updateDataNodeStorage
} from '../db/data-nodes.js';
import { emitWithTimeout } from './socket-helpers.js';

// Lưu trữ các kết nối data node
const dataNodeConnections = new Map();

// Lưu trữ timestamp của lần cập nhật status gần nhất
// Key: nodeId, Value: { status: 'online'|'offline', timestamp: Date }
const nodeStatusTimestamps = new Map();

/**
 * Khởi tạo Data Node Socket Server
 */
export function initDataNodeSocket(httpServer) {
  // Tạo namespace riêng cho data nodes
  const dataNodeIO = new Server(httpServer, {
    path: '/data-node-socket',
    cors: {
      origin: '*',
      methods: ['GET', 'POST']
    }
  });

  dataNodeIO.on('connection', async (socket) => {
    console.log('🔌 Data node đang kết nối:', socket.id);

    // Xử lý đăng ký data node
    socket.on('register', async (data, callback) => {
      try {
        const { port, name } = data;
        
        console.log(`📝 Data node đăng ký: ${name} (port: ${port})`);
        
        // Kiểm tra data node có tồn tại không
        const dataNode = await getDataNodeByPort(port);
        
        if (!dataNode) {
          callback({
            success: false,
            error: 'Data node không tồn tại trong hệ thống. Vui lòng thêm port này trong admin panel trước.'
          });
          return;
        }
        
        // Disconnect socket cũ nếu có (tránh duplicate registration)
        const existingConnection = dataNodeConnections.get(dataNode.id);
        if (existingConnection && existingConnection.socket) {
          console.log(`⚠️  Node ${dataNode.id} đã có connection cũ, disconnect socket cũ...`);
          existingConnection.socket.disconnect();
        }

        // Lưu thông tin kết nối
        dataNodeConnections.set(dataNode.id, {
          socketId: socket.id,
          socket: socket,
          nodeId: dataNode.id,
          port: port,
          name: name,
          connectedAt: new Date()
        });

        // Cập nhật trạng thái online VÀ timestamp
        await updateDataNodeStatus(dataNode.id, 'online');
        nodeStatusTimestamps.set(dataNode.id, {
          status: 'online',
          timestamp: Date.now()
        });
        
        // Lưu nodeId vào socket để dùng sau
        socket.nodeId = dataNode.id;
        
        console.log(`✅ Data node ${name} (ID: ${dataNode.id}) đã kết nối thành công`);
        
        callback({
          success: true,
          nodeId: dataNode.id,
          message: 'Kết nối thành công'
        });
        
        // Broadcast cho admin biết có node mới online
        socket.broadcast.emit('node_online', {
          nodeId: dataNode.id,
          name: name,
          port: port
        });
        
      } catch (error) {
        console.error('❌ Lỗi khi đăng ký data node:', error);
        callback({
          success: false,
          error: error.message
        });
      }
    });

    // Xử lý cập nhật storage info
    socket.on('storage_update', async (data) => {
      try {
        const { storageUsed, storageTotal } = data;
        
        if (socket.nodeId) {
          await updateDataNodeStorage(socket.nodeId, storageUsed, storageTotal);
          console.log(`💾 Cập nhật storage cho node ${socket.nodeId}: ${storageUsed}/${storageTotal} bytes`);
        }
      } catch (error) {
        console.error('❌ Lỗi khi cập nhật storage:', error);
      }
    });

    // Xử lý heartbeat
    socket.on('heartbeat', async (callback) => {
      try {
        if (socket.nodeId) {
          await updateDataNodeStatus(socket.nodeId, 'online');
          callback({ success: true, timestamp: new Date() });
        }
      } catch (error) {
        console.error('❌ Lỗi heartbeat:', error);
      }
    });

    // Xử lý ngắt kết nối
    socket.on('disconnect', async () => {
      try {
        if (socket.nodeId) {
          console.log(`🔌 Data node ${socket.nodeId} ngắt kết nối`);

          // Cập nhật trạng thái offline VÀ timestamp
          await updateDataNodeStatus(socket.nodeId, 'offline');
          nodeStatusTimestamps.set(socket.nodeId, {
            status: 'offline',
            timestamp: Date.now()
          });

          // Xóa khỏi danh sách kết nối
          dataNodeConnections.delete(socket.nodeId);
          
          // Broadcast cho admin biết node offline
          socket.broadcast.emit('node_offline', {
            nodeId: socket.nodeId
          });
        }
      } catch (error) {
        console.error('❌ Lỗi khi xử lý disconnect:', error);
      }
    });

    // Xử lý lỗi
    socket.on('error', (error) => {
      console.error('❌ Socket error:', error);
    });
  });

  console.log('🚀 Data Node Socket Server đã khởi động tại /data-node-socket');
  
  return dataNodeIO;
}

/**
 * Lấy socket của data node theo ID
 */
export function getDataNodeSocket(nodeId) {
  const connection = dataNodeConnections.get(nodeId);
  return connection ? connection.socket : null;
}

/**
 * Lấy tất cả data nodes đang kết nối
 */
export function getConnectedDataNodes() {
  return Array.from(dataNodeConnections.values()).map(conn => ({
    nodeId: conn.nodeId,
    port: conn.port,
    name: conn.name,
    connectedAt: conn.connectedAt
  }));
}

/**
 * Kiểm tra data node có đang online không
 */
export function isDataNodeOnline(nodeId) {
  return dataNodeConnections.has(nodeId);
}

/**
 * Gửi file tới data node
 * SỬ DỤNG emitWithTimeout để tránh memory leak và hang forever
 */
export async function sendFileToDataNode(nodeId, fileData) {
  const socket = getDataNodeSocket(nodeId);

  if (!socket) {
    throw new Error('Data node không online');
  }

  console.log(`📤 [UPLOAD_FILE] Sending to node ${nodeId} with 60s timeout...`);
  const response = await emitWithTimeout(socket, 'upload_file', fileData, 60000);
  console.log(`✅ [UPLOAD_FILE] Response received from node ${nodeId}`);

  return response;
}

/**
 * Upload file lên data node (wrapper function)
 * @param {number} nodeId - ID của data node
 * @param {Buffer} fileBuffer - Buffer của file
 * @param {string} fileName - Tên file
 * @param {string} mimeType - MIME type của file
 * @param {string} folder - Thư mục lưu trữ (optional)
 */
export async function uploadFileToDataNode(nodeId, fileBuffer, fileName, mimeType, folder = '') {
  const fileData = {
    fileName: fileName,
    fileBuffer: fileBuffer.toString('base64'), // Convert buffer to base64
    mimeType: mimeType,
    folder: folder
  };

  const result = await sendFileToDataNode(nodeId, fileData);

  return {
    success: true,
    storagePath: result.storagePath,
    streamUrl: result.streamUrl,
    fileName: fileName,
    fileSize: fileBuffer.length
  };
}

/**
 * Tạo folder trên data node
 * SỬ DỤNG emitWithTimeout
 */
export async function createFolderOnDataNode(nodeId, folderName) {
  const socket = getDataNodeSocket(nodeId);

  if (!socket) {
    throw new Error('Data node không online');
  }

  console.log(`📤 [CREATE_FOLDER] Sending to node ${nodeId} with 10s timeout...`);
  const response = await emitWithTimeout(socket, 'create_folder', { folderName }, 10000);
  console.log(`✅ [CREATE_FOLDER] Response received from node ${nodeId}`);

  return response;
}

/**
 * Xóa file từ data node
 * SỬ DỤNG emitWithTimeout
 */
export async function deleteFileFromDataNode(nodeId, filePath) {
  const socket = getDataNodeSocket(nodeId);

  if (!socket) {
    throw new Error('Data node không online');
  }

  console.log(`📤 [DELETE_FILE] Sending to node ${nodeId} with 15s timeout...`);
  await emitWithTimeout(socket, 'delete_file', { filePath }, 15000);
  console.log(`✅ [DELETE_FILE] Response received from node ${nodeId}`);

  return true;
}

/**
 * Lấy thông tin storage từ data node
 */
export async function getStorageInfo(nodeId) {
  return new Promise((resolve, reject) => {
    const socket = getDataNodeSocket(nodeId);
    
    if (!socket) {
      reject(new Error('Data node không online'));
      return;
    }
    
    socket.emit('get_storage_info', {}, (response) => {
      if (response.success) {
        resolve(response.data);
      } else {
        reject(new Error(response.error || 'Failed to get storage info'));
      }
    });
  });
}

export { dataNodeConnections };

/**
 * Health Check - Kiểm tra trạng thái data nodes mỗi 5 giây
 * SỬ DỤNG GRACE PERIOD để tránh race condition khi reconnect
 */
let healthCheckInterval = null;
const GRACE_PERIOD_MS = 3000; // 3 giây grace period

export function startHealthCheck() {
  // Dừng interval cũ nếu có
  if (healthCheckInterval) {
    clearInterval(healthCheckInterval);
  }

  console.log('🏥 Bắt đầu health check cho data nodes (mỗi 5 giây, grace period: 3s)');

  healthCheckInterval = setInterval(async () => {
    try {
      const { getAllDataNodes } = await import('../db/data-nodes.js');
      const allNodes = await getAllDataNodes();

      for (const node of allNodes) {
        const isOnline = isDataNodeOnline(node.id);
        const currentStatus = node.status;

        // Lấy timestamp của lần cập nhật gần nhất
        const lastUpdate = nodeStatusTimestamps.get(node.id);
        const now = Date.now();

        // Nếu vừa mới cập nhật status (trong grace period) → SKIP
        if (lastUpdate && (now - lastUpdate.timestamp) < GRACE_PERIOD_MS) {
          // console.log(`⏳ Node ${node.id}: Trong grace period, skip health check`);
          continue;
        }

        // Cập nhật status nếu thay đổi
        if (isOnline && currentStatus !== 'online') {
          console.log(`✅ [HEALTH_CHECK] Data node ${node.name} (ID: ${node.id}) đã online`);
          await updateDataNodeStatus(node.id, 'online');
          nodeStatusTimestamps.set(node.id, {
            status: 'online',
            timestamp: now
          });
        } else if (!isOnline && currentStatus === 'online') {
          console.log(`❌ [HEALTH_CHECK] Data node ${node.name} (ID: ${node.id}) đã offline`);
          await updateDataNodeStatus(node.id, 'offline');
          nodeStatusTimestamps.set(node.id, {
            status: 'offline',
            timestamp: now
          });
        }
      }
    } catch (error) {
      console.error('❌ Lỗi khi chạy health check:', error);
    }
  }, 5000); // 5 giây
}

export function stopHealthCheck() {
  if (healthCheckInterval) {
    clearInterval(healthCheckInterval);
    healthCheckInterval = null;
    console.log('🛑 Đã dừng health check');
  }
}


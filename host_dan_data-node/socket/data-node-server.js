/**
 * Socket.IO Server để quản lý kết nối với Data Nodes
 */

import { Server } from 'socket.io';
import {
  getDataNodeByPort,
  updateDataNodeStatus,
  updateDataNodeStorage
} from '../db/data-nodes.js';

// Lưu trữ các kết nối data node
const dataNodeConnections = new Map();

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
        
        // Lưu thông tin kết nối
        dataNodeConnections.set(dataNode.id, {
          socketId: socket.id,
          socket: socket,
          nodeId: dataNode.id,
          port: port,
          name: name,
          connectedAt: new Date()
        });
        
        // Cập nhật trạng thái online
        await updateDataNodeStatus(dataNode.id, 'online');
        
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
          
          // Cập nhật trạng thái offline
          await updateDataNodeStatus(socket.nodeId, 'offline');
          
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
 */
export async function sendFileToDataNode(nodeId, fileData) {
  return new Promise((resolve, reject) => {
    const socket = getDataNodeSocket(nodeId);

    if (!socket) {
      reject(new Error('Data node không online'));
      return;
    }

    // Gửi file qua socket với timeout
    const timeout = setTimeout(() => {
      reject(new Error('Timeout khi upload file'));
    }, 60000); // 60 seconds timeout

    socket.emit('upload_file', fileData, (response) => {
      clearTimeout(timeout);

      if (response.success) {
        resolve(response);
      } else {
        reject(new Error(response.error || 'Upload failed'));
      }
    });
  });
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
 * @param {number} nodeId - ID của data node
 * @param {string} folderName - Tên folder cần tạo
 */
export async function createFolderOnDataNode(nodeId, folderName) {
  return new Promise((resolve, reject) => {
    const socket = getDataNodeSocket(nodeId);

    if (!socket) {
      reject(new Error('Data node không online'));
      return;
    }

    const timeout = setTimeout(() => {
      reject(new Error('Timeout khi tạo folder'));
    }, 10000); // 10 seconds timeout

    socket.emit('create_folder', { folderName }, (response) => {
      clearTimeout(timeout);

      if (response.success) {
        resolve(response);
      } else {
        reject(new Error(response.error || 'Tạo folder thất bại'));
      }
    });
  });
}

/**
 * Xóa file từ data node
 */
export async function deleteFileFromDataNode(nodeId, filePath) {
  return new Promise((resolve, reject) => {
    const socket = getDataNodeSocket(nodeId);
    
    if (!socket) {
      reject(new Error('Data node không online'));
      return;
    }
    
    socket.emit('delete_file', { filePath }, (response) => {
      if (response.success) {
        resolve(response);
      } else {
        reject(new Error(response.error || 'Delete failed'));
      }
    });
  });
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
 */
let healthCheckInterval = null;

export function startHealthCheck() {
  // Dừng interval cũ nếu có
  if (healthCheckInterval) {
    clearInterval(healthCheckInterval);
  }

  console.log('🏥 Bắt đầu health check cho data nodes (mỗi 5 giây)');

  healthCheckInterval = setInterval(async () => {
    try {
      const { getAllDataNodes } = await import('../db/data-nodes.js');
      const allNodes = await getAllDataNodes();

      for (const node of allNodes) {
        const isOnline = isDataNodeOnline(node.id);
        const currentStatus = node.status;

        // Cập nhật status nếu thay đổi
        if (isOnline && currentStatus !== 'online') {
          console.log(`✅ Data node ${node.name} (ID: ${node.id}) đã online`);
          await updateDataNodeStatus(node.id, 'online');
        } else if (!isOnline && currentStatus === 'online') {
          console.log(`❌ Data node ${node.name} (ID: ${node.id}) đã offline`);
          await updateDataNodeStatus(node.id, 'offline');
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


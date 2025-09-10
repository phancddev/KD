// Server routes cho chế độ Tăng Tốc
import express from 'express';
import { getRandomTangTocQuestions, importTangTocQuestionsFromCSV } from './questions-parser.js';
import { pool } from '../../db/index.js';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';
import fs from 'fs';
import { pipeline } from 'stream';
import { promisify } from 'util';
const streamPipeline = promisify(pipeline);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Function to extract image URL from text
function extractImageUrl(text) {
    if (!text) return null;
    
    // Match format: https://... data:image/...
    const match = text.match(/(https:\/\/[^\s]+)\s+data:image\/[^\s]+/);
    return match ? match[1] : null;
}

// Configure multer for file uploads
const upload = multer({
    dest: path.join(__dirname, '../../../uploads/temp/'),
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB limit
    },
    fileFilter: (req, file, cb) => {
        const allowedTypes = ['.csv', '.txt', '.xlsx', '.xls'];
        const ext = path.extname(file.originalname).toLowerCase();
        if (allowedTypes.includes(ext)) {
            cb(null, true);
        } else {
            cb(new Error('Chỉ hỗ trợ file CSV, TXT và XLSX'), false);
        }
    }
});

const router = express.Router();

// Function để gọi Python parser
async function parseTangTocWithPython(filePath, originalName) {
    return new Promise((resolve, reject) => {
        const pythonPath = 'python3';
        const scriptPath = path.join(__dirname, '..', '..', 'scripts', 'parser-tangtoc.py');
        
        // Tạo file path với extension
        const fileExt = path.extname(originalName);
        const newFilePath = filePath + fileExt;
        fs.renameSync(filePath, newFilePath);
        
        console.log('Python script path:', scriptPath);
        console.log('File path:', newFilePath);
        console.log('Working directory:', path.join(__dirname, '../../../'));
        
        const python = spawn(pythonPath, [scriptPath, newFilePath], {
            cwd: path.join(__dirname, '../../../')
        });
        
        let output = '';
        let error = '';
        
        python.stdout.on('data', (data) => {
            output += data.toString();
        });
        
        python.stderr.on('data', (data) => {
            error += data.toString();
        });
        
        python.on('close', (code) => {
            if (code !== 0) {
                reject(new Error(`Python parser failed: ${error}`));
                return;
            }
            
            try {
                const result = JSON.parse(output);
                const questions = result.questions || [];
                const stats = result.stats || {};
                const skippedRows = result.skipped_rows || [];
                
                // Lưu câu hỏi vào database
                saveQuestionsToDatabase(questions).then(() => {
                    resolve({
                        questions: questions,
                        stats: stats,
                        skippedRows: skippedRows
                    });
                }).catch(reject);
                
            } catch (parseError) {
                reject(new Error(`Failed to parse Python output: ${parseError.message}`));
            }
        });
    });
}

// Function để lưu câu hỏi vào database
async function saveQuestionsToDatabase(questions) {
    for (const question of questions) {
        await pool.query(
            `INSERT INTO questions (question_number, text, answer, category, image_url, time_limit, difficulty) 
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [
                question.question_number,
                question.text,
                question.answer,
                question.category,
                question.image_url,
                question.time_limit,
                'medium'
            ]
        );
    }
}

// API lấy câu hỏi Tăng Tốc ngẫu nhiên
router.get('/api/tangtoc/questions', async (req, res) => {
    try {
        console.log('🔍 [ROUTER] /api/tangtoc/questions called');
        const questions = await getRandomTangTocQuestions();
        console.log('✅ [ROUTER] /api/tangtoc/questions count =', Array.isArray(questions) ? questions.length : 'N/A');
        res.json(questions);
    } catch (error) {
        console.error('❌ [ROUTER] Lỗi khi lấy câu hỏi Tăng Tốc:', error);
        console.error('   code:', error?.code, 'errno:', error?.errno, 'sqlState:', error?.sqlState, 'sqlMessage:', error?.sqlMessage);
        console.error('   sql:', error?.sql);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// Proxy media (e.g., mp4) to bypass cross-origin restrictions and support Range
router.get('/api/tangtoc/media-proxy', async (req, res) => {
    try {
        const { url } = req.query;
        if (!url || typeof url !== 'string') {
            return res.status(400).send('Missing url');
        }
        // Allowlist host to avoid open proxy
        const allowedHosts = ['static.wikia.nocookie.net', 'static.wikia.nocookie.net:443'];
        let target;
        try { target = new URL(url); } catch { return res.status(400).send('Invalid url'); }
        if (!allowedHosts.includes(target.host)) {
            return res.status(403).send('Host not allowed');
        }

        const headers = {};
        if (req.headers.range) headers['Range'] = req.headers.range;

        const upstream = await fetch(url, { headers });

        // Forward essential headers
        res.setHeader('Access-Control-Allow-Origin', '*');
        const fwdHeaders = ['content-type', 'content-length', 'accept-ranges', 'content-range', 'cache-control'];
        for (const h of fwdHeaders) {
            const v = upstream.headers.get(h);
            if (v) res.setHeader(h, v);
        }

        res.status(upstream.status);
        if (!upstream.body) {
            return res.end();
        }
        await streamPipeline(upstream.body, res);
    } catch (e) {
        console.error('Media proxy error:', e);
        res.status(500).send('Proxy error');
    }
});

// API lưu kết quả trận đấu solo Tăng Tốc
router.post('/api/solo-game/tangtoc/finish', async (req, res) => {
    if (!req.session.user) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    
    try {
        const { score, correctAnswers, totalQuestions } = req.body;
        
        if (score === undefined || correctAnswers === undefined || totalQuestions === undefined) {
            return res.status(400).json({ error: 'Missing required fields' });
        }
        
        // Tạo phiên chơi solo Tăng Tốc và lưu kết quả
        const gameSession = await createGameSession(req.session.user.id, null, true, totalQuestions, 'tangtoc');
        await finishGameSession(gameSession.id, score, correctAnswers);
        
        res.json({ success: true, sessionId: gameSession.id });
    } catch (error) {
        console.error('Lỗi khi lưu kết quả trận đấu solo Tăng Tốc:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// API lưu kết quả trận đấu room Tăng Tốc
router.post('/api/room-game/tangtoc/finish', async (req, res) => {
    if (!req.session.user) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    
    try {
        const { roomId, score, correctAnswers, totalQuestions } = req.body;
        
        if (score === undefined || correctAnswers === undefined || totalQuestions === undefined) {
            return res.status(400).json({ error: 'Missing required fields' });
        }
        
        // Tạo phiên chơi room Tăng Tốc và lưu kết quả
        const gameSession = await createGameSession(req.session.user.id, roomId, false, totalQuestions, 'tangtoc');
        await finishGameSession(gameSession.id, score, correctAnswers);
        
        res.json({ success: true, sessionId: gameSession.id });
    } catch (error) {
        console.error('Lỗi khi lưu kết quả trận đấu room Tăng Tốc:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// Admin API endpoints
// Lấy danh sách câu hỏi Tăng Tốc cho admin
router.get('/api/admin/tangtoc/questions', async (req, res) => {
    try {
        console.log('🔍 [ADMIN] /api/admin/tangtoc/questions called');
        const [rows] = await pool.query(`
            SELECT * FROM questions 
            WHERE category = 'tangtoc' 
            ORDER BY question_number, created_at DESC
        `);
        console.log('✅ [ADMIN] tangtoc questions count =', rows.length);
        res.json(rows);
    } catch (error) {
        console.error('❌ [ADMIN] Lỗi khi lấy câu hỏi Tăng Tốc:', error);
        console.error('   code:', error?.code, 'errno:', error?.errno, 'sqlState:', error?.sqlState, 'sqlMessage:', error?.sqlMessage);
        console.error('   sql:', error?.sql);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// Lấy thống kê câu hỏi Tăng Tốc
router.get('/api/admin/tangtoc/statistics', async (req, res) => {
    try {
        const [totalRows] = await pool.query(`
            SELECT COUNT(*) as total FROM questions WHERE category = 'tangtoc'
        `);
        
        const [imageRows] = await pool.query(`
            SELECT COUNT(*) as count FROM questions 
            WHERE category = 'tangtoc' AND image_url IS NOT NULL AND image_url != ''
        `);
        
        const [question1Rows] = await pool.query(`
            SELECT COUNT(*) as count FROM questions 
            WHERE category = 'tangtoc' AND question_number = 1
        `);
        
        const [question2Rows] = await pool.query(`
            SELECT COUNT(*) as count FROM questions 
            WHERE category = 'tangtoc' AND question_number = 2
        `);
        
        const [question3Rows] = await pool.query(`
            SELECT COUNT(*) as count FROM questions 
            WHERE category = 'tangtoc' AND question_number = 3
        `);
        
        const [question4Rows] = await pool.query(`
            SELECT COUNT(*) as count FROM questions 
            WHERE category = 'tangtoc' AND question_number = 4
        `);
        
        res.json({
            totalQuestions: totalRows[0].total,
            imageQuestions: imageRows[0].count,
            question1Count: question1Rows[0].count,
            question2Count: question2Rows[0].count,
            question3Count: question3Rows[0].count,
            question4Count: question4Rows[0].count
        });
    } catch (error) {
        console.error('Lỗi khi lấy thống kê Tăng Tốc:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// Upload câu hỏi Tăng Tốc
router.post('/api/admin/tangtoc/upload', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'Không có file được upload' });
        }
        
        const { mode } = req.body;
        
        // Xóa câu hỏi cũ nếu mode là replace
        if (mode === 'replace') {
            await pool.query('DELETE FROM questions WHERE category = ?', ['tangtoc']);
        }
        
        // Sử dụng Python parser
        const result = await parseTangTocWithPython(req.file.path, req.file.originalname);
        const questions = result.questions;
        const stats = result.stats;
        const skippedRows = result.skippedRows;
        
        // Xóa file tạm
        const fileExt = path.extname(req.file.originalname);
        const tempFilePath = req.file.path + fileExt;
        fs.unlinkSync(tempFilePath);
        
        res.json({
            success: true,
            count: questions.length,
            message: `Đã thêm ${questions.length} câu hỏi Tăng Tốc`,
            stats: stats,
            skippedRows: skippedRows.slice(0, 10) // Chỉ gửi 10 dòng đầu bị bỏ qua
        });
    } catch (error) {
        console.error('Lỗi khi upload câu hỏi Tăng Tốc:', error);
        res.status(500).json({ error: error.message || 'Internal Server Error' });
    }
});

// Xóa câu hỏi Tăng Tốc
// PUT /api/admin/tangtoc/questions/:id - Cập nhật câu hỏi
router.put('/api/admin/tangtoc/questions/:id', async (req, res) => {
    try {
        const questionId = req.params.id;
        const { question_number, text, answer } = req.body;
        
        // Validate input
        if (!question_number || !text || !answer) {
            return res.status(400).json({ success: false, error: 'Thiếu thông tin bắt buộc' });
        }
        
        if (![1, 2, 3, 4].includes(parseInt(question_number))) {
            return res.status(400).json({ success: false, error: 'Số câu phải là 1, 2, 3 hoặc 4' });
        }
        
        // Extract image URL if present
        const imageUrl = extractImageUrl(text);
        const cleanText = imageUrl ? text.replace(/@https:\/\/[^\s]+\s+data:image\/[^\s]+/, '').trim() : text;
        // Câu 4 luôn 60 giây, các câu khác giữ quy tắc cũ
        const timeLimit = parseInt(question_number) === 4 ? 60 : parseInt(question_number) * 10;
        
        // Update question
        const [result] = await pool.query(
            'UPDATE questions SET question_number = ?, text = ?, answer = ?, image_url = ?, time_limit = ? WHERE id = ? AND category = ?',
            [question_number, cleanText, answer, imageUrl, timeLimit, questionId, 'tangtoc']
        );
        
        if (result.affectedRows > 0) {
            res.json({ success: true, message: 'Cập nhật câu hỏi thành công' });
        } else {
            res.status(404).json({ success: false, error: 'Không tìm thấy câu hỏi' });
        }
    } catch (error) {
        console.error('Lỗi khi cập nhật câu hỏi Tăng Tốc:', error);
        res.status(500).json({ success: false, error: 'Lỗi server khi cập nhật câu hỏi' });
    }
});

router.delete('/api/admin/tangtoc/questions/:id', async (req, res) => {
    try {
        const questionId = req.params.id;
        
        const [result] = await pool.query(
            'DELETE FROM questions WHERE id = ? AND category = ?',
            [questionId, 'tangtoc']
        );
        
        if (result.affectedRows > 0) {
            res.json({ success: true, message: 'Xóa câu hỏi thành công' });
        } else {
            res.status(404).json({ error: 'Không tìm thấy câu hỏi' });
        }
    } catch (error) {
        console.error('Lỗi khi xóa câu hỏi Tăng Tốc:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

export default router;

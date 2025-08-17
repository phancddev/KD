import express from 'express';
import path from 'path';
import fs from 'fs';
import multer from 'multer';
import { exec } from 'child_process';
import { promisify } from 'util';
import { fileURLToPath } from 'url';
import { isUserAdmin } from '../db/users.js';
import { 
    createQuestion, 
    getAllQuestions, 
    getQuestionById, 
    updateQuestion, 
    deleteQuestion, 
    importQuestionsFromCSV 
} from '../db/questions.js';

const execAsync = promisify(exec);

const router = express.Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Cấu hình multer cho file upload
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  fileFilter: function (req, file, cb) {
    // Cho phép CSV, TXT và Excel files
    if (file.mimetype === 'text/csv' || 
        file.mimetype === 'text/plain' || 
        file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
        file.mimetype === 'application/vnd.ms-excel' ||
        file.originalname.endsWith('.csv') || 
        file.originalname.endsWith('.txt') ||
        file.originalname.endsWith('.xlsx') ||
        file.originalname.endsWith('.xls')) {
      cb(null, true);
    } else {
      cb(new Error('Chỉ cho phép file CSV, TXT hoặc Excel'), false);
    }
  }
});

// Parse file using Python tool
async function parseWithPython(filePath) {
    try {
        const scriptPath = path.join(__dirname, '../scripts/csv_parser.py');
        const command = `python3 "${scriptPath}" "${filePath}"`;
        
        console.log('Executing Python parser:', command);
        
        const { stdout, stderr } = await execAsync(command);
        
        if (stderr) {
            console.log('Python stderr:', stderr);
        }
        
        const result = JSON.parse(stdout);
        console.log('Python parsing result:', result);
        
        return result;
    } catch (error) {
        console.error('Python parsing failed:', error);
        return {
            success: false,
            error: `Python parsing failed: ${error.message}`
        };
    }
}

// Middleware để kiểm tra quyền admin
async function checkAdmin(req, res, next) {
    if (!req.session.user) {
        return res.status(401).json({ success: false, error: 'Không có quyền truy cập' });
    }
    
    const isAdmin = await isUserAdmin(req.session.user.id);
    if (!isAdmin) {
        return res.status(403).json({ success: false, error: 'Không có quyền admin' });
    }
    
    next();
}

// Routes
// Trang quản lý câu hỏi
router.get('/questions', async (req, res) => {
    if (!req.session.user) {
        return res.redirect('/login');
    }
    
    const isAdmin = await isUserAdmin(req.session.user.id);
    if (!isAdmin) {
        return res.redirect('/');
    }
    
    res.sendFile(path.join(__dirname, '../views/admin/questions.html'));
});

// API lấy danh sách câu hỏi
router.get('/api/questions', checkAdmin, async (req, res) => {
  try {
    const questions = await getAllQuestions();
    res.json(questions);
  } catch (error) {
    console.error('Lỗi khi lấy danh sách câu hỏi:', error);
    res.status(500).json({ success: false, error: 'Không thể lấy danh sách câu hỏi' });
  }
});

// API lấy câu hỏi ngẫu nhiên
router.get('/api/questions/random', async (req, res) => {
  try {
    const count = parseInt(req.query.count) || 12;
    
    // Lấy tất cả câu hỏi trước, sau đó shuffle
    const allQuestions = await getAllQuestions();
    
    // Shuffle và lấy số lượng cần thiết
    const shuffled = allQuestions.sort(() => 0.5 - Math.random());
    const questions = shuffled.slice(0, Math.min(count, shuffled.length));
    
    res.json(questions);
  } catch (error) {
    console.error('Lỗi khi lấy câu hỏi ngẫu nhiên:', error);
    res.status(500).json({ success: false, error: 'Không thể lấy câu hỏi ngẫu nhiên' });
  }
});

// API thêm câu hỏi mới
router.post('/api/questions', checkAdmin, async (req, res) => {
    try {
        const { text, answer } = req.body;
        
        if (!text || !answer) {
            return res.status(400).json({ success: false, error: 'Thiếu thông tin câu hỏi hoặc câu trả lời' });
        }
        
        const question = await createQuestion({
            text,
            answer,
            createdBy: req.session.user.id
        });
        
        res.json({ success: true, question });
    } catch (error) {
        console.error('Lỗi khi thêm câu hỏi:', error);
        res.status(500).json({ success: false, error: 'Không thể thêm câu hỏi' });
    }
});

// API cập nhật câu hỏi
router.put('/api/questions/:id', checkAdmin, async (req, res) => {
    try {
        const questionId = req.params.id;
        const { text, answer } = req.body;
        
        if (!text || !answer) {
            return res.status(400).json({ success: false, error: 'Thiếu thông tin câu hỏi hoặc câu trả lời' });
        }
        
        const success = await updateQuestion(questionId, {
            text,
            answer
        });
        
        if (success) {
            res.json({ success: true });
        } else {
            res.status(404).json({ success: false, error: 'Không tìm thấy câu hỏi' });
        }
    } catch (error) {
        console.error('Lỗi khi cập nhật câu hỏi:', error);
        res.status(500).json({ success: false, error: 'Không thể cập nhật câu hỏi' });
    }
});

// API xóa câu hỏi
router.delete('/api/questions/:id', checkAdmin, async (req, res) => {
    try {
        const questionId = req.params.id;
        const success = await deleteQuestion(questionId);
        
        if (success) {
            res.json({ success: true });
        } else {
            res.status(404).json({ success: false, error: 'Không tìm thấy câu hỏi' });
        }
    } catch (error) {
        console.error('Lỗi khi xóa câu hỏi:', error);
        res.status(500).json({ success: false, error: 'Không thể xóa câu hỏi' });
    }
});

// API xóa toàn bộ câu hỏi
router.delete('/api/questions', checkAdmin, async (req, res) => {
    try {
        console.log('🗑️ Admin yêu cầu xóa toàn bộ câu hỏi');
        const result = await deleteAllQuestions();
        
        if (result.success) {
            console.log(`✅ Đã xóa ${result.deletedCount} câu hỏi thành công`);
            res.json({ 
                success: true, 
                message: `Đã xóa ${result.deletedCount} câu hỏi thành công`,
                deletedCount: result.deletedCount
            });
        } else {
            res.status(500).json({ success: false, error: 'Không thể xóa câu hỏi' });
        }
    } catch (error) {
        console.error('Lỗi khi xóa toàn bộ câu hỏi:', error);
        res.status(500).json({ success: false, error: 'Không thể xóa toàn bộ câu hỏi' });
    }
});

// API nhập câu hỏi từ file
router.post('/api/questions/import', checkAdmin, upload.single('csvFile'), async (req, res) => {
    try {
        console.log('Upload request received');
        console.log('Request file:', req.file);
        console.log('Request body:', req.body);

        if (!req.file) {
            return res.status(400).json({ success: false, error: 'Vui lòng chọn một file để nhập' });
        }

        console.log('File uploaded successfully:', req.file.filename);
        const filePath = req.file.path;

        // Sử dụng Python tool để parse file
        const parseResult = await parseWithPython(filePath);
        
        if (!parseResult.success) {
            // Xóa file nếu parse lỗi
            fs.unlink(filePath, (unlinkError) => {
                if (unlinkError) {
                    console.error('Lỗi khi xóa file sau khi lỗi:', unlinkError);
                }
            });
            
            return res.status(400).json({
                success: false,
                error: parseResult.error
            });
        }

        // Lưu các câu hỏi vào database
        const savedQuestions = [];
        let errorCount = 0;
        
        for (const questionData of parseResult.questions) {
            try {
                const question = await createQuestion({
                    text: questionData.text,
                    answer: questionData.answer,
                    createdBy: req.session.user.id
                });
                savedQuestions.push(question);
            } catch (saveError) {
                console.error('Lỗi khi lưu câu hỏi:', saveError);
                errorCount++;
            }
        }

        // Xóa file sau khi import
        fs.unlink(filePath, (unlinkError) => {
            if (unlinkError) {
                console.error('Lỗi khi xóa file sau khi import:', unlinkError);
            }
        });

        res.json({
            success: true,
            count: savedQuestions.length,
            total: parseResult.total,
            skipped: parseResult.skipped,
            errors: errorCount,
            message: `Đã nhập thành công ${savedQuestions.length}/${parseResult.total} câu hỏi.${parseResult.skipped > 0 ? ` Bỏ qua ${parseResult.skipped} dòng.` : ''}`,
            questions: savedQuestions,
            parseInfo: parseResult.file_info,
            skippedDetails: parseResult.skipped_details
        });

    } catch (error) {
        console.error('Lỗi khi xử lý upload:', error);
        
        // Xóa file nếu có lỗi
        if (req.file) {
            fs.unlink(req.file.path, (unlinkError) => {
                if (unlinkError) {
                    console.error('Lỗi khi xóa file sau khi lỗi:', unlinkError);
                }
            });
        }
        
        res.status(500).json({
            success: false,
            error: 'Lỗi khi xử lý file: ' + error.message
        });
    }
});

// Route test đơn giản
router.get('/test', (req, res) => {
    res.json({ message: 'Admin router is working!' });
});

// Route test tạm thời để test file import (không cần admin)
router.post('/test/import', upload.single('csvFile'), async (req, res) => {
    try {
        console.log('Test upload request received');
        console.log('Request file:', req.file);
        console.log('Request body:', req.body);

        if (!req.file) {
            return res.status(400).json({ success: false, error: 'Vui lòng chọn một file để nhập' });
        }

        console.log('File uploaded successfully:', req.file.filename);
        const filePath = req.file.path;

        const importedQuestions = await importQuestionsFromCSV(filePath);
        console.log('Imported questions:', importedQuestions);

        // Xóa file sau khi import
        fs.unlink(filePath, (unlinkError) => {
            if (unlinkError) {
                console.error('Lỗi khi xóa file sau khi import:', unlinkError);
            }
        });

        res.json({
            success: true,
            count: importedQuestions.length,
            message: `Đã nhập thành công ${importedQuestions.length} câu hỏi.`,
            questions: importedQuestions
        });

    } catch (error) {
        console.error('Lỗi khi xử lý upload:', error);
        
        // Xóa file nếu có lỗi
        if (req.file) {
            fs.unlink(req.file.path, (unlinkError) => {
                if (unlinkError) {
                    console.error('Lỗi khi xóa file sau khi lỗi:', unlinkError);
                }
            });
        }
        
        res.status(500).json({
            success: false,
            error: 'Lỗi khi xử lý file: ' + error.message
        });
    }
});

export default router;
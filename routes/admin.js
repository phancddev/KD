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
    importQuestionsFromCSV,
    addAcceptedAnswer,
    removeAcceptedAnswer,
    getRandomQuestions
} from '../db/questions.js';

const execAsync = promisify(exec);

const router = express.Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Middleware để parse JSON body
router.use(express.json());

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

// API lấy câu hỏi ngẫu nhiên - hỗ trợ filter theo category
router.get('/api/questions/random', async (req, res) => {
  try {
    const count = parseInt(req.query.count) || 12;
    const category = req.query.category || 'khoidong'; // Mặc định "khoidong"
    
    console.log(`🎯 Random questions API: count=${count}, category=${category}`);
    
    // Sử dụng getRandomQuestions với category filter
    const questions = await getRandomQuestions(count, category);
    
    console.log(`✅ Returned ${questions.length} questions for category: ${category}`);
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
        const { text, answer, acceptedAnswers, category } = req.body;
        
        if (!text || !answer) {
            return res.status(400).json({ success: false, error: 'Thiếu thông tin câu hỏi hoặc câu trả lời' });
        }
        
        // Xử lý category validation
        let validCategory = category || 'khoidong';
        
        if (category === 'general' || category === null || category === undefined) {
            validCategory = 'khoidong'; // Convert general to khoidong
        }
        
        if (!['khoidong', 'vuotchuongngaivat', 'tangtoc', 'vedich'].includes(validCategory)) {
            return res.status(400).json({ 
                success: false, 
                error: `Danh mục "${category}" không hợp lệ. Chỉ chấp nhận: khoidong, vuotchuongngaivat, tangtoc, vedich` 
            });
        }
        
        const success = await updateQuestion(questionId, {
            text,
            answer,
            category: validCategory,
            acceptedAnswers: Array.isArray(acceptedAnswers) ? acceptedAnswers : undefined
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

// API: thêm một đáp án chấp nhận cho câu hỏi
router.post('/api/questions/:id/answers', checkAdmin, async (req, res) => {
  try {
    const questionId = parseInt(req.params.id);
    const { answer } = req.body || {};
    if (!answer || !answer.toString().trim()) {
      return res.status(400).json({ success: false, error: 'Thiếu nội dung đáp án' });
    }
    const created = await addAcceptedAnswer(questionId, answer);
    res.json({ success: true, answer: created });
  } catch (error) {
    console.error('Lỗi khi thêm đáp án phụ:', error);
    res.status(500).json({ success: false, error: 'Không thể thêm đáp án' });
  }
});

// API: xóa một đáp án chấp nhận
router.delete('/api/answers/:answerId', checkAdmin, async (req, res) => {
  try {
    const answerId = parseInt(req.params.answerId);
    const ok = await removeAcceptedAnswer(answerId);
    if (!ok) return res.status(404).json({ success: false, error: 'Không tìm thấy đáp án' });
    res.json({ success: true });
  } catch (error) {
    console.error('Lỗi khi xóa đáp án phụ:', error);
    res.status(500).json({ success: false, error: 'Không thể xóa đáp án' });
  }
});

// API xóa câu hỏi
router.delete('/api/questions/:id', checkAdmin, async (req, res) => {
    try {
        console.log('🗑️ Bắt đầu xóa câu hỏi:', req.params.id);
        console.log('🗑️ Request body:', req.body);
        console.log('🗑️ Session user:', req.session.user);
        
        const questionId = req.params.id;
        const { deletionReason, reportId } = req.body || {};
        
        console.log('🗑️ Question ID:', questionId);
        console.log('🗑️ Deletion reason:', deletionReason);
        console.log('🗑️ Report ID:', reportId);
        console.log('🗑️ Deleted by user ID:', req.session.user.id);
        
        const success = await deleteQuestion(
            questionId, 
            deletionReason, 
            req.session.user.id, 
            reportId
        );
        
        console.log('🗑️ Kết quả xóa câu hỏi:', success);
        
        if (success) {
            res.json({ success: true });
        } else {
            res.status(404).json({ success: false, error: 'Không tìm thấy câu hỏi' });
        }
    } catch (error) {
        console.error('❌ Lỗi khi xóa câu hỏi:', error);
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

// Debug route để test database và category
router.get('/debug/database', async (req, res) => {
  try {
    console.log('🔍 Debug database route');
    
    // Test database connection
    const { getAllQuestions } = await import('../db/questions.js');
    const allQuestions = await getAllQuestions();
    console.log('📊 Total questions in database:', allQuestions.length);
    
    // Check categories
    const categories = {};
    allQuestions.forEach(q => {
      categories[q.category] = (categories[q.category] || 0) + 1;
    });
    
    console.log('📈 Categories distribution:', categories);
    
    // Test getRandomQuestions directly
    const { getRandomQuestions } = await import('../db/questions.js');
    const randomWithoutCategory = await getRandomQuestions(2);
    const randomKhoidong = await getRandomQuestions(2, 'khoidong');
    
    res.json({
      success: true,
      totalQuestions: allQuestions.length,
      categories,
      randomWithoutCategory: randomWithoutCategory.length,
      randomKhoidong: randomKhoidong.length,
      sampleQuestions: allQuestions.slice(0, 3).map(q => ({
        id: q.id,
        text: q.text.substring(0, 50) + '...',
        category: q.category
      }))
    });
  } catch (error) {
    console.error('❌ Debug database error:', error);
    res.json({
      success: false,
      error: error.message,
      stack: error.stack
    });
  }
});

// Route cho login logs
router.get('/login-logs', async (req, res) => {
    if (!req.session.user) {
        return res.redirect('/login');
    }
    
    const isAdmin = await isUserAdmin(req.session.user.id);
    if (!isAdmin) {
        return res.redirect('/');
    }
    
    res.sendFile(path.join(__dirname, '../views/admin/login-logs.html'));
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

// TangToc Reports page
router.get('/tangtoc-reports', async (req, res) => {
    if (!req.session.user) {
        return res.redirect('/login');
    }
    
    const isAdmin = await isUserAdmin(req.session.user.id);
    if (!isAdmin) {
        return res.redirect('/');
    }
    
    res.sendFile(path.join(__dirname, '../views/admin/tangtoc-reports.html'));
});

// TangToc Question Logs page
router.get('/tangtoc-question-logs', async (req, res) => {
    if (!req.session.user) {
        return res.redirect('/login');
    }
    
    const isAdmin = await isUserAdmin(req.session.user.id);
    if (!isAdmin) {
        return res.redirect('/');
    }
    
    res.sendFile(path.join(__dirname, '../views/admin/tangtoc-question-logs.html'));
});

export default router;
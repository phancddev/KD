import express from 'express';
import { 
  listTangTocQuestionReports, 
  getTangTocQuestionReportById, 
  updateTangTocQuestionReportStatus,
  addTangTocAnswerSuggestion,
  updateTangTocAnswerSuggestion,
  approveTangTocAnswerSuggestions
} from '../db/tangtoc-reports.js';
import { 
  createTangTocQuestionReport, 
  addTangTocAnswerSuggestion as addTangTocAnswerSuggestionDB 
} from '../db/tangtoc-reports.js';
import { 
  addTangTocAcceptedAnswer, 
  removeTangTocAcceptedAnswer 
} from '../db/tangtoc-questions.js';
import { isUserAdmin } from '../db/users.js';

const router = express.Router();

// Middleware kiểm tra admin
const requireAdmin = async (req, res, next) => {
  console.log('🔍 requireAdmin middleware được gọi cho URL:', req.url);
  console.log('🔍 requireAdmin middleware - Session:', JSON.stringify(req.session, null, 2));
  console.log('🔍 requireAdmin middleware - User:', req.session.user);
  
  if (!req.session || !req.session.user) {
    console.log('❌ requireAdmin: Không có user trong session');
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  if (!req.session.user.id || isNaN(req.session.user.id)) {
    console.log('❌ requireAdmin: User ID không hợp lệ:', req.session.user.id);
    return res.status(401).json({ error: 'Invalid user ID in session' });
  }
  
  try {
    console.log('🔍 requireAdmin: Kiểm tra quyền admin cho user ID:', req.session.user.id);
    const isAdmin = await isUserAdmin(req.session.user.id);
    console.log('🔍 requireAdmin: Kết quả isAdmin:', isAdmin);
    
    if (!isAdmin) {
      console.log('❌ requireAdmin: User không có quyền admin');
      return res.status(403).json({ error: 'Access denied. Admin required.' });
    }
    
    console.log('✅ requireAdmin: User có quyền admin, cho phép tiếp tục');
    next();
  } catch (error) {
    console.error('❌ Lỗi khi kiểm tra quyền admin:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};

// Lấy danh sách báo lỗi Tăng Tốc
router.get('/tangtoc-reports', requireAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 20, status } = req.query;
    const result = await listTangTocQuestionReports({
      page: parseInt(page),
      limit: parseInt(limit),
      status: status || null
    });
    res.json(result);
  } catch (error) {
    console.error('Lỗi khi lấy danh sách báo lỗi Tăng Tốc:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Lấy chi tiết báo lỗi Tăng Tốc
router.get('/tangtoc-reports/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const report = await getTangTocQuestionReportById(parseInt(id));
    if (!report) {
      return res.status(404).json({ error: 'Report not found' });
    }
    res.json(report);
  } catch (error) {
    console.error('Lỗi khi lấy chi tiết báo lỗi Tăng Tốc:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Cập nhật trạng thái báo lỗi Tăng Tốc
router.post('/tangtoc-reports/:id/status', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    
    if (!['open', 'resolved'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }
    
    await updateTangTocQuestionReportStatus(parseInt(id), status);
    res.json({ success: true });
  } catch (error) {
    console.error('Lỗi khi cập nhật trạng thái báo lỗi Tăng Tốc:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Thêm đề xuất đáp án cho báo lỗi Tăng Tốc
router.post('/tangtoc-reports/:id/suggestions', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { answer } = req.body;
    
    if (!answer || !answer.trim()) {
      return res.status(400).json({ error: 'Answer is required' });
    }
    
    const result = await addTangTocAnswerSuggestion({
      reportId: parseInt(id),
      userId: req.session.user.id,
      suggestedAnswer: answer.trim()
    });
    
    res.json({ success: true, id: result.id });
  } catch (error) {
    console.error('Lỗi khi thêm đề xuất đáp án Tăng Tốc:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Cập nhật đề xuất đáp án Tăng Tốc
router.post('/tangtoc-reports/:reportId/suggestions/:suggestionId', requireAdmin, async (req, res) => {
  try {
    const { suggestionId } = req.params;
    const { newAnswer } = req.body;
    
    if (!newAnswer || !newAnswer.trim()) {
      return res.status(400).json({ error: 'New answer is required' });
    }
    
    await updateTangTocAnswerSuggestion(parseInt(suggestionId), newAnswer.trim());
    res.json({ success: true });
  } catch (error) {
    console.error('Lỗi khi cập nhật đề xuất đáp án Tăng Tốc:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Duyệt đề xuất đáp án Tăng Tốc
router.post('/tangtoc-reports/:id/suggestions/approve', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { suggestionIds, note = '' } = req.body;
    
    if (!Array.isArray(suggestionIds) || suggestionIds.length === 0) {
      return res.status(400).json({ error: 'Suggestion IDs are required' });
    }
    
    await approveTangTocAnswerSuggestions(suggestionIds, req.session.user.id, note);
    res.json({ success: true });
  } catch (error) {
    console.error('Lỗi khi duyệt đề xuất đáp án Tăng Tốc:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Thêm đáp án chấp nhận cho câu hỏi Tăng Tốc
router.post('/tangtoc/questions/:questionId/answers', requireAdmin, async (req, res) => {
  try {
    const { questionId } = req.params;
    const { answer } = req.body;
    
    if (!answer || !answer.trim()) {
      return res.status(400).json({ error: 'Answer is required' });
    }
    
    const result = await addTangTocAcceptedAnswer(parseInt(questionId), answer.trim());
    res.json({ success: true, answerId: result.id });
  } catch (error) {
    console.error('Lỗi khi thêm đáp án chấp nhận Tăng Tốc:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Xóa đáp án chấp nhận cho câu hỏi Tăng Tốc
router.delete('/tangtoc/questions/answers/:answerId', requireAdmin, async (req, res) => {
  try {
    const { answerId } = req.params;
    
    await removeTangTocAcceptedAnswer(parseInt(answerId));
    res.json({ success: true });
  } catch (error) {
    console.error('Lỗi khi xóa đáp án chấp nhận Tăng Tốc:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

export default router;

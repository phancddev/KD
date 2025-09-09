import express from 'express';
import { createTangTocQuestionReport, addTangTocAnswerSuggestion } from '../db/tangtoc-reports.js';

const router = express.Router();

// API: người dùng gửi báo lỗi câu hỏi/đáp án Tăng Tốc
router.post('/report-tangtoc-question', async (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  try {
    const { 
      mode, 
      questionId, 
      questionText, 
      correctAnswer, 
      userAnswer, 
      reportText, 
      sessionId, 
      roomId, 
      suggestions,
      questionNumber,
      imageUrl,
      timeLimit
    } = req.body || {};
    
    if (!['solo', 'room'].includes(mode)) {
      return res.status(400).json({ error: 'Thiếu hoặc sai mode' });
    }
    if (!questionText || !correctAnswer) {
      return res.status(400).json({ error: 'Thiếu dữ liệu bắt buộc' });
    }
    
    const suggestionList = Array.isArray(suggestions)
      ? suggestions.map(s => (typeof s === 'string' ? s : (s && s.value ? s.value : ''))).map(v => (v || '').toString().trim()).filter(Boolean)
      : [];
    
    const reportTextToSave = (reportText && reportText.toString().trim())
      ? reportText.toString().trim()
      : (suggestionList.length > 0 ? `Đề xuất đáp án: ${suggestionList.join(' | ')}` : '');
    
    if (!reportTextToSave) {
      return res.status(400).json({ error: 'Cần nhập mô tả hoặc ít nhất 1 đáp án đề xuất' });
    }
    
    const { id } = await createTangTocQuestionReport({
      userId: req.session.user.id,
      sessionId: sessionId || null,
      roomId: roomId || null,
      mode,
      questionId: questionId || null,
      questionText,
      correctAnswer,
      userAnswer: userAnswer || null,
      reportText: reportTextToSave,
      acceptedAnswers: req.body.acceptedAnswers || null,
      questionNumber: questionNumber || null,
      imageUrl: imageUrl || null,
      timeLimit: timeLimit || null
    });
    
    // Lưu các đề xuất đáp án nếu có
    for (const trimmed of suggestionList) {
      await addTangTocAnswerSuggestion({ 
        reportId: id, 
        questionId: questionId || null, 
        userId: req.session.user.id, 
        suggestedAnswer: trimmed 
      });
    }
    
    return res.json({ success: true, id });
  } catch (error) {
    console.error('Lỗi khi tạo report Tăng Tốc:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});

export default router;

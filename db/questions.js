import { pool } from './index.js';
import fs from 'fs';
import { parse } from 'csv-parse/sync';

// Thêm câu hỏi mới
async function createQuestion(questionData) {
    try {
        const { text, answer, category = 'khoidong', difficulty = 'medium', createdBy = null } = questionData;
        
        if (!text || !answer) {
            throw new Error('Câu hỏi và đáp án không được để trống');
        }

        const query = `
            INSERT INTO questions (text, answer, category, difficulty, created_by, created_at) 
            VALUES (?, ?, ?, ?, ?, NOW())
        `;
        
        const [result] = await pool.query(query, [text, answer, category, difficulty, createdBy]);
        
        console.log('Đã tạo câu hỏi mới với ID:', result.insertId);
        
        return {
            id: result.insertId,
            text,
            answer,
            category,
            difficulty,
            createdBy,
            createdAt: new Date()
        };
    } catch (error) {
        console.error('Lỗi khi tạo câu hỏi:', error);
        throw error;
    }
}

// Lấy câu hỏi theo ID
async function getQuestionById(id) {
  try {
    const [rows] = await pool.query('SELECT * FROM questions WHERE id = ?', [id]);
    if (rows.length === 0) return null;
    
    const question = rows[0];
    // Lấy các đáp án bổ sung
    const [answerRows] = await pool.query('SELECT id, answer FROM answers WHERE question_id = ?', [id]);
    const acceptedAnswers = answerRows.map(r => ({ id: r.id, answer: r.answer }));

    return {
      id: question.id,
      text: question.text,
      answer: question.answer,
      acceptedAnswers,
      category: question.category,
      difficulty: question.difficulty,
      createdBy: question.created_by,
      createdAt: question.created_at
    };
  } catch (error) {
    console.error('Lỗi khi lấy câu hỏi:', error);
    throw error;
  }
}

// Lấy danh sách câu hỏi
async function getAllQuestions() {
  try {
    const [rows] = await pool.query('SELECT * FROM questions');
    const ids = rows.map(q => q.id);
    let answersMap = new Map();
    if (ids.length > 0) {
      const [ans] = await pool.query(`SELECT id, question_id, answer FROM answers WHERE question_id IN (${ids.map(() => '?').join(',')})`, ids);
      for (const r of ans) {
        if (!answersMap.has(r.question_id)) answersMap.set(r.question_id, []);
        answersMap.get(r.question_id).push({ id: r.id, answer: r.answer });
      }
    }
    return rows.map(question => ({
      id: question.id,
      text: question.text,
      answer: question.answer,
      acceptedAnswers: answersMap.get(question.id) || [],
      category: question.category,
      difficulty: question.difficulty,
      createdBy: question.created_by,
      createdAt: question.created_at
    }));
  } catch (error) {
    console.error('Lỗi khi lấy danh sách câu hỏi:', error);
    throw error;
  }
}

// Lấy câu hỏi ngẫu nhiên - mặc định chỉ lấy "khoidong" cho game  
async function getRandomQuestions(count = 12, category = 'khoidong') {
  try {
    let query = 'SELECT * FROM questions';
    const params = [];
    
    // Mặc định chỉ lấy câu hỏi "khoidong" để giới hạn game hiện tại
    if (category) {
      query += ' WHERE category = ?';
      params.push(category);
    }
    
    query += ' ORDER BY RAND() LIMIT ?';
    params.push(count);
    
    const [rows] = await pool.query(query, params);

    // Lấy accepted answers cho những câu hỏi này
    const ids = rows.map(q => q.id);
    let answersMap = new Map();
    if (ids.length > 0) {
      const [ans] = await pool.query(`SELECT id, question_id, answer FROM answers WHERE question_id IN (${ids.map(() => '?').join(',')})`, ids);
      for (const r of ans) {
        if (!answersMap.has(r.question_id)) answersMap.set(r.question_id, []);
        answersMap.get(r.question_id).push({ id: r.id, answer: r.answer });
      }
    }
    
    return rows.map(question => ({
      id: question.id,
      text: question.text,
      answer: question.answer,
      acceptedAnswers: answersMap.get(question.id) || [],
      category: question.category,
      difficulty: question.difficulty
    }));
  } catch (error) {
    console.error('Lỗi khi lấy câu hỏi ngẫu nhiên:', error);
    throw error;
  }
}

// Kiểm tra câu trả lời
function normalize(text) {
  return (text || '').toString().trim().toLowerCase();
}

// Hỗ trợ kiểm tra với nhiều đáp án chấp nhận
function checkAnswer(userAnswer, correctAnswer, acceptedAnswers = []) {
  const normalizedUserAnswer = normalize(userAnswer);
  const normalizedCorrectAnswer = normalize(correctAnswer);
  
  // Kiểm tra với đáp án chính
  if (normalizedUserAnswer === normalizedCorrectAnswer) return true;
  
  // Kiểm tra với các đáp án bổ sung
  if (Array.isArray(acceptedAnswers)) {
    for (const a of acceptedAnswers) {
      // Xử lý cả trường hợp a là string và a là object {id, answer}
      const answerText = typeof a === 'string' ? a : (a && a.answer ? a.answer : '');
      if (normalize(answerText) === normalizedUserAnswer) return true;
    }
  }
  
  return false;
}

// Nhập câu hỏi từ file CSV hoặc TXT (tab-separated)
async function importQuestionsFromCSV(filePath) {
    try {
        let fileContent = fs.readFileSync(filePath, 'utf8');
        
        // Clean content: remove BOM, normalize line endings
        fileContent = fileContent.replace(/^\uFEFF/, ''); // Remove BOM
        fileContent = fileContent.replace(/\r\n/g, '\n').replace(/\r/g, '\n'); // Normalize line endings
        
        // Tự động phát hiện delimiter - ưu tiên header line
        let delimiter = ',';
        const firstLine = lines[0] || '';
        
        if (firstLine.includes('\t')) {
            delimiter = '\t';
        } else if (firstLine.includes(';')) {
            delimiter = ';';  
        } else if (firstLine.includes(',')) {
            delimiter = ',';
        } else if (fileContent.includes('\t')) {
            delimiter = '\t';
        } else if (fileContent.includes(';')) {
            delimiter = ';';
        }
        
        console.log('Detected delimiter:', delimiter);
        
        // Kiểm tra xem có header không
        const lines = fileContent.split('\n').filter(line => line.trim());
        let hasHeader = false;
        if (lines.length > 0) {
            const firstLine = lines[0].toLowerCase();
            // Kiểm tra các pattern header phổ biến
            if (firstLine.includes('qus') || firstLine.includes('ans') || 
                firstLine.includes('question') || firstLine.includes('answer') ||
                firstLine.includes('câu hỏi') || firstLine.includes('câu trả lời') ||
                firstLine.includes('cau hoi') || firstLine.includes('cau tra loi')) {
                hasHeader = true;
            }
        }
        
        console.log('Has header:', hasHeader);
        
        let records;
        try {
            if (hasHeader) {
                // Parse với header mode
                records = parse(fileContent, {
                    delimiter: delimiter,
                    quote: '"',
                    escape: '"',
                    columns: true, // Sử dụng dòng đầu làm header
                    skip_empty_lines: true,
                    trim: true,
                    bom: true
                });
            } else {
                // Parse không có header (legacy mode)
                records = parse(fileContent, {
                    delimiter: delimiter,
                    quote: '"',
                    escape: '"',
                    relax_quotes: true,
                    relax_column_count: true,
                    skip_empty_lines: true,
                    trim: true,
                    skip_records_with_error: true,
                    bom: true
                });
            }
        } catch (parseError) {
            console.log('CSV parsing failed, trying with different options:', parseError.message);
            
            // Try with more relaxed options
            try {
                records = parse(fileContent, {
                    delimiter: delimiter,
                    quote: false, // Disable quote handling
                    skip_empty_lines: true,
                    trim: true,
                    relax_column_count: true,
                    bom: true
                });
                hasHeader = false; // Disable header mode for fallback
            } catch (secondError) {
                console.log('Second parsing attempt failed, disabling header mode and using simple parsing:', secondError.message);
                
                // Force disable header mode and use simple approach
                hasHeader = false;
                if (delimiter === '\t') {
                    records = fileContent.split('\n')
                        .filter(line => line.trim())
                        .map(line => line.split('\t').map(cell => cell.trim()));
                } else {
                    // For CSV, we need to be more careful
                    throw new Error('File CSV không đúng format. Vui lòng đảm bảo:\n1. Header: Question,Answer\n2. Dữ liệu: "Câu hỏi",Đáp án\n3. Hoặc sử dụng Tab-separated (.txt)');
                }
            }
        }

        console.log('Parsed CSV records:', records);

        const questions = [];
        
        if (hasHeader) {
            // Xử lý records với header (objects)
            console.log('Processing header mode. Sample record keys:', Object.keys(records[0] || {}));
            
            for (const record of records) {
                let text, answer, category;
                const keys = Object.keys(record);
                console.log('Record keys:', keys);
                console.log('Record values:', Object.values(record));
                
                // Tìm cột câu hỏi
                const questionKey = keys.find(key => {
                    const lowerKey = key.toLowerCase().trim();
                    return lowerKey.includes('qus') || 
                           lowerKey.includes('question') ||
                           lowerKey.includes('câu hỏi') ||
                           lowerKey.includes('cau hoi');
                });
                
                // Tìm cột câu trả lời
                const answerKey = keys.find(key => {
                    const lowerKey = key.toLowerCase().trim();
                    return lowerKey.includes('ans') || 
                           lowerKey.includes('answer') ||
                           lowerKey.includes('câu trả lời') ||
                           lowerKey.includes('cau tra loi');
                });

                // Tìm cột category
                const categoryKey = keys.find(key => {
                    const lowerKey = key.toLowerCase().trim();
                    return lowerKey.includes('category') || 
                           lowerKey.includes('danh mục') ||
                           lowerKey.includes('danh muc') ||
                           lowerKey.includes('loại') ||
                           lowerKey.includes('loai');
                });
                
                console.log('Found questionKey:', questionKey, 'answerKey:', answerKey, 'categoryKey:', categoryKey);
                
                if (questionKey && answerKey) {
                    text = record[questionKey]?.trim();
                    answer = record[answerKey]?.trim();
                    category = categoryKey ? record[categoryKey]?.trim() : null;
                    console.log('Extracted - Question:', text?.substring(0, 50) + '...');
                    console.log('Extracted - Answer:', answer);
                    console.log('Extracted - Category:', category);
                } else {
                    // Fallback: lấy các cột theo thứ tự
                    if (keys.length >= 2) {
                        text = record[keys[0]]?.trim();
                        answer = record[keys[1]]?.trim();
                        category = keys.length >= 3 ? record[keys[2]]?.trim() : null;
                        console.log('Fallback mode - Question:', text?.substring(0, 50) + '...');
                        console.log('Fallback mode - Answer:', answer);
                        console.log('Fallback mode - Category:', category);
                    }
                }
                
                if (text && answer && text !== answer) {
                    // Validate category - chuyển đổi từ display name sang key
                    const categoryMapping = {
                        'Khởi Động': 'khoidong',
                        'Vượt Chướng Ngại Vật': 'vuotchuongngaivat', 
                        'Tăng Tốc': 'tangtoc',
                        'Về Đích': 'vedich',
                        'khoidong': 'khoidong',
                        'vuotchuongngaivat': 'vuotchuongngaivat',
                        'tangtoc': 'tangtoc',
                        'vedich': 'vedich'
                    };
                    const finalCategory = categoryMapping[category] || 'khoidong';
                    
                    questions.push({
                        text: text,
                        answer: answer,
                        category: finalCategory
                    });
                    console.log('Added question successfully with category:', finalCategory);
                } else {
                    console.log('Skipped question - text:', !!text, 'answer:', !!answer, 'same:', text === answer);
                }
            }
        } else {
            // Xử lý records không có header (arrays)
            for (const record of records) {
                if (record.length >= 2) {
                    const text = record[0]?.trim();
                    const answer = record[1]?.trim();
                    const category = record.length >= 3 ? record[2]?.trim() : null;
                    
                    if (text && answer) {
                        // Validate category - chuyển đổi từ display name sang key
                        const categoryMapping = {
                            'Khởi Động': 'khoidong',
                            'Vượt Chướng Ngại Vật': 'vuotchuongngaivat', 
                            'Tăng Tốc': 'tangtoc',
                            'Về Đích': 'vedich',
                            'khoidong': 'khoidong',
                            'vuotchuongngaivat': 'vuotchuongngaivat',
                            'tangtoc': 'tangtoc',
                            'vedich': 'vedich'
                        };
                        const finalCategory = categoryMapping[category] || 'khoidong';
                        
                        questions.push({
                            text: text,
                            answer: answer,
                            category: finalCategory
                        });
                        console.log('Added question (no header) with category:', finalCategory);
                    }
                }
            }
        }

        console.log('Processed questions:', questions);

        // Lưu vào database
        for (const question of questions) {
            await createQuestion(question);
        }

        return questions;
    } catch (error) {
        console.error('Lỗi khi parse CSV:', error);
        throw error;
    }
}

// Xóa câu hỏi
async function deleteQuestion(id, deletionReason = null, deletedBy = null, reportId = null) {
  try {
    // Lấy thông tin câu hỏi trước khi xóa để ghi log
    const question = await getQuestionById(id);
    if (!question) {
      return false;
    }

    // Ghi log trước khi xóa
    if (deletedBy) {
      try {
        const { logQuestionDeletion } = await import('./question-logs.js');
        await logQuestionDeletion({
          questionId: question.id,
          questionText: question.text,
          questionAnswer: question.answer,
          questionCategory: question.category,
          questionDifficulty: question.difficulty,
          questionCreatedBy: question.createdBy,
          questionCreatedAt: question.createdAt,
          deletedBy,
          deletionReason,
          reportId
        });
      } catch (logError) {
        console.warn('Không thể ghi log xóa câu hỏi:', logError);
        // Vẫn tiếp tục xóa câu hỏi ngay cả khi ghi log thất bại
      }
    }

    // Xóa câu hỏi
    const [result] = await pool.query('DELETE FROM questions WHERE id = ?', [id]);
    return result.affectedRows > 0;
  } catch (error) {
    console.error('Lỗi khi xóa câu hỏi:', error);
    throw error;
  }
}

// Xóa toàn bộ câu hỏi
export async function deleteAllQuestions() {
  try {
    const [result] = await pool.query('DELETE FROM questions');
    
    console.log(`✅ Đã xóa ${result.affectedRows} câu hỏi khỏi database`);
    
    return {
      success: true,
      deletedCount: result.affectedRows
    };
  } catch (error) {
    console.error('Lỗi khi xóa toàn bộ câu hỏi:', error);
    throw error;
  }
}

// Cập nhật câu hỏi
async function updateQuestion(id, question) {
  try {
    const { text, answer, category, difficulty, acceptedAnswers } = question;
    
    const [result] = await pool.query(
      'UPDATE questions SET text = ?, answer = ?, category = ?, difficulty = ? WHERE id = ?',
      [text, answer, category, difficulty, id]
    );
    // Cập nhật accepted answers nếu truyền vào
    if (Array.isArray(acceptedAnswers)) {
      // Xóa tất cả và thêm lại để đơn giản
      await pool.query('DELETE FROM answers WHERE question_id = ?', [id]);
      if (acceptedAnswers.length > 0) {
        const values = acceptedAnswers
          .map(a => (typeof a === 'string' ? a : a?.answer))
          .filter(a => a && a.toString().trim() !== '')
          .map(a => [id, a.toString().trim()]);
        if (values.length > 0) {
          const placeholders = values.map(() => '(?, ?)').join(',');
          await pool.query(`INSERT INTO answers (question_id, answer) VALUES ${placeholders}`, values.flat());
        }
      }
    }

    return result.affectedRows > 0;
  } catch (error) {
    console.error('Lỗi khi cập nhật câu hỏi:', error);
    throw error;
  }
}

// Thêm/xóa đáp án bổ sung riêng lẻ
async function addAcceptedAnswer(questionId, answer) {
  const a = (answer || '').toString().trim();
  if (!a) return null;
  const [res] = await pool.query('INSERT INTO answers (question_id, answer) VALUES (?, ?)', [questionId, a]);
  return { id: res.insertId, questionId, answer: a };
}

async function removeAcceptedAnswer(answerId) {
  const [res] = await pool.query('DELETE FROM answers WHERE id = ?', [answerId]);
  return res.affectedRows > 0;
}

// Thêm nhiều câu hỏi mẫu
async function seedSampleQuestions(userId) {
  const sampleQuestions = [
    {
      text: 'Thủ đô của Việt Nam là gì?',
      answer: 'Hà Nội',
      category: 'khoidong',
      difficulty: 'easy'
    },
    {
      text: 'Ngôn ngữ lập trình nào không phải là ngôn ngữ hướng đối tượng?',
      answer: 'C',
      category: 'vuotchuongngaivat',
      difficulty: 'medium'
    },
    {
      text: 'Đâu là một hệ điều hành mã nguồn mở?',
      answer: 'Linux',
      category: 'khoidong',
      difficulty: 'easy'
    },
    {
      text: 'HTML là viết tắt của gì?',
      answer: 'Hyper Text Markup Language',
      category: 'khoidong',
      difficulty: 'easy'
    },
    {
      text: 'Đâu là một ngôn ngữ lập trình phía máy chủ (server-side)?',
      answer: 'PHP',
      category: 'vuotchuongngaivat',
      difficulty: 'easy'
    },
    {
      text: 'Hệ quản trị cơ sở dữ liệu nào là mã nguồn mở?',
      answer: 'MySQL',
      category: 'tangtoc',
      difficulty: 'medium'
    },
    {
      text: 'Giao thức nào được sử dụng để truyền tải trang web?',
      answer: 'HTTP',
      category: 'khoidong',
      difficulty: 'easy'
    },
    {
      text: 'Đơn vị đo tốc độ xử lý của CPU là gì?',
      answer: 'Hertz',
      category: 'tangtoc',
      difficulty: 'medium'
    },
    {
      text: 'Ngôn ngữ lập trình nào được phát triển bởi Google?',
      answer: 'Go',
      category: 'vedich',
      difficulty: 'medium'
    },
    {
      text: 'Đâu là một framework JavaScript phổ biến?',
      answer: 'React',
      category: 'tangtoc',
      difficulty: 'medium'
    },
    {
      text: 'Hệ điều hành Android được phát triển dựa trên nhân (kernel) nào?',
      answer: 'Linux',
      category: 'vedich',
      difficulty: 'medium'
    },
    {
      text: 'Đâu là một công cụ quản lý phiên bản mã nguồn?',
      answer: 'Git',
      category: 'khoidong',
      difficulty: 'easy'
    }
  ];

  try {
    for (const question of sampleQuestions) {
      await createQuestion({ ...question, createdBy: userId });
    }
    console.log('Đã thêm câu hỏi mẫu thành công!');
    return true;
  } catch (error) {
    console.error('Lỗi khi thêm câu hỏi mẫu:', error);
    return false;
  }
}

export {
  createQuestion,
  getQuestionById,
  getAllQuestions,
  getRandomQuestions,
  checkAnswer,
  importQuestionsFromCSV,
  deleteQuestion,
  updateQuestion,
  seedSampleQuestions,
  addAcceptedAnswer,
  removeAcceptedAnswer
};
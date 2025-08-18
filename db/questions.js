import { pool } from './index.js';
import fs from 'fs';
import { parse } from 'csv-parse/sync';

// Thêm câu hỏi mới
async function createQuestion(questionData) {
    try {
        const { text, answer, category = 'general', difficulty = 'medium', createdBy = null } = questionData;
        
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
    return {
      id: question.id,
      text: question.text,
      answer: question.answer,
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
    return rows.map(question => ({
      id: question.id,
      text: question.text,
      answer: question.answer,
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

// Lấy câu hỏi ngẫu nhiên
async function getRandomQuestions(count = 12, category = null) {
  try {
    let query = 'SELECT * FROM questions';
    const params = [];
    
    if (category) {
      query += ' WHERE category = ?';
      params.push(category);
    }
    
    query += ' ORDER BY RAND() LIMIT ?';
    params.push(count);
    
    const [rows] = await pool.query(query, params);
    
    return rows.map(question => ({
      id: question.id,
      text: question.text,
      answer: question.answer,
      category: question.category,
      difficulty: question.difficulty
    }));
  } catch (error) {
    console.error('Lỗi khi lấy câu hỏi ngẫu nhiên:', error);
    throw error;
  }
}

// Kiểm tra câu trả lời
function checkAnswer(userAnswer, correctAnswer) {
  const normalizedUserAnswer = userAnswer.trim().toLowerCase();
  const normalizedCorrectAnswer = correctAnswer.trim().toLowerCase();
  return normalizedUserAnswer === normalizedCorrectAnswer;
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
                let text, answer;
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
                
                console.log('Found questionKey:', questionKey, 'answerKey:', answerKey);
                
                if (questionKey && answerKey) {
                    text = record[questionKey]?.trim();
                    answer = record[answerKey]?.trim();
                    console.log('Extracted - Question:', text?.substring(0, 50) + '...');
                    console.log('Extracted - Answer:', answer);
                } else {
                    // Fallback: lấy 2 cột đầu tiên
                    if (keys.length >= 2) {
                        text = record[keys[0]]?.trim();
                        answer = record[keys[1]]?.trim();
                        console.log('Fallback mode - Question:', text?.substring(0, 50) + '...');
                        console.log('Fallback mode - Answer:', answer);
                    }
                }
                
                if (text && answer && text !== answer) {
                    questions.push({
                        text: text,
                        answer: answer
                    });
                    console.log('Added question successfully');
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
                    
                    if (text && answer) {
                        questions.push({
                            text: text,
                            answer: answer
                        });
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
async function deleteQuestion(id) {
  try {
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
    const { text, answer, category, difficulty } = question;
    
    const [result] = await pool.query(
      'UPDATE questions SET text = ?, answer = ?, category = ?, difficulty = ? WHERE id = ?',
      [text, answer, category, difficulty, id]
    );
    
    return result.affectedRows > 0;
  } catch (error) {
    console.error('Lỗi khi cập nhật câu hỏi:', error);
    throw error;
  }
}

// Thêm nhiều câu hỏi mẫu
async function seedSampleQuestions(userId) {
  const sampleQuestions = [
    {
      text: 'Thủ đô của Việt Nam là gì?',
      answer: 'Hà Nội',
      category: 'geography',
      difficulty: 'easy'
    },
    {
      text: 'Ngôn ngữ lập trình nào không phải là ngôn ngữ hướng đối tượng?',
      answer: 'C',
      category: 'programming',
      difficulty: 'medium'
    },
    {
      text: 'Đâu là một hệ điều hành mã nguồn mở?',
      answer: 'Linux',
      category: 'technology',
      difficulty: 'easy'
    },
    {
      text: 'HTML là viết tắt của gì?',
      answer: 'Hyper Text Markup Language',
      category: 'web',
      difficulty: 'easy'
    },
    {
      text: 'Đâu là một ngôn ngữ lập trình phía máy chủ (server-side)?',
      answer: 'PHP',
      category: 'programming',
      difficulty: 'easy'
    },
    {
      text: 'Hệ quản trị cơ sở dữ liệu nào là mã nguồn mở?',
      answer: 'MySQL',
      category: 'database',
      difficulty: 'medium'
    },
    {
      text: 'Giao thức nào được sử dụng để truyền tải trang web?',
      answer: 'HTTP',
      category: 'networking',
      difficulty: 'easy'
    },
    {
      text: 'Đơn vị đo tốc độ xử lý của CPU là gì?',
      answer: 'Hertz',
      category: 'hardware',
      difficulty: 'medium'
    },
    {
      text: 'Ngôn ngữ lập trình nào được phát triển bởi Google?',
      answer: 'Go',
      category: 'programming',
      difficulty: 'medium'
    },
    {
      text: 'Đâu là một framework JavaScript phổ biến?',
      answer: 'React',
      category: 'web',
      difficulty: 'medium'
    },
    {
      text: 'Hệ điều hành Android được phát triển dựa trên nhân (kernel) nào?',
      answer: 'Linux',
      category: 'mobile',
      difficulty: 'medium'
    },
    {
      text: 'Đâu là một công cụ quản lý phiên bản mã nguồn?',
      answer: 'Git',
      category: 'development',
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
  seedSampleQuestions
};
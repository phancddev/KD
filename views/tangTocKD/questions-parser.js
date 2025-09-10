import { pool } from '../../db/index.js';
import fs from 'fs';
import { parse } from 'csv-parse/sync';

// Hàm tách link ảnh từ câu hỏi
function extractImageUrl(questionText) {
    if (!questionText) return null;
    
    // Tìm pattern: @https://... data:image/...
    const imagePattern = /@(https:\/\/[^\s]+)\s+data:image\/[^\s]+/;
    const match = questionText.match(imagePattern);
    
    if (match) {
        return match[1]; // Trả về URL ảnh
    }
    
    return null;
}

// Hàm loại bỏ link ảnh khỏi câu hỏi
function cleanQuestionText(questionText) {
    if (!questionText) return questionText;
    
    // Loại bỏ pattern: @https://... data:image/...
    return questionText.replace(/@https:\/\/[^\s]+\s+data:image\/[^\s]+/g, '').trim();
}

// Thêm câu hỏi Tăng Tốc mới
async function createTangTocQuestion(questionData) {
    try {
        const { 
            questionNumber, 
            text, 
            answer, 
            category = 'tangtoc', 
            difficulty = 'medium', 
            createdBy = null 
        } = questionData;
        
        if (!text || !answer || !questionNumber) {
            throw new Error('Câu hỏi, đáp án và số câu không được để trống');
        }

        // Tách link ảnh nếu có
        const imageUrl = extractImageUrl(text);
        const cleanText = cleanQuestionText(text);
        
        // Xác định thời gian dựa trên số câu
        const timeLimit = getTimeLimitByQuestionNumber(questionNumber);

        const query = `
            INSERT INTO questions (text, answer, category, difficulty, question_number, image_url, time_limit, created_by, created_at) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())
        `;
        
        const [result] = await pool.query(query, [
            cleanText, 
            answer, 
            category, 
            difficulty, 
            questionNumber, 
            imageUrl, 
            timeLimit, 
            createdBy
        ]);
        
        console.log('Đã tạo câu hỏi Tăng Tốc mới với ID:', result.insertId);
        
        return {
            id: result.insertId,
            text: cleanText,
            answer,
            category,
            difficulty,
            questionNumber,
            imageUrl,
            timeLimit,
            createdBy,
            createdAt: new Date()
        };
    } catch (error) {
        console.error('Lỗi khi tạo câu hỏi Tăng Tốc:', error);
        throw error;
    }
}

// Lấy thời gian dựa trên số câu
function getTimeLimitByQuestionNumber(questionNumber) {
    const timeLimits = {
        1: 10,  // Câu 1: 10 giây
        2: 20,  // Câu 2: 20 giây
        3: 30,  // Câu 3: 30 giây
        4: 40   // Câu 4: 40 giây
    };
    
    return timeLimits[questionNumber] || null;
}

// Lấy câu hỏi Tăng Tốc ngẫu nhiên theo logic đặc biệt
async function getRandomTangTocQuestions() {
    try {
        console.log('🔍 [TangToc] getRandomTangTocQuestions start');
        // Lấy 4 câu hỏi Tăng Tốc, mỗi số câu 1 câu
        const questions = [];
        
        for (let questionNumber = 1; questionNumber <= 4; questionNumber++) {
            const query = `
                SELECT * FROM questions 
                WHERE category = 'tangtoc' AND question_number = ? 
                ORDER BY RAND() 
                LIMIT 1
            `;
            
            console.log('🔍 [TangToc] querying questions for number =', questionNumber);
            const [rows] = await pool.query(query, [questionNumber]);
            console.log('🔍 [TangToc] found rows =', rows.length);
            
            if (rows.length > 0) {
                const question = rows[0];
                
                // Lấy accepted answers từ bảng tangtoc_answers
                console.log('🔍 [TangToc] fetching accepted answers for question id =', question.id);
                const [answerRows] = await pool.query(
                    'SELECT id, answer FROM tangtoc_answers WHERE question_id = ?', 
                    [question.id]
                );
                console.log('🔍 [TangToc] accepted answers count =', answerRows.length);
                const acceptedAnswers = answerRows.map(r => ({ id: r.id, answer: r.answer }));
                
                questions.push({
                    id: question.id,
                    text: question.text,
                    answer: question.answer,
                    acceptedAnswers,
                    category: question.category,
                    difficulty: question.difficulty,
                    questionNumber: question.question_number,
                    imageUrl: question.image_url,
                    timeLimit: question.time_limit || getTimeLimitByQuestionNumber(question.question_number)
                });
            }
        }
        
        // Sắp xếp theo số câu
        questions.sort((a, b) => a.questionNumber - b.questionNumber);
        console.log('✅ [TangToc] total questions to return =', questions.length);
        
        return questions;
    } catch (error) {
        console.error('❌ [TangToc] Lỗi khi lấy câu hỏi Tăng Tốc ngẫu nhiên:', error);
        console.error('   code:', error?.code, 'errno:', error?.errno, 'sqlState:', error?.sqlState, 'sqlMessage:', error?.sqlMessage);
        console.error('   sql:', error?.sql);
        throw error;
    }
}

// Nhập câu hỏi Tăng Tốc từ file CSV
async function importTangTocQuestionsFromCSV(filePath) {
    try {
        let fileContent = fs.readFileSync(filePath, 'utf8');
        
        // Clean content: remove BOM, normalize line endings
        fileContent = fileContent.replace(/^\uFEFF/, ''); // Remove BOM
        fileContent = fileContent.replace(/\r\n/g, '\n').replace(/\r/g, '\n'); // Normalize line endings
        
        // Tự động phát hiện delimiter
        let delimiter = ',';
        const lines = fileContent.split('\n').filter(line => line.trim());
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
        let hasHeader = false;
        if (lines.length > 0) {
            const firstLineLower = lines[0].toLowerCase();
            if (firstLineLower.includes('qus') || firstLineLower.includes('ans') || 
                firstLineLower.includes('question') || firstLineLower.includes('answer') ||
                firstLineLower.includes('câu hỏi') || firstLineLower.includes('câu trả lời') ||
                firstLineLower.includes('cau hoi') || firstLineLower.includes('cau tra loi') ||
                firstLineLower.includes('số') || firstLineLower.includes('so')) {
                hasHeader = true;
            }
        }
        
        console.log('Has header:', hasHeader);
        
        let records;
        try {
            if (hasHeader) {
                records = parse(fileContent, {
                    delimiter: delimiter,
                    quote: '"',
                    escape: '"',
                    columns: true,
                    skip_empty_lines: true,
                    trim: true,
                    bom: true
                });
            } else {
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
            
            try {
                records = parse(fileContent, {
                    delimiter: delimiter,
                    quote: false,
                    skip_empty_lines: true,
                    trim: true,
                    relax_column_count: true,
                    bom: true
                });
                hasHeader = false;
            } catch (secondError) {
                console.log('Second parsing attempt failed, using simple parsing:', secondError.message);
                
                hasHeader = false;
                if (delimiter === '\t') {
                    records = fileContent.split('\n')
                        .filter(line => line.trim())
                        .map(line => line.split('\t').map(cell => cell.trim()));
                } else {
                    throw new Error('File CSV không đúng format. Vui lòng đảm bảo:\n1. Header: Question,Answer,Category,QuestionNumber\n2. Dữ liệu: "Câu hỏi",Đáp án,"Tăng Tốc",1\n3. Hoặc sử dụng Tab-separated (.txt)');
                }
            }
        }

        console.log('Parsed CSV records:', records);

        const questions = [];
        
        if (hasHeader) {
            // Xử lý records với header (objects)
            console.log('Processing header mode. Sample record keys:', Object.keys(records[0] || {}));
            
            for (const record of records) {
                let questionNumber, text, answer, category;
                const keys = Object.keys(record);
                console.log('Record keys:', keys);
                console.log('Record values:', Object.values(record));
                
                // Tìm cột số câu hỏi
                const questionNumberKey = keys.find(key => {
                    const lowerKey = key.toLowerCase().trim();
                    return lowerKey.includes('số') || 
                           lowerKey.includes('so') ||
                           lowerKey.includes('number') ||
                           lowerKey.includes('question_number');
                });
                
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
                
                console.log('Found questionNumberKey:', questionNumberKey, 'questionKey:', questionKey, 'answerKey:', answerKey, 'categoryKey:', categoryKey);
                
                if (questionKey && answerKey && questionNumberKey) {
                    questionNumber = parseInt(record[questionNumberKey]) || null;
                    text = record[questionKey]?.trim();
                    answer = record[answerKey]?.trim();
                    category = categoryKey ? record[categoryKey]?.trim() : 'tangtoc';
                    
                    console.log('Extracted - QuestionNumber:', questionNumber);
                    console.log('Extracted - Question:', text?.substring(0, 50) + '...');
                    console.log('Extracted - Answer:', answer);
                    console.log('Extracted - Category:', category);
                } else {
                    // Fallback: lấy các cột theo thứ tự
                    if (keys.length >= 3) {
                        questionNumber = parseInt(record[keys[0]]) || null;
                        text = record[keys[1]]?.trim();
                        answer = record[keys[2]]?.trim();
                        category = keys.length >= 4 ? record[keys[3]]?.trim() : 'tangtoc';
                        console.log('Fallback mode - QuestionNumber:', questionNumber);
                        console.log('Fallback mode - Question:', text?.substring(0, 50) + '...');
                        console.log('Fallback mode - Answer:', answer);
                        console.log('Fallback mode - Category:', category);
                    }
                }
                
                if (text && answer && questionNumber && questionNumber >= 1 && questionNumber <= 4) {
                    // Validate category
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
                    const finalCategory = categoryMapping[category] || 'tangtoc';
                    
                    questions.push({
                        questionNumber: questionNumber,
                        text: text,
                        answer: answer,
                        category: finalCategory
                    });
                    console.log('Added question successfully with category:', finalCategory, 'questionNumber:', questionNumber);
                } else {
                    console.log('Skipped question - text:', !!text, 'answer:', !!answer, 'questionNumber:', questionNumber);
                }
            }
        } else {
            // Xử lý records không có header (arrays)
            for (const record of records) {
                if (record.length >= 3) {
                    const questionNumber = parseInt(record[0]) || null;
                    const text = record[1]?.trim();
                    const answer = record[2]?.trim();
                    const category = record.length >= 4 ? record[3]?.trim() : 'tangtoc';
                    
                    if (text && answer && questionNumber && questionNumber >= 1 && questionNumber <= 4) {
                        // Validate category
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
                        const finalCategory = categoryMapping[category] || 'tangtoc';
                        
                        questions.push({
                            questionNumber: questionNumber,
                            text: text,
                            answer: answer,
                            category: finalCategory
                        });
                        console.log('Added question (no header) with category:', finalCategory, 'questionNumber:', questionNumber);
                    }
                }
            }
        }

        console.log('Processed questions:', questions);

        // Lưu vào database
        for (const question of questions) {
            await createTangTocQuestion(question);
        }

        return questions;
    } catch (error) {
        console.error('Lỗi khi parse CSV Tăng Tốc:', error);
        throw error;
    }
}

export {
    createTangTocQuestion,
    getRandomTangTocQuestions,
    importTangTocQuestionsFromCSV,
    extractImageUrl,
    cleanQuestionText,
    getTimeLimitByQuestionNumber
};

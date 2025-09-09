#!/usr/bin/env python3
"""
Tool Parser cho câu hỏi Tăng Tốc
Hỗ trợ đọc file CSV, TXT và XLSX
"""

import pandas as pd
import sys
import json
import re
import argparse
from pathlib import Path

def extract_image_url(text):
    """
    Trích xuất URL ảnh từ text câu hỏi
    Format: @https://... data:image/gif;base64,...
    """
    if not text or not isinstance(text, str):
        return None, text
    
    # Tìm pattern @https://... data:image/gif;base64,...
    pattern = r'@(https://[^\s]+)\s+data:image/gif;base64,[^\s]*'
    match = re.search(pattern, text)
    
    if match:
        image_url = match.group(1)
        # Loại bỏ phần @https://... data:image/gif;base64,... khỏi text
        clean_text = re.sub(pattern, '', text).strip()
        return image_url, clean_text
    
    return None, text

def parse_tangtoc_file(file_path):
    """
    Parse file câu hỏi Tăng Tốc
    """
    try:
        file_path = Path(file_path)
        
        if not file_path.exists():
            raise ValueError(f"File không tồn tại: {file_path}")
        
        # Đọc file dựa trên extension
        if file_path.suffix.lower() in ['.xlsx', '.xls']:
            # Đọc Excel file
            df = pd.read_excel(file_path, header=None)
        elif file_path.suffix.lower() in ['.csv', '.txt']:
            # Thử các delimiter và encoding khác nhau
            df = None
            
            # Đọc content trước để detect delimiter
            with open(file_path, 'r', encoding='utf-8-sig', errors='ignore') as f:
                first_line = f.readline().strip()
                
            # Detect delimiter
            if '\t' in first_line:
                delimiter = '\t'
            elif ';' in first_line:
                delimiter = ';'
            else:
                delimiter = ','
            
            # Thử parse với delimiter detected
            encodings = ['utf-8-sig', 'utf-8', 'latin-1', 'cp1252']
            
            for encoding in encodings:
                try:
                    df = pd.read_csv(
                        file_path, 
                        header=None, 
                        encoding=encoding,
                        delimiter=delimiter,
                        quotechar='"',
                        skipinitialspace=True,
                        on_bad_lines='skip'
                    )
                    break
                except Exception as e:
                    continue
            
            if df is None:
                # Last resort: manual parsing line by line
                try:
                    questions_data = []
                    with open(file_path, 'r', encoding='utf-8-sig', errors='ignore') as f:
                        lines = f.readlines()
                    
                    for i, line in enumerate(lines):
                        line = line.strip()
                        if not line:
                            continue
                            
                        # Split by detected delimiter
                        if delimiter == '\t':
                            parts = line.split('\t')
                        elif delimiter == ';':
                            parts = line.split(';')
                        else:
                            # For comma, need to handle quotes
                            import csv
                            import io
                            try:
                                reader = csv.reader(io.StringIO(line))
                                parts = next(reader)
                            except:
                                parts = line.split(',')
                        
                        if len(parts) >= 4:
                            questions_data.append(parts)
                    
                    if not questions_data:
                        raise ValueError("Không tìm thấy dữ liệu hợp lệ trong file")
                    
                    # Convert to DataFrame
                    df = pd.DataFrame(questions_data)
                    
                except Exception as e:
                    raise ValueError(f"Không thể đọc file: {str(e)}")
        else:
            raise ValueError(f"Định dạng file không hỗ trợ: {file_path.suffix}")
        
        # Kiểm tra có ít nhất 4 cột
        if df.shape[1] < 4:
            raise ValueError(f"File phải có ít nhất 4 cột. Tìm thấy {df.shape[1]} cột")
        
        # Lấy 4 cột đầu và đặt tên cột
        df = df.iloc[:, :4]
        df.columns = ['question_number', 'text', 'answer', 'category']
        
        # Bỏ qua dòng header nếu có
        start_row = 0
        if df.shape[0] > 0:
            first_row = df.iloc[0]
            # Kiểm tra xem dòng đầu có phải header không
            col_1 = str(first_row.iloc[0]).lower().strip() if pd.notna(first_row.iloc[0]) else ""
            col_2 = str(first_row.iloc[1]).lower().strip() if pd.notna(first_row.iloc[1]) else ""
            
            # Chỉ detect header nếu cột 1 là text và không phải số
            is_header = False
            try:
                # Nếu cột 1 có thể convert thành số, không phải header
                int(float(col_1))
            except (ValueError, TypeError):
                # Nếu cột 1 không phải số, kiểm tra xem có phải header không
                if any(keyword in col_1 for keyword in ['question', 'qus', 'câu hỏi', 'cau hoi', 'số câu', 'so cau']) or \
                   any(keyword in col_2 for keyword in ['answer', 'ans', 'câu trả lời', 'cau tra loi']):
                    is_header = True
            
            if is_header:
                start_row = 1
        
        questions = []
        skipped_rows = []
        
        # Parse từng dòng
        for idx in range(start_row, df.shape[0]):
            row = df.iloc[idx]
            
            try:
                # Lấy dữ liệu từ các cột
                col_1 = row.iloc[0] if pd.notna(row.iloc[0]) else ""
                col_2 = row.iloc[1] if pd.notna(row.iloc[1]) else ""
                col_3 = row.iloc[2] if pd.notna(row.iloc[2]) else ""
                col_4 = row.iloc[3] if pd.notna(row.iloc[3]) else ""
                
                # Convert to string và trim
                question_number_str = str(col_1).strip()
                text = str(col_2).strip()
                answer = str(col_3).strip()
                category = str(col_4).strip()
                
                # Validate dữ liệu
                if not question_number_str or not text or not answer:
                    skipped_rows.append({
                        "row": idx + 1, 
                        "question_number": question_number_str,
                        "text": text,
                        "answer": answer,
                        "reason": "Thiếu dữ liệu bắt buộc"
                    })
                    continue
                
                if question_number_str == "nan" or text == "nan" or answer == "nan":
                    skipped_rows.append({
                        "row": idx + 1, 
                        "question_number": question_number_str,
                        "text": text,
                        "answer": answer,
                        "reason": "Dữ liệu không hợp lệ (nan)"
                    })
                    continue
                
                # Chuyển đổi question_number thành int
                try:
                    question_number = int(float(question_number_str))
                except (ValueError, TypeError) as e:
                    skipped_rows.append({
                        "row": idx + 1, 
                        "question_number": question_number_str,
                        "text": text,
                        "answer": answer,
                        "reason": f"Số câu không hợp lệ: {str(e)}"
                    })
                    continue
                
                # Kiểm tra question_number hợp lệ
                if question_number not in [1, 2, 3, 4]:
                    skipped_rows.append({
                        "row": idx + 1, 
                        "question_number": question_number_str,
                        "text": text,
                        "answer": answer,
                        "reason": f"Số câu phải là 1, 2, 3, hoặc 4 (tìm thấy: {question_number})"
                    })
                    continue
                
                # Trích xuất image_url và clean text
                image_url, clean_text = extract_image_url(text)
                
                # Tạo câu hỏi
                question = {
                    'question_number': question_number,
                    'text': clean_text if clean_text else text,
                    'answer': answer,
                    'category': 'tangtoc',
                    'image_url': image_url,
                    'time_limit': question_number * 10  # 10s, 20s, 30s, 40s
                }
                
                questions.append(question)
                
            except Exception as e:
                skipped_rows.append({
                    "row": idx + 1, 
                    "question_number": str(row.iloc[0]) if pd.notna(row.iloc[0]) else "",
                    "text": str(row.iloc[1]) if pd.notna(row.iloc[1]) else "",
                    "answer": str(row.iloc[2]) if pd.notna(row.iloc[2]) else "",
                    "reason": f"Lỗi xử lý: {str(e)}"
                })
                continue
        
        return {
            'questions': questions,
            'skipped_rows': skipped_rows,
            'total_processed': len(questions) + len(skipped_rows),
            'success_count': len(questions),
            'skipped_count': len(skipped_rows)
        }
        
    except Exception as e:
        raise Exception(f"Lỗi khi parse file: {str(e)}")

def main():
    parser = argparse.ArgumentParser(description='Parser câu hỏi Tăng Tốc')
    parser.add_argument('file_path', help='Đường dẫn file cần parse')
    parser.add_argument('--output', '-o', help='File output JSON (optional)')
    parser.add_argument('--format', '-f', choices=['json', 'csv'], default='json', 
                       help='Format output (default: json)')
    
    args = parser.parse_args()
    
    try:
        # Parse file
        result = parse_tangtoc_file(args.file_path)
        questions = result['questions']
        skipped_rows = result['skipped_rows']
        
        if not questions:
            print("Không tìm thấy câu hỏi hợp lệ nào trong file")
            if skipped_rows:
                print(f"Có {len(skipped_rows)} dòng bị bỏ qua:")
                for row in skipped_rows[:5]:  # Show first 5
                    print(f"  - Dòng {row['row']}: {row['reason']}")
            sys.exit(1)
        
        # Thống kê
        stats = {
            'total_questions': len(questions),
            'question_1': len([q for q in questions if q['question_number'] == 1]),
            'question_2': len([q for q in questions if q['question_number'] == 2]),
            'question_3': len([q for q in questions if q['question_number'] == 3]),
            'question_4': len([q for q in questions if q['question_number'] == 4]),
            'with_images': len([q for q in questions if q['image_url']]),
            'skipped_count': len(skipped_rows),
            'success_count': len(questions),
            'total_processed': result['total_processed']
        }
        
        # Output
        if args.output:
            if args.format == 'json':
                with open(args.output, 'w', encoding='utf-8') as f:
                    json.dump({
                        'questions': questions,
                        'stats': stats,
                        'skipped_rows': skipped_rows[:10]  # Only include first 10 skipped rows
                    }, f, ensure_ascii=False, indent=2)
            else:  # csv
                df = pd.DataFrame(questions)
                df.to_csv(args.output, index=False, encoding='utf-8')
            print(f"Đã lưu kết quả vào {args.output}")
        else:
            # In ra console
            print(json.dumps({
                'questions': questions,
                'stats': stats,
                'skipped_rows': skipped_rows[:10]  # Only include first 10 skipped rows
            }, ensure_ascii=False, indent=2))
        
        # In thống kê
        print(f"\nThống kê:")
        print(f"- Tổng câu hỏi hợp lệ: {stats['total_questions']}")
        print(f"- Câu 1 (10s): {stats['question_1']}")
        print(f"- Câu 2 (20s): {stats['question_2']}")
        print(f"- Câu 3 (30s): {stats['question_3']}")
        print(f"- Câu 4 (40s): {stats['question_4']}")
        print(f"- Có ảnh: {stats['with_images']}")
        print(f"- Dòng bị bỏ qua: {stats['skipped_count']}")
        print(f"- Tổng dòng xử lý: {stats['total_processed']}")
        
        if skipped_rows:
            print(f"\nCác dòng bị bỏ qua (hiển thị 5 dòng đầu):")
            for row in skipped_rows[:5]:
                print(f"  - Dòng {row['row']}: {row['reason']}")
        
    except Exception as e:
        print(f"Lỗi: {str(e)}", file=sys.stderr)
        sys.exit(1)

if __name__ == '__main__':
    main()

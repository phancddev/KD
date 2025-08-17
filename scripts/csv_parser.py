#!/usr/bin/env python3
"""
CSV/Excel Parser Tool
Nhận diện chính xác cột A = Câu hỏi, cột B = Câu trả lời
"""

import sys
import json
import pandas as pd
import os
from pathlib import Path

def parse_file(file_path):
    """Parse CSV hoặc Excel file và trả về JSON"""
    try:
        file_path = Path(file_path)
        
        if not file_path.exists():
            return {"success": False, "error": f"File không tồn tại: {file_path}"}
        
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
            
            # print(f"Detected delimiter: '{delimiter}'")
            
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
                        on_bad_lines='skip'  # Skip bad lines instead of failing
                    )
                    # print(f"Successfully parsed with encoding: {encoding}")
                    break
                except Exception as e:
                    # print(f"Failed with encoding {encoding}: {e}")
                    continue
            
            if df is None:
                # Last resort: manual parsing line by line
                # print("Pandas failed, trying manual parsing...")
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
                        
                        if len(parts) >= 2:
                            questions_data.append(parts)
                    
                    if not questions_data:
                        return {"success": False, "error": "Không tìm thấy dữ liệu hợp lệ trong file"}
                    
                    # Convert to DataFrame
                    df = pd.DataFrame(questions_data)
                    # print(f"Manual parsing successful, found {len(questions_data)} rows")
                    
                except Exception as e:
                    return {"success": False, "error": f"Không thể đọc file: {str(e)}"}
        else:
            return {"success": False, "error": f"Định dạng file không hỗ trợ: {file_path.suffix}"}
        
        # Kiểm tra có ít nhất 2 cột
        if df.shape[1] < 2:
            return {"success": False, "error": "File phải có ít nhất 2 cột (A: Câu hỏi, B: Câu trả lời)"}
        
        questions = []
        skipped_rows = []
        
        # Bỏ qua dòng header nếu có
        start_row = 0
        if df.shape[0] > 0:
            first_row = df.iloc[0]
            # Kiểm tra xem dòng đầu có phải header không
            col_a = str(first_row.iloc[0]).lower().strip() if pd.notna(first_row.iloc[0]) else ""
            col_b = str(first_row.iloc[1]).lower().strip() if pd.notna(first_row.iloc[1]) else ""
            
            if any(keyword in col_a for keyword in ['question', 'qus', 'câu hỏi', 'cau hoi']) or \
               any(keyword in col_b for keyword in ['answer', 'ans', 'câu trả lời', 'cau tra loi']):
                start_row = 1
                # print(f"Detected header row, skipping first row")
        
        # Parse từng dòng
        for idx in range(start_row, df.shape[0]):
            row = df.iloc[idx]
            
            # Lấy cột A và B
            col_a = row.iloc[0] if pd.notna(row.iloc[0]) else ""
            col_b = row.iloc[1] if pd.notna(row.iloc[1]) else ""
            
            # Convert to string và trim
            question = str(col_a).strip()
            answer = str(col_b).strip()
            
            # Validate
            if not question or not answer or question == "nan" or answer == "nan":
                skipped_rows.append({"row": idx + 1, "question": question, "answer": answer, "reason": "Thiếu câu hỏi hoặc câu trả lời"})
                continue
            
            if question == answer:
                skipped_rows.append({"row": idx + 1, "question": question, "answer": answer, "reason": "Câu hỏi và đáp án giống nhau"})
                continue
            
            questions.append({
                "text": question,
                "answer": answer
            })
        
        return {
            "success": True,
            "questions": questions,
            "total": len(questions),
            "skipped": len(skipped_rows),
            "skipped_details": skipped_rows[:5],  # Chỉ show 5 dòng đầu bị skip
            "file_info": {
                "name": file_path.name,
                "size": file_path.stat().st_size,
                "rows": df.shape[0],
                "cols": df.shape[1]
            }
        }
        
    except Exception as e:
        return {"success": False, "error": f"Lỗi khi đọc file: {str(e)}"}

def main():
    if len(sys.argv) != 2:
        print(json.dumps({"success": False, "error": "Usage: python csv_parser.py <file_path>"}))
        sys.exit(1)
    
    file_path = sys.argv[1]
    result = parse_file(file_path)
    print(json.dumps(result, ensure_ascii=False, indent=2))

if __name__ == "__main__":
    main()
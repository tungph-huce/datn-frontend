import * as XLSX from 'xlsx';
import { parseStudentImport, studentImportWorkbook } from './student-import';

describe('Import Excel theo ngành', () => {
  const majors = [{ id: 1, code: 'CNPM', name: 'Công nghệ phần mềm' }, { id: 2, code: 'KHDL', name: 'Khoa học dữ liệu' }];
  const workbook = (rows: any[][]) => { const w = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(w, XLSX.utils.aoa_to_sheet(rows), 'SV'); return w; };
  const headers = ['MSSV', 'Họ và tên', 'Lớp', 'Mã ngành', 'Ngành', 'Email'];
  it('mẫu tải xuống đọc lại giữ số 0 đầu và ngành đã chọn', () => {
    const w = studentImportWorkbook(majors, 2);
    const serialized = XLSX.write(w, { type: 'array', bookType: 'xlsx' });
    const rows = parseStudentImport(XLSX.read(serialized, { type: 'array' }), majors);
    expect(rows[0].student_code).toBe('00000168');
    expect(rows.every(s => s.major_id === 2 && s.major_code === 'KHDL')).toBeTrue();
    expect(w.SheetNames).toContain('DanhMucChuyenNganh');
  });
  it('đọc nhiều ngành trong một file theo từng dòng', () => {
    const rows = parseStudentImport(workbook([headers, ['00168','An','68A','CNPM','',''], ['00267','Bình','67A','KHDL','','']]), majors);
    expect(rows.map(s => s.major_id)).toEqual([1,2]);
  });
  it('chặn mẫu cũ thiếu ngành', () => {
    expect(() => parseStudentImport(workbook([['MSSV','Họ và tên','Lớp'],['00168','An','68A']]), majors)).toThrowError(/Mã ngành/);
  });
  it('chặn ngành lạ, tên sai, mã trống và không bỏ qua dòng lỗi', () => {
    for (const [code,name] of [['OTHER',''],['CNPM','Sai tên'],['','']]) {
      expect(() => parseStudentImport(workbook([headers,['00168','An','68A','CNPM',''],['00268','Bình','68A',code,name]]), majors)).toThrowError(/Dòng 3/);
    }
  });
  it('chặn trùng MSSV và khóa không hợp lệ', () => {
    expect(() => parseStudentImport(workbook([headers,['00168','An','68A','CNPM'],['00168','Bình','68A','CNPM']]), majors)).toThrowError(/trùng/);
    expect(() => parseStudentImport(workbook([headers,['001XX','An','68A','CNPM']]), majors)).toThrowError(/khóa/);
  });
});

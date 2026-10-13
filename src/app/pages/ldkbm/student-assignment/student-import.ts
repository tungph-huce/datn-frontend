import * as XLSX from 'xlsx';
import { StudentItem } from '../../../core/models/request.model';

export interface ImportMajor { id: number; code: string; name: string; }
const normalize = (value: any): string => String(value ?? '').normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').trim().toLowerCase();

export function studentImportWorkbook(majors: ImportMajor[], selectedMajorId: number | null): XLSX.WorkBook {
  if (!majors.length) throw new Error('Nhóm chuyên môn chưa có ngành. Hãy tạo ngành trước khi tải mẫu.');
  const chosen = majors.find(m => m.id === selectedMajorId) || majors[0];
  const sheet = XLSX.utils.aoa_to_sheet([
    ['MSSV', 'Họ và tên', 'Lớp', 'Mã ngành', 'Ngành', 'Email'],
    ['00000168', 'Nguyễn Văn An', '68-CN', chosen.code, chosen.name, ''],
    ['00000267', 'Trần Thị Bình', '67-CN', chosen.code, chosen.name, '']
  ]);
  sheet['!cols'] = [12, 25, 15, 20, 35, 30].map(wch => ({ wch }));
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, 'SinhVien');
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet([
    ['Mã ngành', 'Ngành'], ...majors.map(m => [m.code, m.name])
  ]), 'DanhMucChuyenNganh');
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet([
    ['Hướng dẫn'],
    ['Thay hai dòng ví dụ bằng dữ liệu thật. MSSV lưu dạng văn bản để giữ số 0 đầu.'],
    ['Mỗi dòng bắt buộc có mã ngành thuộc danh mục của nhóm đã chọn.'],
    ['Một file được chứa nhiều ngành trong cùng nhóm chuyên môn.'],
    ['Tên ngành nếu điền phải khớp mã. Email trống dùng MSSV@st.huce.edu.vn.'],
    ['Khóa lấy từ hai số cuối MSSV; CLO lấy theo đợt, ngành và khóa.']
  ]), 'HuongDan');
  return workbook;
}

export function parseStudentImport(workbook: XLSX.WorkBook, majors: ImportMajor[]): StudentItem[] {
  for (const sheetName of workbook.SheetNames) {
    const rows: any[][] = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { header: 1, defval: '', raw: false });
    for (let header = 0; header < Math.min(rows.length, 30); header++) {
      const keys = rows[header].map(normalize);
      const code = keys.findIndex(k => ['mssv', 'ma sv', 'ma sinh vien', 'ma so sinh vien'].includes(k));
      const name = keys.findIndex(k => ['ho va ten', 'ho ten'].includes(k));
      const last = keys.findIndex(k => ['ho', 'ho dem'].includes(k));
      const first = keys.indexOf('ten');
      const classIndex = keys.indexOf('lop');
      if (code < 0 || classIndex < 0 || (name < 0 && (last < 0 || first < 0))) continue;
      const majorCode = keys.findIndex(k => k === 'ma nganh' || k === 'ma chuyen nganh');
      const majorName = keys.findIndex(k => k === 'nganh' || k === 'chuyen nganh');
      const email = keys.indexOf('email');
      if (majorCode < 0) throw new Error('File thiếu cột "Mã ngành". Hãy tải mẫu Excel mới.');
      const students: StudentItem[] = [];
      const seen = new Set<string>();
      for (let i = header + 1; i < rows.length; i++) {
        const row = rows[i];
        if (!row.some(v => String(v).trim())) continue;
        const value = (index: number) => index < 0 ? '' : String(row[index] ?? '').trim();
        const studentCode = value(code);
        const mergedName = name >= 0 && keys[name + 1] === '' && classIndex === name + 2;
        const fullName = name >= 0 ? [value(name), mergedName ? value(name + 1) : ''].filter(Boolean).join(' ') : `${value(last)} ${value(first)}`.trim();
        const prefix = `Dòng ${i + 1}: `;
        if (!studentCode || !fullName || !value(classIndex)) throw new Error(prefix + 'thiếu MSSV, họ tên hoặc lớp.');
        if (!/[0-9]{2}$/.test(studentCode)) throw new Error(prefix + 'MSSV phải kết thúc bằng hai chữ số khóa.');
        if (seen.has(studentCode)) throw new Error(prefix + 'MSSV bị trùng trong file.');
        seen.add(studentCode);
        const major = majors.find(m => normalize(m.code) === normalize(value(majorCode)));
        if (!major) throw new Error(prefix + 'mã ngành trống hoặc không thuộc nhóm đã chọn.');
        if (value(majorName) && normalize(value(majorName)) !== normalize(major.name))
          throw new Error(prefix + 'tên ngành không khớp mã ngành.');
        students.push({ student_code: studentCode, full_name: fullName, class_name: value(classIndex),
          email: value(email), major_id: major.id, major_code: major.code });
      }
      if (!students.length) throw new Error('File chưa có sinh viên.');
      return students;
    }
  }
  throw new Error('Không tìm thấy bảng sinh viên với MSSV, họ tên, lớp và mã ngành.');
}

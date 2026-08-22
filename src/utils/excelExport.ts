import * as XLSX from 'xlsx';
import { ConcreteSample, Station } from '../types';
import { formatDateVN } from './storage';

const COMPANY_NAME = 'CÔNG TY CỔ PHẦN ĐẦU TƯ TASAGO';
const COMPANY_SLOGAN = 'BÊ TÔNG XANH SÀI GÒN - BÊ TÔNG CỦA MỌI CÔNG TRÌNH';
const STANDARD_NOTE = 'Tiêu chuẩn áp dụng: TCVN 3118:2022 (Xác định cường độ nén), TCVN 3116:2022 (Độ chống thấm nước)';

const statusTextMap: Record<string, string> = {
  pending: 'Chưa đến hạn nén',
  due_today: 'ĐẾN HẠN HÔM NAY',
  overdue: 'QUÁ HẠN CHƯA NÉN',
  tested_passed: 'ĐÃ NÉN - ĐẠT YÊU CẦU',
  tested_failed: 'ĐÃ NÉN - KHÔNG ĐẠT',
  cancelled: 'Đã hủy',
};

const shapeTextMap: Record<string, string> = {
  cube_150: 'Khối vuông 150x150x150 mm',
  cylinder_150_300: 'Hình trụ Ø150x300 mm',
  waterproof_150: 'Trụ chống thấm Ø150x150 mm',
  expansion: 'Mẫu bù co ngót',
  other: 'Quy cách khác',
};

/**
 * 1. Xuất file Excel theo dõi nén mẫu chuyên sâu theo từng công trình của từng trạm
 * Bao gồm đầy đủ:
 * - Tên đơn vị cung cấp: CÔNG TY CỔ PHẦN ĐẦU TƯ TASAGO
 * - Slogan: BÊ TÔNG XANH SÀI GÒN - BÊ TÔNG CỦA MỌI CÔNG TRÌNH
 * - Tên Trạm Trộn
 * - Tên Khách Hàng / Nhà Thầu
 * - Tên Dự Án Công Trình
 * - Địa Chỉ Công Trình
 * - Danh sách chi tiết hạng mục, mác bê tông, khối lượng m3, số tổ mẫu, ngày nén, kết quả nén
 */
export function exportProjectTrackingExcel(
  samples: ConcreteSample[],
  station: Station | undefined,
  projectName: string,
  contractorName?: string
): void {
  const stationName = station ? station.name : 'Trạm Bê Tông Tasago';
  const stationAddress = station ? station.address : 'TP. Hồ Chí Minh';
  const customer = contractorName || (samples[0]?.contractor || 'Khách Hàng / Đơn Vị Thi Công');
  const location = samples[0]?.location || 'Theo đơn đặt hàng';
  const exportDate = new Date();
  const exportDateStr = formatDateVN(exportDate.toISOString().split('T')[0]);

  // Header banner & metadata rows (AOA: Array of Arrays)
  const aoa: any[][] = [
    [COMPANY_NAME],
    [COMPANY_SLOGAN],
    ['PHÒNG KỸ THUẬT & QUẢN LÝ CHẤT LƯỢNG (QC/QA)'],
    [''],
    ['BẢNG THEO DÕI TIẾN ĐỘ & KẾT QUẢ NÉN MẪU BÊ TÔNG'],
    [`(${STANDARD_NOTE})`],
    [''],
    ['ĐƠN VỊ CUNG CẤP:', COMPANY_NAME, '', 'TRẠM SẢN XUẤT:', stationName],
    ['ĐỊA CHỈ TRẠM:', stationAddress, '', 'NGÀY XUẤT BẢNG:', `${exportDateStr} (In từ Hệ Thống Tasago)`],
    ['TÊN KHÁCH HÀNG:', customer, '', 'DỰ ÁN / CÔNG TRÌNH:', projectName],
    ['ĐỊA ĐIỂM CÔNG TRÌNH:', location, '', 'TỔNG SỐ PHIẾU/MẪU:', `${samples.length} mẫu`],
    [''],
    // Table Headers
    [
      'STT',
      'Mã Mẫu / Số Phiếu',
      'Mã Mẫu Hiện Trường',
      'Ngày Đổ Bê Tông',
      'Hạng Mục Đổ Bê Tông',
      'Mác Bê Tông TK',
      'Độ Sụt (cm)',
      'Khối Lượng (m³)',
      'Số Tổ Mẫu',
      'Số Viên',
      'Quy Cách Mẫu',
      'Tuổi Nén (Ngày)',
      'Ngày Nén Dự Kiến',
      'Tình Trạng Nén',
      'Ngày Nén Thực Tế',
      'Cường Độ Nén TB (MPa)',
      '% Đạt So Mác TK',
      'Đánh Giá Kết Quả',
      'KTV Lấy Mẫu',
      'Người Liên Hệ Công Trình',
      'SĐT Liên Hệ',
      'Ghi Chú / Mã Máy Nén',
    ],
  ];

  let totalVolume = 0;
  let totalGroups = 0;
  let totalPieces = 0;
  let testedCount = 0;
  let passedCount = 0;
  let failedCount = 0;

  samples.forEach((item, index) => {
    totalVolume += item.volumeM3 || 0;
    totalGroups += item.groupCount || 0;
    totalPieces += item.pieceCount || 0;

    const res = item.testResult;
    const isTested = item.status === 'tested_passed' || item.status === 'tested_failed';
    if (isTested) {
      testedCount++;
      if (item.status === 'tested_passed') passedCount++;
      else failedCount++;
    }

    const testDate = res ? formatDateVN(res.testDate) : '---';
    const avgStrength = res ? `${res.avgStrengthMpa.toFixed(1)} MPa` : '---';
    const percentDesign = res ? `${res.percentageOfDesign.toFixed(1)}%` : '---';
    const rating = res ? (res.isPassed ? 'ĐẠT YÊU CẦU' : 'KHÔNG ĐẠT') : (item.status === 'due_today' ? 'ĐẾN HẠN NÉN' : item.status === 'overdue' ? 'QUÁ HẠN' : 'Chưa đến ngày nén');
    const noteField = item.notes || (res ? `Máy: ${res.machineCode || 'N/A'}, BB: ${res.certificateNumber || 'N/A'}` : '');

    aoa.push([
      index + 1,
      item.id,
      item.sampleCode || item.id,
      formatDateVN(item.castDate),
      item.component,
      item.concreteGrade,
      item.slumpCm,
      item.volumeM3,
      item.groupCount,
      item.pieceCount,
      shapeTextMap[item.sampleShape] || item.sampleShape,
      item.ageType,
      formatDateVN(item.scheduledTestDate),
      statusTextMap[item.status] || item.status,
      testDate,
      avgStrength,
      percentDesign,
      rating,
      item.samplerName,
      item.contactPerson,
      item.contactPhone,
      noteField,
    ]);
  });

  // Summary Row
  aoa.push(['']);
  aoa.push([
    'TỔNG CỘNG',
    '',
    '',
    '',
    `Tổng ${samples.length} hạng mục`,
    '',
    '',
    totalVolume,
    totalGroups,
    totalPieces,
    '',
    '',
    '',
    `Đã nén: ${testedCount}/${samples.length} (Đạt: ${passedCount}, K.Đạt: ${failedCount})`,
    '',
    '',
    passedCount > 0 && testedCount > 0 ? `${((passedCount / testedCount) * 100).toFixed(0)}% Đạt` : '---',
    passedCount === testedCount && testedCount > 0 ? 'TOÀN BỘ ĐẠT MÁC' : '',
    '',
    '',
    '',
    '',
  ]);

  aoa.push(['']);
  aoa.push(['']);
  // Signature Rows
  aoa.push([
    '',
    'NGƯỜI LẬP BẢNG THEO DÕI',
    '',
    '',
    'KỸ THUẬT VIÊN THÍ NGHIỆM',
    '',
    '',
    '',
    'TRƯỞNG PHÒNG KỸ THUẬT / QC',
    '',
    '',
    '',
    'ĐẠI DIỆN KHÁCH HÀNG / TƯ VẤN GIÁM SÁT',
  ]);
  aoa.push([
    '',
    '(Ký và ghi rõ họ tên)',
    '',
    '',
    '(Ký và ghi rõ họ tên)',
    '',
    '',
    '',
    '(Ký, đóng dấu xác nhận)',
    '',
    '',
    '',
    '(Ký và ghi rõ họ tên)',
  ]);

  const ws = XLSX.utils.aoa_to_sheet(aoa);

  // Set column widths
  ws['!cols'] = [
    { wch: 6 },  // STT
    { wch: 15 }, // Mã Mẫu
    { wch: 18 }, // Mã Hiện Trường
    { wch: 15 }, // Ngày Đổ
    { wch: 28 }, // Hạng Mục
    { wch: 15 }, // Mác TK
    { wch: 12 }, // Độ Sụt
    { wch: 16 }, // Khối Lượng
    { wch: 12 }, // Số Tổ
    { wch: 10 }, // Số Viên
    { wch: 24 }, // Quy Cách
    { wch: 14 }, // Tuổi Nén
    { wch: 16 }, // Ngày Nén Dự Kiến
    { wch: 22 }, // Tình Trạng
    { wch: 16 }, // Ngày Nén TT
    { wch: 20 }, // Cường Độ TB
    { wch: 16 }, // % Đạt
    { wch: 18 }, // Đánh Giá
    { wch: 20 }, // KTV Lấy Mẫu
    { wch: 22 }, // Người Liên Hệ
    { wch: 16 }, // SĐT
    { wch: 30 }, // Ghi Chú
  ];

  // Set Merges for Header
  ws['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 10 } }, // Title
    { s: { r: 1, c: 0 }, e: { r: 1, c: 10 } }, // Slogan
    { s: { r: 2, c: 0 }, e: { r: 2, c: 10 } }, // Department
    { s: { r: 4, c: 0 }, e: { r: 4, c: 10 } }, // Doc Name
    { s: { r: 5, c: 0 }, e: { r: 5, c: 10 } }, // Standard note
    { s: { r: 7, c: 1 }, e: { r: 7, c: 2 } }, // Company Name
    { s: { r: 7, c: 4 }, e: { r: 7, c: 7 } }, // Station Name
    { s: { r: 8, c: 1 }, e: { r: 8, c: 2 } }, // Station Addr
    { s: { r: 8, c: 4 }, e: { r: 8, c: 7 } }, // Export date
    { s: { r: 9, c: 1 }, e: { r: 9, c: 2 } }, // Customer
    { s: { r: 9, c: 4 }, e: { r: 9, c: 7 } }, // Project
    { s: { r: 10, c: 1 }, e: { r: 10, c: 2 } }, // Location
    { s: { r: 10, c: 4 }, e: { r: 10, c: 7 } }, // Total count
  ];

  const wb = XLSX.utils.book_new();
  const cleanProjectSheetName = (projectName || 'TheoDoi_CongTrinh').substring(0, 30).replace(/[:\\\/\?\*\[\]]/g, '_');
  XLSX.utils.book_append_sheet(wb, ws, cleanProjectSheetName);

  const cleanProjectFileName = projectName.replace(/[^a-zA-Z0-9_\u00C0-\u1EF9]/g, '_');
  const dateSuffix = `${exportDate.getFullYear()}${String(exportDate.getMonth() + 1).padStart(2, '0')}${String(exportDate.getDate()).padStart(2, '0')}`;
  const fullFileName = `Tasago_TheoDoiNenMau_${cleanProjectFileName}_${dateSuffix}.xlsx`;

  XLSX.writeFile(wb, fullFileName);
}

/**
 * 2. Xuất bảng tổng hợp nén mẫu toàn bộ hoặc danh sách được lọc với tiêu đề doanh nghiệp chuẩn
 */
export function exportSamplesToExcel(
  samples: ConcreteSample[],
  stations: Station[],
  fileNamePrefix: string = 'BaoCao_TienDo_NenMau_Tasago'
): void {
  const stationMap = new Map<string, Station>();
  stations.forEach(s => stationMap.set(s.id, s));

  const exportDate = new Date();
  const exportDateStr = formatDateVN(exportDate.toISOString().split('T')[0]);

  const aoa: any[][] = [
    [COMPANY_NAME],
    [COMPANY_SLOGAN],
    ['PHÒNG QUẢN LÝ KỸ THUẬT & KIỂM ĐỊNH CHẤT LƯỢNG BÊ TÔNG'],
    [''],
    ['BÁO CÁO TỔNG HỢP TIẾN ĐỘ VÀ KẾT QUẢ NÉN MẪU BÊ TÔNG'],
    [`(${STANDARD_NOTE})`],
    [''],
    ['ĐƠN VỊ CUNG CẤP:', COMPANY_NAME, '', 'NGÀY XUẤT BÁO CÁO:', `${exportDateStr}`],
    ['HỆ THỐNG QUẢN LÝ:', 'CÁC TRẠM TRỘN BÊ TÔNG TASAGO', '', 'TỔNG SỐ LƯỢNG MẪU:', `${samples.length} mẫu theo dõi`],
    [''],
    [
      'STT',
      'Mã Hệ Thống',
      'Mã Hiện Trường',
      'Phân Loại',
      'Trạm Trộn Cung Cấp',
      'Tên Công Trình / Dự Án',
      'Khách Hàng / Đơn Vị Thi Công',
      'Hạng Mục Đổ Bê Tông',
      'Khối Lượng (m³)',
      'Mác Bê Tông',
      'Độ Sụt (cm)',
      'Tuổi Nén',
      'Số Ngày Tuổi',
      'Quy Cách Mẫu',
      'Số Tổ Mẫu',
      'Số Viên',
      'Ngày Đúc',
      'Ngày Nén Dự Kiến',
      'Tình Trạng',
      'Ngày Nén Thực Tế',
      'Cường Độ TB (MPa)',
      '% So Mác TK',
      'Đánh Giá',
      'Người Liên Hệ',
      'SĐT Liên Hệ',
      'Địa Chỉ Công Trình',
      'KTV Lấy Mẫu',
      'Ghi Chú',
    ],
  ];

  let totalVol = 0;
  let totalGrp = 0;
  let totalPcs = 0;

  samples.forEach((item, index) => {
    const station = stationMap.get(item.stationId);
    const stationName = station ? station.name : item.stationId;
    const categoryName = item.category === 'commercial' ? 'Bê tông thương phẩm' : 'Trialmix (Thí nghiệm)';
    const result = item.testResult;
    const testDate = result ? formatDateVN(result.testDate) : '---';
    const avgStrength = result ? `${result.avgStrengthMpa.toFixed(1)} MPa` : '---';
    const percentDesign = result ? `${result.percentageOfDesign.toFixed(1)}%` : '---';
    const rating = result ? (result.isPassed ? 'ĐẠT YÊU CẦU' : 'KHÔNG ĐẠT') : (statusTextMap[item.status] || item.status);

    totalVol += item.volumeM3 || 0;
    totalGrp += item.groupCount || 0;
    totalPcs += item.pieceCount || 0;

    aoa.push([
      index + 1,
      item.id,
      item.sampleCode || item.id,
      categoryName,
      stationName,
      item.projectName,
      item.contractor,
      item.component,
      item.volumeM3,
      item.concreteGrade,
      item.slumpCm,
      item.ageType,
      item.ageDays,
      shapeTextMap[item.sampleShape] || item.sampleShape,
      item.groupCount,
      item.pieceCount,
      formatDateVN(item.castDate),
      formatDateVN(item.scheduledTestDate),
      statusTextMap[item.status] || item.status,
      testDate,
      avgStrength,
      percentDesign,
      rating,
      item.contactPerson,
      item.contactPhone,
      item.location,
      item.samplerName,
      item.notes || (result ? result.notes : '') || '',
    ]);
  });

  // Total row
  aoa.push(['']);
  aoa.push([
    'TỔNG CỘNG',
    '',
    '',
    '',
    '',
    `Tổng ${samples.length} mẫu theo dõi`,
    '',
    '',
    totalVol,
    '',
    '',
    '',
    '',
    '',
    totalGrp,
    totalPcs,
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
  ]);

  const ws = XLSX.utils.aoa_to_sheet(aoa);

  ws['!cols'] = [
    { wch: 6 },  // STT
    { wch: 15 }, // Mã Hệ Thống
    { wch: 18 }, // Mã Hiện Trường
    { wch: 22 }, // Phân Loại
    { wch: 30 }, // Trạm Trộn
    { wch: 35 }, // Tên Công Trình
    { wch: 30 }, // Đơn Vị Thi Công
    { wch: 28 }, // Hạng Mục
    { wch: 14 }, // Khối Lượng
    { wch: 16 }, // Mác Bê Tông
    { wch: 12 }, // Độ Sụt
    { wch: 12 }, // Tuổi Nén
    { wch: 12 }, // Số Ngày Tuổi
    { wch: 22 }, // Quy Cách Mẫu
    { wch: 12 }, // Số Tổ
    { wch: 10 }, // Số Viên
    { wch: 14 }, // Ngày Đúc
    { wch: 18 }, // Ngày Nén Dự Kiến
    { wch: 22 }, // Tình Trạng
    { wch: 16 }, // Ngày Nén Thực Tế
    { wch: 22 }, // Cường Độ Nén TB
    { wch: 18 }, // % So Với Mác
    { wch: 18 }, // Kết Luận
    { wch: 22 }, // Người Liên Hệ
    { wch: 16 }, // SĐT
    { wch: 30 }, // Địa Chỉ
    { wch: 20 }, // KTV
    { wch: 35 }, // Ghi Chú
  ];

  ws['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 10 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: 10 } },
    { s: { r: 2, c: 0 }, e: { r: 2, c: 10 } },
    { s: { r: 4, c: 0 }, e: { r: 4, c: 10 } },
    { s: { r: 5, c: 0 }, e: { r: 5, c: 10 } },
    { s: { r: 7, c: 1 }, e: { r: 7, c: 2 } },
    { s: { r: 7, c: 4 }, e: { r: 7, c: 6 } },
    { s: { r: 8, c: 1 }, e: { r: 8, c: 2 } },
    { s: { r: 8, c: 4 }, e: { r: 8, c: 6 } },
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'TongHop_NenMau_Tasago');

  const now = new Date();
  const dateSuffix = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
  const fullFileName = `${fileNamePrefix}_${dateSuffix}.xlsx`;

  XLSX.writeFile(wb, fullFileName);
}

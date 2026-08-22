export type UserRole = 'admin' | 'member';

export interface User {
  id: string;
  username: string;
  fullName: string;
  role: UserRole;
  password?: string;
  stationIds: string[]; // ['all'] or list of station ids
  stationId?: string;   // single primary station if member
  phone: string;
  email: string;
  zaloId?: string;
  active: boolean;
  isActive?: boolean;
  createdAt: string;
}

export interface Station {
  id: string;
  code: string;
  name: string;
  address: string;
  hotline?: string;
  capacity?: string;
  managerName: string;
  managerPhone: string;
  active?: boolean;
}

export type ConcreteCategory = 'commercial' | 'trialmix';

export type ConcreteAgeType = 
  | 'R3' 
  | 'R7' 
  | 'R14' 
  | 'R28' 
  | 'R60' 
  | 'R90' 
  | 'R28_WATERPROOF' 
  | 'EXPANSION' 
  | 'CUSTOM';

export type SampleShape = 
  | 'cube_150'          // Mẫu vuông 150x150x150mm
  | 'cylinder_150_300'  // Mẫu trụ Ø150x300mm
  | 'waterproof_150'    // Mẫu chống thấm Ø150x150mm
  | 'expansion'         // Mẫu bù co ngót / uốn
  | 'other';            // Loại khác

export type SampleStatus = 
  | 'pending'         // Chưa đến hạn
  | 'due_today'       // Đến hạn hôm nay
  | 'overdue'         // Quá hạn chưa nén
  | 'tested_passed'   // Đã nén - Đạt yêu cầu
  | 'tested_failed'   // Đã nén - Không đạt
  | 'cancelled';      // Đã hủy

export interface PieceResult {
  pieceNumber: number;
  weightKg?: number;
  failureLoadKn?: number;     // Lực phá hoại (kN)
  measuredStrengthMpa: number; // Cường độ nén (MPa hoặc daN/cm2)
}

export interface TestResultData {
  testDate: string;           // YYYY-MM-DD
  testedBy: string;           // Kỹ thuật viên nén
  machineCode: string;        // Mã máy nén
  pieceResults: PieceResult[];
  avgStrengthMpa: number;     // Cường độ trung bình (MPa)
  designStrengthMpa: number;  // Cường độ thiết kế (MPa)
  percentageOfDesign: number; // % đạt so với mác thiết kế
  isPassed: boolean;          // Đạt / Không đạt
  notes?: string;
  certificateNumber?: string;
}

export interface ConcreteSample {
  id: string;                 // Mã mẫu (e.g. TSG-2026-001)
  sampleCode: string;         // Mã số mẫu tại hiện trường
  category: ConcreteCategory; // Bê tông đã cấp / Trialmix
  stationId: string;          // Trạm trộn
  projectName: string;        // Tên công trình
  contractor: string;         // Đơn vị thi công / Khách hàng
  contactPerson: string;      // Người liên hệ tại công trình
  contactPhone: string;       // SĐT người liên hệ
  location: string;           // Địa chỉ / Vị trí đổ
  component: string;          // Hạng mục (Móng, Cột, Dầm sàn, Vách...)
  volumeM3: number;           // Khối lượng bê tông (m3)
  castDate: string;           // Ngày đúc mẫu (YYYY-MM-DD)
  castTime?: string;          // Giờ đúc
  concreteGrade: string;      // Mác bê tông (M200, M250, M300, M350, M400, M450, M500, M600, B20, B25, B30...)
  slumpCm: string;            // Độ sụt (cm) (ví dụ: 12±2, 14±2, 16±2, xòe 600)
  ageType: ConcreteAgeType;   // Tuổi nén
  ageDays: number;            // Số ngày tuổi (3, 7, 14, 28, 60, 90...)
  scheduledTestDate: string;  // Ngày nén mẫu dự kiến (YYYY-MM-DD)
  sampleShape: SampleShape;   // Loại mẫu (Vuông, Trụ, Chống thấm...)
  groupCount: number;         // Số tổ mẫu (thường 1 tổ)
  pieceCount: number;         // Số viên mẫu (thường 3 viên/tổ)
  samplerName: string;        // Người lấy mẫu / Kỹ thuật viên
  witnessPerson?: string;     // Người chứng kiến / Giám sát tư vấn
  status: SampleStatus;       // Tình trạng nén mẫu
  testResult?: TestResultData;// Kết quả nén mẫu (nếu đã nén)
  notes?: string;             // Ghi chú
  createdBy: string;          // Username người tạo
  createdByName: string;      // Họ tên người tạo
  createdAt: string;          // Thời gian tạo
  updatedAt: string;          // Thời gian cập nhật
  lastNotifiedAt?: string;    // Lần gửi thông báo gần nhất
}

export interface NotificationLog {
  id: string;
  timestamp: string;
  channel: 'zalo_bot' | 'email' | 'zalo_oa' | 'sms';
  recipient: string;
  sampleIds: string[];
  sampleInfoSummary: string;
  messageContent: string;
  status: 'success' | 'failed' | 'simulated';
  errorDetails?: string;
}

export interface NotificationConfig {
  autoZaloEnabled: boolean;
  zaloWebhookUrl: string;
  zaloBotToken: string;
  zaloGroupId: string;
  zaloPersonalPhone?: string;     // Số điện thoại Zalo cá nhân nhận tin chính (ví dụ: 0942320923)
  zaloPersonalPhones?: string[];   // Danh sách các SĐT Zalo cá nhân nhận tin
  zaloRecipientType?: 'personal' | 'group' | 'both'; // Gửi cho cá nhân, nhóm hay cả hai
  autoEmailEnabled: boolean;
  emailRecipients: string[];
  emailSender: string;
  reminderDaysBefore: number; // 0 = ngày đến hạn, 1 = trước 1 ngày
  autoSendHour: number;       // Giờ gửi tự động (ví dụ: 7 = 7:00 sáng)
  autoSendMinute?: number;     // Phút gửi tự động (mặc định: 0)
  enableSoundAlert: boolean;
  smtpHost?: string;
  smtpPort?: number;
  smtpUser?: string;
  smtpPass?: string;
  smtpSecure?: boolean;
  emailServiceUrl?: string;   // Google Apps Script / Endpoint gửi email miễn phí
}

export interface SampleFilterOptions {
  stationId: string;          // 'all' or stationId
  category: string;           // 'all' | 'commercial' | 'trialmix'
  status: string;             // 'all' | SampleStatus
  ageType: string;            // 'all' | ConcreteAgeType
  grade: string;              // 'all' | string
  searchQuery: string;        // search in project, contractor, phone, component, code
  fromDate: string;           // YYYY-MM-DD
  toDate: string;             // YYYY-MM-DD
  dateFilterType: 'scheduled' | 'cast';
}

import React from 'react';
import { 
  X, 
  FlaskConical, 
  Building2, 
  Calendar, 
  Phone, 
  User as UserIcon, 
  Layers, 
  Clock, 
  Printer, 
  Send, 
  Edit3, 
  CheckCircle2, 
  AlertCircle, 
  AlertTriangle,
  Scale, 
  Award,
  ExternalLink,
  FileSpreadsheet,
  Download
} from 'lucide-react';
import { ConcreteSample, Station, User } from '../types';
import { formatDateVN } from '../utils/storage';
import { exportProjectTrackingExcel } from '../utils/excelExport';

interface SampleDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  sample: ConcreteSample | null;
  stations: Station[];
  allSamples?: ConcreteSample[];
  currentUser?: User | null;
  onOpenTestModal: (sample: ConcreteSample) => void;
  onOpenEditModal: (sample: ConcreteSample) => void;
  onSendNotification: (sample: ConcreteSample) => void;
}

export const SampleDetailModal: React.FC<SampleDetailModalProps> = ({
  isOpen,
  onClose,
  sample,
  stations,
  allSamples = [],
  currentUser,
  onOpenTestModal,
  onOpenEditModal,
  onSendNotification,
}) => {
  if (!isOpen || !sample) return null;

  const station = stations.find(s => s.id === sample.stationId);
  const result = sample.testResult;
  const isTested = sample.status === 'tested_passed' || sample.status === 'tested_failed';

  const canModify = !currentUser || currentUser.role === 'admin' || 
    (sample.createdBy && sample.createdBy === currentUser.username) || 
    (sample.samplerName && sample.samplerName.trim().toLowerCase() === currentUser.fullName.trim().toLowerCase());

  const handleExportProjectExcel = () => {
    const projectSamples = allSamples.length > 0
      ? allSamples.filter(s => s.projectName.trim().toLowerCase() === sample.projectName.trim().toLowerCase() && s.stationId === sample.stationId)
      : [sample];
    exportProjectTrackingExcel(projectSamples, station, sample.projectName, sample.contractor);
  };

  const shapeMap: Record<string, string> = {
    cube_150: 'Mẫu vuông 150x150x150mm (TCVN 3118)',
    cylinder_150_300: 'Mẫu trụ Ø150x300mm (ASTM C39 / TCVN)',
    waterproof_150: 'Mẫu trụ chống thấm (TCVN 3116)',
    expansion: 'Mẫu bù co ngót / uốn',
    other: 'Mẫu quy cách đặc biệt',
  };

  const handlePrintCertificate = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
      <div 
        className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-3xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 my-8"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-emerald-900 text-white px-5 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-700 flex items-center justify-center text-white">
              <FlaskConical className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-black text-base sm:text-lg">{sample.id}</span>
                <span className="bg-emerald-700 text-emerald-200 text-xs px-2 py-0.5 rounded font-mono">
                  {sample.sampleCode}
                </span>
              </div>
              <p className="text-xs text-emerald-200">
                {station?.name} • Công Ty CP Đầu Tư Tasago
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-emerald-200 hover:text-white p-1 rounded-lg hover:bg-emerald-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 sm:p-6 space-y-5 max-h-[80vh] overflow-y-auto">
          
          {/* Status Alert Ribbon */}
          <div className={`p-4 rounded-xl flex items-center justify-between border ${
            sample.status === 'due_today' ? 'bg-red-50 border-red-300 text-red-950' :
            sample.status === 'overdue' ? 'bg-amber-50 border-amber-300 text-amber-950' :
            sample.status === 'tested_passed' ? 'bg-emerald-50 border-emerald-300 text-emerald-950' :
            sample.status === 'tested_failed' ? 'bg-rose-50 border-rose-300 text-rose-950' :
            'bg-slate-50 border-slate-300 text-slate-800'
          }`}>
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-full flex items-center justify-center bg-white shadow-sm shrink-0">
                {sample.status === 'due_today' ? <AlertTriangle className="w-4 h-4 text-red-600 animate-bounce" /> :
                 sample.status === 'overdue' ? <Clock className="w-4 h-4 text-amber-600" /> :
                 sample.status === 'tested_passed' ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> :
                 sample.status === 'tested_failed' ? <AlertCircle className="w-4 h-4 text-rose-600" /> :
                 <Calendar className="w-4 h-4 text-slate-600" />}
              </div>
              <div>
                <span className="font-black text-sm uppercase">
                  {sample.status === 'due_today' ? '🔴 LỊCH NÉN MẪU: ĐẾN HẠN HÔM NAY' :
                   sample.status === 'overdue' ? '⚠️ LỊCH NÉN MẪU: ĐÃ QUÁ HẠN CHƯA NÉN' :
                   sample.status === 'tested_passed' ? '✅ KẾT QUẢ: ĐÃ NÉN ĐẠT TIÊU CHUẨN' :
                   sample.status === 'tested_failed' ? '❌ KẾT QUẢ: ĐÃ NÉN KHÔNG ĐẠT MÁC' :
                   '⏳ TÌNH TRẠNG: CHƯA ĐẾN HẠN NÉN'}
                </span>
                <p className="text-xs opacity-90">
                  Ngày đúc: {formatDateVN(sample.castDate)} ➔ Ngày nén: <strong className="font-black">{formatDateVN(sample.scheduledTestDate)}</strong> ({sample.ageType})
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={() => onSendNotification(sample)}
                className="bg-white hover:bg-slate-50 text-slate-800 font-bold px-3 py-1.5 rounded-lg text-xs shadow-sm border border-slate-200 flex items-center space-x-1"
              >
                <Send className="w-3.5 h-3.5 text-emerald-600" />
                <span className="hidden sm:inline">Gửi Zalo</span>
              </button>
            </div>
          </div>

          {/* Project & Structural Details Grid */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="space-y-2">
              <h4 className="font-extrabold text-slate-800 uppercase tracking-wider text-[11px]">
                🏢 Thông Tin Công Trình & Nhà Thầu
              </h4>
              <div>
                <span className="text-slate-500 block">Tên Công Trình:</span>
                <span className="font-bold text-slate-900 text-sm">{sample.projectName}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Đơn Vị Thi Công:</span>
                <span className="font-semibold text-slate-800">{sample.contractor}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Địa Điểm:</span>
                <span className="text-slate-800">{sample.location || 'Tại công trình'}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Liên Hệ Hiện Trường:</span>
                <div className="flex items-center space-x-2 mt-0.5">
                  <span className="font-bold text-slate-900">{sample.contactPerson}</span>
                  <a 
                    href={`tel:${sample.contactPhone}`}
                    className="text-emerald-700 font-bold bg-emerald-100 px-2 py-0.5 rounded flex items-center space-x-1"
                  >
                    <Phone className="w-3 h-3" />
                    <span>{sample.contactPhone}</span>
                  </a>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="font-extrabold text-slate-800 uppercase tracking-wider text-[11px]">
                🧪 Thông Số Kỹ Thuật Bê Tông
              </h4>
              <div>
                <span className="text-slate-500 block">Hạng Mục Đổ:</span>
                <span className="font-bold text-slate-900">{sample.component}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Khối Lượng & Mác Bê Tông:</span>
                <span className="font-black text-emerald-800 text-sm">
                  {sample.concreteGrade} — {sample.volumeM3} m³
                </span>
                <span className="text-slate-500 text-[11px] block">Độ sụt: {sample.slumpCm} cm</span>
              </div>
              <div>
                <span className="text-slate-500 block">Quy Cách & Số Lượng Mẫu:</span>
                <span className="font-semibold text-slate-800">
                  {shapeMap[sample.sampleShape] || sample.sampleShape} ({sample.groupCount} tổ - {sample.pieceCount} viên)
                </span>
              </div>
              <div>
                <span className="text-slate-500 block">KTV Lấy Mẫu & Giám Sát:</span>
                <span className="text-slate-800">
                  {sample.samplerName} {sample.witnessPerson ? `(GS: ${sample.witnessPerson})` : ''}
                </span>
              </div>
            </div>
          </div>

          {/* Test Results Section (if available) */}
          {result && (
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-extrabold text-xs text-slate-800 uppercase tracking-wider flex items-center space-x-1.5">
                  <Award className="w-4 h-4 text-emerald-700" />
                  <span>KẾT QUẢ THÍ NGHIỆM NÉN MẪU PHÒNG LAB</span>
                </h4>
                <span className="text-xs font-mono font-bold text-slate-600">
                  {result.certificateNumber}
                </span>
              </div>

              {/* Specimen Measurements */}
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-slate-700 text-left border-collapse">
                  <thead className="bg-slate-200 text-slate-700 font-bold">
                    <tr>
                      <th className="py-2 px-3 text-center">Viên</th>
                      <th className="py-2 px-3">Khối Lượng (kg)</th>
                      <th className="py-2 px-3">Lực Phá Hoại (kN)</th>
                      <th className="py-2 px-3">Cường Độ (MPa)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 bg-white">
                    {result.pieceResults.map((p) => (
                      <tr key={p.pieceNumber}>
                        <td className="py-2 px-3 text-center font-bold">#{p.pieceNumber}</td>
                        <td className="py-2 px-3">{p.weightKg ? `${p.weightKg} kg` : '---'}</td>
                        <td className="py-2 px-3 font-bold">{p.failureLoadKn ? `${p.failureLoadKn} kN` : '---'}</td>
                        <td className="py-2 px-3 font-black text-emerald-800">{p.measuredStrengthMpa.toFixed(1)} MPa</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Summary stats */}
              <div className={`p-3 rounded-lg border flex items-center justify-between ${
                result.isPassed ? 'bg-emerald-100/70 border-emerald-300' : 'bg-rose-100/70 border-rose-300'
              }`}>
                <div>
                  <span className="text-xs font-bold text-slate-700 block">Cường Độ Nén Trung Bình:</span>
                  <span className="text-xl font-black text-slate-900">
                    {result.avgStrengthMpa.toFixed(1)} MPa
                  </span>
                  <span className="text-xs text-slate-600 ml-2">
                    (Đạt <strong>{result.percentageOfDesign.toFixed(1)}%</strong> so với mác thiết kế {result.designStrengthMpa} MPa)
                  </span>
                </div>
                <div className={`font-black text-xs px-3 py-1.5 rounded-lg uppercase ${
                  result.isPassed ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'
                }`}>
                  {result.isPassed ? 'ĐẠT YÊU CẦU' : 'KHÔNG ĐẠT'}
                </div>
              </div>

              <div className="text-[11px] text-slate-500 space-y-0.5">
                <p><strong>Ngày nén:</strong> {formatDateVN(result.testDate)} • <strong>KTV thực hiện:</strong> {result.testedBy} • <strong>Máy nén:</strong> {result.machineCode}</p>
                {result.notes && <p><strong>Nhận xét:</strong> {result.notes}</p>}
              </div>
            </div>
          )}

          {sample.notes && (
            <div className="text-xs text-slate-600 bg-slate-50 p-3 rounded-lg border border-slate-200">
              <strong>Ghi chú:</strong> {sample.notes}
            </div>
          )}

          {/* Action Buttons */}
          <div className="pt-3 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center space-x-2">
              <button
                onClick={handlePrintCertificate}
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-3.5 py-2 rounded-xl text-xs flex items-center space-x-1.5 transition-colors cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>In Phiếu Kết Quả</span>
              </button>

              <button
                onClick={handleExportProjectExcel}
                className="bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold px-3.5 py-2 rounded-xl text-xs flex items-center space-x-1.5 transition-colors cursor-pointer"
                title="Xuất bảng theo dõi nén mẫu định dạng Excel cho công trình này"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-700" />
                <span>Xuất Excel Công Trình</span>
              </button>
            </div>

            <div className="flex items-center space-x-2">
              {canModify ? (
                <>
                  <button
                    onClick={() => {
                      onClose();
                      onOpenEditModal(sample);
                    }}
                    className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-3.5 py-2 rounded-xl text-xs flex items-center space-x-1.5 transition-colors cursor-pointer"
                  >
                    <Edit3 className="w-4 h-4 text-amber-600" />
                    <span>Chỉnh Sửa</span>
                  </button>

                  <button
                    onClick={() => {
                      onClose();
                      onOpenTestModal(sample);
                    }}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-4 py-2 rounded-xl text-xs flex items-center space-x-1.5 shadow transition-all cursor-pointer"
                  >
                    <FlaskConical className="w-4 h-4" />
                    <span>{isTested ? 'Cập Nhật Kết Quả Nén' : 'Nhập Kết Quả Nén Mẫu'}</span>
                  </button>
                </>
              ) : (
                <span className="text-xs text-slate-500 bg-slate-100 px-3 py-2 rounded-xl font-medium border border-slate-200">
                  🔒 Chế độ chỉ xem (Mẫu do {sample.createdByName || sample.samplerName || 'KTV khác'} tạo)
                </span>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import { 
  X, 
  FlaskConical, 
  CheckCircle2, 
  AlertCircle, 
  Calculator, 
  Save, 
  Sparkles, 
  Scale, 
  FileText 
} from 'lucide-react';
import { ConcreteSample, PieceResult, TestResultData } from '../types';
import { parseDesignStrengthMpa, formatDateVN } from '../utils/storage';

interface TestResultModalProps {
  isOpen: boolean;
  onClose: () => void;
  sample: ConcreteSample | null;
  onSaveResult: (sampleId: string, resultData: TestResultData) => void;
  currentUserName?: string;
}

export const TestResultModal: React.FC<TestResultModalProps> = ({
  isOpen,
  onClose,
  sample,
  onSaveResult,
  currentUserName = 'KTV Thí Nghiệm Tasago',
}) => {
  const [testDate, setTestDate] = useState(new Date().toISOString().split('T')[0]);
  const [testedBy, setTestedBy] = useState(currentUserName);
  const [machineCode, setMachineCode] = useState('MATEST-3000KN (LAS-XD TASAGO)');
  const [certificateNumber, setCertificateNumber] = useState('');
  const [notes, setNotes] = useState('');

  // Individual pieces results (default 3 pieces)
  const [pieces, setPieces] = useState<PieceResult[]>([
    { pieceNumber: 1, weightKg: 8.15, failureLoadKn: 680, measuredStrengthMpa: 30.2 },
    { pieceNumber: 2, weightKg: 8.20, failureLoadKn: 695, measuredStrengthMpa: 30.9 },
    { pieceNumber: 3, weightKg: 8.18, failureLoadKn: 675, measuredStrengthMpa: 30.0 },
  ]);

  const designStrengthMpa = sample ? parseDesignStrengthMpa(sample.concreteGrade) : 30;

  // Initialize from existing test result or setup new
  useEffect(() => {
    if (sample) {
      if (sample.testResult) {
        setTestDate(sample.testResult.testDate);
        setTestedBy(sample.testResult.testedBy);
        setMachineCode(sample.testResult.machineCode);
        setCertificateNumber(sample.testResult.certificateNumber || '');
        setNotes(sample.testResult.notes || '');
        setPieces(sample.testResult.pieceResults);
      } else {
        const count = sample.pieceCount || 3;
        const initialPieces: PieceResult[] = [];
        const baseStrength = designStrengthMpa * (sample.ageType === 'R7' ? 0.75 : sample.ageType === 'R3' ? 0.55 : 1.05);

        for (let i = 1; i <= count; i++) {
          const randomVariation = (Math.random() * 2 - 1) * 0.8;
          const strength = Number((baseStrength + randomVariation).toFixed(1));
          // For 150x150 cube (area 22500 mm2), Force (kN) = strength (MPa) * 22.5
          const loadKn = Math.round(strength * 22.5);
          initialPieces.push({
            pieceNumber: i,
            weightKg: Number((8.1 + Math.random() * 0.2).toFixed(2)),
            failureLoadKn: loadKn,
            measuredStrengthMpa: strength,
          });
        }
        setPieces(initialPieces);
        setTestDate(sample.scheduledTestDate || new Date().toISOString().split('T')[0]);
        setTestedBy(currentUserName);
        setMachineCode('MATEST-3000KN (LAS-XD TASAGO)');
        setCertificateNumber(`BBTN-TSG/${new Date().getFullYear()}/${Math.floor(100 + Math.random() * 900)}`);
        setNotes('Mẫu phá hủy đều hình chóp kim tự tháp theo TCVN 3118:2022.');
      }
    }
  }, [sample, isOpen, designStrengthMpa, currentUserName]);

  if (!isOpen || !sample) return null;

  // Recalculate average strength
  const validPieces = pieces.filter(p => p.measuredStrengthMpa > 0);
  const avgStrengthMpa = validPieces.length > 0
    ? Number((validPieces.reduce((acc, p) => acc + p.measuredStrengthMpa, 0) / validPieces.length).toFixed(1))
    : 0;

  const percentageOfDesign = designStrengthMpa > 0
    ? Number(((avgStrengthMpa / designStrengthMpa) * 100).toFixed(1))
    : 100;

  // Passing criteria based on age
  let isPassed = false;
  if (sample.ageType === 'R3') {
    isPassed = percentageOfDesign >= 50;
  } else if (sample.ageType === 'R7') {
    isPassed = percentageOfDesign >= 70;
  } else if (sample.ageType === 'R14') {
    isPassed = percentageOfDesign >= 85;
  } else {
    // R28 and above
    isPassed = percentageOfDesign >= 100;
  }

  const handlePieceChange = (index: number, field: keyof PieceResult, value: number) => {
    const updated = [...pieces];
    updated[index] = { ...updated[index], [field]: value };

    // If failure load changed and cube 150, calculate strength
    if (field === 'failureLoadKn' && value > 0) {
      if (sample.sampleShape === 'cylinder_150_300') {
        // Area cylinder 150 = pi * 75^2 = 17671.4 mm2. Strength = load * 1000 / 17671.4 (factor ~ 0.0566)
        updated[index].measuredStrengthMpa = Number(((value * 1000) / 17671.5).toFixed(1));
      } else {
        // Area cube 150 = 22500 mm2. Strength = load * 1000 / 22500
        updated[index].measuredStrengthMpa = Number(((value * 1000) / 22500).toFixed(1));
      }
    }
    setPieces(updated);
  };

  const handleAddPiece = () => {
    setPieces([
      ...pieces,
      {
        pieceNumber: pieces.length + 1,
        weightKg: 8.2,
        failureLoadKn: 675,
        measuredStrengthMpa: 30.0,
      }
    ]);
  };

  const handleRemovePiece = (index: number) => {
    if (pieces.length <= 1) return;
    const updated = pieces.filter((_, i) => i !== index).map((p, i) => ({ ...p, pieceNumber: i + 1 }));
    setPieces(updated);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();

    const resultData: TestResultData = {
      testDate,
      testedBy,
      machineCode,
      pieceResults: pieces,
      avgStrengthMpa,
      designStrengthMpa,
      percentageOfDesign,
      isPassed,
      notes,
      certificateNumber,
    };

    onSaveResult(sample.id, resultData);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
      <div 
        className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 my-8"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="bg-emerald-900 text-white px-5 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-700 flex items-center justify-center text-white">
              <FlaskConical className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-base sm:text-lg">
                Nhập & Tính Toán Kết Quả Nén Mẫu Bê Tông
              </h3>
              <p className="text-xs text-emerald-200 font-mono">
                {sample.id} • {sample.projectName}
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

        {/* Modal Body */}
        <form onSubmit={handleSave} className="p-5 sm:p-6 space-y-5 max-h-[80vh] overflow-y-auto">
          
          {/* Sample Brief Info Card */}
          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
            <div>
              <span className="text-slate-500 font-medium block">Mác Bê Tông:</span>
              <span className="font-extrabold text-emerald-800 text-sm">{sample.concreteGrade}</span>
            </div>
            <div>
              <span className="text-slate-500 font-medium block">Tuổi Nén:</span>
              <span className="font-extrabold text-slate-800 text-sm">{sample.ageType} ({sample.ageDays} ngày)</span>
            </div>
            <div>
              <span className="text-slate-500 font-medium block">Cường Độ TK:</span>
              <span className="font-extrabold text-slate-800 text-sm">{designStrengthMpa} MPa</span>
            </div>
            <div>
              <span className="text-slate-500 font-medium block">Hạng Mục:</span>
              <span className="font-bold text-slate-800 truncate block">{sample.component}</span>
            </div>
          </div>

          {/* Test Equipment & Metadata */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Ngày Nén Thực Tế <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                required
                value={testDate}
                onChange={(e) => setTestDate(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 font-bold text-slate-800"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                KTV Nén Mẫu (Thí Nghiệm) <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={testedBy}
                onChange={(e) => setTestedBy(e.target.value)}
                placeholder="Họ tên KTV"
                className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-slate-800"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Số Biên Bản Thí Nghiệm
              </label>
              <input
                type="text"
                value={certificateNumber}
                onChange={(e) => setCertificateNumber(e.target.value)}
                placeholder="Vd: BBTN-TSG/2026/099"
                className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 font-mono text-slate-800"
              />
            </div>
          </div>

          {/* Individual Piece Measurements Table */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-extrabold text-xs text-slate-800 uppercase tracking-wider flex items-center space-x-1.5">
                <Calculator className="w-4 h-4 text-emerald-700" />
                <span>Số Liệu Nén Từng Viên Trong Tổ Mẫu</span>
              </h4>
              <button
                type="button"
                onClick={handleAddPiece}
                className="text-xs font-bold text-emerald-700 hover:text-emerald-900 bg-emerald-100 hover:bg-emerald-200 px-2 py-0.5 rounded transition-colors"
              >
                + Thêm Viên Mẫu
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-slate-700 text-left border-collapse">
                <thead className="bg-slate-200 text-slate-700 font-bold">
                  <tr>
                    <th className="py-2 px-2.5 w-12 text-center">Viên</th>
                    <th className="py-2 px-2.5">Khối Lượng (kg)</th>
                    <th className="py-2 px-2.5">Lực Phá Hoại (kN)</th>
                    <th className="py-2 px-2.5">Cường Độ (MPa)</th>
                    <th className="py-2 px-2.5 w-10 text-center"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                  {pieces.map((piece, idx) => (
                    <tr key={idx}>
                      <td className="py-2 px-2.5 text-center font-bold text-slate-600">
                        #{piece.pieceNumber}
                      </td>
                      <td className="py-2 px-2.5">
                        <input
                          type="number"
                          step="0.01"
                          value={piece.weightKg || ''}
                          onChange={(e) => handlePieceChange(idx, 'weightKg', parseFloat(e.target.value) || 0)}
                          className="w-24 bg-slate-50 border border-slate-300 rounded p-1.5 text-xs text-slate-800"
                        />
                      </td>
                      <td className="py-2 px-2.5">
                        <input
                          type="number"
                          step="1"
                          value={piece.failureLoadKn || ''}
                          onChange={(e) => handlePieceChange(idx, 'failureLoadKn', parseFloat(e.target.value) || 0)}
                          className="w-28 bg-slate-50 border border-slate-300 rounded p-1.5 text-xs font-bold text-slate-800"
                        />
                      </td>
                      <td className="py-2 px-2.5">
                        <input
                          type="number"
                          step="0.1"
                          value={piece.measuredStrengthMpa || ''}
                          onChange={(e) => handlePieceChange(idx, 'measuredStrengthMpa', parseFloat(e.target.value) || 0)}
                          className="w-28 bg-emerald-50 border border-emerald-300 font-bold rounded p-1.5 text-xs text-emerald-950"
                        />
                      </td>
                      <td className="py-2 px-2.5 text-center">
                        {pieces.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemovePiece(idx)}
                            className="text-red-500 hover:text-red-700 font-bold text-xs"
                          >
                            ✕
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Automatic Results & Evaluation Box */}
          <div className={`p-4 rounded-xl border-2 transition-all ${
            isPassed 
              ? 'bg-emerald-50 border-emerald-500 text-emerald-950' 
              : 'bg-rose-50 border-rose-500 text-rose-950'
          }`}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider block text-slate-600">
                  KẾT QUẢ CƯỜNG ĐỘ NÉN TRUNG BÌNH (TB)
                </span>
                <div className="flex items-baseline space-x-2 mt-1">
                  <span className="text-3xl font-black">{avgStrengthMpa} MPa</span>
                  <span className="text-sm font-bold opacity-80">
                    ({(avgStrengthMpa * 10).toFixed(0)} daN/cm²)
                  </span>
                </div>
                <p className="text-xs font-semibold mt-1">
                  Đạt <strong className="text-base">{percentageOfDesign}%</strong> so với mác thiết kế ({designStrengthMpa} MPa)
                </p>
              </div>

              <div className="text-right sm:text-center">
                <div className={`inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl text-sm font-black uppercase shadow-sm ${
                  isPassed ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'
                }`}>
                  {isPassed ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
                  <span>{isPassed ? 'KẾT LUẬN: ĐẠT YÊU CẦU' : 'KẾT LUẬN: KHÔNG ĐẠT'}</span>
                </div>
                <p className="text-[10px] text-slate-500 mt-1">
                  {sample.ageType === 'R7' ? '(Yêu cầu R7 ≥ 70% mác)' : '(Yêu cầu R28 ≥ 100% mác)'}
                </p>
              </div>
            </div>
          </div>

          {/* Notes & Comments */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Nhận Xét Hình Dạng Phá Hủy & Ghi Chú Biên Bản
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Vd: Mẫu phá hủy đều hình kim tự tháp, không có bọt khí rỗ mặt..."
              className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs text-slate-800"
            />
          </div>

          {/* Actions */}
          <div className="pt-4 border-t border-slate-200 flex items-center justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            >
              Hủy
            </button>

            <button
              type="submit"
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-black px-6 py-2.5 rounded-xl text-xs sm:text-sm flex items-center space-x-2 shadow-md transition-all active:scale-95 cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>Lưu Kết Quả Nén Mẫu</span>
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};

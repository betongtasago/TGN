import React, { useState, useEffect } from 'react';
import { 
  X, 
  FlaskConical, 
  Building2, 
  Calendar, 
  Phone, 
  User as UserIcon, 
  Layers, 
  Clock, 
  PlusCircle, 
  Save, 
  Sparkles,
  AlertCircle
} from 'lucide-react';
import { 
  ConcreteSample, 
  Station, 
  User, 
  ConcreteCategory, 
  ConcreteAgeType, 
  SampleShape 
} from '../types';
import { getDaysFromAgeType, calculateScheduledDate, formatDateVN } from '../utils/storage';

interface SampleFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (sampleData: Partial<ConcreteSample>) => void;
  editingSample: ConcreteSample | null;
  stations: Station[];
  currentUser: User | null;
}

export const SampleFormModal: React.FC<SampleFormModalProps> = ({
  isOpen,
  onClose,
  onSave,
  editingSample,
  stations,
  currentUser,
}) => {
  const [category, setCategory] = useState<ConcreteCategory>('commercial');
  const [stationId, setStationId] = useState<string>(stations[0]?.id || '');
  const [projectName, setProjectName] = useState('');
  const [contractor, setContractor] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [location, setLocation] = useState('');
  const [component, setComponent] = useState('Đổ Dầm Sàn');
  const [volumeM3, setVolumeM3] = useState<number>(100);
  const [castDate, setCastDate] = useState(new Date().toISOString().split('T')[0]);
  const [castTime, setCastTime] = useState('08:00');
  const [concreteGrade, setConcreteGrade] = useState('M300 (B22.5)');
  const [slumpCm, setSlumpCm] = useState('14±2');
  const [ageType, setAgeType] = useState<ConcreteAgeType>('R28');
  const [customDays, setCustomDays] = useState<number>(28);
  const [sampleShape, setSampleShape] = useState<SampleShape>('cube_150');
  const [groupCount, setGroupCount] = useState<number>(1);
  const [pieceCount, setPieceCount] = useState<number>(3);
  const [samplerName, setSamplerName] = useState(currentUser?.fullName || 'KTV Tasago');
  const [witnessPerson, setWitnessPerson] = useState('Tư Vấn Giám Sát Hiện Trường');
  const [sampleCode, setSampleCode] = useState('');
  const [notes, setNotes] = useState('');

  // Auto calculate scheduled test date
  const ageDays = getDaysFromAgeType(ageType, customDays);
  const scheduledTestDate = calculateScheduledDate(castDate, ageDays);

  useEffect(() => {
    if (editingSample) {
      setCategory(editingSample.category);
      setStationId(editingSample.stationId);
      setProjectName(editingSample.projectName);
      setContractor(editingSample.contractor);
      setContactPerson(editingSample.contactPerson);
      setContactPhone(editingSample.contactPhone);
      setLocation(editingSample.location || '');
      setComponent(editingSample.component);
      setVolumeM3(editingSample.volumeM3);
      setCastDate(editingSample.castDate);
      setCastTime(editingSample.castTime || '08:00');
      setConcreteGrade(editingSample.concreteGrade);
      setSlumpCm(editingSample.slumpCm);
      setAgeType(editingSample.ageType);
      setCustomDays(editingSample.ageDays);
      setSampleShape(editingSample.sampleShape);
      setGroupCount(editingSample.groupCount);
      setPieceCount(editingSample.pieceCount);
      setSamplerName(editingSample.samplerName);
      setWitnessPerson(editingSample.witnessPerson || '');
      setSampleCode(editingSample.sampleCode || '');
      setNotes(editingSample.notes || '');
    } else {
      // Reset form to defaults
      setCategory('commercial');
      if (currentUser?.stationIds && currentUser.stationIds[0] !== 'all') {
        setStationId(currentUser.stationIds[0]);
      } else if (stations[0]) {
        setStationId(stations[0].id);
      }
      setProjectName('');
      setContractor('');
      setContactPerson('');
      setContactPhone('');
      setLocation('');
      setComponent('Đổ Dầm Sàn Tầng');
      setVolumeM3(85);
      const todayStr = new Date().toISOString().split('T')[0];
      setCastDate(todayStr);
      setCastTime('08:30');
      setConcreteGrade('M300 (B22.5)');
      setSlumpCm('14±2');
      setAgeType('R28');
      setSampleShape('cube_150');
      setGroupCount(1);
      setPieceCount(3);
      setSamplerName(currentUser?.fullName || 'Nguyễn Văn Thành');
      setWitnessPerson('');
      setSampleCode(`TSG-${Date.now().toString().slice(-4)}`);
      setNotes('');
    }
  }, [editingSample, isOpen, stations, currentUser]);

  // Adjust shape and piece count when age type changes
  const handleAgeTypeChange = (newAge: ConcreteAgeType) => {
    setAgeType(newAge);
    if (newAge === 'R28_WATERPROOF') {
      setSampleShape('waterproof_150');
      setGroupCount(2);
      setPieceCount(6);
    } else if (newAge === 'EXPANSION') {
      setSampleShape('expansion');
    }
  };

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!projectName.trim()) {
      alert('Vui lòng nhập tên công trình!');
      return;
    }
    if (!stationId) {
      alert('Vui lòng chọn trạm trộn!');
      return;
    }

    const payload: Partial<ConcreteSample> = {
      category,
      stationId,
      projectName: projectName.trim(),
      contractor: contractor.trim() || 'Chưa cập nhật',
      contactPerson: contactPerson.trim() || 'Chỉ huy trưởng',
      contactPhone: contactPhone.trim() || '---',
      location: location.trim(),
      component: component.trim() || 'Bê tông kết cấu',
      volumeM3: Number(volumeM3) || 0,
      castDate,
      castTime,
      concreteGrade,
      slumpCm,
      ageType,
      ageDays,
      scheduledTestDate,
      sampleShape,
      groupCount: Number(groupCount) || 1,
      pieceCount: Number(pieceCount) || 3,
      samplerName: samplerName.trim() || currentUser?.fullName || 'KTV Tasago',
      witnessPerson: witnessPerson.trim(),
      sampleCode: sampleCode.trim() || `TSG-SAMPLE-${Date.now().toString().slice(-4)}`,
      notes: notes.trim(),
    };

    onSave(payload);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
      <div 
        className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-3xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 my-8"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="bg-emerald-800 text-white px-5 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-700 flex items-center justify-center text-white">
              <FlaskConical className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base sm:text-lg">
                {editingSample ? 'Chỉnh Sửa Thông Tin Mẫu Bê Tông' : 'Nhập Mới Dữ Liệu Nén Mẫu Bê Tông'}
              </h3>
              <p className="text-xs text-emerald-200">
                Công Ty CP Đầu Tư Tasago • Hệ Thống Kiểm Định Chất Lượng
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-emerald-200 hover:text-white p-1 rounded-lg hover:bg-emerald-700/80 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-5 max-h-[80vh] overflow-y-auto">
          
          {/* Category Toggle */}
          <div className="bg-slate-100 p-1.5 rounded-xl flex items-center space-x-2 text-xs font-bold">
            <button
              type="button"
              onClick={() => setCategory('commercial')}
              className={`flex-1 py-2 px-3 rounded-lg transition-all flex items-center justify-center space-x-1.5 ${
                category === 'commercial'
                  ? 'bg-emerald-600 text-white shadow'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>🚚 Bê Tông Đã Cấp (Thương Phẩm)</span>
            </button>
            <button
              type="button"
              onClick={() => setCategory('trialmix')}
              className={`flex-1 py-2 px-3 rounded-lg transition-all flex items-center justify-center space-x-1.5 ${
                category === 'trialmix'
                  ? 'bg-purple-700 text-white shadow'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>🧪 Mẫu Thí Nghiệm Trialmix (Lab R&D)</span>
            </button>
          </div>

          {/* Section 1: Station & Project Details */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80 space-y-3">
            <h4 className="font-extrabold text-xs text-slate-800 uppercase tracking-wider flex items-center space-x-1.5">
              <Building2 className="w-4 h-4 text-emerald-700" />
              <span>1. Thông Tin Trạm & Công Trình</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              {/* Station Selection */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Trạm Trộn Cung Cấp <span className="text-red-500">*</span>
                </label>
                <select
                  required
                  value={stationId}
                  onChange={(e) => setStationId(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-lg p-2 font-medium text-slate-800 focus:ring-1 focus:ring-emerald-500"
                >
                  {stations.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.code}) {s.active === false ? '— [Tạm Ngưng]' : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Sample Field Code */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Mã Số Mẫu Hiện Trường
                </label>
                <input
                  type="text"
                  value={sampleCode}
                  onChange={(e) => setSampleCode(e.target.value)}
                  placeholder="Vd: HP-M350-01"
                  className="w-full bg-white border border-slate-300 rounded-lg p-2 font-mono text-slate-800 focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              {/* Project Name */}
              <div className="sm:col-span-2">
                <label className="block font-bold text-slate-700 mb-1">
                  Tên Công Trình / Dự Án <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  placeholder="Vd: Tòa Nhà Cao Tầng Tasago Green Tower..."
                  className="w-full bg-white border border-slate-300 rounded-lg p-2 font-semibold text-slate-900 focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              {/* Contractor */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Đơn Vị Thi Công / Khách Hàng
                </label>
                <input
                  type="text"
                  value={contractor}
                  onChange={(e) => setContractor(e.target.value)}
                  placeholder="Vd: Công Ty CP Xây Dựng Coteccons"
                  className="w-full bg-white border border-slate-300 rounded-lg p-2 text-slate-800 focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              {/* Location */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Địa Điểm / Địa Chỉ Đổ
                </label>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="Vd: KCN Hiệp Phước, Nhà Bè, TP.HCM"
                  className="w-full bg-white border border-slate-300 rounded-lg p-2 text-slate-800 focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              {/* Contact Person */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Người Liên Hệ Công Trình <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={contactPerson}
                  onChange={(e) => setContactPerson(e.target.value)}
                  placeholder="Vd: Anh Hoàng (Chỉ huy trưởng)"
                  className="w-full bg-white border border-slate-300 rounded-lg p-2 text-slate-800 focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              {/* Contact Phone */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Số Điện Thoại Liên Hệ <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  required
                  value={contactPhone}
                  onChange={(e) => setContactPhone(e.target.value)}
                  placeholder="Vd: 0908123456"
                  className="w-full bg-white border border-slate-300 rounded-lg p-2 text-slate-800 font-bold focus:ring-1 focus:ring-emerald-500"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Concrete Technical Specifications */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80 space-y-3">
            <h4 className="font-extrabold text-xs text-slate-800 uppercase tracking-wider flex items-center space-x-1.5">
              <FlaskConical className="w-4 h-4 text-emerald-700" />
              <span>2. Quy Cách Kỹ Thuật Bê Tông & Hạng Mục</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-xs">
              {/* Structural Component */}
              <div className="sm:col-span-2">
                <label className="block font-bold text-slate-700 mb-1">
                  Hạng Mục Đổ Bê Tông <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={component}
                  onChange={(e) => setComponent(e.target.value)}
                  placeholder="Vd: Đổ Dầm Sàn Tầng 5 / Móng Trục A-D / Cột..."
                  className="w-full bg-white border border-slate-300 rounded-lg p-2 font-medium text-slate-800 focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              {/* Volume m3 */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Khối Lượng Đổ (m³) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  step="0.1"
                  required
                  value={volumeM3}
                  onChange={(e) => setVolumeM3(parseFloat(e.target.value) || 0)}
                  className="w-full bg-white border border-slate-300 rounded-lg p-2 font-bold text-emerald-900 focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              {/* Concrete Grade */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Mác Bê Tông <span className="text-red-500">*</span>
                </label>
                <select
                  value={concreteGrade}
                  onChange={(e) => setConcreteGrade(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-lg p-2 font-bold text-emerald-800 focus:ring-1 focus:ring-emerald-500"
                >
                  <option value="M150 (B10)">M150 (B10)</option>
                  <option value="M200 (B15)">M200 (B15)</option>
                  <option value="M250 (B20)">M250 (B20)</option>
                  <option value="M300 (B22.5)">M300 (B22.5)</option>
                  <option value="M350 (B25)">M350 (B25)</option>
                  <option value="M400 (B30)">M400 (B30)</option>
                  <option value="M450 (B35)">M450 (B35)</option>
                  <option value="M500 (B40)">M500 (B40)</option>
                  <option value="M600 (B45)">M600 (B45)</option>
                  <option value="M300 - B6 Chống Thấm">M300 - B6 Chống Thấm</option>
                  <option value="M350 - B8 Chống Thấm">M350 - B8 Chống Thấm</option>
                  <option value="M400 - B10 Chống Thấm">M400 - B10 Chống Thấm</option>
                  <option value="M250 - Bù Co Ngót">M250 - Bù Co Ngót</option>
                  <option value="M350 - Bù Co Ngót">M350 - Bù Co Ngót</option>
                  <option value="M400 R3 Đông Kết Sớm">M400 R3 Đông Kết Sớm</option>
                </select>
              </div>

              {/* Slump */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Độ Sụt (cm)
                </label>
                <select
                  value={slumpCm}
                  onChange={(e) => setSlumpCm(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-lg p-2 text-slate-800"
                >
                  <option value="10±2">10±2 cm</option>
                  <option value="12±2">12±2 cm</option>
                  <option value="14±2">14±2 cm (Chuẩn)</option>
                  <option value="16±2">16±2 cm</option>
                  <option value="18±2">18±2 cm</option>
                  <option value="Xòe 600-650 (SCC)">Xòe 600-650 mm (Tự đầm SCC)</option>
                </select>
              </div>

              {/* Sample Shape */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Loại Mẫu Đúc <span className="text-red-500">*</span>
                </label>
                <select
                  value={sampleShape}
                  onChange={(e) => setSampleShape(e.target.value as SampleShape)}
                  className="w-full bg-white border border-slate-300 rounded-lg p-2 font-medium text-slate-800"
                >
                  <option value="cube_150">Mẫu Vuông 150x150x150mm</option>
                  <option value="cylinder_150_300">Mẫu Trụ Ø150x300mm</option>
                  <option value="waterproof_150">Mẫu Trụ Chống Thấm</option>
                  <option value="expansion">Mẫu Bù Co Ngót / Uốn</option>
                  <option value="other">Loại Khác</option>
                </select>
              </div>
            </div>
          </div>

          {/* Section 3: Casting Date, Age & Scheduled Test Date */}
          <div className="bg-emerald-50/80 p-4 rounded-xl border border-emerald-300 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-extrabold text-xs text-emerald-950 uppercase tracking-wider flex items-center space-x-1.5">
                <Calendar className="w-4 h-4 text-emerald-700" />
                <span>3. Tuổi Nén & Tự Động Tính Ngày Nén</span>
              </h4>
              <span className="text-[11px] bg-emerald-200 text-emerald-900 font-bold px-2 py-0.5 rounded">
                Tự động tính ngày chuẩn TCVN
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
              {/* Cast Date */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Ngày Đúc Mẫu <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  required
                  value={castDate}
                  onChange={(e) => setCastDate(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-lg p-2 font-bold text-slate-800 focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              {/* Cast Time */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Giờ Đúc
                </label>
                <input
                  type="time"
                  value={castTime}
                  onChange={(e) => setCastTime(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-lg p-2 text-slate-800"
                />
              </div>

              {/* Age Type */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Tuổi Nén (Loại Tuổi) <span className="text-red-500">*</span>
                </label>
                <select
                  value={ageType}
                  onChange={(e) => handleAgeTypeChange(e.target.value as ConcreteAgeType)}
                  className="w-full bg-white border border-slate-300 rounded-lg p-2 font-black text-emerald-900 focus:ring-1 focus:ring-emerald-500"
                >
                  <option value="R3">R3 (3 ngày - Đông kết sớm)</option>
                  <option value="R7">R7 (7 ngày - Cốt pha móng/dầm)</option>
                  <option value="R14">R14 (14 ngày)</option>
                  <option value="R28">R28 (28 ngày - Thiết kế chuẩn)</option>
                  <option value="R60">R60 (60 ngày)</option>
                  <option value="R90">R90 (90 ngày - Đập/Thủy điện)</option>
                  <option value="R28_WATERPROOF">R28 Chống Thấm (B6/B8/B10/B12)</option>
                  <option value="EXPANSION">Bù Co Ngót (14 ngày)</option>
                  <option value="CUSTOM">Tùy Chỉnh Số Ngày</option>
                </select>
              </div>

              {/* Computed Scheduled Test Date (Highlighted) */}
              <div className="bg-white p-2 rounded-lg border-2 border-emerald-500 shadow-sm flex flex-col justify-center">
                <span className="text-[10px] font-bold text-slate-500 uppercase">
                  Ngày Nén Dự Kiến
                </span>
                <span className="text-sm font-black text-red-600">
                  {formatDateVN(scheduledTestDate)}
                </span>
                <span className="text-[10px] text-emerald-800 font-semibold">
                  (Sau {ageDays} ngày kể từ ngày đúc)
                </span>
              </div>
            </div>

            {/* Custom Days Input if CUSTOM selected */}
            {ageType === 'CUSTOM' && (
              <div className="pt-2">
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nhập Số Ngày Tuổi Tùy Chỉnh
                </label>
                <input
                  type="number"
                  min="1"
                  max="365"
                  value={customDays}
                  onChange={(e) => setCustomDays(parseInt(e.target.value, 10) || 28)}
                  className="w-40 bg-white border border-slate-300 rounded-lg p-2 text-xs font-bold text-slate-800"
                />
              </div>
            )}
          </div>

          {/* Section 4: Samples Quantity & Sampler */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Số Lượng Tổ Mẫu
              </label>
              <input
                type="number"
                min="1"
                max="20"
                value={groupCount}
                onChange={(e) => setGroupCount(parseInt(e.target.value, 10) || 1)}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 font-bold"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Tổng Số Viên Mẫu
              </label>
              <input
                type="number"
                min="1"
                max="60"
                value={pieceCount}
                onChange={(e) => setPieceCount(parseInt(e.target.value, 10) || 3)}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 font-bold"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                KTV Lấy Mẫu <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={samplerName}
                onChange={(e) => setSamplerName(e.target.value)}
                placeholder="Vd: Nguyễn Văn Thành"
                className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Người Giám Sát / Chứng Kiến
              </label>
              <input
                type="text"
                value={witnessPerson}
                onChange={(e) => setWitnessPerson(e.target.value)}
                placeholder="Vd: TVGS Artelia / APAVE"
                className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2"
              />
            </div>
          </div>

          {/* Section 5: Notes */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Ghi Chú Kỹ Thuật / Phụ Gia / Yêu Cầu Đặc Biệt
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Vd: Mẫu bảo dưỡng ẩm tiêu chuẩn tại phòng dưỡng hộ, yêu cầu nén sớm R7 để phục vụ tháo ván khuôn..."
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
              Hủy Bỏ
            </button>

            <button
              type="submit"
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-black px-6 py-2.5 rounded-xl text-xs sm:text-sm flex items-center space-x-2 shadow-lg shadow-emerald-600/30 transition-all active:scale-95 cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>{editingSample ? 'Cập Nhật Mẫu' : 'Lưu & Đặt Lịch Nhắc Tự Động'}</span>
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};

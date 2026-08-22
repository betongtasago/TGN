import React, { useState, useMemo } from 'react';
import { 
  FlaskConical, 
  Search, 
  PlusCircle, 
  FileSpreadsheet, 
  Calendar, 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  Trash2, 
  Edit3, 
  Phone, 
  Send, 
  Printer, 
  ArrowUpDown,
  Building2,
  ExternalLink,
  ChevronRight,
  Sparkles,
  Layers,
  MapPin,
  Check
} from 'lucide-react';
import { ConcreteSample, Station, User } from '../types';
import { formatDateVN, ViewMode } from '../utils/storage';

interface SampleListProps {
  samples: ConcreteSample[];
  stations: Station[];
  currentUser?: User | null;
  selectedStationId: string;
  onSelectStation?: (stationId: string) => void;
  onOpenNewSampleModal?: () => void;
  onAddNew?: () => void;
  onSelectSampleForEdit?: (sample: ConcreteSample) => void;
  onEdit?: (sample: ConcreteSample) => void;
  onSelectSampleForTest?: (sample: ConcreteSample) => void;
  onOpenTestResult?: (sample: ConcreteSample) => void;
  onSelectSampleDetail?: (sample: ConcreteSample) => void;
  onOpenDetail?: (sample: ConcreteSample) => void;
  onDeleteSample?: (sampleId: string) => void;
  onDelete?: (sampleId: string) => void;
  onSendSingleNotification?: (sample: ConcreteSample) => void;
  onOpenNotification?: (sample: ConcreteSample) => void;
  onExportExcel?: (samples: ConcreteSample[]) => void;
  userRole?: string;
  viewMode?: ViewMode;
}

export const SampleList: React.FC<SampleListProps> = ({
  samples,
  stations,
  currentUser,
  selectedStationId,
  onSelectStation,
  onOpenNewSampleModal,
  onAddNew,
  onSelectSampleForEdit,
  onEdit,
  onSelectSampleForTest,
  onOpenTestResult,
  onSelectSampleDetail,
  onOpenDetail,
  onDeleteSample,
  onDelete,
  onSendSingleNotification,
  onOpenNotification,
  onExportExcel,
  userRole,
  viewMode = 'auto',
}) => {
  const handleAddNew = onAddNew || onOpenNewSampleModal || (() => {});
  const handleEdit = onEdit || onSelectSampleForEdit || (() => {});
  const handleTest = onOpenTestResult || onSelectSampleForTest || (() => {});
  const handleDetail = onOpenDetail || onSelectSampleDetail || (() => {});
  const handleDelete = onDelete || onDeleteSample || (() => {});
  const handleNotify = onOpenNotification || onSendSingleNotification || (() => {});
  const handleExport = onExportExcel || (() => {});

  // Permission check helper: Admin can modify everything; Members can only modify their own samples or samples of their assigned station
  const canModifySample = (sample: ConcreteSample) => {
    if (!currentUser) return true;
    if (currentUser.role === 'admin') return true;
    // Check if member created this sample or matches username / creator name
    if (sample.createdBy && sample.createdBy === currentUser.username) return true;
    if (sample.samplerName && sample.samplerName.trim().toLowerCase() === currentUser.fullName.trim().toLowerCase()) return true;
    // If not created by member, member cannot edit other members' samples
    return false;
  };

  const handleGuardedEdit = (sample: ConcreteSample) => {
    if (!canModifySample(sample)) {
      alert(`⚠️ Bạn không có quyền chỉnh sửa mẫu của thành viên khác (${sample.createdByName || sample.samplerName || 'Thành viên khác'}). Chỉ Quản Trị Viên (Admin) hoặc người tạo mẫu mới có quyền chỉnh sửa.`);
      return;
    }
    handleEdit(sample);
  };

  const handleGuardedDelete = (sample: ConcreteSample) => {
    if (!canModifySample(sample)) {
      alert(`⚠️ Bạn không có quyền xóa mẫu của thành viên khác (${sample.createdByName || sample.samplerName || 'Thành viên khác'}). Chỉ Quản Trị Viên (Admin) hoặc người tạo mẫu mới có quyền xóa.`);
      return;
    }
    handleDelete(sample.id);
  };

  const handleGuardedTest = (sample: ConcreteSample) => {
    if (!canModifySample(sample) && currentUser?.role !== 'admin') {
      alert(`⚠️ Bạn không có quyền nhập kết quả cho mẫu của thành viên khác (${sample.createdByName || sample.samplerName || 'Thành viên khác'}).`);
      return;
    }
    handleTest(sample);
  };

  const stationMap = useMemo(() => {
    const map = new Map<string, Station>();
    stations.forEach(s => map.set(s.id, s));
    return map;
  }, [stations]);

  // Filters
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [ageFilter, setAgeFilter] = useState<string>('all');
  const [gradeFilter, setGradeFilter] = useState<string>('all');
  const [sortField, setSortField] = useState<'createdAt' | 'scheduledTestDate' | 'castDate' | 'projectName'>('createdAt');
  const [sortAsc, setSortAsc] = useState<boolean>(false);

  // Available grades for filter
  const availableGrades = useMemo(() => {
    const grades = new Set<string>();
    samples.forEach(s => {
      if (s.concreteGrade) grades.add(s.concreteGrade);
    });
    return Array.from(grades);
  }, [samples]);

  // Filtered and Sorted list
  const filteredSamples = useMemo(() => {
    return samples.filter(item => {
      if (selectedStationId !== 'all' && item.stationId !== selectedStationId) {
        return false;
      }
      if (activeCategory !== 'all' && item.category !== activeCategory) {
        return false;
      }
      if (statusFilter !== 'all' && item.status !== statusFilter) {
        return false;
      }
      if (ageFilter !== 'all') {
        if (ageFilter === 'R28_WATERPROOF' && item.ageType !== 'R28_WATERPROOF') return false;
        if (ageFilter === 'EXPANSION' && item.ageType !== 'EXPANSION') return false;
        if (item.ageType !== ageFilter && !item.ageType.startsWith(ageFilter)) return false;
      }
      if (gradeFilter !== 'all' && item.concreteGrade !== gradeFilter) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const station = stationMap.get(item.stationId);
        const matchProject = item.projectName?.toLowerCase().includes(q);
        const matchContractor = item.contractor?.toLowerCase().includes(q);
        const matchCode = item.sampleCode?.toLowerCase().includes(q);
        const matchContact = item.contactPerson?.toLowerCase().includes(q);
        const matchPhone = item.contactPhone?.includes(q);
        const matchStation = station?.name.toLowerCase().includes(q);
        const matchSampler = item.samplerName?.toLowerCase().includes(q);
        const matchCreator = item.createdByName?.toLowerCase().includes(q);
        const matchComponent = item.component?.toLowerCase().includes(q);
        return matchProject || matchContractor || matchCode || matchContact || matchPhone || matchStation || matchSampler || matchCreator || matchComponent;
      }
      return true;
    }).sort((a, b) => {
      let valA = a[sortField] || '';
      let valB = b[sortField] || '';
      if (valA < valB) return sortAsc ? -1 : 1;
      if (valA > valB) return sortAsc ? 1 : -1;
      return 0;
    });
  }, [samples, selectedStationId, activeCategory, statusFilter, ageFilter, gradeFilter, searchQuery, sortField, sortAsc, stationMap]);

  // Decide if mobile layout should be shown
  const showMobileLayout = viewMode === 'mobile';
  const showDesktopLayout = viewMode === 'pc';

  return (
    <div className="space-y-4 font-sans">
      
      {/* Category Tabs & Quick Filters Bar */}
      <div className="bg-white rounded-xl border border-slate-200 p-3 sm:p-4 shadow-xs space-y-3">
        
        {/* Category Tabs */}
        <div className="flex border-b border-slate-200 text-xs sm:text-sm font-semibold overflow-x-auto scrollbar-none gap-1 sm:gap-4">
          <button
            onClick={() => setActiveCategory('all')}
            className={`pb-2 px-3 sm:px-4 transition-all cursor-pointer whitespace-nowrap ${
              activeCategory === 'all'
                ? 'text-emerald-800 border-b-2 border-emerald-700 font-bold'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            📋 Tất Cả Mẫu ({samples.length})
          </button>

          <button
            onClick={() => setActiveCategory('commercial')}
            className={`pb-2 px-3 sm:px-4 transition-all cursor-pointer whitespace-nowrap ${
              activeCategory === 'commercial'
                ? 'text-emerald-800 border-b-2 border-emerald-700 font-bold'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            🚚 Thương Phẩm ({samples.filter(s => s.category === 'commercial').length})
          </button>

          <button
            onClick={() => setActiveCategory('trialmix')}
            className={`pb-2 px-3 sm:px-4 transition-all cursor-pointer whitespace-nowrap ${
              activeCategory === 'trialmix'
                ? 'text-emerald-800 border-b-2 border-emerald-700 font-bold'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            🧪 Trialmix / R&D ({samples.filter(s => s.category === 'trialmix').length})
          </button>
        </div>

        {/* Filter Controls Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-2 text-xs">
          
          {/* Search Box */}
          <div className="relative lg:col-span-2">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm theo công trình, nhà thầu, mã mẫu, KTV..."
              className="w-full pl-9 pr-7 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 text-slate-800"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            )}
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full py-2 px-2.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 focus:ring-1 focus:ring-emerald-500 cursor-pointer"
            >
              <option value="all">🔍 Tất Cả Tình Trạng</option>
              <option value="due_today">🔴 Đến Hạn Hôm Nay</option>
              <option value="overdue">⚠️ Quá Hạn Chưa Nén</option>
              <option value="pending">⏳ Chưa Đến Hạn</option>
              <option value="tested_passed">✅ Đã Nén - ĐẠT</option>
              <option value="tested_failed">❌ Đã Nén - KHÔNG ĐẠT</option>
            </select>
          </div>

          {/* Age Filter */}
          <div>
            <select
              value={ageFilter}
              onChange={(e) => setAgeFilter(e.target.value)}
              className="w-full py-2 px-2.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 focus:ring-1 focus:ring-emerald-500 cursor-pointer"
            >
              <option value="all">⏱️ Tất Cả Tuổi Nén</option>
              <option value="R3">Tuổi R3 (3 ngày)</option>
              <option value="R7">Tuổi R7 (7 ngày)</option>
              <option value="R14">Tuổi R14 (14 ngày)</option>
              <option value="R28">Tuổi R28 (28 ngày)</option>
              <option value="R28_WATERPROOF">R28 Chống Thấm</option>
              <option value="EXPANSION">Bù Co Ngót</option>
            </select>
          </div>

          {/* Concrete Grade Filter */}
          <div>
            <select
              value={gradeFilter}
              onChange={(e) => setGradeFilter(e.target.value)}
              className="w-full py-2 px-2.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 focus:ring-1 focus:ring-emerald-500 cursor-pointer"
            >
              <option value="all">🧪 Mác Bê Tông (Tất Cả)</option>
              {availableGrades.map(g => (
                <option key={g} value={g}>{g}</option>
              ))}
            </select>
          </div>

          {/* Sort Order Selector */}
          <div>
            <select
              value={`${sortField}_${sortAsc ? 'asc' : 'desc'}`}
              onChange={(e) => {
                const [f, d] = e.target.value.split('_');
                setSortField(f as any);
                setSortAsc(d === 'asc');
              }}
              className="w-full py-2 px-2.5 bg-emerald-50/70 border border-emerald-300 rounded-lg text-xs font-bold text-emerald-900 focus:ring-1 focus:ring-emerald-500 cursor-pointer"
            >
              <option value="createdAt_desc">✨ Mới tạo gần đây</option>
              <option value="scheduledTestDate_asc">🗓️ Ngày nén (Sớm nhất)</option>
              <option value="scheduledTestDate_desc">🗓️ Ngày nén (Muộn nhất)</option>
              <option value="castDate_desc">📅 Ngày đúc (Mới nhất)</option>
              <option value="projectName_asc">🏢 Tên công trình (A-Z)</option>
            </select>
          </div>

        </div>

      </div>

      {/* Station Filter Active Notice */}
      {selectedStationId !== 'all' && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-2 text-xs flex items-center justify-between text-emerald-900">
          <div className="flex items-center gap-1.5 font-medium">
            <Building2 className="w-4 h-4 text-emerald-700" />
            <span>Đang xem danh sách mẫu của <strong>{stationMap.get(selectedStationId)?.name || selectedStationId}</strong></span>
          </div>
          <span className="text-[11px] text-emerald-700">
            Có <strong>{filteredSamples.length}</strong> / {samples.length} mẫu toàn hệ thống
          </span>
        </div>
      )}

      {/* Empty State */}
      {filteredSamples.length === 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-400 space-y-3 shadow-xs">
          <FlaskConical className="w-12 h-12 mx-auto text-slate-300" />
          <p className="text-base font-bold text-slate-600">Không tìm thấy mẫu bê tông nào phù hợp</p>
          <p className="text-xs text-slate-400">Thử thay đổi từ khóa tìm kiếm hoặc lọc theo trạm khác</p>
          <button
            onClick={handleAddNew}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 py-2 rounded-lg text-xs inline-flex items-center gap-1.5 mt-2 cursor-pointer shadow-xs"
          >
            <PlusCircle className="w-4 h-4" />
            <span>+ Thêm Mẫu Mới Ngay</span>
          </button>
        </div>
      )}

      {/* MOBILE CARD VIEW (Active when viewMode === 'mobile' or automatically on screens < md unless viewMode === 'pc') */}
      {filteredSamples.length > 0 && (
        <div className={`${showMobileLayout ? 'block' : showDesktopLayout ? 'hidden' : 'block md:hidden'} space-y-3`}>
          {filteredSamples.map((sample) => {
            const station = stationMap.get(sample.stationId);
            const isTested = sample.status === 'tested_passed' || sample.status === 'tested_failed';
            const isDueToday = sample.status === 'due_today';
            const isOverdue = sample.status === 'overdue';

            return (
              <div 
                key={sample.id}
                className={`bg-white rounded-xl border p-3.5 shadow-xs transition-all ${
                  isDueToday 
                    ? 'border-orange-300 bg-orange-50/20' 
                    : isOverdue 
                    ? 'border-amber-300 bg-amber-50/10' 
                    : 'border-slate-200'
                }`}
              >
                {/* Header: Project Name + Status Badge */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 uppercase font-mono">
                        {sample.sampleCode}
                      </span>
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                        sample.category === 'trialmix' ? 'bg-purple-100 text-purple-800' : 'bg-blue-50 text-blue-700'
                      }`}>
                        {sample.category === 'trialmix' ? '🧪 Trialmix' : '🚚 Thương phẩm'}
                      </span>
                    </div>
                    <button
                      onClick={() => handleDetail(sample)}
                      className="font-bold text-slate-900 text-sm mt-1 text-left line-clamp-1 hover:text-emerald-700 cursor-pointer"
                    >
                      {sample.projectName}
                    </button>
                    <p className="text-xs text-slate-500 line-clamp-1">
                      {station?.name || 'Trạm Tasago'} • {sample.contractor}
                    </p>
                  </div>

                  {/* Status Indicator */}
                  <div>
                    {isTested && sample.testResult ? (
                      <div className="text-right">
                        <span className={`inline-block text-[11px] font-bold px-2 py-0.5 rounded ${
                          sample.status === 'tested_passed' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {sample.status === 'tested_passed' ? '✅ ĐẠT' : '❌ K.ĐẠT'}
                        </span>
                        <div className="text-xs font-bold text-emerald-700 mt-0.5">
                          {sample.testResult.avgStrengthMpa.toFixed(1)} MPa
                        </div>
                      </div>
                    ) : (
                      <span className={`inline-block text-[10px] font-bold px-2 py-1 rounded ${
                        isDueToday ? 'bg-red-100 text-red-700 animate-pulse' :
                        isOverdue ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-600'
                      }`}>
                        {isDueToday ? '🔴 ĐẾN HẠN' : isOverdue ? '⚠️ QUÁ HẠN' : '⏳ CHỜ NÉN'}
                      </span>
                    )}
                  </div>
                </div>

                {/* Specs Grid */}
                <div className="grid grid-cols-2 gap-2 mt-2.5 pt-2.5 border-t border-slate-100 text-xs text-slate-600">
                  <div className="bg-slate-50 p-2 rounded-lg">
                    <span className="text-[10px] text-slate-400 block font-medium">Ngày Nén Dự Kiến</span>
                    <span className="font-bold text-emerald-800 font-mono text-xs">
                      {formatDateVN(sample.scheduledTestDate)}
                    </span>
                    <span className="text-[10px] text-slate-400 block">Đúc: {formatDateVN(sample.castDate)}</span>
                  </div>

                  <div className="bg-slate-50 p-2 rounded-lg">
                    <span className="text-[10px] text-slate-400 block font-medium">Mác & Tuổi</span>
                    <div className="flex items-center gap-1 font-bold text-slate-800 text-xs">
                      <span>{sample.concreteGrade}</span>
                      <span className="text-emerald-700">({sample.ageType})</span>
                    </div>
                    <span className="text-[10px] text-slate-400 block">{sample.volumeM3} m³ • {sample.groupCount} tổ ({sample.pieceCount}v)</span>
                  </div>
                </div>

                {/* Component Name */}
                <div className="mt-2 text-xs text-slate-700 flex items-center gap-1 bg-slate-50/80 px-2.5 py-1.5 rounded-md">
                  <Layers className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span className="truncate">{sample.component || 'Kết cấu bê tông'}</span>
                </div>

                {/* Mobile Quick Action Ribbon */}
                <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between gap-1 text-xs">
                  <a
                    href={`tel:${sample.contactPhone || '0942320923'}`}
                    className="flex-1 py-1.5 px-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-lg font-bold flex items-center justify-center gap-1 transition-colors"
                  >
                    <Phone className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Gọi</span>
                  </a>

                  {!isTested && (
                    <button
                      onClick={() => handleGuardedTest(sample)}
                      className="flex-1 py-1.5 px-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold flex items-center justify-center gap-1 transition-colors cursor-pointer shadow-xs"
                    >
                      <FlaskConical className="w-3.5 h-3.5" />
                      <span>Nhập KQ</span>
                    </button>
                  )}

                  <button
                    onClick={() => handleNotify(sample)}
                    className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg cursor-pointer transition-colors"
                    title="Gửi Zalo / Email"
                  >
                    <Send className="w-4 h-4 text-blue-600" />
                  </button>

                  <button
                    onClick={() => handleDetail(sample)}
                    className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg cursor-pointer transition-colors"
                    title="Xem chi tiết"
                  >
                    <Printer className="w-4 h-4 text-slate-600" />
                  </button>

                  {canModifySample(sample) ? (
                    <>
                      <button
                        onClick={() => handleGuardedEdit(sample)}
                        className="p-1.5 bg-slate-100 hover:bg-amber-50 text-slate-700 hover:text-amber-700 rounded-lg cursor-pointer transition-colors"
                        title="Sửa thông tin mẫu"
                      >
                        <Edit3 className="w-4 h-4 text-amber-600" />
                      </button>

                      <button
                        onClick={() => handleGuardedDelete(sample)}
                        className="p-1.5 bg-slate-100 hover:bg-red-50 text-slate-400 hover:text-red-600 rounded-lg cursor-pointer transition-colors"
                        title="Xóa mẫu"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </>
                  ) : (
                    <span 
                      className="p-1.5 text-slate-300 cursor-not-allowed text-[11px] font-medium"
                      title={`Mẫu do ${sample.createdByName || sample.samplerName || 'thành viên khác'} tạo`}
                    >
                      🔒 Chỉ xem
                    </span>
                  )}
                </div>

              </div>
            );
          })}
        </div>
      )}

      {/* DESKTOP TABLE VIEW (Active when viewMode === 'pc' or automatically on screens >= md unless viewMode === 'mobile') */}
      {filteredSamples.length > 0 && (
        <div className={`${showDesktopLayout ? 'block' : showMobileLayout ? 'hidden' : 'hidden md:block'} bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden`}>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500 font-bold border-b border-slate-200">
                <tr>
                  <th className="px-5 py-3">Ngày Nén</th>
                  <th className="px-5 py-3">Công Trình / Trạm</th>
                  <th className="px-5 py-3">Hạng Mục</th>
                  <th className="px-5 py-3">Mác / Tuổi</th>
                  <th className="px-5 py-3 text-center">Số Tổ</th>
                  <th className="px-5 py-3">Tình Trạng / KQ</th>
                  <th className="px-5 py-3">Liên Hệ</th>
                  <th className="px-5 py-3 text-right">Thao Tác</th>
                </tr>
              </thead>
              <tbody className="text-sm divide-y divide-slate-100">
                {filteredSamples.map((sample) => {
                  const station = stationMap.get(sample.stationId);
                  const isTested = sample.status === 'tested_passed' || sample.status === 'tested_failed';
                  const isDueToday = sample.status === 'due_today';
                  const isOverdue = sample.status === 'overdue';

                  return (
                    <tr 
                      key={sample.id}
                      className={`hover:bg-slate-50 transition-colors ${
                        isDueToday ? 'bg-orange-50/30' : ''
                      }`}
                    >
                      {/* Ngày nén */}
                      <td className="px-5 py-3.5 font-mono font-bold text-emerald-700 whitespace-nowrap">
                        <div className="text-xs">{formatDateVN(sample.scheduledTestDate)}</div>
                        <div className="text-[10px] text-slate-400 font-normal">
                          Đúc: {formatDateVN(sample.castDate)}
                        </div>
                      </td>

                      {/* Công trình / Trạm */}
                      <td className="px-5 py-3.5">
                        <button
                          onClick={() => handleDetail(sample)}
                          className="font-bold text-slate-900 hover:text-emerald-700 text-left line-clamp-1 block cursor-pointer text-xs sm:text-sm"
                        >
                          {sample.projectName}
                        </button>
                        <div className="text-xs text-slate-400 line-clamp-1">
                          {station ? station.name : 'Trạm Tasago'} • {sample.contractor}
                        </div>
                      </td>

                      {/* Hạng mục */}
                      <td className="px-5 py-3.5 text-slate-600 text-xs">
                        <div className="font-medium text-slate-800 line-clamp-1">{sample.component}</div>
                        <div className="text-slate-400">{sample.volumeM3} m³</div>
                      </td>

                      {/* Mác / Tuổi */}
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        <span className="bg-slate-100 px-2 py-0.5 rounded text-xs font-bold text-slate-800">
                          {sample.concreteGrade}
                        </span>
                        <span className={`font-bold ml-1 text-xs ${
                          sample.ageType === 'R7' ? 'text-orange-600' :
                          sample.ageType === 'R28' ? 'text-blue-600' :
                          sample.ageType.includes('WATERPROOF') ? 'text-purple-600' : 'text-emerald-700'
                        }`}>
                          {sample.ageType}
                        </span>
                      </td>

                      {/* Số tổ */}
                      <td className="px-5 py-3.5 text-center font-semibold text-slate-700 text-xs">
                        {String(sample.groupCount).padStart(2, '0')}
                        <div className="text-[10px] text-slate-400 font-normal">
                          ({sample.pieceCount} viên)
                        </div>
                      </td>

                      {/* Tình Trạng / KQ */}
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        {isTested && sample.testResult ? (
                          <div>
                            <span className="font-bold text-emerald-700 text-xs">
                              {sample.testResult.avgStrengthMpa.toFixed(1)} MPa
                            </span>
                            <span className="text-[10px] text-slate-400 ml-1">
                              ({sample.testResult.percentageOfDesign.toFixed(0)}%)
                            </span>
                            <span className={`block text-[10px] font-bold ${sample.status === 'tested_passed' ? 'text-emerald-600' : 'text-red-600'}`}>
                              {sample.status === 'tested_passed' ? '✅ Đạt' : '❌ Không Đạt'}
                            </span>
                          </div>
                        ) : (
                          <div className="space-y-0.5">
                            <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded ${
                              isDueToday ? 'bg-red-100 text-red-700 animate-pulse' :
                              isOverdue ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-600'
                            }`}>
                              {isDueToday ? '🔴 Đến Hạn' : isOverdue ? '⚠️ Quá Hạn' : '⏳ Chưa Đến Hạn'}
                            </span>
                            <button
                              onClick={() => handleTest(sample)}
                              className="block text-emerald-700 hover:text-emerald-900 font-bold text-[11px] hover:underline cursor-pointer"
                            >
                              + Nhập KQ
                            </button>
                          </div>
                        )}
                      </td>

                      {/* Liên hệ */}
                      <td className="px-5 py-3.5 text-xs text-slate-600 whitespace-nowrap">
                        <div className="font-medium text-slate-800">{sample.contactPerson}</div>
                        <a 
                          href={`tel:${sample.contactPhone || '0942320923'}`} 
                          className="text-emerald-700 font-mono font-bold hover:underline flex items-center gap-1"
                        >
                          <Phone className="w-3 h-3" />
                          <span>{sample.contactPhone || '0942320923'}</span>
                        </a>
                      </td>

                      {/* Thao tác */}
                      <td className="px-5 py-3.5 text-right whitespace-nowrap space-x-1">
                        <button
                          onClick={() => handleNotify(sample)}
                          className="p-1.5 text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 rounded transition-colors cursor-pointer"
                          title="Gửi Zalo / Email"
                        >
                          <Send className="w-4 h-4 text-blue-600" />
                        </button>
                        <button
                          onClick={() => handleDetail(sample)}
                          className="p-1.5 text-slate-500 hover:text-blue-700 hover:bg-blue-50 rounded transition-colors cursor-pointer"
                          title="Xem Chi Tiết & In"
                        >
                          <Printer className="w-4 h-4 text-slate-600" />
                        </button>
                        {canModifySample(sample) ? (
                          <>
                            <button
                              onClick={() => handleGuardedEdit(sample)}
                              className="p-1.5 text-slate-500 hover:text-amber-700 hover:bg-amber-50 rounded transition-colors cursor-pointer"
                              title="Chỉnh Sửa Thông Tin Mẫu"
                            >
                              <Edit3 className="w-4 h-4 text-amber-600" />
                            </button>
                            <button
                              onClick={() => handleGuardedDelete(sample)}
                              className="p-1.5 text-slate-400 hover:text-red-700 hover:bg-red-50 rounded transition-colors cursor-pointer"
                              title="Xóa Mẫu"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        ) : (
                          <span 
                            className="inline-block px-2 py-1 text-slate-400 bg-slate-100 rounded text-[11px] font-medium cursor-not-allowed"
                            title={`Mẫu do ${sample.createdByName || sample.samplerName || 'thành viên khác'} tạo. Bạn chỉ có quyền xem.`}
                          >
                            🔒 Chỉ Xem
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

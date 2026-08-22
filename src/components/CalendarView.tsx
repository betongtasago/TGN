import React, { useState, useMemo } from 'react';
import { 
  Calendar as CalendarIcon, 
  ChevronLeft, 
  ChevronRight, 
  AlertTriangle, 
  CheckCircle2, 
  FlaskConical, 
  Phone, 
  Layers, 
  Send,
  Plus,
  Trash2,
  Check,
  Edit3,
  Clock,
  Building2,
  FileSpreadsheet,
  Printer,
  Sparkles,
  Info,
  CalendarDays,
  ListFilter,
  Search,
  ArrowRight,
  UserCheck
} from 'lucide-react';
import { ConcreteSample, Station, User } from '../types';
import { formatDateVN } from '../utils/storage';

interface CalendarViewProps {
  samples: ConcreteSample[];
  stations: Station[];
  currentUser?: User | null;
  selectedStationId: string;
  onSelectSampleDetail: (sample: ConcreteSample) => void;
  onSelectSampleForTest: (sample: ConcreteSample) => void;
  onQuickMarkTested?: (sample: ConcreteSample) => void;
  onDeleteSample?: (sampleId: string) => void;
  onOpenNotification?: (sample: ConcreteSample) => void;
  onAddNewSampleForDate?: (dateStr: string) => void;
}

export const CalendarView: React.FC<CalendarViewProps> = ({
  samples,
  stations,
  currentUser,
  selectedStationId,
  onSelectSampleDetail,
  onSelectSampleForTest,
  onQuickMarkTested,
  onDeleteSample,
  onOpenNotification,
  onAddNewSampleForDate,
}) => {
  const [viewMode, setViewMode] = useState<'calendar_grid' | 'timeline_list'>('calendar_grid');
  const [currentMonthDate, setCurrentMonthDate] = useState(new Date());
  const [selectedDateStr, setSelectedDateStr] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [filterStationLocal, setFilterStationLocal] = useState<string>(selectedStationId);
  
  // Timeline list filters
  const [timelineSearch, setTimelineSearch] = useState('');
  const [timelineStatusFilter, setTimelineStatusFilter] = useState<string>('all');

  // Sync station filter
  React.useEffect(() => {
    setFilterStationLocal(selectedStationId);
  }, [selectedStationId]);

  const stationMap = useMemo(() => {
    const map = new Map<string, Station>();
    stations.forEach(s => map.set(s.id, s));
    return map;
  }, [stations]);

  const activeSamples = useMemo(() => {
    return filterStationLocal === 'all'
      ? samples
      : samples.filter(s => s.stationId === filterStationLocal);
  }, [samples, filterStationLocal]);

  // Group samples by scheduled test date (YYYY-MM-DD)
  const samplesByDate = useMemo(() => {
    const map: Record<string, ConcreteSample[]> = {};
    activeSamples.forEach(s => {
      if (s.scheduledTestDate) {
        if (!map[s.scheduledTestDate]) {
          map[s.scheduledTestDate] = [];
        }
        map[s.scheduledTestDate].push(s);
      }
    });
    return map;
  }, [activeSamples]);

  // Sorted upcoming distinct dates for quick navigation
  const upcomingSchedules = useMemo(() => {
    return [...activeSamples]
      .filter(s => s.scheduledTestDate)
      .sort((a, b) => (a.scheduledTestDate || '').localeCompare(b.scheduledTestDate || ''));
  }, [activeSamples]);

  const todayStr = new Date().toISOString().split('T')[0];

  const upcomingDistinctDates = useMemo(() => {
    const map = new Map<string, { count: number; urgent: number; tested: number }>();
    upcomingSchedules.forEach(s => {
      if (s.scheduledTestDate) {
        const entry = map.get(s.scheduledTestDate) || { count: 0, urgent: 0, tested: 0 };
        entry.count += 1;
        if (s.status === 'due_today' || s.status === 'overdue') entry.urgent += 1;
        if (s.status === 'tested_passed' || s.status === 'tested_failed') entry.tested += 1;
        map.set(s.scheduledTestDate, entry);
      }
    });
    return Array.from(map.entries()).map(([date, stats]) => ({
      date,
      ...stats
    }));
  }, [upcomingSchedules]);

  // Nearest future date with samples
  const nearestDateWithSamples = useMemo(() => {
    const future = upcomingDistinctDates.find(d => d.date >= todayStr);
    return future ? future.date : (upcomingDistinctDates[0]?.date || '');
  }, [upcomingDistinctDates, todayStr]);

  // Calendar matrix calculation
  const year = currentMonthDate.getFullYear();
  const month = currentMonthDate.getMonth(); // 0 - 11

  // Day of week calculation (0 = Sun, 1 = Mon, ..., 6 = Sat)
  const firstDayOfMonth = new Date(year, month, 1).getDay();
  // Adjust so Monday is first (0 = Monday, ..., 6 = Sunday)
  const adjustedFirstDay = (firstDayOfMonth + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();

  const handlePrevMonth = () => {
    setCurrentMonthDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonthDate(new Date(year, month + 1, 1));
  };

  const handleToday = () => {
    const today = new Date();
    setCurrentMonthDate(today);
    setSelectedDateStr(today.toISOString().split('T')[0]);
  };

  const handleMonthSelect = (m: number) => {
    setCurrentMonthDate(new Date(year, m, 1));
  };

  const handleYearSelect = (y: number) => {
    setCurrentMonthDate(new Date(y, month, 1));
  };

  const handleJumpToDate = (targetDateStr: string) => {
    if (!targetDateStr) return;
    const parts = targetDateStr.split('-').map(Number);
    if (parts.length === 3) {
      setCurrentMonthDate(new Date(parts[0], parts[1] - 1, 1));
      setSelectedDateStr(targetDateStr);
    }
  };

  const selectedDaySamples = samplesByDate[selectedDateStr] || [];

  // Selected date formatting in Vietnamese
  const getFullFormattedDate = (dateStr: string) => {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length !== 3) return dateStr;
    const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
    const days = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
    const dayName = days[d.getDay()];
    return `${dayName}, Ngày ${parts[2]} Tháng ${parts[1]} Năm ${parts[0]}`;
  };

  const testedCountInMonth = useMemo(() => {
    return activeSamples.filter(s => {
      if (!s.scheduledTestDate) return false;
      const [y, m] = s.scheduledTestDate.split('-');
      return Number(y) === year && Number(m) === month + 1 && 
        (s.status === 'tested_passed' || s.status === 'tested_failed');
    }).length;
  }, [activeSamples, year, month]);

  const totalInMonth = useMemo(() => {
    return activeSamples.filter(s => {
      if (!s.scheduledTestDate) return false;
      const [y, m] = s.scheduledTestDate.split('-');
      return Number(y) === year && Number(m) === month + 1;
    }).length;
  }, [activeSamples, year, month]);

  const urgentInMonth = useMemo(() => {
    return activeSamples.filter(s => {
      if (!s.scheduledTestDate) return false;
      const [y, m] = s.scheduledTestDate.split('-');
      return Number(y) === year && Number(m) === month + 1 && 
        (s.status === 'due_today' || s.status === 'overdue');
    }).length;
  }, [activeSamples, year, month]);

  // Count in next month
  const nextMonthCount = useMemo(() => {
    const nextDate = new Date(year, month + 1, 1);
    const ny = nextDate.getFullYear();
    const nm = nextDate.getMonth() + 1;
    return activeSamples.filter(s => {
      if (!s.scheduledTestDate) return false;
      const [y, m] = s.scheduledTestDate.split('-');
      return Number(y) === ny && Number(m) === nm;
    }).length;
  }, [activeSamples, year, month]);

  // Permission check helper
  const canModifySample = (sample: ConcreteSample) => {
    if (!currentUser) return true;
    if (currentUser.role === 'admin') return true;
    if (sample.createdBy && sample.createdBy === currentUser.username) return true;
    if (sample.samplerName && sample.samplerName.trim().toLowerCase() === currentUser.fullName.trim().toLowerCase()) return true;
    return false;
  };

  const handleDeleteSchedule = (sample: ConcreteSample) => {
    if (!canModifySample(sample)) {
      alert(`⚠️ Bạn không có quyền xóa lịch nén của thành viên khác (${sample.createdByName || sample.samplerName || 'Thành viên khác'}). Chỉ Quản Trị Viên (Admin) hoặc người tạo mẫu mới có quyền xóa.`);
      return;
    }
    if (confirm(`Bạn có chắc muốn XÓA LỊCH NÉN của mẫu "${sample.projectName}" (${sample.concreteGrade} - Tuổi ${sample.ageType})?`)) {
      if (onDeleteSample) {
        onDeleteSample(sample.id);
      }
    }
  };

  // Filtered timeline samples
  const timelineFilteredSamples = useMemo(() => {
    return upcomingSchedules.filter(s => {
      if (timelineStatusFilter !== 'all') {
        if (timelineStatusFilter === 'due_today' && s.status !== 'due_today') return false;
        if (timelineStatusFilter === 'overdue' && s.status !== 'overdue') return false;
        if (timelineStatusFilter === 'pending' && s.status !== 'pending') return false;
        if (timelineStatusFilter === 'tested' && s.status !== 'tested_passed' && s.status !== 'tested_failed') return false;
      }

      if (timelineSearch.trim()) {
        const query = timelineSearch.toLowerCase().trim();
        const matchProj = (s.projectName || '').toLowerCase().includes(query);
        const matchCode = (s.sampleCode || s.id || '').toLowerCase().includes(query);
        const matchContractor = (s.contractor || '').toLowerCase().includes(query);
        const matchCreator = (s.createdByName || s.samplerName || '').toLowerCase().includes(query);
        const matchGrade = (s.concreteGrade || '').toLowerCase().includes(query);
        if (!matchProj && !matchCode && !matchContractor && !matchCreator && !matchGrade) {
          return false;
        }
      }
      return true;
    });
  }, [upcomingSchedules, timelineStatusFilter, timelineSearch]);

  const getDaysDiffText = (scheduledDate: string) => {
    if (!scheduledDate) return '';
    const now = new Date(todayStr).getTime();
    const target = new Date(scheduledDate).getTime();
    const diffDays = Math.round((target - now) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Hôm nay';
    if (diffDays === 1) return 'Ngày mai';
    if (diffDays === -1) return 'Hôm qua (Quá hạn 1 ngày)';
    if (diffDays < -1) return `Quá hạn ${Math.abs(diffDays)} ngày`;
    return `Còn ${diffDays} ngày nữa`;
  };

  return (
    <div className="space-y-4 sm:space-y-6 pb-12 font-sans">
      
      {/* 1. Top Control & Authentic Calendar Header */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 sm:p-5 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          
          {/* Header Title & Monthly Stats */}
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-emerald-800 text-white flex items-center justify-center shadow-xs">
                <CalendarDays className="w-5 h-5 text-emerald-200" />
              </div>
              <div>
                <h2 className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
                  <span>Lịch Nén Mẫu Bê Tông Toàn Hệ Thống</span>
                </h2>
                <p className="text-xs text-slate-500 font-medium">
                  Đồng bộ tức thời giữa Quản Trị Viên & Kỹ Thuật Viên các trạm trộn Tasago
                </p>
              </div>
            </div>

            {/* Quick stats pills */}
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <span className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 border border-slate-200">
                Toàn hệ thống: <strong>{activeSamples.length} mẫu nén</strong>
              </span>
              <span className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200">
                Lịch tháng {month + 1}: <strong>{totalInMonth} mẫu</strong> ({testedCountInMonth} đã nén)
              </span>
              {urgentInMonth > 0 && (
                <span className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-red-50 text-red-700 border border-red-200 animate-pulse">
                  🔴 Đến hạn / Quá hạn: <strong>{urgentInMonth}</strong>
                </span>
              )}
            </div>
          </div>

          {/* Navigation & View Toggle Controls */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            
            {/* View Mode Toggle: Calendar Grid vs Timeline List */}
            <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
              <button
                type="button"
                onClick={() => setViewMode('calendar_grid')}
                className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${
                  viewMode === 'calendar_grid'
                    ? 'bg-emerald-800 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <CalendarIcon className="w-3.5 h-3.5" />
                <span>Lịch Tháng</span>
              </button>

              <button
                type="button"
                onClick={() => setViewMode('timeline_list')}
                className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${
                  viewMode === 'timeline_list'
                    ? 'bg-emerald-800 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <ListFilter className="w-3.5 h-3.5" />
                <span>Toàn Bộ Lịch Nén ({upcomingSchedules.length})</span>
              </button>
            </div>

            {/* Station Filter for Calendar */}
            <div className="flex items-center gap-1.5 bg-slate-50 px-2.5 py-1.5 rounded-xl border border-slate-200">
              <Building2 className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
              <select
                value={filterStationLocal}
                onChange={(e) => setFilterStationLocal(e.target.value)}
                className="bg-white border border-slate-200 font-bold text-xs text-slate-800 rounded-lg px-2 py-1 outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer shadow-xs max-w-[180px] truncate"
              >
                <option value="all">🏢 Tất cả các trạm ({stations.length})</option>
                {stations.map(st => (
                  <option key={st.id} value={st.id}>
                    {st.name.replace('Trạm Tasago ', '')}
                  </option>
                ))}
              </select>
            </div>

          </div>

        </div>

        {/* Quick Jump Bar: Upcoming Scheduled Dates Across All Months */}
        {upcomingDistinctDates.length > 0 && (
          <div className="pt-3 border-t border-slate-100">
            <div className="flex items-center gap-2 overflow-x-auto pb-1.5 text-xs no-scrollbar">
              <span className="font-bold text-slate-500 text-[11px] uppercase shrink-0 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-emerald-700" />
                <span>Các ngày có lịch nén:</span>
              </span>

              {upcomingDistinctDates.slice(0, 10).map((item) => {
                const isSelected = item.date === selectedDateStr;
                const isToday = item.date === todayStr;
                const dateVN = item.date.split('-').reverse().slice(0, 2).join('/');
                const yearPart = item.date.split('-')[0];
                const isCurrentCalendarMonth = item.date.startsWith(`${year}-${String(month + 1).padStart(2, '0')}`);

                return (
                  <button
                    key={item.date}
                    onClick={() => {
                      setViewMode('calendar_grid');
                      handleJumpToDate(item.date);
                    }}
                    className={`px-2.5 py-1 rounded-xl text-xs font-bold shrink-0 transition-all cursor-pointer flex items-center gap-1.5 border ${
                      isSelected
                        ? 'bg-emerald-800 text-white border-emerald-900 shadow-xs'
                        : isToday
                        ? 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100 animate-pulse'
                        : item.urgent > 0
                        ? 'bg-amber-50 text-amber-900 border-amber-300 hover:bg-amber-100'
                        : !isCurrentCalendarMonth
                        ? 'bg-blue-50 text-blue-900 border-blue-200 hover:bg-blue-100'
                        : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                    }`}
                    title={`Ngày ${item.date} có ${item.count} mẫu nén. Bấm để mở lịch tháng ${item.date.split('-')[1]}/${yearPart}`}
                  >
                    <span>{dateVN}</span>
                    <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
                      isSelected
                        ? 'bg-white/20 text-white'
                        : 'bg-white text-slate-800 shadow-2xs border border-slate-200'
                    }`}>
                      {item.count}
                    </span>
                    {!isCurrentCalendarMonth && (
                      <span className="text-[9px] opacity-75 font-normal">
                        (T{Number(item.date.split('-')[1])})
                      </span>
                    )}
                  </button>
                );
              })}

              {upcomingDistinctDates.length > 10 && (
                <button
                  onClick={() => setViewMode('timeline_list')}
                  className="text-xs font-bold text-emerald-700 hover:underline shrink-0 px-2"
                >
                  +{upcomingDistinctDates.length - 10} ngày khác 👉
                </button>
              )}
            </div>
          </div>
        )}

      </div>

      {/* VIEW MODE 1: CHRONOLOGICAL TIMELINE LIST (All schedules across all months) */}
      {viewMode === 'timeline_list' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 sm:p-5 space-y-4 animate-in fade-in duration-200">
          
          {/* Timeline Controls */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <div>
              <h3 className="font-black text-base text-slate-900 flex items-center gap-2">
                <span>Toàn Bộ Danh Sách Lịch Nén Mẫu</span>
                <span className="bg-emerald-100 text-emerald-800 text-xs px-2.5 py-0.5 rounded-full font-bold">
                  {timelineFilteredSamples.length} mẫu
                </span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Hiển thị toàn bộ lịch nén của tất cả thành viên & quản trị viên theo thứ tự ngày nén dự kiến
              </p>
            </div>

            {/* Filter buttons & Search */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative flex-1 sm:w-60">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Tìm công trình, mác, người tạo..."
                  value={timelineSearch}
                  onChange={(e) => setTimelineSearch(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-3 py-1.5 text-xs font-medium outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <select
                value={timelineStatusFilter}
                onChange={(e) => setTimelineStatusFilter(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
              >
                <option value="all">Tất cả trạng thái</option>
                <option value="due_today">🔴 Đến hạn hôm nay</option>
                <option value="overdue">⚠️ Quá hạn</option>
                <option value="pending">⏳ Chưa đến hạn</option>
                <option value="tested">✅ Đã nén xong</option>
              </select>
            </div>
          </div>

          {/* Timeline Cards Grid / Table */}
          {timelineFilteredSamples.length === 0 ? (
            <div className="p-10 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-slate-400 space-y-2">
              <CalendarIcon className="w-12 h-12 mx-auto text-slate-300" />
              <p className="font-bold text-slate-700 text-sm">Không tìm thấy lịch nén nào phù hợp</p>
              <p className="text-xs text-slate-500">
                Hãy thử xóa bộ lọc tìm kiếm hoặc chuyển trạm trộn.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {timelineFilteredSamples.map((sample, idx) => {
                const station = stationMap.get(sample.stationId);
                const isTested = sample.status === 'tested_passed' || sample.status === 'tested_failed';
                const isDueToday = sample.status === 'due_today';
                const isOverdue = sample.status === 'overdue';
                const diffText = getDaysDiffText(sample.scheduledTestDate);

                return (
                  <div
                    key={sample.id}
                    className={`p-4 rounded-2xl border transition-all space-y-3 relative flex flex-col justify-between ${
                      isTested
                        ? 'bg-emerald-50/30 border-emerald-200'
                        : isDueToday
                        ? 'bg-red-50/40 border-red-300 shadow-sm ring-1 ring-red-400'
                        : isOverdue
                        ? 'bg-amber-50/40 border-amber-300'
                        : 'bg-white border-slate-200 hover:border-slate-300 shadow-xs'
                    }`}
                  >
                    {/* Header Row: Date & Countdown badge */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5">
                          <span className="w-2.5 h-2.5 rounded-full bg-emerald-700" />
                          <span className="font-black text-sm text-slate-900">
                            {sample.scheduledTestDate.split('-').reverse().join('/')}
                          </span>
                        </div>

                        <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                          isDueToday
                            ? 'bg-red-500 text-white animate-pulse'
                            : isOverdue
                            ? 'bg-amber-500 text-white'
                            : isTested
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-blue-100 text-blue-800'
                        }`}>
                          {diffText}
                        </span>
                      </div>

                      {/* Station & Creator Info */}
                      <div className="flex items-center justify-between text-xs text-slate-500 border-b border-slate-100 pb-2">
                        <span className="font-bold text-emerald-800 flex items-center gap-1">
                          <Building2 className="w-3.5 h-3.5 text-emerald-600" />
                          <span>{station ? station.name.replace('Trạm Tasago ', '') : 'Tasago'}</span>
                        </span>
                        <span className="flex items-center gap-1 text-[11px] text-slate-600">
                          <UserCheck className="w-3 h-3 text-slate-400" />
                          <span>Tạo: <strong>{sample.createdByName || sample.samplerName || 'Thành viên'}</strong></span>
                        </span>
                      </div>

                      {/* Project Title */}
                      <div className="pt-1">
                        <h4 className="font-black text-sm text-slate-900 leading-snug">
                          {sample.projectName}
                        </h4>
                        <p className="text-xs text-slate-500 truncate">
                          {sample.contractor} • {sample.component}
                        </p>
                      </div>

                      {/* Concrete Specs Pill Box */}
                      <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 text-xs space-y-1 text-slate-700">
                        <div className="flex items-center justify-between">
                          <span className="text-slate-500">Mác & Độ sụt:</span>
                          <span className="font-extrabold text-emerald-800">{sample.concreteGrade} (Sụt {sample.slumpCm}cm)</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-slate-500">Tuổi nén:</span>
                          <span className="font-bold text-blue-700">{sample.ageType} ({sample.ageDays} ngày) • {sample.volumeM3} m³</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-slate-500">Ngày đúc:</span>
                          <span className="font-medium text-slate-600">{sample.castDate.split('-').reverse().join('/')}</span>
                        </div>
                        {sample.contactPerson && (
                          <div className="flex items-center justify-between pt-1 border-t border-slate-200">
                            <span className="text-slate-500">Liên hệ:</span>
                            <a href={`tel:${sample.contactPhone}`} className="font-bold text-emerald-700 hover:underline">
                              {sample.contactPerson} ({sample.contactPhone})
                            </a>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Action Buttons Toolbar */}
                    <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-1.5">
                      <button
                        onClick={() => {
                          setViewMode('calendar_grid');
                          handleJumpToDate(sample.scheduledTestDate);
                        }}
                        className="text-xs font-bold text-emerald-700 hover:text-emerald-900 flex items-center gap-1 cursor-pointer"
                        title="Xem trên lịch tháng"
                      >
                        <span>Mở Lịch Tháng</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>

                      <div className="flex items-center gap-1">
                        {!isTested ? (
                          <button
                            onClick={() => {
                              if (onQuickMarkTested) {
                                onQuickMarkTested(sample);
                              } else {
                                onSelectSampleForTest(sample);
                              }
                            }}
                            className="bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-xs px-2.5 py-1 rounded-lg flex items-center gap-1 cursor-pointer shadow-xs"
                            title="Đánh dấu đã nén mẫu xong"
                          >
                            <Check className="w-3 h-3" />
                            <span>Đã Nén</span>
                          </button>
                        ) : (
                          <button
                            onClick={() => onSelectSampleForTest(sample)}
                            className="bg-emerald-100 hover:bg-emerald-200 text-emerald-900 font-bold text-xs px-2.5 py-1 rounded-lg flex items-center gap-1 cursor-pointer"
                            title="Sửa kết quả MPa"
                          >
                            <Edit3 className="w-3 h-3" />
                            <span>Sửa MPa</span>
                          </button>
                        )}

                        <button
                          onClick={() => onSelectSampleDetail(sample)}
                          className="bg-white hover:bg-slate-100 text-slate-700 p-1.5 rounded-lg border border-slate-200 cursor-pointer"
                          title="Xem chi tiết & In phiếu"
                        >
                          <Printer className="w-3.5 h-3.5 text-slate-600" />
                        </button>

                        <button
                          onClick={() => handleDeleteSchedule(sample)}
                          className="bg-white hover:bg-red-50 text-red-600 p-1.5 rounded-lg border border-slate-200 hover:border-red-200 cursor-pointer"
                          title="Xóa lịch nén"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                  </div>
                );
              })}
            </div>
          )}

        </div>
      )}

      {/* VIEW MODE 2: MONTHLY DESK CALENDAR GRID */}
      {viewMode === 'calendar_grid' && (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start animate-in fade-in duration-200">
          
          {/* Left Side: Authentic Calendar Sheet (8 Cols on XL) */}
          <div className="xl:col-span-8 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
            
            {/* Desk Calendar Top Binder / Header Bar */}
            <div className="bg-slate-900 text-white px-4 sm:px-5 py-3 flex flex-wrap items-center justify-between gap-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-red-500 inline-block shadow-xs" />
                <span className="w-3 h-3 rounded-full bg-amber-500 inline-block shadow-xs" />
                <span className="w-3 h-3 rounded-full bg-emerald-500 inline-block shadow-xs" />
                <span className="ml-2 font-black text-sm uppercase tracking-wider text-slate-100">
                  THÁNG {month + 1} / {year}
                </span>
              </div>

              {/* Month Selector Controls */}
              <div className="flex items-center space-x-1.5">
                <button
                  onClick={handlePrevMonth}
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-all cursor-pointer"
                  title="Tháng trước"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                <div className="flex items-center gap-1 text-slate-900">
                  <select
                    value={month}
                    onChange={(e) => handleMonthSelect(Number(e.target.value))}
                    className="bg-white border border-slate-200 font-extrabold text-xs text-slate-800 rounded-lg px-2 py-1 outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer shadow-xs"
                  >
                    {Array.from({ length: 12 }).map((_, i) => (
                      <option key={i} value={i}>Tháng {i + 1}</option>
                    ))}
                  </select>

                  <select
                    value={year}
                    onChange={(e) => handleYearSelect(Number(e.target.value))}
                    className="bg-white border border-slate-200 font-extrabold text-xs text-slate-800 rounded-lg px-2 py-1 outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer shadow-xs"
                  >
                    {[year - 2, year - 1, year, year + 1, year + 2].map((y) => (
                      <option key={y} value={y}>Năm {y}</option>
                    ))}
                  </select>
                </div>

                <button
                  onClick={handleNextMonth}
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-all cursor-pointer flex items-center gap-1"
                  title={`Tháng sau${nextMonthCount > 0 ? ` (+${nextMonthCount} mẫu)` : ''}`}
                >
                  {nextMonthCount > 0 && (
                    <span className="text-[10px] bg-emerald-600 text-white font-bold px-1.5 py-0.2 rounded-full">
                      +{nextMonthCount}
                    </span>
                  )}
                  <ChevronRight className="w-4 h-4" />
                </button>

                <button
                  onClick={handleToday}
                  className="bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-xs px-2.5 py-1 rounded-lg shadow-xs transition-colors cursor-pointer ml-1"
                >
                  Hôm Nay
                </button>
              </div>
            </div>

            {/* Weekday Column Headers */}
            <div className="grid grid-cols-7 bg-slate-100/80 border-b border-slate-200 text-center font-black text-xs py-2.5">
              <div className="text-slate-700">T2 <span className="hidden sm:inline font-normal text-[10px] text-slate-400">(Hai)</span></div>
              <div className="text-slate-700">T3 <span className="hidden sm:inline font-normal text-[10px] text-slate-400">(Ba)</span></div>
              <div className="text-slate-700">T4 <span className="hidden sm:inline font-normal text-[10px] text-slate-400">(Tư)</span></div>
              <div className="text-slate-700">T5 <span className="hidden sm:inline font-normal text-[10px] text-slate-400">(Năm)</span></div>
              <div className="text-slate-700">T6 <span className="hidden sm:inline font-normal text-[10px] text-slate-400">(Sáu)</span></div>
              <div className="text-emerald-800">T7 <span className="hidden sm:inline font-normal text-[10px] text-emerald-600">(Bảy)</span></div>
              <div className="text-red-700">CN <span className="hidden sm:inline font-normal text-[10px] text-red-500">(Chủ Nhật)</span></div>
            </div>

            {/* Days Grid - Realistic Wall Calendar Box Matrix */}
            <div className="grid grid-cols-7 gap-px bg-slate-200 p-px">
              
              {/* Previous Month Trailing Days */}
              {Array.from({ length: adjustedFirstDay }).map((_, i) => {
                const prevDayNum = daysInPrevMonth - adjustedFirstDay + i + 1;
                return (
                  <div 
                    key={`prev-${i}`} 
                    className="min-h-[90px] sm:min-h-[105px] p-2 bg-slate-50/70 text-slate-300 flex flex-col justify-between select-none"
                  >
                    <span className="text-xs font-semibold">{prevDayNum}</span>
                  </div>
                );
              })}

              {/* Current Month Active Days */}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const dayNum = i + 1;
                const dateKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
                const daySamples = samplesByDate[dateKey] || [];
                const isToday = dateKey === todayStr;
                const isSelected = dateKey === selectedDateStr;
                
                // Stats for this day
                const dueTodayOrOverdueCount = daySamples.filter(s => s.status === 'due_today' || s.status === 'overdue').length;
                const testedCount = daySamples.filter(s => s.status === 'tested_passed' || s.status === 'tested_failed').length;
                const isAllTested = daySamples.length > 0 && testedCount === daySamples.length;

                // Check if weekend
                const dayOfWeek = (adjustedFirstDay + i) % 7;
                const isWeekend = dayOfWeek === 5 || dayOfWeek === 6; // Saturday or Sunday

                return (
                  <div
                    key={dateKey}
                    onClick={() => setSelectedDateStr(dateKey)}
                    className={`min-h-[90px] sm:min-h-[105px] p-1.5 sm:p-2 transition-all cursor-pointer flex flex-col justify-between relative group ${
                      isSelected
                        ? 'bg-emerald-900 text-white ring-2 ring-emerald-400 z-10 shadow-md'
                        : isToday
                        ? 'bg-emerald-50/90 hover:bg-emerald-100/80 text-emerald-950 font-bold'
                        : isWeekend
                        ? 'bg-[#fcfdfd] hover:bg-slate-50 text-slate-800'
                        : 'bg-white hover:bg-slate-50 text-slate-800'
                    }`}
                  >
                    {/* Top Bar of Day Tile */}
                    <div className="flex items-center justify-between">
                      <span 
                        className={`text-xs sm:text-sm font-black flex items-center justify-center rounded-lg ${
                          isSelected
                            ? 'bg-emerald-800 text-white px-2 py-0.5'
                            : isToday
                            ? 'bg-emerald-700 text-white w-6 h-6 rounded-full shadow-xs'
                            : isWeekend
                            ? dayOfWeek === 6 ? 'text-red-600' : 'text-emerald-700'
                            : 'text-slate-800'
                        }`}
                      >
                        {dayNum}
                      </span>

                      {/* Badge Count on day */}
                      {daySamples.length > 0 && (
                        <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-md flex items-center gap-0.5 shadow-2xs ${
                          isSelected
                            ? 'bg-emerald-700 text-emerald-100'
                            : dueTodayOrOverdueCount > 0
                            ? 'bg-red-500 text-white animate-pulse'
                            : isAllTested
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                            : 'bg-slate-200 text-slate-700'
                        }`}>
                          {isAllTested && <Check className="w-2.5 h-2.5" />}
                          {daySamples.length}
                        </span>
                      )}
                    </div>

                    {/* Sample Chips preview inside the box */}
                    <div className="space-y-1 my-1 overflow-hidden">
                      {daySamples.slice(0, 2).map((s) => {
                        const isTested = s.status === 'tested_passed' || s.status === 'tested_failed';
                        const isDue = s.status === 'due_today';
                        const isOver = s.status === 'overdue';

                        return (
                          <div
                            key={s.id}
                            className={`text-[9px] px-1.5 py-0.5 rounded font-bold truncate leading-tight flex items-center justify-between gap-1 ${
                              isSelected
                                ? 'bg-emerald-800/90 text-emerald-100 border border-emerald-700'
                                : isTested
                                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                : isDue
                                ? 'bg-red-100 text-red-900 border border-red-200'
                                : isOver
                                ? 'bg-amber-100 text-amber-900 border border-amber-200'
                                : 'bg-slate-100 text-slate-700 border border-slate-200'
                            }`}
                            title={`${s.concreteGrade} - ${s.projectName} (${s.ageType})`}
                          >
                            <span className="truncate">{s.concreteGrade}</span>
                            <span className="shrink-0 opacity-80">{s.ageType}</span>
                          </div>
                        );
                      })}

                      {daySamples.length > 2 && (
                        <span className={`text-[9px] font-bold block text-center ${
                          isSelected ? 'text-emerald-300' : 'text-slate-500'
                        }`}>
                          +{daySamples.length - 2} mẫu khác
                        </span>
                      )}
                    </div>

                    {/* Bottom indicator for today or empty */}
                    {isToday && !isSelected && (
                      <div className="text-[9px] font-black text-emerald-700 uppercase tracking-widest text-center">
                        Hôm Nay
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Calendar Legend Bar */}
            <div className="bg-slate-50 p-3 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-600">
              <div className="flex flex-wrap items-center gap-3">
                <span className="font-bold text-slate-700">Ghi chú màu:</span>
                <span className="flex items-center gap-1 text-[11px]">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-500" /> Đến hạn nén
                </span>
                <span className="flex items-center gap-1 text-[11px]">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Đã nén xong
                </span>
                <span className="flex items-center gap-1 text-[11px]">
                  <span className="w-2.5 h-2.5 rounded-full bg-slate-400" /> Chưa đến hạn
                </span>
                <span className="flex items-center gap-1 text-[11px]">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-800" /> Ngày đang chọn
                </span>
              </div>

              <div className="text-[11px] text-slate-500">
                Tổng số mẫu toàn hệ thống: <strong>{samples.length} mẫu</strong>
              </div>
            </div>

          </div>

          {/* Right Side: Selected Day Detailed Schedule & Direct Actions (4 Cols on XL) */}
          <div className="xl:col-span-4 bg-white rounded-2xl border border-slate-200 shadow-sm p-4 sm:p-5 space-y-4">
            
            {/* Selected Date Header */}
            <div className="border-b border-slate-100 pb-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  LỊCH NÉN NGÀY ĐANG CHỌN:
                </span>
                {selectedDateStr === todayStr && (
                  <span className="bg-red-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full animate-pulse">
                    HÔM NAY
                  </span>
                )}
              </div>

              <h3 className="text-base font-black text-slate-900 mt-1 leading-snug">
                {getFullFormattedDate(selectedDateStr)}
              </h3>

              <p className="text-xs text-slate-500 mt-0.5">
                Có <strong>{selectedDaySamples.length} mẫu bê tông</strong> có lịch nén trong ngày này
              </p>
            </div>

            {/* Quick Filter or Action Buttons */}
            <div className="flex items-center justify-between gap-2">
              {onAddNewSampleForDate && (
                <button
                  onClick={() => onAddNewSampleForDate(selectedDateStr)}
                  className="bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs w-full justify-center"
                >
                  <Plus className="w-3.5 h-3.5 text-emerald-700" />
                  <span>+ Thêm Mẫu Cho Ngày Này</span>
                </button>
              )}
            </div>

            {/* Empty State with Nearest Date Helper */}
            {selectedDaySamples.length === 0 ? (
              <div className="p-6 text-center bg-slate-50/70 rounded-2xl border border-dashed border-slate-200 text-slate-400 space-y-3">
                <CalendarIcon className="w-10 h-10 mx-auto text-slate-300" />
                <div>
                  <p className="font-bold text-slate-700 text-sm">Không có lịch nén ngày này</p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Ngày này không có mẫu bê tông nào đến hạn thí nghiệm nén.
                  </p>
                </div>

                {nearestDateWithSamples && nearestDateWithSamples !== selectedDateStr && (
                  <div className="pt-2 border-t border-slate-200/60">
                    <button
                      onClick={() => handleJumpToDate(nearestDateWithSamples)}
                      className="bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-bold px-3 py-2 rounded-xl transition-colors cursor-pointer shadow-xs w-full flex items-center justify-center gap-1.5"
                    >
                      <span>👉 Mở ngày có lịch nén gần nhất ({nearestDateWithSamples.split('-').reverse().join('/')})</span>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              /* List of Samples for Selected Day */
              <div className="space-y-3.5 max-h-[580px] overflow-y-auto pr-1">
                {selectedDaySamples.map((sample, idx) => {
                  const station = stationMap.get(sample.stationId);
                  const isTested = sample.status === 'tested_passed' || sample.status === 'tested_failed';
                  const isDueToday = sample.status === 'due_today';
                  const isOverdue = sample.status === 'overdue';

                  return (
                    <div 
                      key={sample.id}
                      className={`p-3.5 rounded-2xl border transition-all space-y-2.5 ${
                        isTested
                          ? 'bg-emerald-50/40 border-emerald-200'
                          : isDueToday
                          ? 'bg-red-50/40 border-red-200 shadow-xs'
                          : isOverdue
                          ? 'bg-amber-50/40 border-amber-200'
                          : 'bg-white border-slate-200 hover:border-slate-300 shadow-xs'
                      }`}
                    >
                      {/* Top Row: Station + Status Badge */}
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs text-emerald-800 flex items-center gap-1">
                          <Building2 className="w-3.5 h-3.5 text-emerald-600" />
                          <span>{station ? station.name.replace('Trạm Tasago ', '') : 'Trạm Tasago'}</span>
                        </span>

                        <span className={`text-[10px] font-black px-2 py-0.5 rounded-full flex items-center gap-1 ${
                          isTested
                            ? 'bg-emerald-100 text-emerald-800'
                            : isDueToday
                            ? 'bg-red-500 text-white animate-pulse'
                            : isOverdue
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-slate-100 text-slate-700'
                        }`}>
                          {isTested ? (
                            <>
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              <span>Đã Nén Xong</span>
                            </>
                          ) : isDueToday ? (
                            <>
                              <AlertTriangle className="w-3 h-3 text-white" />
                              <span>Đến Hạn Hôm Nay</span>
                            </>
                          ) : isOverdue ? (
                            <>
                              <Clock className="w-3 h-3 text-amber-700" />
                              <span>Quá Hạn</span>
                            </>
                          ) : (
                            <span>Chưa Đến Hạn</span>
                          )}
                        </span>
                      </div>

                      {/* Project Title */}
                      <div>
                        <h4 className="font-black text-sm text-slate-900 leading-snug">
                          #{idx + 1}. {sample.projectName}
                        </h4>
                        <p className="text-[11px] text-slate-500">
                          {sample.contractor} • Mã mẫu: <span className="font-mono font-bold text-slate-700">{sample.sampleCode || sample.id}</span>
                        </p>
                      </div>

                      {/* Creator badge */}
                      <div className="text-[11px] text-slate-500 flex items-center gap-1 bg-slate-50 px-2 py-1 rounded-lg">
                        <UserCheck className="w-3 h-3 text-slate-400" />
                        <span>Người tạo: <strong>{sample.createdByName || sample.samplerName || 'KTV'}</strong></span>
                      </div>

                      {/* Concrete Specifications Grid */}
                      <div className="bg-white/80 p-2.5 rounded-xl border border-slate-200 text-xs space-y-1 text-slate-700">
                        <div className="flex items-center justify-between">
                          <span className="text-slate-500">Hạng mục:</span>
                          <span className="font-bold text-slate-900">{sample.component} ({sample.volumeM3} m³)</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-slate-500">Mác bê tông:</span>
                          <span className="font-bold text-emerald-800">{sample.concreteGrade} (Sụt {sample.slumpCm}cm)</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-slate-500">Tuổi nén:</span>
                          <span className="font-extrabold text-blue-700">{sample.ageType} ({sample.ageDays} ngày) • {sample.groupCount} tổ ({sample.pieceCount} viên)</span>
                        </div>
                        <div className="flex items-center justify-between pt-1 border-t border-slate-100">
                          <span className="text-slate-500">Liên hệ:</span>
                          <a 
                            href={`tel:${sample.contactPhone}`} 
                            className="font-bold text-emerald-700 hover:underline flex items-center gap-1"
                          >
                            <Phone className="w-3 h-3" />
                            <span>{sample.contactPerson} ({sample.contactPhone})</span>
                          </a>
                        </div>
                      </div>

                      {/* Tested Result Summary if Tested */}
                      {isTested && sample.testResult && (
                        <div className="bg-emerald-100/70 p-2.5 rounded-xl border border-emerald-200 text-xs flex items-center justify-between">
                          <div>
                            <span className="text-[10px] font-bold uppercase text-emerald-900 block">KẾT QUẢ NÉN:</span>
                            <span className="text-sm font-black text-emerald-900">
                              {sample.testResult.avgStrengthMpa.toFixed(1)} MPa
                            </span>
                            <span className="text-xs text-emerald-700 font-bold ml-1.5">
                              ({sample.testResult.percentageOfDesign.toFixed(0)}% Thiết Kế)
                            </span>
                          </div>
                          <span className="bg-emerald-700 text-white text-[10px] font-black px-2.5 py-1 rounded-lg shadow-2xs">
                            {sample.status === 'tested_passed' ? 'ĐẠT CHUẨN' : 'KHÔNG ĐẠT'}
                          </span>
                        </div>
                      )}

                      {/* Action Buttons Toolbar for this Sample */}
                      <div className="pt-2 border-t border-slate-200/80 flex flex-wrap items-center justify-end gap-1.5">
                        
                        {/* Mark as Tested (1-click) */}
                        {!isTested ? (
                          <button
                            onClick={() => {
                              if (onQuickMarkTested) {
                                onQuickMarkTested(sample);
                              } else {
                                onSelectSampleForTest(sample);
                              }
                            }}
                            className="bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-xs px-2.5 py-1.5 rounded-xl flex items-center gap-1 shadow-xs cursor-pointer"
                            title="Đánh dấu đã nén mẫu xong"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>Đã Nén Xong</span>
                          </button>
                        ) : (
                          <button
                            onClick={() => onSelectSampleForTest(sample)}
                            className="bg-emerald-100 hover:bg-emerald-200 text-emerald-900 font-bold text-xs px-2.5 py-1.5 rounded-xl flex items-center gap-1 cursor-pointer"
                            title="Sửa lại chỉ số nén MPa"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                            <span>Sửa Kết Quả</span>
                          </button>
                        )}

                        {/* Enter detailed Test Result (MPa) */}
                        {!isTested && (
                          <button
                            onClick={() => onSelectSampleForTest(sample)}
                            className="bg-white hover:bg-slate-100 text-slate-700 font-bold text-xs px-2.5 py-1.5 rounded-xl border border-slate-200 flex items-center gap-1 cursor-pointer"
                            title="Nhập lực nén KN & cường độ MPa chi tiết"
                          >
                            <FlaskConical className="w-3.5 h-3.5 text-emerald-700" />
                            <span>Nhập MPa</span>
                          </button>
                        )}

                        {/* View Detail Modal */}
                        <button
                          onClick={() => onSelectSampleDetail(sample)}
                          className="bg-white hover:bg-slate-100 text-slate-700 font-semibold text-xs p-1.5 rounded-xl border border-slate-200 cursor-pointer"
                          title="Xem chi tiết & In phiếu"
                        >
                          <Printer className="w-3.5 h-3.5 text-slate-600" />
                        </button>

                        {/* Send Zalo / Email */}
                        {onOpenNotification && (
                          <button
                            onClick={() => onOpenNotification(sample)}
                            className="bg-white hover:bg-blue-50 text-blue-700 font-semibold text-xs p-1.5 rounded-xl border border-slate-200 cursor-pointer"
                            title="Bắn tin Zalo / Email cho mẫu này"
                          >
                            <Send className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {/* Delete compression schedule / sample */}
                        <button
                          onClick={() => handleDeleteSchedule(sample)}
                          className="bg-white hover:bg-red-50 text-red-600 hover:text-red-700 font-semibold text-xs p-1.5 rounded-xl border border-slate-200 hover:border-red-200 cursor-pointer"
                          title="Xóa lịch nén mẫu này"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                    </div>
                  );
                })}
              </div>
            )}

          </div>

        </div>
      )}

    </div>
  );
};

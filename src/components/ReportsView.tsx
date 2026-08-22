import React, { useState, useMemo } from 'react';
import { 
  FileSpreadsheet, 
  Download, 
  Printer, 
  Filter, 
  Layers, 
  Calendar, 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  FlaskConical, 
  Search,
  Building2,
  FolderDown,
  FileCheck,
  ChevronRight,
  Sparkles,
  MapPin,
  Phone
} from 'lucide-react';
import { ConcreteSample, Station } from '../types';
import { exportSamplesToExcel, exportProjectTrackingExcel } from '../utils/excelExport';
import { formatDateVN } from '../utils/storage';

interface ReportsViewProps {
  samples: ConcreteSample[];
  stations: Station[];
}

export const ReportsView: React.FC<ReportsViewProps> = ({ samples, stations }) => {
  const [activeTab, setActiveTab] = useState<'by_project' | 'general_filter'>('by_project');
  
  // By Project tab state
  const [selectedStationFilter, setSelectedStationFilter] = useState<string>('all');
  const [projectSearchQuery, setProjectSearchQuery] = useState<string>('');

  // General Filter tab state
  const [stationId, setStationId] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'tested' | 'untested' | 'overdue' | 'due_today'>('all');
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'commercial' | 'trialmix'>('all');
  const [fromDate, setFromDate] = useState<string>('');
  const [toDate, setToDate] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const stationMap = useMemo(() => {
    const map = new Map<string, Station>();
    stations.forEach(s => map.set(s.id, s));
    return map;
  }, [stations]);

  // Group samples by Project + Station
  const projectGroups = useMemo(() => {
    const groupsMap = new Map<string, {
      projectKey: string;
      projectName: string;
      stationId: string;
      stationName: string;
      contractor: string;
      location: string;
      contactPerson: string;
      contactPhone: string;
      samples: ConcreteSample[];
      totalVolume: number;
      totalGroups: number;
      totalPieces: number;
      grades: string[];
      components: string[];
      testedCount: number;
      passedCount: number;
      dueTodayCount: number;
      overdueCount: number;
    }>();

    samples.forEach(sample => {
      // Filter by station if selected
      if (selectedStationFilter !== 'all' && sample.stationId !== selectedStationFilter) return;

      // Filter by project search
      if (projectSearchQuery.trim()) {
        const q = projectSearchQuery.toLowerCase().trim();
        const match = 
          sample.projectName.toLowerCase().includes(q) ||
          sample.contractor.toLowerCase().includes(q) ||
          sample.component.toLowerCase().includes(q) ||
          (sample.sampleCode || '').toLowerCase().includes(q);
        if (!match) return;
      }

      const key = `${sample.stationId}___${sample.projectName.trim().toLowerCase()}`;
      if (!groupsMap.has(key)) {
        const st = stationMap.get(sample.stationId);
        groupsMap.set(key, {
          projectKey: key,
          projectName: sample.projectName,
          stationId: sample.stationId,
          stationName: st ? st.name : 'Trạm Tasago',
          contractor: sample.contractor,
          location: sample.location,
          contactPerson: sample.contactPerson,
          contactPhone: sample.contactPhone,
          samples: [],
          totalVolume: 0,
          totalGroups: 0,
          totalPieces: 0,
          grades: [],
          components: [],
          testedCount: 0,
          passedCount: 0,
          dueTodayCount: 0,
          overdueCount: 0,
        });
      }

      const g = groupsMap.get(key)!;
      g.samples.push(sample);
      g.totalVolume += (sample.volumeM3 || 0);
      g.totalGroups += (sample.groupCount || 0);
      g.totalPieces += (sample.pieceCount || 0);

      if (!g.grades.includes(sample.concreteGrade)) {
        g.grades.push(sample.concreteGrade);
      }
      if (!g.components.includes(sample.component)) {
        g.components.push(sample.component);
      }

      if (sample.status === 'tested_passed' || sample.status === 'tested_failed') {
        g.testedCount++;
        if (sample.status === 'tested_passed') g.passedCount++;
      } else if (sample.status === 'due_today') {
        g.dueTodayCount++;
      } else if (sample.status === 'overdue') {
        g.overdueCount++;
      }
    });

    return Array.from(groupsMap.values()).sort((a, b) => b.samples.length - a.samples.length);
  }, [samples, selectedStationFilter, projectSearchQuery, stationMap]);

  // General Filtered samples
  const filteredSamples = useMemo(() => {
    return samples.filter(item => {
      // Station
      if (stationId !== 'all' && item.stationId !== stationId) return false;

      // Status
      if (statusFilter === 'tested') {
        if (item.status !== 'tested_passed' && item.status !== 'tested_failed') return false;
      } else if (statusFilter === 'untested') {
        if (item.status === 'tested_passed' || item.status === 'tested_failed') return false;
      } else if (statusFilter === 'overdue') {
        if (item.status !== 'overdue') return false;
      } else if (statusFilter === 'due_today') {
        if (item.status !== 'due_today') return false;
      }

      // Category
      if (categoryFilter !== 'all' && item.category !== categoryFilter) return false;

      // Date Range
      if (fromDate && item.scheduledTestDate < fromDate) return false;
      if (toDate && item.scheduledTestDate > toDate) return false;

      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const match = 
          item.projectName.toLowerCase().includes(q) ||
          item.contractor.toLowerCase().includes(q) ||
          item.component.toLowerCase().includes(q) ||
          (item.sampleCode || '').toLowerCase().includes(q) ||
          item.contactPhone.includes(q);
        if (!match) return false;
      }

      return true;
    });
  }, [samples, stationId, statusFilter, categoryFilter, fromDate, toDate, searchQuery]);

  const totalVolume = filteredSamples.reduce((acc, curr) => acc + (curr.volumeM3 || 0), 0);
  const testedCount = filteredSamples.filter(s => s.status === 'tested_passed' || s.status === 'tested_failed').length;
  const passedCount = filteredSamples.filter(s => s.status === 'tested_passed').length;

  const handleExportGeneralExcel = () => {
    const stationObj = stations.find(s => s.id === stationId);
    const stationPrefix = stationObj ? stationObj.code : 'ToanBoTram';
    const statusPrefix = 
      statusFilter === 'tested' ? 'DaNen' :
      statusFilter === 'untested' ? 'ChuaNen' :
      statusFilter === 'overdue' ? 'QuaHan' : 'TongHop';

    const fileNamePrefix = `Tasago_BaoCao_NenMau_${stationPrefix}_${statusPrefix}`;
    exportSamplesToExcel(filteredSamples, stations, fileNamePrefix);
  };

  const handleExportProjectExcel = (group: typeof projectGroups[0]) => {
    const st = stationMap.get(group.stationId);
    exportProjectTrackingExcel(group.samples, st, group.projectName, group.contractor);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Banner */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="w-11 h-11 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-800 shrink-0">
            <FileSpreadsheet className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-black text-slate-900">
                Xuất Báo Cáo & Bảng Theo Dõi Nén Mẫu Excel
              </h2>
              <span className="bg-emerald-100 text-emerald-800 text-[11px] font-bold px-2 py-0.5 rounded-full">
                TCVN 3118 / 3116
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Đơn vị cung cấp: <strong>Công Ty Cổ Phần Đầu Tư Tasago</strong> — Bê Tông Xanh Sài Gòn
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2.5">
          <button
            onClick={handlePrint}
            className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-3.5 py-2.5 rounded-xl text-xs sm:text-sm flex items-center space-x-1.5 transition-colors cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>In Báo Cáo (A4)</span>
          </button>

          <button
            onClick={handleExportGeneralExcel}
            className="bg-emerald-700 hover:bg-emerald-800 text-white font-bold px-4 py-2.5 rounded-xl text-xs sm:text-sm flex items-center space-x-2 shadow-md shadow-emerald-700/20 transition-all active:scale-95 cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Xuất Excel Tổng Hợp ({filteredSamples.length})</span>
          </button>
        </div>
      </div>

      {/* Main Tab Navigation */}
      <div className="flex items-center space-x-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveTab('by_project')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 cursor-pointer ${
            activeTab === 'by_project'
              ? 'bg-emerald-700 text-white shadow-sm'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>Bảng Theo Dõi Theo Từng Công Trình ({projectGroups.length} dự án)</span>
        </button>

        <button
          onClick={() => setActiveTab('general_filter')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 cursor-pointer ${
            activeTab === 'general_filter'
              ? 'bg-emerald-700 text-white shadow-sm'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Filter className="w-4 h-4" />
          <span>Báo Cáo Đa Tiêu Chí (Bộ Lọc Tổng Hợp)</span>
        </button>
      </div>

      {/* TAB 1: EXCEL BY PROJECT & STATION */}
      {activeTab === 'by_project' && (
        <div className="space-y-5">
          {/* Filter Bar for Projects */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-sm space-y-3">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="w-full sm:w-1/3">
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Lọc Theo Trạm Trộn Cung Cấp:
                </label>
                <select
                  value={selectedStationFilter}
                  onChange={(e) => setSelectedStationFilter(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs font-semibold text-slate-800"
                >
                  <option value="all">🏢 Tất Cả Các Trạm Tasago ({stations.length} trạm)</option>
                  {stations.map(s => (
                    <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
                  ))}
                </select>
              </div>

              <div className="w-full sm:w-2/3">
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Tìm Tên Công Trình, Khách Hàng, Hạng Mục:
                </label>
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    value={projectSearchQuery}
                    onChange={(e) => setProjectSearchQuery(e.target.value)}
                    placeholder="Nhập tên dự án, đơn vị thi công hoặc hạng mục..."
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs"
                  />
                </div>
              </div>
            </div>

            <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 text-xs text-slate-600 flex items-center justify-between">
              <span>
                💡 File Excel xuất ra có đầy đủ: <strong>Tên đơn vị cung cấp (Tasago)</strong>, <strong>Tên khách hàng</strong>, <strong>Tên dự án công trình</strong>, cùng bảng chi tiết <strong>các hạng mục, mác bê tông, khối lượng (m³), số tổ mẫu</strong> và kết quả nén.
              </span>
            </div>
          </div>

          {/* List of Projects Cards */}
          {projectGroups.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-400 text-xs">
              Không tìm thấy công trình nào phù hợp với bộ lọc tìm kiếm.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {projectGroups.map(group => (
                <div 
                  key={group.projectKey}
                  className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between space-y-4"
                >
                  <div className="space-y-2.5">
                    {/* Header */}
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="bg-emerald-100 text-emerald-800 font-mono text-[10px] font-bold px-2 py-0.5 rounded">
                          {group.stationName}
                        </span>
                        <h3 className="text-sm font-black text-slate-900 mt-1 leading-snug">
                          {group.projectName}
                        </h3>
                        <p className="text-xs text-slate-500 font-medium">
                          Khách hàng: <strong className="text-slate-700">{group.contractor}</strong>
                        </p>
                      </div>
                      
                      <button
                        onClick={() => handleExportProjectExcel(group)}
                        className="bg-emerald-700 hover:bg-emerald-800 active:scale-95 text-white font-bold px-3 py-2 rounded-xl text-xs flex items-center space-x-1.5 shadow-sm transition-all cursor-pointer shrink-0"
                        title="Tải xuống bảng theo dõi Excel cho công trình này"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Xuất Excel</span>
                      </button>
                    </div>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-3 gap-2 bg-slate-50 p-2.5 rounded-xl text-center text-xs">
                      <div>
                        <span className="text-[10px] text-slate-400 block">Khối Lượng</span>
                        <span className="font-bold text-slate-800 text-xs">
                          {group.totalVolume.toLocaleString('vi-VN')} m³
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block">Số Tổ Mẫu</span>
                        <span className="font-bold text-slate-800 text-xs">
                          {group.totalGroups} tổ ({group.totalPieces}v)
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block">Số Phiếu Mẫu</span>
                        <span className="font-bold text-emerald-700 text-xs">
                          {group.samples.length} mẫu
                        </span>
                      </div>
                    </div>

                    {/* Meta info tags */}
                    <div className="space-y-1.5 text-xs text-slate-600">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[11px] font-semibold text-slate-400">Mác Bê Tông:</span>
                        {group.grades.map((gr, idx) => (
                          <span key={idx} className="bg-slate-100 border border-slate-200 text-slate-800 text-[10px] font-bold px-1.5 py-0.5 rounded">
                            {gr}
                          </span>
                        ))}
                      </div>

                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[11px] font-semibold text-slate-400">Hạng Mục:</span>
                        <span className="text-[11px] text-slate-700 truncate max-w-[280px]">
                          {group.components.join(', ')}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-[11px] pt-1 text-slate-500 border-t border-slate-100">
                        <div className="flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-slate-400" />
                          <span className="truncate max-w-[180px]">{group.location}</span>
                        </div>
                        <div className="flex items-center gap-1 font-mono text-emerald-700 font-medium">
                          <Phone className="w-3 h-3" />
                          <span>{group.contactPhone}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Status pills footer */}
                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
                    <div className="flex items-center space-x-1.5">
                      {group.testedCount > 0 && (
                        <span className="bg-emerald-50 text-emerald-700 font-bold px-2 py-0.5 rounded">
                          Đã nén: {group.testedCount}/{group.samples.length}
                        </span>
                      )}
                      {group.dueTodayCount > 0 && (
                        <span className="bg-red-100 text-red-700 font-bold px-2 py-0.5 rounded animate-pulse">
                          Đến hạn: {group.dueTodayCount}
                        </span>
                      )}
                      {group.overdueCount > 0 && (
                        <span className="bg-amber-100 text-amber-800 font-bold px-2 py-0.5 rounded">
                          Quá hạn: {group.overdueCount}
                        </span>
                      )}
                    </div>

                    <button
                      onClick={() => handleExportProjectExcel(group)}
                      className="text-emerald-700 hover:text-emerald-900 font-bold hover:underline flex items-center gap-0.5 cursor-pointer"
                    >
                      <span>Tải file Excel đầy đủ</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: GENERAL ADVANCED FILTER REPORT */}
      {activeTab === 'general_filter' && (
        <div className="space-y-5">
          {/* Filter Parameters Card */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
            <div className="flex items-center space-x-2 text-xs font-bold text-slate-800 uppercase tracking-wider">
              <Filter className="w-4 h-4 text-emerald-700" />
              <span>Thông Số Lọc Báo Cáo</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
              
              {/* Station Filter */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Chọn Trạm Trộn
                </label>
                <select
                  value={stationId}
                  onChange={(e) => setStationId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2 font-semibold text-slate-800"
                >
                  <option value="all">🏢 Tất Cả Các Trạm Tasago</option>
                  {stations.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>

              {/* Tested vs Untested Status Filter */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Tình Trạng Nén Mẫu
                </label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as any)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2 font-semibold text-slate-800"
                >
                  <option value="all">📋 Tất Cả Mẫu (Đã Nén & Chưa Nén)</option>
                  <option value="tested">✅ Chỉ Công Trình ĐÃ NÉN MẪU</option>
                  <option value="untested">⏳ Chỉ Công Trình CHƯA NÉN MẪU</option>
                  <option value="due_today">🔴 Chỉ Mẫu ĐẾN HẠN HÔM NAY</option>
                  <option value="overdue">⚠️ Chỉ Mẫu ĐÃ QUÁ HẠN</option>
                </select>
              </div>

              {/* Category Filter */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Phân Loại Bê Tông
                </label>
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value as any)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2 font-semibold text-slate-800"
                >
                  <option value="all">🧪 Tất Cả (Thương Phẩm & Trialmix)</option>
                  <option value="commercial">🚚 Bê Tông Thương Phẩm Đã Cấp</option>
                  <option value="trialmix">🔬 Cấp Phối Thí Nghiệm Trialmix</option>
                </select>
              </div>

              {/* Search keyword */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Tìm Kiếm Từ Khóa
                </label>
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Tên công trình, nhà thầu..."
                    className="w-full pl-8 pr-2 py-2 bg-slate-50 border border-slate-300 rounded-xl"
                  />
                </div>
              </div>

              {/* Date range from */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Lịch Nén Từ Ngày
                </label>
                <input
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2"
                />
              </div>

              {/* Date range to */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Đến Ngày
                </label>
                <input
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2"
                />
              </div>

            </div>

            {/* Quick Summary Strip */}
            <div className="bg-emerald-50/70 border border-emerald-200 p-3 rounded-xl flex flex-wrap items-center justify-between gap-3 text-xs text-emerald-950 font-semibold">
              <div className="flex items-center space-x-3">
                <span>Tổng số mẫu trong báo cáo: <strong className="text-sm font-black text-emerald-900">{filteredSamples.length}</strong></span>
                <span>•</span>
                <span>Tổng khối lượng bê tông: <strong className="text-sm font-black text-emerald-900">{totalVolume.toLocaleString('vi-VN')} m³</strong></span>
              </div>
              <div className="flex items-center space-x-3">
                <span>Đã nén: <strong>{testedCount}</strong></span>
                <span>Đạt mác: <strong className="text-emerald-700">{passedCount}</strong></span>
              </div>
            </div>
          </div>

          {/* Printable Report Preview Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden p-6 space-y-4">
            
            {/* Printable Letterhead */}
            <div className="border-b-2 border-emerald-800 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h1 className="font-black text-lg text-emerald-900 uppercase">
                  CÔNG TY CỔ PHẦN ĐẦU TƯ TASAGO
                </h1>
                <p className="text-xs font-semibold text-emerald-700">
                  BÊ TÔNG XANH SÀI GÒN - BÊ TÔNG CỦA MỌI CÔNG TRÌNH
                </p>
                <p className="text-xs text-slate-500 mt-0.5">
                  PHÒNG QUẢN LÝ KỸ THUẬT & KIỂM ĐỊNH CHẤT LƯỢNG BÊ TÔNG (QC/QA)
                </p>
              </div>
              <div className="text-right text-xs text-slate-500">
                <p className="font-bold text-slate-800">BÁO CÁO TIẾN ĐỘ NÉN MẪU</p>
                <p>Ngày lập: {formatDateVN(new Date().toISOString().split('T')[0])}</p>
              </div>
            </div>

            {filteredSamples.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs">
                Không có dữ liệu phù hợp với tiêu chí lọc báo cáo
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-700 border-collapse">
                  <thead className="bg-slate-100 text-slate-800 font-bold border-b border-slate-300">
                    <tr>
                      <th className="py-2.5 px-2 text-center w-8">STT</th>
                      <th className="py-2.5 px-3">Trạm / Mã Mẫu</th>
                      <th className="py-2.5 px-3">Tên Công Trình</th>
                      <th className="py-2.5 px-3">Hạng Mục</th>
                      <th className="py-2.5 px-2">KL (m³)</th>
                      <th className="py-2.5 px-2">Mác</th>
                      <th className="py-2.5 px-2">Tuổi</th>
                      <th className="py-2.5 px-2">Ngày Đúc</th>
                      <th className="py-2.5 px-2">Ngày Nén</th>
                      <th className="py-2.5 px-2 text-center">Tình Trạng</th>
                      <th className="py-2.5 px-2">Cường Độ (MPa)</th>
                      <th className="py-2.5 px-3">Người Liên Hệ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {filteredSamples.map((sample, idx) => {
                      const station = stationMap.get(sample.stationId);
                      const isTested = sample.status === 'tested_passed' || sample.status === 'tested_failed';

                      return (
                        <tr key={sample.id} className="hover:bg-slate-50">
                          <td className="py-2 px-2 text-center font-bold text-slate-400">{idx + 1}</td>
                          <td className="py-2 px-3">
                            <div className="font-bold text-slate-900">{sample.id}</div>
                            <div className="text-[11px] text-emerald-800 font-semibold">
                              {station ? station.name.replace('Trạm Tasago ', '') : ''}
                            </div>
                          </td>
                          <td className="py-2 px-3 font-semibold text-slate-900 max-w-[200px]">
                            {sample.projectName}
                            <div className="text-[10px] text-slate-500">{sample.contractor}</div>
                          </td>
                          <td className="py-2 px-3 text-slate-700">{sample.component}</td>
                          <td className="py-2 px-2 font-bold">{sample.volumeM3}</td>
                          <td className="py-2 px-2 font-black text-emerald-800">{sample.concreteGrade}</td>
                          <td className="py-2 px-2 font-bold">{sample.ageType}</td>
                          <td className="py-2 px-2 text-[11px]">{formatDateVN(sample.castDate)}</td>
                          <td className="py-2 px-2 text-[11px] font-bold text-slate-900">{formatDateVN(sample.scheduledTestDate)}</td>
                          <td className="py-2 px-2 text-center">
                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                              sample.status === 'due_today' ? 'bg-red-100 text-red-800' :
                              sample.status === 'overdue' ? 'bg-amber-100 text-amber-800' :
                              sample.status === 'tested_passed' ? 'bg-emerald-100 text-emerald-800' :
                              sample.status === 'tested_failed' ? 'bg-rose-100 text-rose-800' :
                              'bg-slate-100 text-slate-700'
                            }`}>
                              {sample.status === 'due_today' ? 'Hôm nay' :
                               sample.status === 'overdue' ? 'Quá hạn' :
                               sample.status === 'tested_passed' ? 'ĐẠT' :
                               sample.status === 'tested_failed' ? 'K.ĐẠT' : 'Chưa nén'}
                            </span>
                          </td>
                          <td className="py-2 px-2 font-bold">
                            {isTested && sample.testResult ? (
                              <span className={sample.testResult.isPassed ? 'text-emerald-700' : 'text-red-600'}>
                                {sample.testResult.avgStrengthMpa.toFixed(1)} MPa ({sample.testResult.percentageOfDesign.toFixed(0)}%)
                              </span>
                            ) : '---'}
                          </td>
                          <td className="py-2 px-3 text-[11px]">
                            <div>{sample.contactPerson}</div>
                            <div className="text-slate-500">{sample.contactPhone}</div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

          </div>
        </div>
      )}
    </div>
  );
};

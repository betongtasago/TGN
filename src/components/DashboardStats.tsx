import React from 'react';
import { 
  Building2, 
  FlaskConical, 
  Calendar, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  Layers, 
  Send, 
  FileSpreadsheet, 
  TrendingUp,
  MessageSquare
} from 'lucide-react';
import { ConcreteSample, Station } from '../types';
import { ViewMode } from '../utils/storage';

interface DashboardStatsProps {
  samples: ConcreteSample[];
  stations: Station[];
  selectedStationId: string;
  onFilterStatus?: (status: string) => void;
  onOpenNotificationCenter?: () => void;
  viewMode?: ViewMode;
}

export const DashboardStats: React.FC<DashboardStatsProps> = ({
  samples,
  stations,
  selectedStationId,
  onFilterStatus,
  onOpenNotificationCenter,
  viewMode = 'auto',
}) => {
  // Filter samples according to selected station
  const filteredSamples = selectedStationId === 'all'
    ? samples
    : samples.filter(s => s.stationId === selectedStationId);

  const selectedStationObj = stations.find(s => s.id === selectedStationId);

  // Key metrics
  const totalCount = filteredSamples.length;
  const dueTodayCount = filteredSamples.filter(s => s.status === 'due_today').length;
  const overdueCount = filteredSamples.filter(s => s.status === 'overdue').length;
  const r7Count = filteredSamples.filter(s => s.ageType === 'R7' && s.status !== 'tested_passed').length;
  const r28Count = filteredSamples.filter(s => s.ageType === 'R28' && s.status !== 'tested_passed').length;
  const testedCount = filteredSamples.filter(s => s.status === 'tested_passed' || s.status === 'tested_failed').length;
  const totalVolumeM3 = filteredSamples.reduce((acc, curr) => acc + (curr.volumeM3 || 0), 0);

  const isMobileLayout = viewMode === 'mobile';

  return (
    <div className="space-y-3 font-sans">
      
      {/* KPI Cards Grid - Responsive & Mobile-Optimized */}
      <div className={`grid ${isMobileLayout ? 'grid-cols-2 gap-2' : 'grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4'}`}>
        
        {/* Card 1: Tổng mẫu */}
        <div 
          onClick={() => onFilterStatus && onFilterStatus('all')}
          className="bg-white p-3.5 sm:p-4 rounded-xl border border-slate-200 shadow-xs hover:border-emerald-400 transition-all cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <p className="text-[11px] sm:text-xs text-slate-500 font-semibold uppercase tracking-wider">
              Tổng Mẫu Đang Theo Dõi
            </p>
            <FlaskConical className="w-4 h-4 text-emerald-600" />
          </div>
          <h3 className="text-xl sm:text-2xl font-black text-slate-800 mt-1">
            {totalCount}{' '}
            <span className="text-xs sm:text-sm font-semibold text-emerald-600 ml-0.5 sm:ml-1">
              tổ ({totalVolumeM3.toLocaleString('vi-VN')} m³)
            </span>
          </h3>
        </div>

        {/* Card 2: Đến hạn R7 */}
        <div 
          onClick={() => onFilterStatus && onFilterStatus('r7')}
          className="bg-white p-3.5 sm:p-4 rounded-xl border border-slate-200 shadow-xs border-l-4 border-l-orange-500 hover:shadow-sm transition-all cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <p className="text-[11px] sm:text-xs text-slate-500 font-semibold uppercase tracking-wider">
              Đang Chờ Nén R7
            </p>
            <Clock className="w-4 h-4 text-orange-500" />
          </div>
          <h3 className="text-xl sm:text-2xl font-black text-orange-600 mt-1">
            {String(r7Count).padStart(2, '0')}{' '}
            <span className="text-xs sm:text-sm font-normal text-slate-400 ml-1">
              tổ mẫu
            </span>
          </h3>
        </div>

        {/* Card 3: Đến hạn R28 */}
        <div 
          onClick={() => onFilterStatus && onFilterStatus('r28')}
          className="bg-white p-3.5 sm:p-4 rounded-xl border border-slate-200 shadow-xs border-l-4 border-l-blue-500 hover:shadow-sm transition-all cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <p className="text-[11px] sm:text-xs text-slate-500 font-semibold uppercase tracking-wider">
              Đang Chờ Nén R28
            </p>
            <Calendar className="w-4 h-4 text-blue-500" />
          </div>
          <h3 className="text-xl sm:text-2xl font-black text-blue-600 mt-1">
            {String(r28Count).padStart(2, '0')}{' '}
            <span className="text-xs sm:text-sm font-normal text-slate-400 ml-1">
              tổ mẫu
            </span>
          </h3>
        </div>

        {/* Card 4: Cần xử lý ngay (Hôm nay + Quá hạn) */}
        <div 
          onClick={() => onFilterStatus && onFilterStatus('urgent')}
          className={`p-3.5 sm:p-4 rounded-xl border shadow-xs transition-all cursor-pointer ${
            dueTodayCount + overdueCount > 0 
              ? 'bg-red-50/70 border-red-200 hover:border-red-400' 
              : 'bg-white border-slate-200'
          }`}
        >
          <div className="flex items-center justify-between">
            <p className="text-[11px] sm:text-xs text-slate-600 font-semibold uppercase tracking-wider">
              Hôm Nay / Quá Hạn
            </p>
            <AlertTriangle className={`w-4 h-4 ${dueTodayCount + overdueCount > 0 ? 'text-red-600 animate-bounce' : 'text-slate-400'}`} />
          </div>
          <h3 className={`text-xl sm:text-2xl font-black mt-1 ${dueTodayCount + overdueCount > 0 ? 'text-red-600' : 'text-slate-800'}`}>
            {dueTodayCount + overdueCount}{' '}
            <span className="text-xs sm:text-sm font-semibold ml-1">
              ({dueTodayCount} hôm nay / {overdueCount} quá hạn)
            </span>
          </h3>
        </div>

      </div>

      {/* Selected Station Banner Info */}
      {selectedStationObj && selectedStationId !== 'all' && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-2 flex items-center justify-between text-xs text-emerald-900">
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-emerald-700 shrink-0" />
            <span>
              Đang lọc theo: <strong>{selectedStationObj.name}</strong> ({selectedStationObj.code}) • {selectedStationObj.address}
            </span>
          </div>
          <span className="font-mono font-bold text-emerald-800 hidden sm:inline">
            Hotline trạm: {selectedStationObj.hotline || '0942.320.923'}
          </span>
        </div>
      )}
    </div>
  );
};

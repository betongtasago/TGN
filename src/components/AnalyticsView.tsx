import React, { useMemo } from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell, 
  LineChart, 
  Line, 
  AreaChart, 
  Area 
} from 'recharts';
import { 
  BarChart3, 
  TrendingUp, 
  PieChart as PieIcon, 
  CheckCircle2, 
  AlertTriangle, 
  FlaskConical, 
  Layers, 
  Activity 
} from 'lucide-react';
import { ConcreteSample, Station } from '../types';

interface AnalyticsViewProps {
  samples: ConcreteSample[];
  stations: Station[];
  selectedStationId: string;
}

const COLORS = ['#059669', '#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444', '#06b6d4', '#64748b'];

export const AnalyticsView: React.FC<AnalyticsViewProps> = ({
  samples,
  stations,
  selectedStationId,
}) => {
  const stationMap = useMemo(() => {
    const map = new Map<string, Station>();
    stations.forEach(s => map.set(s.id, s));
    return map;
  }, [stations]);

  const activeSamples = selectedStationId === 'all'
    ? samples
    : samples.filter(s => s.stationId === selectedStationId);

  // 1. Data for Station Volumes & Sample Counts
  const stationChartData = useMemo(() => {
    return stations.map(station => {
      const stationSamples = samples.filter(s => s.stationId === station.id);
      const volume = stationSamples.reduce((acc, curr) => acc + (curr.volumeM3 || 0), 0);
      const testedCount = stationSamples.filter(s => s.status === 'tested_passed' || s.status === 'tested_failed').length;

      return {
        name: station.name.replace('Trạm Tasago ', '').replace(' (TP.HCM)', '').replace(' (Long An)', '').replace(' (Bình Dương)', '').replace(' (Đồng Nai)', ''),
        'Khối Lượng Bê Tông (m³)': volume,
        'Số Lượng Mẫu': stationSamples.length,
        'Đã Nén Mẫu': testedCount,
      };
    });
  }, [samples, stations]);

  // 2. Data for Concrete Grades Distribution
  const gradeChartData = useMemo(() => {
    const counts: Record<string, number> = {};
    activeSamples.forEach(s => {
      const grade = s.concreteGrade || 'Khác';
      counts[grade] = (counts[grade] || 0) + 1;
    });

    return Object.entries(counts).map(([name, value]) => ({
      name,
      value,
    }));
  }, [activeSamples]);

  // 3. Data for Age Types Distribution
  const ageChartData = useMemo(() => {
    const counts: Record<string, number> = {};
    activeSamples.forEach(s => {
      const age = s.ageType || 'R28';
      counts[age] = (counts[age] || 0) + 1;
    });

    return Object.entries(counts).map(([name, value]) => ({
      name: name === 'R28_WATERPROOF' ? 'R28 Chống Thấm' : name === 'EXPANSION' ? 'Bù Co Ngót' : `Tuổi ${name}`,
      value,
    }));
  }, [activeSamples]);

  // 4. Data for QC Pass / Fail & Schedule Performance
  const statusChartData = useMemo(() => {
    const passed = activeSamples.filter(s => s.status === 'tested_passed').length;
    const failed = activeSamples.filter(s => s.status === 'tested_failed').length;
    const dueToday = activeSamples.filter(s => s.status === 'due_today').length;
    const overdue = activeSamples.filter(s => s.status === 'overdue').length;
    const pending = activeSamples.filter(s => s.status === 'pending').length;

    return [
      { name: 'Đã Nén Đạt', value: passed, color: '#10b981' },
      { name: 'Chưa Đến Hạn', value: pending, color: '#3b82f6' },
      { name: 'Đến Hạn Hôm Nay', value: dueToday, color: '#ef4444' },
      { name: 'Quá Hạn', value: overdue, color: '#f59e0b' },
      { name: 'Không Đạt Mác', value: failed, color: '#e11d48' },
    ].filter(item => item.value > 0);
  }, [activeSamples]);

  // 5. Strength Trend Comparison (Tested Samples)
  const strengthTrendData = useMemo(() => {
    const tested = activeSamples.filter(s => s.testResult);
    return tested.slice(0, 10).map((s, idx) => ({
      name: s.projectName.slice(0, 15) + '...',
      'Cường Độ Thực Tế (MPa)': s.testResult?.avgStrengthMpa || 0,
      'Mác Thiết Kế (MPa)': s.testResult?.designStrengthMpa || 30,
      '% Đạt': s.testResult?.percentageOfDesign || 100,
    }));
  }, [activeSamples]);

  return (
    <div className="space-y-6 pb-12">
      {/* Header Banner */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-sm">
        <div className="flex items-center space-x-2.5">
          <div className="w-9 h-9 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-800">
            <BarChart3 className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-black text-slate-900">
              Biểu Đồ Thống Kê & Phân Tích Chất Lượng Nén Mẫu
            </h2>
            <p className="text-xs text-slate-500">
              Hệ thống tổng hợp sản lượng trạm trộn, phân bố mác bê tông, tuổi nén và tỷ lệ đạt chuẩn TCVN
            </p>
          </div>
        </div>
      </div>

      {/* Grid Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Chart 1: Sản lượng bê tông & số lượng mẫu theo từng trạm */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm text-slate-900 flex items-center space-x-1.5">
              <Layers className="w-4 h-4 text-emerald-700" />
              <span>Sản Lượng Bê Tông (m³) Theo Từng Trạm</span>
            </h3>
            <span className="text-xs text-slate-400 font-mono">Đơn vị: m³</span>
          </div>

          <div className="h-64 sm:h-72 w-full text-xs">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stationChartData} margin={{ top: 10, right: 10, left: -10, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="name" angle={-15} textAnchor="end" height={45} tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', color: '#fff', fontSize: '12px' }}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                <Bar dataKey="Khối Lượng Bê Tông (m³)" fill="#059669" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Số Lượng Mẫu" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: Phân bố Mác bê tông */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm text-slate-900 flex items-center space-x-1.5">
              <PieIcon className="w-4 h-4 text-emerald-700" />
              <span>Cơ Cấu Mác Bê Tông Đã Cung Cấp</span>
            </h3>
            <span className="text-xs text-slate-400">Tỷ lệ %</span>
          </div>

          <div className="h-64 sm:h-72 w-full text-xs">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={gradeChartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={85}
                  paddingAngle={3}
                  dataKey="value"
                  label={({ name, percent }) => `${name.split(' ')[0]} (${(percent * 100).toFixed(0)}%)`}
                >
                  {gradeChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', color: '#fff', fontSize: '12px' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 3: Tình trạng & Tiến độ nén mẫu */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm text-slate-900 flex items-center space-x-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-700" />
              <span>Tỷ Lệ Kiểm Soát & Tình Trạng Lịch Nén</span>
            </h3>
            <span className="text-xs text-slate-400">Số lượng mẫu</span>
          </div>

          <div className="h-64 sm:h-72 w-full text-xs">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={statusChartData} layout="vertical" margin={{ top: 10, right: 30, left: 30, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} width={100} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', color: '#fff', fontSize: '12px' }}
                />
                <Bar dataKey="value" name="Số mẫu" radius={[0, 4, 4, 0]}>
                  {statusChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 4: Cường độ thực tế so với thiết kế */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm text-slate-900 flex items-center space-x-1.5">
              <Activity className="w-4 h-4 text-emerald-700" />
              <span>Biểu Đồ Kiểm Soát Cường Độ Nén Thực Tế (MPa)</span>
            </h3>
            <span className="text-xs text-slate-400">Đơn vị: MPa</span>
          </div>

          {strengthTrendData.length === 0 ? (
            <div className="h-64 flex items-center justify-center text-slate-400 text-xs">
              Chưa có đủ mẫu đã nén để vẽ đồ thị so sánh
            </div>
          ) : (
            <div className="h-64 sm:h-72 w-full text-xs">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={strengthTrendData} margin={{ top: 10, right: 10, left: -10, bottom: 25 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="name" angle={-15} textAnchor="end" height={45} tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 11 }} domain={[15, 'auto']} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', color: '#fff', fontSize: '12px' }}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                  <Line type="monotone" dataKey="Cường Độ Thực Tế (MPa)" stroke="#059669" strokeWidth={3} activeDot={{ r: 6 }} />
                  <Line type="monotone" dataKey="Mác Thiết Kế (MPa)" stroke="#f59e0b" strokeWidth={2} strokeDasharray="5 5" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

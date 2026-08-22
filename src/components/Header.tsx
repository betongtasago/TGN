import React, { useState } from 'react';
import { 
  Building2, 
  FlaskConical, 
  Calendar, 
  BarChart3, 
  FileSpreadsheet, 
  Bell, 
  Users, 
  Layers, 
  PlusCircle, 
  LogOut, 
  ShieldCheck, 
  Download,
  AlertTriangle,
  Send,
  Menu,
  X,
  Settings,
  Plus,
  Phone,
  Monitor,
  Smartphone,
  LayoutGrid,
  HelpCircle,
  ExternalLink,
  RefreshCw
} from 'lucide-react';
import { User, Station } from '../types';
import { ViewMode } from '../utils/storage';

interface HeaderProps {
  currentUser: User | null;
  stations: Station[];
  selectedStationId: string;
  onSelectStation: (stationId: string) => void;
  activeTab: 'samples' | 'calendar' | 'analytics' | 'reports';
  onChangeTab: (tab: 'samples' | 'calendar' | 'analytics' | 'reports') => void;
  onLogout: () => void;
  onOpenAddModal: () => void;
  onOpenNotificationModal: () => void;
  onOpenUserManagement: (tab?: 'users' | 'stations') => void;
  onOpenExportBackup: () => void;
  urgentCount: number;
  viewMode: ViewMode;
  onChangeViewMode: (mode: ViewMode) => void;
  onManualSync?: () => void;
  isSyncing?: boolean;
  lastSyncedAt?: Date;
  sseConnected?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  currentUser,
  stations,
  selectedStationId,
  onSelectStation,
  activeTab,
  onChangeTab,
  onLogout,
  onOpenAddModal,
  onOpenNotificationModal,
  onOpenUserManagement,
  onOpenExportBackup,
  urgentCount,
  viewMode,
  onChangeViewMode,
  onManualSync,
  isSyncing = false,
  lastSyncedAt,
  sseConnected = true,
}) => {
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems = [
    { id: 'samples', label: 'Bảng Quản Lý Mẫu', icon: FlaskConical },
    { id: 'calendar', label: 'Lịch Nén Tháng', icon: Calendar },
    { id: 'analytics', label: 'Báo Cáo Thống Kê', icon: BarChart3 },
    { id: 'reports', label: 'Xuất File Báo Cáo', icon: FileSpreadsheet },
  ] as const;

  const handleStationSelectChange = (val: string) => {
    if (val === '__manage_stations__') {
      onOpenUserManagement('stations');
    } else {
      onSelectStation(val);
    }
  };

  return (
    <header className="w-full font-sans sticky top-0 z-40 shadow-md">
      {/* Top Banner - Hotline & Support Bar */}
      <div className="bg-emerald-950 text-emerald-300 px-4 sm:px-6 py-1 text-[11px] flex justify-between items-center border-b border-emerald-900/60">
        <div className="flex items-center gap-3">
          <span className="font-semibold text-emerald-200 hidden sm:inline">
            CÔNG TY CỔ PHẦN ĐẦU TƯ TASAGO
          </span>
          <span className="hidden sm:inline text-emerald-700">•</span>
          <a 
            href="tel:0942320923" 
            className="flex items-center gap-1 text-emerald-300 hover:text-white transition-colors font-bold bg-emerald-900/60 px-2 py-0.5 rounded"
            title="Gọi trực tiếp bộ phận kỹ thuật Tasago"
          >
            <Phone className="w-3 h-3 text-emerald-400" />
            <span>Hỗ trợ kỹ thuật: 0942.320.923</span>
          </a>
        </div>

        {/* View Mode Quick Switcher (PC / Mobile / Auto) */}
        <div className="flex items-center gap-1.5">
          <span className="text-emerald-400 text-[10px] uppercase font-bold hidden md:inline">
            Giao diện:
          </span>
          <div className="inline-flex bg-emerald-900/80 p-0.5 rounded-md border border-emerald-800 text-[11px]">
            <button
              onClick={() => onChangeViewMode('auto')}
              title="Chế độ Tự động thích ứng"
              className={`px-2 py-0.5 rounded flex items-center gap-1 font-semibold transition-all cursor-pointer ${
                viewMode === 'auto'
                  ? 'bg-emerald-600 text-white shadow-xs font-bold'
                  : 'text-emerald-300 hover:text-white'
              }`}
            >
              <LayoutGrid className="w-3 h-3" />
              <span className="hidden sm:inline">Tự Động</span>
            </button>
            <button
              onClick={() => onChangeViewMode('pc')}
              title="Chế độ Máy tính (PC / Desktop)"
              className={`px-2 py-0.5 rounded flex items-center gap-1 font-semibold transition-all cursor-pointer ${
                viewMode === 'pc'
                  ? 'bg-emerald-600 text-white shadow-xs font-bold'
                  : 'text-emerald-300 hover:text-white'
              }`}
            >
              <Monitor className="w-3 h-3" />
              <span>PC</span>
            </button>
            <button
              onClick={() => onChangeViewMode('mobile')}
              title="Chế độ Điện thoại (Mobile View)"
              className={`px-2 py-0.5 rounded flex items-center gap-1 font-semibold transition-all cursor-pointer ${
                viewMode === 'mobile'
                  ? 'bg-emerald-600 text-white shadow-xs font-bold'
                  : 'text-emerald-300 hover:text-white'
              }`}
            >
              <Smartphone className="w-3 h-3" />
              <span>Mobile</span>
            </button>
          </div>
        </div>
      </div>

      {/* Primary Top Nav - Professional Emerald Bar */}
      <nav className="bg-emerald-800 text-white px-4 sm:px-6 py-2.5 flex justify-between items-center">
        
        {/* Brand & Logo */}
        <div 
          className="flex items-center gap-3 cursor-pointer select-none" 
          onClick={() => onChangeTab('samples')}
        >
          <div className="w-9 h-9 sm:w-10 sm:h-10 bg-white rounded-lg flex items-center justify-center shadow-sm shrink-0">
            <span className="text-emerald-800 font-black text-lg sm:text-xl tracking-tight">TSG</span>
          </div>
          <div>
            <h1 className="text-base sm:text-lg font-bold leading-none tracking-tight text-white flex items-center gap-2">
              <span>TASAGO</span>
              <span className="text-[10px] bg-emerald-700/90 text-emerald-200 px-1.5 py-0.5 rounded font-mono hidden sm:inline">
                2026
              </span>
            </h1>
            <p className="text-[10px] uppercase tracking-widest text-emerald-200 opacity-90 font-medium mt-0.5">
              Quản Lý Nén Mẫu Bê Tông
            </p>
          </div>
        </div>

        {/* Desktop Main Navigation Tabs */}
        <div className="hidden md:flex gap-5 text-sm font-medium">
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onChangeTab(item.id)}
                className={`transition-all pb-1 flex items-center gap-1.5 cursor-pointer ${
                  isActive 
                    ? 'border-b-2 border-white text-white font-bold' 
                    : 'text-emerald-100 opacity-75 hover:opacity-100 hover:text-white'
                }`}
              >
                <item.icon className="w-4 h-4" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>

        {/* User Info & Actions */}
        <div className="flex items-center gap-2 sm:gap-3 text-sm">
          
          {/* Notification Alert Button */}
          <button
            onClick={onOpenNotificationModal}
            className={`relative p-2 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
              urgentCount > 0 
                ? 'bg-amber-400 text-slate-950 font-bold hover:bg-amber-300 shadow-sm animate-pulse' 
                : 'bg-emerald-700/80 hover:bg-emerald-700 text-emerald-100'
            }`}
            title="Nhắc nhở Zalo / Email nén mẫu"
          >
            <Bell className="w-4 h-4" />
            {urgentCount > 0 && (
              <span className="text-xs hidden sm:inline font-bold">
                {urgentCount} cần nén
              </span>
            )}
          </button>

          {/* Admin Station & User Management Shortcut */}
          {currentUser?.role === 'admin' && (
            <div className="hidden lg:flex items-center space-x-1.5">
              <button
                onClick={() => onOpenUserManagement('stations')}
                className="bg-emerald-700 hover:bg-emerald-600 text-emerald-100 px-2.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer border border-emerald-600/60 shadow-xs"
                title="Quản lý danh sách trạm trộn bê tông Tasago"
              >
                <Building2 className="w-3.5 h-3.5 text-emerald-300" />
                <span>Quản Lý Trạm</span>
              </button>

              <button
                onClick={() => onOpenUserManagement('users')}
                className="bg-emerald-700/70 hover:bg-emerald-600 text-emerald-100 px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer border border-emerald-600/40"
                title="Quản trị thành viên & KTV trạm"
              >
                <Users className="w-3.5 h-3.5" />
                <span>Tài Khoản</span>
              </button>
            </div>
          )}

          {/* User Profile Pill */}
          {currentUser && (
            <div className="relative">
              <button
                onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                className="flex items-center gap-2 cursor-pointer text-left pl-1"
              >
                <div className="hidden sm:flex flex-col items-end">
                  <span className="font-semibold text-emerald-100 text-xs truncate max-w-[120px]">
                    {currentUser.fullName}
                  </span>
                  <span className="text-[10px] bg-emerald-700 text-emerald-100 px-2 py-0.5 rounded font-medium">
                    {currentUser.role === 'admin' ? 'Quản trị viên' : 'KTV Trạm'}
                  </span>
                </div>
                <div className="w-8 h-8 bg-emerald-600 rounded-full border border-emerald-400 flex items-center justify-center font-bold text-white text-xs shadow-inner">
                  {currentUser.fullName.charAt(0)}
                </div>
              </button>

              {/* Dropdown Menu */}
              {userDropdownOpen && (
                <div 
                  className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-xl py-2 text-slate-800 z-50 border border-slate-200 animate-in fade-in zoom-in-95 duration-100 text-xs"
                  onClick={() => setUserDropdownOpen(false)}
                >
                  <div className="px-4 py-2.5 border-b border-slate-100">
                    <p className="font-bold text-sm text-slate-900">{currentUser.fullName}</p>
                    <p className="text-xs text-slate-500">@{currentUser.username}</p>
                    <span className={`inline-block mt-1 text-[10px] px-2 py-0.5 rounded-full font-bold ${
                      currentUser.role === 'admin' ? 'bg-purple-100 text-purple-800' : 'bg-emerald-100 text-emerald-800'
                    }`}>
                      {currentUser.role === 'admin' ? 'Quản Trị Viên (Admin)' : 'KTV Trạm'}
                    </span>
                  </div>

                  <div className="px-4 py-2 bg-slate-50 text-[11px] text-slate-600 border-b border-slate-100">
                    <p className="font-semibold text-slate-700 flex items-center gap-1">
                      <Phone className="w-3 h-3 text-emerald-600" />
                      <span>Hotline: 0942.320.923</span>
                    </p>
                  </div>

                  {currentUser.role === 'admin' && (
                    <>
                      <button
                        onClick={() => onOpenUserManagement('stations')}
                        className="w-full text-left px-4 py-2 font-bold text-emerald-800 hover:bg-emerald-50 flex items-center gap-2 cursor-pointer"
                      >
                        <Building2 className="w-4 h-4 text-emerald-600" />
                        <span>Quản Lý & Thêm/Xóa Trạm Trộn</span>
                      </button>

                      <button
                        onClick={() => onOpenUserManagement('users')}
                        className="w-full text-left px-4 py-2 font-medium text-slate-700 hover:bg-slate-50 flex items-center gap-2 cursor-pointer"
                      >
                        <Users className="w-4 h-4 text-teal-600" />
                        <span>Quản Lý KTV & Phân Quyền</span>
                      </button>

                      <button
                        onClick={onOpenExportBackup}
                        className="w-full text-left px-4 py-2 font-medium text-slate-700 hover:bg-slate-50 flex items-center gap-2 cursor-pointer border-t border-slate-100"
                      >
                        <Download className="w-4 h-4 text-slate-600" />
                        <span>Sao Lưu Dữ Liệu & Hướng Dẫn</span>
                      </button>
                    </>
                  )}

                  <button
                    onClick={onLogout}
                    className="w-full text-left px-4 py-2 font-bold text-red-600 hover:bg-red-50 flex items-center gap-2 border-t border-slate-100 mt-1 cursor-pointer"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Đăng Xuất Tài Khoản</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Mobile Menu Toggle */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-1.5 rounded-lg bg-emerald-700 text-white cursor-pointer"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </nav>

      {/* Sub-header / Quick Action & Filter Ribbon */}
      <div className="bg-white border-b border-slate-200 px-4 sm:px-6 py-2 flex flex-wrap justify-between items-center gap-2.5">
        <div className="flex flex-wrap items-center gap-2">
          <button
            id="subnav-add-sample-btn"
            onClick={onOpenAddModal}
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
          >
            <PlusCircle className="w-4 h-4" />
            <span>+ Nhập Mẫu Mới</span>
          </button>

          <button
            id="subnav-export-report-btn"
            onClick={() => onChangeTab('reports')}
            className="bg-slate-100 text-slate-700 hover:bg-slate-200 px-3.5 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer hidden sm:flex"
          >
            <FileSpreadsheet className="w-4 h-4 text-slate-600" />
            <span>Xuất Báo Cáo</span>
          </button>

          <button
            onClick={onOpenNotificationModal}
            className="bg-slate-100 text-slate-700 hover:bg-slate-200 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Send className="w-3.5 h-3.5 text-blue-600" />
            <span className="hidden sm:inline">Zalo Bot & Email</span>
            <span className="sm:hidden">Thông Báo</span>
          </button>

          {/* Real-time Cloud Sync Status Button */}
          {onManualSync && (
            <button
              onClick={onManualSync}
              disabled={isSyncing}
              className={`px-2.5 py-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs ${
                sseConnected 
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100' 
                  : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
              }`}
              title={`Máy chủ trung tâm: ${sseConnected ? 'Đang kết nối Realtime trực tuyến (SSE)' : 'Đang kết nối lại...'}. Nhấn để làm mới ngay. Lần đồng bộ gần nhất: ${lastSyncedAt ? lastSyncedAt.toLocaleTimeString('vi-VN') : 'vừa xong'}`}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${sseConnected ? 'text-emerald-600' : 'text-slate-500'} ${isSyncing ? 'animate-spin' : ''}`} />
              <span className="hidden lg:inline">
                {isSyncing ? 'Đang tải...' : sseConnected ? 'Đồng bộ Realtime' : 'Đang kết nối...'}
              </span>
              <span className={`w-2 h-2 rounded-full ${sseConnected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-400'} hidden sm:inline`} />
            </button>
          )}

          {currentUser?.role === 'admin' && (
            <button
              onClick={() => onOpenUserManagement('stations')}
              className="bg-teal-50 hover:bg-teal-100 text-teal-800 px-3 py-1.5 rounded-lg border border-teal-200 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer sm:hidden"
            >
              <Building2 className="w-3.5 h-3.5 text-teal-600" />
              <span>Trạm Trộn</span>
            </button>
          )}
        </div>

        {/* Station Filter Dropdown */}
        <div className="flex items-center gap-2">
          <label className="text-xs font-bold text-slate-500 uppercase whitespace-nowrap hidden sm:inline">
            Trạm:
          </label>
          <select
            id="station-selector-dropdown"
            value={selectedStationId}
            onChange={(e) => handleStationSelectChange(e.target.value)}
            className="bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer max-w-[210px] sm:max-w-[260px] truncate"
          >
            <option value="all">🏢 Tất cả các trạm ({stations.length})</option>
            {stations.map(station => (
              <option key={station.id} value={station.id}>
                {station.name} ({station.code}) {station.active === false ? ' [Tạm ngưng]' : ''}
              </option>
            ))}
            {currentUser?.role === 'admin' && (
              <option value="__manage_stations__" className="text-emerald-700 font-bold bg-emerald-50">
                ⚙️ + Quản lý / Thêm trạm...
              </option>
            )}
          </select>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-emerald-900 text-white p-4 space-y-3 border-b border-emerald-950 animate-in slide-in-from-top duration-150 shadow-2xl">
          <div className="grid grid-cols-2 gap-2">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  onChangeTab(item.id);
                  setMobileMenuOpen(false);
                }}
                className={`p-2.5 rounded-xl text-xs font-bold flex items-center gap-2 ${
                  activeTab === item.id ? 'bg-white text-emerald-900' : 'bg-emerald-800 text-white'
                }`}
              >
                <item.icon className="w-4 h-4" />
                <span>{item.label}</span>
              </button>
            ))}
          </div>

          {/* View Mode inside Mobile Drawer */}
          <div className="bg-emerald-950/80 p-3 rounded-xl border border-emerald-800">
            <div className="text-xs font-semibold text-emerald-300 mb-2 flex items-center justify-between">
              <span>Chế độ hiển thị giao diện:</span>
              <span className="text-[10px] text-emerald-400 font-bold uppercase">{viewMode}</span>
            </div>
            <div className="grid grid-cols-3 gap-1 text-xs">
              <button
                onClick={() => onChangeViewMode('auto')}
                className={`p-2 rounded-lg font-bold text-center ${viewMode === 'auto' ? 'bg-emerald-600 text-white' : 'bg-emerald-900 text-emerald-200'}`}
              >
                Tự Động
              </button>
              <button
                onClick={() => onChangeViewMode('pc')}
                className={`p-2 rounded-lg font-bold text-center ${viewMode === 'pc' ? 'bg-emerald-600 text-white' : 'bg-emerald-900 text-emerald-200'}`}
              >
                PC
              </button>
              <button
                onClick={() => onChangeViewMode('mobile')}
                className={`p-2 rounded-lg font-bold text-center ${viewMode === 'mobile' ? 'bg-emerald-600 text-white' : 'bg-emerald-900 text-emerald-200'}`}
              >
                Mobile
              </button>
            </div>
          </div>

          {/* Support Phone in Mobile Drawer */}
          <div className="bg-emerald-800/80 p-2.5 rounded-xl flex items-center justify-between text-xs">
            <span className="text-emerald-200">Hỗ trợ kỹ thuật 24/7:</span>
            <a 
              href="tel:0942320923" 
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-2.5 py-1 rounded-lg flex items-center gap-1"
            >
              <Phone className="w-3.5 h-3.5" />
              <span>0942.320.923</span>
            </a>
          </div>

          {currentUser?.role === 'admin' && (
            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-emerald-800/80">
              <button
                onClick={() => {
                  onOpenUserManagement('stations');
                  setMobileMenuOpen(false);
                }}
                className="bg-emerald-700/80 hover:bg-emerald-600 text-white p-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5"
              >
                <Building2 className="w-3.5 h-3.5 text-emerald-300" />
                <span>Quản Lý Trạm</span>
              </button>

              <button
                onClick={() => {
                  onOpenUserManagement('users');
                  setMobileMenuOpen(false);
                }}
                className="bg-emerald-700/80 hover:bg-emerald-600 text-white p-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5"
              >
                <Users className="w-3.5 h-3.5 text-teal-300" />
                <span>Quản Trị KTV</span>
              </button>
            </div>
          )}

          <div className="pt-2 border-t border-emerald-800 flex items-center justify-between text-xs">
            <span>Đang đăng nhập: <strong>{currentUser?.fullName}</strong></span>
            <button onClick={onLogout} className="text-red-300 font-bold flex items-center gap-1 cursor-pointer">
              <LogOut className="w-3.5 h-3.5" />
              <span>Đăng xuất</span>
            </button>
          </div>
        </div>
      )}
    </header>
  );
};

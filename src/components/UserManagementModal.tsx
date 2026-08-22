import React, { useState, useMemo } from 'react';
import { 
  X, 
  Users, 
  UserPlus, 
  ShieldCheck, 
  Building2, 
  Key, 
  Check, 
  Trash2, 
  Mail, 
  Phone, 
  Lock,
  Edit,
  Plus,
  AlertTriangle,
  Search,
  CheckCircle2,
  AlertCircle,
  Factory,
  MapPin,
  Flame,
  ArrowRightLeft,
  Activity,
  FileText
} from 'lucide-react';
import { User, Station, ConcreteSample } from '../types';

interface UserManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  users: User[];
  stations: Station[];
  samples?: ConcreteSample[];
  onSaveUsers: (users: User[]) => void;
  onSaveStations: (stations: Station[]) => void;
  onSaveSamples?: (samples: ConcreteSample[]) => void;
  initialTab?: 'users' | 'stations';
}

export const UserManagementModal: React.FC<UserManagementModalProps> = ({
  isOpen,
  onClose,
  users,
  stations,
  samples = [],
  onSaveUsers,
  onSaveStations,
  onSaveSamples,
  initialTab = 'stations',
}) => {
  const [activeTab, setActiveTab] = useState<'users' | 'stations'>(initialTab);
  
  // User Management State
  const [showAddUser, setShowAddUser] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newFullName, setNewFullName] = useState('');
  const [newRole, setNewRole] = useState<'admin' | 'member'>('member');
  const [newStationId, setNewStationId] = useState<string>(stations[0]?.id || '');
  const [newPhone, setNewPhone] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [userSearchQuery, setUserSearchQuery] = useState('');

  // Station Management State
  const [showAddStation, setShowAddStation] = useState(false);
  const [editingStationId, setEditingStationId] = useState<string | null>(null);
  const [stationName, setStationName] = useState('');
  const [stationCode, setStationCode] = useState('');
  const [stationAddress, setStationAddress] = useState('');
  const [stationCapacity, setStationCapacity] = useState('120 m³/h');
  const [stationManager, setStationManager] = useState('');
  const [stationPhone, setStationPhone] = useState('');
  const [stationHotline, setStationHotline] = useState('');
  const [stationSearchQuery, setStationSearchQuery] = useState('');

  // Station Safe Deletion Confirmation Dialog State
  const [stationToDelete, setStationToDelete] = useState<Station | null>(null);
  const [targetMigrationStationId, setTargetMigrationStationId] = useState<string>('');
  const [deleteSampleOption, setDeleteSampleOption] = useState<'migrate' | 'delete'>('migrate');

  // Switch tab when initialTab changes
  React.useEffect(() => {
    if (isOpen && initialTab) {
      setActiveTab(initialTab);
    }
  }, [isOpen, initialTab]);

  // Reset target migration station if deletion modal opens
  React.useEffect(() => {
    if (stationToDelete) {
      const remaining = stations.filter(s => s.id !== stationToDelete.id);
      if (remaining.length > 0) {
        setTargetMigrationStationId(remaining[0].id);
      }
    }
  }, [stationToDelete, stations]);

  // Filtered stations
  const filteredStations = useMemo(() => {
    const q = stationSearchQuery.trim().toLowerCase();
    if (!q) return stations;
    return stations.filter(s => 
      s.name.toLowerCase().includes(q) ||
      s.code.toLowerCase().includes(q) ||
      (s.address && s.address.toLowerCase().includes(q)) ||
      (s.managerName && s.managerName.toLowerCase().includes(q)) ||
      (s.managerPhone && s.managerPhone.includes(q))
    );
  }, [stations, stationSearchQuery]);

  // Filtered users
  const filteredUsers = useMemo(() => {
    const q = userSearchQuery.trim().toLowerCase();
    if (!q) return users;
    return users.filter(u =>
      u.fullName.toLowerCase().includes(q) ||
      u.username.toLowerCase().includes(q) ||
      (u.phone && u.phone.includes(q)) ||
      (u.email && u.email.toLowerCase().includes(q))
    );
  }, [users, userSearchQuery]);

  if (!isOpen) return null;

  // ===================== STATION HANDLERS =====================

  const handleOpenAddStation = () => {
    setEditingStationId(null);
    setStationName('');
    setStationCode('');
    setStationAddress('');
    setStationCapacity('120 m³/h');
    setStationManager('');
    setStationPhone('');
    setStationHotline('');
    setShowAddStation(true);
  };

  const handleOpenEditStation = (station: Station) => {
    setEditingStationId(station.id);
    setStationName(station.name);
    setStationCode(station.code);
    setStationAddress(station.address || '');
    setStationCapacity(station.capacity || '120 m³/h');
    setStationManager(station.managerName || '');
    setStationPhone(station.managerPhone || '');
    setStationHotline(station.hotline || '');
    setShowAddStation(true);
  };

  const handleSaveStation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!stationName.trim() || !stationCode.trim()) {
      alert('Vui lòng nhập tên trạm và mã trạm trộn!');
      return;
    }

    const upperCode = stationCode.trim().toUpperCase();

    // Check duplicate code
    const isDuplicateCode = stations.some(s => 
      s.id !== editingStationId && s.code.toUpperCase() === upperCode
    );

    if (isDuplicateCode) {
      alert(`Mã trạm "${upperCode}" đã tồn tại trên hệ thống! Vui lòng chọn mã khác.`);
      return;
    }

    if (editingStationId) {
      // Update existing station
      const updated = stations.map(s => {
        if (s.id === editingStationId) {
          return {
            ...s,
            name: stationName.trim(),
            code: upperCode,
            address: stationAddress.trim(),
            capacity: stationCapacity.trim(),
            managerName: stationManager.trim(),
            managerPhone: stationPhone.trim(),
            hotline: stationHotline.trim() || undefined,
          };
        }
        return s;
      });

      onSaveStations(updated);
      setShowAddStation(false);
      setEditingStationId(null);
      alert(`Đã cập nhật thông tin trạm "${stationName.trim()}" thành công!`);
    } else {
      // Create new station
      const newStation: Station = {
        id: `sta_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
        name: stationName.trim(),
        code: upperCode,
        address: stationAddress.trim(),
        capacity: stationCapacity.trim(),
        managerName: stationManager.trim(),
        managerPhone: stationPhone.trim(),
        hotline: stationHotline.trim() || undefined,
        active: true,
      };

      onSaveStations([...stations, newStation]);
      setShowAddStation(false);
      alert(`Đã thêm trạm bê tông mới "${newStation.name}" thành công!`);
    }

    // Reset form fields
    setStationName('');
    setStationCode('');
    setStationAddress('');
    setStationCapacity('120 m³/h');
    setStationManager('');
    setStationPhone('');
    setStationHotline('');
  };

  const handleToggleStationActive = (stationId: string) => {
    const target = stations.find(s => s.id === stationId);
    if (!target) return;

    const updated = stations.map(s => {
      if (s.id === stationId) {
        const currentActive = s.active !== false;
        return { ...s, active: !currentActive };
      }
      return s;
    });

    onSaveStations(updated);
  };

  const handlePromptDeleteStation = (station: Station) => {
    if (stations.length <= 1) {
      alert('Không thể xóa trạm! Hệ thống bắt buộc phải duy trì tối thiểu 1 trạm bê tông hoạt động.');
      return;
    }

    // Check sample count associated with this station
    const associatedSamples = samples.filter(s => s.stationId === station.id);
    const associatedUsers = users.filter(u => u.stationId === station.id);

    setStationToDelete(station);
    setDeleteSampleOption('migrate');
    const remaining = stations.filter(s => s.id !== station.id);
    if (remaining.length > 0) {
      setTargetMigrationStationId(remaining[0].id);
    }
  };

  const handleConfirmDeleteStation = () => {
    if (!stationToDelete) return;

    const remainingStations = stations.filter(s => s.id !== stationToDelete.id);
    const newDefaultStationId = targetMigrationStationId || remainingStations[0]?.id || '';

    // 1. Handle Samples
    if (onSaveSamples && samples.length > 0) {
      let updatedSamples: ConcreteSample[];
      if (deleteSampleOption === 'migrate' && newDefaultStationId) {
        // Migrate samples to target station
        updatedSamples = samples.map(s => {
          if (s.stationId === stationToDelete.id) {
            return {
              ...s,
              stationId: newDefaultStationId,
              updatedAt: new Date().toISOString(),
            };
          }
          return s;
        });
      } else {
        // Delete all associated samples
        updatedSamples = samples.filter(s => s.stationId !== stationToDelete.id);
      }
      onSaveSamples(updatedSamples);
    }

    // 2. Handle Users assigned to deleted station
    const updatedUsers = users.map(u => {
      if (u.stationId === stationToDelete.id) {
        return {
          ...u,
          stationId: newDefaultStationId,
          stationIds: [newDefaultStationId],
        };
      }
      return u;
    });
    onSaveUsers(updatedUsers);

    // 3. Save Stations
    onSaveStations(remainingStations);

    const stationNameDeleted = stationToDelete.name;
    setStationToDelete(null);
    alert(`Đã xóa trạm "${stationNameDeleted}" khỏi hệ thống thành công!`);
  };

  // ===================== USER HANDLERS =====================

  const handleOpenAddUser = () => {
    setEditingUserId(null);
    setNewUsername('');
    setNewPassword('');
    setNewFullName('');
    setNewRole('member');
    setNewStationId(stations[0]?.id || '');
    setNewPhone('');
    setNewEmail('');
    setShowAddUser(true);
  };

  const handleOpenEditUser = (user: User) => {
    setEditingUserId(user.id);
    setNewUsername(user.username);
    setNewPassword(user.password || '');
    setNewFullName(user.fullName);
    setNewRole(user.role);
    setNewStationId(user.stationId || stations[0]?.id || '');
    setNewPhone(user.phone || '');
    setNewEmail(user.email || '');
    setShowAddUser(true);
  };

  const handleSaveUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUsername.trim() || !newFullName.trim()) {
      alert('Vui lòng điền tên đăng nhập và họ tên thành viên!');
      return;
    }

    const trimmedUser = newUsername.trim().toLowerCase();

    // Check duplicate username
    const isDuplicate = users.some(u => 
      u.id !== editingUserId && u.username.toLowerCase() === trimmedUser
    );

    if (isDuplicate) {
      alert(`Tên đăng nhập "${trimmedUser}" đã tồn tại! Vui lòng chọn tên đăng nhập khác.`);
      return;
    }

    if (editingUserId) {
      // Update existing user
      const updated = users.map(u => {
        if (u.id === editingUserId) {
          return {
            ...u,
            username: trimmedUser,
            password: newPassword.trim() || u.password,
            fullName: newFullName.trim(),
            role: newRole,
            stationIds: newRole === 'admin' ? ['all'] : [newStationId],
            stationId: newRole === 'admin' ? undefined : newStationId,
            phone: newPhone.trim(),
            email: newEmail.trim(),
          };
        }
        return u;
      });

      onSaveUsers(updated);
      setShowAddUser(false);
      setEditingUserId(null);
      alert(`Đã cập nhật tài khoản "${newFullName.trim()}" thành công!`);
    } else {
      // Create new user
      if (!newPassword.trim()) {
        alert('Vui lòng nhập mật khẩu cho tài khoản mới!');
        return;
      }

      const newUser: User = {
        id: `usr_${Date.now()}`,
        username: trimmedUser,
        password: newPassword.trim(),
        fullName: newFullName.trim(),
        role: newRole,
        stationIds: newRole === 'admin' ? ['all'] : [newStationId],
        stationId: newRole === 'admin' ? undefined : newStationId,
        phone: newPhone.trim(),
        email: newEmail.trim(),
        active: true,
        isActive: true,
        createdAt: new Date().toISOString().split('T')[0],
      };

      onSaveUsers([...users, newUser]);
      setShowAddUser(false);
      alert(`Đã tạo tài khoản thành viên "${newUser.fullName}" thành công!`);
    }

    setNewUsername('');
    setNewPassword('');
    setNewFullName('');
    setNewPhone('');
    setNewEmail('');
  };

  const handleToggleUserActive = (userId: string) => {
    const updated = users.map(u => {
      if (u.id === userId) {
        const isCurrentActive = u.active !== false && u.isActive !== false;
        if (u.role === 'admin' && users.filter(x => x.role === 'admin' && x.active !== false).length <= 1 && isCurrentActive) {
          alert('Không thể khóa tài khoản Admin duy nhất của hệ thống!');
          return u;
        }
        return { 
          ...u, 
          active: !isCurrentActive,
          isActive: !isCurrentActive
        };
      }
      return u;
    });
    onSaveUsers(updated);
  };

  const handleDeleteUser = (userId: string) => {
    const target = users.find(u => u.id === userId);
    if (target?.role === 'admin') {
      alert('Không thể xóa tài khoản Quản Trị Viên (Admin)!');
      return;
    }
    if (confirm(`Bạn có chắc chắn muốn xóa thành viên "${target?.fullName}" khỏi hệ thống?`)) {
      onSaveUsers(users.filter(u => u.id !== userId));
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
      <div 
        className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 my-6 flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-emerald-900 via-emerald-800 to-teal-900 text-white px-5 sm:px-6 py-4 flex items-center justify-between shadow-md shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 backdrop-blur-md flex items-center justify-center text-emerald-300 border border-white/20 shadow-inner">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="font-black text-base sm:text-lg tracking-tight">
                  Trung Tâm Quản Trị Admin Tasago
                </h3>
                <span className="bg-emerald-600/60 text-emerald-200 text-[10px] font-black uppercase px-2 py-0.5 rounded-full border border-emerald-400/30">
                  Admin Full Access
                </span>
              </div>
              <p className="text-xs text-emerald-200/90 mt-0.5">
                Quản lý thêm/sửa/xóa danh mục trạm trộn bê tông, phân quyền tài khoản KTV và quản trị viên
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-emerald-200 hover:text-white p-1.5 rounded-xl hover:bg-white/10 transition-colors cursor-pointer"
            title="Đóng cửa sổ"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Headers Navigation */}
        <div className="bg-slate-100 px-5 sm:px-6 pt-3 border-b border-slate-200 flex items-center justify-between shrink-0">
          <div className="flex space-x-3 text-xs font-bold">
            <button
              onClick={() => {
                setActiveTab('stations');
                setShowAddStation(false);
                setEditingStationId(null);
              }}
              className={`pb-3 px-3.5 flex items-center space-x-2 transition-all cursor-pointer relative ${
                activeTab === 'stations'
                  ? 'text-emerald-900 border-b-2 border-emerald-600 font-extrabold'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Building2 className="w-4 h-4 text-emerald-600" />
              <span>Quản Lý Trạm Bê Tông ({stations.length})</span>
            </button>

            <button
              onClick={() => {
                setActiveTab('users');
                setShowAddUser(false);
                setEditingUserId(null);
              }}
              className={`pb-3 px-3.5 flex items-center space-x-2 transition-all cursor-pointer relative ${
                activeTab === 'users'
                  ? 'text-emerald-900 border-b-2 border-emerald-600 font-extrabold'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Users className="w-4 h-4 text-teal-600" />
              <span>Tài Khoản & Phân Quyền ({users.length})</span>
            </button>
          </div>

          <div className="text-[11px] text-slate-500 hidden sm:flex items-center space-x-2 pb-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>Quyền hạn: <strong>Quản Trị Viên Toàn Quyền</strong></span>
          </div>
        </div>

        {/* MODAL BODY */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5 bg-slate-50/50">

          {/* ======================= TAB 1: STATIONS ======================= */}
          {activeTab === 'stations' && (
            <div className="space-y-4">
              
              {/* Header Action Bar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
                <div className="relative flex-1 max-w-md">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={stationSearchQuery}
                    onChange={(e) => setStationSearchQuery(e.target.value)}
                    placeholder="Tìm trạm theo tên, mã code (TSG-HP), địa chỉ, trưởng trạm..."
                    className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all"
                  />
                  {stationSearchQuery && (
                    <button 
                      onClick={() => setStationSearchQuery('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => {
                      if (showAddStation) {
                        setShowAddStation(false);
                        setEditingStationId(null);
                      } else {
                        handleOpenAddStation();
                      }
                    }}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-3.5 py-2 rounded-xl flex items-center space-x-1.5 shadow-sm transition-all active:scale-95 cursor-pointer whitespace-nowrap"
                  >
                    {showAddStation ? (
                      <>
                        <X className="w-4 h-4" />
                        <span>Đóng Form</span>
                      </>
                    ) : (
                      <>
                        <Plus className="w-4 h-4" />
                        <span>+ Thêm Trạm Trộn Mới</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Add / Edit Station Form Drawer */}
              {showAddStation && (
                <form 
                  onSubmit={handleSaveStation} 
                  className="bg-white p-4 sm:p-5 rounded-2xl border-2 border-emerald-500/40 shadow-lg space-y-4 animate-in fade-in zoom-in-95 duration-150 text-xs"
                >
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                    <div className="flex items-center space-x-2">
                      <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
                        <Building2 className="w-4 h-4" />
                      </div>
                      <h4 className="font-black text-slate-900 text-sm uppercase">
                        {editingStationId ? 'Chỉnh Sửa Thông Tin Trạm Trộn Bê Tông' : 'Thêm Mới Trạm Trộn Bê Tông Tasago'}
                      </h4>
                    </div>
                    <span className="text-[11px] text-slate-400">
                      * Các trường đánh dấu sao là bắt buộc
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                    <div className="sm:col-span-2">
                      <label className="block font-bold text-slate-700 mb-1">
                        Tên Trạm Trộn Bê Tông *
                      </label>
                      <input
                        type="text"
                        required
                        value={stationName}
                        onChange={(e) => setStationName(e.target.value)}
                        placeholder="vd: Trạm Tasago Nhơn Trạch (Đồng Nai)"
                        className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 focus:ring-2 focus:ring-emerald-500 focus:bg-white text-xs font-semibold text-slate-900"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 mb-1">
                        Mã Trạm (Code) *
                      </label>
                      <input
                        type="text"
                        required
                        value={stationCode}
                        onChange={(e) => setStationCode(e.target.value.toUpperCase())}
                        placeholder="vd: TSG-DN"
                        className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 focus:ring-2 focus:ring-emerald-500 focus:bg-white text-xs font-mono font-bold text-emerald-800 uppercase"
                      />
                      <p className="text-[10px] text-slate-400 mt-0.5">Mã viết tắt quản lý mẫu</p>
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block font-bold text-slate-700 mb-1">
                        Địa Chỉ Nhà Máy / Vị Trí Trạm
                      </label>
                      <input
                        type="text"
                        value={stationAddress}
                        onChange={(e) => setStationAddress(e.target.value)}
                        placeholder="vd: Đường Tôn Đức Thắng, KCN Nhơn Trạch 3, Tỉnh Đồng Nai"
                        className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 focus:ring-2 focus:ring-emerald-500 focus:bg-white text-xs text-slate-800"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 mb-1">
                        Công Suất Trạm (m³/h)
                      </label>
                      <input
                        type="text"
                        value={stationCapacity}
                        onChange={(e) => setStationCapacity(e.target.value)}
                        placeholder="vd: 120 m³/h hoặc 2x90 m³/h"
                        className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 focus:ring-2 focus:ring-emerald-500 focus:bg-white text-xs text-slate-800"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 mb-1">
                        Trưởng Trạm / Quản Lý Kỹ Thuật
                      </label>
                      <input
                        type="text"
                        value={stationManager}
                        onChange={(e) => setStationManager(e.target.value)}
                        placeholder="vd: Ks. Đỗ Anh Dũng"
                        className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 focus:ring-2 focus:ring-emerald-500 focus:bg-white text-xs text-slate-800 font-medium"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 mb-1">
                        Số Điện Thoại Trưởng Trạm
                      </label>
                      <input
                        type="text"
                        value={stationPhone}
                        onChange={(e) => setStationPhone(e.target.value)}
                        placeholder="vd: 0988.445.566"
                        className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 focus:ring-2 focus:ring-emerald-500 focus:bg-white text-xs text-slate-800"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 mb-1">
                        Hotline Điều Hành Trạm
                      </label>
                      <input
                        type="text"
                        value={stationHotline}
                        onChange={(e) => setStationHotline(e.target.value)}
                        placeholder="vd: 0251.3566.999"
                        className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 focus:ring-2 focus:ring-emerald-500 focus:bg-white text-xs text-slate-800"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => {
                        setShowAddStation(false);
                        setEditingStationId(null);
                      }}
                      className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold cursor-pointer transition-colors"
                    >
                      Hủy Bỏ
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black flex items-center space-x-1.5 shadow-md transition-all active:scale-95 cursor-pointer"
                    >
                      <Check className="w-4 h-4" />
                      <span>{editingStationId ? 'Lưu Thay Đổi Trạm' : 'Tạo Trạm Mới'}</span>
                    </button>
                  </div>
                </form>
              )}

              {/* Stations Grid Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredStations.map(station => {
                  const stationSamples = samples.filter(s => s.stationId === station.id);
                  const urgentSamples = stationSamples.filter(s => s.status === 'due_today' || s.status === 'overdue');
                  const assignedUsers = users.filter(u => u.stationId === station.id);
                  const isActive = station.active !== false;

                  return (
                    <div 
                      key={station.id}
                      className={`bg-white rounded-2xl p-4 sm:p-5 border transition-all duration-200 space-y-3.5 relative overflow-hidden ${
                        isActive 
                          ? 'border-slate-200 shadow-sm hover:shadow-md hover:border-emerald-300' 
                          : 'border-slate-200/80 bg-slate-100/60 opacity-80'
                      }`}
                    >
                      {/* Top Bar */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start space-x-3">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm shrink-0 shadow-inner ${
                            isActive ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-slate-200 text-slate-600'
                          }`}>
                            <Building2 className="w-5 h-5" />
                          </div>
                          <div>
                            <div className="flex items-center space-x-2">
                              <h4 className="font-black text-slate-900 text-sm sm:text-base leading-tight">
                                {station.name}
                              </h4>
                            </div>
                            <div className="flex items-center space-x-2 mt-1">
                              <span className="font-mono bg-emerald-100 text-emerald-900 font-extrabold px-2 py-0.5 rounded text-[11px] border border-emerald-200">
                                {station.code}
                              </span>
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                isActive ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-amber-100 text-amber-800'
                              }`}>
                                {isActive ? '● Đang Hoạt Động' : '○ Tạm Ngưng'}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Action Buttons for Station */}
                        <div className="flex items-center space-x-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleOpenEditStation(station)}
                            className="p-1.5 text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                            title="Chỉnh sửa thông tin trạm"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          
                          <button
                            type="button"
                            onClick={() => handleToggleStationActive(station.id)}
                            className={`px-2 py-1 text-[11px] font-bold rounded-lg transition-colors cursor-pointer ${
                              isActive ? 'text-slate-600 hover:bg-slate-100' : 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100'
                            }`}
                            title={isActive ? 'Tạm dừng trạm' : 'Kích hoạt lại trạm'}
                          >
                            {isActive ? 'Tạm Ngưng' : 'Mở Lại'}
                          </button>

                          <button
                            type="button"
                            onClick={() => handlePromptDeleteStation(station)}
                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                            title="Xóa trạm trộn"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* Station Details */}
                      <div className="space-y-1.5 text-xs text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                        {station.address && (
                          <div className="flex items-start space-x-1.5">
                            <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                            <span className="line-clamp-2">{station.address}</span>
                          </div>
                        )}
                        
                        <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-200/60 text-[11px]">
                          <div className="flex items-center space-x-1">
                            <span className="text-slate-400">Công suất:</span>
                            <strong className="text-slate-800">{station.capacity || '120 m³/h'}</strong>
                          </div>
                          
                          <div className="flex items-center space-x-1">
                            <span className="text-slate-400">QL / Hotline:</span>
                            <strong className="text-slate-800">
                              {station.managerName || 'Chưa cập nhật'} {station.managerPhone ? `(${station.managerPhone})` : ''}
                            </strong>
                          </div>
                        </div>
                      </div>

                      {/* Station Metrics */}
                      <div className="grid grid-cols-3 gap-2 pt-1 text-center">
                        <div className="bg-emerald-50/60 border border-emerald-100 p-2 rounded-xl">
                          <p className="text-[10px] text-emerald-800 font-bold uppercase">Tổng Mẫu</p>
                          <p className="text-base font-black text-emerald-950">{stationSamples.length}</p>
                        </div>

                        <div className={`p-2 rounded-xl border ${
                          urgentSamples.length > 0 ? 'bg-amber-50 border-amber-200' : 'bg-slate-50 border-slate-200'
                        }`}>
                          <p className="text-[10px] text-slate-600 font-bold uppercase">Cần Nén</p>
                          <p className={`text-base font-black ${urgentSamples.length > 0 ? 'text-amber-700' : 'text-slate-700'}`}>
                            {urgentSamples.length}
                          </p>
                        </div>

                        <div className="bg-slate-50 border border-slate-200 p-2 rounded-xl">
                          <p className="text-[10px] text-slate-600 font-bold uppercase">KTV Trạm</p>
                          <p className="text-base font-black text-slate-800">{assignedUsers.length}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {filteredStations.length === 0 && (
                <div className="text-center py-8 bg-white rounded-2xl border border-slate-200 space-y-2">
                  <Building2 className="w-8 h-8 text-slate-300 mx-auto" />
                  <p className="text-sm font-bold text-slate-600">Không tìm thấy trạm trộn phù hợp từ khóa</p>
                  <button
                    onClick={() => setStationSearchQuery('')}
                    className="text-xs text-emerald-700 font-bold hover:underline"
                  >
                    Xóa bộ lọc tìm kiếm
                  </button>
                </div>
              )}

            </div>
          )}

          {/* ======================= TAB 2: USERS ======================= */}
          {activeTab === 'users' && (
            <div className="space-y-4">
              
              {/* Header Action Bar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
                <div className="relative flex-1 max-w-md">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={userSearchQuery}
                    onChange={(e) => setUserSearchQuery(e.target.value)}
                    placeholder="Tìm theo họ tên, username, số điện thoại, email..."
                    className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all"
                  />
                  {userSearchQuery && (
                    <button 
                      onClick={() => setUserSearchQuery('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => {
                    if (showAddUser) {
                      setShowAddUser(false);
                      setEditingUserId(null);
                    } else {
                      handleOpenAddUser();
                    }
                  }}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-3.5 py-2 rounded-xl flex items-center space-x-1.5 shadow-sm transition-all active:scale-95 cursor-pointer whitespace-nowrap"
                >
                  {showAddUser ? (
                    <>
                      <X className="w-4 h-4" />
                      <span>Đóng Form</span>
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-4 h-4" />
                      <span>+ Thêm Thành Viên Mới</span>
                    </>
                  )}
                </button>
              </div>

              {/* Add / Edit User Form Drawer */}
              {showAddUser && (
                <form 
                  onSubmit={handleSaveUser} 
                  className="bg-white p-4 sm:p-5 rounded-2xl border-2 border-emerald-500/40 shadow-lg space-y-4 animate-in fade-in zoom-in-95 duration-150 text-xs"
                >
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                    <div className="flex items-center space-x-2">
                      <div className="w-7 h-7 rounded-lg bg-teal-100 text-teal-800 flex items-center justify-center font-bold">
                        <Users className="w-4 h-4" />
                      </div>
                      <h4 className="font-black text-slate-900 text-sm uppercase">
                        {editingUserId ? 'Chỉnh Sửa Thông Tin & Phân Quyền Thành Viên' : 'Tạo Tài Khoản Thành Viên / Kỹ Thuật Viên Mới'}
                      </h4>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Tên Đăng Nhập (Username) *</label>
                      <input
                        type="text"
                        required
                        value={newUsername}
                        onChange={(e) => setNewUsername(e.target.value)}
                        placeholder="vd: ktv_nhontrach"
                        className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 focus:ring-2 focus:ring-emerald-500 focus:bg-white text-xs font-mono font-bold text-slate-900"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 mb-1">
                        {editingUserId ? 'Mật Khẩu Mới (Bỏ trống nếu giữ nguyên)' : 'Mật Khẩu Đăng Nhập *'}
                      </label>
                      <input
                        type="text"
                        required={!editingUserId}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder={editingUserId ? 'Nhập nếu muốn đổi pass...' : 'vd: Tsg@2026'}
                        className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 focus:ring-2 focus:ring-emerald-500 focus:bg-white text-xs font-mono text-slate-900"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Họ Và Tên Cán Bộ *</label>
                      <input
                        type="text"
                        required
                        value={newFullName}
                        onChange={(e) => setNewFullName(e.target.value)}
                        placeholder="vd: Nguyễn Văn Thành"
                        className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 focus:ring-2 focus:ring-emerald-500 focus:bg-white text-xs font-semibold text-slate-900"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Phân Quyền Hệ Thống</label>
                      <select
                        value={newRole}
                        onChange={(e) => setNewRole(e.target.value as any)}
                        className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 focus:ring-2 focus:ring-emerald-500 focus:bg-white text-xs font-bold text-slate-900"
                      >
                        <option value="member">Thành Viên (KTV Trạm / Lab)</option>
                        <option value="admin">Quản Trị Viên (Admin Tasago - Toàn Quyền)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Trạm Trộn Phụ Trách</label>
                      <select
                        value={newStationId}
                        onChange={(e) => setNewStationId(e.target.value)}
                        disabled={newRole === 'admin'}
                        className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 focus:ring-2 focus:ring-emerald-500 focus:bg-white text-xs text-slate-900 disabled:opacity-50"
                      >
                        {stations.map(s => (
                          <option key={s.id} value={s.id}>
                            {s.name} ({s.code})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Số Điện Thoại Liên Hệ</label>
                      <input
                        type="text"
                        value={newPhone}
                        onChange={(e) => setNewPhone(e.target.value)}
                        placeholder="09xx..."
                        className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 focus:ring-2 focus:ring-emerald-500 focus:bg-white text-xs text-slate-900"
                      />
                    </div>

                    <div className="sm:col-span-3">
                      <label className="block font-bold text-slate-700 mb-1">Email Nhận Báo Cáo / Zalo ID</label>
                      <input
                        type="text"
                        value={newEmail}
                        onChange={(e) => setNewEmail(e.target.value)}
                        placeholder="vd: thanh.nhontrach@tasago.vn"
                        className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 focus:ring-2 focus:ring-emerald-500 focus:bg-white text-xs text-slate-900"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => {
                        setShowAddUser(false);
                        setEditingUserId(null);
                      }}
                      className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold cursor-pointer transition-colors"
                    >
                      Hủy Bỏ
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black flex items-center space-x-1.5 shadow-md transition-all active:scale-95 cursor-pointer"
                    >
                      <Check className="w-4 h-4" />
                      <span>{editingUserId ? 'Lưu Thông Tin' : 'Tạo Tài Khoản'}</span>
                    </button>
                  </div>
                </form>
              )}

              {/* Users List Table / Cards */}
              <div className="space-y-2.5">
                {filteredUsers.map(u => {
                  const userStation = stations.find(s => s.id === u.stationId);
                  const isUserActive = u.active !== false && u.isActive !== false;

                  return (
                    <div 
                      key={u.id}
                      className={`bg-white p-4 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs ${
                        isUserActive ? 'border-slate-200 shadow-xs hover:border-emerald-300' : 'border-slate-200 bg-slate-100/70 opacity-75'
                      }`}
                    >
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-black text-slate-900 text-sm">{u.fullName}</span>
                          <span className="font-mono text-slate-500 text-[11px] bg-slate-100 px-1.5 py-0.5 rounded">
                            @{u.username}
                          </span>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                            u.role === 'admin' 
                              ? 'bg-purple-100 text-purple-800 border border-purple-200' 
                              : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                          }`}>
                            {u.role === 'admin' ? 'Quản Trị Viên (Admin)' : 'Kỹ Thuật Viên'}
                          </span>
                          {!isUserActive && (
                            <span className="bg-red-100 text-red-800 px-2 py-0.5 rounded-full text-[10px] font-bold border border-red-200">
                              Đã Tạm Khóa
                            </span>
                          )}
                        </div>

                        <div className="text-slate-500 text-[11px] flex flex-wrap items-center gap-x-4 gap-y-1 pt-0.5">
                          <span className="flex items-center space-x-1">
                            <Building2 className="w-3 h-3 text-slate-400" />
                            <span>Trạm: <strong>{u.role === 'admin' ? 'Toàn bộ hệ thống Tasago' : userStation?.name || 'Chưa gán'}</strong></span>
                          </span>
                          {u.phone && (
                            <span className="flex items-center space-x-1">
                              <Phone className="w-3 h-3 text-slate-400" />
                              <span>SĐT: <strong>{u.phone}</strong></span>
                            </span>
                          )}
                          {u.email && (
                            <span className="flex items-center space-x-1">
                              <Mail className="w-3 h-3 text-slate-400" />
                              <span>Email: {u.email}</span>
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center space-x-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleOpenEditUser(u)}
                          className="p-1.5 text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                          title="Sửa thông tin tài khoản"
                        >
                          <Edit className="w-4 h-4" />
                        </button>

                        <button
                          type="button"
                          onClick={() => handleToggleUserActive(u.id)}
                          className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                            isUserActive 
                              ? 'bg-slate-100 hover:bg-slate-200 text-slate-700' 
                              : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs'
                          }`}
                        >
                          {isUserActive ? 'Khóa' : 'Mở Khóa'}
                        </button>

                        {u.role !== 'admin' && (
                          <button
                            type="button"
                            onClick={() => handleDeleteUser(u.id)}
                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                            title="Xóa tài khoản thành viên"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="bg-slate-100 px-5 sm:px-6 py-3 border-t border-slate-200 flex flex-col sm:flex-row justify-between items-center text-xs text-slate-500 gap-2 shrink-0">
          <div className="flex items-center space-x-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Mọi thay đổi về trạm & người dùng sẽ được lưu tự động trên hệ thống.</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-bold transition-colors cursor-pointer"
          >
            Đóng Cửa Sổ
          </button>
        </div>

      </div>

      {/* SAFE STATION DELETION DIALOG MODAL */}
      {stationToDelete && (
        <div className="fixed inset-0 z-60 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border-2 border-red-500 max-w-lg w-full p-5 sm:p-6 space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-start space-x-3 text-red-700">
              <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <h3 className="font-black text-base text-slate-900">
                  Xác Nhận Xóa Trạm Bê Tông: {stationToDelete.name}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Mã trạm: <strong className="font-mono text-emerald-800">{stationToDelete.code}</strong>
                </p>
              </div>
            </div>

            {/* Assessment info */}
            {(() => {
              const count = samples.filter(s => s.stationId === stationToDelete.id).length;
              const remaining = stations.filter(s => s.id !== stationToDelete.id);

              return (
                <div className="space-y-3 text-xs">
                  <div className="bg-amber-50 border border-amber-200 p-3 rounded-xl text-slate-700 space-y-1">
                    <p className="font-bold text-amber-900 flex items-center space-x-1">
                      <AlertCircle className="w-4 h-4 text-amber-600" />
                      <span>Cảnh báo dữ liệu liên kết:</span>
                    </p>
                    <p>
                      Trạm này hiện đang lưu giữ <strong className="text-red-700">{count} mẫu bê tông</strong> và có cán bộ kỹ thuật được gán quyền.
                    </p>
                  </div>

                  {count > 0 && (
                    <div className="space-y-2 bg-slate-50 p-3 rounded-xl border border-slate-200">
                      <p className="font-bold text-slate-800">Chọn phương án xử lý {count} mẫu bê tông hiện có:</p>
                      
                      <label className="flex items-start space-x-2 cursor-pointer">
                        <input
                          type="radio"
                          name="sampleMigrationOption"
                          value="migrate"
                          checked={deleteSampleOption === 'migrate'}
                          onChange={() => setDeleteSampleOption('migrate')}
                          className="mt-0.5 text-emerald-600"
                        />
                        <div>
                          <span className="font-bold text-slate-800">
                            Chuyển toàn bộ {count} mẫu sang trạm khác (Khuyên dùng)
                          </span>
                          {deleteSampleOption === 'migrate' && (
                            <select
                              value={targetMigrationStationId}
                              onChange={(e) => setTargetMigrationStationId(e.target.value)}
                              className="mt-1.5 w-full bg-white border border-slate-300 rounded-lg p-1.5 text-xs font-semibold"
                            >
                              {remaining.map(r => (
                                <option key={r.id} value={r.id}>
                                  Chuyển sang: {r.name} ({r.code})
                                </option>
                              ))}
                            </select>
                          )}
                        </div>
                      </label>

                      <label className="flex items-start space-x-2 cursor-pointer pt-1 border-t border-slate-200">
                        <input
                          type="radio"
                          name="sampleMigrationOption"
                          value="delete"
                          checked={deleteSampleOption === 'delete'}
                          onChange={() => setDeleteSampleOption('delete')}
                          className="mt-0.5 text-red-600"
                        />
                        <span className="font-bold text-red-700">
                          Xóa vĩnh viễn toàn bộ {count} mẫu bê tông của trạm này
                        </span>
                      </label>
                    </div>
                  )}

                  <div className="flex justify-end space-x-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setStationToDelete(null)}
                      className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold transition-colors cursor-pointer"
                    >
                      Hủy Bỏ
                    </button>
                    <button
                      type="button"
                      onClick={handleConfirmDeleteStation}
                      className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-black shadow-md transition-all active:scale-95 cursor-pointer"
                    >
                      Xác Nhận Xóa Trạm
                    </button>
                  </div>
                </div>
              );
            })()}

          </div>
        </div>
      )}

    </div>
  );
};

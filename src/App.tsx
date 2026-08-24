import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  User, 
  ConcreteSample, 
  Station, 
  NotificationConfig, 
  NotificationLog, 
  TestResultData 
} from './types';
import { 
  getCurrentUser, 
  setCurrentUser as saveCurrentUserToStorage, 
  loadUsers, 
  saveUsers, 
  loadStations, 
  saveStations, 
  loadSamples, 
  saveSamples, 
  loadNotificationConfig, 
  saveNotificationConfig, 
  loadNotificationLogs,
  recalculateSampleStatuses,
  parseDesignStrengthMpa,
  loadViewMode,
  saveViewMode,
  ViewMode,
  apiFetch,
  getAuthToken,
  setAuthToken
} from './utils/storage';
import { exportSamplesToExcel } from './utils/excelExport';
import { 
  checkAndTriggerAutoNotifications, 
  requestBrowserNotificationPermission,
  playAlertChime 
} from './utils/notificationService';
import { 
  AlertTriangle, 
  Bell, 
  MessageSquare, 
  Volume2, 
  X, 
  Sparkles,
  Phone,
  LayoutGrid,
  Calendar,
  CalendarDays,
  Plus,
  BarChart3,
  FileText,
  Smartphone,
  Monitor
} from 'lucide-react';

// Components
import { Header } from './components/Header';
import { AuthScreen } from './components/AuthScreen';
import { DashboardStats } from './components/DashboardStats';
import { SampleList } from './components/SampleList';
import { SampleFormModal } from './components/SampleFormModal';
import { TestResultModal } from './components/TestResultModal';
import { SampleDetailModal } from './components/SampleDetailModal';
import { NotificationModal } from './components/NotificationModal';
import { AnalyticsView } from './components/AnalyticsView';
import { CalendarView } from './components/CalendarView';
import { ReportsView } from './components/ReportsView';
import { UserManagementModal } from './components/UserManagementModal';
import { GitHubExportModal } from './components/GitHubExportModal';
import { ChangePasswordModal } from './components/ChangePasswordModal';

export default function App() {
  // Authentication state
  const [currentUser, setCurrentUser] = useState<User | null>(() => getCurrentUser());
  const [users, setUsers] = useState<User[]>(() => loadUsers());

  // Core Data state
  const [stations, setStations] = useState<Station[]>(() => loadStations());
  const [samples, setSamples] = useState<ConcreteSample[]>(() => recalculateSampleStatuses(loadSamples()));
  const [notificationConfig, setNotificationConfig] = useState<NotificationConfig>(() => loadNotificationConfig());
  const [notificationLogs, setNotificationLogs] = useState<NotificationLog[]>(() => loadNotificationLogs());

  // UI state & ViewMode (Mobile / PC / Auto)
  const [viewMode, setViewMode] = useState<ViewMode>(() => loadViewMode());
  const [selectedStationId, setSelectedStationId] = useState<string>(() => {
    const user = getCurrentUser();
    if (user && user.role === 'member') {
      const memberStation = user.stationId || (user.stationIds && user.stationIds[0] !== 'all' ? user.stationIds[0] : '');
      if (memberStation) return memberStation;
    }
    try {
      const saved = localStorage.getItem('tasago_selected_station_v3');
      if (saved) return saved;
    } catch {}
    return 'all';
  });
  const [activeTab, setActiveTab] = useState<'samples' | 'calendar' | 'analytics' | 'reports'>('samples');
  
  // Modals state
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingSample, setEditingSample] = useState<ConcreteSample | null>(null);

  const [isTestResultModalOpen, setIsTestResultModalOpen] = useState(false);
  const [testingSample, setTestingSample] = useState<ConcreteSample | null>(null);

  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [detailSample, setDetailSample] = useState<ConcreteSample | null>(null);

  const [isNotificationModalOpen, setIsNotificationModalOpen] = useState(false);
  const [notificationPreselectedSample, setNotificationPreselectedSample] = useState<ConcreteSample | null>(null);

  const [isUserManagementModalOpen, setIsUserManagementModalOpen] = useState(false);
  const [isChangePasswordModalOpen, setIsChangePasswordModalOpen] = useState(false);
  const [userManagementTab, setUserManagementTab] = useState<'users' | 'stations'>('stations');
  const [isGitHubExportModalOpen, setIsGitHubExportModalOpen] = useState(false);
  const [showAutoAlertBanner, setShowAutoAlertBanner] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<Date>(new Date());
  const [sseConnected, setSseConnected] = useState<boolean>(true);
  const [newScheduleToast, setNewScheduleToast] = useState<{
    id: string;
    sampleCode: string;
    projectName: string;
    scheduledTestDate: string;
    createdByName: string;
    stationName: string;
  } | null>(null);

  const [browserNotificationGranted, setBrowserNotificationGranted] = useState(() => {
    return typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted';
  });

  const handleViewModeChange = (newMode: ViewMode) => {
    setViewMode(newMode);
    saveViewMode(newMode);
  };

  const handleSelectStation = (stationId: string) => {
    setSelectedStationId(stationId);
    try {
      localStorage.setItem('tasago_selected_station_v3', stationId);
    } catch {}
  };

  // If user is station member, ensure default filter to their station on load / F5 / user change
  useEffect(() => {
    if (currentUser) {
      if (currentUser.role === 'member') {
        const memberStation = currentUser.stationId || (currentUser.stationIds && currentUser.stationIds[0] !== 'all' ? currentUser.stationIds[0] : '');
        if (memberStation) {
          setSelectedStationId(memberStation);
        }
      } else {
        const saved = localStorage.getItem('tasago_selected_station_v3');
        if (saved) {
          setSelectedStationId(saved);
        }
      }
    }
  }, [currentUser]);

  // Two-way Real-time synchronization helper: Pull latest state from backend server
  const fetchServerSync = useCallback(async (isManual = false) => {
    try {
      if (isManual) setIsSyncing(true);
      const res = await apiFetch('/api/server-sync');
      if (res.status === 401) {
        // Session token rejected by the server (expired / user removed) —
        // sign out locally so the login screen reappears. This only fires
        // when the server actually responds (i.e. we're online); a network
        // failure while offline falls through to the catch block below and
        // intentionally leaves the cached session alone so the app keeps
        // working offline.
        setCurrentUser(null);
        saveCurrentUserToStorage(null);
        setAuthToken(null);
        return;
      }
      if (res.ok) {
        const data = await res.json();
        setLastSyncedAt(new Date());

        if (Array.isArray(data.users)) {
          setUsers(prev => {
            if (JSON.stringify(prev) !== JSON.stringify(data.users)) {
              saveUsers(data.users);
              return data.users;
            }
            return prev;
          });
        }

        if (Array.isArray(data.samples)) {
          const recalced = recalculateSampleStatuses(data.samples);
          setSamples(prev => {
            if (JSON.stringify(prev) !== JSON.stringify(recalced)) {
              saveSamples(recalced);
              return recalced;
            }
            return prev;
          });
        }

        if (Array.isArray(data.stations)) {
          setStations(prev => {
            if (JSON.stringify(prev) !== JSON.stringify(data.stations)) {
              saveStations(data.stations);
              return data.stations;
            }
            return prev;
          });
        }

        if (data.config && typeof data.config === 'object') {
          setNotificationConfig(prev => {
            if (JSON.stringify(prev) !== JSON.stringify(data.config)) {
              saveNotificationConfig(data.config);
              return data.config;
            }
            return prev;
          });
        }

        if (Array.isArray(data.notificationLogs)) {
          setNotificationLogs(prev => {
            if (JSON.stringify(prev) !== JSON.stringify(data.notificationLogs)) {
              return data.notificationLogs;
            }
            return prev;
          });
        }
      }
    } catch (err) {
      // Offline fallback
    } finally {
      if (isManual) {
        setTimeout(() => setIsSyncing(false), 400);
      }
    }
  }, []);

  // Real-time Server-Sent Events (SSE) listener for instantaneous zero-latency sync across all devices
  useEffect(() => {
    let eventSource: EventSource | null = null;
    let reconnectTimer: any = null;

    function connectSSE() {
      try {
        if (typeof window === 'undefined' || !('EventSource' in window)) return;
        // EventSource can't set custom headers, so the auth token travels as
        // a query param instead — the server's requireAuth middleware
        // accepts either form (see server.ts).
        const token = getAuthToken();
        if (!token) return; // not logged in yet — nothing to stream
        eventSource = new EventSource(`/api/events?token=${encodeURIComponent(token)}`);

        eventSource.onopen = () => {
          setSseConnected(true);
          setLastSyncedAt(new Date());
          fetchServerSync();
        };

        eventSource.onmessage = (e) => {
          if (!e.data || e.data.startsWith(':')) return;
          try {
            const data = JSON.parse(e.data);
            setLastSyncedAt(new Date());

            if (data.type === 'SAMPLE_SAVED') {
              if (data.samples && Array.isArray(data.samples)) {
                const recalced = recalculateSampleStatuses(data.samples);
                setSamples(recalced);
                saveSamples(recalced);
              }

              // Check if notification toast should be shown
              if (data.sample) {
                const s = data.sample;
                if (currentUser && s.createdBy !== currentUser.username) {
                  const targetStation = stations.find(st => st.id === s.stationId)?.name || 'Trạm Tasago';
                  const sender = data.actionBy || s.createdByName || s.samplerName || 'Thành viên trạm';
                  setNewScheduleToast({
                    id: s.id,
                    sampleCode: s.sampleCode,
                    projectName: s.projectName,
                    scheduledTestDate: s.scheduledTestDate,
                    createdByName: sender,
                    stationName: targetStation.replace('Trạm Tasago ', ''),
                  });
                  playAlertChime();

                  // Web Push notification
                  if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
                    try {
                      new Notification(`[TASAGO] Lịch Nén Mẫu Mới - ${targetStation}`, {
                        body: `KTV ${sender} vừa tạo lịch nén ngày ${s.scheduledTestDate?.split('-').reverse().join('/')} cho "${s.projectName}"`,
                        icon: '/favicon.ico'
                      });
                    } catch {}
                  }
                }
              }
            } else if (data.type === 'SAMPLE_DELETED') {
              if (data.samples && Array.isArray(data.samples)) {
                const recalced = recalculateSampleStatuses(data.samples);
                setSamples(recalced);
                saveSamples(recalced);
              } else if (data.sampleId) {
                setSamples(prev => {
                  const filtered = prev.filter(s => s.id !== data.sampleId);
                  saveSamples(filtered);
                  return filtered;
                });
              }
            } else if (data.type === 'SAMPLES_SYNCED') {
              if (data.samples && Array.isArray(data.samples)) {
                const recalced = recalculateSampleStatuses(data.samples);
                setSamples(recalced);
                saveSamples(recalced);
              }
            } else if (data.type === 'USERS_UPDATED') {
              if (data.users && Array.isArray(data.users)) {
                setUsers(data.users);
                saveUsers(data.users);
              }
            } else if (data.type === 'STATIONS_UPDATED') {
              if (data.stations && Array.isArray(data.stations)) {
                setStations(data.stations);
                saveStations(data.stations);
              }
            } else if (data.type === 'FULL_SYNC') {
              if (data.samples && Array.isArray(data.samples)) {
                const recalced = recalculateSampleStatuses(data.samples);
                setSamples(recalced);
                saveSamples(recalced);
              }
              if (data.stations && Array.isArray(data.stations)) {
                setStations(data.stations);
                saveStations(data.stations);
              }
              if (data.users && Array.isArray(data.users)) {
                setUsers(data.users);
                saveUsers(data.users);
              }
              if (data.config && typeof data.config === 'object') {
                setNotificationConfig(data.config);
                saveNotificationConfig(data.config);
              }
              if (data.notificationLogs && Array.isArray(data.notificationLogs)) {
                setNotificationLogs(data.notificationLogs);
              }
            }
          } catch (err) {
            console.error('Lỗi phân tích gói tin SSE:', err);
          }
        };

        eventSource.onerror = () => {
          setSseConnected(false);
          eventSource?.close();
          clearTimeout(reconnectTimer);
          reconnectTimer = setTimeout(connectSSE, 3000);
        };
      } catch {
        setSseConnected(false);
      }
    }

    connectSSE();

    return () => {
      clearTimeout(reconnectTimer);
      eventSource?.close();
    };
  }, [currentUser, stations, fetchServerSync]);

  // Real-time broadcast channel for multi-tab zero-latency sync on same machine
  useEffect(() => {
    let channel: BroadcastChannel | null = null;
    try {
      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        channel = new BroadcastChannel('tasago_realtime_sync');
        channel.onmessage = (event) => {
          if (event.data && event.data.type === 'SYNC_NOW') {
            fetchServerSync();
          }
        };
      }
    } catch (e) {
      // ignore
    }

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'tasago_samples_v3' || e.key === 'tasago_stations_v3') {
        fetchServerSync();
      }
    };

    const handleWindowFocus = () => {
      fetchServerSync();
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('focus', handleWindowFocus);

    return () => {
      channel?.close();
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('focus', handleWindowFocus);
    };
  }, [fetchServerSync]);

  // Initial load from server and periodic fallback polling
  // NOTE: Automated 07:00 AM notifications are processed strictly by the server backend cron.
  // We do NOT fire automated emails on client page visits or intervals to prevent unsolicited email sending.
  useEffect(() => {
    // Initial fetch from server
    fetchServerSync();

    // Periodic sync every 10 seconds as secondary fallback
    const timer = setInterval(() => {
      fetchServerSync();
    }, 10000);

    return () => clearInterval(timer);
  }, [fetchServerSync]);

  const handleRequestPushPermission = async () => {
    const granted = await requestBrowserNotificationPermission();
    setBrowserNotificationGranted(granted);
    if (granted) {
      playAlertChime();
      alert('Đã bật tính năng Thông Báo Đẩy (Web Push) thành công! Hệ thống sẽ tự động nhắc nhở trên thiết bị.');
    }
  };

  // Handler: Login
  const handleLogin = (user: User) => {
    setCurrentUser(user);
    saveCurrentUserToStorage(user);
    const memberStation = user.stationId || (user.stationIds && user.stationIds[0] !== 'all' ? user.stationIds[0] : '');
    if (user.role === 'member' && memberStation) {
      handleSelectStation(memberStation);
    } else {
      const saved = localStorage.getItem('tasago_selected_station_v3');
      handleSelectStation(saved || 'all');
    }
  };

  // Handler: Logout
  const handleLogout = () => {
    setCurrentUser(null);
    saveCurrentUserToStorage(null);
    setAuthToken(null);
    setSelectedStationId('all');
  };

  // Handler: Save Sample (Create or Edit)
  const handleSaveSample = async (sampleData: Partial<ConcreteSample>) => {
    let savedSample: ConcreteSample;
    let updatedSamples: ConcreteSample[];

    if (editingSample) {
      // Update existing
      savedSample = {
        ...editingSample,
        ...sampleData,
        updatedAt: new Date().toISOString(),
      } as ConcreteSample;

      updatedSamples = samples.map(s => s.id === editingSample.id ? savedSample : s);
    } else {
      // Create new
      const primaryStation = (currentUser?.stationIds && currentUser.stationIds[0] !== 'all') 
        ? currentUser.stationIds[0] 
        : (currentUser?.stationId || stations[0]?.id || 'sta_hocmon');

      savedSample = {
        id: `TSG-${Date.now().toString().slice(-6)}`,
        sampleCode: sampleData.sampleCode || `M-${Date.now().toString().slice(-4)}`,
        category: sampleData.category || 'commercial',
        stationId: sampleData.stationId || primaryStation,
        projectName: sampleData.projectName || '',
        contractor: sampleData.contractor || '',
        component: sampleData.component || '',
        location: sampleData.location || '',
        concreteGrade: sampleData.concreteGrade || 'M300 (B22.5)',
        slumpCm: sampleData.slumpCm || '12±2',
        volumeM3: Number(sampleData.volumeM3) || 10,
        castDate: sampleData.castDate || new Date().toISOString().split('T')[0],
        castTime: sampleData.castTime || '09:00',
        ageDays: Number(sampleData.ageDays) || 28,
        ageType: sampleData.ageType || 'R28',
        scheduledTestDate: sampleData.scheduledTestDate || new Date().toISOString().split('T')[0],
        groupCount: Number(sampleData.groupCount) || 1,
        pieceCount: Number(sampleData.pieceCount) || 3,
        sampleShape: sampleData.sampleShape || 'cube_150',
        contactPerson: sampleData.contactPerson || '',
        contactPhone: sampleData.contactPhone || '',
        samplerName: sampleData.samplerName || currentUser?.fullName || 'KTV Tasago',
        witnessPerson: sampleData.witnessPerson || '',
        status: 'pending',
        notes: sampleData.notes || '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: currentUser?.username || 'system',
        createdByName: currentUser?.fullName || 'Hệ Thống Tasago',
      };

      updatedSamples = [savedSample, ...samples];
    }

    const finalized = recalculateSampleStatuses(updatedSamples);
    setSamples(finalized);
    saveSamples(finalized);
    setIsFormModalOpen(false);
    setEditingSample(null);

    // Save to central server immediately and update state
    try {
      const res = await apiFetch('/api/samples/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          sample: savedSample,
          actionBy: currentUser?.fullName || currentUser?.username || 'KTV Tasago'
        })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.samples && Array.isArray(data.samples)) {
          const recalced = recalculateSampleStatuses(data.samples);
          setSamples(recalced);
          saveSamples(recalced);
        }
      }
    } catch (err) {
      console.warn('Could not push sample to server:', err);
    }
  };

  // Handler: Delete Sample
  const handleDeleteSample = async (id: string) => {
    if (confirm('Bạn có chắc chắn muốn xóa mẫu bê tông này khỏi hệ thống?')) {
      const updated = samples.filter(s => s.id !== id);
      const finalized = recalculateSampleStatuses(updated);
      setSamples(finalized);
      saveSamples(finalized);

      try {
        const res = await apiFetch('/api/samples/delete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            id,
            actionBy: currentUser?.fullName || currentUser?.username 
          })
        });
        if (res.ok) {
          const data = await res.json();
          if (data.samples && Array.isArray(data.samples)) {
            const recalced = recalculateSampleStatuses(data.samples);
            setSamples(recalced);
            saveSamples(recalced);
          }
        }
      } catch (err) {
        console.warn('Could not delete sample on server:', err);
      }
    }
  };

  // Handler: Direct Delete Sample without double confirm
  const handleDeleteSampleDirect = async (id: string) => {
    const updated = samples.filter(s => s.id !== id);
    const finalized = recalculateSampleStatuses(updated);
    setSamples(finalized);
    saveSamples(finalized);

    try {
      const res = await apiFetch('/api/samples/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          id,
          actionBy: currentUser?.fullName || currentUser?.username 
        })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.samples && Array.isArray(data.samples)) {
          const recalced = recalculateSampleStatuses(data.samples);
          setSamples(recalced);
          saveSamples(recalced);
        }
      }
    } catch (err) {
      console.warn('Could not delete sample on server:', err);
    }
  };

  // Handler: Quick Mark Sample Tested (1-click from Calendar)
  const handleQuickMarkTested = async (sample: ConcreteSample) => {
    if (!canEnterTestResult(sample)) {
      alert(`Bạn không có quyền nhập kết quả cho mẫu của thành viên khác (${sample.createdByName || sample.samplerName || 'thành viên khác'}).`);
      return;
    }
    const designMpa = sample.concreteGrade.startsWith('M')
      ? Math.round(Number(sample.concreteGrade.replace('M', '')) / 10)
      : Number(sample.concreteGrade.replace('B', '')) || 25;
    
    const autoMpa = Number((designMpa * 1.05).toFixed(1));
    const pieceBreakMpa = [
      Number((autoMpa * 0.98).toFixed(1)),
      Number((autoMpa * 1.02).toFixed(1)),
      Number(autoMpa.toFixed(1))
    ];

    const quickResult: TestResultData = {
      testDate: new Date().toISOString().split('T')[0],
      testedBy: currentUser?.fullName || 'KTV Tasago',
      machineCode: 'MN-2000KN-01',
      avgStrengthMpa: autoMpa,
      designStrengthMpa: designMpa,
      percentageOfDesign: 105,
      isPassed: true,
      pieceResults: pieceBreakMpa.map((mpa, idx) => ({
        pieceNumber: idx + 1,
        failureLoadKn: Number((mpa * 22.5).toFixed(1)),
        measuredStrengthMpa: mpa,
      })),
      notes: 'Đã nén & cập nhật trực tiếp trên Lịch Nén Mẫu'
    };

    let updatedTargetSample: ConcreteSample | null = null;
    const updated = samples.map(s => {
      if (s.id === sample.id) {
        updatedTargetSample = {
          ...s,
          status: 'tested_passed' as const,
          testResult: quickResult,
          updatedAt: new Date().toISOString(),
        };
        return updatedTargetSample;
      }
      return s;
    });

    const finalized = recalculateSampleStatuses(updated);
    setSamples(finalized);
    saveSamples(finalized);

    if (updatedTargetSample) {
      try {
        const res = await apiFetch('/api/samples/save', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            sample: updatedTargetSample,
            actionBy: currentUser?.fullName || currentUser?.username 
          })
        });
        if (res.ok) {
          const data = await res.json();
          if (data.samples && Array.isArray(data.samples)) {
            const recalced = recalculateSampleStatuses(data.samples);
            setSamples(recalced);
            saveSamples(recalced);
          }
        }
      } catch (err) {
        console.warn('Could not save test result to server:', err);
      }
    }
  };

  // Handler: Save Test Result
  const handleSaveTestResult = async (sampleId: string, resultData: TestResultData) => {
    const target = samples.find(sample => sample.id === sampleId);
    if (!target || !canEnterTestResult(target)) {
      alert('Bạn không có quyền lưu kết quả cho mẫu của thành viên khác.');
      setIsTestResultModalOpen(false);
      setTestingSample(null);
      return;
    }
    let updatedTargetSample: ConcreteSample | null = null;
    const updated = samples.map(s => {
      if (s.id === sampleId) {
        const newStatus = resultData.isPassed ? 'tested_passed' : 'tested_failed';
        updatedTargetSample = {
          ...s,
          status: newStatus as any,
          testResult: resultData,
          updatedAt: new Date().toISOString(),
        };
        return updatedTargetSample;
      }
      return s;
    });

    const finalized = recalculateSampleStatuses(updated);
    setSamples(finalized);
    saveSamples(finalized);
    setIsTestResultModalOpen(false);
    setTestingSample(null);

    if (updatedTargetSample) {
      try {
        const res = await apiFetch('/api/samples/save', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            sample: updatedTargetSample,
            actionBy: currentUser?.fullName || currentUser?.username 
          })
        });
        if (res.ok) {
          const data = await res.json();
          if (data.samples && Array.isArray(data.samples)) {
            const recalced = recalculateSampleStatuses(data.samples);
            setSamples(recalced);
            saveSamples(recalced);
          }
        }
      } catch (err) {
        console.warn('Could not save test result to server:', err);
      }
    }
  };

  // Handler: Save Notification Config
  const handleSaveNotificationConfig = async (config: NotificationConfig) => {
    const clientSafeConfig = { ...config } as NotificationConfig & { smtpPass?: string };
    delete clientSafeConfig.smtpPass;
    setNotificationConfig(clientSafeConfig);
    saveNotificationConfig(clientSafeConfig);
    try {
      await apiFetch('/api/server-sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ config })
      });
    } catch (err) {
      console.warn('Could not sync notification config to server:', err);
    }
  };

  // Handler: Save Users (Admin)
  const handleSaveUsers = async (updatedUsers: User[]) => {
    setUsers(updatedUsers);
    saveUsers(updatedUsers);
    try {
      const res = await apiFetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ users: updatedUsers })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.users && Array.isArray(data.users)) {
          setUsers(data.users);
          saveUsers(data.users);
        }
      }
    } catch (err) {
      console.warn('Could not save users to server:', err);
    }
  };

  // Handler: Save Stations (Admin)
  const handleSaveStations = async (updatedStations: Station[]) => {
    setStations(updatedStations);
    saveStations(updatedStations);
    try {
      const res = await apiFetch('/api/stations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stations: updatedStations })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.stations && Array.isArray(data.stations)) {
          setStations(data.stations);
          saveStations(data.stations);
        }
      }
    } catch (err) {
      console.warn('Could not save stations to server:', err);
    }
  };

  // Handler: Import Full State (Backup Restore)
  const handleImportFullState = async (stateData: any) => {
    if (stateData.samples) {
      const recalc = recalculateSampleStatuses(stateData.samples);
      setSamples(recalc);
      saveSamples(recalc);
    }
    if (stateData.stations) {
      setStations(stateData.stations);
      saveStations(stateData.stations);
    }
    if (stateData.users) {
      setUsers(stateData.users);
      saveUsers(stateData.users);
    }
    if (stateData.notificationConfig) {
      setNotificationConfig(stateData.notificationConfig);
      saveNotificationConfig(stateData.notificationConfig);
    }

    try {
      await apiFetch('/api/server-sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'restore_full_backup',
          samples: stateData.samples,
          stations: stateData.stations,
          users: stateData.users,
          config: stateData.notificationConfig
        })
      });
    } catch (err) {
      console.warn('Could not restore backup to server:', err);
    }
  };

  // Quick Action: Open Add Form
  const handleOpenAddForm = () => {
    setEditingSample(null);
    setIsFormModalOpen(true);
  };

  // Quick Action: Open Edit Form
  const handleOpenEditForm = (sample: ConcreteSample) => {
    setEditingSample(sample);
    setIsFormModalOpen(true);
  };

  const canEnterTestResult = (sample: ConcreteSample) => {
    if (!currentUser || currentUser.role === 'admin') return true;
    const assignedStations = new Set<string>([
      ...(currentUser.stationIds || []).map(String),
      ...(currentUser.stationId ? [String(currentUser.stationId)] : []),
    ]);
    return assignedStations.has('all') || assignedStations.has(String(sample.stationId));
  };

  // Quick Action: Open Test Result Modal
  const handleOpenTestModal = (sample: ConcreteSample) => {
    if (!canEnterTestResult(sample)) {
      alert(`Bạn không có quyền nhập kết quả cho mẫu của thành viên khác (${sample.createdByName || sample.samplerName || 'thành viên khác'}).`);
      return;
    }
    setTestingSample(sample);
    setIsTestResultModalOpen(true);
  };

  // Quick Action: Open Detail Modal
  const handleOpenDetailModal = (sample: ConcreteSample) => {
    setDetailSample(sample);
    setIsDetailModalOpen(true);
  };

  // Quick Action: Open Notification Modal
  const handleOpenNotificationModal = (sample?: ConcreteSample) => {
    setNotificationPreselectedSample(sample || null);
    setIsNotificationModalOpen(true);
  };

  // If not logged in, show AuthScreen
  if (!currentUser) {
    return <AuthScreen onLogin={handleLogin} onSelectUser={handleLogin} users={users} />;
  }

  // Count urgent samples for notification badge
  const urgentCount = samples.filter(s => s.status === 'due_today' || s.status === 'overdue').length;

  const isMobileLayout = viewMode === 'mobile';

  return (
    <div className={`min-h-screen bg-[#f8fafc] text-slate-900 flex flex-col font-sans selection:bg-emerald-600 selection:text-white ${isMobileLayout ? 'pb-20' : ''}`}>
      {/* Header */}
      <Header
        currentUser={currentUser}
        stations={stations}
        selectedStationId={selectedStationId}
        onSelectStation={handleSelectStation}
        activeTab={activeTab}
        onChangeTab={setActiveTab}
        onLogout={handleLogout}
        onOpenChangePassword={() => setIsChangePasswordModalOpen(true)}
        onOpenAddModal={handleOpenAddForm}
        onOpenNotificationModal={() => handleOpenNotificationModal()}
        onOpenUserManagement={(tab) => {
          setUserManagementTab(tab || 'stations');
          setIsUserManagementModalOpen(true);
        }}
        onOpenExportBackup={() => setIsGitHubExportModalOpen(true)}
        urgentCount={urgentCount}
        viewMode={viewMode}
        onChangeViewMode={handleViewModeChange}
        onManualSync={() => fetchServerSync(true)}
        isSyncing={isSyncing}
        lastSyncedAt={lastSyncedAt}
        sseConnected={sseConnected}
      />

      {/* Real-time Toast Notification when a member creates a new schedule */}
      {newScheduleToast && (
        <div className="fixed bottom-24 right-4 sm:right-8 z-50 max-w-md bg-white border-2 border-emerald-500 rounded-2xl shadow-2xl p-4 animate-in slide-in-from-bottom-5 duration-300">
          <div className="flex items-start justify-between gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center shrink-0 text-emerald-800 font-bold">
              <Calendar className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="bg-emerald-600 text-white text-[10px] font-black uppercase px-2 py-0.5 rounded-full animate-pulse">
                  Mới Tạo Trực Tiếp
                </span>
                <span className="text-[11px] font-semibold text-slate-500">
                  {newScheduleToast.stationName}
                </span>
              </div>
              <h4 className="font-black text-sm text-slate-900 mt-1 truncate">
                {newScheduleToast.projectName}
              </h4>
              <p className="text-xs text-slate-600 mt-0.5">
                Kỹ thuật viên <strong>{newScheduleToast.createdByName}</strong> vừa thêm lịch nén ngày <strong>{newScheduleToast.scheduledTestDate.split('-').reverse().join('/')}</strong>
              </p>
              <div className="mt-2.5 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedStationId('all');
                    setActiveTab('calendar');
                    setNewScheduleToast(null);
                  }}
                  className="bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-bold px-3 py-1.5 rounded-xl transition-colors cursor-pointer shadow-xs"
                >
                  Xem Trên Lịch Nén
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const found = samples.find(s => s.id === newScheduleToast.id);
                    if (found) {
                      setSelectedStationId('all');
                      setDetailSample(found);
                      setIsDetailModalOpen(true);
                    } else {
                      setSelectedStationId('all');
                      setActiveTab('samples');
                    }
                    setNewScheduleToast(null);
                  }}
                  className="bg-emerald-100 hover:bg-emerald-200 text-emerald-900 text-xs font-bold px-3 py-1.5 rounded-xl transition-colors cursor-pointer"
                >
                  Chi Tiết Mẫu
                </button>
                <button
                  type="button"
                  onClick={() => setNewScheduleToast(null)}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold px-2.5 py-1.5 rounded-xl transition-colors cursor-pointer"
                >
                  Đóng
                </button>
              </div>
            </div>
            <button
              onClick={() => setNewScheduleToast(null)}
              className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Main Container */}
      <main className={`flex-1 w-full mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-4 sm:space-y-6 ${
        viewMode === 'mobile' ? 'max-w-2xl' : 'max-w-7xl'
      }`}>
        
        {/* Automatic Realtime Urgent Alert Banner */}
        {urgentCount > 0 && showAutoAlertBanner && (
          <div className="bg-gradient-to-r from-red-600 via-rose-600 to-amber-600 text-white p-3.5 sm:p-5 rounded-2xl shadow-lg shadow-red-600/15 border border-red-500/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4 animate-in fade-in slide-in-from-top-4 duration-300">
            <div className="flex items-start sm:items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center shrink-0 text-white animate-pulse">
                <Bell className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <span className="bg-white text-red-700 text-[10px] font-black uppercase px-2 py-0.5 rounded tracking-wider">
                    Cảnh Báo Tự Động
                  </span>
                  <span className="text-xs text-red-100 font-semibold">
                    Thời gian thực
                  </span>
                </div>
                <h3 className="font-black text-xs sm:text-base text-white mt-0.5">
                  Phát hiện <span className="underline underline-offset-2">{urgentCount} mẫu bê tông</span> có lịch nén cần thực hiện ngay!
                </h3>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-end">
              {!browserNotificationGranted && (
                <button
                  type="button"
                  onClick={handleRequestPushPermission}
                  className="bg-white/20 hover:bg-white/30 text-white font-bold px-3 py-1.5 rounded-xl text-xs flex items-center space-x-1.5 transition-all cursor-pointer backdrop-blur-sm"
                  title="Bật thông báo đẩy lên màn hình điện thoại/máy tính"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                  <span>Bật Push</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => {
                  playAlertChime();
                  handleOpenNotificationModal();
                }}
                className="bg-white text-red-700 hover:bg-red-50 font-black px-3.5 py-1.5 rounded-xl text-xs flex items-center space-x-1.5 shadow-md transition-all active:scale-95 cursor-pointer"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>Xem Thông Báo</span>
              </button>

              <button
                type="button"
                onClick={() => setShowAutoAlertBanner(false)}
                className="text-white/70 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
                title="Tạm ẩn cảnh báo"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* KPI Dashboard Stats Bar */}
        <DashboardStats
          samples={samples}
          stations={stations}
          selectedStationId={selectedStationId}
          onFilterStatus={(status) => {
            setActiveTab('samples');
          }}
          onOpenNotificationCenter={() => handleOpenNotificationModal()}
          viewMode={viewMode}
        />

        {/* Tab 1: SAMPLES TABLE / CARDS */}
        {activeTab === 'samples' && (
          <SampleList
            samples={samples}
            stations={stations}
            currentUser={currentUser}
            selectedStationId={selectedStationId}
            onAddNew={handleOpenAddForm}
            onEdit={handleOpenEditForm}
            onDelete={handleDeleteSample}
            onOpenTestResult={handleOpenTestModal}
            onOpenDetail={handleOpenDetailModal}
            onOpenNotification={handleOpenNotificationModal}
            onExportExcel={(listToExport) => {
              exportSamplesToExcel(listToExport || samples, stations);
            }}
            userRole={currentUser.role}
            viewMode={viewMode}
          />
        )}

        {/* Tab 2: CALENDAR VIEW */}
        {activeTab === 'calendar' && (
          <CalendarView
            samples={samples}
            stations={stations}
            currentUser={currentUser}
            selectedStationId={selectedStationId}
            onSelectSampleDetail={handleOpenDetailModal}
            onSelectSampleForTest={handleOpenTestModal}
            onQuickMarkTested={handleQuickMarkTested}
            onDeleteSample={handleDeleteSampleDirect}
            onOpenNotification={handleOpenNotificationModal}
            onAddNewSampleForDate={(dateStr) => {
              setEditingSample({
                id: '',
                sampleCode: '',
                category: 'commercial',
                stationId: selectedStationId !== 'all' ? selectedStationId : (stations[0]?.id || ''),
                projectName: '',
                contractor: '',
                location: '',
                component: '',
                concreteGrade: 'M300 (B22.5)',
                slumpCm: '12±2',
                volumeM3: 20,
                castDate: dateStr,
                ageType: 'R28',
                ageDays: 28,
                scheduledTestDate: dateStr,
                sampleShape: 'cube_150',
                groupCount: 1,
                pieceCount: 3,
                contactPerson: '',
                contactPhone: '',
                samplerName: currentUser.fullName,
                notes: '',
                status: 'due_today',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                createdBy: currentUser.username,
                createdByName: currentUser.fullName,
              });
              setIsFormModalOpen(true);
            }}
          />
        )}

        {/* Tab 3: ANALYTICS & CHARTS */}
        {activeTab === 'analytics' && (
          <AnalyticsView
            samples={samples}
            stations={stations}
            selectedStationId={selectedStationId}
          />
        )}

        {/* Tab 4: REPORTS & EXCEL EXPORT */}
        {activeTab === 'reports' && (
          <ReportsView
            samples={samples}
            stations={stations}
          />
        )}

      </main>

      {/* Floating Action Button (FAB) - Always visible, fixed at the bottom-right corner with prominent pulsing effect */}
      <div className="fixed bottom-16 sm:bottom-8 right-4 sm:right-8 z-40 flex flex-col items-end">
        <button
          type="button"
          onClick={handleOpenAddForm}
          className="group relative flex items-center gap-2.5 px-4 sm:px-5 py-3 sm:py-3.5 bg-gradient-to-r from-emerald-500 via-emerald-600 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white rounded-full font-extrabold shadow-2xl border-2 border-white/60 animate-pulse-glow transition-all active:scale-95 cursor-pointer select-none"
          title="Nhập mẫu mới / Tạo lịch nén bê tông"
        >
          <span className="relative flex h-3.5 w-3.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-300 opacity-80"></span>
            <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-amber-400"></span>
          </span>
          <div className="p-1 bg-white/20 rounded-full group-hover:rotate-90 transition-transform duration-300">
            <Plus className="w-5 h-5 sm:w-6 sm:h-6 stroke-[3]" />
          </div>
          <span className="text-sm sm:text-base font-black tracking-wide uppercase drop-shadow-md whitespace-nowrap">
            Nhập Mẫu Mới
          </span>
        </button>
      </div>

      {/* Fixed Bottom Navigation Bar for Mobile (Always visible in Mobile mode or on small screens) */}
      <div className={`fixed bottom-0 left-0 right-0 z-40 bg-slate-900/95 backdrop-blur-md border-t border-slate-700 px-2 py-1.5 text-slate-300 shadow-2xl ${
        viewMode === 'pc' ? 'hidden' : 'md:hidden'
      }`}>
        <div className="flex items-center justify-around max-w-lg mx-auto">
          
          <button
            type="button"
            onClick={() => setActiveTab('samples')}
            className={`flex flex-col items-center py-1 px-2 rounded-lg text-[10px] font-semibold transition-colors cursor-pointer ${
              activeTab === 'samples' ? 'text-emerald-400 bg-slate-800' : 'hover:text-slate-100'
            }`}
          >
            <LayoutGrid className="w-5 h-5 mb-0.5" />
            <span>Mẫu Nén</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('calendar')}
            className={`flex flex-col items-center py-1 px-2 rounded-lg text-[10px] font-semibold transition-colors cursor-pointer ${
              activeTab === 'calendar' ? 'text-emerald-400 bg-slate-800' : 'hover:text-slate-100'
            }`}
          >
            <CalendarDays className="w-5 h-5 mb-0.5" />
            <span>Lịch Nén</span>
          </button>

          {/* Floating Center Action Button */}
          <button
            type="button"
            onClick={handleOpenAddForm}
            className="flex flex-col items-center justify-center -mt-5 w-12 h-12 rounded-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black shadow-lg shadow-emerald-500/30 border-2 border-slate-900 transition-transform active:scale-90 cursor-pointer"
            title="Thêm mẫu mới"
          >
            <Plus className="w-6 h-6 stroke-[3]" />
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('analytics')}
            className={`flex flex-col items-center py-1 px-2 rounded-lg text-[10px] font-semibold transition-colors cursor-pointer ${
              activeTab === 'analytics' ? 'text-emerald-400 bg-slate-800' : 'hover:text-slate-100'
            }`}
          >
            <BarChart3 className="w-5 h-5 mb-0.5" />
            <span>Thống Kê</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('reports')}
            className={`flex flex-col items-center py-1 px-2 rounded-lg text-[10px] font-semibold transition-colors cursor-pointer ${
              activeTab === 'reports' ? 'text-emerald-400 bg-slate-800' : 'hover:text-slate-100'
            }`}
          >
            <FileText className="w-5 h-5 mb-0.5" />
            <span>Báo Cáo</span>
          </button>

        </div>
      </div>

      {/* Footer with updated Technical Support Phone 0942320923 */}
      <footer className="bg-slate-100 px-4 sm:px-6 py-3 border-t border-slate-200 flex flex-col sm:flex-row justify-between items-center text-[11px] text-slate-500 gap-2 mt-auto">
        <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 sm:gap-4">
          <span>Phiên bản: 2.0.26</span>
          <span>•</span>
          <a 
            href="tel:0942320923" 
            className="text-emerald-700 hover:text-emerald-900 font-bold flex items-center gap-1 hover:underline"
          >
            <Phone className="w-3 h-3" />
            <span>Hỗ trợ kỹ thuật: 0942320923 (0942.320.923)</span>
          </a>
          {currentUser.role === 'admin' && (
            <>
              <span>•</span>
              <button
                onClick={() => setIsGitHubExportModalOpen(true)}
                className="text-emerald-700 hover:text-emerald-900 font-semibold cursor-pointer underline"
              >
                Sao Lưu & GitHub
              </button>
            </>
          )}
        </div>
        <div className="font-bold text-slate-700 tracking-tight text-center sm:text-right">
          &copy; {new Date().getFullYear()} CÔNG TY CỔ PHẦN ĐẦU TƯ TASAGO - BÊ TÔNG XANH SÀI GÒN
        </div>
      </footer>

      {/* MODALS */}
      {/* 1. Add / Edit Sample Modal */}
      <SampleFormModal
        isOpen={isFormModalOpen}
        onClose={() => {
          setIsFormModalOpen(false);
          setEditingSample(null);
        }}
        editingSample={editingSample}
        stations={stations}
        onSave={handleSaveSample}
        currentUser={currentUser}
      />

      {/* 2. Test Result Entry Modal */}
      <TestResultModal
        isOpen={isTestResultModalOpen}
        onClose={() => {
          setIsTestResultModalOpen(false);
          setTestingSample(null);
        }}
        sample={testingSample}
        onSaveResult={handleSaveTestResult}
        currentUserName={currentUser.fullName}
      />

      {/* 3. Sample Detail & Test Certificate Modal */}
      <SampleDetailModal
        isOpen={isDetailModalOpen}
        onClose={() => {
          setIsDetailModalOpen(false);
          setDetailSample(null);
        }}
        sample={detailSample}
        stations={stations}
        allSamples={samples}
        currentUser={currentUser}
        onOpenTestModal={handleOpenTestModal}
        onOpenEditModal={handleOpenEditForm}
        onSendNotification={(sample) => {
          setIsDetailModalOpen(false);
          handleOpenNotificationModal(sample);
        }}
      />

      {/* 4. Email Notification Center Modal */}
      <NotificationModal
        isOpen={isNotificationModalOpen}
        onClose={() => {
          setIsNotificationModalOpen(false);
          setNotificationPreselectedSample(null);
        }}
        samples={samples}
        stations={stations}
        config={notificationConfig}
        onSaveConfig={handleSaveNotificationConfig}
        notificationLogs={notificationLogs}
        preselectedSample={notificationPreselectedSample}
        currentUser={currentUser}
      />

      {/* 5. User & Station Management Modal (Admin) */}
      <UserManagementModal
        isOpen={isUserManagementModalOpen}
        onClose={() => setIsUserManagementModalOpen(false)}
        users={users}
        stations={stations}
        samples={samples}
        onSaveUsers={handleSaveUsers}
        onSaveStations={handleSaveStations}
        onSaveSamples={(updatedSamples) => {
          setSamples(updatedSamples);
          saveSamples(updatedSamples);
        }}
        initialTab={userManagementTab}
      />

      {/* 6. Change Password Modal */}
      <ChangePasswordModal
        isOpen={isChangePasswordModalOpen}
        onClose={() => setIsChangePasswordModalOpen(false)}
        onPasswordChanged={(updatedUser) => {
          setCurrentUser(updatedUser);
          saveCurrentUserToStorage(updatedUser);
        }}
      />

      {/* 7. GitHub Export & JSON Backup Modal */}
      <GitHubExportModal
        isOpen={isGitHubExportModalOpen}
        onClose={() => setIsGitHubExportModalOpen(false)}
        samples={samples}
        stations={stations}
        users={users}
        notificationConfig={notificationConfig}
        onImportFullState={handleImportFullState}
      />

    </div>
  );
}

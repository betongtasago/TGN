import { User, Station, ConcreteSample, NotificationConfig, NotificationLog, ConcreteAgeType } from '../types';
import { INITIAL_USERS, INITIAL_STATIONS, INITIAL_SAMPLES, INITIAL_NOTIFICATION_CONFIG } from '../data/initialData';

const STORAGE_KEYS = {
  USERS: 'tasago_users_v4',
  CURRENT_USER: 'tasago_current_user_v4',
  AUTH_TOKEN: 'tasago_auth_token_v1',
  STATIONS: 'tasago_stations_v3',
  SAMPLES: 'tasago_samples_v3',
  NOTIFICATION_CONFIG: 'tasago_notif_config_v3',
  NOTIFICATION_LOGS: 'tasago_notif_logs_v3',
  VIEW_MODE: 'tasago_view_mode_v3',
};

// ============================================================
// AUTH TOKEN (session)
// ============================================================
// The server issues this token on successful /api/auth/login and requires
// it (as "Authorization: Bearer <token>") on every API call that touches
// shared data. It's cached in localStorage so an already-authenticated
// device keeps working offline — only the FIRST login on a device needs
// connectivity. See AuthScreen.tsx and App.tsx for how it's used.
export function getAuthToken(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
  } catch {
    return null;
  }
}

export function setAuthToken(token: string | null): void {
  try {
    if (token) {
      localStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, token);
    } else {
      localStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
    }
  } catch (e) {
    console.error('Failed to persist auth token:', e);
  }
}

const API_BASE_URL = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');

export function apiUrl(path: string): string {
  return `${API_BASE_URL}${path}`;
}

// Wrapper around fetch() that automatically attaches the auth token to
// every API call. Use this instead of raw fetch() for any /api/* request.
export async function apiFetch(input: string, init: RequestInit = {}): Promise<Response> {
  const token = getAuthToken();
  const headers = new Headers(init.headers || {});
  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  const target = input.startsWith('/api/') ? apiUrl(input) : input;
  return fetch(target, { ...init, headers });
}

export type ViewMode = 'auto' | 'pc' | 'mobile';

export function loadViewMode(): ViewMode {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.VIEW_MODE);
    if (raw === 'pc' || raw === 'mobile' || raw === 'auto') return raw;
    return 'auto';
  } catch {
    return 'auto';
  }
}

export function saveViewMode(mode: ViewMode): void {
  try {
    localStorage.setItem(STORAGE_KEYS.VIEW_MODE, mode);
  } catch (e) {
    console.error('Failed to save view mode:', e);
  }
}

// Calculate age days from AgeType
export function getDaysFromAgeType(ageType: ConcreteAgeType, customDays?: number): number {
  switch (ageType) {
    case 'R3': return 3;
    case 'R7': return 7;
    case 'R14': return 14;
    case 'R28': return 28;
    case 'R60': return 60;
    case 'R90': return 90;
    case 'R28_WATERPROOF': return 28;
    case 'EXPANSION': return 14;
    case 'CUSTOM': return customDays || 28;
    default: return 28;
  }
}

// Calculate Scheduled Date: castDate + days
export function calculateScheduledDate(castDateStr: string, days: number): string {
  if (!castDateStr) return '';
  const parts = castDateStr.split('-');
  if (parts.length !== 3) return castDateStr;
  const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
  d.setDate(d.getDate() + days);
  
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

// Extract numeric design strength (MPa) from grade string (e.g. M350 -> 35, B25 -> 25)
export function parseDesignStrengthMpa(gradeStr: string): number {
  if (!gradeStr) return 30;
  const mMatch = gradeStr.match(/M\s*(\d+)/i);
  if (mMatch && mMatch[1]) {
    const val = parseInt(mMatch[1], 10);
    return val >= 100 ? val / 10 : val;
  }
  const bMatch = gradeStr.match(/B\s*(\d+(?:\.\d+)?)/i);
  if (bMatch && bMatch[1]) {
    return parseFloat(bMatch[1]);
  }
  return 30;
}

// Format date for display in Vietnamese: DD/MM/YYYY
export function formatDateVN(dateStr: string | undefined): string {
  if (!dateStr) return '---';
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return dateStr;
}

// Check sample status dynamically based on current date
export function refreshSampleStatus(sample: ConcreteSample): ConcreteSample {
  if (sample.status === 'tested_passed' || sample.status === 'tested_failed' || sample.status === 'cancelled') {
    return sample;
  }

  const todayStr = new Date().toISOString().split('T')[0];
  const scheduled = sample.scheduledTestDate;

  if (!scheduled) return sample;

  if (scheduled === todayStr) {
    return { ...sample, status: 'due_today' };
  } else if (scheduled < todayStr) {
    return { ...sample, status: 'overdue' };
  } else {
    return { ...sample, status: 'pending' };
  }
}

// Storage operations
export function getStoredUsers(): User[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.USERS);
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(INITIAL_USERS));
      return INITIAL_USERS;
    }
    const parsed: User[] = JSON.parse(raw);
    // Ensure admin user exists in list
    const hasAdmin = parsed.some(u => u.username === 'admin');
    if (!hasAdmin) {
      const merged = [...INITIAL_USERS, ...parsed];
      localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(merged));
      return merged;
    }
    return parsed;
  } catch (e) {
    console.error('Failed to parse stored users:', e);
    return INITIAL_USERS;
  }
}

export const loadUsers = getStoredUsers;

export function saveStoredUsers(users: User[]): void {
  localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
}

export const saveUsers = saveStoredUsers;

export function getCurrentUser(): User | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.CURRENT_USER);
    if (!raw) {
      // Do NOT default to admin. Strangers / unauthenticated visitors must start logged out.
      return null;
    }
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function setCurrentUser(user: User | null): void {
  if (user) {
    localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(user));
  } else {
    localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
  }
}

export function getStoredStations(): Station[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.STATIONS);
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.STATIONS, JSON.stringify(INITIAL_STATIONS));
      return INITIAL_STATIONS;
    }
    const parsed: Station[] = JSON.parse(raw);
    // Check if old obsolete stations like sta_hiepphuoc or sta_binhduong exist -> replace with new
    if (parsed.some(s => s.id === 'sta_hiepphuoc' || s.id === 'sta_binhduong' || s.id === 'sta_longan')) {
      localStorage.setItem(STORAGE_KEYS.STATIONS, JSON.stringify(INITIAL_STATIONS));
      return INITIAL_STATIONS;
    }
    return parsed;
  } catch (e) {
    console.error('Failed to parse stored stations:', e);
    return INITIAL_STATIONS;
  }
}

export const loadStations = getStoredStations;

export function saveStoredStations(stations: Station[]): void {
  localStorage.setItem(STORAGE_KEYS.STATIONS, JSON.stringify(stations));
}

export const saveStations = saveStoredStations;

export function getStoredSamples(): ConcreteSample[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.SAMPLES);
    let samples: ConcreteSample[] = [];
    if (!raw) {
      samples = INITIAL_SAMPLES;
      localStorage.setItem(STORAGE_KEYS.SAMPLES, JSON.stringify(samples));
    } else {
      samples = JSON.parse(raw);
      // If samples still reference obsolete station sta_hiepphuoc -> reset to initial new samples
      if (samples.some(s => s.stationId === 'sta_hiepphuoc' || s.stationId === 'sta_binhduong')) {
        samples = INITIAL_SAMPLES;
        localStorage.setItem(STORAGE_KEYS.SAMPLES, JSON.stringify(samples));
      }
    }
    // Update statuses dynamically relative to current date
    const updated = samples.map(refreshSampleStatus);
    return updated;
  } catch (e) {
    console.error('Failed to parse stored samples:', e);
    return INITIAL_SAMPLES.map(refreshSampleStatus);
  }
}

export const loadSamples = getStoredSamples;

export function saveStoredSamples(samples: ConcreteSample[]): void {
  localStorage.setItem(STORAGE_KEYS.SAMPLES, JSON.stringify(samples));
}

export const saveSamples = saveStoredSamples;

export function recalculateSampleStatuses(samples: ConcreteSample[]): ConcreteSample[] {
  return samples.map(refreshSampleStatus);
}

function sanitizeClientNotificationConfig(config: NotificationConfig): NotificationConfig {
  const cleaned = { ...config } as NotificationConfig & { smtpPass?: string };
  delete cleaned.smtpPass;
  return cleaned;
}

export function getStoredNotificationConfig(): NotificationConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.NOTIFICATION_CONFIG);
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.NOTIFICATION_CONFIG, JSON.stringify(INITIAL_NOTIFICATION_CONFIG));
      return INITIAL_NOTIFICATION_CONFIG;
    }
    return sanitizeClientNotificationConfig(JSON.parse(raw));
  } catch {
    return INITIAL_NOTIFICATION_CONFIG;
  }
}

export const loadNotificationConfig = getStoredNotificationConfig;

export function saveStoredNotificationConfig(config: NotificationConfig): void {
  localStorage.setItem(STORAGE_KEYS.NOTIFICATION_CONFIG, JSON.stringify(sanitizeClientNotificationConfig(config)));
}

export const saveNotificationConfig = saveStoredNotificationConfig;

export function getStoredNotificationLogs(): NotificationLog[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.NOTIFICATION_LOGS);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export const loadNotificationLogs = getStoredNotificationLogs;

export function addNotificationLog(log: Omit<NotificationLog, 'id' | 'timestamp'>): NotificationLog {
  const logs = getStoredNotificationLogs();
  const newLog: NotificationLog = {
    ...log,
    id: 'log_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
    timestamp: new Date().toISOString(),
  };
  const updated = [newLog, ...logs].slice(0, 100);
  localStorage.setItem(STORAGE_KEYS.NOTIFICATION_LOGS, JSON.stringify(updated));
  return newLog;
}

export async function syncNotificationLog(log: NotificationLog): Promise<NotificationLog[] | null> {
  try {
    const res = await apiFetch('/api/notification-logs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ log }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return Array.isArray(data.notificationLogs) ? data.notificationLogs : null;
  } catch {
    return null;
  }
}

export function resetAllDataToDefault(): void {
  localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(INITIAL_USERS));
  localStorage.setItem(STORAGE_KEYS.STATIONS, JSON.stringify(INITIAL_STATIONS));
  localStorage.setItem(STORAGE_KEYS.SAMPLES, JSON.stringify(INITIAL_SAMPLES));
  localStorage.setItem(STORAGE_KEYS.NOTIFICATION_CONFIG, JSON.stringify(INITIAL_NOTIFICATION_CONFIG));
  localStorage.removeItem(STORAGE_KEYS.NOTIFICATION_LOGS);
}

export function exportAllDataAsJsonString(): string {
  const data = {
    app: 'TGN Concrete Compression Testing Management System',
    exportedAt: new Date().toISOString(),
    version: '2.0.0',
    users: getStoredUsers().map(u => ({ ...u, password: '[PROTECTED]' })),
    stations: getStoredStations(),
    samples: getStoredSamples(),
    notificationConfig: getStoredNotificationConfig(),
    notificationLogs: getStoredNotificationLogs(),
  };
  return JSON.stringify(data, null, 2);
}

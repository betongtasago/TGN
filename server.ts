import 'dotenv/config';
import express from 'express';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import nodemailer from 'nodemailer';
import { createServer as createViteServer } from 'vite';
import { INITIAL_USERS, INITIAL_STATIONS, INITIAL_SAMPLES, INITIAL_NOTIFICATION_CONFIG } from './src/data/initialData';
import { loadSupabaseState, persistSupabaseState, supabaseConfigured } from './supabaseStore';

// ============================================================
// AUTH: password hashing + signed session tokens
// ============================================================
// Uses only Node's built-in `crypto` module (scrypt for password hashing,
// HMAC-SHA256 for signing tokens) — no extra dependency needed.
//
// Password format stored in ServerState.users[].password:
//   "scrypt:<saltHex>:<hashHex>"
// Any value NOT in this format is treated as legacy plaintext (from before
// this fix) and is transparently upgraded to a hash the next time that user
// logs in successfully or is saved via the admin user-management screen.
// ============================================================

function hashPassword(plain: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(plain, salt, 64).toString('hex');
  return `scrypt:${salt}:${hash}`;
}

function isHashedPassword(value: string | undefined | null): boolean {
  return typeof value === 'string' && value.startsWith('scrypt:') && value.split(':').length === 3;
}

function verifyPassword(plain: string, stored: string | undefined | null): boolean {
  if (!stored) return false;
  if (!isHashedPassword(stored)) {
    // Legacy plaintext password (pre-hash migration) — compare directly.
    return plain === stored;
  }
  const [, salt, hashHex] = stored.split(':');
  try {
    const candidate = crypto.scryptSync(plain, salt, 64);
    const expected = Buffer.from(hashHex, 'hex');
    if (candidate.length !== expected.length) return false;
    return crypto.timingSafeEqual(candidate, expected);
  } catch {
    return false;
  }
}

// Strip password before sending a user object to any client.
function sanitizeUser(u: any) {
  if (!u || typeof u !== 'object') return u;
  const { password, ...rest } = u;
  return rest;
}
function sanitizeUsers(list: any[]) {
  return (list || []).map(sanitizeUser);
}

// --- Session secret (used to sign tokens with HMAC) ---
// Prefer an explicit AUTH_SECRET env var (required for multi-instance /
// zero-downtime-restart deployments). Otherwise generate one on first boot
// and persist it to disk so tokens keep working across restarts on a single
// instance (e.g. Render's persistent disk).
const AUTH_SECRET_PATH = path.join(
  process.env.DATA_DIR ? path.resolve(process.env.DATA_DIR) : path.join(process.cwd(), 'data'),
  'auth-secret.key'
);

function loadOrCreateAuthSecret(): string {
  if (process.env.AUTH_SECRET) return process.env.AUTH_SECRET;
  try {
    if (fs.existsSync(AUTH_SECRET_PATH)) {
      const existing = fs.readFileSync(AUTH_SECRET_PATH, 'utf8').trim();
      if (existing) return existing;
    }
  } catch {}
  const generated = crypto.randomBytes(32).toString('hex');
  try {
    const dir = path.dirname(AUTH_SECRET_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(AUTH_SECRET_PATH, generated, { mode: 0o600 });
  } catch (e) {
    console.warn('Could not persist auth secret to disk (sessions will reset on restart):', e);
  }
  return generated;
}

const AUTH_SECRET = loadOrCreateAuthSecret();

function sanitizeConfig(config: any) {
  if (!config || typeof config !== 'object') return config;
  return {
    ...config,
    smtpPass: config.smtpPass ? '[PROTECTED]' : '',
    zaloBotToken: config.zaloBotToken ? '[PROTECTED]' : '',
  };
}

function mergeConfigPreservingSecrets(current: any, incoming: any) {
  const merged = { ...(current || {}), ...(incoming || {}) };
  for (const key of ['smtpPass', 'zaloBotToken']) {
    if (!incoming || incoming[key] === undefined || incoming[key] === '' || incoming[key] === '[PROTECTED]') {
      if (current?.[key]) merged[key] = current[key];
      else delete merged[key];
    }
  }
  return merged;
}
const TOKEN_TTL_SECONDS = 30 * 24 * 60 * 60; // 30 days — field technicians may go long stretches offline

function base64url(input: Buffer | string): string {
  return Buffer.from(input).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function base64urlDecode(input: string): Buffer {
  const pad = input.length % 4 === 0 ? '' : '='.repeat(4 - (input.length % 4));
  return Buffer.from(input.replace(/-/g, '+').replace(/_/g, '/') + pad, 'base64');
}

function signToken(payload: object): string {
  const body = base64url(JSON.stringify(payload));
  const sig = base64url(crypto.createHmac('sha256', AUTH_SECRET).update(body).digest());
  return `${body}.${sig}`;
}

function verifyToken(token: string | undefined | null): { userId: string; username: string } | null {
  if (!token || typeof token !== 'string' || !token.includes('.')) return null;
  const [body, sig] = token.split('.');
  const expectedSig = base64url(crypto.createHmac('sha256', AUTH_SECRET).update(body).digest());
  if (sig.length !== expectedSig.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expectedSig))) {
    return null;
  }
  try {
    const payload = JSON.parse(base64urlDecode(body).toString('utf8'));
    if (!payload.exp || Date.now() / 1000 > payload.exp) return null;
    return { userId: payload.sub, username: payload.username };
  } catch {
    return null;
  }
}

function issueToken(user: any): string {
  return signToken({
    sub: user.id,
    username: user.username,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + TOKEN_TTL_SECONDS,
  });
}

// Server in-memory state for automated 7:00 AM Cron & Multi-user synchronization
interface ServerState {
  samples: any[];
  stations: any[];
  users: any[];
  config: {
    autoEmailEnabled?: boolean;
    autoZaloEnabled?: boolean;
    emailRecipients?: string[];
    emailSender?: string;
    autoSendHour?: number;
    autoSendMinute?: number;
    smtpHost?: string;
    smtpPort?: number;
    smtpUser?: string;
    smtpPass?: string;
    smtpSecure?: boolean;
    emailServiceUrl?: string;
    zaloWebhookUrl?: string;
    zaloBotToken?: string;
    zaloGroupId?: string;
    zaloPersonalPhone?: string;
    zaloPersonalPhones?: string[];
    zaloRecipientType?: 'personal' | 'group' | 'both';
  };
  lastCronDate: string;
  lastCronLog: string;
  notificationLogs: any[];
}

// ============================================================
// DATA STORAGE
// ============================================================
// Có thể cấu hình thư mục lưu dữ liệu bằng biến môi trường:
// DATA_DIR=/var/lib/nenmau/data
//
// Nếu không cấu hình:
// - Development: ./data
// - Production: ./data
//
// LƯU Ý: Vercel filesystem không phải persistent database.
// ============================================================

const DATA_DIR = process.env.DATA_DIR
  ? path.resolve(process.env.DATA_DIR)
  : path.join(process.cwd(), 'data');

const stateFilePath = path.join(DATA_DIR, 'server-state.json');
const tempStateFilePath = path.join(DATA_DIR, 'server-state.json.tmp');

function loadPersistedState(): ServerState {
  try {
    if (fs.existsSync(stateFilePath)) {
      const raw = fs.readFileSync(stateFilePath, 'utf8');
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed.users)) {
        parsed.users = INITIAL_USERS;
      }
      if (!Array.isArray(parsed.stations)) {
        parsed.stations = INITIAL_STATIONS;
      }
      if (!Array.isArray(parsed.samples)) {
        parsed.samples = INITIAL_SAMPLES;
      }
      if (!Array.isArray(parsed.notificationLogs)) {
        parsed.notificationLogs = [];
      }
      if (!parsed.config || typeof parsed.config !== 'object') {
        parsed.config = INITIAL_NOTIFICATION_CONFIG;
      }
      return parsed;
    }
  } catch (e) {
    console.warn('Could not load server-state.json, using defaults:', e);
  }

  // Default initial server state
  const defaultState: ServerState = {
    samples: INITIAL_SAMPLES,
    stations: INITIAL_STATIONS,
    users: INITIAL_USERS,
    config: INITIAL_NOTIFICATION_CONFIG,
    lastCronDate: '',
    lastCronLog: 'Hệ thống vừa khởi động, sẵn sàng cho lịch phát 07:00 Sáng.',
    notificationLogs: []
  };

  try {
    const dir = path.dirname(stateFilePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(stateFilePath, JSON.stringify(defaultState, null, 2), 'utf8');
  } catch (e) {
    console.warn('Could not write default server-state.json:', e);
  }

  return defaultState;
}

// ============================================================
// SAFE PERSISTENCE
// ============================================================
// Supabase is the production source of truth. A local atomic JSON snapshot is
// retained only for development fallback and disaster recovery during startup.
// Writes are serialized so concurrent requests cannot overwrite each other.
// ============================================================

let saveQueue: Promise<void> = Promise.resolve();

function queuePersistedState(state: ServerState): Promise<void> {
  saveQueue = saveQueue
    .catch(() => undefined)
    .then(async () => {
      if (supabaseConfigured) {
        await persistSupabaseState(state);
        return;
      }

      if (process.env.NODE_ENV === 'production') {
        throw new Error('Thiếu SUPABASE_URL và SUPABASE_SERVICE_ROLE_KEY trong môi trường production.');
      }

      if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
      const json = JSON.stringify(state, null, 2);
      const fd = fs.openSync(tempStateFilePath, 'w');
      try {
        fs.writeSync(fd, json, 0, 'utf8');
        fs.fsyncSync(fd);
      } finally {
        fs.closeSync(fd);
      }
      fs.renameSync(tempStateFilePath, stateFilePath);
    });

  return saveQueue;
}

// Giữ lại tên cũ để toàn bộ code hiện tại không phải sửa.
function savePersistedState(state: ServerState): Promise<void> {
  const snapshot = JSON.parse(JSON.stringify(state)) as ServerState;
  return queuePersistedState(snapshot);
}

let serverState: ServerState = loadPersistedState();

// One-time migration: hash any legacy plaintext passwords found in the
// loaded state (covers both a fresh INITIAL_USERS default and any existing
// data/server-state.json written before this fix).
(function migrateLegacyPasswords() {
  let changed = false;
  const users = (serverState as any).users || [];
  for (const u of users) {
    if (u && typeof u.password === 'string' && u.password && !isHashedPassword(u.password)) {
      u.password = hashPassword(u.password);
      changed = true;
    }
  }
  if (changed && !supabaseConfigured && process.env.NODE_ENV !== 'production') {
    console.log('[AUTH] Migrated legacy plaintext password(s) to hashed format.');
    void savePersistedState(serverState).catch(error => console.error('[AUTH MIGRATION SAVE ERROR]', error));
  }
})();

// Helper: Format Vietnamese Date
function formatDateVN(dateStr?: string): string {
  if (!dateStr) return '---';
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return dateStr;
}

function getVietnamDateIso(date = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Ho_Chi_Minh',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map(part => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function refreshServerSampleStatus(sample: any): any {
  if (!sample || ['tested_passed', 'tested_failed', 'cancelled'].includes(sample.status)) return sample;
  const scheduled = typeof sample.scheduledTestDate === 'string' ? sample.scheduledTestDate : '';
  if (!scheduled) return sample;
  const today = getVietnamDateIso();
  const status = scheduled === today ? 'due_today' : scheduled < today ? 'overdue' : 'pending';
  return sample.status === status ? sample : { ...sample, status };
}

function getCurrentSamples(): any[] {
  return (serverState.samples || []).map(refreshServerSampleStatus);
}

// Helper: Create Nodemailer Transporter with STARTTLS
function createSmtpTransporter(smtpConfig?: any) {
  const host = smtpConfig?.smtpHost || serverState.config.smtpHost || process.env.SMTP_HOST || 'smtp.gmail.com';
  const port = Number(smtpConfig?.smtpPort || serverState.config.smtpPort || process.env.SMTP_PORT || 587);
  const user = (smtpConfig?.smtpUser || serverState.config.smtpUser || process.env.SMTP_USER || 'tasagotnt@gmail.com').trim();
  const requestPass = smtpConfig?.smtpPass && smtpConfig.smtpPass !== '[PROTECTED]' ? smtpConfig.smtpPass : '';
  const rawPass = requestPass || serverState.config.smtpPass || process.env.SMTP_PASS || '';
  // Clean password: strip all spaces that are commonly added when copying Gmail App Passwords (e.g. "abcd efgh ijkl mnop")
  const pass = rawPass.replace(/\s+/g, '');
  const isSecure = smtpConfig?.smtpSecure !== undefined ? Boolean(smtpConfig.smtpSecure) : (port === 465);

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: isSecure, // false for 587 (STARTTLS), true for 465 (SSL)
    requireTLS: !isSecure, // Enforce STARTTLS on port 587
    auth: {
      user,
      pass
    },
    tls: {
      rejectUnauthorized: false,
      minVersion: 'TLSv1.2'
    }
  });

  return { transporter, host, port, user, pass, isSecure };
}

// Helper: Generate Rich HTML Email Template
function buildDailyEmailHtml(samples: any[], stations: any[], targetDateStr: string): { html: string; text: string; urgentCount: number } {
  const stationMap = new Map<string, any>();
  stations.forEach(s => stationMap.set(s.id, s));

  const shapeMap: Record<string, string> = {
    cube_150: 'Mẫu vuông 150x150x150mm',
    cylinder_150_300: 'Mẫu trụ Ø150x300mm',
    waterproof_150: 'Mẫu trụ chống thấm',
    expansion: 'Mẫu bù co ngót',
    other: 'Mẫu quy cách đặc biệt',
  };

  const count = samples.length;
  const urgentCount = samples.filter(s => s.status === 'due_today' || s.status === 'overdue').length;

  let text = `📢 CÔNG TY CỔ PHẦN ĐẦU TƯ TASAGO\n`;
  text += `🔔 BÁO CÁO LỊCH NÉN MẪU BÊ TÔNG 07:00 SÁNG (${formatDateVN(targetDateStr)})\n`;
  text += `⏰ Thời gian phát: ${new Date().toLocaleTimeString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })} ngày ${formatDateVN(targetDateStr)}\n`;
  text += `-------------------------------------------\n\n`;

  samples.forEach((sample, idx) => {
    const station = stationMap.get(sample.stationId);
    const stationName = station ? station.name : 'Trạm Tasago';
    const shape = shapeMap[sample.sampleShape] || sample.sampleShape;
    const badge = sample.status === 'due_today' ? '[ĐẾN HẠN HÔM NAY]' : sample.status === 'overdue' ? '[QUÁ HẠN CHƯA NÉN]' : '[SẮP ĐẾN HẠN]';

    text += `${idx + 1}. ${badge} - ${sample.projectName}\n`;
    text += `   🏢 Trạm: ${stationName}\n`;
    text += `   🏗️ Hạng mục: ${sample.component} (${sample.volumeM3} m³)\n`;
    text += `   🧪 Mác: ${sample.concreteGrade} (Độ sụt: ${sample.slumpCm}cm)\n`;
    text += `   ⏱️ Tuổi nén: ${sample.ageType} (${sample.ageDays} ngày) - ${shape}\n`;
    text += `   📅 Đúc: ${formatDateVN(sample.castDate)} ➔ Nén: ${formatDateVN(sample.scheduledTestDate)}\n`;
    text += `   👤 Đơn vị thi công: ${sample.contractor}\n`;
    text += `   📞 Liên hệ: ${sample.contactPerson} - ${sample.contactPhone}\n`;
    text += `   👨‍🔬 KTV lấy mẫu: ${sample.samplerName}\n\n`;
  });

  text += `-------------------------------------------\n⚡ Ban Chỉ Huy Trạm & Phòng Thí nghiệm chuẩn bị máy nén và cập nhật kết quả lên Cổng Tasago.`;

  let html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Báo Cáo Lịch Nén Mẫu Tasago</title>
    </head>
    <body style="margin: 0; padding: 20px; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b;">
      <div style="max-width: 680px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); border: 1px solid #cbd5e1;">
        
        <!-- Header Banner -->
        <div style="background: linear-gradient(135deg, #065f46 0%, #047857 100%); color: #ffffff; padding: 24px 28px;">
          <div style="font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #a7f3d0; margin-bottom: 4px;">
            CÔNG TY CỔ PHẦN ĐẦU TƯ TASAGO
          </div>
          <h1 style="margin: 0; font-size: 20px; font-weight: 800; line-height: 1.3;">
            BÁO CÁO LỊCH NÉN MẪU BÊ TÔNG (07:00 SÁNG)
          </h1>
          <p style="margin: 6px 0 0 0; font-size: 13px; color: #e6fffa;">
            Ngày ${formatDateVN(targetDateStr)} • Tự động nhắc nhở lịch kiểm định chất lượng bê tông
          </p>
        </div>

        <!-- Alert Summary -->
        <div style="padding: 20px 24px; background: #f8fafc; border-bottom: 1px solid #e2e8f0;">
          <div style="background: #ecfdf5; border-left: 4px solid #059669; padding: 14px 16px; border-radius: 6px; display: flex; align-items: center; justify-content: space-between;">
            <div>
              <div style="font-weight: 700; color: #065f46; font-size: 14px;">
                🔔 Tổng cộng: <strong>${count} mẫu bê tông</strong> có lịch nén cần thực hiện
              </div>
              <div style="font-size: 12px; color: #047857; margin-top: 2px;">
                Trong đó có <strong style="color: #dc2626;">${urgentCount} mẫu</strong> đến hạn hôm nay hoặc quá hạn cần nén khẩn cấp.
              </div>
            </div>
          </div>
        </div>

        <!-- Sample List -->
        <div style="padding: 20px 24px;">
  `;

  samples.forEach((sample, idx) => {
    const station = stationMap.get(sample.stationId);
    const stationName = station ? station.name : 'Trạm Bê Tông Tasago';
    const shape = shapeMap[sample.sampleShape] || sample.sampleShape;
    const isUrgent = sample.status === 'due_today' || sample.status === 'overdue';
    const isOverdue = sample.status === 'overdue';

    html += `
      <div style="background: #ffffff; border: 1px solid ${isUrgent ? '#fca5a5' : '#e2e8f0'}; border-radius: 8px; padding: 16px; margin-bottom: 16px; box-shadow: 0 1px 3px rgba(0,0,0,0.04);">
        <div style="border-bottom: 1px solid #f1f5f9; padding-bottom: 8px; margin-bottom: 10px; display: flex; justify-content: space-between; align-items: center;">
          <span style="font-weight: 800; font-size: 15px; color: ${isUrgent ? '#991b1b' : '#0f766e'};">
            #${idx + 1}. ${sample.projectName}
          </span>
          <span style="background: ${isOverdue ? '#fee2e2' : isUrgent ? '#fef3c7' : '#e0f2fe'}; color: ${isOverdue ? '#991b1b' : isUrgent ? '#92400e' : '#0369a1'}; padding: 3px 10px; border-radius: 12px; font-size: 11px; font-weight: 800; text-transform: uppercase;">
            ${isOverdue ? '⚠️ QUÁ HẠN NÉN' : sample.status === 'due_today' ? '🔴 ĐẾN HẠN HÔM NAY' : '🔵 SẮP ĐẾN HẠN'}
          </span>
        </div>

        <table style="width: 100%; font-size: 13px; color: #334155; border-collapse: collapse; line-height: 1.6;">
          <tr>
            <td style="width: 38%; font-weight: 700; color: #64748b; padding: 3px 0;">Trạm sản xuất:</td>
            <td style="padding: 3px 0;"><strong style="color: #0f172a;">${stationName}</strong></td>
          </tr>
          <tr>
            <td style="font-weight: 700; color: #64748b; padding: 3px 0;">Hạng mục & Khối lượng:</td>
            <td style="padding: 3px 0;">${sample.component} — <strong style="color: #047857;">${sample.volumeM3} m³</strong></td>
          </tr>
          <tr>
            <td style="font-weight: 700; color: #64748b; padding: 3px 0;">Mác bê tông & Độ sụt:</td>
            <td style="padding: 3px 0;"><strong style="color: #0f766e;">${sample.concreteGrade}</strong> (Độ sụt: ${sample.slumpCm} cm)</td>
          </tr>
          <tr>
            <td style="font-weight: 700; color: #64748b; padding: 3px 0;">Tuổi nén & Quy cách:</td>
            <td style="padding: 3px 0;"><strong style="color: #dc2626;">${sample.ageType} (${sample.ageDays} ngày)</strong> • ${shape} (${sample.groupCount} tổ/${sample.pieceCount} viên)</td>
          </tr>
          <tr>
            <td style="font-weight: 700; color: #64748b; padding: 3px 0;">Ngày đúc ➔ Ngày nén:</td>
            <td style="padding: 3px 0;">${formatDateVN(sample.castDate)} ➔ <strong style="color: #b91c1c; font-size: 14px;">${formatDateVN(sample.scheduledTestDate)}</strong></td>
          </tr>
          <tr>
            <td style="font-weight: 700; color: #64748b; padding: 3px 0;">Đơn vị thi công:</td>
            <td style="padding: 3px 0;">${sample.contractor}</td>
          </tr>
          <tr>
            <td style="font-weight: 700; color: #64748b; padding: 3px 0;">Liên hệ công trình:</td>
            <td style="padding: 3px 0;"><strong>${sample.contactPerson}</strong> — SĐT: <a href="tel:${sample.contactPhone}" style="color: #0284c7; font-weight: 700; text-decoration: none;">${sample.contactPhone}</a></td>
          </tr>
          <tr>
            <td style="font-weight: 700; color: #64748b; padding: 3px 0;">KTV lấy mẫu:</td>
            <td style="padding: 3px 0;">${sample.samplerName}</td>
          </tr>
          ${sample.notes ? `
          <tr>
            <td style="font-weight: 700; color: #64748b; padding: 3px 0;">Ghi chú:</td>
            <td style="padding: 3px 0; color: #64748b; font-style: italic;">${sample.notes}</td>
          </tr>` : ''}
        </table>
      </div>
    `;
  });

  html += `
        </div>

        <!-- Footer -->
        <div style="padding: 16px 24px; background: #0f172a; color: #94a3b8; font-size: 12px; text-align: center; border-top: 1px solid #1e293b;">
          <div style="font-weight: 700; color: #cbd5e1; margin-bottom: 4px;">
            CÔNG TY CỔ PHẦN ĐẦU TƯ TASAGO — HỆ THỐNG KIỂM ĐỊNH CHẤT LƯỢNG BÊ TÔNG
          </div>
          <div>BÊ TÔNG XANH SÀI GÒN • BÊ TÔNG CỦA MỌI CÔNG TRÌNH</div>
          <div style="margin-top: 8px; font-size: 11px; color: #64748b;">
            Email này được gửi tự động mỗi 07:00 sáng từ máy chủ cổng Portal Tasago.
          </div>
        </div>

      </div>
    </body>
    </html>
  `;

  return { html, text, urgentCount };
}

async function startServer() {
  try {
    if (supabaseConfigured) {
      serverState = await loadSupabaseState(serverState);
      let changed = false;
      for (const user of serverState.users || []) {
        if (user && typeof user.password === 'string' && user.password && !isHashedPassword(user.password)) {
          user.password = hashPassword(user.password);
          changed = true;
        }
      }
      if (changed) await persistSupabaseState(serverState);
    } else if (process.env.NODE_ENV === 'production') {
      throw new Error('Production yêu cầu SUPABASE_URL và SUPABASE_SERVICE_ROLE_KEY. Dữ liệu sẽ không được lưu vào filesystem ephemeral.');
    }
  } catch (error: any) {
    console.error('[STARTUP DATA STORE ERROR]', error?.message || error);
    process.exitCode = 1;
    return;
  }

  const app = express();
  const PORT = 3000;

  // JSON & URL-encoded parsers
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // CORS headers for local APIs.
  // FRONTEND_ORIGIN was already declared as an env var in render.yaml but was
  // never actually read anywhere — the server always sent '*', which allows
  // ANY website to call these APIs from a user's browser. If FRONTEND_ORIGIN
  // is set, restrict to it; otherwise fall back to '*' to avoid breaking
  // existing local/dev setups that haven't configured it yet.
  const allowedOrigin = process.env.FRONTEND_ORIGIN || '*';
  app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
    if (allowedOrigin !== '*') {
      res.setHeader('Vary', 'Origin');
    }
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') {
      return res.sendStatus(200);
    }
    next();
  });

  // ============================================================
  // AUTH MIDDLEWARE
  // ============================================================
  // Every route below that touches shared/sensitive data requires a valid
  // Bearer token (from the Authorization header, or ?token= for the SSE
  // stream, since EventSource can't set custom headers). Public endpoints:
  // /api/health and /api/auth/login.
  function requireAuth(req: express.Request, res: express.Response, next: express.NextFunction) {
    const header = req.headers['authorization'];
    const headerToken = typeof header === 'string' && header.startsWith('Bearer ') ? header.slice(7) : undefined;
    const queryToken = typeof req.query?.token === 'string' ? req.query.token : undefined;
    const token = headerToken || queryToken;

    const claims = verifyToken(token);
    if (!claims) {
      return res.status(401).json({ success: false, message: 'Chưa đăng nhập hoặc phiên đã hết hạn. Vui lòng đăng nhập lại.' });
    }
    const user = ((serverState as any).users || []).find((u: any) => u.id === claims.userId);
    if (!user || user.active === false) {
      return res.status(401).json({ success: false, message: 'Tài khoản không tồn tại hoặc đã bị vô hiệu hóa.' });
    }
    (req as any).authUser = user;
    next();
  }

  function requireAdmin(req: express.Request, res: express.Response, next: express.NextFunction) {
    if ((req as any).authUser?.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Bạn không có quyền quản trị thao tác này.' });
    }
    next();
  }

  // Login: the only write endpoint that stays public (it's how you get a token).
  app.post('/api/auth/login', (req, res) => {
    try {
      const { username, password } = req.body || {};
      if (!username || !password) {
        return res.status(400).json({ success: false, message: 'Vui lòng nhập tên đăng nhập và mật khẩu.' });
      }
      const users = (serverState as any).users || [];
      const user = users.find((u: any) => u.username?.toLowerCase() === String(username).trim().toLowerCase());

      if (!user || !verifyPassword(password, user.password)) {
        return res.status(401).json({ success: false, message: 'Tên đăng nhập hoặc mật khẩu không chính xác.' });
      }
      if (user.active === false) {
        return res.status(403).json({ success: false, message: 'Tài khoản đã bị vô hiệu hóa.' });
      }

      // Upgrade legacy plaintext password to hashed form on successful login.
      if (!isHashedPassword(user.password)) {
        user.password = hashPassword(password);
        void savePersistedState(serverState).catch(error => console.error('[AUTH PASSWORD SAVE ERROR]', error));
      }

      const token = issueToken(user);
      return res.json({ success: true, token, user: sanitizeUser(user) });
    } catch (e: any) {
      return res.status(500).json({ success: false, message: e.message });
    }
  });

  // Lets the client silently check (when online) whether its cached token is
  // still valid, without forcing a full re-login. Also used to refresh the
  // cached user profile.
  app.get('/api/auth/verify', requireAuth, (req, res) => {
    return res.json({ success: true, user: sanitizeUser((req as any).authUser) });
  });

  // Set of active SSE (Server-Sent Events) clients for real-time instantaneous sync across all tabs & devices
  const sseClients = new Set<express.Response>();

  function broadcastSseEvent(eventData: any) {
    const payload = `data: ${JSON.stringify(eventData)}\n\n`;
    for (const client of sseClients) {
      try {
        client.write(payload);
      } catch {
        sseClients.delete(client);
      }
    }
  }

  // Health check endpoint
  app.get('/api/health', (req, res) => {
    const vnTime = new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
    res.json({ 
      status: 'ok', 
      service: 'Tasago Concrete Testing Portal Backend',
      vietnamTime: vnTime,
      nodeVersion: process.version,
      connectedClients: sseClients.size,
      cronStatus: {
        lastCronDate: serverState.lastCronDate,
        lastCronLog: serverState.lastCronLog,
        sampleCount: serverState.samples.length,
        recipients: serverState.config.emailRecipients
      }
    });
  });

  // Real-time Server-Sent Events (SSE) stream for instant zero-latency multi-user sync
  app.get('/api/events', requireAuth, (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();

    // Send initial handshake
    res.write(`data: ${JSON.stringify({ 
      type: 'INIT_HANDSHAKE', 
      timestamp: Date.now(), 
      totalSamples: (serverState.samples || []).length,
      totalStations: (serverState.stations || []).length,
      serverTime: new Date().toISOString()
    })}\n\n`);

    sseClients.add(res);

    const keepAlive = setInterval(() => {
      try {
        res.write(': ping\n\n');
      } catch {
        clearInterval(keepAlive);
        sseClients.delete(res);
      }
    }, 15000);

    req.on('close', () => {
      clearInterval(keepAlive);
      sseClients.delete(res);
    });
  });

  // 1. Sync & Data Endpoints
  // Get all users
  app.get('/api/users', requireAuth, (req, res) => {
    return res.json({ success: true, users: sanitizeUsers((serverState as any).users || []) });
  });

  // Save/Update users (atomic upsert or list).
  // Passwords are hashed here (never trust/store what the client sends as
  // plaintext), and a blank/omitted password on an EDIT means "keep the
  // existing password" — this matters because responses no longer include
  // the real password (see sanitizeUser), so the admin UI can't round-trip
  // it back to us anymore, and shouldn't need to.
  app.post('/api/users', requireAuth, requireAdmin, async (req, res) => {
    try {
      const { users, user } = req.body;
      let currentUsers = (serverState as any).users || [];

      const prepareIncomingUser = (incoming: any, existing: any) => {
        const merged = { ...(existing || {}), ...incoming };
        if (incoming.password && incoming.password.trim()) {
          merged.password = hashPassword(incoming.password.trim());
        } else {
          // No new password supplied — keep whatever was already stored.
          merged.password = existing?.password;
        }
        return merged;
      };

      if (user && typeof user === 'object' && user.id) {
        const existingIdx = currentUsers.findIndex((u: any) => u.id === user.id || (user.username && u.username === user.username));
        if (existingIdx >= 0) {
          currentUsers[existingIdx] = prepareIncomingUser(user, currentUsers[existingIdx]);
        } else {
          if (!user.password || !user.password.trim()) {
            return res.status(400).json({ success: false, message: 'Vui lòng đặt mật khẩu cho tài khoản mới.' });
          }
          currentUsers = [...currentUsers, prepareIncomingUser(user, null)];
        }
        (serverState as any).users = currentUsers;
      } else if (Array.isArray(users)) {
        const existingById = new Map(currentUsers.map((u: any) => [u.id, u]));
        (serverState as any).users = users.map((u: any) => prepareIncomingUser(u, existingById.get(u.id)));
      }

      await savePersistedState(serverState);
      broadcastSseEvent({
        type: 'USERS_UPDATED',
        users: sanitizeUsers((serverState as any).users),
        timestamp: Date.now()
      });
      return res.json({ success: true, users: sanitizeUsers((serverState as any).users) });
    } catch (e: any) {
      return res.status(500).json({ success: false, message: e.message });
    }
  });

  // Delete user endpoint
  app.post('/api/users/delete', requireAuth, requireAdmin, async (req, res) => {
    try {
      const { id } = req.body;
      if (!id) return res.status(400).json({ success: false, message: 'Missing user ID' });
      let currentUsers = (serverState as any).users || [];

      const target = currentUsers.find((u: any) => u.id === id);
      if (!target) {
        return res.status(404).json({ success: false, message: 'Không tìm thấy người dùng' });
      }
      // Do not allow deleting the root 'admin' account, and never allow
      // deleting the last remaining admin account (previously this only
      // checked username === 'admin', so any OTHER admin account could be
      // deleted freely, potentially locking the system with zero admins).
      const remainingAdmins = currentUsers.filter((u: any) => u.role === 'admin' && u.id !== id);
      if (target.username === 'admin' || (target.role === 'admin' && remainingAdmins.length === 0)) {
        return res.status(400).json({ success: false, message: 'Không thể xóa tài khoản admin cuối cùng của hệ thống' });
      }

      currentUsers = currentUsers.filter((u: any) => u.id !== id);
      (serverState as any).users = currentUsers;
      await savePersistedState(serverState);
      broadcastSseEvent({
        type: 'USERS_UPDATED',
        users: sanitizeUsers(currentUsers),
        timestamp: Date.now()
      });
      return res.json({ success: true, users: sanitizeUsers(currentUsers) });
    } catch (e: any) {
      return res.status(500).json({ success: false, message: e.message });
    }
  });

  // Get all samples
  app.get('/api/samples', requireAuth, (req, res) => {
    return res.json({ success: true, samples: getCurrentSamples() });
  });

  // Save/Update a single sample or list of samples (Upsert without losing other users' data)
  app.post('/api/samples/save', requireAuth, async (req, res) => {
    try {
      const { sample, samples, actionBy } = req.body;
      let currentSamples = [...(serverState.samples || [])];
      let savedSampleResult: any = null;

      if (sample && typeof sample === 'object' && sample.id) {
        const idx = currentSamples.findIndex((s: any) => s.id === sample.id);
        if (idx >= 0) {
          currentSamples[idx] = { ...currentSamples[idx], ...sample, updatedAt: new Date().toISOString() };
          savedSampleResult = currentSamples[idx];
        } else {
          currentSamples = [sample, ...currentSamples];
          savedSampleResult = sample;
        }
        serverState.samples = currentSamples;
      } else if (Array.isArray(samples)) {
        // Upsert array of samples
        const sampleMap = new Map<string, any>();
        currentSamples.forEach((s: any) => sampleMap.set(s.id, s));
        samples.forEach((s: any) => {
          if (s && s.id) {
            sampleMap.set(s.id, s);
          }
        });
        serverState.samples = Array.from(sampleMap.values());
      } else {
        return res.status(400).json({ success: false, message: 'Invalid sample payload' });
      }

      await savePersistedState(serverState);

      // Instant Real-time Push to all connected Admin and Member screens
      broadcastSseEvent({
        type: 'SAMPLE_SAVED',
        sample: savedSampleResult || sample,
        samples: serverState.samples,
        actionBy: actionBy || sample?.createdByName || sample?.samplerName || 'Thành viên trạm',
        stationId: sample?.stationId,
        timestamp: Date.now()
      });

      return res.json({ 
        success: true, 
        message: 'Đã lưu mẫu bê tông lên máy chủ trung tâm thành công', 
        samples: serverState.samples,
        sample: savedSampleResult || sample
      });
    } catch (e: any) {
      return res.status(500).json({ success: false, message: e.message });
    }
  });

  // Delete sample endpoint
  app.post('/api/samples/delete', requireAuth, async (req, res) => {
    try {
      const { id } = req.body;
      if (!id) return res.status(400).json({ success: false, message: 'Missing sample ID' });
      serverState.samples = (serverState.samples || []).filter((s: any) => s.id !== id);
      await savePersistedState(serverState);

      broadcastSseEvent({
        type: 'SAMPLE_DELETED',
        sampleId: id,
        samples: serverState.samples,
        timestamp: Date.now()
      });

      return res.json({ 
        success: true, 
        message: 'Đã xóa mẫu bê tông khỏi máy chủ trung tâm', 
        samples: serverState.samples 
      });
    } catch (e: any) {
      return res.status(500).json({ success: false, message: e.message });
    }
  });

  // Save/Update samples (Legacy bulk replace support)
  app.post('/api/samples', requireAuth, async (req, res) => {
    try {
      const { samples } = req.body;
      if (Array.isArray(samples)) {
        serverState.samples = samples;
        await savePersistedState(serverState);
        broadcastSseEvent({
          type: 'SAMPLES_SYNCED',
          samples: serverState.samples,
          timestamp: Date.now()
        });
        return res.json({ success: true, count: samples.length, samples: serverState.samples });
      }
      return res.status(400).json({ success: false, message: 'Invalid samples array' });
    } catch (e: any) {
      return res.status(500).json({ success: false, message: e.message });
    }
  });

  // Get all stations
  app.get('/api/stations', requireAuth, (req, res) => {
    return res.json({ success: true, stations: serverState.stations || [] });
  });

  // Save/Update stations
  app.post('/api/stations', requireAuth, requireAdmin, async (req, res) => {
    try {
      const { stations, station } = req.body;
      if (station && station.id) {
        let currentStations = [...(serverState.stations || [])];
        const idx = currentStations.findIndex((s: any) => s.id === station.id);
        if (idx >= 0) {
          currentStations[idx] = { ...currentStations[idx], ...station };
        } else {
          currentStations.push(station);
        }
        serverState.stations = currentStations;
      } else if (Array.isArray(stations)) {
        serverState.stations = stations;
      }
      await savePersistedState(serverState);
      broadcastSseEvent({
        type: 'STATIONS_UPDATED',
        stations: serverState.stations,
        timestamp: Date.now()
      });
      return res.json({ success: true, count: serverState.stations.length, stations: serverState.stations });
    } catch (e: any) {
      return res.status(500).json({ success: false, message: e.message });
    }
  });

  // State Fetch / Sync Endpoint
  app.get('/api/server-sync', requireAuth, (req, res) => {
    return res.json({
      success: true,
      users: sanitizeUsers((serverState as any).users || []),
      samples: serverState.samples || [],
      stations: serverState.stations || [],
      config: sanitizeConfig(serverState.config),
      notificationLogs: serverState.notificationLogs || [],
      lastCronDate: serverState.lastCronDate,
      lastCronLog: serverState.lastCronLog,
      timestamp: Date.now()
    });
  });

  // Persist notification history centrally instead of keeping it only in a browser.
  app.post('/api/notification-logs', requireAuth, async (req, res) => {
    try {
      const { log } = req.body || {};
      if (!log || typeof log !== 'object' || !log.id) {
        return res.status(400).json({ success: false, message: 'Invalid notification log payload' });
      }
      const logs = Array.isArray(serverState.notificationLogs) ? serverState.notificationLogs : [];
      serverState.notificationLogs = [log, ...logs.filter((item: any) => item.id !== log.id)].slice(0, 100);
      await savePersistedState(serverState);
      return res.json({ success: true, notificationLogs: serverState.notificationLogs });
    } catch (e: any) {
      return res.status(500).json({ success: false, message: e.message });
    }
  });

  // Reconcile an incoming user object (from a client sync/restore payload)
  // against what's already stored, WITHOUT ever accepting a client-supplied
  // value as the final stored password unless it's a genuine new plaintext
  // password. This matters here specifically because:
  //  - normal sync payloads no longer carry a real password at all (GET
  //    responses are sanitized), so `incoming.password` will usually be absent
  //  - a restored backup file carries the literal string '[PROTECTED]' for
  //    password (see exportAllDataAsJsonString) — that string must never be
  //    written into the password field, or every restored account would
  //    literally have the password "[PROTECTED]".
  function reconcileIncomingUser(incoming: any, existing: any) {
    const merged = { ...(existing || {}), ...incoming };
    const supplied = typeof incoming.password === 'string' ? incoming.password.trim() : '';
    if (!supplied || supplied === '[PROTECTED]') {
      merged.password = existing?.password;
    } else if (!isHashedPassword(supplied)) {
      merged.password = hashPassword(supplied);
    } else {
      merged.password = supplied;
    }
    return merged;
  }

  // 1. Sync State from Frontend to Server (Smart merge or restore)
  app.post('/api/server-sync', requireAuth, async (req, res) => {
    try {
      const { samples, stations, config, users, notificationLogs, action } = req.body;
      const isAdmin = (req as any).authUser?.role === 'admin';
      if (!isAdmin && (config !== undefined || users !== undefined || stations !== undefined || action === 'restore_full_backup')) {
        return res.status(403).json({ success: false, message: 'Chỉ admin mới được thay đổi cấu hình, người dùng, trạm hoặc khôi phục backup.' });
      }

      if (action === 'restore_full_backup') {
        // Complete full overwrite on intentional backup restore
        if (Array.isArray(samples)) serverState.samples = samples;
        if (Array.isArray(stations)) serverState.stations = stations;
        if (Array.isArray(users)) {
          const existingById = new Map(((serverState as any).users || []).map((u: any) => [u.id, u]));
          (serverState as any).users = users.map((u: any) => reconcileIncomingUser(u, existingById.get(u.id)));
        }
        if (config && typeof config === 'object') {
          serverState.config = mergeConfigPreservingSecrets(serverState.config, config);
        }
        if (Array.isArray(notificationLogs)) {
          serverState.notificationLogs = notificationLogs.slice(0, 100);
        }
      } else {
        // Smart merge: merge incoming items by ID without destroying existing items
        if (Array.isArray(samples) && samples.length > 0) {
          const sampleMap = new Map<string, any>();
          // Existing server samples
          (serverState.samples || []).forEach((s: any) => sampleMap.set(s.id, s));
          // Incoming samples (update or insert)
          samples.forEach((s: any) => {
            if (s && s.id) {
              const existing = sampleMap.get(s.id);
              if (!existing) {
                sampleMap.set(s.id, s);
              } else {
                // If incoming has newer update, take it
                const existingTime = new Date(existing.updatedAt || existing.createdAt || 0).getTime();
                const incomingTime = new Date(s.updatedAt || s.createdAt || 0).getTime();
                if (incomingTime >= existingTime) {
                  sampleMap.set(s.id, { ...existing, ...s });
                }
              }
            }
          });
          serverState.samples = Array.from(sampleMap.values());
        }

        if (Array.isArray(users) && users.length > 0) {
          const userMap = new Map<string, any>();
          ((serverState as any).users || []).forEach((u: any) => userMap.set(u.id || u.username, u));
          users.forEach((u: any) => {
            if (u && (u.id || u.username)) {
              const key = u.id || u.username;
              userMap.set(key, reconcileIncomingUser(u, userMap.get(key)));
            }
          });
          (serverState as any).users = Array.from(userMap.values());
        }

        if (Array.isArray(stations) && stations.length > 0) {
          const stationMap = new Map<string, any>();
          (serverState.stations || []).forEach((st: any) => stationMap.set(st.id, st));
          stations.forEach((st: any) => {
            if (st && st.id) {
              stationMap.set(st.id, st);
            }
          });
          serverState.stations = Array.from(stationMap.values());
        }

        if (config && typeof config === 'object') {
          serverState.config = mergeConfigPreservingSecrets(serverState.config, config);
        }
        if (Array.isArray(notificationLogs) && notificationLogs.length > 0) {
          const logMap = new Map<string, any>();
          (serverState.notificationLogs || []).forEach((log: any) => logMap.set(log.id, log));
          notificationLogs.forEach((log: any) => {
            if (log && log.id) logMap.set(log.id, log);
          });
          serverState.notificationLogs = Array.from(logMap.values()).slice(-100).reverse();
        }
      }

      await savePersistedState(serverState);

      broadcastSseEvent({
        type: 'FULL_SYNC',
        samples: serverState.samples,
        stations: serverState.stations,
        users: sanitizeUsers((serverState as any).users),
        config: sanitizeConfig(serverState.config),
        notificationLogs: serverState.notificationLogs || [],
        timestamp: Date.now()
      });

      return res.status(200).json({
        success: true,
        message: `Đồng bộ máy chủ thành công! (${serverState.samples.length} mẫu bê tông, ${serverState.stations.length} trạm trộn, ${((serverState as any).users || []).length} tài khoản).`,
        config: sanitizeConfig(serverState.config),
        users: sanitizeUsers((serverState as any).users || []),
        samples: serverState.samples,
        stations: serverState.stations,
        notificationLogs: serverState.notificationLogs || [],
        timestamp: Date.now()
      });
    } catch (e: any) {
      return res.status(500).json({ success: false, message: e.message });
    }
  });

  // 2. Test/Verify SMTP Connection (e.g. Gmail STARTTLS port 587)
  app.post('/api/notifications/verify-smtp', requireAuth, async (req, res) => {
    try {
      const { smtpConfig } = req.body;
      const { transporter, host, port, user, pass, isSecure } = createSmtpTransporter(smtpConfig);

      if (!user) {
        return res.status(400).json({
          success: false,
          message: 'Vui lòng nhập địa chỉ Email tài khoản gửi (ví dụ: tasagotnt@gmail.com).'
        });
      }

      if (!pass) {
        return res.status(400).json({
          success: false,
          message: 'Vui lòng nhập Mật khẩu ứng dụng (Google App Password 16 ký tự).'
        });
      }

      // Verify connection and authentication
      await transporter.verify();

      return res.status(200).json({
        success: true,
        message: `Kết nối máy chủ SMTP ${host}:${port} (${isSecure ? 'SSL' : 'STARTTLS'}) thành công! Tài khoản "${user}" đã xác thực hợp lệ và sẵn sàng gửi email tự động.`,
        details: {
          host,
          port,
          user,
          protocol: isSecure ? 'SSL (Port 465)' : 'STARTTLS (Port 587)',
          status: 'AUTHENTICATED'
        }
      });
    } catch (error: any) {
      console.error('Lỗi khi kiểm tra SMTP:', error);
      let note = '';
      if (error.message?.includes('535') || error.message?.includes('BadCredentials') || error.message?.includes('Username and Password not accepted')) {
        note = ' (Gợi ý cho Gmail: Bạn cần dùng Mật khẩu ứng dụng 16 ký tự tạo tại myaccount.google.com/apppasswords thay vì mật khẩu đăng nhập cá nhân).';
      }
      return res.status(500).json({
        success: false,
        message: `Không thể kết nối máy chủ SMTP: ${error.message}${note}`,
        error: error.message
      });
    }
  });

  // 3. API Route: Send Real Email Notification via SMTP, Resend, or Google Apps Script Webhook
  app.post('/api/notifications/send-email', requireAuth, async (req, res) => {
    try {
      const {
        recipients,
        subject,
        html,
        plainText,
        smtpConfig,
        emailServiceUrl
      } = req.body;

      if (!recipients || !Array.isArray(recipients) || recipients.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Danh sách địa chỉ email người nhận không được để trống.'
        });
      }

      const validRecipients = recipients
        .map((r: string) => r.trim())
        .filter((r: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(r));

      if (validRecipients.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Không có địa chỉ email hợp lệ nào trong danh sách.'
        });
      }

      const todayStr = new Date().toLocaleDateString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
      const emailSubject = subject || `[TASAGO] Báo Cáo Lịch Nén Mẫu Bê Tông 07:00 Sáng - ${todayStr}`;
      const senderName = smtpConfig?.smtpFrom || serverState.config.emailSender || process.env.SMTP_FROM || 'Bê Tông Tasago <tasagotnt@gmail.com>';

      // Method 1: Google Apps Script Web App Endpoint / Custom Webhook Mailer
      const targetServiceUrl = emailServiceUrl || smtpConfig?.emailServiceUrl || serverState.config.emailServiceUrl || process.env.EMAIL_SERVICE_URL;
      if (targetServiceUrl && targetServiceUrl.startsWith('http')) {
        try {
          const webhookRes = await fetch(targetServiceUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'SEND_DAILY_SAMPLE_EMAIL',
              company: 'CÔNG TY CỔ PHẦN ĐẦU TƯ TASAGO',
              recipients: validRecipients,
              subject: emailSubject,
              html: html,
              text: plainText,
              timestamp: new Date().toISOString()
            })
          });

          if (webhookRes.ok) {
            return res.status(200).json({
              success: true,
              channel: 'google_apps_script_mailer',
              message: `Đã gửi email thành công tới ${validRecipients.length} địa chỉ qua Webhook Mail Service (${validRecipients.join(', ')}).`,
              recipients: validRecipients
            });
          }
        } catch (webhookErr: any) {
          console.warn('Webhook mailer error, falling back to SMTP:', webhookErr.message);
        }
      }

      // Method 2: Nodemailer SMTP Server (Gmail STARTTLS Port 587 / SSL Port 465)
      const { transporter, host, user, pass, isSecure } = createSmtpTransporter(smtpConfig);

      if (host && user && pass) {
        const info = await transporter.sendMail({
          from: senderName.includes('<') ? senderName : `Bê Tông Tasago <${user}>`,
          to: validRecipients.join(', '),
          subject: emailSubject,
          text: plainText,
          html: html
        });

        return res.status(200).json({
          success: true,
          channel: 'smtp_transport',
          message: `Đã gửi email thành công tới ${validRecipients.length} địa chỉ (${validRecipients.join(', ')}) qua máy chủ SMTP (${host}:${isSecure ? 465 : 587})!`,
          messageId: info.messageId,
          recipients: validRecipients
        });
      }

      // Method 3: Resend API if API Key is configured in environment
      if (process.env.RESEND_API_KEY) {
        try {
          const resendRes = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${process.env.RESEND_API_KEY}`
            },
            body: JSON.stringify({
              from: senderName.includes('<') ? senderName : `Tasago Portal <${senderName}>`,
              to: validRecipients,
              subject: emailSubject,
              html: html,
              text: plainText
            })
          });

          const resendData = await resendRes.json();
          if (resendRes.ok) {
            return res.status(200).json({
              success: true,
              channel: 'resend_api',
              message: `Đã gửi email thành công tới ${validRecipients.length} người nhận qua Resend API!`,
              id: resendData.id,
              recipients: validRecipients
            });
          }
        } catch (resendErr: any) {
          console.warn('Resend API attempt note:', resendErr.message);
        }
      }

      // Method 4: Ready Mode with complete instructions
      return res.status(200).json({
        success: true,
        channel: 'ready_mode',
        message: `Đã đóng gói bản tin HTML hoàn chỉnh cho ${validRecipients.length} email (${validRecipients.join(', ')}). Nhập mật khẩu ứng dụng Gmail vào mục Cài Đặt SMTP để gửi trực tiếp 24/7.`,
        recipients: validRecipients,
        previewSubject: emailSubject
      });

    } catch (error: any) {
      console.error('Lỗi khi gửi email:', error);
      return res.status(500).json({
        success: false,
        message: `Lỗi khi phát email: ${error.message}`
      });
    }
  });

  // 4. API Route: Test Zalo Bot Webhook (Personal & Group)
  app.post('/api/notifications/test-zalo', requireAuth, async (req, res) => {
    try {
      const { webhookUrl, botToken, personalPhone, groupId } = req.body;
      const targetWebhook = webhookUrl || serverState.config.zaloWebhookUrl || process.env.ZALO_WEBHOOK_URL;
      const targetPhone = personalPhone || serverState.config.zaloPersonalPhone || '0942320923';
      const targetGroup = groupId || serverState.config.zaloGroupId || 'Nhóm Kỹ Thuật Tasago';
      const token = botToken || serverState.config.zaloBotToken || process.env.ZALO_BOT_TOKEN;

      if (!targetWebhook || !targetWebhook.startsWith('http')) {
        return res.status(400).json({
          success: false,
          message: 'Vui lòng cung cấp URL Webhook hợp lệ (bắt đầu bằng http:// hoặc https://).'
        });
      }

      const vnNow = new Date().toLocaleTimeString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
      const vnDate = formatDateVN(getVietnamDateIso());
      const testMsg = `🔔 [TASAGO BOT ZALO TEST]\n⏰ Thời gian: ${vnNow} ngày ${vnDate}\n👤 Người nhận Zalo cá nhân: ${targetPhone}\n👥 Nhóm nhận: ${targetGroup}\n✅ Kết nối Webhook Bot Zalo thành công! Hệ thống kiểm định nén mẫu bê tông sẵn sàng phát thông báo tự động 07:00 Sáng.`;

      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const webhookResponse = await fetch(targetWebhook, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          event: 'TEST_ZALO_BOT_PING',
          app: 'Tasago Concrete Testing System',
          timestamp: new Date().toISOString(),
          vietnamTime: `${vnNow} ${vnDate}`,
          recipient_phone: targetPhone,
          group_id: targetGroup,
          message: testMsg,
          text: testMsg
        })
      });

      const responseText = await webhookResponse.text().catch(() => '');

      return res.status(200).json({
        success: webhookResponse.ok || webhookResponse.status < 400,
        status: webhookResponse.status,
        message: webhookResponse.ok 
          ? `Đã gửi gói tin thử nghiệm thành công tới Webhook Bot Zalo! (HTTP ${webhookResponse.status})`
          : `Máy chủ Webhook phản hồi HTTP ${webhookResponse.status}: ${responseText.slice(0, 150)}`,
        targetPhone,
        targetGroup
      });
    } catch (e: any) {
      console.error('Lỗi khi test Zalo Bot:', e);
      return res.status(500).json({
        success: false,
        message: `Không thể kết nối Webhook Bot Zalo: ${e.message}`
      });
    }
  });

  // 5. API Route: Send Real Zalo Bot Notification (Personal & Group)
  app.post('/api/notifications/send-zalo', requireAuth, async (req, res) => {
    try {
      const { 
        samples, 
        stations, 
        webhookUrl, 
        botToken, 
        personalPhone, 
        groupId, 
        recipientType,
        customMessage 
      } = req.body;

      const targetWebhook = webhookUrl || serverState.config.zaloWebhookUrl || process.env.ZALO_WEBHOOK_URL;
      const targetPhone = personalPhone || serverState.config.zaloPersonalPhone || '0942320923';
      const targetGroup = groupId || serverState.config.zaloGroupId || 'Nhóm Kỹ Thuật Tasago';
      const token = botToken || serverState.config.zaloBotToken || process.env.ZALO_BOT_TOKEN;

      const targetSamples = Array.isArray(samples) && samples.length > 0 ? samples : getCurrentSamples();
      const targetStations = Array.isArray(stations) && stations.length > 0 ? stations : serverState.stations;
      const todayIso = getVietnamDateIso();

      const { text, urgentCount } = buildDailyEmailHtml(targetSamples, targetStations, todayIso);
      const messageContent = customMessage || text;

      if (!targetWebhook || !targetWebhook.startsWith('http')) {
        return res.status(200).json({
          success: true,
          channel: 'ready_mode_zalo',
          message: `Đã đóng gói bản tin Zalo cho ${targetSamples.length} mẫu nén. Bạn có thể mở zalo.me/${targetPhone} để gửi nhanh hoặc cài đặt Webhook Google Apps Script để bắn tự động.`,
          personalPhone: targetPhone,
          groupName: targetGroup,
          sampleCount: targetSamples.length,
          urgentCount
        });
      }

      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const webhookResponse = await fetch(targetWebhook, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          event: 'SAMPLE_COMPRESSION_DAILY_REMINDER',
          company: 'CÔNG TY CỔ PHẦN ĐẦU TƯ TASAGO',
          timestamp: new Date().toISOString(),
          recipient_type: recipientType || 'both',
          recipient_phone: targetPhone,
          group_id: targetGroup,
          urgent_count: urgentCount,
          sample_count: targetSamples.length,
          message: messageContent,
          text: messageContent,
          samples: targetSamples.map(s => ({
            id: s.id,
            sampleCode: s.sampleCode,
            projectName: s.projectName,
            component: s.component,
            volumeM3: s.volumeM3,
            grade: s.concreteGrade,
            ageType: s.ageType,
            castDate: s.castDate,
            scheduledDate: s.scheduledTestDate,
            contractor: s.contractor,
            contactPerson: s.contactPerson,
            contactPhone: s.contactPhone,
            samplerName: s.samplerName,
            status: s.status
          }))
        })
      });

      const responseText = await webhookResponse.text().catch(() => '');

      return res.status(200).json({
        success: webhookResponse.ok || webhookResponse.status < 400,
        status: webhookResponse.status,
        message: webhookResponse.ok
          ? `Đã bắn tin tự động thành công qua Webhook Bot Zalo (${recipientType === 'personal' ? 'Zalo Cá Nhân ' + targetPhone : recipientType === 'group' ? 'Nhóm Zalo ' + targetGroup : 'Cả Cá Nhân & Nhóm'})!`
          : `Gửi Webhook Zalo (HTTP ${webhookResponse.status}): ${responseText.slice(0, 150)}`,
        urgentCount,
        sampleCount: targetSamples.length
      });

    } catch (e: any) {
      console.error('Lỗi khi gửi Zalo Bot:', e);
      return res.status(500).json({
        success: false,
        message: `Lỗi kết nối Webhook Zalo Bot: ${e.message}`
      });
    }
  });

  // 6. Trigger 07:00 AM Cron Manually on Server (Email + Zalo Bot)
  app.post('/api/cron/trigger', requireAuth, async (req, res) => {
    try {
      const todayIso = getVietnamDateIso();
      const urgentSamples = getCurrentSamples().filter(
        s => s.status === 'due_today' || s.status === 'overdue'
      );

      const targetSamples = urgentSamples.length > 0 ? urgentSamples : getCurrentSamples().slice(0, 5);
      const emailRecipients = serverState.config.emailRecipients || ['thanhtgndt@gmail.com', 'kythuat@tasago.vn'];

      if (targetSamples.length === 0) {
        return res.json({
          success: true,
          message: 'Không có mẫu nén nào để kích hoạt gửi thông báo.'
        });
      }

      const { html, text } = buildDailyEmailHtml(targetSamples, serverState.stations, todayIso);
      const logParts: string[] = [];

      // 1. Email via SMTP
      if (serverState.config.autoEmailEnabled) {
        const { transporter, host, user, pass } = createSmtpTransporter(serverState.config);
        if (host && user && pass) {
          try {
            const info = await transporter.sendMail({
              from: serverState.config.emailSender || `Bê Tông Tasago <${user}>`,
              to: emailRecipients.join(', '),
              subject: `[TASAGO] Báo Cáo Lịch Nén Mẫu Bê Tông 07:00 Sáng - ${formatDateVN(todayIso)}`,
              text: text,
              html: html
            });
            logParts.push(`Email SMTP thành công (${info.messageId})`);
          } catch (mErr: any) {
            logParts.push(`Email SMTP lỗi: ${mErr.message}`);
          }
        }
      }

      // 2. Zalo Webhook Bot
      if (serverState.config.autoZaloEnabled && serverState.config.zaloWebhookUrl?.startsWith('http')) {
        try {
          const zRes = await fetch(serverState.config.zaloWebhookUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(serverState.config.zaloBotToken ? { 'Authorization': `Bearer ${serverState.config.zaloBotToken}` } : {})
            },
            body: JSON.stringify({
              event: 'CRON_07AM_TASAGO_SAMPLE_ALERT',
              company: 'CÔNG TY CỔ PHẦN ĐẦU TƯ TASAGO',
              timestamp: new Date().toISOString(),
              recipient_phone: serverState.config.zaloPersonalPhone || '0942320923',
              group_id: serverState.config.zaloGroupId || 'Nhóm Kỹ Thuật Tasago',
              message: text,
              samples: targetSamples
            })
          });
          logParts.push(`Zalo Bot Webhook HTTP ${zRes.status}`);
        } catch (zErr: any) {
          logParts.push(`Zalo Bot lỗi: ${zErr.message}`);
        }
      }

      const resultSummary = logParts.length > 0 ? logParts.join(' | ') : 'Đã chuẩn bị bản tin hoàn tất';
      serverState.lastCronDate = todayIso;
      serverState.lastCronLog = `[Thủ công 07:00 AM] Phát thông báo lúc ${new Date().toLocaleTimeString('vi-VN')} cho ${targetSamples.length} mẫu nén. Kết quả: ${resultSummary}`;
      await savePersistedState(serverState);

      return res.json({
        success: true,
        message: serverState.lastCronLog,
        sampleCount: targetSamples.length,
        recipients: emailRecipients
      });
    } catch (e: any) {
      console.error('Lỗi khi kích hoạt thủ công cron:', e);
      return res.status(500).json({ success: false, message: e.message });
    }
  });

  // Background 7:00 AM Cron Interval (Vietnam GMT+7)
  setInterval(async () => {
    try {
      const now = new Date();
      const vnDate = getVietnamDateIso(now);
      const vnTimeParts = now.toLocaleTimeString('vi-VN', { 
        timeZone: 'Asia/Ho_Chi_Minh', 
        hour12: false 
      }).split(':');
      
      const hour = Number(vnTimeParts[0]);
      const minute = Number(vnTimeParts[1]);

      const targetHour = serverState.config.autoSendHour ?? 7;
      const targetMinute = serverState.config.autoSendMinute ?? 0;

      // Trigger at configured time (default 07:00 AM VN Time) once per day
      if (hour === targetHour && minute === targetMinute && serverState.lastCronDate !== vnDate) {
        serverState.lastCronDate = vnDate;
        console.log(`[TASAGO CRON 07:00 AM] Kích hoạt kiểm tra lịch nén mẫu định kỳ ngày ${vnDate}...`);

        const urgentSamples = getCurrentSamples().filter(
          s => s.status === 'due_today' || s.status === 'overdue'
        );

        if (urgentSamples.length > 0) {
          const todayIso = getVietnamDateIso(now);
          const { html, text } = buildDailyEmailHtml(urgentSamples, serverState.stations, todayIso);
          const emailRecipients = serverState.config.emailRecipients || ['thanhtgndt@gmail.com', 'kythuat@tasago.vn'];
          const cronLogItems: string[] = [];

          // 1. Send via SMTP
          if (serverState.config.autoEmailEnabled) {
            const { transporter, host, user, pass } = createSmtpTransporter(serverState.config);
            if (host && user && pass) {
              try {
                await transporter.sendMail({
                  from: serverState.config.emailSender || `Bê Tông Tasago <${user}>`,
                  to: emailRecipients.join(', '),
                  subject: `[TASAGO] Báo Cáo Lịch Nén Mẫu Bê Tông 07:00 Sáng - ${formatDateVN(todayIso)}`,
                  text: text,
                  html: html
                });
                cronLogItems.push(`Email tới ${emailRecipients.length} địa chỉ`);
              } catch (mailErr: any) {
                cronLogItems.push(`Email lỗi: ${mailErr.message}`);
                console.error('[CRON EMAIL ERROR]', mailErr.message);
              }
            }
          }

          // 2. Send via Zalo Bot Webhook (Personal & Group)
          if (serverState.config.autoZaloEnabled && serverState.config.zaloWebhookUrl?.startsWith('http')) {
            try {
              const zRes = await fetch(serverState.config.zaloWebhookUrl, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  ...(serverState.config.zaloBotToken ? { 'Authorization': `Bearer ${serverState.config.zaloBotToken}` } : {})
                },
                body: JSON.stringify({
                  event: 'CRON_07AM_DAILY_ALERT',
                  company: 'CÔNG TY CỔ PHẦN ĐẦU TƯ TASAGO',
                  timestamp: new Date().toISOString(),
                  recipient_phone: serverState.config.zaloPersonalPhone || '0942320923',
                  group_id: serverState.config.zaloGroupId || 'Nhóm Kỹ Thuật Tasago',
                  message: text,
                  samples: urgentSamples
                })
              });
              cronLogItems.push(`Bot Zalo Webhook HTTP ${zRes.status}`);
            } catch (zaloErr: any) {
              cronLogItems.push(`Bot Zalo lỗi: ${zaloErr.message}`);
              console.error('[CRON ZALO ERROR]', zaloErr.message);
            }
          }

          serverState.lastCronLog = `[TỰ ĐỘNG 07:00 AM] Đã xử lý ${urgentSamples.length} mẫu nén: ${cronLogItems.join(' | ')}`;
          console.log(serverState.lastCronLog);
        }
        await savePersistedState(serverState);
      }
    } catch (cronErr) {
      console.debug('Cron interval check note:', cronErr);
    }
  }, 30000); // Check every 30s

  // Vite Middleware for Development vs Static for Production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Server Tasago running on http://0.0.0.0:${PORT}`);
  });
}

startServer();

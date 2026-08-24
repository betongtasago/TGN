import { createClient } from '@supabase/supabase-js';
import dns from 'node:dns';
import nodemailer from 'nodemailer';

dns.setDefaultResultOrder('ipv4first');

const TIME_ZONE = 'Asia/Ho_Chi_Minh';
const isEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

function vietnamDateIso(date = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(date);
  const values = Object.fromEntries(parts.map(part => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function formatDateVN(value?: string): string {
  if (!value) return '---';
  const parts = value.split('-');
  return parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : value;
}

function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;').replaceAll("'", '&#039;');
}

function buildReport(samples: any[], stations: any[], today: string) {
  const stationMap = new Map(stations.map(station => [station.id, station.name]));
  const lines = ['CÔNG TY CỔ PHẦN ĐẦU TƯ TASAGO', `BÁO CÁO LỊCH NÉN MẪU BÊ TÔNG - ${formatDateVN(today)}`, ''];
  for (const [index, sample] of samples.entries()) {
    const status = sample.status === 'overdue' ? 'QUÁ HẠN CHƯA NÉN' : 'ĐẾN HẠN HÔM NAY';
    lines.push(
      `${index + 1}. [${status}] ${sample.projectName || sample.sampleCode || sample.id}`,
      `   Trạm: ${stationMap.get(sample.stationId) || 'Trạm Tasago'}`,
      `   Hạng mục: ${sample.component || '---'} (${sample.volumeM3 ?? 0} m³)`,
      `   Mác: ${sample.concreteGrade || '---'} | Tuổi nén: ${sample.ageType || '---'} (${sample.ageDays ?? '-'} ngày)`,
      `   Đúc: ${formatDateVN(sample.castDate)} -> Nén: ${formatDateVN(sample.scheduledTestDate)}`,
      `   Nhà thầu: ${sample.contractor || '---'} | Liên hệ: ${sample.contactPerson || '---'} - ${sample.contactPhone || '---'}`,
      `   KTV lấy mẫu: ${sample.samplerName || '---'}`, '',
    );
  }
  return {
    text: lines.join('\n'),
    html: `<div style="font-family:Arial,sans-serif;max-width:700px;margin:auto"><h2>CÔNG TY CỔ PHẦN ĐẦU TƯ TASAGO</h2><p>Báo cáo ngày ${escapeHtml(formatDateVN(today))}</p>${samples.map((sample, index) => `<section style="border:1px solid #d1d5db;border-left:4px solid #059669;padding:12px;margin:12px 0"><strong>${index + 1}. ${escapeHtml(sample.projectName || sample.sampleCode || sample.id)}</strong><p>Trạm: ${escapeHtml(stationMap.get(sample.stationId) || 'Trạm Tasago')}<br>Hạng mục: ${escapeHtml(sample.component)} (${escapeHtml(sample.volumeM3)} m³)<br>Mác: ${escapeHtml(sample.concreteGrade)} | Tuổi nén: ${escapeHtml(sample.ageType)} (${escapeHtml(sample.ageDays)} ngày)<br>Đúc: ${escapeHtml(formatDateVN(sample.castDate))} - Nén: ${escapeHtml(formatDateVN(sample.scheduledTestDate))}<br>Nhà thầu: ${escapeHtml(sample.contractor)}<br>Liên hệ: ${escapeHtml(sample.contactPerson)} - ${escapeHtml(sample.contactPhone)}<br>KTV: ${escapeHtml(sample.samplerName)}</p></section>`).join('')}</div>`,
  };
}

async function sendEmail(config: any, recipients: string[], report: { text: string; html: string }, today: string) {
  if (!recipients.length) return 'Email lỗi: chưa cấu hình địa chỉ email người nhận hợp lệ.';
  const smtpUser = String(config.smtpUser || process.env.SMTP_USER || '').trim();
  const smtpPass = String(config.smtpPass || process.env.SMTP_PASS || '').replace(/\s+/g, '');
  if (!smtpUser || !smtpPass) return 'Email lỗi: chưa cấu hình SMTP User/Mật khẩu ứng dụng.';

  const host = String(config.smtpHost || process.env.SMTP_HOST || 'smtp.gmail.com').trim();
  const port = Number(config.smtpPort || process.env.SMTP_PORT || 587);
  const secure = config.smtpSecure !== undefined ? Boolean(config.smtpSecure) : String(process.env.SMTP_SECURE).toLowerCase() === 'true' || port === 465;
  const transporter = nodemailer.createTransport({
    host, port, secure, requireTLS: !secure,
    auth: { user: smtpUser, pass: smtpPass },
    connectionTimeout: 15000, greetingTimeout: 15000, socketTimeout: 30000,
    tls: { rejectUnauthorized: false, minVersion: 'TLSv1.2' },
  });
  const info = await transporter.sendMail({
    from: config.emailSender || process.env.SMTP_FROM || `Bê Tông Tasago <${smtpUser}>`,
    to: recipients.join(', '),
    subject: `[TASAGO] Báo cáo lịch nén mẫu - ${formatDateVN(today)}`,
    text: report.text,
    html: report.html,
  });
  return `Email thành công (${info.messageId || 'accepted'}) tới ${recipients.length} địa chỉ qua SMTP ${host}:${port}.`;
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ success: false, message: 'Method Not Allowed' });
  }

  const cronSecret = process.env.CRON_SECRET?.trim();
  if (!cronSecret) return res.status(503).json({ success: false, message: 'Chưa cấu hình CRON_SECRET cho Vercel Cron.' });
  const authorization = req.headers?.authorization || req.headers?.Authorization || '';
  const supplied = authorization === `Bearer ${cronSecret}` ? cronSecret : typeof req.query?.secret === 'string' ? req.query.secret : '';
  if (supplied !== cronSecret) return res.status(401).json({ success: false, message: 'Unauthorized' });

  const url = process.env.SUPABASE_URL?.trim();
  const key = (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY || '').trim();
  if (!url || !key) return res.status(503).json({ success: false, message: 'Chưa cấu hình Supabase cho cron.' });

  try {
    const supabase = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
    const { data: state, error } = await supabase.from('app_state').select('stations, samples, config, last_cron_date').eq('id', 'default').single();
    if (error || !state) return res.status(502).json({ success: false, message: error?.message || 'Không tìm thấy app_state.' });

    const today = vietnamDateIso();
    const manual = req.query?.manual === '1' || req.query?.manual === 'true';
    if (!manual && state.last_cron_date === today) return res.json({ success: true, skipped: true, message: 'Cron hôm nay đã được xử lý.', executedDate: today });

    const samples = Array.isArray(state.samples) ? state.samples : [];
    const urgent = samples.filter((sample: any) => {
      if (['tested_passed', 'tested_failed', 'cancelled'].includes(sample.status)) return false;
      return sample.scheduledTestDate === today || (sample.scheduledTestDate && sample.scheduledTestDate < today);
    }).map((sample: any) => ({ ...sample, status: sample.scheduledTestDate < today ? 'overdue' : 'due_today' }));
    const config = state.config && typeof state.config === 'object' ? state.config : {};
    const stations = Array.isArray(state.stations) ? state.stations : [];
    const recipients = (Array.isArray(config.emailRecipients) ? config.emailRecipients : []).map((value: unknown) => String(value).trim()).filter(isEmail);
    const results: string[] = [];

    if (urgent.length > 0) {
      if (config.autoEmailEnabled !== false) {
        try { results.push(await sendEmail(config, recipients, buildReport(urgent, stations, today), today)); }
        catch (emailError: any) { results.push(`Email lỗi: ${emailError?.message || 'lỗi SMTP'}`); }
      } else {
        results.push('Email tự động đang tắt.');
      }
    } else {
      results.push('Không có mẫu đến hạn hoặc quá hạn.');
    }

    const log = `[VERCEL CRON 07:00] ${today}: ${results.join(' | ')}`;
    const { error: updateError } = await supabase.from('app_state').update({ last_cron_date: today, last_cron_log: log, updated_at: new Date().toISOString() }).eq('id', 'default');
    if (updateError) throw updateError;
    return res.json({ success: true, executedDate: today, sampleCount: urgent.length, details: results, log });
  } catch (error: any) {
    console.error('Lỗi Vercel cron:', error);
    return res.status(500).json({ success: false, message: error?.message || 'Lỗi không xác định khi chạy cron.' });
  }
}

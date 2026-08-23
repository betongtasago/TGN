import { createClient } from '@supabase/supabase-js';
import nodemailer from 'nodemailer';

const isEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

function vietnamDateIso(date = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Ho_Chi_Minh',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
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
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function buildReport(samples: any[], stations: any[], today: string) {
  const stationMap = new Map(stations.map(station => [station.id, station.name]));
  const lines = [
    'CÔNG TY CỔ PHẦN ĐẦU TƯ TASAGO',
    `BÁO CÁO LỊCH NÉN MẪU BÊ TÔNG - ${formatDateVN(today)}`,
    '',
  ];

  for (const [index, sample] of samples.entries()) {
    const status = sample.status === 'overdue' ? 'QUÁ HẠN CHƯA NÉN' : 'ĐẾN HẠN HÔM NAY';
    lines.push(`${index + 1}. [${status}] ${sample.projectName || sample.sampleCode || sample.id}`);
    lines.push(`   Trạm: ${stationMap.get(sample.stationId) || 'Trạm Tasago'}`);
    lines.push(`   Hạng mục: ${sample.component || '---'} (${sample.volumeM3 ?? 0} m³)`);
    lines.push(`   Mác: ${sample.concreteGrade || '---'} | Tuổi nén: ${sample.ageType || '---'} (${sample.ageDays ?? '-'} ngày)`);
    lines.push(`   Đúc: ${formatDateVN(sample.castDate)} -> Nén: ${formatDateVN(sample.scheduledTestDate)}`);
    lines.push(`   Nhà thầu: ${sample.contractor || '---'} | Liên hệ: ${sample.contactPerson || '---'} - ${sample.contactPhone || '---'}`);
    lines.push(`   KTV lấy mẫu: ${sample.samplerName || '---'}`, '');
  }

  return {
    text: lines.join('\n'),
    html: `<div style="font-family:Arial,sans-serif;max-width:700px;margin:auto"><h2>CÔNG TY CỔ PHẦN ĐẦU TƯ TASAGO</h2><p>Báo cáo ngày ${escapeHtml(formatDateVN(today))}</p>${samples.map((sample, index) => `<section style="border:1px solid #d1d5db;border-left:4px solid #059669;padding:12px;margin:12px 0"><strong>${index + 1}. ${escapeHtml(sample.projectName || sample.sampleCode || sample.id)}</strong><p>Trạm: ${escapeHtml(stationMap.get(sample.stationId) || 'Trạm Tasago')}<br>Hạng mục: ${escapeHtml(sample.component)} (${escapeHtml(sample.volumeM3)} m³)<br>Mác: ${escapeHtml(sample.concreteGrade)} | Tuổi nén: ${escapeHtml(sample.ageType)} (${escapeHtml(sample.ageDays)} ngày)<br>Đúc: ${escapeHtml(formatDateVN(sample.castDate))} → Nén: ${escapeHtml(formatDateVN(sample.scheduledTestDate))}<br>Nhà thầu: ${escapeHtml(sample.contractor)}<br>Liên hệ: ${escapeHtml(sample.contactPerson)} - ${escapeHtml(sample.contactPhone)}<br>KTV: ${escapeHtml(sample.samplerName)}</p></section>`).join('')}</div>`,
  };
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ success: false, message: 'Method Not Allowed' });
  }

  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const supplied = req.headers?.authorization === `Bearer ${cronSecret}`
      ? cronSecret
      : typeof req.query?.secret === 'string' ? req.query.secret : '';
    if (supplied !== cronSecret) return res.status(401).json({ success: false, message: 'Unauthorized' });
  }

  const url = process.env.SUPABASE_URL?.trim();
  const key = (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY || '').trim();
  if (!url || !key) {
    return res.status(503).json({ success: false, message: 'Chưa cấu hình Supabase cho cron.' });
  }

  try {
    const supabase = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
    const { data: state, error } = await supabase
      .from('app_state')
      .select('stations, samples, config')
      .eq('id', 'default')
      .single();
    if (error || !state) return res.status(502).json({ success: false, message: error?.message || 'Không tìm thấy app_state trong Supabase.' });

    const today = vietnamDateIso();
    const samples = Array.isArray(state.samples) ? state.samples : [];
    const urgent = samples.filter((sample: any) => {
      if (['tested_passed', 'tested_failed', 'cancelled'].includes(sample.status)) return false;
      return sample.scheduledTestDate === today || (sample.scheduledTestDate && sample.scheduledTestDate < today);
    }).map((sample: any) => ({
      ...sample,
      status: sample.scheduledTestDate < today ? 'overdue' : 'due_today',
    }));

    if (urgent.length === 0) {
      return res.json({ success: true, message: 'Không có mẫu đến hạn hoặc quá hạn.', sampleCount: 0, executedDate: today });
    }

    const config = state.config && typeof state.config === 'object' ? state.config : {};
    const recipients = (Array.isArray(config.emailRecipients) ? config.emailRecipients : (process.env.EMAIL_RECIPIENTS || '').split(','))
      .map((value: string) => value.trim()).filter(isEmail);
    const report = buildReport(urgent, Array.isArray(state.stations) ? state.stations : [], today);
    const subject = `[TASAGO] Báo cáo lịch nén mẫu - ${formatDateVN(today)}`;
    let emailSent = false;
    let emailDetail = 'Chưa cấu hình kênh email.';

    const smtpPass = (process.env.SMTP_PASS || '').replace(/\s+/g, '');
    if (recipients.length && process.env.SMTP_USER && smtpPass) {
      const port = Number(process.env.SMTP_PORT || 587);
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port,
        secure: String(process.env.SMTP_SECURE).toLowerCase() === 'true' || port === 465,
        requireTLS: port !== 465,
        auth: { user: process.env.SMTP_USER, pass: smtpPass },
      });
      const info = await transporter.sendMail({
        from: process.env.SMTP_FROM || `Bê Tông Tasago <${process.env.SMTP_USER}>`,
        to: recipients.join(', '), subject, text: report.text, html: report.html,
      });
      emailSent = true;
      emailDetail = `Đã gửi SMTP (${info.messageId})`;
    } else if (recipients.length && process.env.RESEND_API_KEY) {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.RESEND_API_KEY}` },
        body: JSON.stringify({ from: process.env.SMTP_FROM || 'Tasago Portal <onboarding@resend.dev>', to: recipients, subject, text: report.text, html: report.html }),
      });
      emailSent = response.ok;
      emailDetail = response.ok ? 'Đã gửi Resend' : `Resend HTTP ${response.status}`;
    }

    let zaloSent = false;
    if (typeof config.zaloWebhookUrl === 'string' && config.zaloWebhookUrl.startsWith('http')) {
      const response = await fetch(config.zaloWebhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(process.env.ZALO_BOT_TOKEN ? { Authorization: `Bearer ${process.env.ZALO_BOT_TOKEN}` } : {}) },
        body: JSON.stringify({ event: 'CRON_07AM_TASAGO_SAMPLE_ALERT', company: 'CÔNG TY CỔ PHẦN ĐẦU TƯ TASAGO', message: report.text, samples: urgent }),
      });
      zaloSent = response.ok;
    }

    return res.json({ success: emailSent || zaloSent, executedDate: today, sampleCount: urgent.length, emailSent, emailDetail, zaloSent, recipients });
  } catch (error: any) {
    console.error('Lỗi Vercel cron:', error);
    return res.status(500).json({ success: false, message: error?.message || 'Lỗi không xác định khi chạy cron.' });
  }
}

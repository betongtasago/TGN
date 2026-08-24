import nodemailer from 'nodemailer';
import dns from 'node:dns';

dns.setDefaultResultOrder('ipv4first');

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '4mb',
    },
  },
};

const isEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

export default async function handler(req: any, res: any) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ success: false, message: 'Method Not Allowed' });
  }
  const cronSecret = process.env.CRON_SECRET?.trim();
  const authorization = req.headers?.authorization || req.headers?.Authorization || '';
  if (!cronSecret || authorization !== `Bearer ${cronSecret}`) return res.status(401).json({ success: false, message: 'Unauthorized' });
  try {
    const {
      recipients,
      subject,
      html,
      plainText
    } = req.body || {};

    const rawList = Array.isArray(recipients) ? recipients : (process.env.EMAIL_RECIPIENTS || '').split(',');
    const validRecipients = rawList
      .map((r: any) => String(r).trim())
      .filter(isEmail);

    if (validRecipients.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Danh sách địa chỉ email người nhận không hợp lệ hoặc để trống.'
      });
    }

    const todayStr = new Date().toLocaleDateString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
    const emailSubject = subject || `[TASAGO] Báo Cáo Lịch Nén Mẫu Bê Tông - ${todayStr}`;
    const host = process.env.SMTP_HOST || 'smtp.gmail.com';
    const port = Number(process.env.SMTP_PORT || 587);
    const user = (process.env.SMTP_USER || '').trim();
    const rawPass = process.env.SMTP_PASS || '';
    const pass = rawPass.replace(/\s+/g, '');
    const isSecure = String(process.env.SMTP_SECURE).toLowerCase() === 'true' || port === 465;
    const from = process.env.SMTP_FROM || (user ? `Bê Tông Tasago <${user}>` : '');

    // SMTP Nodemailer (Gmail STARTTLS 587 or SSL 465)
    if (host && user && pass) {
      const transporter = nodemailer.createTransport({
        host,
        port,
        secure: isSecure,
        requireTLS: !isSecure,
        auth: { user, pass },
        connectionTimeout: 15000,
        greetingTimeout: 15000,
        socketTimeout: 30000,
        tls: {
          rejectUnauthorized: false,
          minVersion: 'TLSv1.2'
        }
      });

      const info = await transporter.sendMail({
        from: from.includes('<') ? from : `Bê Tông Tasago <${user}>`,
        to: validRecipients.join(', '),
        subject: emailSubject,
        text: plainText || '',
        html: html || `<p>${(plainText || '').replace(/\n/g, '<br>')}</p>`
      });

      return res.status(200).json({
        success: true,
        channel: 'smtp_transport',
        message: `Đã gửi email thành công tới ${validRecipients.length} địa chỉ (${validRecipients.join(', ')}) qua SMTP ${host}:${port}!`,
        messageId: info.messageId,
        recipients: validRecipients
      });
    }

    return res.status(503).json({
      success: false,
      message: 'Chưa cấu hình mật khẩu SMTP (SMTP_PASS) trên Vercel Environment Variables.'
    });

  } catch (error: any) {
    console.error('Lỗi khi gửi email:', error);
    return res.status(500).json({
      success: false,
      message: `Lỗi máy chủ gửi email SMTP: ${error.message || 'Lỗi không xác định'}${error.code === 'ENETUNREACH' ? ' — bản mới đã ưu tiên IPv4, hãy redeploy Vercel.' : ''}`
    });
  }
}

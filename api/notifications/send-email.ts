import nodemailer from 'nodemailer';

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

  try {
    const {
      recipients,
      subject,
      html,
      plainText,
      smtpConfig,
      emailServiceUrl
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
    const supplied = smtpConfig || {};

    const host = process.env.SMTP_HOST || supplied.smtpHost || 'smtp.gmail.com';
    const port = Number(process.env.SMTP_PORT || supplied.smtpPort || 587);
    const user = (process.env.SMTP_USER || supplied.smtpUser || 'tasagotnt@gmail.com').trim();
    const rawPass = (process.env.SMTP_PASS || supplied.smtpPass || '');
    const pass = rawPass.replace(/\s+/g, '');
    const isSecure = supplied.smtpSecure !== undefined 
      ? Boolean(supplied.smtpSecure) 
      : String(process.env.SMTP_SECURE).toLowerCase() === 'true' || port === 465;

    const from = process.env.SMTP_FROM || supplied.smtpFrom || (user ? `Bê Tông Tasago <${user}>` : 'Bê Tông Tasago <tasagotnt@gmail.com>');

    // 1. Google Apps Script / Webhook Mailer if provided
    const targetServiceUrl = emailServiceUrl || supplied.emailServiceUrl || process.env.EMAIL_SERVICE_URL;
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
            html,
            text: plainText,
            timestamp: new Date().toISOString()
          })
        });

        if (webhookRes.ok) {
          return res.status(200).json({
            success: true,
            channel: 'webhook_mailer',
            message: `Đã gửi email thành công tới ${validRecipients.length} địa chỉ qua Webhook Mailer!`,
            recipients: validRecipients
          });
        }
      } catch (webhookErr: any) {
        console.warn('Webhook mailer error, fallback to SMTP:', webhookErr);
      }
    }

    // 2. Resend API if configured
    if (process.env.RESEND_API_KEY) {
      try {
        const resendRes = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${process.env.RESEND_API_KEY}`
          },
          body: JSON.stringify({
            from: from.includes('<') ? from : `Tasago Portal <${from}>`,
            to: validRecipients,
            subject: emailSubject,
            html: html || `<p>${(plainText || '').replace(/\n/g, '<br>')}</p>`,
            text: plainText || ''
          })
        });

        const resendData = await resendRes.json().catch(() => ({}));
        if (resendRes.ok) {
          return res.status(200).json({
            success: true,
            channel: 'resend_api',
            message: `Đã gửi email thành công tới ${validRecipients.length} địa chỉ qua Resend API!`,
            id: resendData.id,
            recipients: validRecipients
          });
        }
      } catch (resendErr: any) {
        console.warn('Resend error, fallback to SMTP:', resendErr);
      }
    }

    // 3. SMTP Nodemailer (Gmail STARTTLS 587 or SSL 465)
    if (host && user && pass) {
      const transporter = nodemailer.createTransport({
        host,
        port,
        secure: isSecure,
        requireTLS: !isSecure,
        auth: { user, pass },
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
      message: 'Chưa cấu hình mật khẩu SMTP (SMTP_PASS) hoặc RESEND_API_KEY trên Vercel Environment Variables.'
    });

  } catch (error: any) {
    console.error('Lỗi khi gửi email:', error);
    return res.status(500).json({
      success: false,
      message: `Lỗi máy chủ gửi email: ${error.message || 'Lỗi không xác định'}`
    });
  }
}

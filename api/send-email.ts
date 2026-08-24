import { sendViaResend } from '../resendEmail';

export const config = {
  api: {
    bodyParser: { sizeLimit: '4mb' },
  },
};

const isEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ success: false, message: 'Method Not Allowed' });
  }
  const cronSecret = process.env.CRON_SECRET?.trim();
  const authorization = req.headers?.authorization || req.headers?.Authorization || '';
  if (!cronSecret || authorization !== `Bearer ${cronSecret}`) return res.status(401).json({ success: false, message: 'Unauthorized' });

  try {
    const { recipients, subject, html, plainText, resendConfig } = req.body || {};
    const rawRecipients = Array.isArray(recipients) ? recipients : String(process.env.EMAIL_RECIPIENTS || '').split(',');
    const validRecipients = rawRecipients.map((recipient: unknown) => String(recipient).trim()).filter(isEmail);
    if (!validRecipients.length) return res.status(400).json({ success: false, message: 'Danh sách địa chỉ email người nhận không hợp lệ hoặc để trống.' });

    const result = await sendViaResend({
      from: resendConfig?.from,
      to: validRecipients,
      subject: subject || `[TASAGO] Báo Cáo Lịch Nén Mẫu Bê Tông - ${new Date().toLocaleDateString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}`,
      html: html || `<p>${String(plainText || '').replaceAll('\n', '<br>')}</p>`,
      text: plainText || '',
      idempotencyKey: `manual-sample-report/${Date.now()}`,
    });
    return res.status(result.success ? 200 : 502).json({ ...result, channel: 'resend_api' });
  } catch (error: any) {
    console.error('Lỗi Vercel Resend email:', error);
    return res.status(500).json({ success: false, message: `Lỗi máy chủ Resend: ${error?.message || 'lỗi không xác định'}` });
  }
}

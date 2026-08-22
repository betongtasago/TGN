import nodemailer from 'nodemailer';

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '2mb',
    },
  },
};

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
    const { smtpConfig } = req.body || {};
    const host = smtpConfig?.smtpHost || process.env.SMTP_HOST || 'smtp.gmail.com';
    const port = Number(smtpConfig?.smtpPort || process.env.SMTP_PORT || 587);
    const user = (smtpConfig?.smtpUser || process.env.SMTP_USER || 'tasagotnt@gmail.com').trim();
    const rawPass = (smtpConfig?.smtpPass || process.env.SMTP_PASS || '');
    const pass = rawPass.replace(/\s+/g, '');
    const isSecure = smtpConfig?.smtpSecure !== undefined 
      ? Boolean(smtpConfig.smtpSecure) 
      : String(process.env.SMTP_SECURE).toLowerCase() === 'true' || port === 465;

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng cung cấp Email tài khoản gửi (SMTP_USER).'
      });
    }

    if (!pass) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng cung cấp Mật khẩu ứng dụng Gmail (Google App Password 16 ký tự) trong cài đặt hoặc biến môi trường SMTP_PASS.'
      });
    }

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

    await transporter.verify();

    return res.status(200).json({
      success: true,
      message: `Kết nối máy chủ SMTP ${host}:${port} (${isSecure ? 'SSL' : 'STARTTLS'}) thành công! Tài khoản "${user}" đã xác thực hợp lệ trên Vercel.`,
      details: {
        host,
        port,
        user,
        protocol: isSecure ? 'SSL (Port 465)' : 'STARTTLS (Port 587)',
        status: 'AUTHENTICATED'
      }
    });
  } catch (error: any) {
    console.error('Lỗi khi kiểm tra SMTP trên Vercel:', error);
    let note = '';
    if (error.message?.includes('535') || error.message?.includes('BadCredentials') || error.message?.includes('Username and Password not accepted')) {
      note = ' (Gợi ý: Dùng Mật khẩu ứng dụng 16 ký tự tạo tại Google Account > Security > 2-Step Verification > App passwords).';
    }
    return res.status(500).json({
      success: false,
      message: `Không thể kết nối máy chủ SMTP: ${error.message}${note}`,
      error: error.message
    });
  }
}

import { verifyResendConfiguration } from '../../resendEmail';

export const config = {
  api: {
    bodyParser: { sizeLimit: '1mb' },
  },
};

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
    const result = await verifyResendConfiguration(req.body?.from);
    return res.status(result.success ? 200 : 400).json(result);
  } catch (error: any) {
    console.error('Lỗi Vercel verify Resend:', error);
    return res.status(500).json({ success: false, message: `Lỗi kiểm tra Resend: ${error?.message || 'lỗi không xác định'}` });
  }
}

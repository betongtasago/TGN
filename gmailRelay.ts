export interface GmailRelayEmail {
  recipients: string[];
  subject: string;
  html: string;
  text: string;
  senderName?: string;
}

type RelayResponse = {
  success?: boolean;
  message?: string;
  messageId?: string;
};

function getRelaySettings() {
  const url = String(process.env.GMAIL_RELAY_URL || '').trim().replace(/\/$/, '');
  const secret = String(process.env.GMAIL_RELAY_SECRET || '').trim();
  if (!url || !secret) {
    throw new Error('Chưa cấu hình GMAIL_RELAY_URL và GMAIL_RELAY_SECRET trên máy chủ.');
  }
  return { url, secret };
}

function relayStatusMessage(status: number) {
  if (status === 403) {
    return 'Google Apps Script từ chối HTTP 403. Hãy kiểm tra deployment là Web app, URL kết thúc bằng /exec, chạy dưới tài khoản chủ sở hữu và quyền truy cập là Anyone with the link; không dùng URL /dev.';
  }
  if (status === 404) {
    return 'Không tìm thấy Gmail relay. Hãy kiểm tra GMAIL_RELAY_URL là Web app URL kết thúc bằng /exec và redeploy Apps Script nếu cần.';
  }
  return `Gmail relay trả về HTTP ${status}.`;
}

async function relayRequest(path: string, init: RequestInit = {}) {
  const { url, secret } = getRelaySettings();
  const headers = new Headers(init.headers);
  if (init.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
  let body = init.body;
  if ((init.method || 'GET').toUpperCase() === 'POST') {
    let payload: Record<string, unknown> = {};
    if (typeof init.body === 'string' && init.body.trim()) {
      try {
        payload = JSON.parse(init.body) as Record<string, unknown>;
      } catch {
        throw new Error('Payload Gmail relay không phải JSON hợp lệ.');
      }
    }
    body = JSON.stringify({ ...payload, relaySecret: secret });
  }

  const response = await fetch(`${url}${path}`, { ...init, body, headers });
  const responseText = await response.text();
  let payload: RelayResponse | null = null;
  try {
    payload = responseText ? JSON.parse(responseText) as RelayResponse : null;
  } catch {
    payload = null;
  }
  if (!response.ok || payload?.success === false) {
    throw new Error(payload?.message || relayStatusMessage(response.status));
  }
  return payload || { success: true };
}

export async function verifyGmailRelay() {
  return relayRequest('', { method: 'POST', body: JSON.stringify({ action: 'verify' }) });
}

export async function sendViaGmailRelay(email: GmailRelayEmail) {
  if (!email.recipients.length) throw new Error('Danh sách email người nhận đang trống.');
  return relayRequest('', {
    method: 'POST',
    body: JSON.stringify({
      to: email.recipients.join(','),
      subject: email.subject,
      htmlBody: email.html,
      textBody: email.text,
      name: email.senderName || 'Bê Tông Tasago',
    }),
  });
}

export interface GmailRelayEmail {
  recipients: string[];
  subject: string;
  html: string;
  text: string;
  senderName?: string;
}

function getRelaySettings() {
  const url = String(process.env.GMAIL_RELAY_URL || '').trim().replace(/\/$/, '');
  const secret = String(process.env.GMAIL_RELAY_SECRET || '').trim();
  if (!url || !secret) {
    throw new Error('Chưa cấu hình GMAIL_RELAY_URL và GMAIL_RELAY_SECRET trên máy chủ.');
  }
  return { url, secret };
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
  const payload = await response.json().catch(() => null) as { success?: boolean; message?: string; messageId?: string } | null;
  if (!response.ok || payload?.success === false) {
    throw new Error(payload?.message || `Gmail relay trả về HTTP ${response.status}.`);
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

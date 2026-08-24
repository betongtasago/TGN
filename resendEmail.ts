import { Resend } from 'resend';

export interface ResendEmailInput {
  from?: string;
  to: string[];
  subject: string;
  html?: string;
  text?: string;
  idempotencyKey?: string;
}

export interface ResendEmailResult {
  success: boolean;
  message: string;
  messageId?: string;
  recipients?: string[];
}

function getResendFrom(from?: string): string {
  return String(from || process.env.RESEND_FROM || '').trim();
}

export async function sendViaResend(input: ResendEmailInput): Promise<ResendEmailResult> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) {
    return {
      success: false,
      message: 'Chưa cấu hình RESEND_API_KEY trên máy chủ.',
    };
  }

  const from = getResendFrom(input.from);
  if (!from) {
    return {
      success: false,
      message: 'Chưa cấu hình RESEND_FROM hoặc địa chỉ người gửi Resend trong Trung tâm Email.',
    };
  }

  if (!input.to.length) {
    return {
      success: false,
      message: 'Danh sách người nhận email đang trống.',
    };
  }

  try {
    const resend = new Resend(apiKey);
    const { data, error } = await resend.emails.send({
      from,
      to: input.to,
      subject: input.subject,
      html: input.html,
      text: input.text,
      ...(input.idempotencyKey ? { idempotencyKey: input.idempotencyKey } : {}),
    });

    if (error) {
      return {
        success: false,
        message: `Resend từ chối gửi email: ${error.message}`,
        recipients: input.to,
      };
    }

    return {
      success: true,
      message: `Resend đã nhận email tới ${input.to.length} địa chỉ.`,
      messageId: data?.id,
      recipients: input.to,
    };
  } catch (error: any) {
    return {
      success: false,
      message: `Không thể kết nối Resend API: ${error?.message || 'lỗi mạng'}`,
      recipients: input.to,
    };
  }
}

export async function verifyResendConfiguration(from?: string): Promise<{ success: boolean; message: string; details?: Record<string, string> }> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const sender = getResendFrom(from);
  if (!apiKey) return { success: false, message: 'Chưa cấu hình RESEND_API_KEY trên máy chủ.' };
  if (!/^re_[A-Za-z0-9_-]+$/.test(apiKey)) return { success: false, message: 'RESEND_API_KEY không đúng định dạng Resend.' };
  if (!sender || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(sender.replace(/^.*<|>.*$/g, '').trim())) {
    return { success: false, message: 'Địa chỉ người gửi Resend chưa hợp lệ hoặc chưa cấu hình.' };
  }

  try {
    const response = await fetch('https://api.resend.com/domains?limit=1', {
      headers: { Authorization: `Bearer ${apiKey}` },
      signal: AbortSignal.timeout(10000),
    });
    if (response.ok) {
      return { success: true, message: 'Kết nối Resend API thành công và API key có thể truy cập danh sách domain.', details: { sender } };
    }
    if (response.status === 403) {
      return { success: true, message: 'API key Resend hợp lệ nhưng không có quyền xem danh sách domain. Có thể dùng key sending-only; hãy gửi email thử để xác nhận sender.', details: { sender } };
    }
    const body = await response.text().catch(() => '');
    return { success: false, message: `Resend kiểm tra thất bại (HTTP ${response.status})${body ? `: ${body.slice(0, 240)}` : '.'}` };
  } catch (error: any) {
    return { success: false, message: `Không thể kết nối Resend API: ${error?.message || 'lỗi mạng'}` };
  }
}

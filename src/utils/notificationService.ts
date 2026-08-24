import { ConcreteSample, Station, NotificationConfig } from '../types';
import { formatDateVN, addNotificationLog, apiFetch, syncNotificationLog } from './storage';
import { buildProfessionalEmail } from '../../emailTemplate';

export interface FormattedNotification {
  title: string;
  bodyText: string;
  htmlContent: string;
  sampleSummary: string;
  urgentCount: number;
}

function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function vietnamDateTime(): string {
  return new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
}

export function generateSingleSampleEmailText(sample: ConcreteSample, station?: Station): string {
  const stationName = station?.name || 'Trạm Bê Tông Tasago';
  return [
    '[TASAGO - NHẮC LỊCH NÉN MẪU BÊ TÔNG]',
    `Công trình: ${sample.projectName}`,
    `Trạm trộn: ${stationName}`,
    `Hạng mục: ${sample.component} (${sample.volumeM3} m³)`,
    `Mác/tuổi nén: ${sample.concreteGrade} / ${sample.ageType} (${sample.ageDays} ngày)`,
    `Ngày đúc: ${formatDateVN(sample.castDate)} - Ngày nén: ${formatDateVN(sample.scheduledTestDate)}`,
    `Người liên hệ: ${sample.contactPerson} (${sample.contactPhone})`,
    `KTV lấy mẫu: ${sample.samplerName}`,
    sample.notes ? `Ghi chú: ${sample.notes}` : '',
  ].filter(Boolean).join('\n');
}

export function generateSampleNotification(
  samples: ConcreteSample[],
  stations: Station[],
): FormattedNotification {
  const count = samples.length;
  const report = buildProfessionalEmail(samples, stations, {
    title: 'BÁO CÁO LỊCH NÉN MẪU BÊ TÔNG',
    subtitle: 'Thông báo từ Trung tâm Email Tasago',
    intro: 'Vui lòng kiểm tra thông tin từng mẫu trước khi bố trí nén và cập nhật kết quả.',
  });
  return {
    title: `[TASAGO] THÔNG BÁO LỊCH NÉN MẪU BÊ TÔNG - ${count} MẪU`,
    bodyText: report.text,
    htmlContent: report.html,
    sampleSummary: `${count} mẫu (${report.urgentCount} mẫu cần nén gấp)`,
    urgentCount: report.urgentCount,
  };
}

export function playAlertChime(): void {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const context = new AudioContextClass();
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(659.25, context.currentTime);
    gain.gain.setValueAtTime(0.15, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 0.35);
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start();
    oscillator.stop(context.currentTime + 0.35);
  } catch {
    // Audio is optional and may be blocked by the browser.
  }
}

export async function requestBrowserNotificationPermission(): Promise<boolean> {
  if (!('Notification' in window)) return false;
  if (Notification.permission === 'granted') return true;
  if (Notification.permission !== 'denied') return (await Notification.requestPermission()) === 'granted';
  return false;
}

export function showSystemPushNotification(title: string, body: string, tag = 'tasago-sample-alert'): void {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;
  try {
    new Notification(title, { body, icon: '/favicon.ico', tag, requireInteraction: true });
  } catch {
    // Ignore browser notification errors.
  }
}

export async function checkAndTriggerAutoNotifications(
  samples: ConcreteSample[],
  stations: Station[],
  config: NotificationConfig,
  forceRun = false,
): Promise<{ triggered: boolean; urgentCount: number; message: string }> {
  const urgentSamples = samples.filter(sample => sample.status === 'due_today' || sample.status === 'overdue');
  if (!urgentSamples.length) return { triggered: false, urgentCount: 0, message: 'Không có mẫu nào đến hạn hoặc quá hạn hôm nay.' };

  const currentVnHour = Number(new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Ho_Chi_Minh', hour: '2-digit', hour12: false,
  }).format(new Date()));
  const targetHour = config.autoSendHour ?? 7;
  const todayStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date());
  const lastAutoRunKey = `tasago_last_auto_email_${todayStr}`;
  const alreadyRanToday = localStorage.getItem(lastAutoRunKey);

  if (!forceRun && (currentVnHour < targetHour || alreadyRanToday)) {
    return {
      triggered: false,
      urgentCount: urgentSamples.length,
      message: currentVnHour < targetHour
        ? `Chưa đến giờ gửi email tự động (Cài đặt: ${targetHour}:00).`
        : 'Email tự động hôm nay đã được thực hiện.',
    };
  }

  const dispatchResult = config.autoEmailEnabled || forceRun
    ? await dispatchNotification(urgentSamples, stations, config, 'email')
    : { success: false, message: 'Tự động gửi email đang tắt.', logIds: [] };
  localStorage.setItem(lastAutoRunKey, new Date().toISOString());
  return {
    triggered: true,
    urgentCount: urgentSamples.length,
    message: dispatchResult.message || `Đã gửi email tự động cho ${urgentSamples.length} mẫu đến hạn nén.`,
  };
}

export async function dispatchNotification(
  samples: ConcreteSample[],
  stations: Station[],
  config: NotificationConfig,
  channel: 'email' = 'email',
): Promise<{ success: boolean; message: string; logIds: string[] }> {
  if (!samples.length) return { success: false, message: 'Không có mẫu bê tông nào để gửi thông báo.', logIds: [] };
  if (channel !== 'email') return { success: false, message: 'Chỉ hỗ trợ gửi email trong phiên bản hiện tại.', logIds: [] };

  const notification = generateSampleNotification(samples, stations);
  const recipients = (config.emailRecipients || []).map(email => email.trim()).filter(Boolean);
  const fallbackRecipients = ['kythuat@tasago.vn', 'thanhtgndt@gmail.com'];
  const actualRecipients = recipients.length ? recipients : fallbackRecipients;
  let status: 'success' | 'failed' | 'simulated' = 'failed';
  let errorDetails: string | undefined;
  let resultMessage = '';

  try {
    const response = await apiFetch('/api/notifications/send-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        recipients: actualRecipients,
        subject: notification.title,
        html: notification.htmlContent,
        plainText: notification.bodyText,
      }),
    });
    const data = await response.json().catch(() => null);
    if (response.ok && data?.success) {
      status = 'success';
      resultMessage = data.message || `Đã gửi email tới ${actualRecipients.length} địa chỉ.`;
    } else {
      errorDetails = data?.message || `Máy chủ email trả về HTTP ${response.status}.`;
      resultMessage = `Email lỗi: ${errorDetails}`;
    }
  } catch (error: any) {
    errorDetails = error?.message || 'Không thể kết nối máy chủ gửi email.';
    resultMessage = `Email lỗi: ${errorDetails}`;
  }

  const log = addNotificationLog({
    channel: 'email',
    recipient: actualRecipients.join(', '),
    sampleIds: samples.map(sample => sample.id),
    sampleInfoSummary: notification.sampleSummary,
    messageContent: notification.htmlContent,
    status,
    errorDetails,
  });
  const persistedLogs = await syncNotificationLog(log);
  if (persistedLogs) localStorage.setItem('tasago_notif_logs_v3', JSON.stringify(persistedLogs));

  return { success: status === 'success', message: resultMessage, logIds: [log.id] };
}

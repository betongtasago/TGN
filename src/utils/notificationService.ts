import { ConcreteSample, Station, NotificationConfig } from '../types';
import { formatDateVN, addNotificationLog, apiFetch, syncNotificationLog } from './storage';

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
  const stationMap = new Map(stations.map(station => [station.id, station]));
  const urgentCount = samples.filter(sample => sample.status === 'due_today' || sample.status === 'overdue').length;
  const count = samples.length;
  const title = `[TASAGO] THÔNG BÁO LỊCH NÉN MẪU BÊ TÔNG - ${count} MẪU CẦN THỰC HIỆN`;
  const lines: string[] = [
    'CÔNG TY CỔ PHẦN ĐẦU TƯ TASAGO',
    'BÁO CÁO LỊCH NÉN MẪU BÊ TÔNG TỰ ĐỘNG',
    `Thời gian phát: ${vietnamDateTime()}`,
    `Tổng số mẫu: ${count} mẫu (${urgentCount} mẫu đến hạn/quá hạn)`,
    '-------------------------------------------',
  ];

  samples.forEach((sample, index) => {
    const stationName = stationMap.get(sample.stationId)?.name || 'Trạm Tasago';
    const status = sample.status === 'due_today'
      ? '[ĐẾN HẠN HÔM NAY]'
      : sample.status === 'overdue'
        ? '[QUÁ HẠN CHƯA NÉN]'
        : '[SẮP ĐẾN HẠN]';
    lines.push(
      `${index + 1}. ${status}: ${sample.projectName}`,
      `   Trạm trộn: ${stationName}`,
      `   Hạng mục: ${sample.component} (Khối lượng: ${sample.volumeM3} m³)`,
      `   Mác bê tông: ${sample.concreteGrade} (Độ sụt: ${sample.slumpCm} cm)`,
      `   Tuổi nén: ${sample.ageType} (${sample.ageDays} ngày)`,
      `   Ngày đúc: ${formatDateVN(sample.castDate)} -> Ngày nén: ${formatDateVN(sample.scheduledTestDate)}`,
      `   Đơn vị thi công: ${sample.contractor}`,
      `   Người liên hệ: ${sample.contactPerson} - SĐT: ${sample.contactPhone}`,
      `   KTV lấy mẫu: ${sample.samplerName}`,
      sample.notes ? `   Ghi chú: ${sample.notes}` : '',
      `   Mã mẫu: ${sample.id} (${sample.sampleCode})`,
      '',
    );
  });

  lines.push(
    '-------------------------------------------',
    'Đề nghị Ban Chỉ Huy Trạm, Kỹ thuật viên và Phòng Thí nghiệm chuẩn bị máy nén, sau đó cập nhật kết quả lên Cổng Quản Lý Tasago.',
  );
  const bodyText = lines.filter((line, index) => line || index === 0).join('\n');

  const htmlItems = samples.map((sample, index) => {
    const stationName = stationMap.get(sample.stationId)?.name || 'Trạm Tasago';
    const urgent = sample.status === 'due_today' || sample.status === 'overdue';
    return `
      <section style="background:#fff;border:1px solid ${urgent ? '#f87171' : '#e2e8f0'};border-radius:8px;padding:16px;margin-bottom:14px;">
        <div style="font-weight:700;color:${urgent ? '#b91c1c' : '#047857'};font-size:15px;border-bottom:1px solid #f1f5f9;padding-bottom:8px;margin-bottom:10px;">
          #${index + 1}. ${escapeHtml(sample.projectName)}
          <span style="float:right;font-size:11px;background:${urgent ? '#fee2e2' : '#e0f2fe'};color:${urgent ? '#991b1b' : '#0369a1'};padding:2px 8px;border-radius:10px;">${urgent ? 'ĐẾN HẠN' : 'SẮP ĐẾN'}</span>
        </div>
        <table style="width:100%;font-size:13px;color:#334155;line-height:1.6;border-collapse:collapse;">
          <tr><td style="width:35%;font-weight:700;color:#64748b;">Trạm trộn:</td><td><strong>${escapeHtml(stationName)}</strong></td></tr>
          <tr><td style="font-weight:700;color:#64748b;">Hạng mục & khối lượng:</td><td>${escapeHtml(sample.component)} - <strong>${escapeHtml(sample.volumeM3)} m³</strong></td></tr>
          <tr><td style="font-weight:700;color:#64748b;">Mác & độ sụt:</td><td><strong>${escapeHtml(sample.concreteGrade)}</strong> (${escapeHtml(sample.slumpCm)} cm)</td></tr>
          <tr><td style="font-weight:700;color:#64748b;">Tuổi nén:</td><td><strong style="color:#dc2626;">${escapeHtml(sample.ageType)} (${escapeHtml(sample.ageDays)} ngày)</strong></td></tr>
          <tr><td style="font-weight:700;color:#64748b;">Ngày đúc - ngày nén:</td><td>${escapeHtml(formatDateVN(sample.castDate))} - <strong style="color:#b91c1c;">${escapeHtml(formatDateVN(sample.scheduledTestDate))}</strong></td></tr>
          <tr><td style="font-weight:700;color:#64748b;">Đơn vị thi công:</td><td>${escapeHtml(sample.contractor)}</td></tr>
          <tr><td style="font-weight:700;color:#64748b;">Người liên hệ:</td><td><strong>${escapeHtml(sample.contactPerson)}</strong> - ${escapeHtml(sample.contactPhone)}</td></tr>
          <tr><td style="font-weight:700;color:#64748b;">KTV lấy mẫu:</td><td>${escapeHtml(sample.samplerName)}</td></tr>
        </table>
      </section>`;
  }).join('');

  const htmlContent = `
    <div style="font-family:Arial,sans-serif;max-width:680px;margin:0 auto;border:1px solid #10b981;border-radius:12px;overflow:hidden;">
      <header style="background:linear-gradient(135deg,#065f46 0%,#047857 100%);color:#fff;padding:22px 24px;">
        <div style="font-size:11px;font-weight:700;letter-spacing:1px;color:#a7f3d0;text-transform:uppercase;">CÔNG TY CỔ PHẦN ĐẦU TƯ TASAGO</div>
        <h2 style="margin:6px 0 0;font-size:20px;">BÁO CÁO LỊCH NÉN MẪU BÊ TÔNG</h2>
        <p style="margin:4px 0 0;font-size:13px;color:#e6fffa;">Tự động nhắc nhở lịch kiểm định chất lượng bê tông và trialmix</p>
      </header>
      <main style="padding:20px;background:#f8fafc;">
        <div style="background:#ecfdf5;border-left:4px solid #10b981;padding:14px;border-radius:6px;margin-bottom:16px;">
          <strong style="color:#065f46;font-size:14px;">Thông báo:</strong> Có <strong>${count} công trình/mẫu bê tông</strong> cần thực hiện kiểm tra nén mẫu.
        </div>
        ${htmlItems}
        <div style="text-align:center;margin-top:20px;padding-top:15px;border-top:1px solid #e2e8f0;font-size:12px;color:#94a3b8;">© ${new Date().getFullYear()} TASAGO - BÊ TÔNG XANH SÀI GÒN</div>
      </main>
    </div>`;

  return { title, bodyText, htmlContent, sampleSummary: `${count} mẫu (${urgentCount} mẫu cần nén gấp)`, urgentCount };
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

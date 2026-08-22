import { ConcreteSample, Station, NotificationConfig, NotificationLog } from '../types';
import { formatDateVN, addNotificationLog } from './storage';

export interface FormattedNotification {
  title: string;
  bodyText: string;
  zaloMarkdown: string;
  htmlContent: string;
  sampleSummary: string;
  urgentCount: number;
}

const API_BASE_URL = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');
const apiUrl = (path: string) => `${API_BASE_URL}${path}`;

// Clean phone number for zalo.me link
export function cleanPhoneNumber(phone?: string): string {
  if (!phone) return '';
  return phone.replace(/[^0-9+]/g, '').replace(/^(\+84|84)/, '0');
}

// Open direct personal Zalo Chat via zalo.me
export function openZaloPersonalChat(phone: string, textToCopy?: string): boolean {
  const cleaned = cleanPhoneNumber(phone);
  if (!cleaned) return false;
  
  if (textToCopy && navigator.clipboard) {
    navigator.clipboard.writeText(textToCopy).catch(() => {});
  }
  
  window.open(`https://zalo.me/${cleaned}`, '_blank', 'noopener,noreferrer');
  return true;
}

// Generate single-sample concise notification text for individual SMS / Personal Zalo message
export function generateSingleSampleZaloText(sample: ConcreteSample, station?: Station): string {
  const stationName = station ? station.name : 'Trạm Bê Tông Tasago';
  const shapeMap: Record<string, string> = {
    cube_150: 'Vuông 15x15x15cm',
    cylinder_150_300: 'Trụ Ø15x30cm',
    waterproof_150: 'Trụ chống thấm',
    expansion: 'Bù co ngót',
    other: 'Quy cách đặc biệt'
  };
  const shape = shapeMap[sample.sampleShape] || sample.sampleShape;
  const isUrgent = sample.status === 'due_today' || sample.status === 'overdue';

  return `📢 [TASAGO - NHẮC LỊCH NÉN MẪU BÊ TÔNG]
${isUrgent ? '🔴 [ĐẾN HẠN HÔM NAY]' : '📋 [LỊCH NÉN]'}
🏗️ Công trình: ${sample.projectName.toUpperCase()}
🏢 Trạm trộn: ${stationName}
📍 Hạng mục: ${sample.component} (${sample.volumeM3} m³)
🧪 Mác: ${sample.concreteGrade} (Độ sụt: ${sample.slumpCm} cm)
⏱️ Tuổi nén: ${sample.ageType} (${sample.ageDays} ngày) - ${shape}
📅 Ngày đúc: ${formatDateVN(sample.castDate)} ➔ Ngày nén: ${formatDateVN(sample.scheduledTestDate)}
👤 Nhà thầu: ${sample.contractor}
📞 Liên hệ: ${sample.contactPerson} (${sample.contactPhone})
👨‍🔬 KTV lấy mẫu: ${sample.samplerName}
${sample.notes ? `📝 Ghi chú: ${sample.notes}\n` : ''}
⚡ Kính mời Quý Đơn vị / KTV chuẩn bị nén mẫu và nhập kết quả lên Hệ thống Tasago.`;
}

// Complete copy-paste ready Google Apps Script Webhook Code for personal & group Zalo Bot
export const GOOGLE_APPS_SCRIPT_ZALO_TEMPLATE = `/**
 * =======================================================================
 * GOOGLE APPS SCRIPT - TASAGO BOT ZALO CÁ NHÂN & NHÓM TỰ ĐỘNG (MIỄN PHÍ)
 * =======================================================================
 * Hướng dẫn 3 bước cài đặt:
 * 1. Truy cập https://script.google.com -> Bấm "Dự án mới" (New Project).
 * 2. Dán toàn bộ mã nguồn bên dưới -> Bấm Lưu (Ctrl + S).
 * 3. Bấm "Triển khai" (Deploy) -> "Tùy chọn triển khai mới" (New deployment) ->
 *    Chọn Loại: "Ứng dụng web" (Web App) ->
 *    Ai có quyền truy cập: "Bất kỳ ai" (Anyone) -> Bấm "Triển khai".
 * 4. Sao chép URL Web App (dạng https://script.google.com/macros/s/.../exec)
 *    và dán vào ô "Webhook URL" trên phần mềm Tasago!
 */

function doPost(e) {
  try {
    var rawData = e.postData.contents;
    var data = JSON.parse(rawData);
    
    // Ghi log vào Google Sheet hoặc gửi tiếp sang Bot Zalo / Telegram / Email
    var timestamp = new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
    var message = data.message || data.text || 'Thông báo nén mẫu bê tông Tasago';
    var recipientPhone = data.recipient_phone || '0942320923';
    var groupId = data.group_id || 'Nhóm Kỹ Thuật Tasago';
    
    Logger.log('[' + timestamp + '] Đã nhận webhook Tasago: ' + message);
    
    // NẾU BẠN CÓ DÙNG ZALO OFFICIAL ACCOUNT (OA) HOẶC BOT CÁ NHÂN:
    // Bạn có thể mở rộng gọi Zalo OpenAPI tại đây:
    /*
    var ZALO_ACCESS_TOKEN = 'YOUR_ZALO_ACCESS_TOKEN';
    UrlFetchApp.fetch('https://openapi.zalo.me/v2.0/oa/message', {
      method: 'post',
      headers: { 'access_token': ZALO_ACCESS_TOKEN },
      contentType: 'application/json',
      payload: JSON.stringify({
        recipient: { user_id: recipientPhone },
        message: { text: message }
      })
    });
    */
    
    return ContentService.createTextOutput(JSON.stringify({
      status: 'success',
      receivedAt: timestamp,
      recipient: recipientPhone,
      group: groupId,
      message: 'Google Apps Script đã tiếp nhận bản tin thành công!'
    })).setMimeType(ContentService.MimeType.JSON);
    
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({
      status: 'error',
      message: err.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  return ContentService.createTextOutput(JSON.stringify({
    status: 'online',
    service: 'Tasago Zalo Bot Google Apps Script Webhook Service',
    time: new Date().toISOString()
  })).setMimeType(ContentService.MimeType.JSON);
}
`;

// Generate complete formatted notification message for a list of samples
export function generateSampleNotification(
  samples: ConcreteSample[], 
  stations: Station[], 
  channelType: 'zalo_bot' | 'email' = 'zalo_bot'
): FormattedNotification {
  const stationMap = new Map<string, Station>(); 
  stations.forEach(s => stationMap.set(s.id, s));
  
  const count = samples.length;
  const urgentCount = samples.filter(s => s.status === 'due_today' || s.status === 'overdue').length;
  const title = `[TASAGO] THÔNG BÁO LỊCH NÉN MẪU BÊ TÔNG - ${count} MẪU CẦN THỰC HIỆN`;
  
  const shapeMap: Record<string, string> = { 
    cube_150: 'Mẫu vuông 150x150x150mm', 
    cylinder_150_300: 'Mẫu trụ Ø150x300mm', 
    waterproof_150: 'Mẫu trụ chống thấm', 
    expansion: 'Mẫu bù co ngót', 
    other: 'Mẫu quy cách đặc biệt' 
  };

  const statusBadge = (status: string) => 
    status === 'due_today' ? '🔴 [ĐẾN HẠN HÔM NAY]' : 
    status === 'overdue' ? '⚠️ [QUÁ HẠN CHƯA NÉN]' : 
    status === 'pending' ? '🔵 [SẮP ĐẾN HẠN]' : '📋 [LỊCH NÉN]';

  let text = `📢 CÔNG TY CỔ PHẦN ĐẦU TƯ TASAGO\n`;
  text += `🔔 BÁO CÁO LỊCH NÉN MẪU BÊ TÔNG TỰ ĐỘNG (07:00 SÁNG)\n`;
  text += `⏰ Thời gian phát: ${new Date().toLocaleTimeString('vi-VN')} ngày ${formatDateVN(new Date().toISOString().split('T')[0])}\n`;
  text += `🚨 Tổng số mẫu: ${count} mẫu (${urgentCount} mẫu đến hạn/quá hạn)\n`;
  text += `-------------------------------------------\n\n`;

  samples.forEach((sample, idx) => {
    const station = stationMap.get(sample.stationId); 
    const stationName = station ? station.name : 'Trạm Tasago'; 
    const shape = shapeMap[sample.sampleShape] || sample.sampleShape;

    text += `${idx + 1}. ${statusBadge(sample.status)}: ${sample.projectName.toUpperCase()}\n`;
    text += `   🏢 Trạm trộn: ${stationName}\n`;
    text += `   🏗️ Hạng mục: ${sample.component} (Khối lượng: ${sample.volumeM3} m³)\n`;
    text += `   🧪 Mác bê tông: ${sample.concreteGrade} (Độ sụt: ${sample.slumpCm} cm)\n`;
    text += `   ⏱️ Tuổi nén: ${sample.ageType} (${sample.ageDays} ngày) • ${shape}\n`;
    text += `   📐 Quy cách: ${sample.groupCount} tổ (${sample.pieceCount} viên)\n`;
    text += `   📅 Ngày đúc: ${formatDateVN(sample.castDate)} ➔ Ngày nén: ${formatDateVN(sample.scheduledTestDate)}\n`;
    text += `   👤 Đơn vị thi công: ${sample.contractor}\n`;
    text += `   📞 Người liên hệ: ${sample.contactPerson} - SĐT: ${sample.contactPhone}\n`;
    text += `   👨‍🔬 KTV lấy mẫu: ${sample.samplerName}\n`;
    if (sample.notes) {
      text += `   📝 Ghi chú: ${sample.notes}\n`;
    }
    text += `   👉 Mã mẫu: ${sample.id} (${sample.sampleCode})\n\n`;
  });

  text += `-------------------------------------------\n`;
  text += `⚡ Đề nghị Ban Chỉ Huy Trạm, Kỹ thuật viên & Phòng Thí nghiệm chuẩn bị máy nén và cập nhật kết quả lên Cổng Quản Lý Tasago.\n`;
  text += `🌐 Cổng thông tin: Tasago Concrete Quality Portal`;

  let html = `
    <div style="font-family: Arial, sans-serif; max-width: 680px; margin: 0 auto; border: 1px solid #10b981; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
      <div style="background: linear-gradient(135deg, #065f46 0%, #047857 100%); color: white; padding: 22px 24px;">
        <div style="font-size: 11px; font-weight: bold; letter-spacing: 1px; color: #a7f3d0; text-transform: uppercase;">CÔNG TY CỔ PHẦN ĐẦU TƯ TASAGO</div>
        <h2 style="margin: 6px 0 0 0; font-size: 20px;">BÁO CÁO LỊCH NÉN MẪU BÊ TÔNG (07:00 SÁNG)</h2>
        <p style="margin: 4px 0 0; font-size: 13px; color: #e6fffa;">Tự động nhắc nhở lịch kiểm định chất lượng bê tông & trialmix</p>
      </div>
      <div style="padding: 20px; background: #f8fafc;">
        <div style="background: #ecfdf5; border-left: 4px solid #10b981; padding: 14px; border-radius: 6px; margin-bottom: 16px;">
          <strong style="color: #065f46; font-size: 14px;">🔔 Thông báo:</strong> Có <strong>${count} công trình/mẫu bê tông</strong> cần thực hiện kiểm tra nén mẫu.
        </div>
  `;

  samples.forEach((sample, idx) => {
    const station = stationMap.get(sample.stationId); 
    const stationName = station ? station.name : 'Trạm Tasago'; 
    const isUrgent = sample.status === 'due_today' || sample.status === 'overdue';
    
    html += `
      <div style="background: white; border: 1px solid ${isUrgent ? '#f87171' : '#e2e8f0'}; border-radius: 8px; padding: 16px; margin-bottom: 14px; box-shadow: 0 1px 3px rgba(0,0,0,0.04);">
        <div style="font-weight: bold; color: ${isUrgent ? '#b91c1c' : '#047857'}; font-size: 15px; border-bottom: 1px solid #f1f5f9; padding-bottom: 8px; margin-bottom: 10px; display: flex; justify-content: space-between;">
          <span>#${idx + 1}. ${sample.projectName}</span>
          <span style="font-size: 11px; background: ${isUrgent ? '#fee2e2' : '#e0f2fe'}; color: ${isUrgent ? '#991b1b' : '#0369a1'}; padding: 2px 8px; border-radius: 10px;">
            ${isUrgent ? 'ĐẾN HẠN' : 'SẮP ĐẾN'}
          </span>
        </div>
        <table style="width: 100%; font-size: 13px; color: #334155; line-height: 1.6; border-collapse: collapse;">
          <tr><td style="width: 35%; font-weight: bold; color: #64748b;">Trạm trộn:</td><td><strong>${stationName}</strong></td></tr>
          <tr><td style="font-weight: bold; color: #64748b;">Hạng mục & Khối lượng:</td><td>${sample.component} — <strong>${sample.volumeM3} m³</strong></td></tr>
          <tr><td style="font-weight: bold; color: #64748b;">Mác & Độ sụt:</td><td><strong>${sample.concreteGrade}</strong> (${sample.slumpCm}cm)</td></tr>
          <tr><td style="font-weight: bold; color: #64748b;">Tuổi nén:</td><td><strong style="color: #dc2626;">${sample.ageType} (${sample.ageDays} ngày)</strong></td></tr>
          <tr><td style="font-weight: bold; color: #64748b;">Ngày đúc ➔ Ngày nén:</td><td>${formatDateVN(sample.castDate)} ➔ <strong style="color: #b91c1c;">${formatDateVN(sample.scheduledTestDate)}</strong></td></tr>
          <tr><td style="font-weight: bold; color: #64748b;">Đơn vị thi công:</td><td>${sample.contractor}</td></tr>
          <tr><td style="font-weight: bold; color: #64748b;">Người liên hệ:</td><td><strong>${sample.contactPerson}</strong> — ${sample.contactPhone}</td></tr>
          <tr><td style="font-weight: bold; color: #64748b;">KTV lấy mẫu:</td><td>${sample.samplerName}</td></tr>
        </table>
      </div>
    `;
  });

  html += `
        <div style="text-align: center; margin-top: 20px; padding-top: 15px; border-top: 1px solid #e2e8f0; font-size: 12px; color: #94a3b8;">
          © ${new Date().getFullYear()} CÔNG TY CỔ PHẦN ĐẦU TƯ TASAGO — BÊ TÔNG XANH SÀI GÒN
        </div>
      </div>
    </div>
  `;

  return { 
    title, 
    bodyText: text, 
    zaloMarkdown: text, 
    htmlContent: html, 
    sampleSummary: `${count} mẫu (${urgentCount} mẫu cần nén gấp)`, 
    urgentCount 
  };
}

export function playAlertChime() { 
  try { 
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext; 
    if (!AudioContextClass) return; 
    const ctx = new AudioContextClass(); 
    const now = ctx.currentTime; 
    const osc1 = ctx.createOscillator(); 
    const gain1 = ctx.createGain(); 
    osc1.type = 'sine'; 
    osc1.frequency.setValueAtTime(659.25, now); 
    gain1.gain.setValueAtTime(0.15, now); 
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.35); 
    osc1.connect(gain1); 
    gain1.connect(ctx.destination); 
    osc1.start(now); 
    osc1.stop(now + 0.35); 
  } catch {} 
}

export async function requestBrowserNotificationPermission(): Promise<boolean> { 
  if (!('Notification' in window)) return false; 
  if (Notification.permission === 'granted') return true; 
  if (Notification.permission !== 'denied') return (await Notification.requestPermission()) === 'granted'; 
  return false; 
}

export function showSystemPushNotification(title: string, body: string, tag = 'tasago-sample-alert') { 
  if (!('Notification' in window) || Notification.permission !== 'granted') return; 
  try { 
    new Notification(title, { body, icon: 'https://cdn-icons-png.flaticon.com/512/3050/3050525.png', tag, requireInteraction: true }); 
  } catch {} 
}

export async function checkAndTriggerAutoNotifications(
  samples: ConcreteSample[], 
  stations: Station[], 
  config: NotificationConfig, 
  forceRun = false
): Promise<{ triggered: boolean; urgentCount: number; message: string }> {
  const urgentSamples = samples.filter(s => s.status === 'due_today' || s.status === 'overdue'); 
  if (!urgentSamples.length) return { triggered: false, urgentCount: 0, message: 'Không có mẫu nào đến hạn hoặc quá hạn hôm nay.' };
  
  const vnTimeStr = new Date().toLocaleTimeString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', hour12: false }); 
  const currentVnHour = Number(vnTimeStr.split(':')[0]); 
  const targetHour = config.autoSendHour ?? 7; 
  const todayStr = new Date().toISOString().split('T')[0]; 
  const lastAutoRunKey = `tasago_last_auto_notif_${todayStr}`; 
  const alreadyRanToday = localStorage.getItem(lastAutoRunKey);
  
  if (!forceRun && (currentVnHour < targetHour || alreadyRanToday)) {
    return { 
      triggered: false, 
      urgentCount: urgentSamples.length, 
      message: currentVnHour < targetHour ? `Chưa đến giờ gửi thông báo tự động (Cài đặt: ${targetHour}:00).` : 'Thông báo tự động hôm nay đã được thực hiện.' 
    };
  }

  let dispatchResult = { success: true, message: '' }; 
  if (config.autoZaloEnabled || config.autoEmailEnabled || forceRun) { 
    const channel = config.autoZaloEnabled && config.autoEmailEnabled ? 'both' : config.autoZaloEnabled ? 'zalo_bot' : 'email'; 
    dispatchResult = await dispatchNotification(urgentSamples, stations, config, channel); 
  }
  
  localStorage.setItem(lastAutoRunKey, new Date().toISOString()); 
  return { 
    triggered: true, 
    urgentCount: urgentSamples.length, 
    message: dispatchResult.message || `Đã tự động gửi thông báo 07:00 sáng cho ${urgentSamples.length} mẫu bê tông đến hạn nén!` 
  };
}

export async function dispatchNotification(
  samples: ConcreteSample[], 
  stations: Station[], 
  config: NotificationConfig, 
  channel: 'zalo_bot' | 'email' | 'both'
): Promise<{ success: boolean; message: string; logIds: string[] }> {
  if (!samples.length) return { success: false, message: 'Không có mẫu bê tông nào để gửi thông báo.', logIds: [] };
  
  const notif = generateSampleNotification(samples, stations); 
  const logIds: string[] = []; 
  const results: string[] = [];

  // 1. Zalo Bot Dispatching (Personal & Group)
  if (channel === 'zalo_bot' || channel === 'both') {
    let zaloStatus: 'success' | 'failed' | 'simulated' = 'simulated'; 
    let errorDetails: string | undefined;
    const personalPhone = config.zaloPersonalPhone || '0942320923';
    const groupName = config.zaloGroupId || 'Nhóm Kỹ Thuật Tasago';
    const recipientLabel = config.zaloRecipientType === 'personal' ? `Zalo Cá Nhân (${personalPhone})` : config.zaloRecipientType === 'group' ? `Nhóm Zalo (${groupName})` : `Zalo Cá Nhân (${personalPhone}) & Nhóm (${groupName})`;

    try {
      const zaloRes = await fetch(apiUrl('/api/notifications/send-zalo'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          samples,
          stations,
          webhookUrl: config.zaloWebhookUrl,
          botToken: config.zaloBotToken,
          personalPhone,
          groupId: groupName,
          recipientType: config.zaloRecipientType || 'both',
          customMessage: notif.bodyText
        })
      });

      const zaloData = await zaloRes.json().catch(() => null);
      if (zaloRes.ok && zaloData?.success) {
        zaloStatus = 'success';
        errorDetails = zaloData.message;
        results.push(`Bot Zalo: ${zaloData.message || 'Thành công'}`);
      } else {
        errorDetails = zaloData?.message || `Lỗi Webhook HTTP ${zaloRes.status}`;
        results.push(`Bot Zalo: ${errorDetails}`);
      }
    } catch (e: any) {
      errorDetails = e?.message || 'Không thể kết nối máy chủ Zalo Bot';
      results.push(`Bot Zalo: ${errorDetails}`);
    }

    const log = addNotificationLog({ 
      channel: 'zalo_bot', 
      recipient: recipientLabel, 
      sampleIds: samples.map(s => s.id), 
      sampleInfoSummary: notif.sampleSummary, 
      messageContent: notif.bodyText, 
      status: zaloStatus, 
      errorDetails 
    }); 
    logIds.push(log.id);
  }

  // 2. Email Dispatching
  if (channel === 'email' || channel === 'both') {
    const recipients = (config.emailRecipients || []).filter(r => r.trim()); 
    const recipientsStr = recipients.join(', ') || 'kythuat@tasago.vn, thanhtgndt@gmail.com'; 
    let emailStatus: 'success' | 'failed' | 'simulated' = 'failed'; 
    let emailError: string | undefined;

    try {
      const response = await fetch(apiUrl('/api/notifications/send-email'), { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify({ 
          recipients: recipients.length ? recipients : ['kythuat@tasago.vn', 'thanhtgndt@gmail.com'], 
          subject: notif.title, 
          html: notif.htmlContent, 
          plainText: notif.bodyText 
        }) 
      });

      const data = await response.json().catch(() => null); 
      if (response.ok && data?.success) { 
        emailStatus = 'success'; 
        emailError = data.message; 
        results.push(`Email: Đã gửi tới ${recipients.length || 2} địa chỉ`); 
      } else { 
        emailError = data?.message || `Máy chủ email trả về HTTP ${response.status}`; 
        results.push(`Email: ${emailError}`); 
      }
    } catch (e: any) { 
      emailError = e?.message || 'Không thể kết nối máy chủ gửi email'; 
      results.push(`Email: ${emailError}`); 
    }

    const log = addNotificationLog({ 
      channel: 'email', 
      recipient: recipientsStr, 
      sampleIds: samples.map(s => s.id), 
      sampleInfoSummary: notif.sampleSummary, 
      messageContent: notif.htmlContent, 
      status: emailStatus, 
      errorDetails: emailError 
    }); 
    logIds.push(log.id);
  }

  return { 
    success: true, 
    message: `Đã kích hoạt gửi thông báo (${results.join(' | ')}) cho ${samples.length} mẫu nén.`, 
    logIds 
  };
}

export function generateMailtoUrl(recipients: string[], subject: string, bodyText: string): string { 
  const to = recipients.filter(r => r.includes('@')).join(','); 
  return `mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(bodyText)}`; 
}

export interface ProfessionalEmailResult {
  html: string;
  text: string;
  urgentCount: number;
  dueTodayCount: number;
  overdueCount: number;
  totalCount: number;
}

export interface ProfessionalEmailOptions {
  targetDate?: string;
  title?: string;
  subtitle?: string;
  intro?: string;
  generatedAt?: Date;
}

const shapeMap: Record<string, string> = {
  cube_150: 'Mẫu vuông 150 × 150 × 150 mm',
  cylinder_150_300: 'Mẫu trụ Ø150 × 300 mm',
  waterproof_150: 'Mẫu trụ chống thấm',
  expansion: 'Mẫu bù co ngót',
  other: 'Mẫu quy cách đặc biệt',
};

function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function formatDateVN(value?: string): string {
  if (!value) return '---';
  const parts = value.split('-');
  return parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : value;
}

function vietnamDateIso(date = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map(part => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function vietnamDateTime(date = new Date()): string {
  return date.toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
}

function displayValue(value: unknown, fallback = '---'): string {
  const text = String(value ?? '').trim();
  return text || fallback;
}

function statusFor(sample: any) {
  if (sample.status === 'overdue') {
    return { label: 'QUÁ HẠN CHƯA NÉN', bg: '#FEE2E2', color: '#991B1B', border: '#EF4444' };
  }
  if (sample.status === 'due_today') {
    return { label: 'ĐẾN HẠN HÔM NAY', bg: '#FEF3C7', color: '#92400E', border: '#F59E0B' };
  }
  return { label: 'SẮP ĐẾN HẠN', bg: '#DBEAFE', color: '#1D4ED8', border: '#3B82F6' };
}

function sampleText(sample: any, stationName: string, index: number): string {
  const status = statusFor(sample);
  const shape = shapeMap[sample.sampleShape] || displayValue(sample.sampleShape);
  return [
    `${index + 1}. ${status.label}: ${displayValue(sample.projectName || sample.sampleCode || sample.id)}`,
    `   Trạm trộn: ${stationName}`,
    `   Hạng mục: ${displayValue(sample.component)} | Khối lượng: ${displayValue(sample.volumeM3, '0')} m³`,
    `   Mác bê tông: ${displayValue(sample.concreteGrade)} | Độ sụt: ${displayValue(sample.slumpCm)} cm`,
    `   Tuổi nén: ${displayValue(sample.ageType)} (${displayValue(sample.ageDays)} ngày) | Quy cách: ${shape}`,
    `   Tổ mẫu: ${displayValue(sample.groupCount)} tổ / ${displayValue(sample.pieceCount)} viên`,
    `   Ngày đúc: ${formatDateVN(sample.castDate)} | Ngày nén: ${formatDateVN(sample.scheduledTestDate)}`,
    `   Đơn vị thi công: ${displayValue(sample.contractor)}`,
    `   Liên hệ: ${displayValue(sample.contactPerson)} - ${displayValue(sample.contactPhone)}`,
    `   KTV lấy mẫu: ${displayValue(sample.samplerName)}`,
    sample.notes ? `   Ghi chú: ${sample.notes}` : '',
  ].filter(Boolean).join('\n');
}

function infoRow(label: string, value: string, accent = '#0F172A') {
  return `<tr><td style="width:38%;padding:5px 0;color:#64748B;font-size:12px;line-height:18px;vertical-align:top;">${label}</td><td style="padding:5px 0;color:${accent};font-size:13px;font-weight:600;line-height:18px;vertical-align:top;">${value}</td></tr>`;
}

function sampleHtml(sample: any, stationName: string, index: number): string {
  const status = statusFor(sample);
  const shape = shapeMap[sample.sampleShape] || displayValue(sample.sampleShape);
  const project = escapeHtml(displayValue(sample.projectName || sample.sampleCode || sample.id));
  const notes = sample.notes ? infoRow('Ghi chú', escapeHtml(sample.notes), '#475569') : '';
  return `
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border-collapse:separate;margin:0 0 14px;background:#FFFFFF;border:1px solid #E2E8F0;border-left:4px solid ${status.border};border-radius:10px;">
      <tr><td style="padding:16px 18px 15px;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border-collapse:collapse;">
          <tr>
            <td style="padding:0 8px 11px 0;color:#0F172A;font-size:15px;font-weight:800;line-height:21px;">${index + 1}. ${project}</td>
            <td align="right" style="padding:0 0 11px;white-space:nowrap;"><span style="display:inline-block;padding:5px 8px;background:${status.bg};border-radius:999px;color:${status.color};font-size:10px;font-weight:800;letter-spacing:.3px;line-height:12px;">${status.label}</span></td>
          </tr>
        </table>
        <div style="height:1px;background:#F1F5F9;font-size:1px;line-height:1px;">&nbsp;</div>
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border-collapse:collapse;margin-top:7px;">
          ${infoRow('Trạm trộn', escapeHtml(stationName), '#0F766E')}
          ${infoRow('Hạng mục / khối lượng', `${escapeHtml(displayValue(sample.component))} &nbsp;·&nbsp; <span style="color:#047857;">${escapeHtml(displayValue(sample.volumeM3, '0'))} m³</span>`)}
          ${infoRow('Mác / độ sụt', `<span style="color:#0F766E;">${escapeHtml(displayValue(sample.concreteGrade))}</span> &nbsp;·&nbsp; ${escapeHtml(displayValue(sample.slumpCm))} cm`)}
          ${infoRow('Tuổi nén / quy cách', `<span style="color:#B45309;">${escapeHtml(displayValue(sample.ageType))} (${escapeHtml(displayValue(sample.ageDays))} ngày)</span> &nbsp;·&nbsp; ${escapeHtml(shape)} · ${escapeHtml(displayValue(sample.groupCount))} tổ / ${escapeHtml(displayValue(sample.pieceCount))} viên`)}
          ${infoRow('Ngày đúc / ngày nén', `${escapeHtml(formatDateVN(sample.castDate))} &nbsp;→&nbsp; <span style="color:#B91C1C;">${escapeHtml(formatDateVN(sample.scheduledTestDate))}</span>`)}
          ${infoRow('Đơn vị thi công', escapeHtml(displayValue(sample.contractor)))}
          ${infoRow('Liên hệ công trình', `${escapeHtml(displayValue(sample.contactPerson))} &nbsp;·&nbsp; ${escapeHtml(displayValue(sample.contactPhone))}`)}
          ${infoRow('KTV lấy mẫu', escapeHtml(displayValue(sample.samplerName)))}
          ${notes}
        </table>
      </td></tr>
    </table>`;
}

export function buildProfessionalEmail(
  samples: any[],
  stations: any[],
  options: ProfessionalEmailOptions = {},
): ProfessionalEmailResult {
  const stationMap = new Map((stations || []).map(station => [station.id, station.name]));
  const totalCount = samples.length;
  const overdueCount = samples.filter(sample => sample.status === 'overdue').length;
  const dueTodayCount = samples.filter(sample => sample.status === 'due_today').length;
  const urgentCount = overdueCount + dueTodayCount;
  const targetDate = options.targetDate || vietnamDateIso();
  const generatedAt = options.generatedAt || new Date();
  const title = options.title || 'BÁO CÁO LỊCH NÉN MẪU BÊ TÔNG';
  const subtitle = options.subtitle || 'Tự động nhắc nhở lịch kiểm định chất lượng bê tông';
  const intro = options.intro || (urgentCount > 0
    ? 'Vui lòng ưu tiên chuẩn bị máy nén và cập nhật kết quả cho các mẫu đang đến hạn.'
    : 'Danh sách dưới đây là các mẫu cần theo dõi và thực hiện theo kế hoạch.');
  const preheader = `${totalCount} mẫu cần theo dõi · ${urgentCount} mẫu đến hạn hoặc quá hạn`;
  const sampleTexts = samples.map((sample, index) => sampleText(sample, displayValue(stationMap.get(sample.stationId), 'Trạm Tasago'), index));
  const text = [
    'CÔNG TY CỔ PHẦN ĐẦU TƯ TASAGO',
    title,
    `Ngày báo cáo: ${formatDateVN(targetDate)}`,
    `Phát lúc: ${vietnamDateTime(generatedAt)}`,
    '',
    `TỔNG QUAN: ${totalCount} mẫu | Đến hạn hôm nay: ${dueTodayCount} | Quá hạn: ${overdueCount}`,
    intro,
    '',
    ...sampleTexts,
    '',
    'Đề nghị Ban Chỉ Huy Trạm, Kỹ thuật viên và Phòng Thí nghiệm chuẩn bị máy nén, sau đó cập nhật kết quả lên Cổng Quản Lý Tasago.',
    'Email được gửi tự động từ Cổng Quản Lý Tasago.',
  ].join('\n');

  const cards = samples.map((sample, index) => sampleHtml(sample, displayValue(stationMap.get(sample.stationId), 'Trạm Tasago'), index)).join('');
  const html = `<!doctype html>
<html lang="vi">
<head><meta http-equiv="Content-Type" content="text/html; charset=UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>${escapeHtml(title)}</title></head>
<body style="margin:0;padding:0;background:#F1F5F9;color:#1E293B;font-family:Arial,Helvetica,sans-serif;-webkit-text-size-adjust:100%;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${escapeHtml(preheader)}&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;</div>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border-collapse:collapse;background:#F1F5F9;">
    <tr><td align="center" style="padding:24px 10px;">
      <table role="presentation" width="680" cellspacing="0" cellpadding="0" border="0" style="width:100%;max-width:680px;border-collapse:separate;background:#FFFFFF;border:1px solid #D7E1E8;border-radius:14px;overflow:hidden;">
        <tr><td bgcolor="#075E54" style="padding:24px 28px;background:#075E54;color:#FFFFFF;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border-collapse:collapse;"><tr>
            <td style="vertical-align:top;">
              <div style="font-size:11px;font-weight:800;letter-spacing:1.2px;color:#A7F3D0;line-height:16px;">CÔNG TY CỔ PHẦN ĐẦU TƯ TASAGO</div>
              <div style="margin-top:7px;font-size:22px;font-weight:800;line-height:28px;color:#FFFFFF;">${escapeHtml(title)}</div>
              <div style="margin-top:7px;font-size:13px;line-height:20px;color:#D1FAE5;">${escapeHtml(subtitle)}</div>
            </td>
            <td align="right" style="width:86px;padding-left:10px;vertical-align:top;"><div style="display:inline-block;padding:9px 10px;border:1px solid #6EE7B7;border-radius:9px;color:#ECFDF5;font-size:11px;font-weight:800;line-height:14px;">TASAGO<br><span style="font-size:9px;font-weight:600;">QA / QC</span></div></td>
          </tr></table>
        </td></tr>
        <tr><td style="padding:24px 28px 8px;">
          <div style="font-size:13px;color:#64748B;line-height:20px;">Báo cáo ngày <strong style="color:#0F172A;">${escapeHtml(formatDateVN(targetDate))}</strong> &nbsp;·&nbsp; Phát lúc ${escapeHtml(vietnamDateTime(generatedAt))}</div>
          <div style="margin-top:14px;padding:14px 16px;background:${urgentCount ? '#FFF7ED' : '#F0FDF4'};border:1px solid ${urgentCount ? '#FED7AA' : '#BBF7D0'};border-left:4px solid ${urgentCount ? '#F59E0B' : '#10B981'};border-radius:9px;color:${urgentCount ? '#9A3412' : '#166534'};font-size:13px;line-height:20px;">${escapeHtml(intro)}</div>
        </td></tr>
        <tr><td style="padding:12px 28px 20px;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border-collapse:separate;"><tr>
            <td width="33.33%" style="padding:0 5px 0 0;"><div style="padding:13px 10px;background:#F8FAFC;border:1px solid #E2E8F0;border-radius:9px;text-align:center;"><div style="font-size:22px;font-weight:800;color:#0F172A;line-height:26px;">${totalCount}</div><div style="margin-top:3px;font-size:10px;font-weight:700;letter-spacing:.4px;color:#64748B;">TỔNG SỐ MẪU</div></div></td>
            <td width="33.33%" style="padding:0 3px;"><div style="padding:13px 10px;background:#FFFBEB;border:1px solid #FDE68A;border-radius:9px;text-align:center;"><div style="font-size:22px;font-weight:800;color:#B45309;line-height:26px;">${dueTodayCount}</div><div style="margin-top:3px;font-size:10px;font-weight:700;letter-spacing:.4px;color:#92400E;">ĐẾN HẠN HÔM NAY</div></div></td>
            <td width="33.33%" style="padding:0 0 0 5px;"><div style="padding:13px 10px;background:#FEF2F2;border:1px solid #FECACA;border-radius:9px;text-align:center;"><div style="font-size:22px;font-weight:800;color:#B91C1C;line-height:26px;">${overdueCount}</div><div style="margin-top:3px;font-size:10px;font-weight:700;letter-spacing:.4px;color:#991B1B;">QUÁ HẠN</div></div></td>
          </tr></table>
        </td></tr>
        <tr><td style="padding:0 28px 10px;"><div style="font-size:14px;font-weight:800;letter-spacing:.2px;color:#0F172A;">Danh sách cần thực hiện</div><div style="margin-top:5px;font-size:12px;color:#64748B;line-height:18px;">Vui lòng kiểm tra thông tin từng mẫu trước khi bố trí nén.</div></td></tr>
        <tr><td style="padding:8px 28px 18px;">${cards || '<div style="padding:18px;background:#F8FAFC;border-radius:9px;color:#64748B;font-size:13px;">Không có mẫu cần thông báo.</div>'}</td></tr>
        <tr><td bgcolor="#0F172A" style="padding:20px 28px;background:#0F172A;color:#CBD5E1;">
          <div style="font-size:12px;font-weight:700;line-height:18px;">CÔNG TY CỔ PHẦN ĐẦU TƯ TASAGO</div>
          <div style="margin-top:4px;font-size:11px;line-height:17px;color:#94A3B8;">BÊ TÔNG XANH SÀI GÒN · BÊ TÔNG CỦA MỌI CÔNG TRÌNH</div>
          <div style="margin-top:12px;padding-top:10px;border-top:1px solid #334155;font-size:10px;line-height:16px;color:#64748B;">Email tự động từ Cổng Quản Lý Tasago. Vui lòng không trả lời trực tiếp email này.</div>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  return { html, text, urgentCount, dueTodayCount, overdueCount, totalCount };
}

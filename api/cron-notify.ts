// Vercel Serverless Function & Automated Cron Handler
// Route: /api/cron-notify
// Scheduled via Vercel Cron (00:00 UTC = 07:00 AM Vietnam GMT+7)

import nodemailer from 'nodemailer';

const isEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

// Helper: Format Vietnamese Date
function formatDateVN(dateStr?: string): string {
  if (!dateStr) return '---';
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return dateStr;
}

export default async function handler(req: any, res: any) {
  // Allow GET (Vercel Cron triggers GET by default) and POST
  if (req.method !== 'GET' && req.method !== 'POST') {
    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ success: false, message: 'Method Not Allowed' });
  }

  try {
    // Check Cron Secret if configured in Vercel Environment Variables.
    // IMPORTANT: this must actually BLOCK the request on mismatch — a previous
    // version only logged a warning and let the request continue, which meant
    // anyone could trigger this endpoint (and choose recipients via ?recipients=)
    // regardless of whether CRON_SECRET was set.
    const cronSecret = process.env.CRON_SECRET;
    if (cronSecret) {
      const authHeader = req.headers['authorization'];
      const querySecret = typeof req.query?.secret === 'string' ? req.query.secret : undefined;
      const isAuthorized = authHeader === `Bearer ${cronSecret}` || querySecret === cronSecret;
      if (!isAuthorized) {
        console.warn('Vercel Cron: Secret mismatch or missing — request blocked');
        return res.status(401).json({ success: false, message: 'Unauthorized: invalid or missing CRON_SECRET' });
      }
    }

    // NOTE: this endpoint currently sends a fixed set of DEMO/PLACEHOLDER sample
    // items below — it is NOT wired to the real sample data in server.ts's
    // in-memory state (which lives in a separate process on Render, per
    // render.yaml). Do not enable this as an automatic daily cron until it is
    // wired to real data (see api_base_url / internal API note) — otherwise it
    // will send fabricated "due today" reports. It has been removed from the
    // automatic Vercel cron schedule in vercel.json; keep it as a manual/test
    // endpoint only (protected by CRON_SECRET above) until that's done.

    const now = new Date();
    const todayVNStr = now.toLocaleDateString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
    const todayISO = now.toISOString().split('T')[0];
    const timeVN = now.toLocaleTimeString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });

    // 1. Resolve Email Recipients
    const envRecipients = (process.env.EMAIL_RECIPIENTS || 'thanhtgndt@gmail.com, kythuat@tasago.vn')
      .split(',')
      .map(r => r.trim())
      .filter(isEmail);

    const queryRecipients = typeof req.query?.recipients === 'string'
      ? req.query.recipients.split(',').map((r: string) => r.trim()).filter(isEmail)
      : [];

    const finalRecipients = queryRecipients.length > 0 ? queryRecipients : envRecipients;

    // 2. Build Daily Report Content
    const sampleItems = [
      {
        project: 'Khu Đô Thị Phúc An City - Tháp Ruby (Giai Đoạn 2)',
        station: 'Trạm Tasago Xuyên Á (KCN Xuyên Á)',
        component: 'Dầm Sàn Tầng 12 (Trục B-D)',
        grade: 'B25 (M350) - R7',
        volume: '145.0 m³',
        castDate: '14/08/2026',
        testDate: todayVNStr,
        age: 'R7 (7 Ngày)',
        contractor: 'Công Ty CP Xây Dựng Central Cons',
        contact: 'Kỹ Sư Tuấn (0918.234.567)',
        ktv: 'Nguyễn Văn Thành',
        status: 'ĐẾN HẠN HÔM NAY'
      },
      {
        project: 'Nhà Máy Dược Phẩm Quốc Tế VinaPharm',
        station: 'Trạm Tasago Hóc Môn (TP.HCM)',
        component: 'Đài Cọc & Giằng Móng Khối Nhà Xưởng 01',
        grade: 'B30 (M400) - R28 Chống Thấm B8',
        volume: '88.5 m³',
        castDate: '24/07/2026',
        testDate: todayVNStr,
        age: 'R28 (28 Ngày)',
        contractor: 'Công Ty TNHH Xây Dựng Thuận Việt',
        contact: 'Chỉ Huy Trưởng Đức (0903.888.777)',
        ktv: 'Trần Minh Quang',
        status: 'ĐẾN HẠN HÔM NAY'
      },
      {
        project: 'Tổ Hợp Chung Cư Cao Cấp Green River',
        station: 'Trạm Tasago Tân Phú (KCN Tân Bình)',
        component: 'Vách Thang Máy Trục Lõi L1-L4',
        grade: 'B35 (M450) - R3',
        volume: '62.0 m³',
        castDate: '18/08/2026',
        testDate: todayVNStr,
        age: 'R3 (3 Ngày)',
        contractor: 'Tổng Thầu Xây Dựng Ricons',
        contact: 'Kỹ Sư Trưởng Long (0979.112.233)',
        ktv: 'Lê Hoàng Phong',
        status: 'ĐẾN HẠN HÔM NAY'
      },
      {
        project: 'Đường Nội Bộ & Hạ Tầng KCN Thành Thành Công',
        station: 'Trạm Tasago-TNT1 Tây Ninh',
        component: 'Bê Tông Mặt Đường Khu D2-D4',
        grade: 'B20 (M250) - R14',
        volume: '120.0 m³',
        castDate: '07/08/2026',
        testDate: todayVNStr,
        age: 'R14 (14 Ngày)',
        contractor: 'Ban Quản Lý Hạ Tầng KCN',
        contact: 'Kỹ Sư Nam (0988.556.789)',
        ktv: 'Võ Minh Trí',
        status: 'ĐẾN HẠN HÔM NAY'
      }
    ];

    const subject = `[TASAGO] Báo Cáo Lịch Nén Mẫu Bê Tông 07:00 Sáng - Ngày ${todayVNStr}`;

    let textBody = `📢 CÔNG TY CỔ PHẦN ĐẦU TƯ TASAGO\n`;
    textBody += `🔔 BÁO CÁO LỊCH NÉN MẪU BÊ TÔNG 07:00 SÁNG (${todayVNStr})\n`;
    textBody += `⏰ Thời gian kích hoạt: ${timeVN} (Vercel Cloud Cron Tự Động)\n`;
    textBody += `-------------------------------------------\n\n`;

    sampleItems.forEach((item, idx) => {
      textBody += `${idx + 1}. [${item.status}] - ${item.project}\n`;
      textBody += `   🏢 Trạm: ${item.station}\n`;
      textBody += `   🏗️ Hạng mục: ${item.component} (${item.volume})\n`;
      textBody += `   🧪 Mác bê tông: ${item.grade}\n`;
      textBody += `   ⏱️ Tuổi nén: ${item.age} (Đúc: ${item.castDate} ➔ Nén: ${item.testDate})\n`;
      textBody += `   👤 Đơn vị thi công: ${item.contractor}\n`;
      textBody += `   📞 Liên hệ: ${item.contact}\n`;
      textBody += `   👨‍🔬 KTV lấy mẫu: ${item.ktv}\n\n`;
    });

    textBody += `-------------------------------------------\n`;
    textBody += `⚡ Đề nghị Ban Chỉ Huy Trạm & KTV chuẩn bị máy nén, liên hệ công trình và cập nhật kết quả lên Cổng Tasago.\n`;

    let htmlBody = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Tasago Concrete Reminder</title>
      </head>
      <body style="margin: 0; padding: 20px; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b;">
        <div style="max-width: 680px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); border: 1px solid #cbd5e1;">
          
          <!-- Banner Header -->
          <div style="background: linear-gradient(135deg, #065f46 0%, #047857 100%); color: #ffffff; padding: 24px 28px;">
            <div style="font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #a7f3d0; margin-bottom: 4px;">
              CÔNG TY CỔ PHẦN ĐẦU TƯ TASAGO
            </div>
            <h1 style="margin: 0; font-size: 20px; font-weight: 800; line-height: 1.3;">
              BÁO CÁO LỊCH NÉN MẪU BÊ TÔNG 07:00 SÁNG
            </h1>
            <p style="margin: 6px 0 0 0; font-size: 13px; color: #e6fffa;">
              Ngày ${todayVNStr} • Tự động nhắc nhở từ Vercel Cloud Serverless Cron
            </p>
          </div>

          <!-- Summary Alert -->
          <div style="padding: 16px 24px; background: #ecfdf5; border-bottom: 1px solid #a7f3d0;">
            <div style="font-size: 14px; font-weight: 700; color: #065f46;">
              🔔 Tổng hợp: Có <strong>${sampleItems.length} công trình/mẫu bê tông</strong> có lịch nén đến hạn hôm nay.
            </div>
            <div style="font-size: 12px; color: #047857; margin-top: 2px;">
              Đã tự động gửi tới: <strong>${finalRecipients.join(', ')}</strong>
            </div>
          </div>

          <!-- Items List -->
          <div style="padding: 20px 24px;">
    `;

    sampleItems.forEach((item, idx) => {
      htmlBody += `
        <div style="background: #ffffff; border: 1px solid #e2e8f0; border-left: 4px solid #059669; border-radius: 8px; padding: 14px 16px; margin-bottom: 14px; box-shadow: 0 1px 2px rgba(0,0,0,0.03);">
          <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #f1f5f9; padding-bottom: 6px; margin-bottom: 8px;">
            <strong style="color: #065f46; font-size: 14px;">#${idx + 1}. ${item.project}</strong>
            <span style="background: #fee2e2; color: #991b1b; padding: 2px 8px; border-radius: 10px; font-size: 10px; font-weight: 800;">
              🔴 ĐẾN HẠN HÔM NAY
            </span>
          </div>
          <table style="width: 100%; font-size: 12px; color: #334155; line-height: 1.6;">
            <tr>
              <td style="width: 35%; font-weight: 700; color: #64748b;">Trạm sản xuất:</td>
              <td><strong>${item.station}</strong></td>
            </tr>
            <tr>
              <td style="font-weight: 700; color: #64748b;">Hạng mục & Khối lượng:</td>
              <td>${item.component} — <strong style="color: #047857;">${item.volume}</strong></td>
            </tr>
            <tr>
              <td style="font-weight: 700; color: #64748b;">Mác bê tông:</td>
              <td><strong style="color: #0f766e;">${item.grade}</strong></td>
            </tr>
            <tr>
              <td style="font-weight: 700; color: #64748b;">Tuổi nén & Ngày:</td>
              <td><strong style="color: #b91c1c;">${item.age}</strong> (Đúc: ${item.castDate} ➔ Nén: <strong>${item.testDate}</strong>)</td>
            </tr>
            <tr>
              <td style="font-weight: 700; color: #64748b;">Đơn vị thi công:</td>
              <td>${item.contractor}</td>
            </tr>
            <tr>
              <td style="font-weight: 700; color: #64748b;">Liên hệ & KTV:</td>
              <td>${item.contact} • KTV: ${item.ktv}</td>
            </tr>
          </table>
        </div>
      `;
    });

    htmlBody += `
          </div>

          <!-- Footer -->
          <div style="padding: 16px 24px; background: #0f172a; color: #94a3b8; font-size: 11px; text-align: center; border-top: 1px solid #1e293b;">
            <div style="font-weight: 700; color: #cbd5e1; margin-bottom: 2px;">
              CÔNG TY CỔ PHẦN ĐẦU TƯ TASAGO — HỆ THỐNG KIỂM ĐỊNH CHẤT LƯỢNG BÊ TÔNG
            </div>
            <div>BÊ TÔNG XANH SÀI GÒN • BÊ TÔNG CỦA MỌI CÔNG TRÌNH</div>
            <div style="margin-top: 6px; color: #64748b; font-size: 10px;">
              Email này được phát tự động mỗi 07:00 sáng từ Vercel Cloud Serverless Cron.
            </div>
          </div>

        </div>
      </body>
      </html>
    `;

    let emailSent = false;
    let emailDetail = '';

    // 3. Send Email via Nodemailer (SMTP Gmail STARTTLS)
    const host = process.env.SMTP_HOST || 'smtp.gmail.com';
    const port = Number(process.env.SMTP_PORT || 587);
    const user = (process.env.SMTP_USER || 'tasagotnt@gmail.com').trim();
    const rawPass = (process.env.SMTP_PASS || '');
    const pass = rawPass.replace(/\s+/g, '');
    const isSecure = String(process.env.SMTP_SECURE).toLowerCase() === 'true' || port === 465;
    const from = process.env.SMTP_FROM || (user ? `Bê Tông Tasago <${user}>` : 'Bê Tông Tasago <tasagotnt@gmail.com>');

    if (host && user && pass) {
      try {
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

        const info = await transporter.sendMail({
          from: from.includes('<') ? from : `Bê Tông Tasago <${user}>`,
          to: finalRecipients.join(', '),
          subject,
          text: textBody,
          html: htmlBody
        });

        emailSent = true;
        emailDetail = `Đã gửi thành công qua SMTP ${host}:${port} (MessageId: ${info.messageId})`;
      } catch (smtpErr: any) {
        console.error('Lỗi khi gửi email SMTP trên Vercel Cron:', smtpErr);
        emailDetail = `Lỗi SMTP: ${smtpErr.message}`;
      }
    } else if (process.env.RESEND_API_KEY) {
      try {
        const resendRes = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${process.env.RESEND_API_KEY}`
          },
          body: JSON.stringify({
            from: from.includes('<') ? from : `Tasago Portal <${from}>`,
            to: finalRecipients,
            subject,
            html: htmlBody,
            text: textBody
          })
        });
        const resendData = await resendRes.json().catch(() => ({}));
        if (resendRes.ok) {
          emailSent = true;
          emailDetail = `Đã gửi thành công qua Resend API (ID: ${resendData.id})`;
        } else {
          emailDetail = `Lỗi Resend API: ${JSON.stringify(resendData)}`;
        }
      } catch (resendErr: any) {
        emailDetail = `Lỗi Resend: ${resendErr.message}`;
      }
    } else {
      emailDetail = 'Chưa cấu hình biến môi trường SMTP_PASS trên Vercel Settings để gửi email thực tế.';
    }

    // 4. Send Zalo Webhook if configured
    let zaloSent = false;
    const zaloWebhookUrl = process.env.ZALO_WEBHOOK_URL;
    const zaloBotToken = process.env.ZALO_BOT_TOKEN;
    if (zaloWebhookUrl && zaloWebhookUrl.startsWith('http')) {
      try {
        const webhookRes = await fetch(zaloWebhookUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(zaloBotToken ? { Authorization: `Bearer ${zaloBotToken}` } : {})
          },
          body: JSON.stringify({
            event: 'VERCEL_CRON_DAILY_SAMPLE_REMINDER',
            company: 'CÔNG TY CỔ PHẦN ĐẦU TƯ TASAGO',
            slogan: 'BÊ TÔNG XANH SÀI GÒN - BÊ TÔNG CỦA MỌI CÔNG TRÌNH',
            timestamp: now.toISOString(),
            message: {
              text: textBody
            }
          })
        });
        zaloSent = webhookRes.ok;
      } catch (zaloErr) {
        console.warn('Zalo Webhook notice:', zaloErr);
      }
    }

    return res.status(200).json({
      success: true,
      service: 'Tasago Vercel Cloud Cron 07:00 AM',
      executedAtVN: `${timeVN} ${todayVNStr}`,
      emailStatus: {
        sent: emailSent,
        detail: emailDetail,
        recipients: finalRecipients
      },
      zaloStatus: {
        sent: zaloSent
      },
      sampleCount: sampleItems.length
    });

  } catch (error: any) {
    console.error('Lỗi Vercel Cron:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Lỗi không xác định khi chạy Vercel Cron'
    });
  }
}

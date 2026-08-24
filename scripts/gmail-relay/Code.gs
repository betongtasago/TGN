const RELAY_SECRET = 'THAY_BANG_CHUOI_BI_MAT_DAI';

function jsonResponse(payload) {
  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}

function isAuthorized(body) {
  return String(body && body.relaySecret || '') === RELAY_SECRET;
}

function doGet() {
  return jsonResponse({ success: false, message: 'Gmail relay yêu cầu POST JSON.' });
}

function doPost(request) {
  try {
    const body = JSON.parse((request.postData && request.postData.contents) || '{}');
    if (!isAuthorized(body)) return jsonResponse({ success: false, message: 'Unauthorized' });

    if (body.action === 'verify') {
      return jsonResponse({ success: true, service: 'gmail-relay', message: 'Gmail relay is ready.' });
    }

    const recipients = String(body.to || '').trim();
    const subject = String(body.subject || '').trim();
    const textBody = String(body.textBody || '').trim();
    const htmlBody = String(body.htmlBody || '').trim();
    const senderName = String(body.name || 'Bê Tông Tasago').trim();

    if (!recipients || !subject || (!textBody && !htmlBody)) {
      return jsonResponse({ success: false, message: 'Thiếu to, subject hoặc nội dung email.' });
    }

    GmailApp.sendEmail(recipients, subject, textBody || 'Vui lòng xem email bằng ứng dụng hỗ trợ HTML.', {
      htmlBody: htmlBody || `<pre>${textBody}</pre>`,
      name: senderName,
    });

    return jsonResponse({
      success: true,
      message: `Đã chuyển email đến GmailApp cho ${recipients.split(',').length} địa chỉ.`,
      messageId: `gmail-relay-${Date.now()}`,
    });
  } catch (error) {
    return jsonResponse({ success: false, message: `GmailApp lỗi: ${error.message || error}` });
  }
}

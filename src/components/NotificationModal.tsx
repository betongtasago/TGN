import React, { useState } from 'react';
import { 
  X, 
  Send, 
  Copy, 
  Check, 
  History, 
  Mail, 
  MessageSquare, 
  Sparkles, 
  Clock, 
  BookOpen, 
  Plus, 
  Zap, 
  Server, 
  ChevronDown, 
  ChevronUp,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  ShieldCheck,
  RefreshCw,
  Phone,
  Smartphone,
  Users,
  UserCheck,
  FileCode,
  Trash2,
  Share2
} from 'lucide-react';
import { ConcreteSample, Station, NotificationConfig, NotificationLog, User } from '../types';
import { 
  generateSampleNotification, 
  dispatchNotification,
  generateMailtoUrl,
  openZaloPersonalChat,
  cleanPhoneNumber,
  GOOGLE_APPS_SCRIPT_ZALO_TEMPLATE
} from '../utils/notificationService';
import { formatDateVN } from '../utils/storage';

interface NotificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  samples: ConcreteSample[];
  stations: Station[];
  config: NotificationConfig;
  onSaveConfig: (config: NotificationConfig) => void;
  notificationLogs: NotificationLog[];
  preselectedSample?: ConcreteSample | null;
  currentUser?: User | null;
}

export const NotificationModal: React.FC<NotificationModalProps> = ({
  isOpen,
  onClose,
  samples,
  stations,
  config,
  onSaveConfig,
  notificationLogs,
  preselectedSample,
  currentUser,
}) => {
  const [activeTab, setActiveTab] = useState<'send' | 'email' | 'zalo' | 'preview' | 'logs' | 'guide'>('email');
  const [channel, setChannel] = useState<'zalo_bot' | 'email' | 'both'>('email');
  const [copied, setCopied] = useState(false);
  const [copiedScript, setCopiedScript] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendSuccessMessage, setSendSuccessMessage] = useState('');

  // Email Configuration State
  const [emailList, setEmailList] = useState<string[]>(() => {
    const list = Array.isArray(config.emailRecipients) ? config.emailRecipients : [];
    return list.length > 0 ? list : ['thanhtgndt@gmail.com', 'kythuat@tasago.vn'];
  });
  const [newEmailInput, setNewEmailInput] = useState('');
  const [autoEmailEnabled, setAutoEmailEnabled] = useState(config.autoEmailEnabled ?? true);
  const [autoSendHour, setAutoSendHour] = useState(config.autoSendHour ?? 7);
  const [autoSendMinute, setAutoSendMinute] = useState(config.autoSendMinute ?? 0);
  const [reminderDaysBefore, setReminderDaysBefore] = useState(config.reminderDaysBefore ?? 0);
  
  // SMTP Server Settings
  const [smtpHost, setSmtpHost] = useState(config.smtpHost || 'smtp.gmail.com');
  const [smtpPort, setSmtpPort] = useState(config.smtpPort || 587);
  const [smtpUser, setSmtpUser] = useState(config.smtpUser || 'tasagotnt@gmail.com');
  const [smtpPass, setSmtpPass] = useState(config.smtpPass || '');
  const [smtpSecure, setSmtpSecure] = useState(config.smtpSecure ?? false); // false for 587 STARTTLS
  const [emailSender, setEmailSender] = useState(config.emailSender || 'Bê Tông Tasago <tasagotnt@gmail.com>');
  const [emailServiceUrl, setEmailServiceUrl] = useState(config.emailServiceUrl || '');
  
  const [showPassword, setShowPassword] = useState(false);
  const [showAdvancedEmailSettings, setShowAdvancedEmailSettings] = useState(true);

  // Testing & Verification State
  const [verifyingSmtp, setVerifyingSmtp] = useState(false);
  const [smtpVerifyResult, setSmtpVerifyResult] = useState<{ success: boolean; message: string } | null>(null);

  const [testingEmail, setTestingEmail] = useState(false);
  const [emailTestResult, setEmailTestResult] = useState<{ success: boolean; message: string } | null>(null);

  const [triggeringCron, setTriggeringCron] = useState(false);
  const [cronTriggerResult, setCronTriggerResult] = useState<{ success: boolean; message: string } | null>(null);

  // Zalo Bot Settings (Personal & Group)
  const [zaloWebhookUrl, setZaloWebhookUrl] = useState(config.zaloWebhookUrl || '');
  const [zaloBotToken, setZaloBotToken] = useState(config.zaloBotToken || '');
  const [zaloGroupId, setZaloGroupId] = useState(config.zaloGroupId || 'Nhóm Kỹ Thuật Tasago');
  const [zaloPersonalPhone, setZaloPersonalPhone] = useState(config.zaloPersonalPhone || '0942320923');
  const [zaloPersonalPhones, setZaloPersonalPhones] = useState<string[]>(() => {
    const list = Array.isArray(config.zaloPersonalPhones) ? config.zaloPersonalPhones : [];
    return list.length > 0 ? list : ['0942320923', '0913999888'];
  });
  const [newPhoneInput, setNewPhoneInput] = useState('');
  const [zaloRecipientType, setZaloRecipientType] = useState<'personal' | 'group' | 'both'>(
    config.zaloRecipientType || 'both'
  );
  const [autoZaloEnabled, setAutoZaloEnabled] = useState(config.autoZaloEnabled ?? true);
  const [testingWebhook, setTestingWebhook] = useState(false);
  const [webhookTestResult, setWebhookTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [showScriptModal, setShowScriptModal] = useState(false);

  // Sample Selection
  const urgentSamples = samples.filter(s => s.status === 'due_today' || s.status === 'overdue');
  const [targetFilter, setTargetFilter] = useState<'urgent' | 'all' | 'single'>(preselectedSample ? 'single' : 'urgent');

  const samplesToNotify = targetFilter === 'single' && preselectedSample
    ? [preselectedSample]
    : targetFilter === 'urgent'
    ? urgentSamples.length > 0 ? urgentSamples : samples.slice(0, 5)
    : samples;

  const notificationPreview = generateSampleNotification(samplesToNotify, stations);
  const mailtoUrl = generateMailtoUrl(emailList, notificationPreview.title, notificationPreview.bodyText);

  if (!isOpen) return null;

  // Add Phone Number to personal list
  const handleAddPhone = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = cleanPhoneNumber(newPhoneInput);
    if (!clean || clean.length < 9) {
      alert('Vui lòng nhập số điện thoại hợp lệ (ví dụ: 0942320923)');
      return;
    }
    if (zaloPersonalPhones.includes(clean)) {
      alert('Số điện thoại này đã có trong danh sách nhận Zalo.');
      return;
    }
    setZaloPersonalPhones(prev => [...prev, clean]);
    if (!zaloPersonalPhone) setZaloPersonalPhone(clean);
    setNewPhoneInput('');
  };

  const handleDeletePhone = (phoneToDelete: string) => {
    setZaloPersonalPhones(prev => prev.filter(p => p !== phoneToDelete));
    if (zaloPersonalPhone === phoneToDelete) {
      const remaining = zaloPersonalPhones.filter(p => p !== phoneToDelete);
      setZaloPersonalPhone(remaining[0] || '');
    }
  };

  // Apply Default Gmail Preset (smtp.gmail.com, Port 587 STARTTLS, tasagotnt@gmail.com)
  const handleApplyGmailPreset = () => {
    setSmtpHost('smtp.gmail.com');
    setSmtpPort(587);
    setSmtpSecure(false);
    setSmtpUser('tasagotnt@gmail.com');
    setEmailSender('Bê Tông Tasago <tasagotnt@gmail.com>');
    if (!emailList.includes('thanhtgndt@gmail.com')) {
      setEmailList(prev => ['thanhtgndt@gmail.com', ...prev]);
    }
    setSmtpVerifyResult(null);
    setEmailTestResult({
      success: true,
      message: '✨ Đã tải cấu hình chuẩn Gmail (smtp.gmail.com, Port 587 STARTTLS, tài khoản tasagotnt@gmail.com). Vui lòng nhập Mật khẩu ứng dụng 16 ký tự để kết nối.'
    });
  };

  const handleAddEmail = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = newEmailInput.trim().toLowerCase();
    if (!clean) return;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean)) {
      alert('Vui lòng nhập địa chỉ email hợp lệ (ví dụ: thanhtgndt@gmail.com)');
      return;
    }
    if (emailList.includes(clean)) {
      alert('Địa chỉ email này đã có trong danh sách nhận.');
      return;
    }
    setEmailList(prev => [...prev, clean]);
    setNewEmailInput('');
  };

  const handleDeleteEmail = (emailToDelete: string) => {
    setEmailList(prev => prev.filter(e => e !== emailToDelete));
  };

  const buildActiveConfig = (): NotificationConfig => ({
    ...config,
    emailRecipients: emailList,
    autoEmailEnabled,
    autoSendHour,
    autoSendMinute,
    reminderDaysBefore,
    smtpHost,
    smtpPort,
    smtpUser,
    smtpPass,
    smtpSecure,
    emailSender,
    emailServiceUrl,
    zaloWebhookUrl,
    zaloBotToken,
    zaloGroupId,
    zaloPersonalPhone,
    zaloPersonalPhones,
    zaloRecipientType,
    autoZaloEnabled,
  });

  const handleSaveAllConfig = async () => {
    const newConfig = buildActiveConfig();
    onSaveConfig(newConfig);

    // Sync state directly with server backend for 24/7 background 07:00 AM Cron
    try {
      await fetch('/api/server-sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          samples,
          stations,
          config: newConfig
        })
      });
    } catch (e) {
      console.warn('Backend sync notice:', e);
    }

    alert('✅ Đã lưu cấu hình máy chủ gửi Email & Bot Zalo cá nhân / nhóm thành công!');
  };

  // 1. Verify SMTP Connection via Backend
  const handleVerifySmtp = async () => {
    if (!smtpUser) {
      alert('Vui lòng nhập Email tài khoản SMTP (ví dụ: tasagotnt@gmail.com)');
      return;
    }
    if (!smtpPass) {
      alert('Vui lòng nhập Mật khẩu ứng dụng (Google App Password 16 ký tự) để kiểm tra xác thực.');
      return;
    }

    setVerifyingSmtp(true);
    setSmtpVerifyResult(null);

    try {
      const res = await fetch('/api/notifications/verify-smtp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          smtpConfig: {
            smtpHost,
            smtpPort,
            smtpUser,
            smtpPass,
            smtpSecure
          }
        })
      });

      const data = await res.json();
      setVerifyingSmtp(false);

      if (res.ok && data?.success) {
        setSmtpVerifyResult({
          success: true,
          message: data.message || `Kết nối máy chủ SMTP ${smtpHost}:${smtpPort} (STARTTLS) thành công! Tài khoản "${smtpUser}" đã xác thực hợp lệ.`
        });
      } else {
        setSmtpVerifyResult({
          success: false,
          message: data?.message || 'Không thể kết nối máy chủ SMTP. Vui lòng kiểm tra lại tài khoản và mật khẩu ứng dụng.'
        });
      }
    } catch (e: any) {
      setVerifyingSmtp(false);
      setSmtpVerifyResult({
        success: false,
        message: `Lỗi kết nối kiểm tra SMTP: ${e.message}`
      });
    }
  };

  // 2. Test Send Real Email Immediately
  const handleTestSendEmail = async () => {
    if (emailList.length === 0) {
      alert('Vui lòng thêm ít nhất 1 địa chỉ email vào danh sách nhận trước khi gửi thử nghiệm.');
      return;
    }

    setTestingEmail(true);
    setEmailTestResult(null);

    try {
      const res = await fetch('/api/notifications/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipients: emailList,
          subject: `[TASAGO KIỂM TRA] Thử Nghiệm Báo Cáo Lịch Nén Mẫu (${new Date().toLocaleTimeString('vi-VN')})`,
          html: notificationPreview.htmlContent,
          plainText: notificationPreview.bodyText,
          smtpConfig: {
            smtpHost,
            smtpPort,
            smtpUser,
            smtpPass,
            smtpSecure,
            smtpFrom: emailSender,
            emailServiceUrl
          },
          emailServiceUrl
        })
      });

      const data = await res.json().catch(() => null);
      setTestingEmail(false);

      if (res.ok && data?.success) {
        setEmailTestResult({
          success: true,
          message: data.message || `Đã phát email thành công tới ${emailList.join(', ')}!`
        });
      } else {
        setEmailTestResult({
          success: false,
          message: data?.message || 'Không thể kết nối máy chủ gửi email. Vui lòng kiểm tra lại cấu hình SMTP.'
        });
      }
    } catch (err: any) {
      setTestingEmail(false);
      setEmailTestResult({
        success: false,
        message: `Lỗi khi phát email thử nghiệm: ${err.message}`
      });
    }
  };

  // 3. Trigger 07:00 AM Cron on Server
  const handleTriggerServerCron = async () => {
    setTriggeringCron(true);
    setCronTriggerResult(null);

    try {
      // First sync current config to server
      const currentConfig = buildActiveConfig();
      await fetch('/api/server-sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          samples,
          stations,
          config: currentConfig
        })
      });

      // Trigger cron
      const res = await fetch('/api/cron/trigger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      const data = await res.json();
      setTriggeringCron(false);

      if (res.ok && data?.success) {
        setCronTriggerResult({
          success: true,
          message: `🚀 Đã kích hoạt chạy thử báo cáo 07:00 Sáng! ${data.message || ''}`
        });
      } else {
        setCronTriggerResult({
          success: false,
          message: data?.message || 'Không thể kích hoạt cron trên máy chủ.'
        });
      }
    } catch (e: any) {
      setTriggeringCron(false);
      setCronTriggerResult({
        success: false,
        message: `Lỗi kết nối máy chủ: ${e.message}`
      });
    }
  };

  // 4. Test Webhook Zalo (Personal & Group via Backend)
  const handleTestWebhook = async () => {
    if (!zaloWebhookUrl || !zaloWebhookUrl.startsWith('http')) {
      alert('Vui lòng nhập URL Webhook hợp lệ (bắt đầu bằng http:// hoặc https://)');
      return;
    }
    setTestingWebhook(true);
    setWebhookTestResult(null);

    try {
      const res = await fetch('/api/notifications/test-zalo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          webhookUrl: zaloWebhookUrl,
          botToken: zaloBotToken,
          personalPhone: zaloPersonalPhone || '0942320923',
          groupId: zaloGroupId || 'Nhóm Kỹ Thuật Tasago'
        })
      });

      const data = await res.json().catch(() => null);
      setTestingWebhook(false);

      if (res.ok && data?.success) {
        setWebhookTestResult({
          success: true,
          message: data.message || `Đã gửi thành công yêu cầu tới Webhook Bot Zalo (SĐT: ${zaloPersonalPhone}, Nhóm: ${zaloGroupId})!`
        });
      } else {
        setWebhookTestResult({
          success: false,
          message: data?.message || `Máy chủ Webhook phản hồi HTTP ${res.status}. Vui lòng kiểm tra quyền truy cập "Bất kỳ ai" trên Google Apps Script.`
        });
      }
    } catch (err: any) {
      setTestingWebhook(false);
      setWebhookTestResult({
        success: false,
        message: `Lỗi kết nối Webhook: ${err.message}`
      });
    }
  };

  // 5. Dispatch manual notification
  const handleDispatch = async () => {
    setSending(true);
    setSendSuccessMessage('');

    try {
      const activeConfig = buildActiveConfig();
      const res = await dispatchNotification(samplesToNotify, stations, activeConfig, channel);
      setSending(false);
      if (res.success) {
        setSendSuccessMessage(res.message);
        setTimeout(() => setSendSuccessMessage(''), 5000);
      }
    } catch (e: any) {
      setSending(false);
      alert('Có lỗi xảy ra: ' + e.message);
    }
  };

  const handleCopyText = () => {
    navigator.clipboard.writeText(notificationPreview.bodyText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-150">
      <div 
        className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col my-auto max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-800 to-teal-900 text-white p-4 sm:p-5 flex items-center justify-between shadow-md shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-white/15 border border-white/20 flex items-center justify-center backdrop-blur-xs shadow-inner">
              <Clock className="w-5 h-5 text-emerald-200" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="font-extrabold text-base sm:text-lg tracking-tight">
                  Trung Tâm Thông Báo & Nhắc Lịch Nén Mẫu 07:00 Sáng
                </h3>
                <span className="bg-emerald-500 text-emerald-950 text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider">
                  Tự Động 24/7
                </span>
              </div>
              <p className="text-emerald-100/90 text-xs mt-0.5">
                Cấu hình máy chủ SMTP Gmail (STARTTLS 587), danh sách Email nhận tin & Bot Zalo nhóm
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-white/80 hover:text-white p-2 rounded-xl hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="bg-slate-100 px-5 pt-3 border-b border-slate-200 flex space-x-2 text-xs font-bold overflow-x-auto shrink-0">
          <button
            onClick={() => setActiveTab('email')}
            className={`pb-2.5 px-3 flex items-center space-x-1.5 transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'email'
                ? 'text-emerald-900 border-b-2 border-emerald-700 font-black'
                : 'text-slate-500 hover:text-slate-800 font-medium'
            }`}
          >
            <Mail className="w-3.5 h-3.5 text-emerald-700" />
            <span>Cài Đặt Máy Chủ Email & Lịch 07h Sáng ({emailList.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('send')}
            className={`pb-2.5 px-3 flex items-center space-x-1.5 transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'send'
                ? 'text-emerald-900 border-b-2 border-emerald-700 font-black'
                : 'text-slate-500 hover:text-slate-800 font-medium'
            }`}
          >
            <Send className="w-3.5 h-3.5 text-teal-700" />
            <span>Phát Thông Báo Ngay ({samplesToNotify.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('preview')}
            className={`pb-2.5 px-3 flex items-center space-x-1.5 transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'preview'
                ? 'text-emerald-900 border-b-2 border-emerald-700 font-black'
                : 'text-slate-500 hover:text-slate-800 font-medium'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-600" />
            <span>Xem Mẫu Email HTML</span>
          </button>

          <button
            onClick={() => setActiveTab('zalo')}
            className={`pb-2.5 px-3 flex items-center space-x-1.5 transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'zalo'
                ? 'text-emerald-900 border-b-2 border-emerald-700 font-black'
                : 'text-slate-500 hover:text-slate-800 font-medium'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5 text-blue-600" />
            <span>Bot Zalo Nhóm</span>
          </button>

          <button
            onClick={() => setActiveTab('logs')}
            className={`pb-2.5 px-3 flex items-center space-x-1.5 transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'logs'
                ? 'text-emerald-900 border-b-2 border-emerald-700 font-black'
                : 'text-slate-500 hover:text-slate-800 font-medium'
            }`}
          >
            <History className="w-3.5 h-3.5 text-slate-600" />
            <span>Nhật Ký ({notificationLogs.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('guide')}
            className={`pb-2.5 px-3 flex items-center space-x-1.5 transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'guide'
                ? 'text-emerald-900 border-b-2 border-emerald-700 font-black'
                : 'text-slate-500 hover:text-slate-800 font-medium'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5 text-purple-600" />
            <span>Hướng Dẫn Cấu Hình</span>
          </button>
        </div>

        {/* Tab 1: EMAIL CONFIGURATION & 07:00 AM AUTOMATION */}
        {activeTab === 'email' && (
          <div className="p-5 sm:p-6 space-y-5 overflow-y-auto text-xs">
            
            {/* Top Automation Card */}
            <div className="bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-50 border border-emerald-200 p-4 rounded-xl flex items-start justify-between gap-3 shadow-2xs">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-700 text-white flex items-center justify-center shrink-0 shadow-xs">
                  <Clock className="w-5 h-5 text-emerald-100" />
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h4 className="font-extrabold text-emerald-950 text-sm">
                      Cơ Chế Tự Động Quét & Gửi Email Vào 07:00 Sáng Mỗi Ngày
                    </h4>
                    <span className="bg-emerald-600 text-white text-[10px] font-black px-2 py-0.5 rounded-full">
                      GMT+7 VIETNAM
                    </span>
                  </div>
                  <p className="text-slate-600 leading-relaxed text-xs">
                    Mỗi ngày đúng <strong>07:00 Sáng</strong>, máy chủ ngầm tự động lọc các mẫu bê tông đến hạn hoặc quá hạn nén, đóng gói bảng báo cáo HTML chuẩn và gửi trực tiếp tới danh sách email Kỹ thuật viên & Ban Giám Đốc.
                  </p>
                </div>
              </div>

              <div className="flex flex-col items-end gap-1.5 shrink-0">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-extrabold bg-emerald-100 text-emerald-900 border border-emerald-300">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  Máy Chủ Sẵn Sàng 24/7
                </span>
                <button
                  type="button"
                  onClick={handleTriggerServerCron}
                  disabled={triggeringCron}
                  className="bg-emerald-800 hover:bg-emerald-700 text-white text-[11px] font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs disabled:opacity-50"
                  title="Chạy thử nghiệm lệnh phát 07h sáng của máy chủ ngay lúc này"
                >
                  {triggeringCron ? (
                    <RefreshCw className="w-3 h-3 animate-spin" />
                  ) : (
                    <Zap className="w-3 h-3 text-yellow-300" />
                  )}
                  <span>Chạy Thử Báo Cáo 07h</span>
                </button>
              </div>
            </div>

            {cronTriggerResult && (
              <div className={`p-3 rounded-xl text-xs font-semibold animate-in fade-in ${
                cronTriggerResult.success ? 'bg-emerald-100 text-emerald-900 border border-emerald-300' : 'bg-red-100 text-red-900 border border-red-300'
              }`}>
                {cronTriggerResult.message}
              </div>
            )}

            {/* Email Recipients Card */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-extrabold text-slate-900 block text-xs">
                    Danh Sách Email Nhận Thông Báo 07h Sáng ({emailList.length}):
                  </span>
                  <span className="text-slate-500 text-[11px]">
                    Toàn bộ địa chỉ trong danh sách này sẽ nhận báo cáo lịch nén mẫu mỗi sáng
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={autoEmailEnabled}
                      onChange={(e) => setAutoEmailEnabled(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                  </label>
                  <span className="font-bold text-slate-800 text-xs">{autoEmailEnabled ? 'BẬT Gửi Email' : 'TẮT Gửi Email'}</span>
                </div>
              </div>

              {/* Add email input form */}
              <form onSubmit={handleAddEmail} className="flex items-center gap-2">
                <input
                  type="email"
                  value={newEmailInput}
                  onChange={(e) => setNewEmailInput(e.target.value)}
                  placeholder="Nhập email (ví dụ: thanhtgndt@gmail.com, kythuat@tasago.vn)..."
                  className="flex-1 bg-white border border-slate-300 rounded-xl p-2.5 text-xs text-slate-800 outline-none focus:ring-2 focus:ring-emerald-500 shadow-inner"
                />
                <button
                  type="submit"
                  className="bg-emerald-700 hover:bg-emerald-600 text-white font-bold px-4 py-2.5 rounded-xl text-xs flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs whitespace-nowrap"
                >
                  <Plus className="w-4 h-4" />
                  <span>Thêm Email</span>
                </button>
              </form>

              {/* Email Chips */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {emailList.map((email, idx) => (
                  <div 
                    key={idx}
                    className="flex items-center justify-between bg-white p-2.5 rounded-xl border border-slate-200 shadow-2xs hover:border-emerald-300 transition-colors"
                  >
                    <div className="flex items-center gap-2 truncate">
                      <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-[11px] shrink-0">
                        {idx + 1}
                      </div>
                      <span className="font-bold text-slate-800 truncate text-xs">
                        {email}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleDeleteEmail(email)}
                      className="p-1 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer ml-1"
                      title={`Xóa email ${email}`}
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* SMTP Server Configuration Accordion / Card */}
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
              <div className="bg-slate-50 p-3.5 border-b border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Server className="w-4 h-4 text-emerald-700" />
                  <span className="font-extrabold text-slate-800 text-xs">
                    Cấu Hình Máy Chủ Gửi Email (SMTP Gmail • STARTTLS Port 587)
                  </span>
                </div>

                {/* Quick Apply Gmail Preset Button */}
                <button
                  type="button"
                  onClick={handleApplyGmailPreset}
                  className="bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-300 px-3 py-1.5 rounded-lg text-[11px] font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                  title="Điền tự động máy chủ smtp.gmail.com, cổng 587 STARTTLS và tài khoản tasagotnt@gmail.com"
                >
                  <Sparkles className="w-3.5 h-3.5 text-emerald-700" />
                  <span>✨ Áp Dụng Chuẩn Gmail (tasagotnt@gmail.com)</span>
                </button>
              </div>

              <div className="p-4 space-y-4">
                <div className="bg-blue-50/70 border border-blue-200 rounded-xl p-3 text-[11px] text-blue-900 leading-relaxed flex items-start gap-2">
                  <ShieldCheck className="w-4 h-4 text-blue-700 shrink-0 mt-0.5" />
                  <div>
                    <strong>Cấu hình Gmail khuyên dùng:</strong> Host: <code className="bg-blue-100 px-1 py-0.5 rounded font-mono font-bold">smtp.gmail.com</code> • Cổng: <code className="bg-blue-100 px-1 py-0.5 rounded font-mono font-bold">587</code> • Kết nối: <code className="bg-blue-100 px-1 py-0.5 rounded font-mono font-bold">STARTTLS</code> (secure: false) • Tài khoản: <code className="bg-blue-100 px-1 py-0.5 rounded font-mono font-bold">tasagotnt@gmail.com</code>.
                  </div>
                </div>

                {/* SMTP Input Fields Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      SMTP Host (Máy chủ gửi):
                    </label>
                    <input
                      type="text"
                      value={smtpHost}
                      onChange={(e) => setSmtpHost(e.target.value)}
                      placeholder="smtp.gmail.com"
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs text-slate-800 font-mono outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      SMTP Port & Kết Nối:
                    </label>
                    <div className="flex items-center gap-2">
                      <select
                        value={smtpPort}
                        onChange={(e) => {
                          const p = Number(e.target.value);
                          setSmtpPort(p);
                          setSmtpSecure(p === 465);
                        }}
                        className="bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs text-slate-800 font-bold outline-none focus:ring-2 focus:ring-emerald-500 flex-1"
                      >
                        <option value={587}>Port 587 (STARTTLS - Chuẩn Gmail/Office365)</option>
                        <option value={465}>Port 465 (SSL/TLS Trực tiếp)</option>
                        <option value={25}>Port 25 (Standard SMTP)</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Tài Khoản Email Gửi (SMTP User):
                    </label>
                    <input
                      type="text"
                      value={smtpUser}
                      onChange={(e) => setSmtpUser(e.target.value)}
                      placeholder="tasagotnt@gmail.com"
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs text-slate-800 outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="font-bold text-slate-700">
                        Mật Khẩu Ứng Dụng (Google App Password):
                      </label>
                      <a
                        href="https://myaccount.google.com/apppasswords"
                        target="_blank"
                        rel="noreferrer"
                        className="text-[10px] text-blue-700 hover:underline flex items-center gap-0.5 font-bold"
                      >
                        <span>Tạo Mật Khẩu 16 Ký Tự</span>
                        <ExternalLink className="w-2.5 h-2.5" />
                      </a>
                    </div>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={smtpPass}
                        onChange={(e) => setSmtpPass(e.target.value)}
                        placeholder="Mật khẩu ứng dụng 16 ký tự (ví dụ: abcd efgh ijkl mnop)"
                        className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 pr-9 text-xs text-slate-800 font-mono outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Tên & Email Người Gửi Hiển Thị Trong Hòm Thư (Sender Display):
                  </label>
                  <input
                    type="text"
                    value={emailSender}
                    onChange={(e) => setEmailSender(e.target.value)}
                    placeholder="Bê Tông Tasago <tasagotnt@gmail.com>"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs text-slate-800 outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                {/* Verification & Test Buttons Row */}
                <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2.5">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleVerifySmtp}
                      disabled={verifyingSmtp}
                      className="bg-slate-800 hover:bg-slate-900 text-white font-bold px-3.5 py-2 rounded-xl text-xs flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs disabled:opacity-50"
                    >
                      {verifyingSmtp ? (
                        <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                      )}
                      <span>🔍 Kiểm Tra Kết Nối SMTP (Verify)</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleTestSendEmail}
                      disabled={testingEmail || emailList.length === 0}
                      className="bg-emerald-700 hover:bg-emerald-600 text-white font-bold px-3.5 py-2 rounded-xl text-xs flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs disabled:opacity-50"
                    >
                      {testingEmail ? (
                        <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <Zap className="w-3.5 h-3.5 text-yellow-300" />
                      )}
                      <span>⚡ Gửi Thử Email Ngay ({emailList.length} người)</span>
                    </button>
                  </div>

                  <a
                    href={mailtoUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-slate-600 hover:text-slate-900 text-xs font-bold flex items-center gap-1 hover:underline cursor-pointer"
                  >
                    <Mail className="w-3.5 h-3.5 text-slate-500" />
                    <span>Mở Soạn Trong Ứng Dụng Email (Mailto)</span>
                  </a>
                </div>

                {/* SMTP Verify Result Notification */}
                {smtpVerifyResult && (
                  <div className={`p-3.5 rounded-xl text-xs font-semibold animate-in fade-in flex items-start gap-2 ${
                    smtpVerifyResult.success ? 'bg-emerald-100 text-emerald-950 border border-emerald-300' : 'bg-red-100 text-red-950 border border-red-300'
                  }`}>
                    {smtpVerifyResult.success ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-red-700 shrink-0 mt-0.5" />
                    )}
                    <div>{smtpVerifyResult.message}</div>
                  </div>
                )}

                {/* Test Email Result */}
                {emailTestResult && (
                  <div className={`p-3.5 rounded-xl text-xs font-semibold animate-in fade-in flex items-start gap-2 ${
                    emailTestResult.success ? 'bg-emerald-100 text-emerald-950 border border-emerald-300' : 'bg-amber-100 text-amber-950 border border-amber-300'
                  }`}>
                    {emailTestResult.success ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                    )}
                    <div>{emailTestResult.message}</div>
                  </div>
                )}

              </div>
            </div>

            {/* Save & Apply Bottom Bar */}
            <div className="pt-3 border-t border-slate-200 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setActiveTab('guide')}
                className="text-xs font-bold text-emerald-700 hover:underline flex items-center gap-1 cursor-pointer"
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span>Xem Hướng Dẫn Chi Tiết Gmail App Password</span>
              </button>

              <button
                type="button"
                onClick={handleSaveAllConfig}
                className="bg-emerald-700 hover:bg-emerald-600 text-white font-extrabold px-6 py-2.5 rounded-xl text-xs sm:text-sm flex items-center space-x-2 cursor-pointer shadow-lg shadow-emerald-700/20 active:scale-95 transition-all"
              >
                <Check className="w-4 h-4" />
                <span>Lưu Cài Đặt Máy Chủ & Lịch 07:00 Sáng</span>
              </button>
            </div>

          </div>
        )}

        {/* Tab 2: SEND MANUAL NOTIFICATION NOW */}
        {activeTab === 'send' && (
          <div className="p-5 sm:p-6 space-y-4 overflow-y-auto max-h-[75vh]">
            
            {/* Quick Status Notice */}
            <div className="bg-emerald-50 border border-emerald-200 p-3.5 rounded-xl flex items-center justify-between gap-3 text-xs">
              <div className="flex items-center space-x-2.5">
                <Clock className="w-4 h-4 text-emerald-700 shrink-0" />
                <span className="text-emerald-950 font-semibold">
                  Lịch tự động <strong>07:00 Sáng</strong>: Email <strong>{autoEmailEnabled ? 'BẬT' : 'TẮT'}</strong> ({emailList.length} người nhận) • Bot Zalo <strong>{autoZaloEnabled ? 'BẬT' : 'TẮT'}</strong>
                </span>
              </div>
              <button
                type="button"
                onClick={() => setActiveTab('email')}
                className="text-[11px] font-bold text-emerald-800 underline cursor-pointer hover:text-emerald-900"
              >
                Cấu hình máy chủ
              </button>
            </div>

            {/* Target Samples Filter */}
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
              <span className="text-xs font-extrabold text-slate-700 uppercase">
                Chọn danh sách mẫu cần phát tin:
              </span>

              <div className="flex items-center space-x-1.5 bg-slate-100 p-1 rounded-xl text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setTargetFilter('urgent')}
                  className={`px-3 py-1 rounded-lg transition-colors cursor-pointer ${
                    targetFilter === 'urgent'
                      ? 'bg-red-500 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Mẫu Cần Nén Gấp ({urgentSamples.length})
                </button>

                <button
                  type="button"
                  onClick={() => setTargetFilter('all')}
                  className={`px-3 py-1 rounded-lg transition-colors cursor-pointer ${
                    targetFilter === 'all'
                      ? 'bg-emerald-700 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Tất Cả Mẫu ({samples.length})
                </button>

                {preselectedSample && (
                  <button
                    type="button"
                    onClick={() => setTargetFilter('single')}
                    className={`px-3 py-1 rounded-lg transition-colors cursor-pointer ${
                      targetFilter === 'single'
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Mẫu Đang Chọn
                  </button>
                )}
              </div>
            </div>

            {/* Channel Selector */}
            <div className="grid grid-cols-3 gap-2.5 text-xs font-bold">
              <button
                type="button"
                onClick={() => setChannel('email')}
                className={`p-2.5 rounded-xl border transition-all cursor-pointer ${
                  channel === 'email'
                    ? 'bg-emerald-50 border-emerald-500 text-emerald-900 ring-2 ring-emerald-400'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center justify-center space-x-1.5">
                  <Mail className="w-4 h-4 text-emerald-700" />
                  <span>Qua Email ({emailList.length})</span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setChannel('zalo_bot')}
                className={`p-2.5 rounded-xl border transition-all cursor-pointer ${
                  channel === 'zalo_bot'
                    ? 'bg-blue-50 border-blue-500 text-blue-900 ring-2 ring-blue-400'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center justify-center space-x-1.5">
                  <MessageSquare className="w-4 h-4 text-blue-600" />
                  <span>Bot Zalo Nhóm</span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setChannel('both')}
                className={`p-2.5 rounded-xl border transition-all cursor-pointer ${
                  channel === 'both'
                    ? 'bg-teal-50 border-teal-600 text-teal-950 ring-2 ring-teal-400'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center justify-center space-x-1.5">
                  <Sparkles className="w-4 h-4 text-teal-600" />
                  <span>Gửi Cả 2 Kênh</span>
                </div>
              </button>
            </div>

            {/* Success Alert */}
            {sendSuccessMessage && (
              <div className="bg-emerald-50 border border-emerald-300 text-emerald-900 p-3 rounded-xl text-xs font-bold flex items-center space-x-2 animate-in fade-in">
                <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{sendSuccessMessage}</span>
              </div>
            )}

            {/* Message Preview Box */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-700 flex items-center space-x-1">
                  <span>Nội dung bản tin phát vào nhóm Zalo / Email:</span>
                </label>
                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={handleCopyText}
                    className="text-xs font-bold text-emerald-700 hover:text-emerald-900 bg-emerald-50 hover:bg-emerald-100 px-2.5 py-1 rounded-lg transition-colors flex items-center space-x-1 cursor-pointer"
                  >
                    {copied ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Đã Sao Chép!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Sao Chép Bản Tin</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              <div className="bg-slate-900 text-emerald-300 p-4 rounded-xl font-mono text-xs max-h-56 overflow-y-auto whitespace-pre-wrap leading-relaxed border border-slate-800 select-all shadow-inner">
                {notificationPreview.bodyText}
              </div>
            </div>

            {/* Actions */}
            <div className="pt-3 border-t border-slate-200 flex items-center justify-end space-x-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
              >
                Đóng
              </button>

              <button
                type="button"
                onClick={handleDispatch}
                disabled={sending || samplesToNotify.length === 0}
                className="bg-emerald-700 hover:bg-emerald-600 text-white font-black px-6 py-2.5 rounded-xl text-xs sm:text-sm flex items-center space-x-2 shadow-lg shadow-emerald-700/20 transition-all active:scale-95 cursor-pointer disabled:opacity-50"
              >
                {sending ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Phát Thông Báo Ngay ({samplesToNotify.length} Mẫu)</span>
                  </>
                )}
              </button>
            </div>

          </div>
        )}

        {/* Tab 3: LIVE HTML EMAIL PREVIEW */}
        {activeTab === 'preview' && (
          <div className="p-5 sm:p-6 space-y-4 overflow-y-auto max-h-[75vh]">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <span className="font-extrabold text-slate-800 text-xs">
                  Xem Trước Giao Diện Email HTML Nhận Được Lúc 07:00 Sáng:
                </span>
                <p className="text-slate-500 text-[11px]">
                  Bản tin định dạng chuyên nghiệp với nhận diện thương hiệu Tasago và đầy đủ chi tiết mẫu bê tông.
                </p>
              </div>

              <button
                type="button"
                onClick={handleTestSendEmail}
                disabled={testingEmail}
                className="bg-emerald-700 hover:bg-emerald-600 text-white font-bold px-3 py-1.5 rounded-lg text-xs flex items-center gap-1 cursor-pointer"
              >
                <Zap className="w-3.5 h-3.5 text-yellow-300" />
                <span>Gửi Bản Này Tới Email</span>
              </button>
            </div>

            <div 
              className="border border-slate-200 rounded-xl overflow-hidden shadow-xs bg-slate-50 p-2"
              dangerouslySetInnerHTML={{ __html: notificationPreview.htmlContent }}
            />
          </div>
        )}

        {/* Tab 4: BOT ZALO SETTINGS (PERSONAL & GROUP) */}
        {activeTab === 'zalo' && (
          <div className="p-5 sm:p-6 space-y-5 overflow-y-auto max-h-[75vh] text-xs">
            {/* Header info */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 p-4 rounded-2xl flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-md">
                <MessageSquare className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h4 className="font-black text-blue-950 text-sm sm:text-base">
                    Cấu Hình Tự Động Gửi Thông Báo Qua Zalo Bot Cá Nhân & Nhóm
                  </h4>
                  <span className="bg-blue-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                    Webhook 24/7
                  </span>
                </div>
                <p className="text-slate-600 text-xs leading-relaxed">
                  Mỗi 07:00 sáng hoặc khi có mẫu đến hạn/quá hạn nén, hệ thống tự động phát tin nhắn qua Webhook Zalo Bot tới <strong>Số điện thoại cá nhân</strong> của KTV/Quản lý hoặc <strong>Nhóm Zalo kỹ thuật</strong>.
                </p>
              </div>
            </div>

            {/* Main form card */}
            <div className="bg-slate-50 p-4 sm:p-5 rounded-2xl border border-slate-200 space-y-4">
              {/* Toggle switch */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                <div>
                  <span className="font-bold text-slate-900 block text-xs sm:text-sm">Bật Tự Động Bắn Tin Qua Bot Zalo</span>
                  <span className="text-slate-500 text-[11px]">Tự động gửi lúc 07:00 sáng hàng ngày kèm email</span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={autoZaloEnabled}
                    onChange={(e) => setAutoZaloEnabled(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>

              {/* Recipient Target Mode */}
              <div className="space-y-1.5">
                <label className="font-bold text-slate-800 block text-xs">
                  Đối Tượng Nhận Tin Zalo:
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setZaloRecipientType('personal')}
                    className={`p-2.5 rounded-xl border flex items-center space-x-2 transition-all cursor-pointer text-left ${
                      zaloRecipientType === 'personal'
                        ? 'bg-blue-50 border-blue-500 text-blue-900 font-bold ring-2 ring-blue-500/20'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <Smartphone className="w-4 h-4 text-blue-600 shrink-0" />
                    <div>
                      <div className="text-xs">Zalo Cá Nhân</div>
                      <div className="text-[10px] text-slate-400 font-normal">Gửi theo SĐT KTV</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setZaloRecipientType('group')}
                    className={`p-2.5 rounded-xl border flex items-center space-x-2 transition-all cursor-pointer text-left ${
                      zaloRecipientType === 'group'
                        ? 'bg-blue-50 border-blue-500 text-blue-900 font-bold ring-2 ring-blue-500/20'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <Users className="w-4 h-4 text-blue-600 shrink-0" />
                    <div>
                      <div className="text-xs">Nhóm Zalo</div>
                      <div className="text-[10px] text-slate-400 font-normal">Gửi vào Group</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setZaloRecipientType('both')}
                    className={`p-2.5 rounded-xl border flex items-center space-x-2 transition-all cursor-pointer text-left ${
                      zaloRecipientType === 'both'
                        ? 'bg-blue-50 border-blue-500 text-blue-900 font-bold ring-2 ring-blue-500/20'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <Share2 className="w-4 h-4 text-blue-600 shrink-0" />
                    <div>
                      <div className="text-xs">Cả Cá Nhân & Nhóm</div>
                      <div className="text-[10px] text-slate-400 font-normal">Đồng bộ cả hai</div>
                    </div>
                  </button>
                </div>
              </div>

              {/* Personal Zalo Phones Management */}
              {(zaloRecipientType === 'personal' || zaloRecipientType === 'both') && (
                <div className="bg-white p-3.5 rounded-xl border border-blue-200 space-y-3 shadow-xs">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Smartphone className="w-4 h-4 text-blue-600" />
                      <span className="font-bold text-slate-900 text-xs">
                        Danh Sách Số Điện Thoại Zalo Cá Nhân Nhận Tin:
                      </span>
                    </div>
                    <span className="text-[11px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                      {zaloPersonalPhones.length} số đăng ký
                    </span>
                  </div>

                  {/* Add phone input */}
                  <form onSubmit={handleAddPhone} className="flex gap-2">
                    <div className="relative flex-1">
                      <Phone className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
                      <input
                        type="text"
                        value={newPhoneInput}
                        onChange={(e) => setNewPhoneInput(e.target.value)}
                        placeholder="Nhập số điện thoại Zalo mới (ví dụ: 0942320923)..."
                        className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-800 text-xs font-mono outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <button
                      type="submit"
                      className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-3 py-2 rounded-xl text-xs flex items-center gap-1 cursor-pointer transition-colors shadow-xs"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Thêm Số</span>
                    </button>
                  </form>

                  {/* Badges list */}
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {zaloPersonalPhones.map((phone) => (
                      <div
                        key={phone}
                        className={`flex items-center gap-1.5 pl-2.5 pr-1.5 py-1 rounded-lg text-xs font-mono transition-all ${
                          zaloPersonalPhone === phone
                            ? 'bg-blue-600 text-white font-bold shadow-xs'
                            : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                        }`}
                      >
                        <span 
                          onClick={() => setZaloPersonalPhone(phone)} 
                          className="cursor-pointer"
                          title="Bấm để đặt làm số chính"
                        >
                          📱 {phone} {zaloPersonalPhone === phone ? '(Chính)' : ''}
                        </span>
                        
                        {/* Quick Zalo Direct Chat button */}
                        <button
                          type="button"
                          onClick={() => openZaloPersonalChat(phone, notificationPreview.bodyText)}
                          title={`Mở Zalo nhắn riêng cho số ${phone}`}
                          className={`p-1 rounded hover:bg-black/10 cursor-pointer ${
                            zaloPersonalPhone === phone ? 'text-white' : 'text-blue-600'
                          }`}
                        >
                          <ExternalLink className="w-3 h-3" />
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDeletePhone(phone)}
                          title="Xóa số điện thoại này"
                          className={`p-1 rounded hover:bg-black/10 cursor-pointer ${
                            zaloPersonalPhone === phone ? 'text-white/80 hover:text-white' : 'text-red-500 hover:text-red-700'
                          }`}
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>

                  <p className="text-[11px] text-slate-500">
                    💡 <em>Gợi ý:</em> Bấm vào biểu tượng liên kết ↗️ cạnh mỗi số điện thoại để mở ngay trang trò chuyện Zalo cá nhân <code className="bg-slate-100 px-1 py-0.5 rounded text-blue-700">zalo.me/sđt</code> kèm nội dung báo cáo nén mẫu.
                  </p>
                </div>
              )}

              {/* Group Name & Bot Token */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1 text-xs">
                    Tên Nhóm Zalo Nhận Tin:
                  </label>
                  <input
                    type="text"
                    value={zaloGroupId}
                    onChange={(e) => setZaloGroupId(e.target.value)}
                    placeholder="Nhóm Kỹ Thuật Tasago"
                    className="w-full bg-white border border-slate-300 rounded-xl p-2.5 text-slate-800 text-xs outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1 text-xs">
                    Số Điện Thoại Nhận Chính:
                  </label>
                  <input
                    type="text"
                    value={zaloPersonalPhone}
                    onChange={(e) => setZaloPersonalPhone(cleanPhoneNumber(e.target.value))}
                    placeholder="0942320923"
                    className="w-full bg-white border border-slate-300 rounded-xl p-2.5 font-mono text-slate-800 text-xs outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Webhook URL with Test Button */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-slate-800 block text-xs">
                    Webhook Endpoint URL (Google Apps Script / Webhook Zalo Bot):
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowScriptModal(true)}
                    className="text-blue-700 hover:text-blue-800 font-bold text-[11px] flex items-center gap-1 underline cursor-pointer"
                  >
                    <FileCode className="w-3.5 h-3.5" />
                    <span>Lấy mã nguồn Google Apps Script mẫu</span>
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="url"
                    value={zaloWebhookUrl}
                    onChange={(e) => setZaloWebhookUrl(e.target.value)}
                    placeholder="https://script.google.com/macros/s/.../exec"
                    className="flex-1 bg-white border border-slate-300 rounded-xl p-2.5 text-slate-800 text-xs font-mono outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    type="button"
                    onClick={handleTestWebhook}
                    disabled={testingWebhook || !zaloWebhookUrl}
                    className="bg-blue-600 hover:bg-blue-500 text-white font-bold px-4 py-2.5 rounded-xl text-xs flex items-center space-x-1.5 transition-all cursor-pointer shadow-md disabled:opacity-50"
                  >
                    {testingWebhook ? (
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Zap className="w-3.5 h-3.5 text-yellow-300" />
                    )}
                    <span>⚡ Bắn Thử Zalo</span>
                  </button>
                </div>
              </div>

              {/* Test Result Message */}
              {webhookTestResult && (
                <div className={`p-3.5 rounded-xl text-xs font-semibold flex items-start gap-2 ${
                  webhookTestResult.success 
                    ? 'bg-emerald-100 text-emerald-900 border border-emerald-300' 
                    : 'bg-red-100 text-red-900 border border-red-300'
                }`}>
                  {webhookTestResult.success ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                  )}
                  <span>{webhookTestResult.message}</span>
                </div>
              )}
            </div>

            {/* Quick Script Drawer / Box */}
            <div className="border border-blue-100 bg-blue-50/50 rounded-2xl p-4 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2 text-blue-950 font-bold text-xs">
                  <FileCode className="w-4 h-4 text-blue-700" />
                  <span>Google Apps Script - Cầu Nối Miễn Phí Gửi Zalo Tự Động</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(GOOGLE_APPS_SCRIPT_ZALO_TEMPLATE);
                    setCopiedScript(true);
                    setTimeout(() => setCopiedScript(false), 2500);
                  }}
                  className="bg-white hover:bg-blue-50 text-blue-700 border border-blue-300 px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs transition-all"
                >
                  {copiedScript ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedScript ? 'Đã sao chép!' : 'Sao Chép Code Apps Script'}</span>
                </button>
              </div>
              <p className="text-slate-600 text-[11px] leading-relaxed">
                Tạo một dự án Google Apps Script mới tại <a href="https://script.google.com" target="_blank" rel="noreferrer" className="text-blue-700 font-bold underline">script.google.com</a>, dán toàn bộ đoạn mã trên và nhấn <strong>Triển khai dưới dạng Ứng dụng web (Web App)</strong> với quyền truy cập <em>"Bất kỳ ai (Anyone)"</em>. Sau đó copy URL dán vào ô Webhook Endpoint phía trên.
              </p>
            </div>

            {/* Save Buttons */}
            <div className="pt-3 border-t border-slate-200 flex items-center justify-between">
              <button
                type="button"
                onClick={() => openZaloPersonalChat(zaloPersonalPhone || '0942320923', notificationPreview.bodyText)}
                className="bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold px-4 py-2.5 rounded-xl text-xs flex items-center space-x-1.5 cursor-pointer transition-colors"
              >
                <Smartphone className="w-4 h-4 text-blue-600" />
                <span>Gửi Thử Zalo Cá Nhân Ngay ({zaloPersonalPhone || '0942320923'})</span>
              </button>

              <button
                type="button"
                onClick={handleSaveAllConfig}
                className="bg-blue-700 hover:bg-blue-600 text-white font-bold px-6 py-2.5 rounded-xl text-xs flex items-center space-x-1.5 cursor-pointer shadow-lg shadow-blue-700/20 transition-all active:scale-95"
              >
                <Check className="w-4 h-4" />
                <span>Lưu Cấu Hình Bot Zalo</span>
              </button>
            </div>
          </div>
        )}

        {/* Tab 5: LOGS */}
        {activeTab === 'logs' && (
          <div className="p-5 sm:p-6 space-y-3 overflow-y-auto max-h-[75vh]">
            {notificationLogs.length === 0 ? (
              <div className="p-12 text-center text-slate-400">
                <History className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                <p className="font-bold text-slate-600">Chưa có nhật ký thông báo nào</p>
                <p className="text-xs text-slate-400">Khi gửi thông báo qua Email hoặc Zalo, lịch sử chi tiết sẽ được lưu tại đây</p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {notificationLogs.map((log) => (
                  <div key={log.id} className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 space-y-1.5 text-xs">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <span className={`font-bold px-2 py-0.5 rounded text-[10px] uppercase ${
                          log.channel === 'zalo_bot' ? 'bg-blue-100 text-blue-800' : 'bg-emerald-100 text-emerald-800'
                        }`}>
                          {log.channel === 'zalo_bot' ? 'Bot Zalo' : 'Email 07h Sáng'}
                        </span>
                        <span className="font-bold text-slate-800">{log.recipient}</span>
                      </div>
                      <span className="text-[11px] text-slate-500">
                        {new Date(log.timestamp).toLocaleTimeString('vi-VN')} {formatDateVN(log.timestamp.split('T')[0])}
                      </span>
                    </div>

                    <p className="text-slate-700 font-medium">
                      {log.sampleInfoSummary}
                    </p>

                    {log.errorDetails && (
                      <p className="text-[11px] text-slate-500 italic bg-white p-1.5 rounded border border-slate-200">
                        {log.errorDetails}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 6: GUIDE & INSTRUCTIONS */}
        {activeTab === 'guide' && (
          <div className="p-5 sm:p-6 space-y-5 overflow-y-auto max-h-[75vh] text-xs text-slate-700">
            {/* Section 1: Zalo Bot Setup Guide */}
            <div className="bg-gradient-to-br from-blue-50 via-slate-50 to-indigo-50 border border-blue-200 p-5 rounded-2xl space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-black text-blue-950 text-sm flex items-center space-x-2">
                  <div className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center">
                    <MessageSquare className="w-4 h-4" />
                  </div>
                  <span>Hướng Dẫn Cấu Hình Tự Động Gửi Zalo Bot Cá Nhân & Nhóm</span>
                </h4>
                <span className="bg-blue-100 text-blue-800 text-[10px] font-extrabold px-2.5 py-1 rounded-full uppercase">
                  Miễn phí 100%
                </span>
              </div>
              <p className="text-slate-600 leading-relaxed">
                Để hệ thống tự động gửi tin nhắn báo cáo lịch nén mẫu bê tông hàng ngày tới <strong>Số Zalo cá nhân</strong> hoặc <strong>Nhóm Zalo kỹ thuật</strong>, bạn có thể thiết lập Webhook hoàn toàn miễn phí thông qua Google Apps Script theo 4 bước đơn giản:
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                <div className="bg-white p-3.5 rounded-xl border border-blue-200/80 shadow-xs space-y-1.5">
                  <div className="font-bold text-blue-900 flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px]">1</span>
                    <span>Tạo Dự Án Google Apps Script</span>
                  </div>
                  <p className="text-slate-600 text-[11px] leading-normal">
                    Truy cập <a href="https://script.google.com" target="_blank" rel="noreferrer" className="text-blue-700 font-bold underline">script.google.com</a>, bấm <strong>Dự án mới (New project)</strong>.
                  </p>
                </div>

                <div className="bg-white p-3.5 rounded-xl border border-blue-200/80 shadow-xs space-y-1.5">
                  <div className="font-bold text-blue-900 flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px]">2</span>
                    <span>Dán Mã Nguồn Tự Động</span>
                  </div>
                  <p className="text-slate-600 text-[11px] leading-normal">
                    Xóa sạch mã cũ trong tệp <code className="bg-slate-100 px-1 rounded text-blue-800">Code.gs</code> và dán toàn bộ mã nguồn Google Apps Script mẫu được cung cấp bên dưới.
                  </p>
                </div>

                <div className="bg-white p-3.5 rounded-xl border border-blue-200/80 shadow-xs space-y-1.5">
                  <div className="font-bold text-blue-900 flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px]">3</span>
                    <span>Triển Khai Dạng Web App</span>
                  </div>
                  <p className="text-slate-600 text-[11px] leading-normal">
                    Bấm <strong>Triển khai (Deploy)</strong> &gt; <strong>Triển khai mới (New deployment)</strong> &gt; Chọn loại <strong>Ứng dụng web (Web App)</strong>. Đặt quyền truy cập là <em>"Bất kỳ ai (Anyone)"</em>.
                  </p>
                </div>

                <div className="bg-white p-3.5 rounded-xl border border-blue-200/80 shadow-xs space-y-1.5">
                  <div className="font-bold text-blue-900 flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px]">4</span>
                    <span>Dán URL & Bắn Thử Tin Nhắn</span>
                  </div>
                  <p className="text-slate-600 text-[11px] leading-normal">
                    Sao chép URL Web App kết thúc bằng <code className="bg-slate-100 px-1 rounded text-blue-800">/exec</code> và dán vào ô Webhook URL ở tab Bot Zalo, sau đó nhấn <strong>⚡ Bắn Thử Zalo</strong>.
                  </p>
                </div>
              </div>

              {/* Code Box with 1-Click Copy */}
              <div className="mt-3 bg-slate-900 text-slate-100 p-4 rounded-xl border border-slate-800 space-y-2">
                <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                  <span className="font-mono text-emerald-400 text-xs font-bold flex items-center gap-1.5">
                    <FileCode className="w-4 h-4" />
                    <span>Mã nguồn Google Apps Script (Code.gs)</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(GOOGLE_APPS_SCRIPT_ZALO_TEMPLATE);
                      setCopiedScript(true);
                      setTimeout(() => setCopiedScript(false), 2500);
                    }}
                    className="bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors shadow-xs"
                  >
                    {copiedScript ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedScript ? 'Đã sao chép!' : 'Sao Chép Toàn Bộ Mã'}</span>
                  </button>
                </div>
                <pre className="text-[11px] font-mono text-slate-300 overflow-x-auto max-h-60 p-2 bg-slate-950/70 rounded-lg whitespace-pre">
                  {GOOGLE_APPS_SCRIPT_ZALO_TEMPLATE}
                </pre>
              </div>
            </div>

            {/* Section 2: Gmail SMTP Setup Guide */}
            <div className="bg-emerald-50 border border-emerald-200 p-5 rounded-2xl space-y-3">
              <h4 className="font-black text-emerald-950 text-sm flex items-center space-x-2">
                <div className="w-7 h-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center">
                  <Clock className="w-4 h-4" />
                </div>
                <span>Cơ Chế Tự Động Gửi Email 07:00 Sáng Hàng Ngày</span>
              </h4>
              <p className="text-slate-600 leading-relaxed">
                Hệ thống máy chủ backend của cổng thông tin Tasago chạy tiến trình kiểm tra 24/7. Mỗi khi đồng hồ đạt mốc <strong>07:00 Sáng</strong> (Múi giờ Việt Nam GMT+7):
              </p>
              <ul className="list-disc pl-5 space-y-1 text-slate-700">
                <li>Tự động quét danh sách mẫu bê tông cần nén hôm nay (R3, R7, R14, R28, Waterproof...).</li>
                <li>Tạo báo cáo chi tiết kèm thông tin công trình, nhà thầu, khối lượng và số điện thoại liên hệ.</li>
                <li>Gửi trực tiếp qua máy chủ SMTP (Gmail, Google Workspace) tới danh sách email KTV.</li>
              </ul>

              <div className="p-4 rounded-xl border border-emerald-200 bg-white space-y-2 mt-2">
                <h5 className="font-bold text-slate-900 text-xs uppercase">
                  Hướng Dẫn Lấy Mật Khẩu Ứng Dụng (App Password) Cho Gmail tasagotnt@gmail.com:
                </h5>
                <ol className="list-decimal pl-5 space-y-1.5 text-slate-600 leading-relaxed">
                  <li>Truy cập vào trang quản lý tài khoản Google: <a href="https://myaccount.google.com/security" target="_blank" rel="noreferrer" className="text-blue-700 font-bold underline">myaccount.google.com/security</a>.</li>
                  <li>Bật tính năng <strong>Xác minh 2 bước (2-Step Verification)</strong> nếu chưa bật.</li>
                  <li>Vào mục <strong>Mật khẩu ứng dụng (App passwords)</strong> tại: <a href="https://myaccount.google.com/apppasswords" target="_blank" rel="noreferrer" className="text-blue-700 font-bold underline">myaccount.google.com/apppasswords</a>.</li>
                  <li>Đặt tên ứng dụng (ví dụ: <code className="bg-slate-100 px-1 py-0.5 rounded font-bold">Tasago Portal</code>) và bấm <strong>Tạo</strong>.</li>
                  <li>Sao chép mã 16 ký tự vừa tạo và dán vào ô <strong>Mật khẩu ứng dụng</strong> trong bảng cài đặt SMTP.</li>
                </ol>
              </div>
            </div>
          </div>
        )}

        {/* Modal for full script preview if opened */}
        {showScriptModal && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
            <div className="bg-slate-900 text-slate-100 w-full max-w-3xl rounded-2xl p-5 border border-slate-800 shadow-2xl space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center space-x-2">
                  <FileCode className="w-5 h-5 text-blue-400" />
                  <h3 className="font-bold text-sm text-white">Mã Nguồn Google Apps Script - Zalo Webhook Bot</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowScriptModal(false)}
                  className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <pre className="text-xs font-mono text-emerald-300 bg-slate-950 p-4 rounded-xl max-h-[60vh] overflow-y-auto whitespace-pre">
                {GOOGLE_APPS_SCRIPT_ZALO_TEMPLATE}
              </pre>

              <div className="flex items-center justify-between pt-2">
                <span className="text-[11px] text-slate-400">Dán vào Google Apps Script và triển khai dạng Web App (Anyone)</span>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(GOOGLE_APPS_SCRIPT_ZALO_TEMPLATE);
                    setCopiedScript(true);
                    setTimeout(() => setCopiedScript(false), 2500);
                  }}
                  className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  {copiedScript ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  <span>{copiedScript ? 'Đã sao chép vào bộ nhớ tạm' : 'Sao chép mã'}</span>
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

import React, { useMemo, useState } from 'react';
import {
  X, Send, Check, History, Mail, Clock, Eye, CheckCircle2, AlertCircle,
  RefreshCw, Server, Trash2,
} from 'lucide-react';
import { ConcreteSample, Station, NotificationConfig, NotificationLog, User } from '../types';
import { dispatchNotification, generateSampleNotification } from '../utils/notificationService';
import { apiFetch } from '../utils/storage';

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

type Tab = 'send' | 'email' | 'preview' | 'logs' | 'guide';
type ActionResult = { success: boolean; message: string } | null;

export const NotificationModal: React.FC<NotificationModalProps> = ({
  isOpen,
  onClose,
  samples,
  stations,
  config,
  onSaveConfig,
  notificationLogs,
  preselectedSample,
}) => {
  const [activeTab, setActiveTab] = useState<Tab>('email');
  const [sending, setSending] = useState(false);
  const [verifyingRelay, setVerifyingRelay] = useState(false);
  const [triggeringCron, setTriggeringCron] = useState(false);
  const [targetFilter, setTargetFilter] = useState<'urgent' | 'all' | 'single'>(preselectedSample ? 'single' : 'urgent');
  const [emailList, setEmailList] = useState<string[]>(() => {
    const list = Array.isArray(config.emailRecipients) ? config.emailRecipients.filter(Boolean) : [];
    return list;
  });
  const [newEmail, setNewEmail] = useState('');
  const [autoEmailEnabled, setAutoEmailEnabled] = useState(config.autoEmailEnabled ?? true);
  const [autoSendHour, setAutoSendHour] = useState(config.autoSendHour ?? 7);
  const [autoSendMinute, setAutoSendMinute] = useState(config.autoSendMinute ?? 0);
  const [reminderDaysBefore, setReminderDaysBefore] = useState(config.reminderDaysBefore ?? 0);
  const [emailSender, setEmailSender] = useState(config.emailSender || 'CÔNG TY CP VLXD THẾ GIỚI NHÀ');
  const [verifyResult, setVerifyResult] = useState<ActionResult>(null);
  const [sendResult, setSendResult] = useState<ActionResult>(null);
  const [cronResult, setCronResult] = useState<ActionResult>(null);

  const urgentSamples = useMemo(
    () => samples.filter(sample => sample.status === 'due_today' || sample.status === 'overdue'),
    [samples],
  );
  const samplesToNotify = targetFilter === 'single' && preselectedSample
    ? [preselectedSample]
    : targetFilter === 'urgent'
      ? (urgentSamples.length ? urgentSamples : samples.slice(0, 5))
      : samples;
  const preview = useMemo(
    () => generateSampleNotification(samplesToNotify, stations),
    [samplesToNotify, stations],
  );

  if (!isOpen) return null;

  const buildConfig = (): NotificationConfig => ({
    ...config,
    emailRecipients: emailList,
    autoEmailEnabled,
    autoSendHour,
    autoSendMinute,
    reminderDaysBefore,
    emailSender,
  });

  const handleSaveConfig = async () => {
    const nextConfig = buildConfig();
    onSaveConfig(nextConfig);
    try {
      await apiFetch('/api/server-sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ config: nextConfig }),
      });
      setSendResult({ success: true, message: 'Đã lưu cấu hình Email relay vào máy chủ và Supabase.' });
    } catch (error: any) {
      setSendResult({ success: false, message: `Đã lưu cục bộ nhưng chưa đồng bộ máy chủ: ${error?.message || 'lỗi kết nối'}` });
    }
  };

  const handleAddEmail = (event: React.FormEvent) => {
    event.preventDefault();
    const value = newEmail.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      setSendResult({ success: false, message: 'Vui lòng nhập địa chỉ email hợp lệ.' });
      return;
    }
    if (!emailList.includes(value)) setEmailList(previous => [...previous, value]);
    setNewEmail('');
  };

  const handleVerifyRelay = async () => {
    setVerifyingRelay(true);
    setVerifyResult(null);
    try {
      const response = await apiFetch('/api/notifications/verify-gmail-relay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await response.json().catch(() => null);
      setVerifyResult({ success: response.ok && Boolean(data?.success), message: data?.message || `Máy chủ trả về HTTP ${response.status}.` });
    } catch (error: any) {
      setVerifyResult({ success: false, message: `Không thể kết nối Gmail relay: ${error?.message || 'lỗi mạng'}` });
    } finally {
      setVerifyingRelay(false);
    }
  };

  const handleSendEmail = async () => {
    if (!emailList.length) {
      setSendResult({ success: false, message: 'Hãy thêm ít nhất một địa chỉ nhận email.' });
      return;
    }
    setSending(true);
    setSendResult(null);
    try {
      const result = await dispatchNotification(samplesToNotify, stations, buildConfig(), 'email');
      setSendResult({ success: result.success, message: result.message });
    } catch (error: any) {
      setSendResult({ success: false, message: `Không thể gửi email: ${error?.message || 'lỗi mạng'}` });
    } finally {
      setSending(false);
    }
  };

  const handleRunCron = async () => {
    setTriggeringCron(true);
    setCronResult(null);
    try {
      const response = await apiFetch('/api/cron/trigger', { method: 'POST', headers: { 'Content-Type': 'application/json' } });
      const data = await response.json().catch(() => null);
      setCronResult({ success: response.ok && Boolean(data?.success), message: data?.message || `Máy chủ trả về HTTP ${response.status}.` });
    } catch (error: any) {
      setCronResult({ success: false, message: `Không thể chạy lịch email: ${error?.message || 'lỗi mạng'}` });
    } finally {
      setTriggeringCron(false);
    }
  };

  const tabs: Array<{ id: Tab; label: string; icon: React.ReactNode }> = [
    { id: 'email', label: 'Cấu hình Email', icon: <Mail className="w-4 h-4" /> },
    { id: 'send', label: 'Gửi Email', icon: <Send className="w-4 h-4" /> },
    { id: 'preview', label: 'Xem trước', icon: <Eye className="w-4 h-4" /> },
    { id: 'logs', label: 'Lịch sử', icon: <History className="w-4 h-4" /> },
    { id: 'guide', label: 'Hướng dẫn', icon: <Server className="w-4 h-4" /> },
  ];
  const inputClass = 'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500';
  const resultBox = (result: ActionResult) => result && <div className={`mt-3 rounded-lg border px-3 py-2 text-sm ${result.success ? 'border-orange-200 bg-orange-50 text-orange-800' : 'border-red-200 bg-red-50 text-red-800'}`}><span className="inline-flex items-center gap-1 font-medium">{result.success ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}{result.message}</span></div>;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-2 sm:p-5" onClick={onClose}>
      <div className="flex max-h-[94vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-slate-50 shadow-2xl" onClick={event => event.stopPropagation()}>
        <div className="flex items-center justify-between bg-orange-800 px-4 py-3 text-white sm:px-6"><div><h2 className="text-base font-bold sm:text-lg">Trung tâm thông báo Email</h2><p className="text-xs text-orange-100">Gửi tự động qua Gmail HTTPS relay, không dùng cổng SMTP</p></div><button onClick={onClose} className="rounded-lg p-2 hover:bg-orange-700" aria-label="Đóng"><X className="w-5 h-5" /></button></div>
        <div className="flex gap-1 overflow-x-auto border-b border-slate-200 bg-white px-2 py-2 sm:px-4">{tabs.map(tab => <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-bold sm:text-sm ${activeTab === tab.id ? 'bg-orange-100 text-orange-800' : 'text-slate-500 hover:bg-slate-100'}`}>{tab.icon}{tab.label}</button>)}</div>
        <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6">
          {activeTab === 'email' && <div className="space-y-5">
            <section className="rounded-xl border border-orange-200 bg-orange-50 p-4"><div className="flex items-start justify-between gap-3"><div><h3 className="font-bold text-orange-900">Email tự động hằng ngày</h3><p className="mt-1 text-xs text-orange-800">Vercel Cron gọi endpoint lúc 07:00 giờ Việt Nam; server đọc dữ liệu thật từ Supabase và gửi qua Gmail relay.</p></div><label className="relative inline-flex cursor-pointer items-center"><input type="checkbox" checked={autoEmailEnabled} onChange={event => setAutoEmailEnabled(event.target.checked)} className="peer sr-only" /><span className="h-6 w-11 rounded-full bg-slate-300 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-all peer-checked:bg-orange-600 peer-checked:after:translate-x-full" /></label></div><div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4"><label className="text-xs font-semibold text-slate-700">Giờ<input type="number" min="0" max="23" value={autoSendHour} onChange={event => setAutoSendHour(Number(event.target.value))} className={inputClass} /></label><label className="text-xs font-semibold text-slate-700">Phút<input type="number" min="0" max="59" value={autoSendMinute} onChange={event => setAutoSendMinute(Number(event.target.value))} className={inputClass} /></label><label className="text-xs font-semibold text-slate-700">Nhắc trước (ngày)<input type="number" min="0" max="30" value={reminderDaysBefore} onChange={event => setReminderDaysBefore(Number(event.target.value))} className={inputClass} /></label><button onClick={handleRunCron} disabled={triggeringCron} className="mt-5 inline-flex items-center justify-center gap-1 rounded-lg bg-amber-500 px-3 py-2 text-xs font-bold text-white hover:bg-amber-600 disabled:opacity-60"><RefreshCw className={`w-4 h-4 ${triggeringCron ? 'animate-spin' : ''}`} />Chạy thử cron</button></div>{resultBox(cronResult)}</section>
            <section className="rounded-xl border border-slate-200 bg-white p-4"><h3 className="font-bold text-slate-900">Danh sách email nhận báo cáo</h3><div className="mt-3 flex flex-wrap gap-2">{emailList.map(email => <span key={email} className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-700">{email}<button onClick={() => setEmailList(previous => previous.filter(item => item !== email))} className="text-slate-400 hover:text-red-600" aria-label={`Xóa ${email}`}><Trash2 className="w-3 h-3" /></button></span>)}</div><form onSubmit={handleAddEmail} className="mt-3 flex gap-2"><input value={newEmail} onChange={event => setNewEmail(event.target.value)} placeholder="them-email@example.com" className={inputClass} /><button className="rounded-lg bg-slate-700 px-4 py-2 text-sm font-bold text-white hover:bg-slate-800">Thêm</button></form></section>
            <section className="rounded-xl border border-blue-200 bg-blue-50 p-4"><h3 className="font-bold text-blue-900">Gmail HTTPS relay</h3><p className="mt-1 text-xs leading-relaxed text-blue-800">Gmail được gửi qua một Google Apps Script HTTPS relay. Cách này tránh hoàn toàn lỗi timeout do Render Free chặn các cổng SMTP 25, 465 và 587. Secret relay chỉ nằm trên server Render/Vercel.</p><label className="mt-3 block text-xs font-semibold text-slate-700">Tên hiển thị người gửi<input value={emailSender} onChange={event => setEmailSender(event.target.value)} className={inputClass} /></label><div className="mt-4 flex flex-wrap gap-2"><button onClick={handleVerifyRelay} disabled={verifyingRelay} className="inline-flex items-center gap-1 rounded-lg border border-blue-300 bg-white px-3 py-2 text-xs font-bold text-blue-800 hover:bg-blue-100 disabled:opacity-60"><Server className="w-4 h-4" />{verifyingRelay ? 'Đang kiểm tra...' : 'Kiểm tra Gmail relay'}</button><button onClick={handleSaveConfig} className="inline-flex items-center gap-1 rounded-lg bg-orange-700 px-3 py-2 text-xs font-bold text-white hover:bg-orange-800"><Check className="w-4 h-4" />Lưu cấu hình</button></div>{resultBox(verifyResult)}{resultBox(sendResult)}</section>
          </div>}
          {activeTab === 'send' && <div className="space-y-4"><section className="rounded-xl border border-slate-200 bg-white p-4"><h3 className="font-bold text-slate-900">Chọn nội dung gửi</h3><div className="mt-3 grid gap-2 sm:grid-cols-3">{(['urgent', 'all', 'single'] as const).map(filter => <button key={filter} onClick={() => setTargetFilter(filter)} className={`rounded-lg border p-3 text-left text-xs ${targetFilter === filter ? 'border-orange-500 bg-orange-50 text-orange-900' : 'border-slate-200 text-slate-600'}`}><strong>{filter === 'urgent' ? 'Mẫu đến hạn' : filter === 'all' ? 'Tất cả mẫu' : 'Mẫu đang chọn'}</strong><span className="mt-1 block text-slate-500">{filter === 'urgent' ? `${urgentSamples.length} mẫu` : filter === 'all' ? `${samples.length} mẫu` : preselectedSample ? preselectedSample.sampleCode : 'Chưa chọn mẫu'}</span></button>)}</div></section><section className="rounded-xl border border-blue-200 bg-blue-50 p-4"><p className="text-sm text-blue-900">Sẽ gửi <strong>{preview.sampleSummary}</strong> tới: {emailList.join(', ') || 'chưa có người nhận'}.</p><button onClick={handleSendEmail} disabled={sending || !emailList.length} className="mt-4 inline-flex items-center gap-2 rounded-lg bg-blue-700 px-4 py-2 text-sm font-bold text-white hover:bg-blue-800 disabled:opacity-60"><Send className="w-4 h-4" />{sending ? 'Đang gửi email...' : 'Gửi email ngay'}</button>{resultBox(sendResult)}</section></div>}
          {activeTab === 'preview' && <div className="rounded-xl border border-slate-200 bg-white p-4"><h3 className="font-bold text-slate-900">{preview.title}</h3><p className="mt-2 text-xs text-slate-500">{preview.sampleSummary} - nội dung HTML sẽ được chuyển đến Gmail relay.</p><pre className="mt-4 max-h-[50vh] overflow-auto whitespace-pre-wrap rounded-lg bg-slate-900 p-4 text-xs leading-relaxed text-slate-100">{preview.bodyText}</pre></div>}
          {activeTab === 'logs' && <div className="space-y-3">{notificationLogs.filter(log => log.channel === 'email').length === 0 ? <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">Chưa có log email.</div> : notificationLogs.filter(log => log.channel === 'email').map(log => <div key={log.id} className="rounded-xl border border-slate-200 bg-white p-4"><div className="flex flex-wrap items-center justify-between gap-2"><span className={`rounded-full px-2 py-1 text-xs font-bold ${log.status === 'success' ? 'bg-orange-100 text-orange-800' : 'bg-red-100 text-red-800'}`}>{log.status === 'success' ? 'Thành công' : 'Thất bại'}</span><span className="text-xs text-slate-500">{new Date(log.timestamp).toLocaleString('vi-VN')}</span></div><p className="mt-2 text-xs text-slate-700">Người nhận: {log.recipient}</p>{log.errorDetails && <p className="mt-1 text-xs text-red-700">Lỗi: {log.errorDetails}</p>}</div>)}</div>}
          {activeTab === 'guide' && <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-700"><h3 className="font-bold text-slate-900">Thiết lập Gmail relay một lần</h3><ol className="list-decimal space-y-2 pl-5 text-xs leading-relaxed"><li>Tạo một Google Apps Script mới bằng tài khoản Gmail dùng để gửi báo cáo.</li><li>Sao chép file <code>scripts/gmail-relay/Code.gs</code> trong repository vào Apps Script.</li><li>Đổi giá trị <code>THAY_BANG_CHUOI_BI_MAT_DAI</code> thành một chuỗi bí mật dài, ví dụ 32 ký tự ngẫu nhiên.</li><li>Chọn <strong>Deploy → New deployment → Web app</strong>, chạy dưới tài khoản Gmail của bạn và cho phép người có link truy cập.</li><li>Sao chép Web app URL. Trên Render và Vercel đặt URL đó vào <code>GMAIL_RELAY_URL</code> và đặt cùng chuỗi bí mật vào <code>GMAIL_RELAY_SECRET</code>.</li><li>Redeploy Render/Vercel, sau đó bấm “Kiểm tra Gmail relay” và gửi thử một email.</li></ol><div className="rounded-lg bg-amber-50 p-3 text-xs text-amber-900">Không dùng Gmail password hoặc App Password trong website. Google Apps Script xin quyền gửi thư một lần; sau đó Render/Vercel chỉ gọi relay bằng HTTPS.</div></div>}
        </div>
        <div className="flex items-center justify-between border-t border-slate-200 bg-white px-4 py-3 text-xs text-slate-500 sm:px-6"><span className="inline-flex items-center gap-1"><Clock className="w-3.5 h-3.5" />Email đang gửi qua Gmail HTTPS relay</span><button onClick={onClose} className="rounded-lg bg-slate-100 px-4 py-2 font-bold text-slate-700 hover:bg-slate-200">Đóng</button></div>
      </div>
    </div>
  );
};

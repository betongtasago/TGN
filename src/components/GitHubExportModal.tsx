import React, { useState } from 'react';
import { 
  X, 
  Github, 
  Download, 
  Upload, 
  Check, 
  Copy, 
  Terminal, 
  FileCode, 
  HardDrive, 
  FolderArchive,
  Sparkles
} from 'lucide-react';
import { ConcreteSample, Station, User, NotificationConfig } from '../types';
import { exportSamplesToExcel } from '../utils/excelExport';

interface GitHubExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  samples: ConcreteSample[];
  stations: Station[];
  users: User[];
  notificationConfig: NotificationConfig;
  onImportFullState: (stateData: any) => void;
}

export const GitHubExportModal: React.FC<GitHubExportModalProps> = ({
  isOpen,
  onClose,
  samples,
  stations,
  users,
  notificationConfig,
  onImportFullState,
}) => {
  const [copiedScript, setCopiedScript] = useState(false);
  const [copiedJson, setCopiedJson] = useState(false);
  const [importStatus, setImportStatus] = useState('');

  if (!isOpen) return null;

  const fullDataPackage = {
    appName: 'Tasago Concrete Testing Management System',
    company: 'Công Ty Cổ Phần Đầu Tư Tasago',
    exportDate: new Date().toISOString(),
    version: '1.0.0',
    stations,
    users,
    samples,
    notificationConfig,
  };

  const jsonString = JSON.stringify(fullDataPackage, null, 2);

  const handleDownloadJsonBackup = () => {
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Tasago_Concrete_Backup_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleCopyJson = () => {
    navigator.clipboard.writeText(jsonString);
    setCopiedJson(true);
    setTimeout(() => setCopiedJson(false), 2000);
  };

  const gitCommands = `# Các bước đưa toàn bộ mã nguồn lên GitHub:
git init
git add .
git commit -m "Initial commit: He thong quan ly tien do nen mau be tong Tasago"
git branch -M main
git remote add origin https://github.com/YOUR_GITHUB_USERNAME/tasago-concrete-lab.git
git push -u origin main`;

  const handleCopyGitCommands = () => {
    navigator.clipboard.writeText(gitCommands);
    setCopiedScript(true);
    setTimeout(() => setCopiedScript(false), 2000);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const parsed = JSON.parse(content);
        if (parsed.samples && parsed.stations) {
          onImportFullState(parsed);
          setImportStatus('✅ Đã nạp thành công toàn bộ dữ liệu mẫu và trạm trộn!');
          setTimeout(() => setImportStatus(''), 4000);
        } else {
          alert('File JSON không đúng định dạng sao lưu Tasago!');
        }
      } catch (err: any) {
        alert('Lỗi đọc file: ' + err.message);
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
      <div 
        className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 my-8"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-slate-900 text-white px-5 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-slate-800 flex items-center justify-center text-white">
              <Github className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h3 className="font-black text-base sm:text-lg text-white">
                Xuất Dữ Liệu & Hướng Dẫn Tải Lên GitHub
              </h3>
              <p className="text-xs text-slate-400">
                Lưu trữ toàn bộ mã nguồn và cơ sở dữ liệu mẫu nén bê tông Tasago
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 sm:p-6 space-y-5 max-h-[78vh] overflow-y-auto text-xs text-slate-700">
          
          {/* Section 1: Backup & Restore Data */}
          <div className="bg-emerald-50/70 p-4 rounded-xl border border-emerald-200 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-extrabold text-emerald-950 uppercase flex items-center space-x-1.5">
                <HardDrive className="w-4 h-4 text-emerald-700" />
                <span>1. Sao Lưu & Đồng Bộ Dữ Liệu (JSON Backup)</span>
              </h4>
              <span className="text-[11px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded">
                {samples.length} mẫu • {stations.length} trạm
              </span>
            </div>
            <p className="text-slate-600">
              Xuất toàn bộ cơ sở dữ liệu (danh sách công trình, kết quả nén mẫu, cài đặt Zalo Bot, danh sách thành viên) thành 1 file JSON độc lập để mang sang máy khác hoặc lưu trữ an toàn.
            </p>

            {importStatus && (
              <div className="bg-emerald-600 text-white font-bold p-2.5 rounded-lg text-xs animate-in fade-in">
                {importStatus}
              </div>
            )}

            <div className="flex flex-wrap items-center gap-2 pt-1">
              <button
                type="button"
                onClick={handleDownloadJsonBackup}
                className="bg-emerald-700 hover:bg-emerald-600 text-white font-bold px-3.5 py-2 rounded-xl flex items-center space-x-1.5 shadow-sm transition-all cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Tải File Sao Lưu (.JSON)</span>
              </button>

              <button
                type="button"
                onClick={handleCopyJson}
                className="bg-white hover:bg-slate-100 text-slate-700 font-bold px-3 py-2 rounded-xl border border-slate-300 flex items-center space-x-1.5 cursor-pointer"
              >
                {copiedJson ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedJson ? 'Đã Copy JSON!' : 'Copy Mã JSON'}</span>
              </button>

              <label className="bg-white hover:bg-slate-100 text-slate-700 font-bold px-3 py-2 rounded-xl border border-slate-300 flex items-center space-x-1.5 cursor-pointer">
                <Upload className="w-3.5 h-3.5 text-emerald-700" />
                <span>Nạp Dữ Liệu Từ File JSON</span>
                <input
                  type="file"
                  accept=".json"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          {/* Section 2: Instructions to push to GitHub */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-extrabold text-slate-900 uppercase flex items-center space-x-1.5">
                <Github className="w-4 h-4 text-slate-800" />
                <span>2. Đẩy Mã Nguồn Lên GitHub & Khắc Phục Lỗi</span>
              </h4>
              <button
                type="button"
                onClick={handleCopyGitCommands}
                className="text-emerald-700 hover:text-emerald-900 font-bold flex items-center space-x-1 text-[11px] bg-emerald-50 px-2 py-1 rounded cursor-pointer"
              >
                {copiedScript ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                <span>{copiedScript ? 'Đã Copy Lệnh!' : 'Copy Lệnh Git Chuẩn'}</span>
              </button>
            </div>

            <p className="text-slate-600">
              Chạy các lệnh Git chuẩn bên dưới trong thư mục dự án trên máy tính:
            </p>

            <div className="bg-slate-900 text-emerald-400 p-3 rounded-xl font-mono text-[11px] overflow-x-auto border border-slate-800 select-all">
              <pre>{gitCommands}</pre>
            </div>

            <div className="bg-amber-50 border border-amber-200 p-3 rounded-xl text-slate-700 space-y-1.5 text-[11px]">
              <span className="font-bold text-amber-900 flex items-center space-x-1">
                <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                <span>Khắc phục lỗi khi đẩy lên GitHub (Troubleshooting):</span>
              </span>
              <ul className="list-disc pl-4 space-y-1 text-slate-600">
                <li><strong>Lỗi "Updates were rejected / fetch first":</strong> Chạy lệnh <code>git push -u origin main --force</code> (để ghi đè bản mới nhất lên GitHub).</li>
                <li><strong>Lỗi GitHub Actions "build-and-deploy" báo đỏ:</strong> Vào GitHub Repo $\rightarrow$ <strong>Settings</strong> $\rightarrow$ <strong>Pages</strong> $\rightarrow$ Ở mục <em>Source</em> chọn <strong>GitHub Actions</strong>.</li>
                <li><strong>Workflow deploy.yml:</strong> Đã được tối ưu tự động tương thích với Node 20 & Vite.</li>
              </ul>
            </div>
          </div>

          {/* Close Button */}
          <div className="pt-2 flex justify-end">
            <button
              type="button"
              onClick={onClose}
              className="bg-slate-900 hover:bg-slate-800 text-white font-bold px-5 py-2 rounded-xl cursor-pointer"
            >
              Đóng Cửa Sổ
            </button>
          </div>

        </div>
      </div>
    </div>
  );
};

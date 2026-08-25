import React, { useState } from 'react';
import { 
  FlaskConical, 
  Lock, 
  User as UserIcon, 
  ArrowRight, 
  AlertCircle, 
  ShieldCheck, 
  Phone,
  Eye,
  EyeOff
} from 'lucide-react';
import { User } from '../types';
import { apiUrl, setAuthToken } from '../utils/storage';

interface AuthScreenProps {
  users?: User[];
  onLogin?: (user: User) => void;
  onSelectUser?: (user: User) => void;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({
  onLogin,
  onSelectUser,
}) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const loginCallback = onLogin || onSelectUser || (() => {});

  // Authentication now happens on the server (password hashes never leave
  // it) instead of comparing plaintext passwords in the browser against a
  // locally-cached user list. This is the ONLY step that requires network
  // connectivity — once logged in once on a device, the session is cached
  // and the rest of the app keeps working offline as before.
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setLoading(true);

    try {
      const res = await fetch(apiUrl('/api/auth/login'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim(), password }),
      });

      let data: any = null;
      try {
        data = await res.json();
      } catch {
        // non-JSON error response, handled by !res.ok below
      }

      if (res.ok && data?.success && data.token && data.user) {
        setAuthToken(data.token);
        setLoading(false);
        loginCallback(data.user as User);
        return;
      }

      setErrorMsg(data?.message || 'Tên đăng nhập hoặc mật khẩu không chính xác. Vui lòng kiểm tra lại.');
      setLoading(false);
    } catch (err) {
      console.error('Login error:', err);
      setErrorMsg('Không thể kết nối máy chủ. Vui lòng kiểm tra mạng và thử lại (cần có mạng cho lần đăng nhập đầu tiên trên thiết bị này).');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col justify-center items-center px-4 py-8 relative overflow-hidden font-sans">
      {/* Background Decorative Gradient Orbs */}
      <div className="absolute top-[-10%] left-[-10%] w-[450px] h-[450px] rounded-full bg-orange-600/20 blur-[100px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] rounded-full bg-orange-600/20 blur-[120px] pointer-events-none" />

      {/* Main Container */}
      <div className="w-full max-w-md z-10">
        
        {/* Brand Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-32 h-20 sm:w-40 sm:h-24 rounded-2xl bg-white/95 shadow-xl ring-4 ring-orange-500/20 mb-3 p-2">
            <img
              src="/brand-logo.png"
              alt="CÔNG TY CP VLXD THẾ GIỚI NHÀ"
              className="max-w-full max-h-full object-contain"
            />
          </div>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white uppercase">
            CÔNG TY CP VLXD THẾ GIỚI NHÀ
          </h1>
          <p className="text-xs sm:text-sm text-orange-400 font-semibold mt-1">
            HỆ THỐNG THEO DÕI TIẾN ĐỘ NÉN MẪU BÊ TÔNG & TRIALMIX
          </p>
          <div className="inline-flex items-center space-x-1.5 bg-orange-950/80 border border-orange-700/60 text-orange-300 text-xs px-3 py-1 rounded-full mt-2">
            <FlaskConical className="w-3.5 h-3.5" />
            <span>Tự Động Nhắc Nhở Email Hàng Ngày</span>
          </div>
        </div>

        {/* Login Card */}
        <div className="bg-slate-800/95 backdrop-blur-md rounded-2xl border border-slate-700 p-6 sm:p-8 shadow-2xl">
          <div className="flex items-center justify-between mb-1">
            <h2 className="text-base sm:text-lg font-bold text-white flex items-center space-x-2">
              <ShieldCheck className="w-5 h-5 text-orange-400" />
              <span>Đăng Nhập Hệ Thống</span>
            </h2>
            <span className="text-xs bg-orange-500/20 text-orange-300 border border-orange-500/30 px-2 py-0.5 rounded font-mono font-bold">
              2026
            </span>
          </div>
          <p className="text-xs text-slate-400 mb-5">
            Dành cho Ban Giám Đốc, Kỹ Sư & KTV các trạm trộn TGN
          </p>

          {errorMsg && (
            <div className="mb-4 bg-red-950/80 border border-red-500/60 text-red-200 text-xs p-3 rounded-lg flex items-start space-x-2">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Tài khoản đăng nhập
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <UserIcon className="w-4 h-4" />
                </div>
                <input
                  id="login-username-input"
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Nhập tên tài khoản (ví dụ: admin)"
                  className="w-full bg-slate-900/90 border border-slate-700 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 rounded-lg pl-9 pr-3 py-2.5 text-sm text-white placeholder-slate-500 transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Mật khẩu
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  id="login-password-input"
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Nhập mật khẩu"
                  className="w-full bg-slate-900/90 border border-slate-700 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 rounded-lg pl-9 pr-10 py-2.5 text-sm text-white placeholder-slate-500 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-200 cursor-pointer"
                  tabIndex={-1}
                  aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4 text-orange-400" />}
                </button>
              </div>
            </div>

            <button
              id="btn-submit-login"
              type="submit"
              disabled={loading}
              className="w-full bg-orange-500 hover:bg-orange-400 active:scale-[0.99] text-slate-950 font-bold py-2.5 px-4 rounded-lg text-sm flex items-center justify-center space-x-2 shadow-lg shadow-orange-500/20 transition-all cursor-pointer disabled:opacity-50 mt-2"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <span>Đăng Nhập Vào Hệ Thống</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>

        {/* Footer info with Support Phone 0942320923 */}
        <div className="text-center mt-6 text-xs text-slate-400 space-y-1">
          <p>© {new Date().getFullYear()} CÔNG TY CP VLXD THẾ GIỚI NHÀ</p>
          <p className="text-xs text-orange-400 font-bold">
            <a href="tel:0942320923" className="hover:underline inline-flex items-center gap-1">
              <Phone className="w-3.5 h-3.5" />
              <span>Hỗ trợ kỹ thuật: 0942320923 (0942.320.923)</span>
            </a>
          </p>
        </div>
      </div>
    </div>
  );
};

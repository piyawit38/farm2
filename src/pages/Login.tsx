import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useToast } from "../contexts/ToastContext";
import { LogIn, Sparkles, User, Shield, Mail, Key } from "lucide-react";

export const Login: React.FC = () => {
  const { login } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"user" | "admin">("user");
  const [submitting, setSubmitting] = useState(false);

  const handlePresetLogin = async (presetEmail: string, presetRole: "user" | "admin") => {
    let finalPassword = "";
    if (presetRole === "admin") {
      const enteredPassword = prompt("🛡️ ความปลอดภัย: กรุณากรอกรหัสผ่านผู้ดูแลระบบ");
      if (enteredPassword === null) return; // cancelled
      if (enteredPassword !== "admin1234") {
        showToast("รหัสผ่านผู้ดูแลระบบไม่ถูกต้อง สิทธิ์การเข้าถึงถูกปฏิเสธ", "error");
        return;
      }
      finalPassword = enteredPassword;
    }

    try {
      setSubmitting(true);
      await login(presetEmail, presetRole, finalPassword);
      showToast(`เข้าสู่ระบบในฐานะ "${presetRole === "admin" ? "ผู้ดูแลระบบ" : "ผู้เรียนทั่วไป"}" สำเร็จ!`, "success");
      
      if (presetRole === "admin") {
        navigate("/admin");
      } else {
        navigate("/dashboard");
      }
    } catch (e) {
      showToast(e instanceof Error ? e.message : "ล้มเหลวในการเข้าสู่ระบบ", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCustomLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !email.includes("@")) {
      showToast("กรุณากรอกอีเมลให้ถูกต้องตามรูปแบบ", "warning");
      return;
    }

    if (role === "admin" && !password.trim()) {
      showToast("กรุณากรอกรหัสผ่านผู้ดูแลระบบ", "warning");
      return;
    }

    try {
      setSubmitting(true);
      await login(email, role, password);
      showToast(`ยินดีต้อนรับสู่ AI Herbal Learning Platform`, "success");
      
      if (role === "admin") {
        navigate("/admin");
      } else {
        navigate("/dashboard");
      }
    } catch (e) {
      showToast(e instanceof Error ? e.message : "เกิดความขัดข้องในการล็อคอิน", "error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-md mx-auto py-12 px-4 sm:px-6 animate-fade-in text-left">
      <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-md space-y-6">
        
        {/* Brand Banner */}
        <div className="text-center space-y-2">
          <div className="mx-auto p-3.5 bg-teal-50 dark:bg-teal-950/40 text-teal-600 dark:text-teal-400 rounded-2xl w-fit">
            <LogIn className="w-8 h-8" />
          </div>
          <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100">
            เข้าสู่ระบบเรียนรู้สมุนไพร
          </h1>
          <p className="text-xs text-slate-400 dark:text-slate-500">
            สะสมระดับการเรียนรู้และทดสอบสมรรถนะปัญญาประดิษฐ์
          </p>
        </div>

        {/* Custom Login Form */}
        <form onSubmit={handleCustomLogin} noValidate className="space-y-4">
          
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-600 dark:text-slate-400 block">อีเมลของคุณ:</label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-400" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="กรอกที่อยู่อีเมล เช่น learn@example.com"
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/30 text-sm dark:text-white"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-600 dark:text-slate-400 block">สิทธิ์เข้าใช้งานระบบ:</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setRole("user")}
                className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  role === "user"
                    ? "bg-teal-600 text-white border-transparent shadow-sm"
                    : "bg-slate-50 border-slate-150 text-slate-600 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300"
                }`}
              >
                <User className="w-4 h-4" />
                <span>ผู้เรียนทั่วไป</span>
              </button>
              <button
                type="button"
                onClick={() => setRole("admin")}
                className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  role === "admin"
                    ? "bg-teal-600 text-white border-transparent shadow-sm"
                    : "bg-slate-50 border-slate-150 text-slate-600 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300"
                }`}
              >
                <Shield className="w-4 h-4" />
                <span>ผู้ดูแลระบบ</span>
              </button>
            </div>
          </div>

          {role === "admin" && (
            <div className="space-y-1.5 animate-fade-in">
              <div className="flex justify-between items-center">
                <label className="text-xs font-bold text-slate-600 dark:text-slate-400 block">
                  รหัสผ่านผู้ดูแลระบบ:
                </label>
              </div>
              <div className="relative">
                <Key className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-400" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="กรอกรหัสผ่านผู้ดูแลระบบ"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/30 text-sm dark:text-white"
                />
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl text-sm shadow-sm transition-all flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <span>ลงทะเบียนหรือล็อคอินเข้าใช้</span>
          </button>

        </form>

        {/* Separator */}
        <div className="relative flex py-2 items-center">
          <div className="flex-grow border-t border-slate-150 dark:border-slate-800"></div>
          <span className="flex-shrink mx-4 text-[10px] text-slate-400 font-extrabold uppercase tracking-wide">
            หรือเลือกบัญชีสาธิตเพื่อความสะดวกในการรีวิว
          </span>
          <div className="flex-grow border-t border-slate-150 dark:border-slate-800"></div>
        </div>

        {/* Preset quick buttons */}
        <div className="flex flex-col gap-2.5">
          <button
            onClick={() => handlePresetLogin("piyaorn.ja@gmail.com", "user")}
            disabled={submitting}
            className="w-full p-3 bg-teal-50/50 hover:bg-teal-100/50 border border-teal-200/40 rounded-xl text-left flex items-center justify-between text-xs sm:text-sm text-teal-800 dark:bg-teal-950/20 dark:text-teal-400 dark:border-teal-950/30 transition-all cursor-pointer"
          >
            <div className="flex items-center gap-2.5">
              <span className="text-base">🌱</span>
              <div className="space-y-0.5 text-left">
                <span className="font-bold block">เข้าใช้งานเป็น "ผู้เรียนทั่วไป"</span>
                <span className="text-[10px] opacity-75">อีเมลตัวอย่าง: piyaorn.ja@gmail.com</span>
              </div>
            </div>
            <Sparkles className="w-4 h-4 text-emerald-500" />
          </button>

          <button
            onClick={() => handlePresetLogin("admin@hatyai.go.th", "admin")}
            disabled={submitting}
            className="w-full p-3 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200/40 rounded-xl text-left flex items-center justify-between text-xs sm:text-sm text-indigo-800 dark:bg-indigo-950/20 dark:text-indigo-400 dark:border-indigo-950/30 transition-all cursor-pointer"
          >
            <div className="flex items-center gap-2.5">
              <span className="text-base">🛡️</span>
              <div className="space-y-0.5 text-left">
                <span className="font-bold block">เข้าใช้งานเป็น "ผู้ดูแลระบบสมุนไพร"</span>
                <span className="text-[10px] opacity-75">อีเมลตัวอย่าง: admin@hatyai.go.th</span>
              </div>
            </div>
            <Sparkles className="w-4 h-4 text-indigo-500" />
          </button>
        </div>

      </div>
    </div>
  );
};
export default Login;

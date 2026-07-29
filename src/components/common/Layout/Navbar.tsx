import React, { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../../../contexts/AuthContext";
import { useTheme } from "../../../contexts/ThemeContext";
import { useGarden } from "../../../contexts/GardenContext";
import { 
  Sun, 
  Moon, 
  Leaf, 
  Trophy, 
  Shield, 
  LogOut, 
  LogIn, 
  Award, 
  Sparkles, 
  User, 
  HelpCircle, 
  Camera, 
  Menu, 
  X, 
  Info, 
  Home, 
  MessageSquare 
} from "lucide-react";

export const Navbar: React.FC = () => {
  const { user, logout } = useAuth();
  const { darkMode, toggleDarkMode } = useTheme();
  const { currentGarden, allGardens, switchGarden } = useGarden();
  const navigate = useNavigate();
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);

  const handleLogout = () => {
    logout();
    setIsOpen(false);
    navigate("/");
  };

  const menuItems = [
    { label: "หน้าแรก", path: "/", icon: <Home className="w-4 h-4" /> },
    { label: "คลังสมุนไพร", path: "/herbs", icon: <Leaf className="w-4 h-4" /> },
    { label: "สแกน AI", path: "/vision", icon: <Camera className="w-4 h-4" /> },
    { label: "หมอพฤกษา AI", path: "/chatbot", icon: <MessageSquare className="w-4 h-4" /> },
    { label: "แบบทดสอบ", path: "/challenge", icon: <Award className="w-4 h-4" /> },
    { label: "เกี่ยวกับโครงการ", path: "/about", icon: <Info className="w-4 h-4" /> },
  ];

  return (
    <nav className="sticky top-0 z-40 w-full backdrop-blur-md bg-white/95 dark:bg-slate-900/95 border-b border-slate-100 dark:border-slate-800 transition-colors duration-300 shadow-2xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-3">
          
          {/* Brand Logo & Title (Grab Superapp Style) */}
          <div className="flex items-center gap-2 shrink-0">
            <Link to="/" onClick={() => setIsOpen(false)} className="flex items-center gap-2 group">
              <div className="w-9 h-9 rounded-xl bg-[#00B14F] text-white flex items-center justify-center font-black shadow-md shadow-[#00B14F]/20 group-hover:scale-105 transition-transform shrink-0">
                {currentGarden.logo ? (
                  <img
                    src={currentGarden.logo}
                    alt={currentGarden.name}
                    referrerPolicy="no-referrer"
                    className="w-full h-full rounded-xl object-cover"
                  />
                ) : (
                  <Leaf className="w-5 h-5 fill-white" />
                )}
              </div>
              <div className="flex flex-col text-left">
                <span className="font-extrabold text-slate-900 dark:text-white text-base leading-tight tracking-tight flex items-center gap-1">
                  AI Herbal <span className="text-[#00B14F]">Learning</span>
                </span>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold leading-none">
                  1 อปท. 1 สวนสมุนไพร
                </span>
              </div>
            </Link>
          </div>
          
          {/* Multi-Tenant Garden Selector (Grab Location Bar Style) */}
          <div className="hidden md:flex items-center gap-2 bg-slate-100 dark:bg-slate-800/80 px-3 py-1.5 rounded-full border border-slate-200/80 dark:border-slate-700/80">
            <span className="text-xs text-[#00B14F] font-black flex items-center gap-1 shrink-0">
              📍 สวน:
            </span>
            <select
              value={currentGarden.gardenId}
              onChange={(e) => switchGarden(e.target.value)}
              className="text-xs bg-transparent border-none focus:outline-none text-slate-800 dark:text-slate-200 font-bold max-w-[200px] cursor-pointer"
            >
              {allGardens.map((g) => (
                <option key={g.gardenId} value={g.gardenId} className="dark:bg-slate-900 text-slate-900 dark:text-slate-100">
                  {g.name}
                </option>
              ))}
            </select>
          </div>

          {/* Desktop Central Menu */}
          <div className="hidden xl:flex items-center gap-1">
            {menuItems.map((item) => {
              const active = location.pathname === item.path || (item.path !== "/" && location.pathname.startsWith(item.path));
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                    active
                      ? "text-[#00B14F] bg-[#E6F7ED] dark:bg-[#00B14F]/20 dark:text-[#00B14F]"
                      : "text-slate-600 dark:text-slate-300 hover:text-[#00B14F] hover:bg-slate-100 dark:hover:bg-slate-800"
                  }`}
                >
                  {item.icon}
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>

          {/* Right Controls Area */}
          <div className="flex items-center gap-2">

            {/* Dark Mode Toggle Button */}
            <button
              onClick={toggleDarkMode}
              className="p-2 text-slate-500 dark:text-slate-400 hover:text-[#00B14F] hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
              title={darkMode ? "เปิดโหมดแสง" : "เปิดโหมดมืด"}
            >
              {darkMode ? <Sun className="w-5 h-5 text-amber-400" /> : <Moon className="w-5 h-5 text-slate-600" />}
            </button>

            {/* Auth Slot */}
            <div className="hidden sm:flex items-center gap-2">
              {user ? (
                <div className="flex items-center gap-2">
                  {/* Admin Quick Entry */}
                  {user.role === "admin" && (
                    <Link
                      to="/admin"
                      className="p-2 text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 rounded-xl transition-colors flex items-center gap-1 text-xs font-bold border border-emerald-200 dark:border-emerald-800"
                      title="ผู้ดูแลระบบ"
                    >
                      <Shield className="w-4 h-4" />
                      <span className="hidden sm:inline">Admin</span>
                    </Link>
                  )}

                  {/* Grab-style User Points Badge */}
                  <Link
                    to="/dashboard"
                    className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800/90 hover:bg-[#E6F7ED] dark:hover:bg-slate-800 p-1.5 pr-3 rounded-full border border-slate-200 dark:border-slate-700 transition-colors"
                  >
                    <img
                      src={user.photoURL}
                      alt={user.displayName}
                      className="w-7 h-7 rounded-full border border-[#00B14F]/40 bg-white"
                    />
                    <div className="flex items-center gap-1 text-xs font-black text-slate-800 dark:text-slate-200">
                      <span className="text-[#00B14F]">⭐ {user.totalScore}</span>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">แต้ม</span>
                    </div>
                  </Link>

                  <button
                    onClick={handleLogout}
                    className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-xl transition-colors cursor-pointer"
                    title="ออกจากระบบ"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <Link
                  to="/login"
                  className="flex items-center gap-1.5 px-4 py-2 bg-[#00B14F] hover:bg-[#009643] text-white rounded-full text-xs font-extrabold shadow-md shadow-[#00B14F]/20 transition-all cursor-pointer"
                >
                  <LogIn className="w-4 h-4" />
                  <span>เข้าสู่ระบบ</span>
                </Link>
              )}
            </div>

            {/* Mobile Menu Hamburger Button */}
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="xl:hidden p-2 text-slate-600 dark:text-slate-300 hover:text-[#00B14F] hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
              aria-label="Toggle menu"
            >
              {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Collapsible Drawer */}
      {isOpen && (
        <div className="xl:hidden border-t border-slate-100 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md shadow-2xl max-h-[calc(100vh-4rem)] overflow-y-auto">
          <div className="px-4 py-4 space-y-4">
            
            {/* Garden Selector */}
            <div className="space-y-1.5 pb-3 border-b border-slate-100 dark:border-slate-800">
              <label className="text-[10px] font-black text-[#00B14F] uppercase tracking-wider block">
                📍 สวนสมุนไพร:
              </label>
              <select
                value={currentGarden.gardenId}
                onChange={(e) => {
                  switchGarden(e.target.value);
                  setIsOpen(false);
                }}
                className="w-full text-xs bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl py-2.5 px-3 focus:outline-none text-slate-900 dark:text-slate-100 font-bold"
              >
                {allGardens.map((g) => (
                  <option key={g.gardenId} value={g.gardenId}>
                    {g.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Menu Items */}
            <div className="space-y-1">
              {menuItems.map((item) => {
                const active = location.pathname === item.path || (item.path !== "/" && location.pathname.startsWith(item.path));
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setIsOpen(false)}
                    className={`flex items-center gap-3 px-3.5 py-3 rounded-xl text-xs font-extrabold transition-all ${
                      active
                        ? "text-[#00B14F] bg-[#E6F7ED] dark:bg-[#00B14F]/20"
                        : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                    }`}
                  >
                    <span className={active ? "text-[#00B14F]" : "text-slate-400"}>
                      {item.icon}
                    </span>
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>

            {/* User Info */}
            <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
              {user ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-3 px-3 py-1">
                    <img
                      src={user.photoURL}
                      alt={user.displayName}
                      className="w-10 h-10 rounded-full border-2 border-[#00B14F]"
                    />
                    <div className="flex flex-col text-left">
                      <span className="text-sm font-black text-slate-900 dark:text-slate-100">
                        {user.displayName}
                      </span>
                      <span className="text-xs text-[#00B14F] font-extrabold mt-0.5">
                        ⭐ {user.totalScore} คะแนนสะสม
                      </span>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2">
                    {user.role === "admin" && (
                      <Link
                        to="/admin"
                        onClick={() => setIsOpen(false)}
                        className="flex items-center justify-center gap-1.5 py-2.5 px-3 bg-emerald-50 text-emerald-700 rounded-xl text-xs font-bold border border-emerald-200 text-center"
                      >
                        <Shield className="w-4 h-4" />
                        <span>แผงควบคุม</span>
                      </Link>
                    )}
                    <button
                      onClick={handleLogout}
                      className="flex items-center justify-center gap-1.5 py-2.5 px-3 bg-red-50 text-red-600 rounded-xl text-xs font-bold border border-red-200 cursor-pointer text-center"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>ออกจากระบบ</span>
                    </button>
                  </div>
                </div>
              ) : (
                <Link
                  to="/login"
                  onClick={() => setIsOpen(false)}
                  className="flex items-center justify-center gap-2 w-full py-3 bg-[#00B14F] hover:bg-[#009643] text-white font-extrabold rounded-xl text-xs shadow-md text-center"
                >
                  <LogIn className="w-4 h-4" />
                  <span>เข้าสู่ระบบเก็บคะแนน</span>
                </Link>
              )}
            </div>

          </div>
        </div>
      )}
    </nav>
  );
};

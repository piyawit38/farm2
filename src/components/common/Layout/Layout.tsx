import React from "react";
import { Navbar } from "./Navbar";
import { Footer } from "./Footer";
import { Link, useLocation } from "react-router-dom";
import { Home, Leaf, MessageSquare, HelpCircle, Camera } from "lucide-react";

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const location = useLocation();

  const mobileTabs = [
    { label: "หน้าแรก", path: "/", icon: Home },
    { label: "สมุนไพร", path: "/herbs", icon: Leaf },
    { label: "วิเคราะห์ AI", path: "/vision", icon: Camera },
    { label: "ถามตอบ AI", path: "/chatbot", icon: MessageSquare },
    { label: "ข้อสอบ", path: "/challenge", icon: HelpCircle },
  ];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-300 flex flex-col font-sans pb-16 sm:pb-0">
      {/* Global Header */}
      <Navbar />

      {/* Main Content Area */}
      <main className="flex-grow max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {children}
      </main>

      {/* Global Footer */}
      <Footer />

      {/* Grab Floating Mobile Bottom Tab Bar */}
      <div className="sm:hidden fixed bottom-3 left-4 right-4 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-slate-200/80 dark:border-slate-800 shadow-xl rounded-full z-40 flex items-center justify-around py-2 px-2">
        {mobileTabs.map((tab) => {
          const Icon = tab.icon;
          const active = location.pathname === tab.path || (tab.path !== "/" && location.pathname.startsWith(tab.path));
          return (
            <Link
              key={tab.path}
              to={tab.path}
              className={`flex flex-col items-center justify-center flex-1 py-1 px-1 transition-all rounded-full ${
                active
                  ? "text-[#00B14F] dark:text-[#00B14F] font-black"
                  : "text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 font-bold"
              }`}
            >
              <div className={`p-1 rounded-full ${active ? "bg-[#E6F7ED] dark:bg-[#00B14F]/20" : ""}`}>
                <Icon className="w-5 h-5" />
              </div>
              <span className="text-[10px] mt-0.5 tracking-tight">{tab.label}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
};
export default Layout;

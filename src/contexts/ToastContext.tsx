import React, { createContext, useContext, useState, useCallback } from "react";

export type ToastType = "success" | "error" | "warning" | "info";

interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextType {
  toasts: Toast[];
  showToast: (message: string, type?: ToastType) => void;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback((message: string, type: ToastType = "success") => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);
    
    // Auto-dismiss in 4 seconds
    setTimeout(() => {
      removeToast(id);
    }, 4000);
  }, [removeToast]);

  return (
    <ToastContext.Provider value={{ toasts, showToast, removeToast }}>
      {children}
      
      {/* Toast Notification Layer */}
      <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
        {toasts.map((toast) => {
          let bgColor = "bg-teal-600 text-white";
          let icon = "🔔";
          if (toast.type === "success") {
            bgColor = "bg-emerald-600 text-white shadow-emerald-900/10";
            icon = "✅";
          } else if (toast.type === "error") {
            bgColor = "bg-red-600 text-white shadow-red-900/10";
            icon = "❌";
          } else if (toast.type === "warning") {
            bgColor = "bg-amber-500 text-slate-950 shadow-amber-900/10";
            icon = "⚠️";
          } else if (toast.type === "info") {
            bgColor = "bg-teal-600 text-white shadow-teal-900/10";
            icon = "ℹ️";
          }

          return (
            <div
              key={toast.id}
              className={`pointer-events-auto flex items-start gap-3 p-4 rounded-xl shadow-lg border border-white/10 backdrop-blur-md transition-all duration-300 animate-slide-up ${bgColor}`}
            >
              <span className="text-lg shrink-0">{icon}</span>
              <div className="flex-1 text-sm font-medium leading-tight">
                {toast.message}
              </div>
              <button
                onClick={() => removeToast(toast.id)}
                className="shrink-0 text-white/70 hover:text-white transition-colors text-xs font-bold px-1"
              >
                ✕
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) throw new Error("useToast must be used within a ToastProvider");
  return context;
};

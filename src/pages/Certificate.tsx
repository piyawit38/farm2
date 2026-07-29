import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";

export const Certificate: React.FC = () => {
  const navigate = useNavigate();

  useEffect(() => {
    navigate("/challenge?tab=certificate", { replace: true });
  }, [navigate]);

  return (
    <div className="flex items-center justify-center min-h-[60vh] animate-fade-in text-left">
      <div className="text-center space-y-4">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-teal-600 mx-auto"></div>
        <div className="space-y-1">
          <h2 className="text-lg font-bold text-slate-800 dark:text-slate-200">กำลังเปลี่ยนเส้นทาง...</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            ย้ายหน้าเกียรติบัตรความรู้อัจฉริยะไปรวมกับ "หน้าทดสอบความรู้สมุนไพร" เรียบร้อยแล้ว
          </p>
        </div>
      </div>
    </div>
  );
};

export default Certificate;

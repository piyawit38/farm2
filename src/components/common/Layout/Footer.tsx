import React from "react";
import { Leaf } from "lucide-react";
import { useGarden } from "../../../contexts/GardenContext";

export const Footer: React.FC = () => {
  const { currentGarden } = useGarden();

  return (
    <footer className="bg-slate-50 dark:bg-slate-950 border-t border-slate-100 dark:border-slate-900 transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <div className="md:flex md:items-center md:justify-between gap-4">
          
          {/* Brand and Description */}
          <div className="flex items-center gap-2">
            <Leaf className="w-5 h-5 text-teal-600 dark:text-teal-400" />
            <span className="text-sm font-sans font-bold text-slate-800 dark:text-slate-200">
              AI Herbal Learning Platform
            </span>
            <span className="text-xs text-slate-400 dark:text-slate-600">|</span>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              ต่อยอดโครงการ 1 อปท. 1 สวนสมุนไพร เฉลิมพระเกียรติฯ
            </span>
          </div>

          {/* Developer Credit */}
          <p className="mt-4 md:mt-0 text-center text-xs text-slate-500 dark:text-slate-400">
            ผู้พัฒนาระบบ: <span className="font-semibold text-teal-600 dark:text-teal-400">SMA ญว.</span>
          </p>


          
        </div>
      </div>
    </footer>
  );
};

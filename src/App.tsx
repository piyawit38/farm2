import React from "react";
import { ThemeProvider } from "./contexts/ThemeContext";
import { ToastProvider } from "./contexts/ToastContext";
import { AuthProvider } from "./contexts/AuthContext";
import { GardenProvider } from "./contexts/GardenContext";
import { AppRoutes } from "./routes/AppRoutes";

export default function App() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <AuthProvider>
          <GardenProvider>
            <AppRoutes />
          </GardenProvider>
        </AuthProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}

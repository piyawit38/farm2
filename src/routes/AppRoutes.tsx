import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Layout } from "../components/common/Layout/Layout";
import { Home } from "../pages/Home";
import { About } from "../pages/About";
import { Herbs } from "../pages/Herbs";
import { HerbDetail } from "../pages/HerbDetail";
import { Vision } from "../pages/Vision";
import { Chatbot } from "../pages/Chatbot";
import { Challenge } from "../pages/Challenge";
import { Dashboard } from "../pages/Dashboard";
import { Leaderboard } from "../pages/Leaderboard";
import { Certificate } from "../pages/Certificate";
import { Login } from "../pages/Login";
import { AdminPortal } from "../pages/admin/AdminPortal";

export const AppRoutes: React.FC = () => {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          {/* Public Learning Pages */}
          <Route path="/" element={<Home />} />
          <Route path="/about" element={<About />} />
          <Route path="/herbs" element={<Herbs />} />
          <Route path="/herbs/:id" element={<HerbDetail />} />
          
          {/* Intelligent Interactive Features */}
          <Route path="/vision" element={<Vision />} />
          <Route path="/chatbot" element={<Chatbot />} />
          <Route path="/challenge" element={<Challenge />} />
          
          {/* Gamified Standings and Certifications */}
          <Route path="/leaderboard" element={<Leaderboard />} />
          <Route path="/certificate" element={<Certificate />} />
          
          {/* User Profile & Auth */}
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/login" element={<Login />} />
          
          {/* Administrative Portal */}
          <Route path="/admin" element={<AdminPortal />} />

          {/* Fallback route */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
};
export default AppRoutes;

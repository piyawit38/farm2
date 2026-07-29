import React, { createContext, useContext, useState, useEffect } from "react";
import { User } from "../types";
import { getCurrentUser, setCurrentUser as dbSetCurrentUser, saveUser, getUsers } from "../services/db";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, role?: "user" | "admin", password?: string) => Promise<User>;
  loginWithGoogle: () => Promise<User>;
  register: (displayName: string, email: string) => Promise<User>;
  logout: () => void;
  addScore: (points: number) => Promise<User>;
  addCompletedHerb: (herbId: string) => Promise<User>;
  updateProfileName: (displayName: string) => Promise<User>;
  updateProfilePhoto: (photoURL: string) => Promise<User>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Helper to determine Level and levelProgress based on totalScore
export function calculateUserLevel(score: number): {
  level: "beginner" | "explorer" | "specialist" | "expert";
  progress: number;
} {
  if (score <= 50) {
    return { level: "beginner", progress: Math.round((score / 50) * 100) };
  } else if (score <= 100) {
    return { level: "explorer", progress: Math.round(((score - 50) / 50) * 100) };
  } else if (score <= 150) {
    return { level: "specialist", progress: Math.round(((score - 100) / 50) * 100) };
  } else {
    return { level: "expert", progress: Math.min(100, Math.round(((score - 150) / 50) * 100)) };
  }
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUserState] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    // Load current session
    const current = getCurrentUser();
    setUserState(current);
    setLoading(false);

    const handleSync = () => {
      const updated = getCurrentUser();
      setUserState(updated);
    };

    window.addEventListener("db_synced", handleSync);
    window.addEventListener("storage", handleSync);
    window.addEventListener("stats_cleared", handleSync);
    return () => {
      window.removeEventListener("db_synced", handleSync);
      window.removeEventListener("storage", handleSync);
      window.removeEventListener("stats_cleared", handleSync);
    };
  }, []);

  const login = async (email: string, role: "user" | "admin" = "user", password?: string): Promise<User> => {
    if (role === "admin") {
      if (password !== "admin1234") {
        throw new Error("รหัสผ่านผู้ดูแลระบบไม่ถูกต้อง");
      }
    }

    // Check if user already exists
    const allUsers = getUsers();
    let existing = allUsers.find(u => u.email.toLowerCase() === email.toLowerCase());
    
    if (!existing) {
      // Create new
      const name = email.split("@")[0];
      const displayName = name.charAt(0).toUpperCase() + name.slice(1);
      existing = {
        userId: "USER_" + Math.random().toString(36).substring(2, 9),
        email: email.toLowerCase(),
        displayName,
        photoURL: `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(displayName)}`,
        role: role,
        gardenId: "HATYAI001",
        totalScore: 0,
        completedHerbs: [],
        level: "beginner",
        levelProgress: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      saveUser(existing);
    } else if (role === "admin" && existing.role !== "admin") {
      // Upgrade to admin for demo/admin ease of testing
      existing.role = "admin";
      saveUser(existing);
    }
    
    dbSetCurrentUser(existing);
    setUserState(existing);
    return existing;
  };

  const loginWithGoogle = async (): Promise<User> => {
    // Simulate quick, premium Google OAuth login
    return login("piyaorn.ja@gmail.com", "user");
  };

  const register = async (displayName: string, email: string): Promise<User> => {
    const existing = {
      userId: "USER_" + Math.random().toString(36).substring(2, 9),
      email: email.toLowerCase(),
      displayName,
      photoURL: `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(displayName)}`,
      role: "user" as const,
      gardenId: "HATYAI001",
      totalScore: 0,
      completedHerbs: [],
      level: "beginner" as const,
      levelProgress: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    saveUser(existing);
    dbSetCurrentUser(existing);
    setUserState(existing);
    return existing;
  };

  const logout = () => {
    dbSetCurrentUser(null);
    setUserState(null);
  };

  const addScore = async (points: number): Promise<User> => {
    if (!user) throw new Error("No authenticated user.");
    const newScore = user.totalScore + points;
    const { level, progress } = calculateUserLevel(newScore);
    
    const updatedUser: User = {
      ...user,
      totalScore: newScore,
      level,
      levelProgress: progress,
      updatedAt: new Date().toISOString()
    };
    
    saveUser(updatedUser);
    setUserState(updatedUser);
    return updatedUser;
  };

  const addCompletedHerb = async (herbId: string): Promise<User> => {
    if (!user) throw new Error("No authenticated user.");
    if (user.completedHerbs.includes(herbId)) return user;
    
    // Gain 10 points for learning a new herb!
    const newScore = user.totalScore + 10;
    const { level, progress } = calculateUserLevel(newScore);

    const updatedUser: User = {
      ...user,
      completedHerbs: [...user.completedHerbs, herbId],
      totalScore: newScore,
      level,
      levelProgress: progress,
      updatedAt: new Date().toISOString()
    };
    
    saveUser(updatedUser);
    setUserState(updatedUser);
    return updatedUser;
  };

  const updateProfileName = async (newDisplayName: string): Promise<User> => {
    if (!user) throw new Error("No authenticated user.");
    const updatedUser: User = {
      ...user,
      displayName: newDisplayName.trim() || user.displayName,
      updatedAt: new Date().toISOString()
    };
    
    saveUser(updatedUser);
    dbSetCurrentUser(updatedUser);
    setUserState(updatedUser);
    window.dispatchEvent(new Event("storage"));
    return updatedUser;
  };

  const updateProfilePhoto = async (newPhotoURL: string): Promise<User> => {
    if (!user) throw new Error("No authenticated user.");
    const updatedUser: User = {
      ...user,
      photoURL: newPhotoURL,
      updatedAt: new Date().toISOString()
    };
    
    saveUser(updatedUser);
    dbSetCurrentUser(updatedUser);
    setUserState(updatedUser);
    window.dispatchEvent(new Event("storage"));
    return updatedUser;
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, loginWithGoogle, register, logout, addScore, addCompletedHerb, updateProfileName, updateProfilePhoto }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within an AuthProvider");
  return context;
};

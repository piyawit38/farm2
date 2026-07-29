import { Garden, Herb, Quiz, Announcement, User, LearningRecord, Certificate, ChatLog, VisitLog, ScanLog, HerbViewLog } from "../types";
import { DEFAULT_GARDEN, INITIAL_HERBS, INITIAL_QUIZZES, INITIAL_ANNOUNCEMENTS } from "../constants";
import { db } from "../lib/firebase";
import { doc, setDoc, onSnapshot, collection } from "firebase/firestore";

// Helper keys for localStorage
const KEYS = {
  GARDENS: "herbal_platform_gardens",
  HERBS: "herbal_platform_herbs",
  QUIZZES: "herbal_platform_quizzes",
  ANNOUNCEMENTS: "herbal_platform_announcements",
  USERS: "herbal_platform_users",
  LEARNING_RECORDS: "herbal_platform_learning_records",
  CERTIFICATES: "herbal_platform_certificates",
  CHAT_LOGS: "herbal_platform_chat_logs",
  VISIT_LOGS: "herbal_platform_visit_logs",
  SCAN_LOGS: "herbal_platform_scan_logs",
  HERB_VIEW_LOGS: "herbal_platform_herb_view_logs",
  CURRENT_USER: "herbal_platform_current_user",
  CURRENT_GARDEN_ID: "herbal_platform_current_garden_id"
};

// Log Generators removed - stats now reflect 100% real user activity events

// Global server sync helper
let isSyncing = false;

function getUniqueItemKey(item: any): string {
  if (!item || typeof item !== "object") return String(item);
  return item.logId || item.chatId || item.recordId || item.certificateId || item.certId || item.userId || item.email || item.herbId || item.gardenId || item.quizId || item.announcementId || JSON.stringify(item);
}

function mergeClientAndServerArrays(localArr: any[], serverArr: any[]): any[] {
  if (!Array.isArray(serverArr) || serverArr.length === 0) return Array.isArray(localArr) ? localArr : [];
  if (!Array.isArray(localArr) || localArr.length === 0) return serverArr;

  const map = new Map<string, any>();
  // 1. Add local items first
  localArr.forEach(item => {
    map.set(getUniqueItemKey(item), item);
  });
  // 2. Process server items while preserving local updates
  serverArr.forEach(item => {
    const k = getUniqueItemKey(item);
    if (!map.has(k)) {
      map.set(k, item);
    } else {
      const existingLocal = map.get(k);
      const localTime = existingLocal?.updatedAt ? new Date(existingLocal.updatedAt).getTime() : 0;
      const serverTime = item?.updatedAt ? new Date(item.updatedAt).getTime() : 0;

      if (localTime > serverTime) {
        map.set(k, { ...item, ...existingLocal });
      } else {
        map.set(k, { ...existingLocal, ...item });
      }
    }
  });

  return Array.from(map.values());
}

export async function syncWithServer(): Promise<void> {
  if (isSyncing) return;
  isSyncing = true;
  try {
    const res = await fetch("/api/db");
    if (!res.ok) {
      isSyncing = false;
      return;
    }
    const serverData = await res.json();

    const keysToSync = [
      KEYS.GARDENS,
      KEYS.HERBS,
      KEYS.QUIZZES,
      KEYS.ANNOUNCEMENTS,
      KEYS.USERS,
      KEYS.LEARNING_RECORDS,
      KEYS.CERTIFICATES,
      KEYS.CHAT_LOGS,
      KEYS.VISIT_LOGS,
      KEYS.SCAN_LOGS,
      KEYS.HERB_VIEW_LOGS,
      KEYS.CURRENT_USER,
      "herbal_platform_stats_cleared"
    ];

    let hasServerData = false;
    keysToSync.forEach(k => {
      if (serverData && serverData[k] !== undefined) {
        hasServerData = true;
      }
    });

    if (!hasServerData) {
      // Initialize server database store with current local seed if server store is empty
      const initialStore: Record<string, any> = {};
      keysToSync.forEach(k => {
        const localVal = localStorage.getItem(k);
        if (localVal) {
          try {
            initialStore[k] = JSON.parse(localVal);
          } catch (e) {
            initialStore[k] = localVal;
          }
        }
      });
      await fetch("/api/db/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: initialStore })
      });
      isSyncing = false;
      return;
    }

    const logArrayKeys = [
      KEYS.LEARNING_RECORDS,
      KEYS.CERTIFICATES,
      KEYS.CHAT_LOGS,
      KEYS.VISIT_LOGS,
      KEYS.SCAN_LOGS,
      KEYS.HERB_VIEW_LOGS
    ];

    let updated = false;
    for (const k of keysToSync) {
      if (serverData[k] !== undefined) {
        const serverVal = serverData[k];
        const localValStr = localStorage.getItem(k);
        let finalValStr = "";

        if (logArrayKeys.includes(k) && Array.isArray(serverVal)) {
          let localArr: any[] = [];
          if (localValStr) {
            try {
              localArr = JSON.parse(localValStr);
            } catch (e) {
              localArr = [];
            }
          }

          const merged = mergeClientAndServerArrays(localArr, serverVal);
          finalValStr = JSON.stringify(merged);

          // If local has items that server doesn't have, push merged list to server
          if (JSON.stringify(merged) !== JSON.stringify(serverVal)) {
            fetch("/api/db/sync", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ key: k, value: merged })
            }).catch(e => console.warn("Failed to push merged key to server:", k, e));
          }
        } else {
          // For entity tables (herbs, quizzes, gardens, announcements, users, etc.)
          finalValStr = typeof serverVal === "string" ? serverVal : JSON.stringify(serverVal);
        }

        if (finalValStr !== localValStr) {
          localStorage.setItem(k, finalValStr);
          updated = true;
        }
      }
    }

    // Keep CURRENT_USER in sync with user's updated record in USERS
    const localCurr = read<User | null>(KEYS.CURRENT_USER, null);
    if (localCurr) {
      const allUsersList = read<User[]>(KEYS.USERS, []);
      const matched = allUsersList.find(u => u.userId === localCurr.userId);
      if (matched) {
        const mergedUser = { ...localCurr, ...matched };
        if (mergedUser.photoURL && mergedUser.photoURL.startsWith("data:")) {
          mergedUser.photoURL = `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(mergedUser.displayName || mergedUser.userId)}`;
        }
        const mergedStr = JSON.stringify(mergedUser);
        if (mergedStr !== localStorage.getItem(KEYS.CURRENT_USER)) {
          localStorage.setItem(KEYS.CURRENT_USER, mergedStr);
          updated = true;
        }
      }
    }

    if (updated) {
      window.dispatchEvent(new Event("storage"));
      window.dispatchEvent(new CustomEvent("db_synced"));
    }
  } catch (err) {
    console.warn("Server sync check failed:", err);
  } finally {
    isSyncing = false;
  }
}

// Initialize Database if empty
export function initDB() {
  if (typeof window !== "undefined" && !(window as any).__db_sync_timer_initialized) {
    (window as any).__db_sync_timer_initialized = true;
    syncWithServer();
    setInterval(syncWithServer, 3000);
    window.addEventListener("focus", syncWithServer);
    window.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") syncWithServer();
    });

    // Real-time Firebase Firestore synchronization
    try {
      onSnapshot(collection(db, "app_store"), (snapshot) => {
        let updated = false;
        snapshot.docChanges().forEach((change) => {
          const key = change.doc.id;
          const docData = change.doc.data();
          if (docData && docData.data !== undefined) {
            const newStr = JSON.stringify(docData.data);
            const currentStr = localStorage.getItem(key);
            if (newStr !== currentStr) {
              localStorage.setItem(key, newStr);
              updated = true;
            }
          }
        });
        if (updated) {
          window.dispatchEvent(new Event("storage"));
          window.dispatchEvent(new CustomEvent("db_synced"));
        }
      }, (err) => {
        console.warn("Firestore snapshot listener notice:", err);
      });
    } catch (err) {
      console.warn("Failed to initialize Firestore snapshot listener:", err);
    }
  }

  if (!localStorage.getItem(KEYS.GARDENS)) {
    localStorage.setItem(KEYS.GARDENS, JSON.stringify([DEFAULT_GARDEN]));
  } else {
    try {
      const existingGardens = JSON.parse(localStorage.getItem(KEYS.GARDENS) || "[]") as Garden[];
      let updated = false;
      const updatedGardens = existingGardens.map(existing => {
        if (existing.gardenId === "HATYAI001" && (existing.name === "กลุ่มนักเรียน SMA ญว." || !existing.name)) {
          existing.name = DEFAULT_GARDEN.name;
          existing.description = DEFAULT_GARDEN.description;
          updated = true;
        }
        if (existing.gardenId === "HATYAI001" && (existing.logo?.includes("unsplash.com") || !existing.logo)) {
          existing.logo = DEFAULT_GARDEN.logo;
          updated = true;
        }
        if (existing.gardenId === "HATYAI001" && (existing.banner?.includes("unsplash.com") || !existing.banner)) {
          existing.banner = DEFAULT_GARDEN.banner;
          updated = true;
        }
        if (existing.gardenId === "HATYAI001" && (existing.openingHours?.includes("เสาร์-อาทิตย์") || !existing.openingHours)) {
          existing.openingHours = DEFAULT_GARDEN.openingHours;
          updated = true;
        }
        if (existing.facebook === undefined) {
          existing.facebook = DEFAULT_GARDEN.facebook;
          updated = true;
        }
        if (existing.website === undefined) {
          existing.website = DEFAULT_GARDEN.website;
          updated = true;
        }
        if (existing.themeColor === undefined) {
          existing.themeColor = DEFAULT_GARDEN.themeColor;
          updated = true;
        }
        if (existing.enableQuiz === undefined) {
          existing.enableQuiz = DEFAULT_GARDEN.enableQuiz;
          updated = true;
        }
        if (existing.enableAI === undefined) {
          existing.enableAI = DEFAULT_GARDEN.enableAI;
          updated = true;
        }
        if (existing.enableLeaderboard === undefined) {
          existing.enableLeaderboard = DEFAULT_GARDEN.enableLeaderboard;
          updated = true;
        }
        return existing;
      });
      if (updated) {
        localStorage.setItem(KEYS.GARDENS, JSON.stringify(updatedGardens));
      }
    } catch (e) {
      localStorage.setItem(KEYS.GARDENS, JSON.stringify([DEFAULT_GARDEN]));
    }
  }
  if (!localStorage.getItem(KEYS.HERBS)) {
    localStorage.setItem(KEYS.HERBS, JSON.stringify(INITIAL_HERBS));
  }
  if (!localStorage.getItem(KEYS.QUIZZES)) {
    localStorage.setItem(KEYS.QUIZZES, JSON.stringify(INITIAL_QUIZZES));
  }
  if (!localStorage.getItem(KEYS.ANNOUNCEMENTS)) {
    localStorage.setItem(KEYS.ANNOUNCEMENTS, JSON.stringify(INITIAL_ANNOUNCEMENTS));
  }
  if (!localStorage.getItem(KEYS.CURRENT_GARDEN_ID)) {
    localStorage.setItem(KEYS.CURRENT_GARDEN_ID, "HATYAI001");
  }

  // Telemetry logs initialization (Default empty logs for initial state)
  if (!localStorage.getItem(KEYS.VISIT_LOGS)) localStorage.setItem(KEYS.VISIT_LOGS, JSON.stringify([]));
  if (!localStorage.getItem(KEYS.SCAN_LOGS)) localStorage.setItem(KEYS.SCAN_LOGS, JSON.stringify([]));
  if (!localStorage.getItem(KEYS.HERB_VIEW_LOGS)) localStorage.setItem(KEYS.HERB_VIEW_LOGS, JSON.stringify([]));
  if (!localStorage.getItem(KEYS.CHAT_LOGS)) localStorage.setItem(KEYS.CHAT_LOGS, JSON.stringify([]));
}

// Low-level helper to read from localStorage
function read<T>(key: string, defaultValue: T): T {
  initDB();
  const data = localStorage.getItem(key);
  return data ? JSON.parse(data) : defaultValue;
}

// Low-level helper to write to localStorage and sync to server & Firebase Firestore
function write<T>(key: string, value: T, replace = false): void {
  localStorage.setItem(key, JSON.stringify(value));
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("storage"));
    window.dispatchEvent(new CustomEvent("db_synced"));
  }

  // 1. Local backend sync
  fetch("/api/db/sync", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ key, value, replace })
  }).catch(e => console.warn("Failed to sync key to server:", key, e));

  // 2. Direct Cloud Firebase Firestore sync
  try {
    setDoc(doc(db, "app_store", key), {
      data: value,
      updatedAt: new Date().toISOString()
    }).catch(e => console.warn("Failed to write to Firestore:", key, e));
  } catch (err) {
    console.warn("Firestore setDoc exception:", err);
  }
}

// --- GARDENS OPERATIONS ---
export function getGardens(): Garden[] {
  return read<Garden[]>(KEYS.GARDENS, [DEFAULT_GARDEN]);
}

export function getGarden(gardenId: string): Garden | null {
  const list = getGardens();
  return list.find(g => g.gardenId === gardenId) || null;
}

export function saveGarden(garden: Garden): void {
  const list = getGardens();
  const idx = list.findIndex(g => g.gardenId === garden.gardenId);
  if (idx > -1) {
    list[idx] = { ...garden, updatedAt: new Date().toISOString() };
  } else {
    list.push({ ...garden, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
  }
  write(KEYS.GARDENS, list, true);
}

// --- HERBS OPERATIONS ---
export function getHerbs(gardenId?: string): Herb[] {
  const isStatsCleared = localStorage.getItem("herbal_platform_stats_cleared") === "true";
  let list = read<Herb[]>(KEYS.HERBS, INITIAL_HERBS);
  
  if (isStatsCleared) {
    // If stats were cleared and list has mock view counts, ensure view counts reflect reset
    if (!localStorage.getItem(KEYS.HERBS)) {
      list = list.map(h => ({ ...h, viewCount: 0 }));
    }
  }

  if (gardenId) {
    return list.filter(h => h.gardenId === gardenId);
  }
  return list;
}

export function getHerb(herbId: string): Herb | null {
  const list = getHerbs();
  return list.find(h => h.herbId === herbId) || null;
}

export function saveHerb(herb: Herb): void {
  const list = getHerbs();
  const idx = list.findIndex(h => h.herbId === herb.herbId);
  const herbToSave = { ...herb, updatedAt: new Date().toISOString() };

  if (idx > -1) {
    list[idx] = herbToSave;
  } else {
    list.push({
      ...herbToSave,
      createdAt: new Date().toISOString(),
      viewCount: 0
    });
  }
  write(KEYS.HERBS, list, true);
  
  // Update Herb Count in the garden
  updateGardenHerbCount(herb.gardenId);
}

export function deleteHerb(herbId: string, gardenId: string): void {
  let list = getHerbs();
  list = list.filter(h => h.herbId !== herbId);
  write(KEYS.HERBS, list, true);
  updateGardenHerbCount(gardenId);

  // Clean quizzes associated
  let quizList = getQuizzes(gardenId);
  quizList = quizList.filter(q => q.herbId !== herbId);
  write(KEYS.QUIZZES, quizList, true);
}

function updateGardenHerbCount(gardenId: string): void {
  const count = getHerbs(gardenId).length;
  const garden = getGarden(gardenId);
  if (garden) {
    saveGarden({ ...garden, herbCount: count });
  }
}

// --- QUIZZES OPERATIONS ---
export function getQuizzes(gardenId?: string): Quiz[] {
  const list = read<Quiz[]>(KEYS.QUIZZES, INITIAL_QUIZZES);
  if (gardenId) {
    return list.filter(q => q.gardenId === gardenId);
  }
  return list;
}

export function getQuiz(quizId: string): Quiz | null {
  const list = getQuizzes();
  return list.find(q => q.quizId === quizId) || null;
}

export function saveQuiz(quiz: Quiz): void {
  const list = getQuizzes();
  const idx = list.findIndex(q => q.quizId === quiz.quizId);
  if (idx > -1) {
    list[idx] = { ...quiz, updatedAt: new Date().toISOString() };
  } else {
    list.push({ ...quiz, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
  }
  write(KEYS.QUIZZES, list, true);
}

export function deleteQuiz(quizId: string): void {
  let list = getQuizzes();
  list = list.filter(q => q.quizId !== quizId);
  write(KEYS.QUIZZES, list, true);
}

// --- ANNOUNCEMENTS OPERATIONS ---
export function getAnnouncements(gardenId?: string): Announcement[] {
  const list = read<Announcement[]>(KEYS.ANNOUNCEMENTS, INITIAL_ANNOUNCEMENTS);
  if (gardenId) {
    return list.filter(a => a.gardenId === gardenId);
  }
  return list;
}

export function saveAnnouncement(announcement: Announcement): void {
  const list = read<Announcement[]>(KEYS.ANNOUNCEMENTS, []);
  const idx = list.findIndex(a => a.announcementId === announcement.announcementId);
  if (idx > -1) {
    list[idx] = announcement;
  } else {
    list.push(announcement);
  }
  write(KEYS.ANNOUNCEMENTS, list, true);
}

export function deleteAnnouncement(announcementId: string): void {
  let list = read<Announcement[]>(KEYS.ANNOUNCEMENTS, []);
  list = list.filter(a => a.announcementId !== announcementId);
  write(KEYS.ANNOUNCEMENTS, list, true);
}

// Filter logs by ISO date string or YYYY-MM-DD
export function filterLogsByDate<T extends { timestamp?: string; createdAt?: string; date?: string; issuedAt?: string }>(
  items: T[],
  startDateStr?: string,
  endDateStr?: string
): T[] {
  if (!startDateStr && !endDateStr) return items;

  const startMs = startDateStr ? new Date(`${startDateStr}T00:00:00.000Z`).getTime() : 0;
  const endMs = endDateStr ? new Date(`${endDateStr}T23:59:59.999Z`).getTime() : Infinity;

  return items.filter(item => {
    const rawDate = item.timestamp || item.createdAt || item.date || item.issuedAt;
    if (!rawDate) return true;
    const itemMs = new Date(rawDate).getTime();
    if (isNaN(itemMs)) return true;
    return itemMs >= startMs && itemMs <= endMs;
  });
}

// REAL VISIT LOGS
export function getVisitLogs(gardenId?: string, startDateStr?: string, endDateStr?: string): VisitLog[] {
  let list = read<VisitLog[]>(KEYS.VISIT_LOGS, []);
  if (gardenId) {
    list = list.filter(v => v.gardenId === gardenId);
  }
  return filterLogsByDate(list, startDateStr, endDateStr);
}

export function logVisit(gardenId: string = "HATYAI001", page: string = "home"): number {
  const list = read<VisitLog[]>(KEYS.VISIT_LOGS, []);
  list.push({
    logId: `VISIT_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    gardenId,
    page,
    timestamp: new Date().toISOString()
  });
  write(KEYS.VISIT_LOGS, list);
  return list.length;
}

export function getVisitorCount(gardenId?: string, startDateStr?: string, endDateStr?: string): number {
  return getVisitLogs(gardenId, startDateStr, endDateStr).length;
}

export function incrementVisitorCount(gardenId: string = "HATYAI001"): number {
  return logVisit(gardenId, "home");
}

export function saveVisitorCount(val: number, gardenId = "HATYAI001"): void {
  const currentLogs = read<VisitLog[]>(KEYS.VISIT_LOGS, []);
  if (val <= 0) {
    write(KEYS.VISIT_LOGS, [], true);
    return;
  }
  if (val === currentLogs.length) return;
  if (val < currentLogs.length) {
    write(KEYS.VISIT_LOGS, currentLogs.slice(0, val), true);
  } else {
    const diff = val - currentLogs.length;
    const nowIso = new Date().toISOString();
    const newLogs: VisitLog[] = [...currentLogs];
    for (let i = 0; i < diff; i++) {
      newLogs.push({
        logId: `VISIT_${Date.now()}_${i}_${Math.random().toString(36).substring(2, 6)}`,
        gardenId,
        page: "home",
        timestamp: nowIso
      });
    }
    write(KEYS.VISIT_LOGS, newLogs, true);
  }
}

// REAL SCAN LOGS
export function getScanLogs(gardenId?: string, startDateStr?: string, endDateStr?: string): ScanLog[] {
  let list = read<ScanLog[]>(KEYS.SCAN_LOGS, []);
  if (gardenId) {
    list = list.filter(s => s.gardenId === gardenId);
  }
  return filterLogsByDate(list, startDateStr, endDateStr);
}

export function logScan(gardenId: string = "HATYAI001", herbName?: string): number {
  const list = read<ScanLog[]>(KEYS.SCAN_LOGS, []);
  list.push({
    logId: `SCAN_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    gardenId,
    herbName,
    timestamp: new Date().toISOString()
  });
  write(KEYS.SCAN_LOGS, list);
  return list.length;
}

export function getScanCount(gardenId?: string, startDateStr?: string, endDateStr?: string): number {
  return getScanLogs(gardenId, startDateStr, endDateStr).length;
}

export function incrementScanCount(gardenId: string = "HATYAI001"): number {
  return logScan(gardenId);
}

export function saveScanCount(val: number, gardenId = "HATYAI001"): void {
  const currentLogs = read<ScanLog[]>(KEYS.SCAN_LOGS, []);
  if (val <= 0) {
    write(KEYS.SCAN_LOGS, [], true);
    return;
  }
  if (val === currentLogs.length) return;
  if (val < currentLogs.length) {
    write(KEYS.SCAN_LOGS, currentLogs.slice(0, val), true);
  } else {
    const diff = val - currentLogs.length;
    const nowIso = new Date().toISOString();
    const newLogs: ScanLog[] = [...currentLogs];
    for (let i = 0; i < diff; i++) {
      newLogs.push({
        logId: `SCAN_${Date.now()}_${i}_${Math.random().toString(36).substring(2, 6)}`,
        gardenId,
        timestamp: nowIso
      });
    }
    write(KEYS.SCAN_LOGS, newLogs, true);
  }
}

// REAL HERB VIEW LOGS
export function getHerbViewLogs(gardenId?: string, startDateStr?: string, endDateStr?: string): HerbViewLog[] {
  let list = read<HerbViewLog[]>(KEYS.HERB_VIEW_LOGS, []);
  if (gardenId) {
    list = list.filter(h => h.gardenId === gardenId);
  }
  return filterLogsByDate(list, startDateStr, endDateStr);
}

export function logHerbView(gardenId: string = "HATYAI001", herbId: string): number {
  const list = read<HerbViewLog[]>(KEYS.HERB_VIEW_LOGS, []);
  list.push({
    logId: `HVIEW_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    gardenId,
    herbId,
    timestamp: new Date().toISOString()
  });
  write(KEYS.HERB_VIEW_LOGS, list);
  return list.length;
}

// CLEAR / RESET ALL STATS LOGS & LEADERBOARD/CERTIFICATES
export function clearAllStatisticsLogs(): void {
  write("herbal_platform_stats_cleared", "true");
  write(KEYS.VISIT_LOGS, [], true);
  write(KEYS.SCAN_LOGS, [], true);
  write(KEYS.HERB_VIEW_LOGS, [], true);
  write(KEYS.CHAT_LOGS, [], true);
  write(KEYS.CERTIFICATES, [], true);
  write(KEYS.LEARNING_RECORDS, [], true);

  // Reset all herb view counts to 0
  const currentHerbs = read<Herb[]>(KEYS.HERBS, INITIAL_HERBS);
  const resetHerbs = currentHerbs.map(h => ({ ...h, viewCount: 0 }));
  write(KEYS.HERBS, resetHerbs, true);

  // Reset user scores & completed herbs in USERS database and active session
  const users = read<User[]>(KEYS.USERS, []);
  const resetUsers = users.map(u => ({
    ...u,
    totalScore: 0,
    completedHerbs: [],
    level: "beginner" as const,
    levelProgress: 0
  }));
  write(KEYS.USERS, resetUsers, true);

  const curr = getCurrentUser();
  if (curr) {
    const updatedCurr = {
      ...curr,
      totalScore: 0,
      completedHerbs: [],
      level: "beginner" as const,
      levelProgress: 0
    };
    write(KEYS.CURRENT_USER, updatedCurr);
  }

  window.dispatchEvent(new Event("storage"));
  window.dispatchEvent(new CustomEvent("stats_cleared"));
}

// REAL CHAT COUNT
export function getChatCount(gardenId?: string, startDateStr?: string, endDateStr?: string): number {
  const logs = getChatLogs(gardenId);
  return filterLogsByDate(logs, startDateStr, endDateStr).length;
}

export function incrementChatCount(): number {
  const logs = getChatLogs();
  return logs.length;
}

export function saveChatCount(val: number): void {
  // Saved through chat logs
}

// Format Thai Date
export function formatThaiDate(dateInput: Date | string, includeTime = false): string {
  const d = typeof dateInput === "string" ? new Date(dateInput) : dateInput;
  if (isNaN(d.getTime())) return "ปัจจุบัน";

  const thaiMonthsShort = [
    "ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.",
    "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."
  ];

  const day = d.getDate();
  const month = thaiMonthsShort[d.getMonth()];
  const year = d.getFullYear() + 543; // Buddhist Era

  if (includeTime) {
    const hours = d.getHours().toString().padStart(2, "0");
    const minutes = d.getMinutes().toString().padStart(2, "0");
    return `${day} ${month} ${year} เวลา ${hours}:${minutes} น.`;
  }

  return `${day} ${month} ${year}`;
}

// Calculate the system date range for telemetry & statistics dynamically from real events
export function getStatsDateRange(gardenId?: string) {
  const visitLogs = getVisitLogs(gardenId);
  const scanLogs = getScanLogs(gardenId);
  const chatLogs = getChatLogs(gardenId);

  let earliestTime = new Date().getTime();
  let hasLogs = false;

  [...visitLogs, ...scanLogs, ...chatLogs].forEach(log => {
    if (log.timestamp) {
      const t = new Date(log.timestamp).getTime();
      if (!isNaN(t) && t < earliestTime) {
        earliestTime = t;
        hasLogs = true;
      }
    }
  });

  const startDate = hasLogs ? new Date(earliestTime) : new Date();
  const endDate = new Date();

  const startDateStr = formatThaiDate(startDate);
  const endDateStr = formatThaiDate(endDate, true);

  return {
    startDateIso: startDate.toISOString(),
    endDateIso: endDate.toISOString(),
    startDateStr,
    endDateStr,
    rangeText: hasLogs
      ? `ข้อมูลสถิติบันทึกสะสมตั้งแต่วันที่ ${startDateStr} ถึง ${endDateStr}`
      : `ข้อมูลสถิติบันทึกประจำวันที่ ${startDateStr}`
  };
}

// Retrieve real popular questions from actual Chat Logs
export function getPopularQuestions(gardenId?: string): { q: string; count: number }[] {
  const chatLogs = getChatLogs(gardenId);

  const questionsMap = new Map<string, number>();

  // Add questions from real chat logs
  chatLogs.forEach(log => {
    if (log.messages && Array.isArray(log.messages)) {
      log.messages.forEach(msg => {
        if (msg.role === "user" && msg.content) {
          const cleanMsg = msg.content.trim();
          if (cleanMsg.length > 5) {
            questionsMap.set(cleanMsg, (questionsMap.get(cleanMsg) || 0) + 1);
          }
        }
      });
    }
  });

  // Convert map to array
  const result = Array.from(questionsMap.entries()).map(([q, count]) => ({ q, count }));

  // Sort by count descending
  result.sort((a, b) => b.count - a.count);

  return result.slice(0, 5);
}

// --- USERS OPERATIONS & PROFILE ---
export function getUsers(): User[] {
  const users = read<User[]>(KEYS.USERS, []);
  let hasBase64 = false;
  const sanitized = users.map(u => {
    if (u.photoURL && u.photoURL.startsWith("data:")) {
      hasBase64 = true;
      return {
        ...u,
        photoURL: `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(u.displayName || u.userId)}`
      };
    }
    return u;
  });
  if (hasBase64) {
    write(KEYS.USERS, sanitized, true);
  }
  return sanitized;
}

export function getUser(userId: string): User | null {
  const list = getUsers();
  return list.find(u => u.userId === userId) || null;
}

export function saveUser(user: User): void {
  const list = getUsers();
  // Ensure photoURL is not a heavy base64 string
  const cleanPhoto = (user.photoURL && user.photoURL.startsWith("data:"))
    ? `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(user.displayName || user.userId)}`
    : user.photoURL;

  const cleanUser = { ...user, photoURL: cleanPhoto };
  const idx = list.findIndex(u => u.userId === cleanUser.userId);
  if (idx > -1) {
    list[idx] = { ...cleanUser, updatedAt: new Date().toISOString() };
  } else {
    list.push({ ...cleanUser, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
  }
  write(KEYS.USERS, list, true);
  
  // If editing current session user, update session as well
  const curr = getCurrentUser();
  if (curr && curr.userId === cleanUser.userId) {
    write(KEYS.CURRENT_USER, cleanUser);
  }
}

export function getCurrentUser(): User | null {
  const curr = read<User | null>(KEYS.CURRENT_USER, null);
  if (curr && curr.photoURL && curr.photoURL.startsWith("data:")) {
    const sanitized = {
      ...curr,
      photoURL: `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(curr.displayName || curr.userId)}`
    };
    write(KEYS.CURRENT_USER, sanitized, true);
    return sanitized;
  }
  return curr;
}

export function setCurrentUser(user: User | null): void {
  write(KEYS.CURRENT_USER, user);
}

export function getActiveGardenId(): string {
  return localStorage.getItem(KEYS.CURRENT_GARDEN_ID) || "HATYAI001";
}

export function setActiveGardenId(gardenId: string): void {
  localStorage.setItem(KEYS.CURRENT_GARDEN_ID, gardenId);
}

// --- LEARNING RECORDS ---
export function getLearningRecords(userId?: string): LearningRecord[] {
  const list = read<LearningRecord[]>(KEYS.LEARNING_RECORDS, []);
  if (userId) {
    return list.filter(r => r.userId === userId);
  }
  return list;
}

export function saveLearningRecord(record: LearningRecord): void {
  const list = getLearningRecords();
  const idx = list.findIndex(r => r.recordId === record.recordId);
  if (idx > -1) {
    list[idx] = record;
  } else {
    list.push(record);
  }
  write(KEYS.LEARNING_RECORDS, list);
}

// --- CERTIFICATES ---
export function getCertificates(userId?: string): Certificate[] {
  const list = read<Certificate[]>(KEYS.CERTIFICATES, []);
  if (userId) {
    return list.filter(c => c.userId === userId);
  }
  return list;
}

export function saveCertificate(certificate: Certificate): void {
  const list = getCertificates();
  list.push(certificate);
  write(KEYS.CERTIFICATES, list);
}

// --- CHAT LOGS ---
export function getChatLogs(gardenId?: string): ChatLog[] {
  const list = read<ChatLog[]>(KEYS.CHAT_LOGS, []);
  if (gardenId) {
    return list.filter(l => l.gardenId === gardenId);
  }
  return list;
}

export function saveChatLog(log: ChatLog): void {
  const list = read<ChatLog[]>(KEYS.CHAT_LOGS, []);
  const idx = list.findIndex(l => l.chatId === log.chatId);
  if (idx > -1) {
    list[idx] = log;
  } else {
    list.push(log);
  }
  write(KEYS.CHAT_LOGS, list);
}

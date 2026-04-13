import * as Haptics from "expo-haptics";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  type CurrentUser,
  type FieldRecord,
  type SyncQueueItem,
  type SyncResult,
  authenticateOffline,
  deleteRecord,
  getCurrentUser,
  getNetworkOnline,
  initializeDatabase,
  listQueue,
  listRecords,
  logoutUser,
  processSyncQueue,
  saveRecord,
} from "@/lib/offlineStore";

type OfflineDataContextValue = {
  initialized: boolean;
  online: boolean;
  syncing: boolean;
  currentUser: CurrentUser | null;
  records: FieldRecord[];
  queue: SyncQueueItem[];
  lastSync: SyncResult | null;
  login: (username: string, pin: string) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
  addOrUpdateRecord: (input: {
    id?: string;
    title: string;
    category: string;
    notes: string;
    location: string;
  }) => Promise<void>;
  removeRecord: (record: FieldRecord) => Promise<void>;
  syncNow: () => Promise<void>;
};

const OfflineDataContext = createContext<OfflineDataContextValue | null>(null);

export function OfflineDataProvider({ children }: { children: React.ReactNode }) {
  const [initialized, setInitialized] = useState(false);
  const [online, setOnline] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [records, setRecords] = useState<FieldRecord[]>([]);
  const [queue, setQueue] = useState<SyncQueueItem[]>([]);
  const [lastSync, setLastSync] = useState<SyncResult | null>(null);

  const refresh = useCallback(async () => {
    const [nextRecords, nextQueue, nextOnline, user] = await Promise.all([
      listRecords(),
      listQueue(),
      getNetworkOnline(),
      getCurrentUser(),
    ]);
    setRecords(nextRecords);
    setQueue(nextQueue);
    setOnline(nextOnline);
    setCurrentUser(user ?? null);
  }, []);

  const syncNow = useCallback(async () => {
    if (syncing) return;
    setSyncing(true);
    try {
      const result = await processSyncQueue(true);
      setLastSync(result);
      await refresh();
      if (result.failed === 0) {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      }
    } finally {
      setSyncing(false);
    }
  }, [refresh, syncing]);

  useEffect(() => {
    let mounted = true;
    initializeDatabase()
      .then(refresh)
      .then(() => {
        if (mounted) setInitialized(true);
      });
    const timer = setInterval(async () => {
      const nextOnline = await getNetworkOnline();
      setOnline(nextOnline);
      if (nextOnline) {
        const result = await processSyncQueue(false);
        setLastSync(result);
        await refresh();
      }
    }, 12000);
    return () => {
      mounted = false;
      clearInterval(timer);
    };
  }, [refresh]);

  const login = useCallback(
    async (username: string, pin: string) => {
      const user = await authenticateOffline(username, pin);
      setCurrentUser(user);
      await Haptics.selectionAsync();
      await refresh();
    },
    [refresh],
  );

  const logout = useCallback(async () => {
    await logoutUser();
    setCurrentUser(null);
    await Haptics.selectionAsync();
  }, []);

  const addOrUpdateRecord = useCallback(
    async (input: {
      id?: string;
      title: string;
      category: string;
      notes: string;
      location: string;
    }) => {
      if (!currentUser) throw new Error("Login is required before saving.");
      await saveRecord({ ...input, owner: currentUser.username });
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      await refresh();
      if (online) {
        void syncNow();
      }
    },
    [currentUser, online, refresh, syncNow],
  );

  const removeRecord = useCallback(
    async (record: FieldRecord) => {
      if (!currentUser) throw new Error("Login is required before deleting.");
      await deleteRecord(record, currentUser.username);
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      await refresh();
      if (online) {
        void syncNow();
      }
    },
    [currentUser, online, refresh, syncNow],
  );

  const value = useMemo(
    () => ({
      initialized,
      online,
      syncing,
      currentUser,
      records,
      queue,
      lastSync,
      login,
      logout,
      refresh,
      addOrUpdateRecord,
      removeRecord,
      syncNow,
    }),
    [
      initialized,
      online,
      syncing,
      currentUser,
      records,
      queue,
      lastSync,
      login,
      logout,
      refresh,
      addOrUpdateRecord,
      removeRecord,
      syncNow,
    ],
  );

  return (
    <OfflineDataContext.Provider value={value}>
      {children}
    </OfflineDataContext.Provider>
  );
}

export function useOfflineData() {
  const context = useContext(OfflineDataContext);
  if (!context) {
    throw new Error("useOfflineData must be used inside OfflineDataProvider");
  }
  return context;
}
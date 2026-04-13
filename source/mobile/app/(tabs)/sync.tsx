import { Feather } from "@expo/vector-icons";
import React from "react";
import {
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { PrimaryButton, Screen, StatusPill } from "@/components/AppChrome";
import { useOfflineData } from "@/contexts/OfflineDataContext";
import { useColors } from "@/hooks/useColors";

export default function SyncScreen() {
  const colors = useColors();
  const { online, queue, syncing, syncNow, lastSync } = useOfflineData();

  return (
    <Screen
      title="Sync"
      subtitle="Queued operations retry automatically with timestamp-based conflict resolution."
    >
      <ScrollView
        contentContainerStyle={[
          styles.content,
          Platform.OS === "web" ? styles.webBottom : null,
        ]}
      >
        <View style={styles.statusRow}>
          <StatusPill
            label={online ? "Network detected" : "Offline mode"}
            tone={online ? "good" : "warning"}
            icon={online ? "wifi" : "wifi-off"}
          />
          <StatusPill
            label={`${queue.length} pending`}
            tone={queue.length ? "warning" : "good"}
            icon="clock"
          />
        </View>

        <View
          style={[
            styles.panel,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
              borderRadius: colors.radius + 10,
            },
          ]}
        >
          <View style={[styles.syncIcon, { backgroundColor: colors.infoSoft }]}>
            <Feather name="refresh-cw" size={28} color={colors.primary} />
          </View>
          <Text style={[styles.panelTitle, { color: colors.foreground }]}>
            Manual sync
          </Text>
          <Text style={[styles.panelText, { color: colors.mutedForeground }]}>
            Saves always stay on-device first. When internet is available, this
            pushes queued create, update, and delete operations to the API and
            pulls newer server records back into SQLite.
          </Text>
          <PrimaryButton
            label="Sync now"
            icon="upload-cloud"
            onPress={syncNow}
            loading={syncing}
          />
          {lastSync ? (
            <View style={[styles.result, { backgroundColor: colors.secondary }]}>
              <Text style={[styles.resultText, { color: colors.secondaryForeground }]}>
                {lastSync.message}
              </Text>
              <Text style={[styles.resultMeta, { color: colors.mutedForeground }]}>
                Pushed {lastSync.pushed} · Conflicts {lastSync.conflicts} · Failed{" "}
                {lastSync.failed}
              </Text>
            </View>
          ) : null}
        </View>

        <View
          style={[
            styles.panel,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
              borderRadius: colors.radius + 10,
            },
          ]}
        >
          <Text style={[styles.panelTitle, { color: colors.foreground }]}>
            API contract
          </Text>
          <Text style={[styles.code, { color: colors.foreground }]}>
            POST /api/sync/records{"\n"}
            body: clientId, operations[] {"\n"}
            returns: acceptedIds, conflicts, serverRecords
          </Text>
          <Text style={[styles.panelText, { color: colors.mutedForeground }]}>
            Conflict policy: last-write-wins using updatedAt timestamps. Partial
            failures remain in the local queue with exponential retry delays.
          </Text>
        </View>

        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
          Queue
        </Text>
        {queue.map((item) => (
          <View
            key={item.id}
            style={[
              styles.queueItem,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
                borderRadius: colors.radius,
              },
            ]}
          >
            <View style={styles.queueTop}>
              <Text style={[styles.queueOperation, { color: colors.foreground }]}>
                {item.operation}
              </Text>
              <StatusPill
                label={item.lastError ? "Failed" : "Pending"}
                tone={item.lastError ? "danger" : "warning"}
                icon={item.lastError ? "alert-triangle" : "clock"}
              />
            </View>
            <Text style={[styles.resultMeta, { color: colors.mutedForeground }]}>
              Attempts {item.attempts} · Retry{" "}
              {new Date(item.nextRetryAt).toLocaleTimeString()}
            </Text>
            {item.lastError ? (
              <Text style={[styles.error, { color: colors.destructive }]}>
                {item.lastError}
              </Text>
            ) : null}
          </View>
        ))}
        {queue.length === 0 ? (
          <View style={styles.empty}>
            <Feather name="check-circle" size={26} color={colors.success} />
            <Text style={[styles.panelText, { color: colors.mutedForeground }]}>
              Local changes are fully synced.
            </Text>
          </View>
        ) : null}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: 16,
    padding: 20,
    paddingBottom: 120,
  },
  webBottom: {
    paddingBottom: 140,
  },
  statusRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  panel: {
    borderWidth: 1,
    gap: 13,
    padding: 16,
  },
  syncIcon: {
    alignItems: "center",
    borderRadius: 999,
    height: 60,
    justifyContent: "center",
    width: 60,
  },
  panelTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 20,
  },
  panelText: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    lineHeight: 21,
  },
  code: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
    lineHeight: 21,
  },
  result: {
    borderRadius: 14,
    gap: 4,
    padding: 12,
  },
  resultText: {
    fontFamily: "Inter_700Bold",
    fontSize: 14,
  },
  resultMeta: {
    fontFamily: "Inter_500Medium",
    fontSize: 12,
  },
  sectionTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 18,
  },
  queueItem: {
    borderWidth: 1,
    gap: 8,
    padding: 14,
  },
  queueTop: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  queueOperation: {
    fontFamily: "Inter_700Bold",
    fontSize: 15,
  },
  error: {
    fontFamily: "Inter_500Medium",
    fontSize: 12,
    lineHeight: 17,
  },
  empty: {
    alignItems: "center",
    gap: 10,
    padding: 24,
  },
});
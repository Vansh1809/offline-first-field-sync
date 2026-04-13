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

export default function ProfileScreen() {
  const colors = useColors();
  const { currentUser, online, queue, records, logout } = useOfflineData();

  return (
    <Screen
      title="Profile"
      subtitle="Role-aware local access for field teams and administrators."
    >
      <ScrollView
        contentContainerStyle={[
          styles.content,
          Platform.OS === "web" ? styles.webBottom : null,
        ]}
      >
        <View
          style={[
            styles.profile,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
              borderRadius: colors.radius + 10,
            },
          ]}
        >
          <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
            <Feather name="user" size={30} color={colors.primaryForeground} />
          </View>
          <Text style={[styles.name, { color: colors.foreground }]}>
            {currentUser?.username ?? "Not logged in"}
          </Text>
          <View style={styles.statusRow}>
            <StatusPill
              label={currentUser?.role ?? "guest"}
              tone="neutral"
              icon="shield"
            />
            <StatusPill
              label={online ? "Online" : "Offline"}
              tone={online ? "good" : "warning"}
              icon={online ? "wifi" : "wifi-off"}
            />
          </View>
          {currentUser ? (
            <PrimaryButton
              label="Log out"
              icon="log-out"
              variant="secondary"
              onPress={logout}
            />
          ) : null}
        </View>

        <View style={styles.metricGrid}>
          <Metric label="Stored locally" value={records.length.toString()} />
          <Metric label="Queued changes" value={queue.length.toString()} />
        </View>

        <View
          style={[
            styles.profile,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
              borderRadius: colors.radius + 10,
            },
          ]}
        >
          <Text style={[styles.name, { color: colors.foreground }]}>
            Offline architecture
          </Text>
          <Text style={[styles.copy, { color: colors.mutedForeground }]}>
            UI writes to the repository layer, repository writes to SQLite, and
            every mutation creates a durable sync_queue row. Background sync
            retries when connectivity returns, and newer timestamps win conflicts.
          </Text>
          <Text style={[styles.copy, { color: colors.mutedForeground }]}>
            For encrypted-at-rest production builds, this structure can swap the
            SQLite driver for an encrypted SQLite provider without changing the UI
            or sync manager contracts.
          </Text>
        </View>
      </ScrollView>
    </Screen>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  const colors = useColors();
  return (
    <View
      style={[
        styles.metric,
        {
          backgroundColor: colors.secondary,
          borderRadius: colors.radius,
        },
      ]}
    >
      <Text style={[styles.metricValue, { color: colors.secondaryForeground }]}>
        {value}
      </Text>
      <Text style={[styles.metricLabel, { color: colors.mutedForeground }]}>
        {label}
      </Text>
    </View>
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
  profile: {
    alignItems: "flex-start",
    borderWidth: 1,
    gap: 14,
    padding: 18,
  },
  avatar: {
    alignItems: "center",
    borderRadius: 999,
    height: 68,
    justifyContent: "center",
    width: 68,
  },
  name: {
    fontFamily: "Inter_700Bold",
    fontSize: 21,
  },
  statusRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  metricGrid: {
    flexDirection: "row",
    gap: 12,
  },
  metric: {
    flex: 1,
    padding: 16,
  },
  metricValue: {
    fontFamily: "Inter_700Bold",
    fontSize: 26,
  },
  metricLabel: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 12,
  },
  copy: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    lineHeight: 21,
  },
});
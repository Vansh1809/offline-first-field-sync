import { Feather } from "@expo/vector-icons";
import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import {
  FieldInput,
  PrimaryButton,
  RecordCard,
  Screen,
  StatusPill,
} from "@/components/AppChrome";
import { useOfflineData } from "@/contexts/OfflineDataContext";
import { useColors } from "@/hooks/useColors";

export default function TabOneScreen() {
  const colors = useColors();
  const {
    initialized,
    online,
    currentUser,
    records,
    queue,
    syncing,
    lastSync,
    login,
    addOrUpdateRecord,
    syncNow,
  } = useOfflineData();
  const [username, setUsername] = useState("agent");
  const [pin, setPin] = useState("1234");
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("Household visit");
  const [location, setLocation] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");

  const stats = useMemo(
    () => ({
      total: records.length,
      pending: queue.length,
      failed: queue.filter((item) => item.lastError).length,
    }),
    [queue, records.length],
  );

  async function handleLogin() {
    setError("");
    try {
      await login(username, pin);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed.");
    }
  }

  async function handleSave() {
    if (!title.trim()) {
      Alert.alert("Title required", "Add a short title before saving.");
      return;
    }
    await addOrUpdateRecord({ title, category, location, notes });
    setTitle("");
    setCategory("Household visit");
    setLocation("");
    setNotes("");
  }

  if (!initialized) {
    return (
      <Screen title="FieldSync" subtitle="Preparing secure local storage">
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
        </View>
      </Screen>
    );
  }

  if (!currentUser) {
    return (
      <Screen
        title="FieldSync"
        subtitle="Offline-first data collection for teams working beyond reliable coverage."
      >
        <ScrollView
          contentContainerStyle={[
            styles.content,
            Platform.OS === "web" ? styles.webBottom : null,
          ]}
          keyboardShouldPersistTaps="handled"
        >
          <View
            style={[
              styles.loginCard,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
                borderRadius: colors.radius + 10,
              },
            ]}
          >
            <View style={[styles.iconDisc, { backgroundColor: colors.infoSoft }]}>
              <Feather name="shield" size={26} color={colors.primary} />
            </View>
            <Text style={[styles.cardTitle, { color: colors.foreground }]}>
              Offline login
            </Text>
            <Text style={[styles.helpText, { color: colors.mutedForeground }]}>
              Try agent / 1234 or admin / 0000. Credentials are checked locally,
              so access still works without internet.
            </Text>
            <FieldInput
              label="Username"
              autoCapitalize="none"
              value={username}
              onChangeText={setUsername}
            />
            <FieldInput
              label="PIN"
              keyboardType="number-pad"
              secureTextEntry
              value={pin}
              onChangeText={setPin}
            />
            {error ? (
              <Text style={[styles.errorText, { color: colors.destructive }]}>
                {error}
              </Text>
            ) : null}
            <PrimaryButton label="Enter app" icon="log-in" onPress={handleLogin} />
          </View>
        </ScrollView>
      </Screen>
    );
  }

  return (
    <Screen
      title="Capture"
      subtitle="Every save writes to SQLite first, then joins the sync queue."
    >
      <ScrollView
        contentContainerStyle={[
          styles.content,
          Platform.OS === "web" ? styles.webBottom : null,
        ]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.statusRow}>
          <StatusPill
            label={online ? "Online" : "Offline"}
            tone={online ? "good" : "warning"}
            icon={online ? "wifi" : "wifi-off"}
          />
          <StatusPill
            label={`${stats.pending} queued`}
            tone={stats.pending ? "warning" : "good"}
            icon="database"
          />
          {stats.failed ? (
            <StatusPill label={`${stats.failed} failed`} tone="danger" icon="alert-triangle" />
          ) : null}
        </View>

        <View style={styles.statsRow}>
          <Stat label="Local records" value={stats.total.toString()} />
          <Stat label="Pending sync" value={stats.pending.toString()} />
        </View>

        <View
          style={[
            styles.formCard,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
              borderRadius: colors.radius + 10,
            },
          ]}
        >
          <Text style={[styles.cardTitle, { color: colors.foreground }]}>
            New field record
          </Text>
          <FieldInput
            label="Title"
            value={title}
            onChangeText={setTitle}
            placeholder="Clinic visit, supply check, enrollment"
          />
          <FieldInput
            label="Category"
            value={category}
            onChangeText={setCategory}
            placeholder="Category"
          />
          <FieldInput
            label="Location"
            value={location}
            onChangeText={setLocation}
            placeholder="Village, block, GPS note"
          />
          <FieldInput
            label="Notes"
            value={notes}
            onChangeText={setNotes}
            multiline
            placeholder="Capture the key facts while offline"
          />
          <View style={styles.buttonRow}>
            <PrimaryButton label="Save offline" icon="save" onPress={handleSave} />
            <PrimaryButton
              label="Sync now"
              icon="refresh-cw"
              variant="secondary"
              onPress={syncNow}
              loading={syncing}
            />
          </View>
          {lastSync ? (
            <Text style={[styles.helpText, { color: colors.mutedForeground }]}>
              {lastSync.message}
            </Text>
          ) : null}
        </View>

        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
            Recent local records
          </Text>
        </View>
        {records.slice(0, 3).map((record) => (
          <RecordCard key={record.id} record={record} />
        ))}
        {records.length === 0 ? <EmptyRecords /> : null}
      </ScrollView>
    </Screen>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  const colors = useColors();
  return (
    <View
      style={[
        styles.stat,
        {
          backgroundColor: colors.primary,
          borderRadius: colors.radius + 6,
        },
      ]}
    >
      <Text style={[styles.statValue, { color: colors.primaryForeground }]}>
        {value}
      </Text>
      <Text style={[styles.statLabel, { color: colors.primaryForeground }]}>
        {label}
      </Text>
    </View>
  );
}

function EmptyRecords() {
  const colors = useColors();
  return (
    <View
      style={[
        styles.empty,
        {
          borderColor: colors.border,
          borderRadius: colors.radius + 8,
        },
      ]}
    >
      <Feather name="inbox" size={24} color={colors.mutedForeground} />
      <Text style={[styles.helpText, { color: colors.mutedForeground }]}>
        No local records yet. Save one above to test offline capture.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
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
  statsRow: {
    flexDirection: "row",
    gap: 12,
  },
  stat: {
    flex: 1,
    padding: 16,
  },
  statValue: {
    fontFamily: "Inter_700Bold",
    fontSize: 28,
  },
  statLabel: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 12,
    opacity: 0.82,
  },
  formCard: {
    borderWidth: 1,
    gap: 14,
    padding: 16,
  },
  loginCard: {
    borderWidth: 1,
    gap: 14,
    padding: 18,
  },
  iconDisc: {
    alignItems: "center",
    borderRadius: 999,
    height: 56,
    justifyContent: "center",
    width: 56,
  },
  cardTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 20,
  },
  helpText: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    lineHeight: 20,
  },
  errorText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
  },
  buttonRow: {
    gap: 10,
  },
  sectionHeader: {
    marginTop: 4,
  },
  sectionTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 18,
  },
  empty: {
    alignItems: "center",
    borderStyle: "dashed",
    borderWidth: 1,
    gap: 10,
    padding: 24,
  },
});

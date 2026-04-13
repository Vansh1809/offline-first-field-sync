import { Feather } from "@expo/vector-icons";
import React from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
} from "react-native";

import { useColors } from "@/hooks/useColors";
import { type FieldRecord, type SyncStatus } from "@/lib/offlineStore";

export function Screen({
  children,
  title,
  subtitle,
}: {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
}) {
  const colors = useColors();
  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <View
        style={[
          styles.header,
          Platform.OS === "web" ? { paddingTop: 67 } : null,
        ]}
      >
        <Text style={[styles.title, { color: colors.foreground }]}>{title}</Text>
        {subtitle ? (
          <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {children}
    </View>
  );
}

export function StatusPill({
  label,
  tone,
  icon,
}: {
  label: string;
  tone: "good" | "warning" | "danger" | "neutral";
  icon?: keyof typeof Feather.glyphMap;
}) {
  const colors = useColors();
  const background =
    tone === "good"
      ? colors.infoSoft
      : tone === "danger"
        ? colors.dangerSoft
        : tone === "warning"
          ? "#f7e6bf"
          : colors.secondary;
  const foreground =
    tone === "good"
      ? colors.success
      : tone === "danger"
        ? colors.destructive
        : tone === "warning"
          ? colors.warning
          : colors.secondaryForeground;
  return (
    <View style={[styles.pill, { backgroundColor: background }]}>
      {icon ? <Feather name={icon} size={13} color={foreground} /> : null}
      <Text style={[styles.pillText, { color: foreground }]}>{label}</Text>
    </View>
  );
}

export function PrimaryButton({
  label,
  icon,
  onPress,
  disabled,
  loading,
  variant = "primary",
}: {
  label: string;
  icon?: keyof typeof Feather.glyphMap;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  variant?: "primary" | "secondary" | "danger";
}) {
  const colors = useColors();
  const background =
    variant === "danger"
      ? colors.destructive
      : variant === "secondary"
        ? colors.secondary
        : colors.primary;
  const foreground =
    variant === "secondary" ? colors.secondaryForeground : colors.primaryForeground;
  return (
    <Pressable
      testID={`button-${label.toLowerCase().replaceAll(" ", "-")}`}
      disabled={disabled || loading}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor: background,
          borderRadius: colors.radius,
          opacity: disabled ? 0.55 : pressed ? 0.78 : 1,
          transform: [{ scale: pressed ? 0.98 : 1 }],
        },
      ]}
    >
      {loading ? (
        <ActivityIndicator color={foreground} />
      ) : icon ? (
        <Feather name={icon} size={18} color={foreground} />
      ) : null}
      <Text style={[styles.buttonText, { color: foreground }]}>{label}</Text>
    </Pressable>
  );
}

export function FieldInput(props: TextInputProps & { label: string }) {
  const colors = useColors();
  return (
    <View style={styles.inputGroup}>
      <Text style={[styles.inputLabel, { color: colors.mutedForeground }]}>
        {props.label}
      </Text>
      <TextInput
        {...props}
        placeholderTextColor={colors.mutedForeground}
        style={[
          styles.input,
          {
            borderColor: colors.input,
            backgroundColor: colors.card,
            color: colors.foreground,
            borderRadius: colors.radius,
          },
          props.multiline ? styles.multiline : null,
          props.style,
        ]}
      />
    </View>
  );
}

function statusTone(status: SyncStatus) {
  if (status === "synced") return "good";
  if (status === "failed" || status === "conflict") return "danger";
  return "warning";
}

export function RecordCard({
  record,
  onEdit,
  onDelete,
}: {
  record: FieldRecord;
  onEdit?: () => void;
  onDelete?: () => void;
}) {
  const colors = useColors();
  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
          borderRadius: colors.radius + 8,
        },
      ]}
    >
      <View style={styles.cardTop}>
        <View style={styles.cardTitleBlock}>
          <Text style={[styles.cardTitle, { color: colors.cardForeground }]}>
            {record.title}
          </Text>
          <Text style={[styles.cardMeta, { color: colors.mutedForeground }]}>
            {record.category} · {record.location}
          </Text>
        </View>
        <StatusPill
          label={record.syncStatus}
          tone={statusTone(record.syncStatus)}
          icon={record.syncStatus === "synced" ? "check-circle" : "clock"}
        />
      </View>
      <Text style={[styles.cardNotes, { color: colors.foreground }]}>
        {record.notes || "No notes captured."}
      </Text>
      <Text style={[styles.cardMeta, { color: colors.mutedForeground }]}>
        Updated {new Date(record.updatedAt).toLocaleString()} by {record.owner}
      </Text>
      {onEdit || onDelete ? (
        <View style={styles.cardActions}>
          {onEdit ? (
            <PrimaryButton
              label="Edit"
              icon="edit-3"
              variant="secondary"
              onPress={onEdit}
            />
          ) : null}
          {onDelete ? (
            <PrimaryButton
              label="Delete"
              icon="trash-2"
              variant="danger"
              onPress={onDelete}
            />
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 12,
  },
  title: {
    fontFamily: "Inter_700Bold",
    fontSize: 30,
    letterSpacing: -0.6,
  },
  subtitle: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    lineHeight: 20,
    marginTop: 5,
  },
  pill: {
    alignItems: "center",
    borderRadius: 999,
    flexDirection: "row",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  pillText: {
    fontFamily: "Inter_700Bold",
    fontSize: 12,
    textTransform: "capitalize",
  },
  button: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
    justifyContent: "center",
    minHeight: 48,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  buttonText: {
    fontFamily: "Inter_700Bold",
    fontSize: 15,
  },
  inputGroup: {
    gap: 7,
  },
  inputLabel: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 12,
    textTransform: "uppercase",
  },
  input: {
    borderWidth: 1,
    fontFamily: "Inter_500Medium",
    fontSize: 16,
    minHeight: 50,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  multiline: {
    minHeight: 96,
    textAlignVertical: "top",
  },
  card: {
    borderWidth: 1,
    gap: 12,
    padding: 16,
  },
  cardTop: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between",
  },
  cardTitleBlock: {
    flex: 1,
    gap: 4,
  },
  cardTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 18,
  },
  cardMeta: {
    fontFamily: "Inter_500Medium",
    fontSize: 12,
  },
  cardNotes: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    lineHeight: 20,
  },
  cardActions: {
    flexDirection: "row",
    gap: 10,
  },
});
import { Feather } from "@expo/vector-icons";
import React, { useMemo, useState } from "react";
import {
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
} from "@/components/AppChrome";
import { useOfflineData } from "@/contexts/OfflineDataContext";
import { useColors } from "@/hooks/useColors";
import { type FieldRecord } from "@/lib/offlineStore";

export default function RecordsScreen() {
  const colors = useColors();
  const { records, currentUser, addOrUpdateRecord, removeRecord } = useOfflineData();
  const [selected, setSelected] = useState<FieldRecord | null>(null);
  const [query, setQuery] = useState("");
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const [location, setLocation] = useState("");
  const [notes, setNotes] = useState("");

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return records;
    return records.filter((record) =>
      `${record.title} ${record.category} ${record.location} ${record.notes}`
        .toLowerCase()
        .includes(needle),
    );
  }, [query, records]);

  function startEdit(record: FieldRecord) {
    setSelected(record);
    setTitle(record.title);
    setCategory(record.category);
    setLocation(record.location);
    setNotes(record.notes);
  }

  async function saveEdit() {
    if (!selected) return;
    if (!title.trim()) {
      Alert.alert("Title required", "A record title is required.");
      return;
    }
    await addOrUpdateRecord({
      id: selected.id,
      title,
      category,
      location,
      notes,
    });
    setSelected(null);
  }

  function confirmDelete(record: FieldRecord) {
    Alert.alert("Delete local record", "This deletion will sync when online.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => void removeRecord(record),
      },
    ]);
  }

  return (
    <Screen
      title="Records"
      subtitle="View and edit saved data without any network dependency."
    >
      <ScrollView
        contentContainerStyle={[
          styles.content,
          Platform.OS === "web" ? styles.webBottom : null,
        ]}
        keyboardShouldPersistTaps="handled"
      >
        {!currentUser ? (
          <View style={styles.empty}>
            <Feather name="lock" size={26} color={colors.mutedForeground} />
            <Text style={[styles.help, { color: colors.mutedForeground }]}>
              Log in on the Capture tab to view local records.
            </Text>
          </View>
        ) : (
          <>
            <FieldInput
              label="Search local SQLite"
              value={query}
              onChangeText={setQuery}
              placeholder="Search title, category, location, notes"
            />
            {selected ? (
              <View
                style={[
                  styles.editor,
                  {
                    backgroundColor: colors.card,
                    borderColor: colors.border,
                    borderRadius: colors.radius + 10,
                  },
                ]}
              >
                <Text style={[styles.editorTitle, { color: colors.foreground }]}>
                  Edit record
                </Text>
                <FieldInput label="Title" value={title} onChangeText={setTitle} />
                <FieldInput
                  label="Category"
                  value={category}
                  onChangeText={setCategory}
                />
                <FieldInput
                  label="Location"
                  value={location}
                  onChangeText={setLocation}
                />
                <FieldInput
                  label="Notes"
                  value={notes}
                  onChangeText={setNotes}
                  multiline
                />
                <View style={styles.row}>
                  <PrimaryButton label="Save edit" icon="check" onPress={saveEdit} />
                  <PrimaryButton
                    label="Cancel"
                    icon="x"
                    variant="secondary"
                    onPress={() => setSelected(null)}
                  />
                </View>
              </View>
            ) : null}
            {filtered.map((record) => (
              <RecordCard
                key={record.id}
                record={record}
                onEdit={() => startEdit(record)}
                onDelete={() => confirmDelete(record)}
              />
            ))}
            {filtered.length === 0 ? (
              <View style={styles.empty}>
                <Feather name="search" size={26} color={colors.mutedForeground} />
                <Text style={[styles.help, { color: colors.mutedForeground }]}>
                  No matching records are stored locally.
                </Text>
              </View>
            ) : null}
          </>
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: 14,
    padding: 20,
    paddingBottom: 120,
  },
  webBottom: {
    paddingBottom: 140,
  },
  editor: {
    borderWidth: 1,
    gap: 12,
    padding: 16,
  },
  editorTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 18,
  },
  row: {
    gap: 10,
  },
  empty: {
    alignItems: "center",
    gap: 10,
    padding: 24,
  },
  help: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
  },
});
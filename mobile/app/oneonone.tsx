import { useState } from "react";
import {
  View, Text, StyleSheet, TextInput, Pressable, ScrollView, Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const TODAY = [
  { id: "s1", member: "藤本 渉",   time: "14:00", topic: "OKR 来期準備" },
  { id: "s2", member: "高橋 真由", time: "16:30", topic: "戦略人事レビュー" },
];

export default function OneonOneScreen() {
  const [notes, setNotes] = useState("");
  const [activeId, setActiveId] = useState<string | null>(TODAY[0]?.id ?? null);

  const submit = () => {
    if (!notes.trim()) return;
    Alert.alert("保存しました", "Web 版の AI 議事録 → アクション抽出に転送しました（demo）");
    setNotes("");
  };

  return (
    <SafeAreaView style={styles.container} edges={["bottom"]}>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
        <Text style={styles.heading}>📅 今日の 1on1</Text>
        {TODAY.map((s) => (
          <Pressable
            key={s.id}
            onPress={() => setActiveId(s.id)}
            style={[styles.session, activeId === s.id && styles.sessionActive]}
          >
            <Text style={styles.sessionTime}>{s.time}</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.sessionMember}>{s.member}</Text>
              <Text style={styles.sessionTopic}>{s.topic}</Text>
            </View>
          </Pressable>
        ))}

        <Text style={[styles.heading, { marginTop: 16 }]}>📝 メモ</Text>
        <TextInput
          value={notes}
          onChangeText={setNotes}
          placeholder="会話の要点をメモしてください…&#10;&#10;音声入力は Web 版で利用可能（/action-extractor）"
          multiline
          style={styles.input}
        />

        <Pressable
          onPress={submit}
          disabled={!notes.trim()}
          style={[styles.submit, !notes.trim() && styles.submitDisabled]}
        >
          <Text style={styles.submitText}>保存して AI でアクション抽出</Text>
        </Pressable>

        <Text style={styles.help}>
          💡 ヒント：保存すると Web 版の <Text style={styles.code}>/action-extractor</Text> に転送され、
          「誰が何をいつまでに」が自動構造化されます。
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f7faf7" },
  heading:   { fontSize: 14, fontWeight: "700", color: "#475569", letterSpacing: 0.3, textTransform: "uppercase" },
  session: {
    flexDirection: "row", alignItems: "center", gap: 12,
    padding: 14, borderRadius: 10, backgroundColor: "#ffffff",
    borderWidth: 1, borderColor: "#e2e8f0",
  },
  sessionActive: { borderColor: "#16a34a", backgroundColor: "#f0fdf4" },
  sessionTime:   { fontSize: 16, fontWeight: "700", color: "#0f172a", fontVariant: ["tabular-nums"] },
  sessionMember: { fontSize: 15, fontWeight: "600", color: "#0f172a" },
  sessionTopic:  { fontSize: 12, color: "#64748b" },
  input: {
    minHeight: 200, padding: 12, borderRadius: 10, backgroundColor: "#ffffff",
    borderWidth: 1, borderColor: "#cbd5e1", fontSize: 14, lineHeight: 22, textAlignVertical: "top",
  },
  submit: {
    paddingVertical: 14, borderRadius: 10, backgroundColor: "#16a34a", alignItems: "center",
  },
  submitDisabled: { backgroundColor: "#cbd5e1" },
  submitText: { color: "#ffffff", fontSize: 15, fontWeight: "700" },
  help: { fontSize: 11, color: "#64748b", lineHeight: 18, marginTop: 8 },
  code: { fontFamily: "Courier", color: "#15803d" },
});

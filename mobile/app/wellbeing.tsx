import { useState } from "react";
import { View, Text, StyleSheet, Pressable, ScrollView, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function WellbeingScreen() {
  const [sleep, setSleep] = useState(7);
  const [stress, setStress] = useState(3);
  const [exercise, setExercise] = useState(0);
  const [mood, setMood] = useState(3);

  const submit = () => {
    Alert.alert(
      "保存しました 🌱",
      `今日の記録：睡眠 ${sleep}h / ストレス ${stress} / 運動 ${exercise}分 / ムード ${mood}`,
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={["bottom"]}>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }}>
        <Text style={styles.title}>今日のウェルビーイング記録</Text>
        <Text style={styles.subtitle}>{new Date().toLocaleDateString("ja-JP", { year: "numeric", month: "long", day: "numeric", weekday: "long" })}</Text>

        {/* 睡眠 */}
        <Section emoji="😴" title="睡眠時間" value={`${sleep} 時間`}>
          <View style={styles.row}>
            {[5, 6, 7, 8, 9].map((v) => (
              <Pressable key={v} onPress={() => setSleep(v)}
                style={[styles.btn, sleep === v && styles.btnActive]}>
                <Text style={[styles.btnText, sleep === v && styles.btnTextActive]}>{v}h</Text>
              </Pressable>
            ))}
          </View>
        </Section>

        {/* ストレス */}
        <Section emoji="⚡" title="ストレスレベル" value={`${stress} / 5`}>
          <View style={styles.row}>
            {[1, 2, 3, 4, 5].map((v) => (
              <Pressable key={v} onPress={() => setStress(v)}
                style={[styles.btn, stress === v && styles.btnActive,
                        v >= 4 && stress === v && { backgroundColor: "#fef3c7", borderColor: "#d97706" }]}>
                <Text style={[styles.btnText, stress === v && styles.btnTextActive]}>{v}</Text>
              </Pressable>
            ))}
          </View>
          <View style={styles.scaleLabels}>
            <Text style={styles.scaleLabel}>低い</Text>
            <Text style={styles.scaleLabel}>高い</Text>
          </View>
        </Section>

        {/* 運動 */}
        <Section emoji="🏃" title="運動時間（今日）" value={`${exercise} 分`}>
          <View style={styles.row}>
            {[0, 15, 30, 45, 60].map((v) => (
              <Pressable key={v} onPress={() => setExercise(v)}
                style={[styles.btn, exercise === v && styles.btnActive]}>
                <Text style={[styles.btnText, exercise === v && styles.btnTextActive]}>
                  {v}分
                </Text>
              </Pressable>
            ))}
          </View>
        </Section>

        {/* ムード */}
        <Section emoji="🙂" title="今日のムード" value={`${mood} / 5`}>
          <View style={styles.row}>
            {[
              { v: 1, e: "😩" }, { v: 2, e: "😟" }, { v: 3, e: "😐" }, { v: 4, e: "🙂" }, { v: 5, e: "😄" },
            ].map((m) => (
              <Pressable key={m.v} onPress={() => setMood(m.v)}
                style={[styles.btn, mood === m.v && styles.btnActive]}>
                <Text style={{ fontSize: 24 }}>{m.e}</Text>
              </Pressable>
            ))}
          </View>
        </Section>

        <Pressable onPress={submit} style={styles.submit}>
          <Text style={styles.submitText}>保存</Text>
        </Pressable>

        <Text style={styles.help}>
          🔒 個人データは本人のみ閲覧可能。集約値（N≥5）のみ HR が確認できます。
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function Section({ emoji, title, value, children }: {
  emoji: string; title: string; value: string; children: React.ReactNode;
}) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={{ fontSize: 22 }}>{emoji}</Text>
        <Text style={styles.sectionTitle}>{title}</Text>
        <Text style={styles.sectionValue}>{value}</Text>
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f7faf7" },
  title:     { fontSize: 22, fontWeight: "800", color: "#0f172a", letterSpacing: -0.3 },
  subtitle:  { fontSize: 13, color: "#64748b", marginTop: -8 },
  section: {
    padding: 16, backgroundColor: "#ffffff", borderRadius: 12,
    borderWidth: 1, borderColor: "#e2e8f0", gap: 12,
  },
  sectionHeader: { flexDirection: "row", alignItems: "center", gap: 10 },
  sectionTitle:  { flex: 1, fontSize: 15, fontWeight: "700", color: "#0f172a" },
  sectionValue:  { fontSize: 15, fontWeight: "700", color: "#16a34a", fontVariant: ["tabular-nums"] },
  row:           { flexDirection: "row", gap: 8 },
  btn: {
    flex: 1, aspectRatio: 1.4, borderRadius: 8, borderWidth: 2,
    borderColor: "#e2e8f0", alignItems: "center", justifyContent: "center",
    backgroundColor: "#ffffff",
  },
  btnActive: { borderColor: "#16a34a", backgroundColor: "#f0fdf4" },
  btnText:   { fontSize: 14, fontWeight: "700", color: "#475569", fontVariant: ["tabular-nums"] },
  btnTextActive: { color: "#15803d" },
  scaleLabels: { flexDirection: "row", justifyContent: "space-between", paddingHorizontal: 4 },
  scaleLabel: { fontSize: 11, color: "#94a3b8" },
  submit: { paddingVertical: 16, borderRadius: 12, backgroundColor: "#16a34a", alignItems: "center" },
  submitText: { color: "#ffffff", fontSize: 16, fontWeight: "700" },
  help: { textAlign: "center", color: "#64748b", fontSize: 11, lineHeight: 18 },
});

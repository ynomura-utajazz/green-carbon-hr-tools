import { useState } from "react";
import { View, Text, StyleSheet, Pressable, ScrollView, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const QUESTIONS = [
  { id: "q1", text: "今月の業務は意義を感じられましたか？" },
  { id: "q2", text: "マネージャーから十分なサポートを受けていますか？" },
  { id: "q3", text: "成長機会は十分にありますか？" },
  { id: "q4", text: "ワークライフバランスは保てていますか？" },
  { id: "q5", text: "Green Carbon を友人に勧めますか？（eNPS）" },
];

export default function SurveyScreen() {
  const [answers, setAnswers] = useState<Record<string, number>>({});

  const submit = () => {
    if (Object.keys(answers).length < QUESTIONS.length) {
      Alert.alert("未回答あり", "すべての質問にお答えください");
      return;
    }
    Alert.alert("送信しました", "ご回答ありがとうございました 🙏");
    setAnswers({});
  };

  const completed = Object.keys(answers).length;
  const total = QUESTIONS.length;

  return (
    <SafeAreaView style={styles.container} edges={["bottom"]}>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }}>
        <View style={styles.header}>
          <Text style={styles.title}>2026 年 5 月 パルスサーベイ</Text>
          <Text style={styles.progress}>{completed} / {total} 回答済</Text>
        </View>

        {QUESTIONS.map((q, i) => (
          <View key={q.id} style={styles.question}>
            <Text style={styles.qNum}>Q{i + 1}.</Text>
            <Text style={styles.qText}>{q.text}</Text>
            <View style={styles.scale}>
              {[1, 2, 3, 4, 5].map((v) => (
                <Pressable
                  key={v}
                  onPress={() => setAnswers({ ...answers, [q.id]: v })}
                  style={[
                    styles.scaleBtn,
                    answers[q.id] === v && styles.scaleBtnSelected,
                    v <= 2 && answers[q.id] === v && styles.scaleBtnLow,
                    v === 3 && answers[q.id] === v && styles.scaleBtnMid,
                    v >= 4 && answers[q.id] === v && styles.scaleBtnHigh,
                  ]}
                >
                  <Text style={[
                    styles.scaleNum,
                    answers[q.id] === v && styles.scaleNumSelected,
                  ]}>{v}</Text>
                </Pressable>
              ))}
            </View>
            <View style={styles.scaleLabels}>
              <Text style={styles.scaleLabel}>そう思わない</Text>
              <Text style={styles.scaleLabel}>とてもそう思う</Text>
            </View>
          </View>
        ))}

        <Pressable
          onPress={submit}
          style={[styles.submit, completed < total && styles.submitDisabled]}
        >
          <Text style={styles.submitText}>送信</Text>
        </Pressable>

        <Text style={styles.help}>🔒 回答は匿名です。個人特定はされません。</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f7faf7" },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  title: { fontSize: 18, fontWeight: "700", color: "#0f172a", flex: 1 },
  progress: { fontSize: 12, color: "#16a34a", fontWeight: "700" },
  question: {
    padding: 16, backgroundColor: "#ffffff", borderRadius: 12,
    borderWidth: 1, borderColor: "#e2e8f0", gap: 8,
  },
  qNum: { fontSize: 11, fontWeight: "700", color: "#16a34a", letterSpacing: 0.5 },
  qText: { fontSize: 15, color: "#0f172a", lineHeight: 22 },
  scale: { flexDirection: "row", gap: 8, justifyContent: "space-between", marginTop: 8 },
  scaleBtn: {
    flex: 1, aspectRatio: 1, borderRadius: 8, borderWidth: 2, borderColor: "#e2e8f0",
    alignItems: "center", justifyContent: "center", backgroundColor: "#ffffff",
  },
  scaleBtnSelected: { borderWidth: 3 },
  scaleBtnLow:  { backgroundColor: "#fee2e2", borderColor: "#dc2626" },
  scaleBtnMid:  { backgroundColor: "#fef3c7", borderColor: "#d97706" },
  scaleBtnHigh: { backgroundColor: "#d1fae5", borderColor: "#059669" },
  scaleNum:     { fontSize: 18, fontWeight: "700", color: "#475569", fontVariant: ["tabular-nums"] },
  scaleNumSelected: { color: "#0f172a" },
  scaleLabels: { flexDirection: "row", justifyContent: "space-between", paddingHorizontal: 4 },
  scaleLabel: { fontSize: 10, color: "#94a3b8" },
  submit: { paddingVertical: 16, borderRadius: 12, backgroundColor: "#16a34a", alignItems: "center" },
  submitDisabled: { backgroundColor: "#cbd5e1" },
  submitText: { color: "#ffffff", fontSize: 16, fontWeight: "700" },
  help: { textAlign: "center", color: "#64748b", fontSize: 11 },
});

import { Link } from "expo-router";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const ITEMS = [
  { href: "/oneonone",  emoji: "💬", title: "1on1",        description: "今日の予定 + メモ作成" },
  { href: "/survey",    emoji: "📝", title: "サーベイ",     description: "進行中のサーベイに回答" },
  { href: "/wellbeing", emoji: "🌱", title: "ウェルビーイング", description: "今日の睡眠・気分を記録" },
] as const;

export default function HomeScreen() {
  return (
    <SafeAreaView style={styles.container} edges={["bottom"]}>
      <View style={styles.hero}>
        <Text style={styles.heroTitle}>Green Carbon HR</Text>
        <Text style={styles.heroSubtitle}>気候変動を、コードと組織で。</Text>
      </View>

      <View style={styles.list}>
        {ITEMS.map((item) => (
          <Link key={item.href} href={item.href as never} asChild>
            <Pressable style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}>
              <Text style={styles.cardEmoji}>{item.emoji}</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle}>{item.title}</Text>
                <Text style={styles.cardDesc}>{item.description}</Text>
              </View>
              <Text style={styles.cardArrow}>›</Text>
            </Pressable>
          </Link>
        ))}
      </View>

      <Text style={styles.footer}>v0.1.0 · モバイル版（Expo）</Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f7faf7" },
  hero:      { padding: 24, paddingTop: 32 },
  heroTitle: { fontSize: 28, fontWeight: "800", color: "#15803d", letterSpacing: -0.5 },
  heroSubtitle: { fontSize: 14, color: "#475569", marginTop: 4 },
  list:      { padding: 16, gap: 10 },
  card:      {
    flexDirection: "row", alignItems: "center", gap: 12,
    padding: 16, borderRadius: 12, backgroundColor: "#ffffff",
    borderWidth: 1, borderColor: "#e2e8f0",
  },
  cardPressed: { backgroundColor: "#f0fdf4", borderColor: "#16a34a" },
  cardEmoji: { fontSize: 30 },
  cardTitle: { fontSize: 17, fontWeight: "700", color: "#0f172a" },
  cardDesc:  { fontSize: 12, color: "#64748b", marginTop: 2 },
  cardArrow: { fontSize: 24, color: "#94a3b8" },
  footer:    { textAlign: "center", color: "#94a3b8", fontSize: 11, marginTop: "auto", marginBottom: 8 },
});

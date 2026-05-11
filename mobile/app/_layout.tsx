import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <StatusBar style="auto" />
      <Stack screenOptions={{
        headerStyle: { backgroundColor: "#16a34a" },
        headerTintColor: "#ffffff",
        headerTitleStyle: { fontWeight: "700" },
      }}>
        <Stack.Screen name="index" options={{ title: "Green Carbon HR" }} />
        <Stack.Screen name="oneonone" options={{ title: "1on1" }} />
        <Stack.Screen name="survey" options={{ title: "サーベイ" }} />
        <Stack.Screen name="wellbeing" options={{ title: "ウェルビーイング" }} />
      </Stack>
    </SafeAreaProvider>
  );
}

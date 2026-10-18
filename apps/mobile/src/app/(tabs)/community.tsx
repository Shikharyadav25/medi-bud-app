import React from "react";
import { SafeAreaView, View, Text } from "react-native";
import { COLORS } from "../../constants/theme";

export default function CommunityScreen() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.backgroundLight }}>
      <View style={{ padding: 24, gap: 16 }}>
        <Text
          style={{ fontSize: 26, fontWeight: "700", color: COLORS.textPrimary }}
        >
          Wellness community
        </Text>
        <Text
          style={{ fontSize: 16, lineHeight: 25, color: COLORS.textSecondary }}
        >
          Community sharing is not available yet. Your health information has
          not been posted or shared.
        </Text>
      </View>
    </SafeAreaView>
  );
}

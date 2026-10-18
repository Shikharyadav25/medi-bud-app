import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Alert,
} from "react-native";
import { apiClient } from "../../services/api/client";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { COLORS, RADIUS, TYPOGRAPHY } from "../../constants/theme";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { DisclaimerBadge } from "../../components/ai/DisclaimerBadge";
import { useHealthStore } from "../../store/useHealthStore";
import { useChatStore } from "../../store/useChatStore";

export default function ReportDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { reports } = useHealthStore();
  const { addMessage } = useChatStore();
  const [saving, setSaving] = useState(false);

  const report = reports.find((r) => r.id === id);
  if (!report)
    return (
      <SafeAreaView style={styles.safeArea}>
        <Text>Report not found in this account.</Text>
        <Button title="Go back" onPress={() => router.back()} />
      </SafeAreaView>
    );

  const handleAskAI = async () => {
    if (useChatStore.getState().isLoading) return;
    const query =
      "Show confirmed values for " +
      report.testResults.map((test) => test.testName).join(", ");
    addMessage({
      id: `usr-${Date.now()}`,
      sender: "user",
      text: query,
      timestamp: "Just now",
    });
    router.push("/(tabs)/ai");
    useChatStore.getState().setLoading(true);
    try {
      const response = await apiClient<{
        response: string;
        citations: string[];
        disclaimer: string;
        action?: import("../../types/ai").ChatMessage["action"];
      }>("/api/ai/chat", {
        method: "POST",
        body: JSON.stringify({ query, report_id: report.id }),
      });
      addMessage({
        id: "ai-" + Date.now(),
        sender: "ai",
        text: response.response,
        citations: response.citations,
        disclaimer: response.disclaimer,
        action: response.action,
        timestamp: new Date().toISOString(),
      });
    } catch {
      addMessage({
        id: "ai-" + Date.now(),
        sender: "ai",
        text: "The service is unavailable. No report interpretation was generated. Please try again.",
        timestamp: new Date().toISOString(),
      });
    } finally {
      useChatStore.getState().setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => router.back()}
            style={styles.backBtn}
          >
            <Feather name="arrow-left" size={20} color={COLORS.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Laboratory Report</Text>
        </View>

        {/* Title & Date */}
        <Card style={styles.metaCard}>
          <View style={styles.badgeRow}>
            <View style={styles.typeBadge}>
              <Text style={styles.typeBadgeText}>{report.reportType}</Text>
            </View>
            <Text style={styles.dateText}>{report.date}</Text>
          </View>
          <Text style={styles.reportTitle}>{report.title}</Text>
          {report.doctorOrLabName && (
            <Text style={styles.labName}>{report.doctorOrLabName}</Text>
          )}
        </Card>

        <DisclaimerBadge />
        <Button
          title={
            saving
              ? "Saving review…"
              : "I checked these values against the original"
          }
          disabled={saving || !report.testResults.length}
          onPress={async () => {
            setSaving(true);
            try {
              await apiClient("/v1/reports/" + report.id + "/observations", {
                method: "PATCH",
                body: JSON.stringify({
                  observations: report.testResults
                    .filter((t) => t.observationId)
                    .map((t) => ({ id: t.observationId, status: "confirmed" })),
                }),
              });
              const reports =
                await apiClient<import("../../types/report").MedicalReport[]>(
                  "/api/reports",
                );
              useHealthStore.setState({ reports });
              Alert.alert(
                "Review saved",
                "Confirmed values can now be used as report evidence. This is not clinical verification.",
              );
            } catch {
              Alert.alert(
                "Review not saved",
                "Check the connection and try again.",
              );
            } finally {
              setSaving(false);
            }
          }}
        />

        {/* AI Clinical Explanation */}
        <Card style={styles.explanationCard}>
          <View style={styles.explanationHeader}>
            <MaterialCommunityIcons
              name="creation"
              size={18}
              color={COLORS.secondaryAccent}
            />
            <Text style={styles.explanationTitle}>Extraction notes</Text>
          </View>
          <Text style={styles.explanationText}>{report.aiExplanation}</Text>
        </Card>

        {/* Extracted Test Values Table */}
        <Card style={styles.tableCard}>
          <Text style={styles.sectionTitle}>
            Proposed values — verify against the original
          </Text>
          <View style={styles.tableHeader}>
            <Text style={[styles.th, { flex: 2 }]}>Test Name</Text>
            <Text style={[styles.th, { flex: 1.5 }]}>Value</Text>
            <Text style={[styles.th, { flex: 1.5 }]}>Reference</Text>
            <Text style={[styles.th, { flex: 1, textAlign: "right" }]}>
              Status
            </Text>
          </View>

          {report.testResults.map((test, index) => (
            <View key={index} style={styles.tableRow}>
              <Text style={[styles.tdName, { flex: 2 }]}>{test.testName}</Text>
              <Text style={[styles.tdValue, { flex: 1.5 }]}>
                {test.value} {test.unit}
              </Text>
              <Text style={[styles.tdRef, { flex: 1.5 }]}>
                {test.referenceRange}
              </Text>
              <View style={[styles.statusBadge, { flex: 1 }]}>
                <Text
                  style={[
                    styles.statusText,
                    test.status === "HIGH" && styles.statusHigh,
                    test.status === "LOW" && styles.statusLow,
                    test.status === "NORMAL" && styles.statusNormal,
                  ]}
                >
                  {test.status}
                </Text>
              </View>
            </View>
          ))}
        </Card>

        {/* Questions For Doctor */}
        {report.questionsForDoctor && report.questionsForDoctor.length > 0 && (
          <Card style={styles.questionsCard}>
            <View style={styles.cardHeaderRow}>
              <Feather
                name="help-circle"
                size={16}
                color={COLORS.primaryAccent}
              />
              <Text style={styles.questionsHeaderTitle}>
                Suggested Questions for Your Doctor
              </Text>
            </View>
            {report.questionsForDoctor.map((q, i) => (
              <View key={i} style={styles.questionItem}>
                <Text style={styles.questionBullet}>•</Text>
                <Text style={styles.questionText}>{q}</Text>
              </View>
            ))}
          </Card>
        )}

        {/* Ask AI CTA */}
        <Button
          title="Ask AI About This Report"
          variant="cta"
          icon={
            <MaterialCommunityIcons name="creation" size={18} color="#FFFFFF" />
          }
          onPress={handleAskAI}
          style={styles.askAiBtn}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.backgroundLight,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 40,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 16,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: COLORS.primaryDark,
    fontFamily: TYPOGRAPHY.serifHeading,
  },
  metaCard: {
    padding: 18,
    marginBottom: 12,
  },
  badgeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  typeBadge: {
    backgroundColor: COLORS.backgroundSubtle,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: RADIUS.sm,
  },
  typeBadgeText: {
    fontSize: 11,
    fontWeight: "600",
    color: COLORS.primaryAccent,
  },
  dateText: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  reportTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: COLORS.primaryDark,
    fontFamily: TYPOGRAPHY.serifHeading,
    marginBottom: 4,
  },
  labName: {
    fontSize: 12.5,
    color: COLORS.textSecondary,
  },
  explanationCard: {
    padding: 16,
    marginBottom: 14,
    backgroundColor: "#FFFFFF",
  },
  explanationHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 8,
  },
  explanationTitle: {
    fontSize: 13.5,
    fontWeight: "600",
    color: COLORS.primaryAccent,
  },
  explanationText: {
    fontSize: 13.5,
    lineHeight: 20,
    color: COLORS.textPrimary,
  },
  tableCard: {
    padding: 16,
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: COLORS.textPrimary,
    marginBottom: 12,
  },
  tableHeader: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(43, 58, 85, 0.1)",
    paddingBottom: 8,
    marginBottom: 8,
  },
  th: {
    fontSize: 11,
    fontWeight: "600",
    color: COLORS.textSecondary,
  },
  tableRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 9,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(43, 58, 85, 0.05)",
  },
  tdName: {
    fontSize: 12.5,
    fontWeight: "500",
    color: COLORS.textPrimary,
  },
  tdValue: {
    fontSize: 12.5,
    fontWeight: "600",
    color: COLORS.textPrimary,
  },
  tdRef: {
    fontSize: 11,
    color: COLORS.textMuted,
  },
  statusBadge: {
    alignItems: "flex-end",
  },
  statusText: {
    fontSize: 10,
    fontWeight: "700",
  },
  statusNormal: {
    color: "#2E7D32",
  },
  statusHigh: {
    color: "#E65100",
  },
  statusLow: {
    color: "#C62828",
  },
  questionsCard: {
    padding: 16,
    marginBottom: 20,
  },
  cardHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 10,
  },
  questionsHeaderTitle: {
    fontSize: 13.5,
    fontWeight: "600",
    color: COLORS.primaryAccent,
  },
  questionItem: {
    flexDirection: "row",
    gap: 6,
    marginBottom: 6,
  },
  questionBullet: {
    color: COLORS.secondaryAccent,
    fontSize: 14,
  },
  questionText: {
    flex: 1,
    fontSize: 12.5,
    color: COLORS.textPrimary,
    lineHeight: 18,
  },
  askAiBtn: {
    height: 56,
  },
});

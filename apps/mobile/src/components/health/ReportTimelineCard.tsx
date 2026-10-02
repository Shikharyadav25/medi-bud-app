import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { COLORS, RADIUS, TYPOGRAPHY } from '../../constants/theme';
import { Card } from '../ui/Card';
import { MedicalReport } from '../../types/report';
import { useChatStore } from '../../store/useChatStore';

interface ReportTimelineCardProps {
  report: MedicalReport;
}

export const ReportTimelineCard: React.FC<ReportTimelineCardProps> = ({ report }) => {
  const router = useRouter();
  const { addMessage } = useChatStore();

  const handleAskAI = () => {
    addMessage({
      id: `msg-${Date.now()}`,
      sender: 'user',
      text: `Please explain my report: "${report.title}" dated ${report.date}`,
      timestamp: 'Just now',
    });
    router.push('/(tabs)/ai');
  };

  return (
    <Card style={styles.card}>
      <View style={styles.topRow}>
        <View style={styles.badge}>
          <Feather name="file-text" size={13} color={COLORS.primaryAccent} />
          <Text style={styles.badgeText}>{report.reportType}</Text>
        </View>
        <Text style={styles.dateText}>{report.date}</Text>
      </View>

      <Text style={styles.title}>{report.title}</Text>
      {report.doctorOrLabName && (
        <Text style={styles.labName}>{report.doctorOrLabName}</Text>
      )}

      {/* Extracted Key Values Preview */}
      <View style={styles.valuesGrid}>
        {report.testResults.slice(0, 3).map((test, index) => (
          <View key={index} style={styles.valueChip}>
            <Text style={styles.testName}>{test.testName}:</Text>
            <Text
              style={[
                styles.testValue,
                test.status === 'HIGH' && styles.highStatus,
                test.status === 'LOW' && styles.lowStatus,
              ]}
            >
              {test.value} {test.unit}
            </Text>
          </View>
        ))}
      </View>

      {/* AI Explanation Preview */}
      <View style={styles.explanationBox}>
        <MaterialCommunityIcons name="creation" size={16} color={COLORS.secondaryAccent} />
        <Text style={styles.explanationText} numberOfLines={3}>
          {report.aiExplanation}
        </Text>
      </View>

      <View style={styles.actionsRow}>
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => router.push(`/report/${report.id}` as any)}
          style={styles.viewDetailsButton}
        >
          <Text style={styles.viewDetailsText}>Full Report</Text>
          <Feather name="arrow-right" size={14} color={COLORS.primaryAccent} />
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.8}
          onPress={handleAskAI}
          style={styles.askAiButton}
        >
          <MaterialCommunityIcons name="creation" size={14} color="#FFFFFF" />
          <Text style={styles.askAiText}>Ask AI About This</Text>
        </TouchableOpacity>
      </View>
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    padding: 18,
    marginBottom: 16,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.backgroundSubtle,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: RADIUS.sm,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.primaryAccent,
  },
  dateText: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textPrimary,
    fontFamily: TYPOGRAPHY.serifHeading,
    marginBottom: 2,
  },
  labName: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: 12,
  },
  valuesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  valueChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(43, 58, 85, 0.12)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: RADIUS.md,
  },
  testName: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  testValue: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  highStatus: {
    color: COLORS.statusWarning,
  },
  lowStatus: {
    color: COLORS.statusDanger,
  },
  explanationBox: {
    flexDirection: 'row',
    backgroundColor: '#F7FAFF',
    borderRadius: RADIUS.md,
    padding: 12,
    gap: 8,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: 'rgba(43, 58, 85, 0.08)',
  },
  explanationText: {
    flex: 1,
    fontSize: 12.5,
    color: COLORS.textPrimary,
    lineHeight: 18,
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
  },
  viewDetailsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 8,
  },
  viewDetailsText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.primaryAccent,
  },
  askAiButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.primaryAccent,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: RADIUS.md,
  },
  askAiText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});

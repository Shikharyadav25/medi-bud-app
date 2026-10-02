import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import { COLORS, RADIUS, TYPOGRAPHY } from '../../constants/theme';
import { ChatMessage } from '../../types/ai';

interface AIMessageBubbleProps {
  message: ChatMessage;
}

export const AIMessageBubble: React.FC<AIMessageBubbleProps> = ({ message }) => {
  const isAI = message.sender === 'ai';
  const isEmergency = message.action === 'EMERGENCY';

  return (
    <View style={[styles.container, isAI ? styles.aiContainer : styles.userContainer]}>
      {isAI && (
        <View style={styles.avatarCircle}>
          <MaterialCommunityIcons name="creation" size={16} color={COLORS.secondaryAccent} />
        </View>
      )}

      <View
        style={[
          styles.bubble,
          isAI ? styles.aiBubble : styles.userBubble,
          isEmergency && styles.emergencyBubble,
        ]}
      >
        {isEmergency && (
          <View style={styles.emergencyHeader}>
            <Feather name="alert-triangle" size={16} color="#C62828" />
            <Text style={styles.emergencyHeaderText}>URGENT MEDICAL ADVISORY</Text>
          </View>
        )}

        <Text
          style={[
            styles.messageText,
            isAI ? styles.aiText : styles.userText,
            isEmergency && styles.emergencyText,
          ]}
        >
          {message.text}
        </Text>

        {/* Citations from RAG / Medical Reports */}
        {message.citations && message.citations.length > 0 && (
          <View style={styles.citationsBox}>
            <Text style={styles.citationHeading}>Sources:</Text>
            {message.citations.map((cite, i) => (
              <Text key={i} style={styles.citationItem}>
                • {cite}
              </Text>
            ))}
          </View>
        )}

        {/* Timestamp */}
        <Text style={[styles.timestamp, isAI ? styles.aiTimestamp : styles.userTimestamp]}>
          {message.timestamp}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    marginVertical: 6,
    paddingHorizontal: 12,
  },
  aiContainer: {
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
  },
  userContainer: {
    justifyContent: 'flex-end',
  },
  avatarCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(43, 58, 85, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
    marginBottom: 4,
  },
  bubble: {
    maxWidth: '82%',
    borderRadius: RADIUS.lg,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  aiBubble: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(43, 58, 85, 0.08)',
    borderBottomLeftRadius: 4,
  },
  userBubble: {
    backgroundColor: COLORS.primaryAccent,
    borderBottomRightRadius: 4,
  },
  emergencyBubble: {
    backgroundColor: '#FFEBEE',
    borderColor: '#EF9A9A',
    borderWidth: 1.5,
  },
  emergencyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  emergencyHeaderText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#C62828',
  },
  messageText: {
    fontSize: 14.5,
    lineHeight: 21,
    fontFamily: TYPOGRAPHY.sansBody,
  },
  aiText: {
    color: COLORS.textPrimary,
  },
  userText: {
    color: '#FFFFFF',
  },
  emergencyText: {
    color: '#B71C1C',
    fontWeight: '500',
  },
  citationsBox: {
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(43, 58, 85, 0.08)',
  },
  citationHeading: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.primaryAccent,
    marginBottom: 2,
  },
  citationItem: {
    fontSize: 11,
    color: COLORS.textSecondary,
    fontStyle: 'italic',
  },
  timestamp: {
    fontSize: 10,
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  aiTimestamp: {
    color: COLORS.textMuted,
  },
  userTimestamp: {
    color: 'rgba(255, 255, 255, 0.7)',
  },
});

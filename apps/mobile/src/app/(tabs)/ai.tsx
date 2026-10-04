import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS, RADIUS, TYPOGRAPHY, TRACKING, SHADOWS } from '../../constants/theme';
import { AIMessageBubble } from '../../components/ai/AIMessageBubble';
import { DisclaimerBadge } from '../../components/ai/DisclaimerBadge';
import { useAuthStore } from '../../store/useAuthStore';
import { useHealthStore } from '../../store/useHealthStore';
import { useChatStore } from '../../store/useChatStore';
import { AIService } from '../../services/api/aiService';

export default function AIChatScreen() {
  const { profile } = useAuthStore();
  const { vitals, waterIntakeMl, recentMeals, reports } = useHealthStore();
  const { messages, isLoading, isListening, suggestions, addMessage, setLoading, setListening, clearMessages } =
    useChatStore();

  const [inputQuery, setInputQuery] = useState('');
  const scrollViewRef = useRef<ScrollView>(null);

  const handleSend = async (queryToSend?: string) => {
    const text = (queryToSend || inputQuery).trim();
    if (!text || isLoading) return;

    setInputQuery('');

    const userMsgId = `usr-${Date.now()}`;
    addMessage({
      id: userMsgId,
      sender: 'user',
      text,
      timestamp: 'Just now',
    });

    setLoading(true);
    setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 100);

    try {
      const mealsSummary = recentMeals.map((m) => `${m.mealType}: ${m.name}`).join(', ');
      const response = await AIService.sendHealthChat(
        text,
        profile,
        vitals,
        waterIntakeMl,
        mealsSummary,
        reports
      );

      addMessage({
        id: `ai-${Date.now()}`,
        sender: 'ai',
        text: response.response,
        citations: response.citations,
        action: response.action as any,
        disclaimer: response.disclaimer,
        timestamp: 'Just now',
      });
    } catch {
      addMessage({
        id: `ai-${Date.now()}`,
        sender: 'ai',
        text: 'Your AI health assistant is temporarily unavailable. Please try again.',
        timestamp: 'Just now',
      });
    } finally {
      setLoading(false);
      setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 150);
    }
  };

  const handleToggleVoice = () => {
    if (isListening) {
      setListening(false);
    } else {
      setListening(true);
      setTimeout(() => {
        setListening(false);
        handleSend('How does my recent water intake affect my health?');
      }, 2500);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Apple Translucent Navigation Bar */}
      <View style={styles.topBar}>
        <View style={styles.titleWithIcon}>
          <View style={styles.aiIconBadge}>
            <MaterialCommunityIcons name="creation" size={18} color={COLORS.secondaryAccent} />
          </View>
          <View>
            <Text style={styles.topBarTitle}>Medi Bud AI</Text>
            <Text style={styles.topBarSub}>Unified Health Context & RAG</Text>
          </View>
        </View>

        <Pressable
          onPress={clearMessages}
          style={({ pressed }) => [styles.clearButton, pressed && styles.elementPressed]}
        >
          <Feather name="rotate-ccw" size={16} color={COLORS.textSecondary} />
        </Pressable>
      </View>

      <View style={styles.disclaimerWrapper}>
        <DisclaimerBadge />
      </View>

      {/* Messages Scroll Area */}
      <ScrollView
        ref={scrollViewRef}
        contentContainerStyle={styles.messagesList}
        showsVerticalScrollIndicator={false}
        onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
      >
        {messages.map((msg) => (
          <AIMessageBubble key={msg.id} message={msg} />
        ))}

        {isLoading && (
          <View style={styles.loadingRow}>
            <ActivityIndicator size="small" color={COLORS.primaryAccent} />
            <Text style={styles.loadingText}>Synthesizing clinical facts & context...</Text>
          </View>
        )}
      </ScrollView>

      {/* Suggestion Chips */}
      <View style={styles.suggestionsContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.suggestionsScroll}>
          {suggestions.map((chip, index) => (
            <Pressable
              key={index}
              onPress={() => handleSend(chip)}
              style={({ pressed }) => [styles.suggestionChip, pressed && styles.chipPressed]}
            >
              <Text style={styles.suggestionText}>{chip}</Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      {/* Input Row */}
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.inputArea}>
          <Pressable
            onPress={handleToggleVoice}
            style={({ pressed }) => [
              styles.voiceButton,
              isListening && styles.voiceButtonActive,
              pressed && styles.elementPressed,
            ]}
          >
            <Feather
              name={isListening ? 'mic-off' : 'mic'}
              size={18}
              color={isListening ? COLORS.appleRed : COLORS.primaryAccent}
            />
          </Pressable>

          <TextInput
            style={styles.input}
            placeholder={isListening ? 'Listening...' : 'Ask about meals, reports, vitals...'}
            placeholderTextColor={COLORS.textTertiary}
            value={inputQuery}
            onChangeText={setInputQuery}
            onSubmitEditing={() => handleSend()}
          />

          <Pressable
            onPress={() => handleSend()}
            disabled={!inputQuery.trim() || isLoading}
            style={({ pressed }) => [
              styles.sendButton,
              (!inputQuery.trim() || isLoading) && styles.sendButtonDisabled,
              pressed && styles.elementPressed,
            ]}
          >
            <Feather name="arrow-up" size={17} color="#FFFFFF" />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.systemBackground,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.borderSubtle,
  },
  titleWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  aiIconBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FFF3E0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  topBarTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textPrimary,
    letterSpacing: TRACKING.subheadline,
    fontFamily: TYPOGRAPHY.displayFont,
  },
  topBarSub: {
    fontSize: 11,
    color: COLORS.textSecondary,
    letterSpacing: 0.1,
  },
  clearButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: COLORS.systemFill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disclaimerWrapper: {
    paddingHorizontal: 16,
  },
  messagesList: {
    paddingVertical: 12,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    marginVertical: 10,
  },
  loadingText: {
    fontSize: 12.5,
    color: COLORS.textSecondary,
    fontStyle: 'italic',
  },
  suggestionsContainer: {
    paddingVertical: 8,
    backgroundColor: '#FFFFFF',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: COLORS.borderSubtle,
  },
  suggestionsScroll: {
    paddingHorizontal: 16,
    gap: 8,
  },
  suggestionChip: {
    backgroundColor: COLORS.systemFill,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.borderSubtle,
    paddingHorizontal: 13,
    paddingVertical: 7,
    borderRadius: RADIUS.full,
  },
  chipPressed: {
    transform: [{ scale: 0.96 }],
    backgroundColor: 'rgba(120, 120, 128, 0.2)',
  },
  suggestionText: {
    fontSize: 12.5,
    fontWeight: '500',
    color: COLORS.primaryAccent,
    letterSpacing: 0.1,
  },
  inputArea: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: COLORS.borderSubtle,
    gap: 10,
  },
  voiceButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.systemFill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  voiceButtonActive: {
    backgroundColor: '#FFEBEE',
  },
  input: {
    flex: 1,
    height: 44,
    backgroundColor: '#F2F2F7',
    borderRadius: RADIUS.full,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.borderSubtle,
    paddingHorizontal: 16,
    fontSize: 14.5,
    color: COLORS.textPrimary,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primaryAccent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#C7C7CC',
  },
  elementPressed: {
    transform: [{ scale: 0.94 }],
    opacity: 0.8,
  },
});

import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  Animated,
  PanResponder,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { COLORS, RADIUS, SHADOWS, TYPOGRAPHY, TRACKING, SPRINGS } from '../../constants/theme';
import { useAuthStore } from '../../store/useAuthStore';
import { useChatStore } from '../../store/useChatStore';

const MIN_HEIGHT = 120;
const MAX_HEIGHT = 380;

interface PersistentBottomSheetProps {
  onSendMessage?: (text: string) => void;
}

export const PersistentBottomSheet: React.FC<PersistentBottomSheetProps> = ({ onSendMessage }) => {
  const router = useRouter();
  const { profile } = useAuthStore();
  const { addMessage } = useChatStore();
  const [inputText, setInputText] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);

  const sheetHeight = useRef(new Animated.Value(MIN_HEIGHT)).current;

  const toggleExpand = (expand?: boolean) => {
    const shouldExpand = expand !== undefined ? expand : !isExpanded;
    setIsExpanded(shouldExpand);
    // Apple sheet spring: damping 0.8, response 0.3 for natural settle
    Animated.spring(sheetHeight, {
      toValue: shouldExpand ? MAX_HEIGHT : MIN_HEIGHT,
      damping: 24,
      stiffness: 280,
      mass: 0.9,
      useNativeDriver: false,
    }).start();
  };

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) => Math.abs(gestureState.dy) > 10,
      onPanResponderRelease: (_, gestureState) => {
        // Apple velocity-aware threshold: flick up expands, flick down collapses
        if (gestureState.vy < -0.3 || gestureState.dy < -20) {
          toggleExpand(true);
        } else if (gestureState.vy > 0.3 || gestureState.dy > 20) {
          toggleExpand(false);
        }
      },
    })
  ).current;

  const handleSend = () => {
    if (!inputText.trim()) return;
    const text = inputText.trim();
    setInputText('');
    addMessage({
      id: `msg-${Date.now()}`,
      sender: 'user',
      text,
      timestamp: 'Just now',
    });

    if (onSendMessage) {
      onSendMessage(text);
    }
    router.push('/(tabs)/ai');
  };

  const handleSuggestionPress = (prompt: string) => {
    addMessage({
      id: `msg-${Date.now()}`,
      sender: 'user',
      text: prompt,
      timestamp: 'Just now',
    });
    router.push('/(tabs)/ai');
  };

  return (
    <Animated.View style={[styles.bottomSheet, { height: sheetHeight }]}>
      {/* Tactile Apple Drag Handle */}
      <View {...panResponder.panHandlers} style={styles.dragArea}>
        <View style={styles.dragHandle} />
      </View>

      <View style={styles.contentContainer}>
        {/* Header with Sparkle and Chat Bubble */}
        <View style={styles.headerRow}>
          <Pressable
            style={({ pressed }) => [styles.headerLeft, pressed && styles.elementPressed]}
            onPress={() => toggleExpand()}
          >
            <View style={styles.aiGlowBadge}>
              <MaterialCommunityIcons name="creation" size={18} color={COLORS.secondaryAccent} />
            </View>
            <Text style={styles.aiTag}>Health AI Assistant</Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [styles.chatBubbleButton, pressed && styles.elementPressed]}
            onPress={() => router.push('/(tabs)/ai')}
          >
            <Feather name="message-square" size={17} color={COLORS.primaryAccent} />
          </Pressable>
        </View>

        {/* Greeting with Apple Typography */}
        <Text style={styles.greetingText} numberOfLines={isExpanded ? 2 : 1}>
          Hey, {profile.name || 'Aarav'}! Looking for something that helps you feel your best
        </Text>

        {/* Suggestion Chips */}
        {isExpanded && (
          <View style={styles.chipsContainer}>
            {['Review my health', 'Help me sleep better', 'How to boost my energy'].map((chip) => (
              <Pressable
                key={chip}
                onPress={() => handleSuggestionPress(chip)}
                style={({ pressed }) => [styles.suggestionChip, pressed && styles.chipPressed]}
              >
                <Text style={styles.suggestionChipText}>{chip}</Text>
              </Pressable>
            ))}
          </View>
        )}

        {/* Input Bar */}
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.inputContainer}
        >
          <View style={styles.inputRow}>
            <MaterialCommunityIcons
              name="creation"
              size={18}
              color={COLORS.primaryAccent}
              style={styles.sparkleInputIcon}
            />
            <TextInput
              style={styles.textInput}
              placeholder="Ask your Health AI anything..."
              placeholderTextColor={COLORS.textTertiary}
              value={inputText}
              onChangeText={setInputText}
              onSubmitEditing={handleSend}
              onFocus={() => toggleExpand(true)}
            />
            <Pressable
              onPress={handleSend}
              style={({ pressed }) => [
                styles.sendButton,
                !inputText.trim() && styles.sendButtonDisabled,
                pressed && styles.elementPressed,
              ]}
            >
              <Feather name="arrow-up" size={17} color="#FFFFFF" />
            </Pressable>
          </View>
        </KeyboardAvoidingView>

        {/* Safety Disclaimer */}
        <Text style={styles.disclaimerText}>
          AI can make mistakes, so always double check
        </Text>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  bottomSheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: RADIUS.bottomSheet, // 24px
    borderTopRightRadius: RADIUS.bottomSheet,
    borderTopWidth: StyleSheet.hairlineWidth * 1.5,
    borderTopColor: COLORS.borderSubtle,
    ...SHADOWS.bottomSheet,
    zIndex: 100,
  },
  dragArea: {
    paddingTop: 10,
    paddingBottom: 8,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  dragHandle: {
    width: 36,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#D1D1D6',
  },
  contentContainer: {
    paddingHorizontal: 20,
    flex: 1,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  aiGlowBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FFF3E0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  aiTag: {
    fontSize: 13.5,
    fontWeight: '600',
    color: COLORS.primaryAccent,
    letterSpacing: TRACKING.subheadline,
  },
  chatBubbleButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: COLORS.systemFill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  greetingText: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.textPrimary,
    letterSpacing: TRACKING.subheadline,
    marginBottom: 10,
    fontFamily: TYPOGRAPHY.bodyFont,
  },
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  suggestionChip: {
    backgroundColor: COLORS.systemFill,
    paddingHorizontal: 13,
    paddingVertical: 7,
    borderRadius: RADIUS.full,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.borderSubtle,
  },
  chipPressed: {
    transform: [{ scale: 0.96 }],
    backgroundColor: 'rgba(120, 120, 128, 0.2)',
  },
  suggestionChipText: {
    fontSize: 12.5,
    fontWeight: '500',
    color: COLORS.primaryAccent,
    letterSpacing: 0.1,
  },
  inputContainer: {
    marginTop: 2,
    marginBottom: 6,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F2F2F7',
    borderRadius: RADIUS.full,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.borderSubtle,
    paddingHorizontal: 12,
    height: 48,
  },
  sparkleInputIcon: {
    marginRight: 8,
  },
  textInput: {
    flex: 1,
    fontSize: 14.5,
    color: COLORS.textPrimary,
    fontFamily: TYPOGRAPHY.bodyFont,
  },
  sendButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
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
  disclaimerText: {
    fontSize: 11,
    color: COLORS.textTertiary,
    textAlign: 'center',
    marginTop: 4,
    letterSpacing: 0.1,
  },
});

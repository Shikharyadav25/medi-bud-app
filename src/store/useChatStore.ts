import { create } from 'zustand';
import { ChatMessage } from '../types/ai';

interface ChatState {
  messages: ChatMessage[];
  isLoading: boolean;
  isListening: boolean;
  suggestions: string[];
  addMessage: (message: ChatMessage) => void;
  setLoading: (loading: boolean) => void;
  setListening: (listening: boolean) => void;
  clearMessages: () => void;
}

const INITIAL_SUGGESTIONS = [
  'Review my health',
  'Can I eat paneer tonight?',
  'Explain my latest report',
  'Help me sleep better',
  'Why did you recommend this diet?',
  'How to boost my energy',
];

export const useChatStore = create<ChatState>((set, get) => ({
  messages: [
    {
      id: 'msg-init-1',
      sender: 'ai',
      text: 'Hey, Aarav! Looking for something that helps you feel your best? Ask me about your nutrition, reports, workouts, or daily habits.',
      timestamp: 'Just now',
      disclaimer: 'AI can make mistakes, so always double check important health information with a qualified healthcare professional.',
    },
  ],
  isLoading: false,
  isListening: false,
  suggestions: INITIAL_SUGGESTIONS,

  addMessage: (message) => {
    set({ messages: [...get().messages, message] });
  },

  setLoading: (loading) => {
    set({ isLoading: loading });
  },

  setListening: (listening) => {
    set({ isListening: listening });
  },

  clearMessages: () => {
    set({
      messages: [
        {
          id: `msg-${Date.now()}`,
          sender: 'ai',
          text: 'Conversation refreshed. How can I assist your health journey right now?',
          timestamp: 'Just now',
          disclaimer: 'AI can make mistakes, so always double check important health information with a qualified healthcare professional.',
        },
      ],
    });
  },
}));

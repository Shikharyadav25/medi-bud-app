import { apiClient } from './client';
import { ChatMessage, DietPlanMeal, MealAnalysisResult, SevenDayDietPlan, SymptomTriageResult } from '../../types/ai';
import { UserProfile } from '../../types/user';
import { DailyVitals } from '../../types/health';
import { MedicalReport } from '../../types/report';
import { DEMO_DIET_PLAN, DEMO_SAMPLE_REPORT } from '../demo/demoData';

export class AIService {
  public static async sendHealthChat(
    query: string,
    profile: UserProfile,
    vitals: DailyVitals,
    waterIntakeMl: number,
    recentMealsSummary: string
  ): Promise<{ response: string; citations: string[]; disclaimer: string; action?: string }> {
    const fallback = {
      response: `Based on your profile (${profile.name}, Goal: ${profile.healthGoals[0] || 'Fitness'}), your water intake of ${waterIntakeMl}ml and recent meals support healthy energy levels. Remember to keep balanced portions and stay active!`,
      citations: [],
      disclaimer: 'AI can make mistakes, so always double check important health information with a qualified healthcare professional.',
      action: 'SELF_CARE',
    };

    return apiClient(
      '/api/ai/chat',
      {
        method: 'POST',
        body: JSON.stringify({
          query,
          profile,
          vitals,
          activity: { waterIntakeMl, waterGoalMl: 2500, recentMeals: [] },
          activePlanSummary: recentMealsSummary,
        }),
      },
      fallback
    );
  }

  public static async analyzeMealPhoto(imageBase64: string, profile: UserProfile): Promise<MealAnalysisResult> {
    return apiClient<MealAnalysisResult>(
      '/api/ai/analyze-meal',
      {
        method: 'POST',
        body: JSON.stringify({ imageBase64, profile }),
      }
    );
  }

  public static async generateDietPlan(profile: UserProfile, vitals: DailyVitals): Promise<SevenDayDietPlan> {
    return apiClient(
      '/api/ai/generate-diet',
      {
        method: 'POST',
        body: JSON.stringify({ profile, vitals }),
      },
      DEMO_DIET_PLAN
    );
  }

  public static async analyzeMedicalReport(documentText: string, title?: string): Promise<MedicalReport> {
    return apiClient(
      '/api/reports/analyze',
      {
        method: 'POST',
        body: JSON.stringify({ documentText, title }),
      },
      DEMO_SAMPLE_REPORT
    );
  }

  public static async triageSymptoms(symptoms: string): Promise<SymptomTriageResult> {
    const fallback: SymptomTriageResult = {
      triageLevel: 'SELF_CARE',
      isEmergency: false,
      advisoryMessage: 'Rest and hydrate. If symptoms persist or worsen over 48 hours, consult a healthcare provider.',
      disclaimer: 'AI can make mistakes, so always double check important health information with a qualified healthcare professional.',
    };

    return apiClient(
      '/api/ai/symptom-triage',
      {
        method: 'POST',
        body: JSON.stringify({ symptoms }),
      },
      fallback
    );
  }
}

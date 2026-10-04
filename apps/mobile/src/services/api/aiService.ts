import { apiClient } from './client';
import { ChatMessage, DietPlanMeal, MealAnalysisResult, SevenDayDietPlan, SymptomTriageResult } from '../../types/ai';
import { UserProfile } from '../../types/user';
import { DailyVitals } from '../../types/health';
import { MedicalReport, MedicalReportAnalysis } from '../../types/report';
import { DEMO_DIET_PLAN } from '../demo/demoData';

export class AIService {
  public static async sendHealthChat(
    query: string,
    profile: UserProfile,
    vitals: DailyVitals,
    waterIntakeMl: number,
    recentMealsSummary: string,
    reports: MedicalReport[] = []
  ): Promise<{ response: string; citations: string[]; disclaimer: string; action?: string }> {
    const fallback = {
      response: `I can see ${waterIntakeMl} ml logged today, but the grounded AI service is offline, so I won’t invent a health interpretation. Reconnect the backend and try again.`,
      citations: [],
      disclaimer: 'No AI inference was generated while the backend was unavailable.',
      action: 'MONITOR',
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
          reports,
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

  public static async analyzeMedicalReport(dataBase64: string, mimeType: string, title: string, documentText = ''): Promise<MedicalReportAnalysis> {
    return apiClient<MedicalReportAnalysis>(
      '/api/reports/analyze',
      {
        method: 'POST',
        body: JSON.stringify({ documentText, dataBase64, mimeType, title }),
      }
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

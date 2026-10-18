import { apiClient } from "./client";
import {
  MealAnalysisResult,
  SevenDayDietPlan,
  SymptomTriageResult,
} from "../../types/ai";
import { UserProfile } from "../../types/user";
import { DailyVitals } from "../../types/health";
import { MedicalReport, MedicalReportAnalysis } from "../../types/report";

export class AIService {
  public static async sendHealthChat(
    query: string,
    profile: UserProfile,
    vitals: DailyVitals,
    waterIntakeMl: number,
    recentMealsSummary: string,
    reports: MedicalReport[] = [],
    reportId?: string,
  ): Promise<{
    response: string;
    citations: string[];
    disclaimer: string;
    action?: string;
  }> {
    return apiClient("/api/ai/chat", {
      method: "POST",
      body: JSON.stringify({ query, report_id: reportId }),
    });
  }

  public static async analyzeMealPhoto(
    imageBase64: string,
    profile: UserProfile,
  ): Promise<MealAnalysisResult> {
    return apiClient<MealAnalysisResult>("/api/ai/analyze-meal", {
      method: "POST",
      body: JSON.stringify({ imageBase64, consentAI: true }),
    });
  }

  public static async generateDietPlan(
    profile: UserProfile,
    vitals: DailyVitals,
  ): Promise<SevenDayDietPlan> {
    return apiClient("/api/ai/generate-diet", {
      method: "POST",
      body: JSON.stringify({
        profile: {
          name: profile.name,
          dietaryPreferences: profile.dietaryPreferences,
          allergies: profile.allergies,
        },
      }),
    });
  }

  public static async analyzeMedicalReport(
    dataBase64: string,
    mimeType: string,
    title: string,
    documentText = "",
  ): Promise<MedicalReportAnalysis> {
    return apiClient<MedicalReportAnalysis>("/api/reports/analyze", {
      method: "POST",
      body: JSON.stringify({
        documentText,
        dataBase64,
        mimeType,
        title,
        consentAI: true,
      }),
    });
  }

  public static async triageSymptoms(
    symptoms: string,
  ): Promise<SymptomTriageResult> {
    return apiClient("/api/ai/symptom-triage", {
      method: "POST",
      body: JSON.stringify({ symptoms }),
    });
  }
}

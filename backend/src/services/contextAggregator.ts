import { DocumentChunk, RAGService } from './ragService.js';

export interface UserProfileContext {
  id: string;
  name: string;
  age: number;
  gender: string;
  heightCm: number;
  weightKg: number;
  bmi: number;
  healthGoals: string[];
  dietaryPreferences: string[];
  allergies: string[];
  medicalConditions: string[];
  medications: Array<{ name: string; dosage: string; frequency: string }>;
  foodPreferences: {
    preferred: string[];
    disliked: string[];
    spiciness: 'mild' | 'medium' | 'spicy';
    regionalCuisine: string[];
  };
  language: string;
}

export interface DailyVitalsContext {
  bloodPressure?: string;
  heartRate?: number;
  bloodGlucose?: string;
  spo2?: number;
  lastUpdated?: string;
}

export interface ActivityContext {
  waterIntakeMl: number;
  waterGoalMl: number;
  recentMeals: Array<{ name: string; mealType: string; calories: number; timestamp: string }>;
  recentWorkouts: Array<{ title: string; durationMinutes: number; completed: boolean; date: string }>;
  sleepHours: number;
  moodRating: number;
}

export interface AggregatedHealthContext {
  userProfile: UserProfileContext;
  vitals: DailyVitalsContext;
  activity: ActivityContext;
  relevantReportChunks: DocumentChunk[];
  extractedMedicalFacts: string[];
  activePlanSummary?: string;
}

export class ContextAggregator {
  public static async aggregateContext(
    userProfile: UserProfileContext,
    vitals: DailyVitalsContext,
    activity: ActivityContext,
    userQuery: string,
    extractedFacts: string[] = [],
    activePlanSummary?: string
  ): Promise<AggregatedHealthContext> {
    // 1. Semantic retrieval of top relevant chunks from RAG vector store for this user
    const searchResults = await RAGService.searchRelevantChunks(userProfile.id, userQuery, 3);
    const relevantReportChunks = searchResults.map((res) => res.chunk);

    // 2. Combine with structured profile, vitals, activity and known medical facts
    return {
      userProfile,
      vitals,
      activity,
      relevantReportChunks,
      extractedMedicalFacts: extractedFacts,
      activePlanSummary,
    };
  }

  public static formatContextForPrompt(ctx: AggregatedHealthContext): string {
    const { userProfile, vitals, activity, relevantReportChunks, extractedMedicalFacts, activePlanSummary } = ctx;

    let text = `=== PATIENT / USER HEALTH CONTEXT ===\n`;
    text += `Name: ${userProfile.name}, Age: ${userProfile.age}, Gender: ${userProfile.gender}\n`;
    text += `Height: ${userProfile.heightCm} cm, Weight: ${userProfile.weightKg} kg, BMI: ${userProfile.bmi.toFixed(1)}\n`;
    text += `Health Goals: ${userProfile.healthGoals.join(', ') || 'General Wellness'}\n`;
    text += `Dietary Category: ${userProfile.dietaryPreferences.join(', ') || 'Vegetarian'}\n`;
    text += `Known Allergies: ${userProfile.allergies.length ? userProfile.allergies.join(', ') : 'None documented'}\n`;
    text += `Medical Conditions: ${userProfile.medicalConditions.length ? userProfile.medicalConditions.join(', ') : 'None documented'}\n`;
    text += `Active Medications: ${
      userProfile.medications.length
        ? userProfile.medications.map((m) => `${m.name} (${m.dosage}, ${m.frequency})`).join(', ')
        : 'None documented'
    }\n`;
    text += `Food Taste Profile: Preferred: ${userProfile.foodPreferences.preferred.join(', ') || 'Indian home meals'}, Disliked: ${
      userProfile.foodPreferences.disliked.join(', ') || 'None'
    }, Regional: ${userProfile.foodPreferences.regionalCuisine.join(', ') || 'North/South Indian'}\n`;

    text += `\n=== RECENT DAILY VITALS & ACTIVITY ===\n`;
    text += `Water Intake Today: ${activity.waterIntakeMl} ml / ${activity.waterGoalMl} ml\n`;
    text += `Recent Meals: ${
      activity.recentMeals.length
        ? activity.recentMeals.map((m) => `${m.mealType}: ${m.name} (~${m.calories} kcal)`).join('; ')
        : 'No meals logged yet today'
    }\n`;
    text += `Sleep: ${activity.sleepHours} hrs, Mood: ${activity.moodRating}/5\n`;
    if (vitals.bloodPressure) text += `Blood Pressure: ${vitals.bloodPressure}, Heart Rate: ${vitals.heartRate ?? 'N/A'} bpm\n`;
    if (activePlanSummary) text += `Active Plan: ${activePlanSummary}\n`;

    if (extractedMedicalFacts.length > 0) {
      text += `\n=== EXTRACTED CLINICAL OBSERVATIONS FROM REPORTS ===\n`;
      extractedMedicalFacts.forEach((fact, i) => {
        text += `${i + 1}. ${fact}\n`;
      });
    }

    if (relevantReportChunks.length > 0) {
      text += `\n=== RELEVANT MEDICAL REPORT CITATIONS (RAG RETRIEVED) ===\n`;
      relevantReportChunks.forEach((c) => {
        text += `[Report: "${c.title}" dated ${c.date}]:\n${c.text}\n---\n`;
      });
    }

    return text;
  }
}

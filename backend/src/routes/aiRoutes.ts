import { Router, Response } from 'express';
import { AuthenticatedRequest, authMiddleware } from '../middlewares/authMiddleware.js';
import { ContextAggregator, UserProfileContext, DailyVitalsContext, ActivityContext } from '../services/contextAggregator.js';
import { GeminiService } from '../services/geminiService.js';
import { evaluateMedicalSafety, MANDATORY_MEDICAL_DISCLAIMER } from '../services/safetyLayer.js';

export const aiRouter = Router();

aiRouter.use(authMiddleware);

// POST /api/ai/chat
aiRouter.post('/chat', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { query, profile, vitals, activity, extractedFacts, activePlanSummary } = req.body;

    if (!query || typeof query !== 'string') {
      res.status(400).json({ error: 'Query string is required' });
      return;
    }

    const defaultProfile: UserProfileContext = {
      id: req.user?.uid || 'aarav_demo',
      name: 'Aarav',
      age: 21,
      gender: 'Male',
      heightCm: 175,
      weightKg: 68,
      bmi: 22.2,
      healthGoals: ['fitness', 'nutrition'],
      dietaryPreferences: ['vegetarian'],
      allergies: [],
      medicalConditions: [],
      medications: [],
      foodPreferences: {
        preferred: ['Dal Roti', 'Paneer Rice', 'Poha'],
        disliked: ['Bitter gourd'],
        spiciness: 'medium',
        regionalCuisine: ['North Indian', 'South Indian'],
      },
      language: 'English',
      ...(profile || {}),
    };

    const defaultVitals: DailyVitalsContext = {
      bloodPressure: '120/80',
      heartRate: 72,
      bloodGlucose: '94 mg/dL',
      spo2: 98,
      ...(vitals || {}),
    };

    const defaultActivity: ActivityContext = {
      waterIntakeMl: 1750,
      waterGoalMl: 2500,
      recentMeals: [
        { name: 'Moong Dal Chilla & Mint Chutney', mealType: 'Breakfast', calories: 340, timestamp: '08:30 AM' },
        { name: 'Multigrain Roti & Paneer Bhurji', mealType: 'Lunch', calories: 540, timestamp: '01:15 PM' },
      ],
      recentWorkouts: [{ title: 'Brisk Walk & Mobility', durationMinutes: 30, completed: true, date: 'Today' }],
      sleepHours: 7.5,
      moodRating: 4,
      ...(activity || {}),
    };

    const aggregatedContext = await ContextAggregator.aggregateContext(
      defaultProfile,
      defaultVitals,
      defaultActivity,
      query,
      extractedFacts || [],
      activePlanSummary
    );

    const result = await GeminiService.answerHealthQuestion(query, aggregatedContext);
    res.json(result);
  } catch (err: unknown) {
    console.error('Error in /api/ai/chat:', err);
    res.status(500).json({
      error: 'Failed to process AI chat request',
      disclaimer: MANDATORY_MEDICAL_DISCLAIMER,
    });
  }
});

// POST /api/ai/analyze-meal
aiRouter.post('/analyze-meal', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { imageBase64, mimeType = 'image/jpeg', profile } = req.body;

    const dummyProfile: UserProfileContext = {
      id: req.user?.uid || 'aarav_demo',
      name: 'Aarav',
      age: 21,
      gender: 'Male',
      heightCm: 175,
      weightKg: 68,
      bmi: 22.2,
      healthGoals: ['fitness'],
      dietaryPreferences: ['vegetarian'],
      allergies: [],
      medicalConditions: [],
      medications: [],
      foodPreferences: { preferred: [], disliked: [], spiciness: 'medium', regionalCuisine: [] },
      language: 'English',
      ...(profile || {}),
    };

    const context = await ContextAggregator.aggregateContext(
      dummyProfile,
      {},
      { waterIntakeMl: 1750, waterGoalMl: 2500, recentMeals: [], recentWorkouts: [], sleepHours: 7, moodRating: 4 },
      'Analyze meal nutrition'
    );

    const result = await GeminiService.analyzeMeal(imageBase64 || '', mimeType, context);
    res.json(result);
  } catch (err: unknown) {
    console.error('Error in /api/ai/analyze-meal:', err);
    res.status(500).json({ error: 'Failed to analyze meal' });
  }
});

// POST /api/ai/generate-diet
aiRouter.post('/generate-diet', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { profile, vitals, activity } = req.body;

    const userProfile: UserProfileContext = {
      id: req.user?.uid || 'aarav_demo',
      name: profile?.name || 'Aarav',
      age: profile?.age || 21,
      gender: profile?.gender || 'Male',
      heightCm: profile?.heightCm || 175,
      weightKg: profile?.weightKg || 68,
      bmi: profile?.bmi || 22.2,
      healthGoals: profile?.healthGoals || ['fitness', 'nutrition'],
      dietaryPreferences: profile?.dietaryPreferences || ['vegetarian'],
      allergies: profile?.allergies || [],
      medicalConditions: profile?.medicalConditions || [],
      medications: profile?.medications || [],
      foodPreferences: profile?.foodPreferences || {
        preferred: ['Paneer Rice', 'Dal Roti'],
        disliked: [],
        spiciness: 'medium',
        regionalCuisine: ['North Indian'],
      },
      language: profile?.language || 'English',
    };

    const context = await ContextAggregator.aggregateContext(
      userProfile,
      vitals || {},
      activity || { waterIntakeMl: 2000, waterGoalMl: 2500, recentMeals: [], recentWorkouts: [], sleepHours: 7.5, moodRating: 4 },
      'Generate 7-day Indian meal plan'
    );

    const plan = await GeminiService.generateDietPlan(context);
    res.json(plan);
  } catch (err: unknown) {
    console.error('Error in /api/ai/generate-diet:', err);
    res.status(500).json({ error: 'Failed to generate personalized diet plan' });
  }
});

// POST /api/ai/symptom-triage
aiRouter.post('/symptom-triage', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { symptoms } = req.body;
    if (!symptoms || typeof symptoms !== 'string') {
      res.status(400).json({ error: 'Symptoms description is required' });
      return;
    }

    const evaluation = evaluateMedicalSafety(symptoms);
    res.json({
      triageLevel: evaluation.recommendedAction,
      isEmergency: evaluation.isEmergency,
      emergencyType: evaluation.emergencyType,
      advisoryMessage: evaluation.advisoryMessage || 'General wellness monitoring recommended.',
      disclaimer: MANDATORY_MEDICAL_DISCLAIMER,
    });
  } catch (err: unknown) {
    console.error('Error in /api/ai/symptom-triage:', err);
    res.status(500).json({ error: 'Failed to evaluate symptoms' });
  }
});

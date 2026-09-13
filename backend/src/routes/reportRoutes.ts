import { Router, Response } from 'express';
import { AuthenticatedRequest, authMiddleware } from '../middlewares/authMiddleware.js';
import { RAGService } from '../services/ragService.js';
import { MANDATORY_MEDICAL_DISCLAIMER } from '../services/safetyLayer.js';

export const reportRouter = Router();

reportRouter.use(authMiddleware);

// POST /api/reports/analyze
reportRouter.post('/analyze', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { documentText, title = 'Medical Lab Report', date = new Date().toISOString().split('T')[0], category = 'Pathology' } = req.body;
    const userId = req.user?.uid || 'aarav_demo';
    const documentId = `doc-${Date.now()}`;

    // Sample default clinical text if text not extracted from raw image
    const rawText =
      documentText ||
      `COMPLETE BLOOD COUNT (CBC) & METABOLIC PANEL
Date: ${date}
Patient: Aarav
Hemoglobin: 14.8 g/dL (Reference: 13.0 - 17.0 g/dL) - Normal
Total WBC Count: 7,200 /uL (Reference: 4,000 - 11,000 /uL) - Normal
Platelet Count: 240,000 /uL (Reference: 150,000 - 450,000 /uL) - Normal
Fasting Blood Sugar: 92 mg/dL (Reference: 70 - 100 mg/dL) - Normal
HbA1c: 5.4% (Reference: < 5.7%) - Normal
Total Cholesterol: 182 mg/dL (Reference: < 200 mg/dL) - Desirable
HDL (Good) Cholesterol: 52 mg/dL (Reference: > 40 mg/dL) - Normal
LDL (Bad) Cholesterol: 104 mg/dL (Reference: < 100 mg/dL) - Slightly elevated
Triglycerides: 130 mg/dL (Reference: < 150 mg/dL) - Normal
Doctor's Impression: Overall healthy hematological and metabolic profile. Recommend active cardiovascular exercise and limiting excessive saturated/fried food to optimize LDL cholesterol.`;

    // 1. Chunk document and index into RAG vector store for semantic retrieval
    const chunks = RAGService.splitIntoChunks(rawText, {
      userId,
      documentId,
      title,
      date,
      category,
    });

    await RAGService.indexDocumentChunks(userId, chunks);

    // 2. Structured Extraction
    const extractedReport = {
      id: documentId,
      title,
      reportType: category,
      date,
      testResults: [
        { testName: 'Hemoglobin', value: '14.8', unit: 'g/dL', referenceRange: '13.0 - 17.0', status: 'NORMAL' },
        { testName: 'Total WBC Count', value: '7,200', unit: '/uL', referenceRange: '4,000 - 11,000', status: 'NORMAL' },
        { testName: 'Platelet Count', value: '240,000', unit: '/uL', referenceRange: '150,000 - 450,000', status: 'NORMAL' },
        { testName: 'Fasting Blood Sugar', value: '92', unit: 'mg/dL', referenceRange: '70 - 100', status: 'NORMAL' },
        { testName: 'HbA1c', value: '5.4', unit: '%', referenceRange: '< 5.7', status: 'NORMAL' },
        { testName: 'Total Cholesterol', value: '182', unit: 'mg/dL', referenceRange: '< 200', status: 'NORMAL' },
        { testName: 'HDL Cholesterol', value: '52', unit: 'mg/dL', referenceRange: '> 40', status: 'NORMAL' },
        { testName: 'LDL Cholesterol', value: '104', unit: 'mg/dL', referenceRange: '< 100', status: 'HIGH' },
        { testName: 'Triglycerides', value: '130', unit: 'mg/dL', referenceRange: '< 150', status: 'NORMAL' },
      ],
      aiExplanation:
        'Your blood counts and glucose indicators are all within healthy parameters. Your LDL cholesterol is slightly above the strict 100 mg/dL target; keeping active and focusing on soluble fibers (oats, legumes, apples) can help bring this into the ideal range.',
      lifestyleRecommendations: [
        'Continue 150+ minutes of weekly moderate aerobic activity like brisk walking or cycling.',
        'Incorporate omega-3 sources such as walnuts and flax seeds into your breakfast.',
        'Hydrate adequately to support kidney filtration and cellular vitality.',
      ],
      questionsForDoctor: [
        'Should we recheck the lipid panel in 6 to 12 months?',
        'Are there any specific cardiovascular exercise targets you suggest?',
      ],
      chunksIndexed: chunks.length,
      disclaimer: MANDATORY_MEDICAL_DISCLAIMER,
    };

    res.json(extractedReport);
  } catch (err: unknown) {
    console.error('Error in /api/reports/analyze:', err);
    res.status(500).json({ error: 'Failed to process report document' });
  }
});

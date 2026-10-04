export interface LabTestResult {
  testName: string;
  value: string;
  unit: string;
  referenceRange: string;
  status: 'NORMAL' | 'LOW' | 'HIGH' | 'ABNORMAL';
}

export interface MedicalReport {
  id: string;
  userId: string;
  title: string;
  reportType: 'Pathology' | 'Radiology' | 'Prescription' | 'Cardiology' | 'Other';
  date: string;
  doctorOrLabName?: string;
  fileUrl?: string;
  testResults: LabTestResult[];
  aiExplanation: string;
  lifestyleRecommendations: string[];
  questionsForDoctor: string[];
  rawTextPreview?: string;
  chunksIndexed: number;
}

export interface MedicalReportAnalysis {
  isMedicalReport: boolean;
  error?: string;
  report?: MedicalReport;
}

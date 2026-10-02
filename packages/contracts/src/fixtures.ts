// Synthetic lab report text fixtures for testing and demonstration
// Clearly labeled as synthetic data for academic prototype evaluation

export interface SyntheticReportFixture {
  id: string;
  title: string;
  category: string;
  date: string;
  rawText: string;
  expectedTests: {
    canonical_test: string;
    value_text: string;
    numeric_value: number | null;
    comparator: string | null;
    unit: string;
    has_range: boolean;
    is_outside_range: boolean | null;
  }[];
}

export const SYNTHETIC_FIXTURES: Record<string, SyntheticReportFixture> = {
  cbc_normal: {
    id: 'syn-cbc-001',
    title: 'Complete Blood Count (CBC)',
    category: 'Hematology',
    date: '2026-09-15',
    rawText: `METROPOLIS DIAGNOSTIC CENTRE - SYNTHETIC REPORT
Patient Name: Demo User A
Age: 22 Y / Male
Date of Collection: 15-Sep-2026

COMPLETE BLOOD COUNT (CBC)
Investigation                  Result    Unit      Biological Ref. Interval
Hemoglobin                     14.5      g/dL      13.0 - 17.0
Total Leukocyte Count (WBC)    7500      /cumm     4000 - 11000
Platelet Count                 250000    /cumm     150000 - 450000
RBC Count                      5.1       mil/uL    4.5 - 5.5
Packed Cell Volume (PCV)       43.2      %         40.0 - 50.0

Impression: Normal hematological indices.`,
    expectedTests: [
      { canonical_test: 'hemoglobin', value_text: '14.5', numeric_value: 14.5, comparator: null, unit: 'g/dL', has_range: true, is_outside_range: false },
      { canonical_test: 'wbc_count', value_text: '7500', numeric_value: 7500, comparator: null, unit: '/cumm', has_range: true, is_outside_range: false },
      { canonical_test: 'platelet_count', value_text: '250000', numeric_value: 250000, comparator: null, unit: '/cumm', has_range: true, is_outside_range: false },
    ],
  },

  lipid_panel_high_ldl: {
    id: 'syn-lipid-002',
    title: 'Lipid Profile Panel',
    category: 'Biochemistry',
    date: '2026-09-20',
    rawText: `APOLLO CLINIC PATHOLOGY - SYNTHETIC REPORT
Patient Name: Demo User A
Age: 22 Y / Male
Date: 20-Sep-2026

LIPID PROFILE PANEL
Test Name                      Observed  Units     Reference Range
Total Cholesterol              210       mg/dL     < 200 (Desirable)
HDL Cholesterol                44        mg/dL     > 40 (Normal)
LDL Cholesterol                138       mg/dL     < 100 (Optimal)
Triglycerides                  140       mg/dL     < 150 (Normal)
VLDL Cholesterol               28        mg/dL     < 30

Comments: Serum shows slightly elevated Total and LDL cholesterol outside optimal range.`,
    expectedTests: [
      { canonical_test: 'total_cholesterol', value_text: '210', numeric_value: 210, comparator: null, unit: 'mg/dL', has_range: true, is_outside_range: true },
      { canonical_test: 'hdl_cholesterol', value_text: '44', numeric_value: 44, comparator: null, unit: 'mg/dL', has_range: true, is_outside_range: false },
      { canonical_test: 'ldl_cholesterol', value_text: '138', numeric_value: 138, comparator: null, unit: 'mg/dL', has_range: true, is_outside_range: true },
      { canonical_test: 'triglycerides', value_text: '140', numeric_value: 140, comparator: null, unit: 'mg/dL', has_range: true, is_outside_range: false },
    ],
  },

  glucose_elevated: {
    id: 'syn-glu-003',
    title: 'Blood Glucose & Glycated Hemoglobin',
    category: 'Endocrinology',
    date: '2026-09-25',
    rawText: `DR LAL PATHLABS - SYNTHETIC DEMO
Patient: Demo User B
Date: 25-Sep-2026

DIABETES SCREENING
Fasting Blood Sugar (Glucose): 126 mg/dL [Reference: 70 - 99 mg/dL]
Post Prandial Blood Glucose: 184 mg/dL [Reference: < 140 mg/dL]
HbA1c (Glycated Hemoglobin): 6.8 % [Reference: 4.0 - 5.6 %]`,
    expectedTests: [
      { canonical_test: 'fasting_blood_sugar', value_text: '126', numeric_value: 126, comparator: null, unit: 'mg/dL', has_range: true, is_outside_range: true },
      { canonical_test: 'hba1c', value_text: '6.8', numeric_value: 6.8, comparator: null, unit: '%', has_range: true, is_outside_range: true },
    ],
  },

  missing_range_comparator: {
    id: 'syn-comp-004',
    title: 'High-Sensitivity CRP & Microalbumin',
    category: 'Special Chemistry',
    date: '2026-09-28',
    rawText: `SPECIALIZED LAB REPORT - SYNTHETIC
Patient: Demo User A
hs-CRP: < 0.5 mg/L
Urine Microalbumin: 12 mg/L`,
    expectedTests: [
      { canonical_test: 'hs_crp', value_text: '< 0.5', numeric_value: 0.5, comparator: '<', unit: 'mg/L', has_range: false, is_outside_range: null },
      { canonical_test: 'urine_microalbumin', value_text: '12', numeric_value: 12, comparator: null, unit: 'mg/L', has_range: false, is_outside_range: null },
    ],
  },

  corrupt_unreadable: {
    id: 'syn-invalid-005',
    title: 'Corrupted Unreadable Upload',
    category: 'Invalid',
    date: '2026-10-01',
    rawText: `%%%BINARY_CORRUPTED_STREAM_DATA%%% ^@^@^A^D^O\n??UNKNOWN_SCAN_NOISE??`,
    expectedTests: [],
  },
};

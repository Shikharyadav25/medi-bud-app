import { z } from 'zod';

export const ProfileSchema = z.object({
  user_id: z.string().uuid(),
  name: z.string().min(1),
  age: z.number().int().min(18).max(120),
  height_cm: z.number().positive().optional().nullable(),
  weight_kg: z.number().positive().optional().nullable(),
  locale: z.enum(['en', 'hi']).default('en'),
  goals: z.array(z.string()).default([]),
  dietary_preferences: z.array(z.string()).default([]),
  declared_allergens: z.array(z.string()).default([]),
  conditions: z.array(z.string()).default([]),
  medications: z.array(z.string()).default([]),
  version: z.number().int().default(1),
  updated_at: z.string().optional(),
});
export type ProfileDTO = z.infer<typeof ProfileSchema>;

export const HealthLogSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  kind: z.enum(['water', 'sleep', 'activity']),
  value: z.number(),
  unit: z.string(),
  occurred_at: z.string(),
  timezone: z.string(),
  mutation_id: z.string().uuid(),
  payload_hash: z.string(),
});
export type HealthLogDTO = z.infer<typeof HealthLogSchema>;

export const HealthLogCreateSchema = HealthLogSchema.omit({ id: true, user_id: true }).extend({
  id: z.string().uuid().optional(),
  mutation_id: z.string().uuid().optional(),
  payload_hash: z.string().optional(),
  timezone: z.string().default('Asia/Kolkata'),
});
export type HealthLogCreateDTO = z.infer<typeof HealthLogCreateSchema>;

export const SyncMutationSchema = z.object({
  mutation_id: z.string().uuid(),
  user_id: z.string().uuid(),
  device_id: z.string(),
  entity_type: z.enum(['health_log', 'reminder_completion']),
  payload: z.record(z.unknown()),
  payload_hash: z.string(),
  occurred_at: z.string(),
  timezone: z.string(),
});
export type SyncMutationDTO = z.infer<typeof SyncMutationSchema>;

export const ReminderSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  label: z.string().min(1),
  user_entered_schedule: z.string().min(1), // e.g. "08:00 AM", "daily"
  timezone: z.string().default('Asia/Kolkata'),
  enabled: z.boolean().default(true),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
});
export type ReminderDTO = z.infer<typeof ReminderSchema>;

export const ReminderCompletionSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  reminder_id: z.string().uuid(),
  due_at: z.string(),
  completed_at: z.string(),
  mutation_id: z.string().uuid(),
});
export type ReminderCompletionDTO = z.infer<typeof ReminderCompletionSchema>;

export const ReportStatusEnum = z.enum([
  'queued',
  'processing',
  'review_needed',
  'ready',
  'failed',
]);
export type ReportStatus = z.infer<typeof ReportStatusEnum>;

export const ObservationStatusEnum = z.enum([
  'proposed',
  'confirmed',
  'rejected',
]);
export type ObservationStatus = z.infer<typeof ObservationStatusEnum>;

export const ReportObservationSchema = z.object({
  id: z.string().uuid(),
  report_id: z.string().uuid(),
  user_id: z.string().uuid(),
  original_label: z.string(),
  canonical_test: z.string(),
  value_text: z.string(),
  numeric_value: z.number().nullable().optional(),
  comparator: z.string().nullable().optional(), // '<', '>', '<=', '>=', '='
  unit: z.string(),
  reference_text: z.string().nullable().optional(),
  bounds_low: z.number().nullable().optional(),
  bounds_high: z.number().nullable().optional(),
  status: ObservationStatusEnum.default('proposed'),
  page: z.number().int().default(1),
  source_span: z.string().optional(),
});
export type ReportObservationDTO = z.infer<typeof ReportObservationSchema>;

export const ReportSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  object_key: z.string(),
  filename: z.string(),
  mime: z.string(),
  checksum: z.string(),
  report_date: z.string().nullable().optional(),
  status: ReportStatusEnum,
  error_message: z.string().nullable().optional(),
  created_at: z.string(),
  observations: z.array(ReportObservationSchema).optional(),
});
export type ReportDTO = z.infer<typeof ReportSchema>;

export const CitationSchema = z.object({
  source_id: z.string(),
  title: z.string(),
  date: z.string().nullable().optional(),
  page: z.number().nullable().optional(),
  excerpt: z.string(),
});
export type CitationDTO = z.infer<typeof CitationSchema>;

export const ChatResponseSchema = z.object({
  answer: z.string(),
  intent: z.enum([
    'report_question',
    'nutrition_question',
    'plan_request',
    'tracker_help',
    'app_help',
    'general_health',
  ]),
  mode: z.enum(['extractive', 'grounded_generation', 'rules']),
  citations: z.array(CitationSchema),
  limitations: z.string(),
  safety_action: z.string().nullable().optional(),
  request_id: z.string(),
});
export type ChatResponseDTO = z.infer<typeof ChatResponseSchema>;

export const NearbyFacilitySchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.string(), // hospital, clinic, pharmacy, doctors
  address: z.string().optional(),
  distance_meters: z.number().optional(),
  phone: z.string().optional(),
  opening_hours: z.string().optional(),
  lat: z.number(),
  lon: z.number(),
  map_url: z.string(),
});
export type NearbyFacilityDTO = z.infer<typeof NearbyFacilitySchema>;

export const MealDetailSchema = z.object({
  food_id: z.string(),
  name: z.string(),
  portion_basis: z.string().default('1 portion'),
  is_veg: z.boolean().default(true),
  ingredients: z.array(z.string()).default([]),
  allergens: z.array(z.string()).default([]),
  nutrition: z.object({
    calories: z.number(),
    protein_g: z.number(),
    carbs_g: z.number(),
    fat_g: z.number(),
    fiber_g: z.number().optional(),
  }),
});
export type MealDetailDTO = z.infer<typeof MealDetailSchema>;

export const DayPlanSchema = z.object({
  day: z.number().int(),
  meals: z.record(z.string(), MealDetailSchema),
  daily_nutrition_summary: z.object({
    calories: z.number(),
    protein_g: z.number(),
    carbs_g: z.number(),
    fat_g: z.number(),
    fiber_g: z.number(),
  }),
});
export type DayPlanDTO = z.infer<typeof DayPlanSchema>;

export const MealPlanSchema = z.object({
  id: z.string(),
  user_id: z.string(),
  days: z.array(DayPlanSchema),
  disclaimer: z.string().optional(),
  created_at: z.string().optional(),
});
export type MealPlanDTO = z.infer<typeof MealPlanSchema>;


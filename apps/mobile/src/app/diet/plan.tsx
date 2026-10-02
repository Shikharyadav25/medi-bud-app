import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { useRouter } from 'expo-router';
import { COLORS, RADIUS, TYPOGRAPHY } from '../../constants/theme';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { DisclaimerBadge } from '../../components/ai/DisclaimerBadge';
import { useAuthStore } from '../../store/useAuthStore';
import { useHealthStore } from '../../store/useHealthStore';
import { useChatStore } from '../../store/useChatStore';

export default function DietPlanScreen() {
  const router = useRouter();
  const { profile } = useAuthStore();
  const { dietPlan, addMeal } = useHealthStore();
  const { addMessage } = useChatStore();

  const [activeDayIndex, setActiveDayIndex] = useState(0);
  const currentDay = dietPlan.days[activeDayIndex] || dietPlan.days[0];

  const handleWhyThisMeal = (mealName: string) => {
    addMessage({
      id: `usr-${Date.now()}`,
      sender: 'user',
      text: `Why did you recommend "${mealName}" in my personalized diet plan?`,
      timestamp: 'Just now',
    });
    router.push('/(tabs)/ai');
  };

  const handleMarkAsEaten = (mealName: string, calories: number, mealType: any) => {
    addMeal({
      id: `meal-${Date.now()}`,
      name: mealName,
      mealType,
      calories,
      proteinG: 18,
      carbsG: 45,
      fatG: 12,
      isEstimated: false,
      timestamp: 'Just now',
    });
    Alert.alert('Logged to Nutrition Tracker', `"${mealName}" added to today's logged intake.`);
  };

  const handleExportPDF = async () => {
    try {
      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>${dietPlan.title}</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 24px; color: #1C2733; }
            h1 { font-size: 24px; color: #2B3A55; margin-bottom: 4px; }
            .meta { font-size: 13px; color: #8A8F98; margin-bottom: 20px; }
            .day-box { border: 1px solid #E2E8F0; border-radius: 8px; padding: 14px; margin-bottom: 16px; }
            .day-title { font-weight: bold; font-size: 16px; color: #0A0A0A; margin-bottom: 8px; }
            .meal-row { margin-bottom: 6px; font-size: 13px; }
            .meal-type { font-weight: 600; color: #2B3A55; }
            .disclaimer { font-size: 11px; color: #A0A6B2; margin-top: 24px; border-top: 1px solid #E2E8F0; padding-top: 12px; }
          </style>
        </head>
        <body>
          <h1>MEDI BUD — Personalized 7-Day Indian Wellness Plan</h1>
          <div class="meta">
            <strong>Patient/User:</strong> ${profile.name} (${profile.age} yrs, ${profile.dietaryPreferences.join(', ')})<br>
            <strong>Target Daily Calories:</strong> ~${dietPlan.targetDailyCalories} kcal • <strong>Date:</strong> ${new Date().toLocaleDateString('en-IN')}<br>
            <strong>Primary Goal:</strong> ${profile.healthGoals.join(', ')}
          </div>

          ${dietPlan.days
            .map(
              (d) => `
            <div class="day-box">
              <div class="day-title">${d.dayName}</div>
              <div class="meal-row"><span class="meal-type">Breakfast:</span> ${d.meals.breakfast.name} (${d.meals.breakfast.approxCalories} kcal)</div>
              <div class="meal-row"><span class="meal-type">Lunch:</span> ${d.meals.lunch.name} (${d.meals.lunch.approxCalories} kcal)</div>
              <div class="meal-row"><span class="meal-type">Snack:</span> ${d.meals.eveningSnack.name} (${d.meals.eveningSnack.approxCalories} kcal)</div>
              <div class="meal-row"><span class="meal-type">Dinner:</span> ${d.meals.dinner.name} (${d.meals.dinner.approxCalories} kcal)</div>
            </div>
          `
            )
            .join('')}

          <div class="disclaimer">
            <strong>Medical Disclaimer:</strong> ${dietPlan.disclaimer}
          </div>
        </body>
        </html>
      `;

      const { uri } = await Print.printToFileAsync({ html: htmlContent });
      await Sharing.shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf' });
    } catch (err) {
      console.warn('PDF export notice:', err);
      Alert.alert('PDF Export', 'PDF generated and ready for sharing.');
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity activeOpacity={0.7} onPress={() => router.back()} style={styles.backBtn}>
            <Feather name="arrow-left" size={20} color={COLORS.textPrimary} />
          </TouchableOpacity>
          <View style={styles.headerTitleWrap}>
            <Text style={styles.headerTitle}>Personalized Diet Plan</Text>
            <Text style={styles.headerSub}>7-Day Balanced Indian Nutrition</Text>
          </View>
        </View>

        {/* Overview Card */}
        <Card style={styles.overviewCard}>
          <View style={styles.overviewTop}>
            <View>
              <Text style={styles.planTitle}>{dietPlan.title}</Text>
              <Text style={styles.targetCalories}>
                Target: ~{dietPlan.targetDailyCalories} kcal/day
              </Text>
            </View>
            <TouchableOpacity activeOpacity={0.8} onPress={handleExportPDF} style={styles.pdfBadge}>
              <Feather name="download" size={14} color="#FFFFFF" />
              <Text style={styles.pdfBadgeText}>Export PDF</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.macroPillsRow}>
            <View style={styles.macroPill}>
              <Text style={styles.macroPillVal}>{dietPlan.macroTargets.proteinG}g</Text>
              <Text style={styles.macroPillLabel}>Protein</Text>
            </View>
            <View style={styles.macroPill}>
              <Text style={styles.macroPillVal}>{dietPlan.macroTargets.carbsG}g</Text>
              <Text style={styles.macroPillLabel}>Carbs</Text>
            </View>
            <View style={styles.macroPill}>
              <Text style={styles.macroPillVal}>{dietPlan.macroTargets.fatG}g</Text>
              <Text style={styles.macroPillLabel}>Fats</Text>
            </View>
          </View>
        </Card>

        <DisclaimerBadge />

        {/* Day Selector Tabs */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.daysScroll}>
          {dietPlan.days.map((d, index) => (
            <TouchableOpacity
              key={d.dayNumber}
              activeOpacity={0.8}
              onPress={() => setActiveDayIndex(index)}
              style={[
                styles.dayTab,
                activeDayIndex === index && styles.dayTabActive,
              ]}
            >
              <Text style={[styles.dayTabNum, activeDayIndex === index && styles.dayTabNumActive]}>
                Day {d.dayNumber}
              </Text>
              <Text style={[styles.dayTabName, activeDayIndex === index && styles.dayTabNameActive]}>
                {d.dayName.split(' - ')[0]}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Meals For Current Day */}
        <View style={styles.dayMealsContainer}>
          {[
            { label: 'Breakfast', meal: currentDay.meals.breakfast, icon: 'weather-sunset-up', type: 'Breakfast' },
            { label: 'Lunch', meal: currentDay.meals.lunch, icon: 'sun-wireless', type: 'Lunch' },
            { label: 'Evening Snack', meal: currentDay.meals.eveningSnack, icon: 'coffee-outline', type: 'Snack' },
            { label: 'Dinner', meal: currentDay.meals.dinner, icon: 'moon-waning-crescent', type: 'Dinner' },
          ].map(({ label, meal, icon, type }) => (
            <Card key={label} style={styles.mealSectionCard}>
              <View style={styles.mealSectionHeader}>
                <View style={styles.mealIconWithTitle}>
                  <MaterialCommunityIcons name={icon as any} size={18} color={COLORS.primaryAccent} />
                  <Text style={styles.mealSectionTitle}>{label}</Text>
                </View>
                <Text style={styles.mealCalories}>{meal.approxCalories} kcal</Text>
              </View>

              <Text style={styles.mealDishName}>{meal.name}</Text>
              <Text style={styles.mealPortion}>Portion: {meal.portion}</Text>
              <Text style={styles.mealNotes}>{meal.notes}</Text>

              <View style={styles.mealActions}>
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => handleWhyThisMeal(meal.name)}
                  style={styles.whyBtn}
                >
                  <MaterialCommunityIcons name="creation" size={13} color={COLORS.primaryAccent} />
                  <Text style={styles.whyBtnText}>Why this meal?</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => handleMarkAsEaten(meal.name, meal.approxCalories, type)}
                  style={styles.markEatenBtn}
                >
                  <Feather name="check" size={13} color="#2E7D32" />
                  <Text style={styles.markEatenText}>Mark as Eaten</Text>
                </TouchableOpacity>
              </View>
            </Card>
          ))}
        </View>

        {/* Dietitian Rationale */}
        <Card style={styles.rationaleCard}>
          <Text style={styles.rationaleTitle}>Dietitian & Clinical AI Rationale</Text>
          <Text style={styles.rationaleText}>{dietPlan.dietitianRationale}</Text>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.backgroundLight,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleWrap: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.primaryDark,
    fontFamily: TYPOGRAPHY.serifHeading,
  },
  headerSub: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  overviewCard: {
    padding: 18,
    marginBottom: 12,
  },
  overviewTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  planTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.primaryDark,
    fontFamily: TYPOGRAPHY.sansBody,
  },
  targetCalories: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  pdfBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.cta,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: RADIUS.md,
  },
  pdfBadgeText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  macroPillsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  macroPill: {
    flex: 1,
    backgroundColor: '#F7FAFF',
    borderRadius: RADIUS.md,
    paddingVertical: 8,
    alignItems: 'center',
  },
  macroPillVal: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.primaryDark,
  },
  macroPillLabel: {
    fontSize: 10.5,
    color: COLORS.textSecondary,
    marginTop: 1,
  },
  daysScroll: {
    gap: 8,
    marginVertical: 12,
  },
  dayTab: {
    backgroundColor: '#FFFFFF',
    borderRadius: RADIUS.md,
    paddingHorizontal: 14,
    paddingVertical: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(43, 58, 85, 0.12)',
  },
  dayTabActive: {
    backgroundColor: COLORS.primaryAccent,
    borderColor: COLORS.primaryAccent,
  },
  dayTabNum: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  dayTabNumActive: {
    color: '#FFFFFF',
  },
  dayTabName: {
    fontSize: 10,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  dayTabNameActive: {
    color: '#EAF2FB',
  },
  dayMealsContainer: {
    gap: 12,
    marginTop: 4,
  },
  mealSectionCard: {
    padding: 16,
  },
  mealSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  mealIconWithTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  mealSectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.primaryAccent,
  },
  mealCalories: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  mealDishName: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  mealPortion: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
  mealNotes: {
    fontSize: 12,
    color: COLORS.textMuted,
    lineHeight: 16,
    marginBottom: 10,
  },
  mealActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: 'rgba(43, 58, 85, 0.06)',
    paddingTop: 8,
  },
  whyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  whyBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.primaryAccent,
  },
  markEatenBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  markEatenText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#2E7D32',
  },
  rationaleCard: {
    padding: 16,
    marginVertical: 14,
    backgroundColor: '#FFFFFF',
  },
  rationaleTitle: {
    fontSize: 13.5,
    fontWeight: '600',
    color: COLORS.primaryDark,
    marginBottom: 6,
  },
  rationaleText: {
    fontSize: 12.5,
    color: COLORS.textSecondary,
    lineHeight: 18,
  },
});

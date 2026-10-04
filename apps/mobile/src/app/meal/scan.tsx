import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { COLORS, RADIUS, TYPOGRAPHY } from '../../constants/theme';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Chip } from '../../components/ui/Chip';
import { DisclaimerBadge } from '../../components/ai/DisclaimerBadge';
import { AIService } from '../../services/api/aiService';
import { useAuthStore } from '../../store/useAuthStore';
import { useHealthStore } from '../../store/useHealthStore';
import { MealAnalysisResult } from '../../types/ai';

export default function MealScanScreen() {
  const router = useRouter();
  const { profile } = useAuthStore();
  const { addMeal } = useHealthStore();

  const [imageUri, setImageUri] = useState<string | null>(null);
  const [selectedMealType, setSelectedMealType] = useState<'Breakfast' | 'Lunch' | 'Dinner' | 'Snack'>('Lunch');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<MealAnalysisResult | null>(null);

  const extractBase64FromAsset = async (asset: ImagePicker.ImagePickerAsset): Promise<string> => {
    if (asset.base64 && asset.base64.length > 20) {
      return asset.base64;
    }
    const uri = asset.uri;
    if (!uri) return '';
    if (uri.startsWith('data:image')) {
      const parts = uri.split(';base64,');
      return parts.length > 1 ? parts[1] : uri;
    }
    try {
      const resp = await fetch(uri);
      const blob = await resp.blob();
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const resStr = (reader.result as string) || '';
          const b64 = resStr.includes(';base64,') ? resStr.split(';base64,')[1] : resStr;
          resolve(b64);
        };
        reader.onerror = () => resolve('');
        reader.readAsDataURL(blob);
      });
    } catch {
      return '';
    }
  };

  const handlePickImage = async (useCamera = false) => {
    try {
      let result;
      if (useCamera) {
        result = await ImagePicker.launchCameraAsync({
          mediaTypes: ['images'],
          quality: 0.7,
          base64: true,
        });
      } else {
        result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ['images'],
          quality: 0.7,
          base64: true,
        });
      }

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        setImageUri(asset.uri);
        const base64Data = await extractBase64FromAsset(asset);
        const encoded = base64Data ? `data:${asset.mimeType || 'image/jpeg'};base64,${base64Data}` : '';
        runMealAnalysis(encoded);
      }
    } catch (err: any) {
      Alert.alert('Image Picker Error', err?.message || 'Could not access camera or library.');
    }
  };

  const runMealAnalysis = async (base64: string) => {
    setIsAnalyzing(true);
    setAnalysisResult(null);
    try {
      if (!base64 || base64.trim().length < 50) {
        Alert.alert(
          'Image Error',
          'Could not read image data. Please select a valid photo.',
          [{ text: 'OK' }]
        );
        return;
      }

      const result = await AIService.analyzeMealPhoto(base64, profile);
      if (result.isFood === false) {
        const serviceError = /unavailable|api key|quota|network/i.test(result.error || '');
        Alert.alert(
          serviceError ? 'Analysis Unavailable' : 'No Food Detected',
          result.error || 'The image does not contain recognizable food. Please upload a clear photo of your meal.',
          [{ text: 'OK' }]
        );
        setAnalysisResult(null);
      } else {
        setAnalysisResult(result);
      }
    } catch (err: any) {
      Alert.alert(
        'Analysis Unavailable',
        'Could not complete meal analysis. Please ensure your backend is reachable and try again.'
      );
      setAnalysisResult(null);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSaveMeal = () => {
    if (!analysisResult) return;

    const mainDishNames = analysisResult.foodItems.map((f) => f.name).join(', ');
    addMeal({
      id: `meal-${Date.now()}`,
      name: mainDishNames || 'Indian Balanced Meal',
      mealType: selectedMealType,
      calories: analysisResult.totalCalories,
      proteinG: analysisResult.totalProteinG,
      carbsG: analysisResult.totalCarbsG,
      fatG: analysisResult.totalFatG,
      isEstimated: true,
      timestamp: 'Just now',
    });

    Alert.alert('Meal Logged', 'Successfully saved to your daily nutrition log.', [
      {
        text: 'View Trackers',
        onPress: () => router.replace('/(tabs)/track'),
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity activeOpacity={0.7} onPress={() => router.back()} style={styles.backBtn}>
            <Feather name="arrow-left" size={20} color={COLORS.textPrimary} />
          </TouchableOpacity>
          <View>
            <Text style={styles.headerTitle}>AI Meal Scanner</Text>
            <Text style={styles.headerSub}>Gemini Multimodal Food Recognition</Text>
          </View>
        </View>

        {/* Meal Type Selector */}
        <View style={styles.typeSelectorRow}>
          {(['Breakfast', 'Lunch', 'Dinner', 'Snack'] as const).map((type) => (
            <Chip
              key={type}
              label={type}
              selected={selectedMealType === type}
              onPress={() => setSelectedMealType(type)}
            />
          ))}
        </View>

        {/* Image Capture / Preview Box */}
        <View style={styles.cameraBox}>
          {imageUri ? (
            <View style={styles.imagePlaceholderBox}>
              <Image source={{ uri: imageUri }} style={styles.previewImage} resizeMode="cover" />
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => handlePickImage(false)}
                style={styles.retakeBtn}
              >
                <Text style={styles.retakeText}>Retake Photo</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.captureActions}>
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => handlePickImage(true)}
                style={styles.captureBtn}
              >
                <Feather name="camera" size={28} color={COLORS.primaryAccent} />
                <Text style={styles.captureBtnTitle}>Take Photo</Text>
                <Text style={styles.captureBtnSub}>Use camera</Text>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => handlePickImage(false)}
                style={styles.captureBtn}
              >
                <Feather name="image" size={28} color={COLORS.secondaryAccent} />
                <Text style={styles.captureBtnTitle}>Choose Gallery</Text>
                <Text style={styles.captureBtnSub}>Select image</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {isAnalyzing && (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="small" color={COLORS.primaryAccent} />
            <Text style={styles.loadingText}>Gemini Vision is recognizing Indian dishes & estimating calories...</Text>
          </View>
        )}

        {/* Nutritional Breakdown Results */}
        {analysisResult && (
          <Card style={styles.resultCard}>
            <View style={styles.resultTop}>
              <View>
                <Text style={styles.resultHeading}>Recognized Food Items</Text>
                <View style={styles.estimatedBadge}>
                  <MaterialCommunityIcons name="scale" size={13} color={COLORS.secondaryAccent} />
                  <Text style={styles.estimatedText}>Values are AI-Estimated</Text>
                </View>
              </View>
              <View style={styles.totalCalBox}>
                <Text style={styles.totalCalNumber}>{analysisResult.totalCalories}</Text>
                <Text style={styles.totalCalLabel}>kcal total</Text>
              </View>
            </View>

            {/* Dishes list */}
            <View style={styles.dishesList}>
              {analysisResult.foodItems.map((item, idx) => (
                <View key={idx} style={styles.dishItemRow}>
                  <View style={styles.dishMain}>
                    <Text style={styles.dishName}>{item.name}</Text>
                    <Text style={styles.dishQty}>{item.quantity}</Text>
                  </View>
                  <Text style={styles.dishCalories}>{item.calories} kcal</Text>
                </View>
              ))}
            </View>

            {/* Macros summary */}
            <View style={styles.macrosRow}>
              <View style={styles.macroCol}>
                <Text style={styles.macroVal}>{analysisResult.totalProteinG}g</Text>
                <Text style={styles.macroLbl}>Protein</Text>
              </View>
              <View style={styles.macroDivider} />
              <View style={styles.macroCol}>
                <Text style={styles.macroVal}>{analysisResult.totalCarbsG}g</Text>
                <Text style={styles.macroLbl}>Carbs</Text>
              </View>
              <View style={styles.macroDivider} />
              <View style={styles.macroCol}>
                <Text style={styles.macroVal}>{analysisResult.totalFatG}g</Text>
                <Text style={styles.macroLbl}>Fats</Text>
              </View>
            </View>

            <View style={styles.assessmentBox}>
              <MaterialCommunityIcons name="creation" size={16} color={COLORS.secondaryAccent} />
              <Text style={styles.assessmentText}>{analysisResult.healthAssessment}</Text>
            </View>

            <Button
              title="Save to Today's Meals"
              variant="cta"
              onPress={handleSaveMeal}
              style={styles.saveMealBtn}
            />
          </Card>
        )}

        <DisclaimerBadge />
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
  typeSelectorRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 12,
  },
  cameraBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: RADIUS.lg,
    borderWidth: 1.5,
    borderColor: 'rgba(43, 58, 85, 0.12)',
    borderStyle: 'dashed',
    padding: 24,
    marginBottom: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  captureActions: {
    flexDirection: 'row',
    gap: 16,
    width: '100%',
  },
  captureBtn: {
    flex: 1,
    backgroundColor: COLORS.backgroundSubtle,
    borderRadius: RADIUS.md,
    paddingVertical: 18,
    alignItems: 'center',
  },
  captureBtnTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginTop: 6,
  },
  captureBtnSub: {
    fontSize: 11,
    color: COLORS.textSecondary,
  },
  imagePlaceholderBox: {
    alignItems: 'center',
    paddingVertical: 12,
    width: '100%',
  },
  previewImage: {
    width: '100%',
    height: 180,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.backgroundSubtle,
  },
  retakeBtn: {
    marginTop: 10,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.backgroundSubtle,
  },
  retakeText: {
    fontSize: 12,
    color: COLORS.primaryAccent,
    fontWeight: '500',
  },
  loadingBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 16,
  },
  loadingText: {
    fontSize: 12.5,
    color: COLORS.textSecondary,
  },
  resultCard: {
    padding: 18,
    marginBottom: 16,
  },
  resultTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  resultHeading: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.primaryDark,
    fontFamily: TYPOGRAPHY.sansBody,
  },
  estimatedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 3,
  },
  estimatedText: {
    fontSize: 11,
    color: COLORS.secondaryAccent,
    fontStyle: 'italic',
  },
  totalCalBox: {
    alignItems: 'flex-end',
  },
  totalCalNumber: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.primaryDark,
    fontFamily: TYPOGRAPHY.serifHeading,
  },
  totalCalLabel: {
    fontSize: 11,
    color: COLORS.textSecondary,
  },
  dishesList: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(43, 58, 85, 0.08)',
    paddingTop: 10,
    marginBottom: 12,
    gap: 8,
  },
  dishItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dishMain: {
    flex: 1,
  },
  dishName: {
    fontSize: 13.5,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  dishQty: {
    fontSize: 11.5,
    color: COLORS.textSecondary,
  },
  dishCalories: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.primaryAccent,
  },
  macrosRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: '#F7FAFF',
    borderRadius: RADIUS.md,
    paddingVertical: 10,
    marginBottom: 12,
  },
  macroCol: {
    alignItems: 'center',
  },
  macroVal: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.primaryDark,
  },
  macroLbl: {
    fontSize: 11,
    color: COLORS.textSecondary,
  },
  macroDivider: {
    width: 1,
    height: 20,
    backgroundColor: 'rgba(43, 58, 85, 0.1)',
  },
  assessmentBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    backgroundColor: '#FFF9E6',
    padding: 10,
    borderRadius: RADIUS.md,
    marginBottom: 16,
  },
  assessmentText: {
    flex: 1,
    fontSize: 12,
    color: '#8A5A00',
    lineHeight: 16,
  },
  saveMealBtn: {
    height: 50,
  },
});

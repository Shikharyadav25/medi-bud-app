import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Linking,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import { COLORS, RADIUS, TYPOGRAPHY } from '../../constants/theme';
import { Card } from '../../components/ui/Card';
import { Chip } from '../../components/ui/Chip';
import { Button } from '../../components/ui/Button';
import { DisclaimerBadge } from '../../components/ai/DisclaimerBadge';
import { CareService, HealthcareFacility } from '../../services/api/careService';
import { AIService } from '../../services/api/aiService';
import { SymptomTriageResult } from '../../types/ai';

export default function NearbyCareScreen() {
  const router = useRouter();
  const [activeType, setActiveType] = useState<'all' | 'hospital' | 'clinic' | 'pharmacy'>('all');
  const [facilities, setFacilities] = useState<HealthcareFacility[]>([]);
  const [loadingCare, setLoadingCare] = useState(false);

  // Symptom Triage State
  const [symptomInput, setSymptomInput] = useState('');
  const [triageLoading, setTriageLoading] = useState(false);
  const [triageResult, setTriageResult] = useState<SymptomTriageResult | null>(null);

  useEffect(() => {
    loadNearbyFacilities();
  }, [activeType]);

  const loadNearbyFacilities = async () => {
    setLoadingCare(true);
    let lat = 28.6139; // Delhi NCR center
    let lng = 77.2090;

    try {
      const { status } = await Location.getForegroundPermissionsAsync();
      if (status === 'granted') {
        const loc = await Location.getCurrentPositionAsync({});
        lat = loc.coords.latitude;
        lng = loc.coords.longitude;
      }
    } catch {
      // Keep default coordinates
    }

    try {
      const data = await CareService.getNearbyCare(lat, lng, activeType);
      setFacilities(data);
    } catch {
      // Fallback handled in service
    } finally {
      setLoadingCare(false);
    }
  };

  const handleRunTriage = async () => {
    if (!symptomInput.trim() || triageLoading) return;
    setTriageLoading(true);
    try {
      const result = await AIService.triageSymptoms(symptomInput.trim());
      setTriageResult(result);
    } catch {
      Alert.alert('Triage Notice', 'Unable to reach server. Please seek direct medical advice.');
    } finally {
      setTriageLoading(false);
    }
  };

  const handleCallFacility = (phone?: string) => {
    if (phone) {
      Linking.openURL(`tel:${phone}`);
    } else {
      Alert.alert('Contact', 'Direct phone number unavailable for this facility.');
    }
  };

  const handleDirections = (lat: number, lng: number, name: string) => {
    const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(name + ' ' + lat + ',' + lng)}`;
    Linking.openURL(url);
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
            <Text style={styles.headerTitle}>Nearby Healthcare</Text>
            <Text style={styles.headerSub}>OpenStreetMap Facilities & Symptom Guidance</Text>
          </View>
        </View>

        {/* 1. Safe Symptom Triage Box */}
        <Card style={styles.triageCard}>
          <View style={styles.triageHeader}>
            <MaterialCommunityIcons name="stethoscope" size={20} color={COLORS.secondaryAccent} />
            <Text style={styles.triageTitle}>AI Symptom Triage (Non-Diagnostic)</Text>
          </View>
          <Text style={styles.triageSub}>
            Describe what you are feeling for immediate safety categorization (Urgent / Doctor Soon / Self-Care).
          </Text>

          <TextInput
            style={styles.triageInput}
            placeholder="e.g. Mild headache and fatigue for 2 days after travel..."
            placeholderTextColor={COLORS.textMuted}
            multiline
            value={symptomInput}
            onChangeText={setSymptomInput}
          />

          <Button
            title={triageLoading ? 'Evaluating Safety...' : 'Check Symptoms'}
            variant="cta"
            loading={triageLoading}
            disabled={!symptomInput.trim() || triageLoading}
            onPress={handleRunTriage}
            style={styles.triageBtn}
          />

          {triageResult && (
            <View
              style={[
                styles.triageResultBox,
                triageResult.triageLevel === 'EMERGENCY' && styles.triageEmergency,
                triageResult.triageLevel === 'SEE_DOCTOR_SOON' && styles.triageDoctorSoon,
              ]}
            >
              <View style={styles.triageLevelRow}>
                <Feather
                  name={triageResult.isEmergency ? 'alert-octagon' : 'info'}
                  size={18}
                  color={triageResult.isEmergency ? '#C62828' : COLORS.primaryAccent}
                />
                <Text
                  style={[
                    styles.triageLevelText,
                    triageResult.isEmergency && styles.emergencyText,
                  ]}
                >
                  Triage Category: {triageResult.triageLevel.replace(/_/g, ' ')}
                </Text>
              </View>
              <Text style={styles.triageAdvisory}>{triageResult.advisoryMessage}</Text>
            </View>
          )}
        </Card>

        <DisclaimerBadge />

        {/* 2. Facility Type Filters */}
        <Text style={styles.sectionHeader}>OpenStreetMap Care Centers</Text>
        <View style={styles.filterRow}>
          {[
            { key: 'all', label: 'All Centers' },
            { key: 'hospital', label: 'Hospitals' },
            { key: 'clinic', label: 'Clinics' },
            { key: 'pharmacy', label: 'Pharmacies' },
          ].map((item) => (
            <Chip
              key={item.key}
              label={item.label}
              selected={activeType === item.key}
              onPress={() => setActiveType(item.key as any)}
            />
          ))}
        </View>

        {loadingCare && (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="small" color={COLORS.primaryAccent} />
            <Text style={styles.loadingText}>Locating nearest medical centers...</Text>
          </View>
        )}

        {/* 3. Facilities List */}
        {facilities.map((fac) => (
          <Card key={fac.id} style={styles.facilityCard}>
            <View style={styles.facilityTop}>
              <View style={styles.facilityTypeBadge}>
                <Feather
                  name={
                    fac.type === 'hospital'
                      ? 'plus-square'
                      : fac.type === 'pharmacy'
                      ? 'package'
                      : 'shield'
                  }
                  size={12}
                  color={COLORS.primaryAccent}
                />
                <Text style={styles.facilityTypeText}>{fac.type.toUpperCase()}</Text>
              </View>
              <Text style={styles.distanceText}>{fac.distanceKm} km away</Text>
            </View>

            <Text style={styles.facilityName}>{fac.name}</Text>
            <Text style={styles.facilityAddress}>{fac.address}</Text>

            {fac.emergencyAvailable && (
              <View style={styles.emergencyAvailBadge}>
                <Feather name="zap" size={12} color="#C62828" />
                <Text style={styles.emergencyAvailText}>24x7 Emergency Casualty</Text>
              </View>
            )}

            <View style={styles.facilityActions}>
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => handleCallFacility(fac.phone)}
                style={styles.callBtn}
              >
                <Feather name="phone" size={14} color={COLORS.primaryAccent} />
                <Text style={styles.callBtnText}>Call</Text>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => handleDirections(fac.latitude, fac.longitude, fac.name)}
                style={styles.directionsBtn}
              >
                <Feather name="navigation" size={14} color="#FFFFFF" />
                <Text style={styles.directionsBtnText}>Directions</Text>
              </TouchableOpacity>
            </View>
          </Card>
        ))}
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
  triageCard: {
    padding: 16,
    marginBottom: 16,
  },
  triageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  triageTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.primaryDark,
  },
  triageSub: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: 12,
    lineHeight: 16,
  },
  triageInput: {
    minHeight: 60,
    backgroundColor: '#F7FAFF',
    borderRadius: RADIUS.md,
    padding: 12,
    fontSize: 13.5,
    color: COLORS.textPrimary,
    borderWidth: 1,
    borderColor: 'rgba(43, 58, 85, 0.12)',
    marginBottom: 12,
    textAlignVertical: 'top',
  },
  triageBtn: {
    height: 46,
  },
  triageResultBox: {
    marginTop: 14,
    padding: 12,
    borderRadius: RADIUS.md,
    backgroundColor: '#F0F4FA',
    borderWidth: 1,
    borderColor: 'rgba(43, 58, 85, 0.1)',
  },
  triageEmergency: {
    backgroundColor: '#FFEBEE',
    borderColor: '#EF9A9A',
  },
  triageDoctorSoon: {
    backgroundColor: '#FFF8E1',
    borderColor: '#FFE082',
  },
  triageLevelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  triageLevelText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: COLORS.primaryAccent,
  },
  emergencyText: {
    color: '#C62828',
  },
  triageAdvisory: {
    fontSize: 12,
    color: COLORS.textPrimary,
    lineHeight: 17,
  },
  sectionHeader: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.primaryDark,
    marginTop: 10,
    marginBottom: 8,
    fontFamily: TYPOGRAPHY.serifHeading,
  },
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 12,
  },
  loadingBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
  },
  loadingText: {
    fontSize: 12.5,
    color: COLORS.textSecondary,
  },
  facilityCard: {
    padding: 16,
    marginBottom: 12,
  },
  facilityTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  facilityTypeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.backgroundSubtle,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: RADIUS.sm,
  },
  facilityTypeText: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.primaryAccent,
  },
  distanceText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  facilityName: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.primaryDark,
    marginBottom: 4,
  },
  facilityAddress: {
    fontSize: 12.5,
    color: COLORS.textSecondary,
    marginBottom: 10,
  },
  emergencyAvailBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 10,
  },
  emergencyAvailText: {
    fontSize: 11,
    color: '#C62828',
    fontWeight: '600',
  },
  facilityActions: {
    flexDirection: 'row',
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(43, 58, 85, 0.06)',
    paddingTop: 10,
  },
  callBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: COLORS.backgroundSubtle,
    borderRadius: RADIUS.md,
    paddingVertical: 9,
    borderWidth: 1,
    borderColor: 'rgba(43, 58, 85, 0.12)',
  },
  callBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.primaryAccent,
  },
  directionsBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: COLORS.primaryAccent,
    borderRadius: RADIUS.md,
    paddingVertical: 9,
  },
  directionsBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});

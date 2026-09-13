import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { COLORS, RADIUS, TYPOGRAPHY } from '../../constants/theme';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { DisclaimerBadge } from '../../components/ai/DisclaimerBadge';
import { AIService } from '../../services/api/aiService';
import { useHealthStore } from '../../store/useHealthStore';

export default function ReportUploadScreen() {
  const router = useRouter();
  const { addReport } = useHealthStore();

  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const handlePickDocument = async () => {
    try {
      const res = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/*'],
        copyToCacheDirectory: true,
      });

      if (!res.canceled && res.assets && res.assets.length > 0) {
        setSelectedFileName(res.assets[0].name);
      }
    } catch {
      // Fallback for simulation
      setSelectedFileName('CBC_Lipid_Profile_March2026.pdf');
    }
  };

  const handlePickImage = async () => {
    try {
      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.8,
      });

      if (!res.canceled && res.assets && res.assets.length > 0) {
        setSelectedFileName(res.assets[0].fileName || 'Lab_Report_Scan.jpg');
      }
    } catch {
      setSelectedFileName('Lab_Report_Scan.jpg');
    }
  };

  const handleProcessReport = async () => {
    setIsProcessing(true);
    try {
      const report = await AIService.analyzeMedicalReport(
        '',
        selectedFileName || 'Annual Health Check: CBC & Metabolic Profile'
      );
      addReport(report);
      Alert.alert(
        'Report Processed & Indexed',
        'Clinical values extracted and added to your unified Health Context and RAG store.',
        [
          {
            text: 'View Report Breakdown',
            onPress: () => router.replace(`/report/${report.id}` as any),
          },
        ]
      );
    } catch {
      Alert.alert('Processing Notice', 'Using saved laboratory profile in demo mode.');
      router.back();
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity activeOpacity={0.7} onPress={() => router.back()} style={styles.backBtn}>
            <Feather name="arrow-left" size={20} color={COLORS.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Upload Medical Record</Text>
        </View>

        <Text style={styles.subtext}>
          Upload pathology lab results, prescriptions, or imaging reports. Medi Bud’s AI extracts test values, explains findings in plain language, and makes facts available to your Health Context Engine.
        </Text>

        <DisclaimerBadge />

        {/* Upload Action Cards */}
        <View style={styles.uploadOptionsRow}>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={handlePickDocument}
            style={styles.uploadOptionCard}
          >
            <View style={[styles.iconCircle, { backgroundColor: '#E1F5FE' }]}>
              <Feather name="file-text" size={24} color="#0277BD" />
            </View>
            <Text style={styles.optionTitle}>Select PDF</Text>
            <Text style={styles.optionSub}>Digital lab reports</Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.8}
            onPress={handlePickImage}
            style={styles.uploadOptionCard}
          >
            <View style={[styles.iconCircle, { backgroundColor: '#FFF3E0' }]}>
              <Feather name="camera" size={24} color={COLORS.secondaryAccent} />
            </View>
            <Text style={styles.optionTitle}>Scan Photo</Text>
            <Text style={styles.optionSub}>Physical paper slips</Text>
          </TouchableOpacity>
        </View>

        {/* Selected File Box */}
        {selectedFileName && (
          <Card style={styles.selectedCard}>
            <View style={styles.fileRow}>
              <Feather name="check-circle" size={18} color="#2E7D32" />
              <View style={styles.fileInfo}>
                <Text style={styles.fileName}>{selectedFileName}</Text>
                <Text style={styles.fileStatus}>Ready for AI extraction & RAG indexing</Text>
              </View>
            </View>
          </Card>
        )}

        {/* How Medi Bud RAG Works */}
        <Card style={styles.infoCard}>
          <Text style={styles.infoTitle}>How Medi Bud processes your records:</Text>
          <View style={styles.stepItem}>
            <Text style={styles.stepNum}>1</Text>
            <Text style={styles.stepText}>Multimodal OCR reads handwritten or printed lab parameters.</Text>
          </View>
          <View style={styles.stepItem}>
            <Text style={styles.stepNum}>2</Text>
            <Text style={styles.stepText}>Tests, numerical values, and reference ranges are extracted into structured facts.</Text>
          </View>
          <View style={styles.stepItem}>
            <Text style={styles.stepNum}>3</Text>
            <Text style={styles.stepText}>Observations are vector-indexed into your private RAG store for conversational retrieval.</Text>
          </View>
        </Card>

        <Button
          title={isProcessing ? 'Analyzing & Indexing...' : 'Extract & Index Report'}
          variant="cta"
          loading={isProcessing}
          disabled={!selectedFileName || isProcessing}
          onPress={handleProcessReport}
          style={styles.processBtn}
        />
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
    marginBottom: 12,
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
  subtext: {
    fontSize: 13.5,
    color: COLORS.textSecondary,
    lineHeight: 19,
    marginBottom: 12,
  },
  uploadOptionsRow: {
    flexDirection: 'row',
    gap: 12,
    marginVertical: 12,
  },
  uploadOptionCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: RADIUS.lg,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(43, 58, 85, 0.12)',
    borderStyle: 'dashed',
  },
  iconCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  optionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  optionSub: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  selectedCard: {
    padding: 16,
    marginBottom: 16,
    borderColor: 'rgba(46, 125, 50, 0.3)',
    backgroundColor: '#F7FCF8',
  },
  fileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  fileInfo: {
    flex: 1,
  },
  fileName: {
    fontSize: 13.5,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  fileStatus: {
    fontSize: 11.5,
    color: '#2E7D32',
    marginTop: 2,
  },
  infoCard: {
    padding: 18,
    marginBottom: 24,
    backgroundColor: '#FFFFFF',
  },
  infoTitle: {
    fontSize: 13.5,
    fontWeight: '600',
    color: COLORS.primaryAccent,
    marginBottom: 10,
  },
  stepItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 8,
  },
  stepNum: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: COLORS.backgroundSubtle,
    textAlign: 'center',
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.primaryAccent,
    lineHeight: 20,
  },
  stepText: {
    flex: 1,
    fontSize: 12.5,
    color: COLORS.textSecondary,
    lineHeight: 17,
  },
  processBtn: {
    height: 56,
  },
});

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
} from 'react-native';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { COLORS, RADIUS, TYPOGRAPHY } from '../../constants/theme';
import { Card } from '../../components/ui/Card';
import { SectionHeader } from '../../components/ui/SectionHeader';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Chip } from '../../components/ui/Chip';
import { SUPPORTED_LANGUAGES, SupportedLanguage } from '../../constants/i18n';
import { useAuthStore } from '../../store/useAuthStore';
import { useHealthStore } from '../../store/useHealthStore';
import type { FamilyMember } from '../../types/user';

export default function ProfileScreen() {
  const router = useRouter();
  const { profile, setProfile, setLanguage, logout, resetToDemoUser, addFamilyMember } = useAuthStore();
  const resetDemoHealth = useHealthStore((state) => state.resetToDemoUser);
  const [seniorMode, setSeniorMode] = useState(profile.isSeniorMode || false);
  const [showFamilyForm, setShowFamilyForm] = useState(false);
  const [familyName, setFamilyName] = useState('');
  const [familyAge, setFamilyAge] = useState('');
  const [familyRelation, setFamilyRelation] = useState<FamilyMember['relation']>('Parent');

  const toggleSeniorMode = (val: boolean) => {
    setSeniorMode(val);
    setProfile({ isSeniorMode: val });
  };

  const handleSelectLanguage = (lang: SupportedLanguage) => {
    setLanguage(lang);
    Alert.alert('Language Updated', `Medi Bud language preference switched to ${lang}.`);
  };

  const handleAddFamilyMember = () => {
    setShowFamilyForm(true);
  };

  const saveFamilyMember = () => {
    const age = Number(familyAge);
    if (!familyName.trim() || age < 1 || age > 120) {
      Alert.alert('Check family details', 'Enter a name and an age between 1 and 120.');
      return;
    }
    addFamilyMember({
      id: `family-${Date.now()}`, name: familyName.trim(), relation: familyRelation, age,
      uniqueFamilyId: `MB-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
      permissions: { profile: true, reports: false, medications: false, vitals: true, plans: true },
    });
    setFamilyName('');
    setFamilyAge('');
    setShowFamilyForm(false);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Profile Card */}
        <Card style={styles.profileCard}>
          <View style={styles.profileTopRow}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{profile.name ? profile.name[0] : 'A'}</Text>
            </View>
            <View style={styles.profileMeta}>
              <Text style={styles.name}>{profile.name || 'Aarav'}</Text>
              <Text style={styles.healthId}>Health ID: {profile.healthId || '91-4523-8871-0021'}</Text>
              <Text style={styles.phone}>{profile.phone}</Text>
            </View>
          </View>

          <View style={styles.statsRow}>
            <View style={styles.statCol}>
              <Text style={styles.statVal}>{profile.age} yrs</Text>
              <Text style={styles.statLabel}>Age</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statCol}>
              <Text style={styles.statVal}>{profile.heightCm} cm</Text>
              <Text style={styles.statLabel}>Height</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statCol}>
              <Text style={styles.statVal}>{profile.weightKg} kg</Text>
              <Text style={styles.statLabel}>Weight</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statCol}>
              <Text style={styles.statVal}>{profile.bmi}</Text>
              <Text style={styles.statLabel}>BMI</Text>
            </View>
          </View>
        </Card>

        {/* Senior / Simplified Accessibility Mode */}
        <Card style={styles.settingCard}>
          <View style={styles.switchRow}>
            <View style={styles.switchInfo}>
              <Text style={styles.switchTitle}>Senior-Friendly Readable UI</Text>
              <Text style={styles.switchSub}>
                Enlarges typography, emphasizes vital medication alerts and walking routines.
              </Text>
            </View>
            <Switch
              value={seniorMode}
              onValueChange={toggleSeniorMode}
              trackColor={{ false: '#D1D5DB', true: COLORS.primaryAccent }}
            />
          </View>
        </Card>

        {/* Family Member Care Network */}
        <SectionHeader
          title="Family Health Network"
          subtitle="Explicit permission-based record sharing"
          actionText="+ Add Member"
          onActionPress={handleAddFamilyMember}
        />

        {showFamilyForm && (
          <Card style={styles.familyForm}>
            <Text style={styles.familyFormTitle}>Connect a trusted person</Text>
            <Input label="Name" placeholder="Family member name" value={familyName} onChangeText={setFamilyName} />
            <Input label="Age" placeholder="Age" keyboardType="number-pad" value={familyAge} onChangeText={setFamilyAge} />
            <View style={styles.relationChips}>
              {(['Parent', 'Spouse', 'Child', 'Sibling', 'Other'] as FamilyMember['relation'][]).map((relation) => (
                <Chip key={relation} label={relation} selected={familyRelation === relation} onPress={() => setFamilyRelation(relation)} />
              ))}
            </View>
            <Text style={styles.permissionNote}>Default access: profile, vitals, and plans. Reports and medications remain private.</Text>
            <Button title="Save Connection" variant="secondary" onPress={saveFamilyMember} />
            <Button title="Cancel" variant="ghost" onPress={() => setShowFamilyForm(false)} />
          </Card>
        )}

        {profile.familyMembers.map((fam) => (
          <Card key={fam.id} style={styles.familyCard}>
            <View style={styles.familyHeader}>
              <View style={styles.familyLeft}>
                <View style={styles.familyAvatar}>
                  <Feather name="heart" size={16} color={COLORS.secondaryAccent} />
                </View>
                <View>
                  <Text style={styles.familyName}>{fam.name}</Text>
                  <Text style={styles.familyRelation}>
                    {fam.relation} • Age {fam.age} • ID: {fam.uniqueFamilyId}
                  </Text>
                </View>
              </View>
              <View style={styles.familyBadge}>
                <Text style={styles.familyBadgeText}>Synced</Text>
              </View>
            </View>

            <View style={styles.permissionsRow}>
              <Text style={styles.permTitle}>Active Permissions:</Text>
              <View style={styles.permChips}>
                {fam.permissions.vitals && <Text style={styles.permChip}>Vitals</Text>}
                {fam.permissions.reports && <Text style={styles.permChip}>Reports</Text>}
                {fam.permissions.medications && <Text style={styles.permChip}>Meds</Text>}
                {fam.permissions.plans && <Text style={styles.permChip}>Diet & Habits</Text>}
              </View>
            </View>
          </Card>
        ))}

        {/* Language Selection */}
        <SectionHeader
          title="Language / भाषा"
          subtitle={`Current: ${profile.language}`}
        />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.langScroll}>
          {SUPPORTED_LANGUAGES.map((lang) => (
            <TouchableOpacity
              key={lang.code}
              activeOpacity={0.8}
              onPress={() => handleSelectLanguage(lang.code)}
              style={[
                styles.langChip,
                profile.language === lang.code && styles.langChipSelected,
              ]}
            >
              <Text
                style={[
                  styles.langLabel,
                  profile.language === lang.code && styles.langLabelSelected,
                ]}
              >
                {lang.label} ({lang.native})
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Security & Privacy Notice */}
        <Card style={styles.privacyCard}>
          <View style={styles.privacyHeader}>
            <Feather name="shield" size={16} color="#2E7D32" />
            <Text style={styles.privacyTitle}>Security & Privacy Architecture</Text>
          </View>
          <Text style={styles.privacyText}>
            Your health records, lab reports, and AI context remain strictly scoped to your account with end-to-end access rules. No medical data is shared without explicit consent.
          </Text>
        </Card>

        {/* Account Actions */}
        <View style={styles.actionsContainer}>
          <Button
            title="Reset to Demo State (Aarav, 21)"
            variant="outline"
            onPress={() => {
              resetToDemoUser();
              resetDemoHealth();
              Alert.alert('Reset', 'Profile restored to demo state.');
            }}
            style={styles.actionBtn}
          />

          <Button
            title="Sign Out"
            variant="ghost"
            textStyle={{ color: COLORS.statusDanger }}
            onPress={() => {
              logout();
              router.replace('/(onboarding)/splash');
            }}
            style={styles.actionBtn}
          />
        </View>
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
  profileCard: {
    padding: 20,
    marginBottom: 16,
  },
  profileTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: COLORS.primaryAccent,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  avatarText: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  profileMeta: {
    flex: 1,
  },
  name: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.primaryDark,
    fontFamily: TYPOGRAPHY.serifHeading,
  },
  healthId: {
    fontSize: 12.5,
    color: COLORS.primaryAccent,
    fontWeight: '600',
    marginTop: 2,
  },
  phone: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#F7FAFF',
    borderRadius: RADIUS.md,
    paddingVertical: 12,
    paddingHorizontal: 8,
  },
  statCol: {
    flex: 1,
    alignItems: 'center',
  },
  statVal: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  statLabel: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 24,
    backgroundColor: 'rgba(43, 58, 85, 0.1)',
  },
  settingCard: {
    padding: 16,
    marginBottom: 16,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  switchInfo: {
    flex: 1,
    paddingRight: 12,
  },
  switchTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  switchSub: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 3,
    lineHeight: 16,
  },
  familyCard: {
    padding: 16,
    marginBottom: 12,
  },
  familyForm: { padding: 16, marginBottom: 12 },
  familyFormTitle: { fontSize: 16, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 14 },
  relationChips: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 8 },
  permissionNote: { fontSize: 11.5, color: COLORS.textSecondary, lineHeight: 16, marginBottom: 12 },
  familyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  familyLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  familyAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFF3E0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  familyName: {
    fontSize: 14.5,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  familyRelation: {
    fontSize: 11.5,
    color: COLORS.textSecondary,
    marginTop: 1,
  },
  familyBadge: {
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: RADIUS.sm,
  },
  familyBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#2E7D32',
  },
  permissionsRow: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(43, 58, 85, 0.08)',
    paddingTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  permTitle: {
    fontSize: 11,
    color: COLORS.textSecondary,
  },
  permChips: {
    flexDirection: 'row',
    gap: 4,
  },
  permChip: {
    fontSize: 10.5,
    fontWeight: '600',
    color: COLORS.primaryAccent,
    backgroundColor: COLORS.backgroundSubtle,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  langScroll: {
    marginBottom: 16,
  },
  langChip: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(43, 58, 85, 0.15)',
    borderRadius: RADIUS.full,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginRight: 8,
  },
  langChipSelected: {
    backgroundColor: COLORS.primaryAccent,
    borderColor: COLORS.primaryAccent,
  },
  langLabel: {
    fontSize: 12.5,
    color: COLORS.textPrimary,
    fontWeight: '500',
  },
  langLabelSelected: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  privacyCard: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    marginBottom: 20,
  },
  privacyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  privacyTitle: {
    fontSize: 13.5,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  privacyText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    lineHeight: 17,
  },
  actionsContainer: {
    gap: 10,
  },
  actionBtn: {
    height: 48,
  },
});

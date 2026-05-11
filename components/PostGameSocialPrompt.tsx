import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Share,
  Platform,
} from 'react-native';
import { Colors } from '@/constants/Colors';
import { Spacing } from '@/constants/Spacing';
import { Button } from '@/components/Button';
import { Users, Share2, X, Zap } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import { useToast } from '@/contexts/ToastContext';
import * as Haptics from 'expo-haptics';

interface PostGameSocialPromptProps {
  visible: boolean;
  onClose: () => void;
  houseId: string;
  houseName: string;
  inviteCode: string;
  playerCount: number;
}

export function PostGameSocialPrompt({
  visible,
  onClose,
  houseId,
  houseName,
  inviteCode,
  playerCount,
}: PostGameSocialPromptProps) {
  const router = useRouter();
  const { showToast } = useToast();

  const handleInviteFriends = async () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }

    const message = `Join me on HouseParty! 🎉\n\nHouse: ${houseName}\nInvite Code: ${inviteCode}\n\nDownload the app and enter the code to join!`;

    try {
      if (Platform.OS === 'web') {
        await Clipboard.setStringAsync(inviteCode);
        showToast('Invite code copied!', 'success');
      } else {
        await Share.share({
          message,
          title: `Join ${houseName} on HouseParty`,
        });
      }
    } catch (error) {
      console.log('Error sharing:', error);
    }
  };

  const handleViewQR = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    onClose();
    router.push(`/qr-code/${houseId}`);
  };

  const isSoloGame = playerCount === 1;

  if (!isSoloGame) {
    return null;
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <X size={24} color={Colors.dark.textSecondary} />
          </TouchableOpacity>

          <View style={styles.iconContainer}>
            <View style={styles.iconCircle}>
              <Users size={48} color={Colors.dark.accent} />
            </View>
          </View>

          <Text style={styles.title}>Nice Game!</Text>
          <Text style={styles.subtitle}>
            But it's way more fun with friends! Invite them to play together.
          </Text>

          <View style={styles.benefits}>
            <View style={styles.benefit}>
              <Zap size={20} color={Colors.dark.accent} />
              <Text style={styles.benefitText}>More competition</Text>
            </View>
            <View style={styles.benefit}>
              <Zap size={20} color={Colors.dark.accent} />
              <Text style={styles.benefitText}>Unlock achievements faster</Text>
            </View>
            <View style={styles.benefit}>
              <Zap size={20} color={Colors.dark.accent} />
              <Text style={styles.benefitText}>Build your house legacy</Text>
            </View>
          </View>

          <View style={styles.inviteCodeContainer}>
            <Text style={styles.inviteCodeLabel}>House Invite Code:</Text>
            <View style={styles.inviteCodeBox}>
              <Text style={styles.inviteCode}>{inviteCode}</Text>
            </View>
          </View>

          <Button
            title="Invite Friends"
            onPress={handleInviteFriends}
            icon={<Share2 size={20} color={Colors.dark.background} />}
          />

          <TouchableOpacity style={styles.secondaryButton} onPress={handleViewQR}>
            <Text style={styles.secondaryButtonText}>Show QR Code Instead</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.skipButton} onPress={onClose}>
            <Text style={styles.skipText}>Maybe later</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  container: {
    backgroundColor: Colors.dark.card,
    borderRadius: 24,
    padding: Spacing.xl,
    width: '100%',
    maxWidth: 400,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  closeButton: {
    position: 'absolute',
    top: Spacing.md,
    right: Spacing.md,
    padding: Spacing.sm,
    zIndex: 1,
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  iconCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: 'rgba(255, 107, 107, 0.1)',
    borderWidth: 2,
    borderColor: Colors.dark.accent,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    color: Colors.dark.text,
    fontSize: 28,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  subtitle: {
    color: Colors.dark.textSecondary,
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: Spacing.xl,
  },
  benefits: {
    gap: Spacing.md,
    marginBottom: Spacing.xl,
  },
  benefit: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  benefitText: {
    color: Colors.dark.text,
    fontSize: 15,
    fontWeight: '500',
  },
  inviteCodeContainer: {
    marginBottom: Spacing.xl,
  },
  inviteCodeLabel: {
    color: Colors.dark.textSecondary,
    fontSize: 14,
    marginBottom: Spacing.sm,
    textAlign: 'center',
  },
  inviteCodeBox: {
    backgroundColor: Colors.dark.background,
    borderRadius: 12,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.dark.accent,
    alignItems: 'center',
  },
  inviteCode: {
    color: Colors.dark.accent,
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: 4,
  },
  secondaryButton: {
    marginTop: Spacing.md,
    padding: Spacing.md,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: Colors.dark.accent,
    fontSize: 15,
    fontWeight: '600',
  },
  skipButton: {
    marginTop: Spacing.sm,
    padding: Spacing.sm,
    alignItems: 'center',
  },
  skipText: {
    color: Colors.dark.textSecondary,
    fontSize: 14,
  },
});

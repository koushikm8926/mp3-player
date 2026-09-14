import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import {
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useLibrary } from '../context/LibraryContext';
import { useSettings, useTheme } from '../context/SettingsContext';

const SUPPORT_EMAIL = 'support@minaxdigital.com';
const GOOGLE_PRIVACY_URL = 'https://policies.google.com/privacy';

/** Open a URL or email link safely. */
function openLink(url) {
  Linking.openURL(url).catch((err) => {
    console.warn('Cannot open URL:', url, err);
  });
}

function LegalHeader({ title, onBack }) {
  const theme = useTheme();
  const library = useLibrary();
  const isDarkUI = Boolean(library?.adminMode) || theme.colors.isDark;
  const textColor = isDarkUI ? '#FFFFFF' : theme.colors.text;

  return (
    <View style={styles.header}>
      <Pressable onPress={onBack} hitSlop={12} style={styles.backButton}>
        <Ionicons name="arrow-back" size={24} color={textColor} />
      </Pressable>
      <Text numberOfLines={1} style={[theme.font.h3, { color: textColor, flex: 1, marginLeft: 12 }]}>
        {title}
      </Text>
    </View>
  );
}

/** Card container for a legal section */
function LegalCard({ title, children, highlight = false }) {
  const theme = useTheme();
  const library = useLibrary();
  const isDarkUI = Boolean(library?.adminMode) || theme.colors.isDark;

  const cardBg = highlight
    ? isDarkUI
      ? 'rgba(139, 92, 246, 0.15)'
      : 'rgba(27, 111, 245, 0.08)'
    : isDarkUI
    ? 'rgba(255, 255, 255, 0.05)'
    : theme.colors.surface;

  const borderColor = highlight
    ? isDarkUI
      ? 'rgba(139, 92, 246, 0.35)'
      : 'rgba(27, 111, 245, 0.25)'
    : isDarkUI
    ? 'rgba(255, 255, 255, 0.1)'
    : theme.colors.border;

  return (
    <View style={[styles.card, { backgroundColor: cardBg, borderColor }]}>
      {title ? (
        <Text
          style={[
            theme.font.h3,
            styles.cardTitle,
            { color: isDarkUI ? '#FFFFFF' : theme.colors.text },
          ]}
        >
          {title}
        </Text>
      ) : null}
      {children}
    </View>
  );
}

/** Bullet item with a subtle marker */
function Bullet({ children, strong }) {
  const theme = useTheme();
  const library = useLibrary();
  const isDarkUI = Boolean(library?.adminMode) || theme.colors.isDark;

  const textColor = isDarkUI ? 'rgba(255, 255, 255, 0.85)' : theme.colors.textSecondary;
  const bulletColor = isDarkUI ? '#C084FC' : theme.colors.accent;

  return (
    <View style={styles.bulletRow}>
      <Text style={[styles.bulletDot, { color: bulletColor }]}>•</Text>
      <Text style={[theme.font.body, styles.bulletText, { color: textColor }]}>
        {strong ? (
          <Text style={{ fontWeight: '700', color: isDarkUI ? '#FFFFFF' : theme.colors.text }}>
            {strong}{' '}
          </Text>
        ) : null}
        {children}
      </Text>
    </View>
  );
}

/** Permission table row */
function PermissionItem({ name, reason }) {
  const theme = useTheme();
  const library = useLibrary();
  const isDarkUI = Boolean(library?.adminMode) || theme.colors.isDark;

  return (
    <View
      style={[
        styles.permissionItem,
        {
          borderColor: isDarkUI ? 'rgba(255, 255, 255, 0.08)' : theme.colors.border,
          backgroundColor: isDarkUI ? 'rgba(255, 255, 255, 0.02)' : 'rgba(0,0,0,0.01)',
        },
      ]}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
        <Ionicons
          name="key-outline"
          size={16}
          color={isDarkUI ? '#C084FC' : theme.colors.accent}
          style={{ marginRight: 6 }}
        />
        <Text
          style={[
            theme.font.title,
            { color: isDarkUI ? '#FFFFFF' : theme.colors.text, fontSize: 14 },
          ]}
        >
          {name}
        </Text>
      </View>
      <Text
        style={[
          theme.font.caption,
          { color: isDarkUI ? 'rgba(255, 255, 255, 0.7)' : theme.colors.textSecondary, lineHeight: 18 },
        ]}
      >
        {reason}
      </Text>
    </View>
  );
}

/** Full-fidelity Privacy Policy Screen matching the web version */
export function PrivacyPolicyScreen({ navigation }) {
  const theme = useTheme();
  const { t } = useSettings();
  const insets = useSafeAreaInsets();
  const library = useLibrary();
  const isDarkUI = Boolean(library?.adminMode) || theme.colors.isDark;

  const textSec = isDarkUI ? 'rgba(255, 255, 255, 0.78)' : theme.colors.textSecondary;
  const linkColor = isDarkUI ? '#C084FC' : theme.colors.accent;

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: isDarkUI ? '#090713' : theme.colors.background,
        paddingTop: insets.top,
      }}
    >
      <LegalHeader title={t('privacyPolicy')} onBack={() => navigation.goBack()} />

      <ScrollView
        contentContainerStyle={[
          styles.scrollContainer,
          { paddingBottom: insets.bottom + 48 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerBlock}>
          <Text style={[theme.font.h1, { color: isDarkUI ? '#FFFFFF' : theme.colors.text }]}>
            Privacy Policy
          </Text>
          <Text style={[theme.font.caption, styles.metaText, { color: theme.colors.textTertiary }]}>
            Effective date: 13 September 2026
          </Text>
        </View>

        {/* Short version highlight card */}
        <LegalCard title="The Short Version" highlight>
          <Bullet>
            Your music, playlists, favourites, and listening history stay on your phone.
          </Bullet>
          <Bullet>
            You can use Melophile without an account. We only receive your email address, name, and account ID if you choose to sign in.
          </Bullet>
          <Bullet>
            The app has no ads, no analytics or tracking tools, and we never sell your information.
          </Bullet>
          <Bullet>
            You can delete your account at any time from Settings → Delete account.
          </Bullet>
        </LegalCard>

        {/* 1. Who we are */}
        <LegalCard title="1. Who We Are">
          <Text style={[theme.font.body, styles.para, { color: textSec }]}>
            Melophile is a music player app for Android published by{' '}
            <Text style={{ fontWeight: '700', color: isDarkUI ? '#FFFFFF' : theme.colors.text }}>
              Minax Digital Pvt. Ltd.
            </Text>{' '}
            (“Minax Digital”, “we”, “us”), WeWork, B Narayanapura, Mahadevapura, Bengaluru 560016, India.
          </Text>
          <Text style={[theme.font.body, styles.para, { color: textSec }]}>
            This policy explains what information the Melophile app handles, why, and the choices you have. It applies to the Melophile app and our legal web pages.
          </Text>
        </LegalCard>

        {/* 2. Information we collect */}
        <LegalCard title="2. Information We Collect">
          <Text style={[theme.font.title, styles.subheading, { color: isDarkUI ? '#FFFFFF' : theme.colors.text }]}>
            If you create an account or sign in:
          </Text>
          <Bullet strong="Email and password sign-up:">
            your email address, the name you enter, and an account ID. Your password is handled by Google Firebase Authentication; we never see or store it.
          </Bullet>
          <Bullet strong="Sign in with Google:">
            with your permission, Google shares your name, email address, and profile picture, and we receive an account ID.
          </Bullet>

          <Text style={[theme.font.title, styles.subheading, { color: isDarkUI ? '#FFFFFF' : theme.colors.text, marginTop: 14 }]}>
            If you continue as a guest:
          </Text>
          <Text style={[theme.font.body, styles.para, { color: textSec }]}>
            We do not collect any account information. Everything you do in the app stays on your phone.
          </Text>

          <Text style={[theme.font.title, styles.subheading, { color: isDarkUI ? '#FFFFFF' : theme.colors.text, marginTop: 14 }]}>
            What we do not collect:
          </Text>
          <Bullet>Your music files. They are never uploaded.</Bullet>
          <Bullet>Your location, contacts, photos, or microphone. Audio recording is blocked in the app.</Bullet>
          <Bullet>Advertising IDs. The app shows no ads and contains no analytics, crash-reporting, or tracking tools.</Bullet>
          <Bullet>Payment information. The app has no purchases or subscriptions.</Bullet>

          <View style={[styles.callout, { backgroundColor: isDarkUI ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)' }]}>
            <Text style={[theme.font.caption, { color: textSec, lineHeight: 18 }]}>
              Note: This version of the app does not send your listening activity or usage statistics to our servers. If a future version adds online features, such as streaming, we will update this policy before those features are released.
            </Text>
          </View>
        </LegalCard>

        {/* 3. Information that stays on your device */}
        <LegalCard title="3. Information That Stays on Your Device">
          <Text style={[theme.font.body, styles.para, { color: textSec }]}>
            To work as a music player, the app creates and uses the following information only on your phone, inside the app’s private storage. We do not receive it:
          </Text>
          <Bullet>Audio files on your device and their details (title, artist, album, genre, duration, and folder).</Bullet>
          <Bullet>Your playlists, favourites, and hidden songs or folders.</Bullet>
          <Bullet>Listening history, play counts, and your playback queue.</Bullet>
          <Bullet>Recent searches, app settings, and equalizer preferences.</Bullet>
          <Text style={[theme.font.body, styles.para, { color: textSec, marginTop: 10 }]}>
            <Text style={{ fontWeight: '700', color: isDarkUI ? '#FFFFFF' : theme.colors.text }}>Backups: </Text>
            if you use Backup & restore, the app creates a file containing your playlists, favourites, hidden items, listening history, and settings. You choose where to save or share that file. We do not receive it.
          </Text>
        </LegalCard>

        {/* 4. App permissions */}
        <LegalCard title="4. App Permissions">
          <Text style={[theme.font.body, styles.para, { color: textSec, marginBottom: 12 }]}>
            Melophile requests only the Android permissions necessary to function as an offline music player:
          </Text>
          <PermissionItem
            name="Music & Audio / Storage"
            reason="To find and play the audio files stored on your device (READ_MEDIA_AUDIO / READ_EXTERNAL_STORAGE)."
          />
          <PermissionItem
            name="Notifications"
            reason="To show persistent playback controls (play, pause, skip) in the notification shade while music plays."
          />
          <PermissionItem
            name="Foreground Service & Wake Lock"
            reason="To keep playing music seamlessly in the background when the screen is locked or while multitasking."
          />
          <PermissionItem
            name="Modify Audio Settings"
            reason="To power the built-in system equalizer, bass boost, and audio effects."
          />
          <PermissionItem
            name="Vibration / Haptics"
            reason="For subtle haptic feedback when interacting with buttons and sliders."
          />
          <PermissionItem
            name="Internet & Network State"
            reason="Used strictly for authentication (sign in with email or Google) and account deletion requests."
          />
          <View style={[styles.callout, { backgroundColor: isDarkUI ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)', marginTop: 8 }]}>
            <Text style={[theme.font.caption, { color: textSec, lineHeight: 18 }]}>
              You can revoke permissions at any time in your phone’s system settings. Without music and audio access, the app cannot index your library.
            </Text>
          </View>
        </LegalCard>

        {/* 5. How we use information */}
        <LegalCard title="5. How We Use Information">
          <Text style={[theme.font.body, styles.para, { color: textSec }]}>
            We use account information only to:
          </Text>
          <Bullet>create your account and sign you in;</Bullet>
          <Bullet>let you delete your account;</Bullet>
          <Bullet>respond when you contact our support team; and</Bullet>
          <Bullet>comply with legal obligations and prevent misuse of our services.</Bullet>
        </LegalCard>

        {/* 6. Sharing and service providers */}
        <LegalCard title="6. Sharing and Service Providers">
          <Text style={[theme.font.body, styles.para, { color: textSec }]}>
            We do not sell, rent, or trade your personal information. We share it only with:
          </Text>
          <Bullet strong="Google Firebase Authentication:">
            (Google LLC), which securely stores and verifies account credentials on our behalf.
          </Bullet>
          <Bullet strong="Google Sign-In:">
            if you voluntarily choose to authenticate with your Google Account.
          </Bullet>
          <Bullet strong="Authorities:">
            when required by law or court order, or to protect the safety and rights of our users.
          </Bullet>
          <Pressable
            onPress={() => openLink(GOOGLE_PRIVACY_URL)}
            style={styles.linkButton}
          >
            <Ionicons name="open-outline" size={16} color={linkColor} style={{ marginRight: 6 }} />
            <Text style={[theme.font.caption, { color: linkColor, fontWeight: '600' }]}>
              View Google Privacy Policy
            </Text>
          </Pressable>
        </LegalCard>

        {/* 7. Storage and security */}
        <LegalCard title="7. Storage and Security">
          <Text style={[theme.font.body, styles.para, { color: textSec }]}>
            Account information is transmitted exclusively over encrypted HTTPS connections and secured via Google Firebase. Data kept on your phone resides within the app’s sandboxed private storage, which other apps cannot access.
          </Text>
          <Text style={[theme.font.body, styles.para, { color: textSec }]}>
            No method of transmission or storage is 100% immune to risk, but we apply industry-standard best practices to safeguard your data.
          </Text>
        </LegalCard>

        {/* 8. Retention */}
        <LegalCard title="8. How Long We Keep Information">
          <Bullet strong="Account Information:">
            kept for as long as your account remains active. When you delete your account in the app, it is purged immediately from Firebase. If requested by email, we complete deletion within 30 days.
          </Bullet>
          <Bullet strong="Information on Your Phone:">
            persists until you clear app cache/data, delete your account in the app, or uninstall the app.
          </Bullet>
        </LegalCard>

        {/* 9. Your choices and rights */}
        <LegalCard title="9. Your Choices and Rights">
          <Bullet strong="Guest mode:">use the app fully without creating an account.</Bullet>
          <Bullet strong="Delete account:">
            instant self-service deletion directly from Settings → Delete account.
          </Bullet>
          <Bullet strong="Google Access:">
            revoke access anytime via your Google Account security permissions.
          </Bullet>
          <Bullet strong="Data subject rights:">
            Under India’s Digital Personal Data Protection Act (DPDP Act 2023) and global privacy regulations, you have rights to access, correct, and erase your personal data, and to withdraw consent.
          </Bullet>
          <Pressable
            onPress={() => openLink(`mailto:${SUPPORT_EMAIL}`)}
            style={styles.linkButton}
          >
            <Ionicons name="mail-outline" size={16} color={linkColor} style={{ marginRight: 6 }} />
            <Text style={[theme.font.caption, { color: linkColor, fontWeight: '600' }]}>
              Contact Data Protection Officer ({SUPPORT_EMAIL})
            </Text>
          </Pressable>
        </LegalCard>

        {/* 10. Children */}
        <LegalCard title="10. Children’s Privacy">
          <Text style={[theme.font.body, styles.para, { color: textSec }]}>
            Melophile is not directed at children under the age of 13, and we do not knowingly collect personal information from children. If you believe a minor has registered an account, contact us and we will promptly remove it.
          </Text>
        </LegalCard>

        {/* 11. Changes */}
        <LegalCard title="11. Changes to This Policy">
          <Text style={[theme.font.body, styles.para, { color: textSec }]}>
            We may update this policy periodically. We will update the effective date above and, for significant modifications, notify users via in-app banner or Play Store update release notes.
          </Text>
        </LegalCard>

        {/* 12. Contact us */}
        <LegalCard title="12. Contact Us">
          <Text style={[theme.font.body, styles.para, { color: textSec }]}>
            <Text style={{ fontWeight: '700', color: isDarkUI ? '#FFFFFF' : theme.colors.text }}>
              Minax Digital Pvt. Ltd.{'\n'}
            </Text>
            WeWork, B Narayanapura, Mahadevapura, Bengaluru 560016, India
          </Text>
          <Pressable
            onPress={() => openLink(`mailto:${SUPPORT_EMAIL}`)}
            style={[
              styles.contactButton,
              { backgroundColor: isDarkUI ? 'rgba(139, 92, 246, 0.2)' : theme.colors.surfaceAlt },
            ]}
          >
            <Ionicons name="mail" size={18} color={linkColor} style={{ marginRight: 8 }} />
            <Text style={[theme.font.title, { color: linkColor, fontSize: 14 }]}>
              {SUPPORT_EMAIL}
            </Text>
          </Pressable>
        </LegalCard>
      </ScrollView>
    </View>
  );
}

/** Full-fidelity Terms & Conditions Screen matching the web version */
export function TermsScreen({ navigation }) {
  const theme = useTheme();
  const { t } = useSettings();
  const insets = useSafeAreaInsets();
  const library = useLibrary();
  const isDarkUI = Boolean(library?.adminMode) || theme.colors.isDark;

  const textSec = isDarkUI ? 'rgba(255, 255, 255, 0.78)' : theme.colors.textSecondary;
  const linkColor = isDarkUI ? '#C084FC' : theme.colors.accent;

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: isDarkUI ? '#090713' : theme.colors.background,
        paddingTop: insets.top,
      }}
    >
      <LegalHeader title={t('termsOfService')} onBack={() => navigation.goBack()} />

      <ScrollView
        contentContainerStyle={[
          styles.scrollContainer,
          { paddingBottom: insets.bottom + 48 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerBlock}>
          <Text style={[theme.font.h1, { color: isDarkUI ? '#FFFFFF' : theme.colors.text }]}>
            Terms & Conditions
          </Text>
          <Text style={[theme.font.caption, styles.metaText, { color: theme.colors.textTertiary }]}>
            Effective date: 13 September 2026
          </Text>
        </View>

        {/* 1. Agreement */}
        <LegalCard title="1. Agreement">
          <Text style={[theme.font.body, styles.para, { color: textSec }]}>
            These Terms & Conditions (“Terms”) represent a binding legal agreement between you and{' '}
            <Text style={{ fontWeight: '700', color: isDarkUI ? '#FFFFFF' : theme.colors.text }}>
              Minax Digital Pvt. Ltd.
            </Text>{' '}
            (“Minax Digital”, “we”, “us”) regarding your use of the Melophile application (“the app”).
          </Text>
          <Text style={[theme.font.body, styles.para, { color: textSec }]}>
            By downloading, installing, or using the app, you agree to be bound by these Terms and our Privacy Policy. If you do not agree, please do not use the app.
          </Text>
        </LegalCard>

        {/* 2. The App */}
        <LegalCard title="2. The App">
          <Text style={[theme.font.body, styles.para, { color: textSec }]}>
            Melophile is a high-performance music player designed to play audio files already stored on your local device. It empowers you to organize your music library, create custom playlists, bookmark favourites, fine-tune audio with a built-in equalizer, and back up your listening preferences. Online cloud streaming is not part of this version.
          </Text>
        </LegalCard>

        {/* 3. Who Can Use */}
        <LegalCard title="3. Eligibility">
          <Text style={[theme.font.body, styles.para, { color: textSec }]}>
            You must be at least 13 years old to use the app. If you are under 18, you may only use the app under the supervision and consent of a parent or legal guardian.
          </Text>
        </LegalCard>

        {/* 4. Your Account */}
        <LegalCard title="4. Your Account">
          <Bullet>Creating an account is optional. You can use all core player features as a guest.</Bullet>
          <Bullet>If you create an account, you agree to provide accurate information and safeguard your credentials. You are responsible for all activity conducted through your account.</Bullet>
          <Bullet>You may delete your account at any time directly in Settings → Delete account.</Bullet>
        </LegalCard>

        {/* 5. Your Music */}
        <LegalCard title="5. Your Music & Content">
          <Text style={[theme.font.body, styles.para, { color: textSec }]}>
            The app does not provide, host, sell, distribute, or stream copyrighted music tracks. You are solely responsible for ensuring that you own or hold the legal rights to play all audio files accessed through the application, and for complying with applicable copyright laws.
          </Text>
        </LegalCard>

        {/* 6. Acceptable Use */}
        <LegalCard title="6. Acceptable Use">
          <Text style={[theme.font.body, styles.para, { color: textSec }]}>
            You agree that you will not:
          </Text>
          <Bullet>Use the app for any unlawful or fraudulent purpose;</Bullet>
          <Bullet>Copy, modify, redistribute, sublicense, or resell any part of the application;</Bullet>
          <Bullet>Reverse engineer, decompile, or attempt to extract the source code, except where strictly permitted by applicable law;</Bullet>
          <Bullet>Interfere with, disable, or circumvent any app security mechanisms;</Bullet>
          <Bullet>Transmit viruses, malware, or harmful automated bots through the app services.</Bullet>
        </LegalCard>

        {/* 7. Licence and Ownership */}
        <LegalCard title="7. Licence & Ownership">
          <Text style={[theme.font.body, styles.para, { color: textSec }]}>
            Minax Digital grants you a personal, non-exclusive, non-transferable, revocable licence to install and use Melophile on devices you own or control. The app’s architecture, interface design, code, branding, and assets remain the exclusive intellectual property of Minax Digital Pvt. Ltd. and its licensors.
          </Text>
        </LegalCard>

        {/* 8. Third-Party Services */}
        <LegalCard title="8. Third-Party Services">
          <Text style={[theme.font.body, styles.para, { color: textSec }]}>
            The application interacts with third-party services including Google Play Services, Google Sign-In, and Google Firebase. Your usage of these integrations is additionally governed by their respective terms and privacy policies.
          </Text>
        </LegalCard>

        {/* 9. Updates and Availability */}
        <LegalCard title="9. Updates & Service Changes">
          <Text style={[theme.font.body, styles.para, { color: textSec }]}>
            We may release updates, patches, enhancements, or modifications at any time. Certain updates may be necessary for continued functionality. We do not guarantee uninterrupted availability on every hardware device or Android OS version.
          </Text>
        </LegalCard>

        {/* 10. Your Data */}
        <LegalCard title="10. Device Data & Backups">
          <Text style={[theme.font.body, styles.para, { color: textSec }]}>
            Your playlists, favourites, hidden list, and listening logs are stored locally on your device. Clearing app storage, resetting your device, or uninstalling the app may delete this data. We strongly recommend using the built-in Backup & restore feature to preserve your library preferences. Minax Digital is not liable for device-level data loss.
          </Text>
        </LegalCard>

        {/* 11. Termination */}
        <LegalCard title="11. Termination">
          <Text style={[theme.font.body, styles.para, { color: textSec }]}>
            You may terminate your agreement at any time by ceasing use of the app and deleting your account. Minax Digital reserves the right to suspend or terminate access if you breach these Terms.
          </Text>
        </LegalCard>

        {/* 12. Disclaimer */}
        <LegalCard title="12. Disclaimer of Warranties">
          <Text style={[theme.font.body, styles.para, { color: textSec }]}>
            Melophile is provided on an “AS IS” and “AS AVAILABLE” basis. To the maximum extent permitted by applicable law, Minax Digital disclaims all warranties, express or implied, including fitness for a particular purpose, merchantability, and non-infringement.
          </Text>
        </LegalCard>

        {/* 13. Limitation of Liability */}
        <LegalCard title="13. Limitation of Liability">
          <Text style={[theme.font.body, styles.para, { color: textSec }]}>
            To the maximum extent permitted by law, Minax Digital shall not be liable for indirect, incidental, special, consequential, or punitive damages, or loss of data, arising out of your use or inability to use the app. Our aggregate liability shall not exceed the amount paid by you for the app (if any).
          </Text>
        </LegalCard>

        {/* 14. Governing Law */}
        <LegalCard title="14. Governing Law & Jurisdiction">
          <Text style={[theme.font.body, styles.para, { color: textSec }]}>
            These Terms are governed by and construed in accordance with the laws of the Republic of India. Any disputes arising out of or in connection with these Terms shall be subject to the exclusive jurisdiction of the competent courts in Bengaluru, Karnataka, India.
          </Text>
        </LegalCard>

        {/* 15. Changes */}
        <LegalCard title="15. Changes to These Terms">
          <Text style={[theme.font.body, styles.para, { color: textSec }]}>
            We reserve the right to amend these Terms as needed. Material changes will be indicated with an updated effective date and communicated via in-app notice or Play Store updates. Continued use of Melophile constitutes your acceptance of the revised Terms.
          </Text>
        </LegalCard>

        {/* 16. Contact */}
        <LegalCard title="16. Contact Us">
          <Text style={[theme.font.body, styles.para, { color: textSec }]}>
            <Text style={{ fontWeight: '700', color: isDarkUI ? '#FFFFFF' : theme.colors.text }}>
              Minax Digital Pvt. Ltd.{'\n'}
            </Text>
            WeWork, B Narayanapura, Mahadevapura, Bengaluru 560016, India
          </Text>
          <Pressable
            onPress={() => openLink(`mailto:${SUPPORT_EMAIL}`)}
            style={[
              styles.contactButton,
              { backgroundColor: isDarkUI ? 'rgba(139, 92, 246, 0.2)' : theme.colors.surfaceAlt },
            ]}
          >
            <Ionicons name="mail" size={18} color={linkColor} style={{ marginRight: 8 }} />
            <Text style={[theme.font.title, { color: linkColor, fontSize: 14 }]}>
              {SUPPORT_EMAIL}
            </Text>
          </Pressable>
        </LegalCard>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  backButton: {
    padding: 4,
  },
  scrollContainer: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  headerBlock: {
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  metaText: {
    marginTop: 4,
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 18,
    marginBottom: 14,
  },
  cardTitle: {
    marginBottom: 10,
  },
  subheading: {
    marginBottom: 8,
  },
  para: {
    lineHeight: 21,
    marginBottom: 8,
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  bulletDot: {
    fontSize: 18,
    lineHeight: 20,
    marginRight: 8,
    fontWeight: '700',
  },
  bulletText: {
    flex: 1,
    lineHeight: 20,
  },
  permissionItem: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
  },
  callout: {
    borderRadius: 10,
    padding: 12,
    marginTop: 6,
  },
  linkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    paddingVertical: 6,
  },
  contactButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginTop: 10,
  },
});

import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Dimensions,
} from 'react-native';
import { Emergency } from '../types';
import { alarmService } from '../services/alarm';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useTheme, getThemeColors } from '../context/ThemeContext';

interface Props {
  emergency: Emergency;
  onParticipate: () => void;
  onDecline: () => void;
  onDismiss: () => void;
}

const EmergencyAlertScreen: React.FC<Props> = ({
  emergency,
  onParticipate,
  onDecline,
  onDismiss,
}) => {
  const { theme } = useTheme();
  const themeColors = getThemeColors(theme);

  useEffect(() => {
    // Start alarm sound when component mounts
    alarmService.play();

    return () => {
      // Stop alarm when component unmounts
      alarmService.stop();
    };
  }, []);

  const handleParticipate = () => {
    alarmService.stop();
    onParticipate();
  };

  const handleDecline = () => {
    alarmService.stop();
    onDecline();
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={[styles.header, { 
        backgroundColor: theme.colors.primary,
        borderBottomColor: themeColors.onPrimaryText,
      }]}>
        <Icon name="warning" size={60} color={themeColors.onPrimaryText} />
        <Text style={[styles.headerTitle, { color: themeColors.onPrimaryText }]}>EINSATZ</Text>
        <Text style={[styles.keyword, { color: themeColors.onPrimaryText }]}>{emergency.emergencyKeyword}</Text>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        <View style={[styles.infoSection, { backgroundColor: theme.colors.surface }]}>
          <View style={styles.infoRow}>
            <Text style={[styles.label, { color: theme.colors.textSecondary }]}>Einsatznummer:</Text>
            <Text style={[styles.value, { color: theme.colors.text }]}>{emergency.emergencyNumber}</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={[styles.label, { color: theme.colors.textSecondary }]}>Datum:</Text>
            <Text style={[styles.value, { color: theme.colors.text }]}>{emergency.emergencyDate}</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={[styles.label, { color: theme.colors.textSecondary }]}>Ort:</Text>
            <Text style={[styles.value, { color: theme.colors.text }]}>{emergency.emergencyLocation}</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={[styles.label, { color: theme.colors.textSecondary }]}>Beschreibung:</Text>
            <Text style={[styles.value, { color: theme.colors.text }]}>{emergency.emergencyDescription}</Text>
          </View>
        </View>
      </ScrollView>

      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[styles.button, { backgroundColor: theme.colors.success }]}
          onPress={handleParticipate}>
          <Icon name="check-circle" size={30} color={themeColors.onPrimaryText} />
          <Text style={[styles.buttonText, { color: themeColors.onPrimaryText }]}>TEILNEHMEN</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, { backgroundColor: theme.colors.inactive }]}
          onPress={handleDecline}>
          <Icon name="cancel" size={30} color={themeColors.onPrimaryText} />
          <Text style={[styles.buttonText, { color: themeColors.onPrimaryText }]}>NICHT VERFÜGBAR</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.dismissButton} onPress={onDismiss}>
        <Text style={[styles.dismissText, { color: theme.colors.textSecondary }]}>Später antworten</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingVertical: 30,
    paddingHorizontal: 20,
    alignItems: 'center',
    borderBottomWidth: 3,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    marginTop: 10,
  },
  keyword: {
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 10,
    textAlign: 'center',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
  },
  infoSection: {
    borderRadius: 10,
    padding: 20,
  },
  infoRow: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    marginBottom: 5,
    textTransform: 'uppercase',
  },
  value: {
    fontSize: 18,
    fontWeight: '500',
  },
  buttonContainer: {
    flexDirection: 'row',
    padding: 20,
    gap: 10,
  },
  button: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    borderRadius: 10,
    gap: 10,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  dismissButton: {
    padding: 15,
    alignItems: 'center',
  },
  dismissText: {
    fontSize: 14,
  },
});

export default EmergencyAlertScreen;

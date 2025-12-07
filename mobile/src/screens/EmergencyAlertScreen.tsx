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
    <View style={styles.container}>
      <View style={styles.header}>
        <Icon name="warning" size={60} color="#dc3545" />
        <Text style={styles.headerTitle}>EINSATZ</Text>
        <Text style={styles.keyword}>{emergency.emergencyKeyword}</Text>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        <View style={styles.infoSection}>
          <View style={styles.infoRow}>
            <Text style={styles.label}>Einsatznummer:</Text>
            <Text style={styles.value}>{emergency.emergencyNumber}</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.label}>Datum:</Text>
            <Text style={styles.value}>{emergency.emergencyDate}</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.label}>Ort:</Text>
            <Text style={styles.value}>{emergency.emergencyLocation}</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.label}>Beschreibung:</Text>
            <Text style={styles.value}>{emergency.emergencyDescription}</Text>
          </View>
        </View>
      </ScrollView>

      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[styles.button, styles.participateButton]}
          onPress={handleParticipate}>
          <Icon name="check-circle" size={30} color="#ffffff" />
          <Text style={styles.buttonText}>TEILNEHMEN</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.declineButton]}
          onPress={handleDecline}>
          <Icon name="cancel" size={30} color="#ffffff" />
          <Text style={styles.buttonText}>NICHT VERFÜGBAR</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.dismissButton} onPress={onDismiss}>
        <Text style={styles.dismissText}>Später antworten</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a1a',
  },
  header: {
    backgroundColor: '#dc3545',
    paddingVertical: 30,
    paddingHorizontal: 20,
    alignItems: 'center',
    borderBottomWidth: 3,
    borderBottomColor: '#ffffff',
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#ffffff',
    marginTop: 10,
  },
  keyword: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
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
    backgroundColor: '#2a2a2a',
    borderRadius: 10,
    padding: 20,
  },
  infoRow: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    color: '#999999',
    marginBottom: 5,
    textTransform: 'uppercase',
  },
  value: {
    fontSize: 18,
    color: '#ffffff',
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
  participateButton: {
    backgroundColor: '#28a745',
  },
  declineButton: {
    backgroundColor: '#6c757d',
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  dismissButton: {
    padding: 15,
    alignItems: 'center',
  },
  dismissText: {
    color: '#999999',
    fontSize: 14,
  },
});

export default EmergencyAlertScreen;

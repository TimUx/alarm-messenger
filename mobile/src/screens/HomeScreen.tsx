import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Modal,
  Pressable,
} from 'react-native';
import { Emergency } from '../types';
import { emergencyService } from '../services/api';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useTheme, ThemeMode, getThemeColors } from '../context/ThemeContext';

interface Props {
  onEmergencyPress: (emergency: Emergency) => void;
}

const HomeScreen: React.FC<Props> = ({ onEmergencyPress }) => {
  const { theme, themeMode, setThemeMode } = useTheme();
  const themeColors = getThemeColors(theme);
  const [emergencies, setEmergencies] = useState<Emergency[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [showThemeModal, setShowThemeModal] = useState(false);

  useEffect(() => {
    loadEmergencies();
  }, []);

  const loadEmergencies = async () => {
    try {
      const data = await emergencyService.getEmergencies();
      setEmergencies(data);
    } catch (error) {
      console.error('Failed to load emergencies:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadEmergencies();
    setRefreshing(false);
  };

  const handleThemeChange = (mode: ThemeMode) => {
    setThemeMode(mode);
    setShowThemeModal(false);
  };

  const getThemeIcon = () => {
    if (themeMode === 'auto') return 'brightness-auto';
    if (themeMode === 'dark') return 'brightness-2';
    return 'brightness-7';
  };

  const renderEmergencyItem = ({ item }: { item: Emergency }) => (
    <TouchableOpacity
      style={[styles.emergencyCard, { 
        backgroundColor: theme.colors.surface,
        borderLeftColor: theme.colors.primary,
      }]}
      onPress={() => onEmergencyPress(item)}>
      <View style={styles.cardHeader}>
        <Icon name="warning" size={24} color={theme.colors.primary} />
        <Text style={[styles.keyword, { color: theme.colors.text }]}>{item.emergencyKeyword}</Text>
      </View>
      <View style={styles.cardBody}>
        <Text style={[styles.location, { color: theme.colors.text }]}>{item.emergencyLocation}</Text>
        <Text style={[styles.description, { color: theme.colors.textSecondary }]} numberOfLines={2}>
          {item.emergencyDescription}
        </Text>
        <Text style={[styles.date, { color: theme.colors.textSecondary }]}>{item.emergencyDate}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={[styles.header, { 
        backgroundColor: theme.colors.surface,
        borderBottomColor: theme.colors.border,
      }]}>
        <View>
          <Text style={[styles.title, { color: theme.colors.text }]}>Alarm Messenger</Text>
          <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>Einsatzübersicht</Text>
        </View>
        <TouchableOpacity
          onPress={() => setShowThemeModal(true)}
          style={styles.themeButton}>
          <Icon name={getThemeIcon()} size={28} color={theme.colors.text} />
        </TouchableOpacity>
      </View>

      <FlatList
        data={emergencies}
        renderItem={renderEmergencyItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh}
            tintColor={theme.colors.text}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Icon name="inbox" size={60} color={theme.colors.textSecondary} />
            <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>Keine Einsätze vorhanden</Text>
          </View>
        }
      />

      <Modal
        visible={showThemeModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowThemeModal(false)}>
        <Pressable 
          style={[styles.modalOverlay, { backgroundColor: themeColors.overlayBackground }]}
          onPress={() => setShowThemeModal(false)}>
          <View 
            style={[styles.modalContent, { backgroundColor: theme.colors.surface }]}
            onStartShouldSetResponder={() => true}>
            <Text style={[styles.modalTitle, { color: theme.colors.text }]}>Theme auswählen</Text>
            
            <TouchableOpacity
              style={[
                styles.themeOption,
                themeMode === 'light' && { backgroundColor: themeColors.primaryLight }
              ]}
              onPress={() => handleThemeChange('light')}>
              <Icon name="brightness-7" size={24} color={theme.colors.text} />
              <Text style={[styles.themeOptionText, { color: theme.colors.text }]}>Hell</Text>
              {themeMode === 'light' && <Icon name="check" size={24} color={theme.colors.primary} />}
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.themeOption,
                themeMode === 'dark' && { backgroundColor: themeColors.primaryLight }
              ]}
              onPress={() => handleThemeChange('dark')}>
              <Icon name="brightness-2" size={24} color={theme.colors.text} />
              <Text style={[styles.themeOptionText, { color: theme.colors.text }]}>Dunkel</Text>
              {themeMode === 'dark' && <Icon name="check" size={24} color={theme.colors.primary} />}
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.themeOption,
                themeMode === 'auto' && { backgroundColor: themeColors.primaryLight }
              ]}
              onPress={() => handleThemeChange('auto')}>
              <Icon name="brightness-auto" size={24} color={theme.colors.text} />
              <Text style={[styles.themeOptionText, { color: theme.colors.text }]}>Automatisch</Text>
              {themeMode === 'auto' && <Icon name="check" size={24} color={theme.colors.primary} />}
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 20,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
  },
  themeButton: {
    padding: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  subtitle: {
    fontSize: 14,
    marginTop: 5,
  },
  listContent: {
    padding: 15,
  },
  emergencyCard: {
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
    borderLeftWidth: 4,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 10,
  },
  keyword: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  cardBody: {
    gap: 5,
  },
  location: {
    fontSize: 16,
    fontWeight: '500',
  },
  description: {
    fontSize: 14,
  },
  date: {
    fontSize: 12,
    marginTop: 5,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    marginTop: 15,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    borderRadius: 10,
    padding: 20,
    width: '80%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  themeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
    gap: 15,
  },
  themeOptionText: {
    fontSize: 16,
    flex: 1,
  },
});

export default HomeScreen;

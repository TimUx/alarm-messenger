import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { Emergency } from '../types';
import { emergencyService } from '../services/api';
import Icon from 'react-native-vector-icons/MaterialIcons';

interface Props {
  onEmergencyPress: (emergency: Emergency) => void;
}

const HomeScreen: React.FC<Props> = ({ onEmergencyPress }) => {
  const [emergencies, setEmergencies] = useState<Emergency[]>([]);
  const [refreshing, setRefreshing] = useState(false);

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

  const renderEmergencyItem = ({ item }: { item: Emergency }) => (
    <TouchableOpacity
      style={styles.emergencyCard}
      onPress={() => onEmergencyPress(item)}>
      <View style={styles.cardHeader}>
        <Icon name="warning" size={24} color="#dc3545" />
        <Text style={styles.keyword}>{item.emergencyKeyword}</Text>
      </View>
      <View style={styles.cardBody}>
        <Text style={styles.location}>{item.emergencyLocation}</Text>
        <Text style={styles.description} numberOfLines={2}>
          {item.emergencyDescription}
        </Text>
        <Text style={styles.date}>{item.emergencyDate}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Alarm Messenger</Text>
        <Text style={styles.subtitle}>Einsatzübersicht</Text>
      </View>

      <FlatList
        data={emergencies}
        renderItem={renderEmergencyItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Icon name="inbox" size={60} color="#666666" />
            <Text style={styles.emptyText}>Keine Einsätze vorhanden</Text>
          </View>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a1a',
  },
  header: {
    backgroundColor: '#2a2a2a',
    paddingVertical: 20,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#444444',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  subtitle: {
    fontSize: 14,
    color: '#999999',
    marginTop: 5,
  },
  listContent: {
    padding: 15,
  },
  emergencyCard: {
    backgroundColor: '#2a2a2a',
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
    borderLeftWidth: 4,
    borderLeftColor: '#dc3545',
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
    color: '#ffffff',
  },
  cardBody: {
    gap: 5,
  },
  location: {
    fontSize: 16,
    color: '#ffffff',
    fontWeight: '500',
  },
  description: {
    fontSize: 14,
    color: '#cccccc',
  },
  date: {
    fontSize: 12,
    color: '#999999',
    marginTop: 5,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    color: '#666666',
    marginTop: 15,
  },
});

export default HomeScreen;

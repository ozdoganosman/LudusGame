import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';

// Gladyatör tipleri
const GLADIATOR_TYPES = [
  { id: 'retiarius', name: 'Retiarius', emoji: '🎣', description: 'Ağ ve üç dişli mızrak kullanır', baseStats: { strength: 3, agility: 5, endurance: 4, intelligence: 2 } },
  { id: 'secutor', name: 'Secutor', emoji: '🛡️', description: 'Ağır zırh ve kılıç kullanır', baseStats: { strength: 5, agility: 2, endurance: 5, intelligence: 3 } },
  { id: 'murmillo', name: 'Murmillo', emoji: '⚔️', description: 'Balık başlı miğfer ve kılıç', baseStats: { strength: 4, agility: 3, endurance: 4, intelligence: 3 } },
  { id: 'thraex', name: 'Thraex', emoji: '🗡️', description: 'Küçük kalkan ve kavisli kılıç', baseStats: { strength: 3, agility: 4, endurance: 3, intelligence: 4 } },
];

// Örnek gladyatörler
const SAMPLE_GLADIATORS = [
  { id: 1, name: 'Spartacus', type: 'retiarius', level: 3, stats: { strength: 4, agility: 6, endurance: 5, intelligence: 3 }, equipment: { weapon: 'Trident', armor: 'Leather', helmet: 'None', boots: 'Sandals' } },
  { id: 2, name: 'Maximus', type: 'secutor', level: 2, stats: { strength: 6, agility: 2, endurance: 6, intelligence: 3 }, equipment: { weapon: 'Gladius', armor: 'Heavy', helmet: 'Full', boots: 'Heavy' } },
];

export default function BarracksScreen() {
  const router = useRouter();
  const [gladiators, setGladiators] = useState(SAMPLE_GLADIATORS);
  const [selectedGladiator, setSelectedGladiator] = useState(null);

  const recruitGladiator = (type: string) => {
    const gladiatorType = GLADIATOR_TYPES.find(t => t.id === type);
    if (!gladiatorType) return;
    
    const newGladiator = {
      id: Date.now(),
      name: `${gladiatorType.name} ${gladiators.length + 1}`,
      type: type,
      level: 1,
      stats: { ...gladiatorType.baseStats },
      equipment: { weapon: 'Basic', armor: 'None', helmet: 'None', boots: 'None' }
    };
    setGladiators([...gladiators, newGladiator]);
    Alert.alert('Başarılı', `${newGladiator.name} işe alındı!`);
  };

  const openGladiatorDetail = (gladiator: any) => {
    setSelectedGladiator(gladiator);
    // Gladyatör detay sayfasına yönlendir
    router.push(`/gladiator/${gladiator.id}` as any);
  };

  return (
    <ThemedView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backText}>← Geri</Text>
        </TouchableOpacity>
        <ThemedText type="title" style={styles.title}>🏛️ Barracks</ThemedText>
        <View style={styles.headerRight}>
          <Text style={styles.levelText}>Level 1</Text>
        </View>
      </View>

      {/* Gladyatör listesi */}
      <ScrollView style={styles.gladiatorsContainer}>
        <ThemedText type="subtitle" style={styles.sectionTitle}>Gladyatörleriniz</ThemedText>
        
        {gladiators.map((gladiator) => (
          <TouchableOpacity
            key={gladiator.id}
            style={styles.gladiatorCard}
            onPress={() => openGladiatorDetail(gladiator)}
          >
            <View style={styles.gladiatorInfo}>
              <View style={styles.gladiatorAvatar}>
                <Text style={styles.gladiatorEmoji}>
                  {GLADIATOR_TYPES.find(t => t.id === gladiator.type)?.emoji}
                </Text>
                <View style={styles.levelBadge}>
                  <Text style={styles.levelBadgeText}>{gladiator.level}</Text>
                </View>
              </View>
              <View style={styles.gladiatorDetails}>
                <ThemedText type="subtitle" style={styles.gladiatorName}>{gladiator.name}</ThemedText>
                <Text style={styles.gladiatorType}>
                  {GLADIATOR_TYPES.find(t => t.id === gladiator.type)?.name}
                </Text>
                <View style={styles.statsRow}>
                  <View style={styles.statItem}>
                    <Text style={styles.statIcon}>💪</Text>
                    <Text style={styles.statValue}>{gladiator.stats.strength}</Text>
                  </View>
                  <View style={styles.statItem}>
                    <Text style={styles.statIcon}>🏃</Text>
                    <Text style={styles.statValue}>{gladiator.stats.agility}</Text>
                  </View>
                  <View style={styles.statItem}>
                    <Text style={styles.statIcon}>❤️</Text>
                    <Text style={styles.statValue}>{gladiator.stats.endurance}</Text>
                  </View>
                  <View style={styles.statItem}>
                    <Text style={styles.statIcon}>🧠</Text>
                    <Text style={styles.statValue}>{gladiator.stats.intelligence}</Text>
                  </View>
                </View>
              </View>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* İşe alma bölümü */}
      <View style={styles.recruitSection}>
        <ThemedText type="subtitle" style={styles.sectionTitle}>Yeni Gladyatör İşe Al</ThemedText>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.recruitScroll}>
          {GLADIATOR_TYPES.map((type) => (
            <TouchableOpacity
              key={type.id}
              style={styles.recruitCard}
              onPress={() => recruitGladiator(type.id)}
            >
              <View style={styles.recruitIcon}>
                <Text style={styles.recruitEmoji}>{type.emoji}</Text>
              </View>
              <ThemedText style={styles.recruitName}>{type.name}</ThemedText>
              <Text style={styles.recruitCost}>💰 100</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#2C1810',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    paddingTop: 50,
    backgroundColor: '#8B4513',
    borderBottomWidth: 3,
    borderBottomColor: '#654321',
  },
  backButton: {
    marginRight: 15,
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  backText: {
    fontSize: 16,
    color: '#FFD700',
    fontWeight: 'bold',
  },
  title: {
    flex: 1,
    textAlign: 'center',
    color: '#FFD700',
    fontSize: 24,
    fontWeight: 'bold',
    textShadowColor: '#000',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  headerRight: {
    marginLeft: 15,
  },
  levelText: {
    fontSize: 14,
    color: '#DEB887',
    fontWeight: 'bold',
  },
  gladiatorsContainer: {
    flex: 1,
    padding: 15,
    backgroundColor: '#654321',
  },
  sectionTitle: {
    marginBottom: 15,
    color: '#FFD700',
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  gladiatorCard: {
    backgroundColor: '#8B4513',
    borderRadius: 15,
    padding: 15,
    marginBottom: 15,
    borderWidth: 2,
    borderColor: '#FFD700',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 5,
  },
  gladiatorInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  gladiatorAvatar: {
    position: 'relative',
    marginRight: 15,
  },
  gladiatorEmoji: {
    fontSize: 50,
    backgroundColor: '#FFD700',
    width: 70,
    height: 70,
    borderRadius: 35,
    textAlign: 'center',
    lineHeight: 70,
  },
  levelBadge: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: '#DC143C',
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFD700',
  },
  levelBadgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  gladiatorDetails: {
    flex: 1,
  },
  gladiatorName: {
    color: '#FFD700',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  gladiatorType: {
    fontSize: 14,
    color: '#DEB887',
    marginBottom: 10,
    fontStyle: 'italic',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statItem: {
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    minWidth: 40,
  },
  statIcon: {
    fontSize: 16,
    marginBottom: 2,
  },
  statValue: {
    fontSize: 12,
    color: '#FFD700',
    fontWeight: 'bold',
  },
  recruitSection: {
    padding: 15,
    backgroundColor: '#2C1810',
    borderTopWidth: 2,
    borderTopColor: '#654321',
  },
  recruitScroll: {
    marginTop: 10,
  },
  recruitCard: {
    backgroundColor: '#8B4513',
    borderRadius: 15,
    padding: 15,
    marginRight: 10,
    alignItems: 'center',
    minWidth: 90,
    borderWidth: 2,
    borderColor: '#FFD700',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  recruitIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#FFD700',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  recruitEmoji: {
    fontSize: 24,
  },
  recruitName: {
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 5,
    color: '#FFD700',
    fontWeight: 'bold',
  },
  recruitCost: {
    fontSize: 10,
    color: '#DEB887',
    fontWeight: 'bold',
  },
});

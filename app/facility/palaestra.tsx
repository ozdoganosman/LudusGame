import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';

// Antrenman aletleri
const TRAINING_EQUIPMENT = [
  { id: 'strength', name: 'Güç Aleti', emoji: '🏋️', description: 'Kas gücü geliştirir', cost: 50, level: 1, maxLevel: 5, assignedGladiator: null },
  { id: 'agility', name: 'Çeviklik Aleti', emoji: '🏃', description: 'Hız ve refleks geliştirir', cost: 50, level: 1, maxLevel: 5, assignedGladiator: null },
  { id: 'endurance', name: 'Dayanıklılık Aleti', emoji: '❤️', description: 'Stamina geliştirir', cost: 50, level: 1, maxLevel: 5, assignedGladiator: null },
  { id: 'intelligence', name: 'Zeka Aleti', emoji: '🧠', description: 'Strateji ve taktik geliştirir', cost: 50, level: 1, maxLevel: 5, assignedGladiator: null },
];

// Örnek gladyatörler (Barracks'tan alınacak)
const SAMPLE_GLADIATORS = [
  { id: 1, name: 'Spartacus', type: 'retiarius', stats: { strength: 4, agility: 6, endurance: 5, intelligence: 3 } },
  { id: 2, name: 'Maximus', type: 'secutor', stats: { strength: 6, agility: 2, endurance: 6, intelligence: 3 } },
];

export default function PalaestraScreen() {
  const router = useRouter();
  const [equipment, setEquipment] = useState(TRAINING_EQUIPMENT);
  const [gladiators, setGladiators] = useState(SAMPLE_GLADIATORS);
  const [showGladiatorSelect, setShowGladiatorSelect] = useState(null);

  const buyEquipment = (equipmentId) => {
    const targetEquipment = equipment.find(eq => eq.id === equipmentId);
    if (targetEquipment.level < targetEquipment.maxLevel) {
      setEquipment(prev => prev.map(eq => 
        eq.id === equipmentId 
          ? { ...eq, level: eq.level + 1 }
          : eq
      ));
      Alert.alert('Başarılı', `${targetEquipment.name} geliştirildi!`);
    }
  };

  const assignGladiator = (equipmentId, gladiatorId) => {
    const gladiator = gladiators.find(g => g.id === gladiatorId);
    setEquipment(prev => prev.map(eq => 
      eq.id === equipmentId 
        ? { ...eq, assignedGladiator: gladiator }
        : eq
    ));
    setShowGladiatorSelect(null);
    Alert.alert('Başarılı', `${gladiator.name} ${equipment.find(e => e.id === equipmentId).name}'e atandı!`);
  };

  const removeGladiator = (equipmentId) => {
    setEquipment(prev => prev.map(eq => 
      eq.id === equipmentId 
        ? { ...eq, assignedGladiator: null }
        : eq
    ));
  };

  const trainGladiators = () => {
    // Turn geçişinde gladyatörlerin özelliklerini geliştir
    equipment.forEach(eq => {
      if (eq.assignedGladiator) {
        const statToImprove = eq.id; // strength, agility, endurance, intelligence
        setGladiators(prev => prev.map(g => 
          g.id === eq.assignedGladiator.id
            ? { ...g, stats: { ...g.stats, [statToImprove]: g.stats[statToImprove] + 1 } }
            : g
        ));
      }
    });
    Alert.alert('Antrenman Tamamlandı', 'Gladyatörleriniz gelişti!');
  };

  return (
    <ThemedView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backText}>← Geri</Text>
        </TouchableOpacity>
        <ThemedText type="title" style={styles.title}>🏋️ Palaestra</ThemedText>
        <TouchableOpacity onPress={trainGladiators} style={styles.trainButton}>
          <Text style={styles.trainButtonText}>Antrenman</Text>
        </TouchableOpacity>
      </View>

      {/* Antrenman aletleri */}
      <ScrollView style={styles.equipmentContainer}>
        <ThemedText type="subtitle" style={styles.sectionTitle}>Antrenman Aletleri</ThemedText>
        
        {equipment.map((eq) => (
          <View key={eq.id} style={styles.equipmentCard}>
            <View style={styles.equipmentHeader}>
              <Text style={styles.equipmentEmoji}>{eq.emoji}</Text>
              <View style={styles.equipmentInfo}>
                <ThemedText type="subtitle">{eq.name}</ThemedText>
                <Text style={styles.equipmentDescription}>{eq.description}</Text>
                <Text style={styles.equipmentLevel}>Level {eq.level}/{eq.maxLevel}</Text>
              </View>
              <TouchableOpacity 
                style={styles.upgradeButton}
                onPress={() => buyEquipment(eq.id)}
              >
                <Text style={styles.upgradeButtonText}>Geliştir</Text>
              </TouchableOpacity>
            </View>

            {/* Atanmış gladyatör */}
            {eq.assignedGladiator ? (
              <View style={styles.assignedGladiator}>
                <Text style={styles.assignedText}>Atanmış: {eq.assignedGladiator.name}</Text>
                <TouchableOpacity 
                  style={styles.removeButton}
                  onPress={() => removeGladiator(eq.id)}
                >
                  <Text style={styles.removeButtonText}>Çıkar</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity 
                style={styles.assignButton}
                onPress={() => setShowGladiatorSelect(eq.id)}
              >
                <Text style={styles.assignButtonText}>Gladyatör Ata</Text>
              </TouchableOpacity>
            )}
          </View>
        ))}
      </ScrollView>

      {/* Gladyatör seçim modalı */}
      {showGladiatorSelect && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <ThemedText type="subtitle" style={styles.modalTitle}>Gladyatör Seç</ThemedText>
            {gladiators.map((gladiator) => (
              <TouchableOpacity
                key={gladiator.id}
                style={styles.gladiatorOption}
                onPress={() => assignGladiator(showGladiatorSelect, gladiator.id)}
              >
                <Text style={styles.gladiatorEmoji}>
                  {gladiator.type === 'retiarius' ? '🎣' : 
                   gladiator.type === 'secutor' ? '🛡️' : 
                   gladiator.type === 'murmillo' ? '⚔️' : '🗡️'}
                </Text>
                <View style={styles.gladiatorOptionInfo}>
                  <ThemedText>{gladiator.name}</ThemedText>
                  <View style={styles.gladiatorStats}>
                    <Text style={styles.stat}>💪 {gladiator.stats.strength}</Text>
                    <Text style={styles.stat}>🏃 {gladiator.stats.agility}</Text>
                    <Text style={styles.stat}>❤️ {gladiator.stats.endurance}</Text>
                    <Text style={styles.stat}>🧠 {gladiator.stats.intelligence}</Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
            <TouchableOpacity 
              style={styles.cancelButton}
              onPress={() => setShowGladiatorSelect(null)}
            >
              <Text style={styles.cancelButtonText}>İptal</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 50,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#ccc',
  },
  backButton: {
    marginRight: 15,
  },
  backText: {
    fontSize: 16,
    color: '#007AFF',
  },
  title: {
    flex: 1,
    textAlign: 'center',
  },
  trainButton: {
    backgroundColor: '#28a745',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 8,
  },
  trainButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  equipmentContainer: {
    flex: 1,
    padding: 15,
  },
  sectionTitle: {
    marginBottom: 15,
  },
  equipmentCard: {
    backgroundColor: '#f5f5f5',
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  equipmentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  equipmentEmoji: {
    fontSize: 40,
    marginRight: 15,
  },
  equipmentInfo: {
    flex: 1,
  },
  equipmentDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  equipmentLevel: {
    fontSize: 12,
    color: '#007AFF',
    fontWeight: 'bold',
  },
  upgradeButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  upgradeButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  assignedGladiator: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#e8f5e8',
    padding: 10,
    borderRadius: 8,
  },
  assignedText: {
    fontSize: 14,
    color: '#28a745',
    fontWeight: 'bold',
  },
  removeButton: {
    backgroundColor: '#dc3545',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 5,
  },
  removeButtonText: {
    color: 'white',
    fontSize: 12,
  },
  assignButton: {
    backgroundColor: '#ffc107',
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  assignButtonText: {
    color: '#333',
    fontWeight: 'bold',
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 20,
    width: '80%',
    maxHeight: '70%',
  },
  modalTitle: {
    textAlign: 'center',
    marginBottom: 15,
  },
  gladiatorOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  gladiatorEmoji: {
    fontSize: 30,
    marginRight: 15,
  },
  gladiatorOptionInfo: {
    flex: 1,
  },
  gladiatorStats: {
    flexDirection: 'row',
    marginTop: 5,
  },
  stat: {
    fontSize: 12,
    marginRight: 10,
  },
  cancelButton: {
    backgroundColor: '#6c757d',
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 15,
  },
  cancelButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
});

import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';

// Üretim istasyonları
const PRODUCTION_STATIONS = [
  { id: 'forge', name: 'Fırın', emoji: '🔥', description: 'Metal eritme ve şekillendirme', level: 1, maxLevel: 5, isActive: false },
  { id: 'metallurgy', name: 'Metalize İstasyonu', emoji: '⚒️', description: 'Metal alaşımları üretimi', level: 1, maxLevel: 5, isActive: false },
  { id: 'research', name: 'Araştırma İstasyonu', emoji: '🔬', description: 'Yeni teknolojiler geliştirme', level: 1, maxLevel: 5, isActive: false },
];

// Usta bilgisi
const CRAFTSMAN = {
  name: 'Vulcan',
  level: 1,
  maxLevel: 10,
  experience: 0,
  experienceToNext: 100,
  isWorking: false,
  currentTask: null,
};

// Ekipman tipleri
const EQUIPMENT_TYPES = [
  { id: 'weapon', name: 'Silah', emoji: '⚔️', materials: ['Bronze', 'Iron', 'Steel'], tiers: ['Basic', 'Improved', 'Masterwork'] },
  { id: 'armor', name: 'Zırh', emoji: '🛡️', materials: ['Leather', 'Bronze', 'Iron'], tiers: ['Basic', 'Improved', 'Masterwork'] },
  { id: 'helmet', name: 'Kask', emoji: '⛑️', materials: ['Leather', 'Bronze', 'Iron'], tiers: ['Basic', 'Improved', 'Masterwork'] },
  { id: 'boots', name: 'Ayakkabı', emoji: '👢', materials: ['Leather', 'Bronze', 'Iron'], tiers: ['Basic', 'Improved', 'Masterwork'] },
];

// Hammaddeler
const MATERIALS = [
  { id: 'bronze', name: 'Bronze', emoji: '🥉', quantity: 10, cost: 50 },
  { id: 'copper', name: 'Copper', emoji: '🟠', quantity: 15, cost: 30 },
  { id: 'brass', name: 'Brass', emoji: '🟡', quantity: 8, cost: 40 },
  { id: 'iron', name: 'Iron', emoji: '⚫', quantity: 5, cost: 100 },
];

export default function ArmoryScreen() {
  const router = useRouter();
  const [stations, setStations] = useState(PRODUCTION_STATIONS);
  const [craftsman, setCraftsman] = useState(CRAFTSMAN);
  const [materials, setMaterials] = useState(MATERIALS);
  const [showProductionModal, setShowProductionModal] = useState(false);
  const [selectedEquipment, setSelectedEquipment] = useState(null);

  const upgradeStation = (stationId) => {
    setStations(prev => prev.map(station => 
      station.id === stationId && station.level < station.maxLevel
        ? { ...station, level: station.level + 1 }
        : station
    ));
    Alert.alert('Başarılı', 'İstasyon geliştirildi!');
  };

  const upgradeCraftsman = () => {
    if (craftsman.experience >= craftsman.experienceToNext && craftsman.level < craftsman.maxLevel) {
      setCraftsman(prev => ({
        ...prev,
        level: prev.level + 1,
        experience: prev.experience - prev.experienceToNext,
        experienceToNext: prev.experienceToNext * 1.5,
      }));
      Alert.alert('Başarılı', `${craftsman.name} seviye atladı!`);
    }
  };

  const startProduction = (equipmentType, material, tier) => {
    if (craftsman.isWorking) {
      Alert.alert('Usta Meşgul', 'Usta şu anda başka bir işle meşgul!');
      return;
    }

    const materialData = materials.find(m => m.id === material);
    if (materialData.quantity < 1) {
      Alert.alert('Yetersiz Malzeme', 'Yeterli hammadde yok!');
      return;
    }

    // Malzemeyi kullan
    setMaterials(prev => prev.map(m => 
      m.id === material 
        ? { ...m, quantity: m.quantity - 1 }
        : m
    ));

    // Ustayı çalıştır
    setCraftsman(prev => ({
      ...prev,
      isWorking: true,
      currentTask: { equipmentType, material, tier },
    }));

    // 3 saniye sonra üretimi tamamla
    setTimeout(() => {
      setCraftsman(prev => ({
        ...prev,
        isWorking: false,
        currentTask: null,
        experience: prev.experience + 25,
      }));
      Alert.alert('Üretim Tamamlandı', `${tier} ${material} ${equipmentType} üretildi!`);
    }, 3000);
  };

  const buyMaterial = (materialId) => {
    const material = materials.find(m => m.id === materialId);
    setMaterials(prev => prev.map(m => 
      m.id === materialId 
        ? { ...m, quantity: m.quantity + 1 }
        : m
    ));
    Alert.alert('Başarılı', `${material.name} satın alındı!`);
  };

  return (
    <ThemedView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backText}>← Geri</Text>
        </TouchableOpacity>
        <ThemedText type="title" style={styles.title}>⚒️ Armory</ThemedText>
        <TouchableOpacity onPress={() => setShowProductionModal(true)} style={styles.produceButton}>
          <Text style={styles.produceButtonText}>Üret</Text>
        </TouchableOpacity>
      </View>

      {/* Usta bilgisi */}
      <View style={styles.craftsmanSection}>
        <View style={styles.craftsmanCard}>
          <Text style={styles.craftsmanEmoji}>👨‍🏭</Text>
          <View style={styles.craftsmanInfo}>
            <ThemedText type="subtitle">{craftsman.name}</ThemedText>
            <Text style={styles.craftsmanLevel}>Level {craftsman.level}/{craftsman.maxLevel}</Text>
            <View style={styles.experienceBar}>
              <View style={[styles.experienceFill, { width: `${(craftsman.experience / craftsman.experienceToNext) * 100}%` }]} />
            </View>
            <Text style={styles.experienceText}>{craftsman.experience}/{craftsman.experienceToNext} XP</Text>
          </View>
          <TouchableOpacity 
            style={styles.upgradeCraftsmanButton}
            onPress={upgradeCraftsman}
          >
            <Text style={styles.upgradeButtonText}>Geliştir</Text>
          </TouchableOpacity>
        </View>
        
        {craftsman.isWorking && (
          <View style={styles.workingStatus}>
            <Text style={styles.workingText}>🔄 Çalışıyor: {craftsman.currentTask?.tier} {craftsman.currentTask?.material} {craftsman.currentTask?.equipmentType}</Text>
          </View>
        )}
      </View>

      {/* İstasyonlar */}
      <ScrollView style={styles.stationsContainer}>
        <ThemedText type="subtitle" style={styles.sectionTitle}>Üretim İstasyonları</ThemedText>
        
        {stations.map((station) => (
          <View key={station.id} style={styles.stationCard}>
            <View style={styles.stationHeader}>
              <Text style={styles.stationEmoji}>{station.emoji}</Text>
              <View style={styles.stationInfo}>
                <ThemedText type="subtitle">{station.name}</ThemedText>
                <Text style={styles.stationDescription}>{station.description}</Text>
                <Text style={styles.stationLevel}>Level {station.level}/{station.maxLevel}</Text>
              </View>
              <TouchableOpacity 
                style={styles.upgradeStationButton}
                onPress={() => upgradeStation(station.id)}
              >
                <Text style={styles.upgradeButtonText}>Geliştir</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </ScrollView>

      {/* Hammaddeler */}
      <View style={styles.materialsSection}>
        <ThemedText type="subtitle" style={styles.sectionTitle}>Hammaddeler</ThemedText>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {materials.map((material) => (
            <TouchableOpacity
              key={material.id}
              style={styles.materialCard}
              onPress={() => buyMaterial(material.id)}
            >
              <Text style={styles.materialEmoji}>{material.emoji}</Text>
              <ThemedText style={styles.materialName}>{material.name}</ThemedText>
              <Text style={styles.materialQuantity}>{material.quantity}</Text>
              <Text style={styles.materialCost}>💰 {material.cost}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Üretim modalı */}
      {showProductionModal && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <ThemedText type="subtitle" style={styles.modalTitle}>Ekipman Üret</ThemedText>
            
            {EQUIPMENT_TYPES.map((equipment) => (
              <View key={equipment.id} style={styles.equipmentSection}>
                <ThemedText style={styles.equipmentTitle}>
                  {equipment.emoji} {equipment.name}
                </ThemedText>
                
                {equipment.materials.map((material) => (
                  <View key={material} style={styles.materialRow}>
                    <Text style={styles.materialLabel}>{material}:</Text>
                    {equipment.tiers.map((tier) => (
                      <TouchableOpacity
                        key={tier}
                        style={styles.produceButton}
                        onPress={() => startProduction(equipment.name, material.toLowerCase(), tier)}
                      >
                        <Text style={styles.produceButtonText}>{tier}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                ))}
              </View>
            ))}
            
            <TouchableOpacity 
              style={styles.cancelButton}
              onPress={() => setShowProductionModal(false)}
            >
              <Text style={styles.cancelButtonText}>Kapat</Text>
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
  produceButton: {
    backgroundColor: '#28a745',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 8,
  },
  produceButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  craftsmanSection: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#ccc',
  },
  craftsmanCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderRadius: 10,
    padding: 15,
    borderWidth: 1,
    borderColor: '#dee2e6',
  },
  craftsmanEmoji: {
    fontSize: 40,
    marginRight: 15,
  },
  craftsmanInfo: {
    flex: 1,
  },
  craftsmanLevel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  experienceBar: {
    height: 8,
    backgroundColor: '#e9ecef',
    borderRadius: 4,
    marginBottom: 5,
  },
  experienceFill: {
    height: '100%',
    backgroundColor: '#007AFF',
    borderRadius: 4,
  },
  experienceText: {
    fontSize: 12,
    color: '#666',
  },
  upgradeCraftsmanButton: {
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
  workingStatus: {
    backgroundColor: '#fff3cd',
    padding: 10,
    borderRadius: 8,
    marginTop: 10,
  },
  workingText: {
    fontSize: 14,
    color: '#856404',
    textAlign: 'center',
  },
  stationsContainer: {
    flex: 1,
    padding: 15,
  },
  sectionTitle: {
    marginBottom: 15,
  },
  stationCard: {
    backgroundColor: '#f5f5f5',
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  stationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stationEmoji: {
    fontSize: 40,
    marginRight: 15,
  },
  stationInfo: {
    flex: 1,
  },
  stationDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  stationLevel: {
    fontSize: 12,
    color: '#007AFF',
    fontWeight: 'bold',
  },
  upgradeStationButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  materialsSection: {
    padding: 15,
    borderTopWidth: 1,
    borderTopColor: '#ccc',
  },
  materialCard: {
    backgroundColor: '#e8f4fd',
    borderRadius: 10,
    padding: 15,
    marginRight: 10,
    alignItems: 'center',
    minWidth: 80,
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  materialEmoji: {
    fontSize: 30,
    marginBottom: 5,
  },
  materialName: {
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 5,
  },
  materialQuantity: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  materialCost: {
    fontSize: 10,
    color: '#007AFF',
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
    width: '90%',
    maxHeight: '80%',
  },
  modalTitle: {
    textAlign: 'center',
    marginBottom: 20,
  },
  equipmentSection: {
    marginBottom: 20,
  },
  equipmentTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  materialRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    paddingLeft: 10,
  },
  materialLabel: {
    fontSize: 14,
    width: 80,
  },
  produceButton: {
    backgroundColor: '#28a745',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginRight: 5,
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

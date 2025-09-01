import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';

// Tesis pozisyonları // bu kısımla sakın oynama!!!!!!!!!!!!
const FACILITIES = [
  { 
    id: 'shrine', 
    name: 'Shrine', 
    description: 'Tapınak ve dua', 
    level: 1, 
    maxLevel: 5,
    position: { top: 68, left: 10 },
    size: { width: 60, height: 32 }
  },
  { 
    id: 'medicus', 
    name: 'Medicus', 
    description: 'Sağlık ve tedavi', 
    level: 1, 
    maxLevel: 5,
    position: { top: 88, left: 243 },
    size: { width: 75, height: 35 }
  },
  { 
    id: 'kitchen', 
    name: 'Kitchen', 
    description: 'Yemek ve beslenme', 
    level: 1, 
    maxLevel: 5,
    position: { top: 150, left: 325},
    size: { width: 73, height: 35 }
  },
  { 
    id: 'palaestra', 
    name: 'Palaestra', 
    description: 'Antrenman alanı', 
    level: 1, 
    maxLevel: 5,
    position: { top: 200, left: 175 },
    size: { width: 75, height: 35 }
  },
  { 
    id: 'armory', 
    name: 'Armory', 
    description: 'Silah ve zırh üretimi', 
    level: 1, 
    maxLevel: 5,
    position: { top: 265, left: 320 },
    size: { width: 75, height: 35 }
  },
  { 
    id: 'yard', 
    name: 'Yard', 
    description: 'Avlu ve toplanma yeri', 
    level: 1, 
    maxLevel: 5,
    position: { top: 325, left: 210 },
    size: { width: 75, height: 35 }
  },
  { 
    id: 'barracks', 
    name: 'Barracks', 
    description: 'Gladyatörlerin eğitildiği yer', 
    level: 1, 
    maxLevel: 5,
    position: { top: 310, left: 20 },
    size: { width: 88, height: 35 }
  },
];

export default function VillageScreen() {
  const router = useRouter();
  const [facilities, setFacilities] = useState(FACILITIES);
  const [debugMode, setDebugMode] = useState(false);

  const handleFacilityPress = (facilityId: string) => {
    router.push(`/facility/${facilityId}` as any);
  };

  const upgradeFacility = (facilityId: string) => {
    setFacilities(prev => prev.map(facility => 
      facility.id === facilityId && facility.level < facility.maxLevel
        ? { ...facility, level: facility.level + 1 }
        : facility
    ));
  };

  return (
    <ThemedView style={styles.container}>
      {/* Üst bilgi paneli */}
      <View style={styles.header}>
        <ThemedText type="title" style={styles.title}>🏛️ Ludus Village</ThemedText>
        <View style={styles.resources}>
          <View style={styles.resourceItem}>
            <Text style={styles.resourceIcon}>💰</Text>
            <Text style={styles.resourceValue}>1000</Text>
          </View>
          <View style={styles.resourceItem}>
            <Text style={styles.resourceIcon}>⚔️</Text>
            <Text style={styles.resourceValue}>5</Text>
          </View>
          <View style={styles.resourceItem}>
            <Text style={styles.resourceIcon}>🛡️</Text>
            <Text style={styles.resourceValue}>3</Text>
          </View>
          <TouchableOpacity 
            style={styles.debugButton}
            onPress={() => setDebugMode(!debugMode)}
          >
            <Text style={styles.debugButtonText}>{debugMode ? '🔍 Debug' : '🔧 Debug'}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Köy görünümü */}
      <View style={styles.villageContainer}>
        <Image 
          source={require('@/assets/images/Arsenica Antiqua.png')}
          style={styles.villageImage}
          resizeMode="contain"
        />
        
        {/* Tesisler - görsel üzerinde konumlandırılmış */}
        {facilities.map((facility) => (
          <TouchableOpacity
            key={facility.id}
            style={[
              styles.facilityButton,
              {
                position: 'absolute',
                width: facility.size.width,
                height: facility.size.height,
                top: facility.position.top,
                left: facility.position.left,
                ...(debugMode && {
                  backgroundColor: 'rgba(255, 0, 0, 0.6)',
                  borderWidth: 3,
                  borderColor: '#FF0000',
                  shadowColor: '#FF0000',
                  shadowOffset: { width: 0, height: 0 },
                  shadowOpacity: 0.8,
                  shadowRadius: 5,
                  elevation: 8,
                }),
              } as any
            ]}
            activeOpacity={0.7}
            onPress={() => handleFacilityPress(facility.id)}
            onLongPress={() => upgradeFacility(facility.id)}
          >
            <View style={styles.facilityOverlay}>
              <Text style={styles.facilityName}>{facility.name}</Text>
              <Text style={styles.facilityLevel}>Lv.{facility.level}</Text>
              {debugMode && (
                <Text style={styles.debugInfo}>
                  {facility.position.top},{facility.position.left}
                </Text>
              )}
            </View>
          </TouchableOpacity>
        ))}
      </View>

      {/* Alt bilgi paneli */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>Tesislere dokunun • Uzun basarak geliştirin</Text>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#8B4513',
    paddingTop: 50,
    paddingBottom: 15,
    paddingHorizontal: 20,
    borderBottomWidth: 2,
    borderBottomColor: '#654321',
  },
  title: {
    textAlign: 'center',
    color: '#FFD700',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
    textShadowColor: '#000',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  resources: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 10,
    padding: 10,
  },
  resourceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.9)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
    minWidth: 60,
    justifyContent: 'center',
  },
  resourceIcon: {
    fontSize: 16,
    marginRight: 4,
  },
  resourceValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
  },
  debugButton: {
    backgroundColor: 'rgba(255,255,255,0.9)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginLeft: 10,
  },
  debugButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  villageContainer: {
    flex: 1,
    position: 'relative',
    backgroundColor: '#DEB887',
    width: 400,
    height: 600,
    alignSelf: 'center',
  },
  villageImage: {
    width: 400,
    height: 600,
    resizeMode: 'cover',
  },
  facilityButton: {
    backgroundColor: 'rgba(255, 215, 0, 0.25)',
    borderWidth: 2,
    borderColor: '#FFD700',
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 4,
  },
  facilityOverlay: {
    backgroundColor: 'rgba(0,0,0,0.9)',
    borderRadius: 3,
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: '#FFD700',
  },
  facilityName: {
    color: '#FFD700',
    fontSize: 7,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 1,
  },
  facilityLevel: {
    color: '#FFD700',
    fontSize: 8,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  debugInfo: {
    color: '#FF0000',
    fontSize: 6,
    fontWeight: 'bold',
    textAlign: 'center',
    marginTop: 1,
  },
  footer: {
    backgroundColor: '#8B4513',
    padding: 15,
    alignItems: 'center',
    borderTopWidth: 2,
    borderTopColor: '#654321',
  },
  footerText: {
    color: '#FFD700',
    fontSize: 12,
    textAlign: 'center',
    fontStyle: 'italic',
  },
});

import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';

export default function ArenaScreen() {
  return (
    <ThemedView style={styles.container}>
      {/* Arena başlığı */}
      <View style={styles.header}>
        <ThemedText type="title" style={styles.title}>🏛️ ARENA</ThemedText>
        <ThemedText style={styles.subtitle}>Gladyatörlerin savaştığı yer</ThemedText>
      </View>

      {/* Arena görünümü */}
      <View style={styles.arenaContainer}>
        <View style={styles.arenaRing}>
          <View style={styles.arenaCenter}>
            <Text style={styles.arenaEmoji}>⚔️</Text>
            <ThemedText style={styles.arenaText}>Arena Hazır</ThemedText>
            <Text style={styles.arenaSubtext}>Savaş zamanı!</Text>
          </View>
        </View>
      </View>

      {/* Arena seçenekleri */}
      <View style={styles.optionsContainer}>
        <TouchableOpacity style={styles.optionButton}>
          <View style={styles.optionIcon}>
            <Text style={styles.optionEmoji}>🎯</Text>
          </View>
          <ThemedText style={styles.optionText}>Pratik Savaş</ThemedText>
          <Text style={styles.optionDesc}>Eğitim amaçlı</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.optionButton}>
          <View style={styles.optionIcon}>
            <Text style={styles.optionEmoji}>🏆</Text>
          </View>
          <ThemedText style={styles.optionText}>Turnuva</ThemedText>
          <Text style={styles.optionDesc}>Büyük ödüller</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.optionButton}>
          <View style={styles.optionIcon}>
            <Text style={styles.optionEmoji}>👥</Text>
          </View>
          <ThemedText style={styles.optionText}>Diğer Oyuncular</ThemedText>
          <Text style={styles.optionDesc}>PvP savaşları</Text>
        </TouchableOpacity>
      </View>

      {/* Durum bilgisi */}
      <View style={styles.statusContainer}>
        <ThemedText style={styles.statusText}>
          Gladyatörlerinizi hazırlayın ve savaşa gönderin!
        </ThemedText>
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
    alignItems: 'center',
    padding: 20,
    paddingTop: 50,
    backgroundColor: '#8B4513',
    borderBottomWidth: 3,
    borderBottomColor: '#654321',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 5,
    color: '#FFD700',
    textShadowColor: '#000',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 3,
  },
  subtitle: {
    fontSize: 16,
    color: '#DEB887',
    fontStyle: 'italic',
  },
  arenaContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#8B4513',
  },
  arenaRing: {
    width: 250,
    height: 250,
    borderRadius: 125,
    backgroundColor: '#654321',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 8,
    borderColor: '#8B4513',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 10,
  },
  arenaCenter: {
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: '#8B4513',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#FFD700',
  },
  arenaEmoji: {
    fontSize: 60,
    marginBottom: 10,
  },
  arenaText: {
    color: '#FFD700',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  arenaSubtext: {
    color: '#DEB887',
    fontSize: 14,
    fontStyle: 'italic',
  },
  optionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 20,
    backgroundColor: '#654321',
    borderTopWidth: 2,
    borderTopColor: '#8B4513',
  },
  optionButton: {
    alignItems: 'center',
    padding: 15,
    backgroundColor: '#8B4513',
    borderRadius: 15,
    minWidth: 90,
    borderWidth: 2,
    borderColor: '#FFD700',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 5,
  },
  optionIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#FFD700',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  optionEmoji: {
    fontSize: 24,
  },
  optionText: {
    fontSize: 12,
    textAlign: 'center',
    color: '#FFD700',
    fontWeight: 'bold',
    marginBottom: 4,
  },
  optionDesc: {
    fontSize: 10,
    color: '#DEB887',
    textAlign: 'center',
  },
  statusContainer: {
    padding: 20,
    alignItems: 'center',
    backgroundColor: '#2C1810',
    borderTopWidth: 2,
    borderTopColor: '#654321',
  },
  statusText: {
    fontSize: 14,
    color: '#DEB887',
    textAlign: 'center',
    fontStyle: 'italic',
  },
});

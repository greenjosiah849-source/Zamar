import React, { useState } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, FlatList } from 'react-native';

export default function GamesScreen({ navigation }) {
  const [games] = useState([
    { id: '1', name: 'Sky Island Adventure', players: 1250, rating: 4.8 },
    { id: '2', name: 'Zombie Survival', players: 3200, rating: 4.6 },
    { id: '3', name: 'Battle Royale Elite', players: 5600, rating: 4.7 },
    { id: '4', name: 'Tycoon Empire', players: 2800, rating: 4.5 },
    { id: '5', name: 'Parkour Master', players: 1800, rating: 4.4 },
  ]);

  const GameListItem = ({ game }) => (
    <TouchableOpacity 
      style={styles.gameItem}
      onPress={() => navigation.navigate('GameDetail', { gameId: game.id })}
    >
      <View style={styles.gameIcon}>
        <Text style={styles.gameIconText}>🎮</Text>
      </View>
      <View style={styles.gameDetails}>
        <Text style={styles.gameName}>{game.name}</Text>
        <View style={styles.gameStats}>
          <Text style={styles.gameStat}>👥 {game.players}</Text>
          <Text style={styles.gameStat}>⭐ {game.rating}</Text>
        </View>
      </View>
      <TouchableOpacity style={styles.playButton}>
        <Text style={styles.playButtonText}>Play</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Games Library</Text>
      </View>

      <FlatList
        data={games}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <GameListItem game={item} />}
        contentContainerStyle={styles.listContent}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#fff',
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000',
  },
  listContent: {
    padding: 10,
  },
  gameItem: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    marginBottom: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#eee',
  },
  gameIcon: {
    width: 50,
    height: 50,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  gameIconText: {
    fontSize: 24,
  },
  gameDetails: {
    flex: 1,
  },
  gameName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#000',
    marginBottom: 6,
  },
  gameStats: {
    flexDirection: 'row',
  },
  gameStat: {
    fontSize: 12,
    color: '#666',
    marginRight: 15,
  },
  playButton: {
    backgroundColor: '#0099ff',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 6,
  },
  playButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 12,
  },
});

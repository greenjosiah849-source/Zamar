import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, FlatList, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';

export default function HomeScreen() {
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const navigation = useNavigation();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      // Load featured games
      const response = await fetch('http://localhost:3000/api/games');
      const data = await response.json();
      setGames(data.slice(0, 5)); // Featured games
      
      // Mock user
      setUser({
        username: 'Player',
        level: 1,
        robux: 0
      });
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const GameCard = ({ game }) => (
    <TouchableOpacity 
      style={styles.gameCard}
      onPress={() => navigation.navigate('GameDetail', { gameId: game.id })}
    >
      <View style={styles.gameThumbnail}>
        <Text style={styles.gameThumbnailText}>🎮</Text>
      </View>
      <Text style={styles.gameName}>{game.name || 'Game'}</Text>
      <Text style={styles.gameInfo}>👥 {game.playerCount || 0}</Text>
      <Text style={styles.gameInfo}>⭐ {(game.rating || 0).toFixed(1)}</Text>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#0099ff" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>ZAMAR</Text>
        <Text style={styles.headerSubtitle}>Game Platform</Text>
      </View>

      {/* User Info */}
      <View style={styles.userSection}>
        <Text style={styles.userText}>👤 {user?.username}</Text>
        <Text style={styles.userText}>Level {user?.level}</Text>
        <Text style={styles.userText}>💵 {user?.robux} Robux</Text>
      </View>

      {/* Navigation Buttons */}
      <View style={styles.navButtons}>
        <TouchableOpacity 
          style={styles.navButton}
          onPress={() => navigation.navigate('Games')}
        >
          <Text style={styles.navButtonText}>🎮 Games</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.navButton}
          onPress={() => navigation.navigate('Profile')}
        >
          <Text style={styles.navButtonText}>👤 Profile</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.navButton}
          onPress={() => navigation.navigate('Servers')}
        >
          <Text style={styles.navButtonText}>🌐 Servers</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.navButton}
          onPress={() => navigation.navigate('Settings')}
        >
          <Text style={styles.navButtonText}>⚙️ Settings</Text>
        </TouchableOpacity>
      </View>

      {/* Featured Games */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Featured Games</Text>
        <FlatList
          data={games}
          keyExtractor={(item, index) => index.toString()}
          renderItem={({ item }) => <GameCard game={item} />}
          scrollEnabled={false}
          numColumns={2}
          columnWrapperStyle={styles.gamesRow}
        />
      </View>

      {/* Action Buttons */}
      <View style={styles.actionButtons}>
        <TouchableOpacity 
          style={[styles.actionButton, styles.primaryButton]}
          onPress={() => navigation.navigate('Games')}
        >
          <Text style={styles.primaryButtonText}>Browse Games</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.actionButton, styles.secondaryButton]}
          onPress={() => navigation.navigate('Profile')}
        >
          <Text style={styles.secondaryButtonText}>My Profile</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    paddingTop: 20,
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#000',
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#666',
    marginTop: 5,
  },
  userSection: {
    backgroundColor: '#fff',
    margin: 10,
    padding: 15,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#eee',
  },
  userText: {
    fontSize: 14,
    color: '#333',
    marginVertical: 4,
  },
  navButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    margin: 10,
    justifyContent: 'space-between',
  },
  navButton: {
    width: '48%',
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#eee',
    alignItems: 'center',
    marginVertical: 5,
  },
  navButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  section: {
    margin: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 10,
  },
  gamesRow: {
    justifyContent: 'space-between',
  },
  gameCard: {
    width: '48%',
    backgroundColor: '#fff',
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#eee',
  },
  gameThumbnail: {
    height: 100,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  gameThumbnailText: {
    fontSize: 32,
  },
  gameName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#000',
    padding: 8,
  },
  gameInfo: {
    fontSize: 11,
    color: '#666',
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  actionButtons: {
    marginHorizontal: 10,
    marginVertical: 20,
  },
  actionButton: {
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginVertical: 8,
  },
  primaryButton: {
    backgroundColor: '#0099ff',
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  secondaryButton: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#0099ff',
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0099ff',
  },
});

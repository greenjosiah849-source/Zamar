import React, { useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView } from 'react-native';

export default function ProfileScreen({ navigation }) {
  const [user] = useState({
    username: 'Player',
    level: 1,
    experience: 0,
    robux: 0,
    friends: 0,
    gamesCreated: 0,
  });

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Profile</Text>
      </View>

      {/* Profile Info */}
      <View style={styles.profileCard}>
        <Text style={styles.avatar}>👤</Text>
        <Text style={styles.username}>{user.username}</Text>
      </View>

      {/* Stats */}
      <View style={styles.statsContainer}>
        <View style={styles.statBox}>
          <Text style={styles.statNumber}>{user.level}</Text>
          <Text style={styles.statLabel}>Level</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statNumber}>{user.experience}</Text>
          <Text style={styles.statLabel}>EXP</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statNumber}>{user.robux}</Text>
          <Text style={styles.statLabel}>Robux</Text>
        </View>
      </View>

      {/* Actions */}
      <View style={styles.section}>
        <TouchableOpacity style={styles.actionItem}>
          <Text style={styles.actionLabel}>👥 Friends</Text>
          <Text style={styles.actionValue}>{user.friends}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionItem}>
          <Text style={styles.actionLabel}>🎮 Games Created</Text>
          <Text style={styles.actionValue}>{user.gamesCreated}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionItem}>
          <Text style={styles.actionLabel}>💰 Purchase Robux</Text>
          <Text style={styles.actionValue}>→</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionItem}>
          <Text style={styles.actionLabel}>⚙️ Settings</Text>
          <Text style={styles.actionValue}>→</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.actionItem, styles.logoutButton]}>
          <Text style={styles.logoutText}>Sign Out</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
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
  profileCard: {
    backgroundColor: '#fff',
    margin: 10,
    padding: 20,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#eee',
  },
  avatar: {
    fontSize: 48,
    marginBottom: 10,
  },
  username: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000',
  },
  statsContainer: {
    flexDirection: 'row',
    margin: 10,
    justifyContent: 'space-between',
  },
  statBox: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 8,
    marginHorizontal: 5,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#eee',
  },
  statNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#0099ff',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 5,
  },
  section: {
    marginHorizontal: 10,
    marginVertical: 10,
  },
  actionItem: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#eee',
  },
  actionLabel: {
    fontSize: 15,
    color: '#333',
    fontWeight: '500',
  },
  actionValue: {
    fontSize: 15,
    color: '#999',
  },
  logoutButton: {
    backgroundColor: '#fff',
    borderColor: '#ff4444',
    marginTop: 10,
  },
  logoutText: {
    fontSize: 15,
    color: '#ff4444',
    fontWeight: '600',
  },
});

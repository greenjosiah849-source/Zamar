import React, { useState } from 'react';
import { StyleSheet, Text, View, FlatList, ScrollView } from 'react-native';

export default function ServersScreen() {
  const [servers] = useState([
    { id: '1', name: 'US-East', region: 'Virginia', players: 2450, latency: 15 },
    { id: '2', name: 'US-West', region: 'California', players: 1890, latency: 35 },
    { id: '3', name: 'EU-West', region: 'Ireland', players: 3100, latency: 45 },
    { id: '4', name: 'AP-Southeast', region: 'Singapore', players: 890, latency: 85 },
    { id: '5', name: 'AP-Northeast', region: 'Japan', players: 602, latency: 70 },
  ]);

  const ServerItem = ({ server }) => (
    <View style={styles.serverItem}>
      <View style={styles.serverInfo}>
        <Text style={styles.serverName}>{server.name}</Text>
        <Text style={styles.serverRegion}>{server.region}</Text>
      </View>
      <View style={styles.serverStats}>
        <Text style={styles.stat}>👥 {server.players}</Text>
        <Text style={styles.stat}>📡 {server.latency}ms</Text>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Game Servers</Text>
      </View>

      <FlatList
        data={servers}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <ServerItem server={item} />}
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
  serverItem: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 15,
    marginBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#eee',
  },
  serverInfo: {
    flex: 1,
  },
  serverName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#000',
    marginBottom: 4,
  },
  serverRegion: {
    fontSize: 12,
    color: '#666',
  },
  serverStats: {
    flexDirection: 'column',
    alignItems: 'flex-end',
  },
  stat: {
    fontSize: 12,
    color: '#666',
    marginVertical: 2,
  },
});

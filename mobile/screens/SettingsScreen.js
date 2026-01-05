import React, { useState } from 'react';
import { StyleSheet, Text, View, ScrollView, Switch } from 'react-native';

export default function SettingsScreen() {
  const [settings, setSettings] = useState({
    notifications: true,
    autoConnect: true,
    showOnlineStatus: true,
    allowMessages: true,
  });

  const toggleSetting = (key) => {
    setSettings({ ...settings, [key]: !settings[key] });
  };

  const SettingItem = ({ label, value, onToggle }) => (
    <View style={styles.settingItem}>
      <Text style={styles.settingLabel}>{label}</Text>
      <Switch 
        value={value} 
        onValueChange={onToggle}
        trackColor={{ false: '#ccc', true: '#81c784' }}
        thumbColor={value ? '#0099ff' : '#f4f3f4'}
      />
    </View>
  );

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Settings</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Notifications</Text>
        <SettingItem 
          label="Enable Notifications"
          value={settings.notifications}
          onToggle={() => toggleSetting('notifications')}
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Network</Text>
        <SettingItem 
          label="Auto Connect to Best Server"
          value={settings.autoConnect}
          onToggle={() => toggleSetting('autoConnect')}
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Privacy</Text>
        <SettingItem 
          label="Show Online Status"
          value={settings.showOnlineStatus}
          onToggle={() => toggleSetting('showOnlineStatus')}
        />
        <SettingItem 
          label="Allow Messages"
          value={settings.allowMessages}
          onToggle={() => toggleSetting('allowMessages')}
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>About</Text>
        <View style={styles.infoItem}>
          <Text style={styles.infoLabel}>Version</Text>
          <Text style={styles.infoValue}>1.0.0</Text>
        </View>
        <View style={styles.infoItem}>
          <Text style={styles.infoLabel}>Platform</Text>
          <Text style={styles.infoValue}>Zamar</Text>
        </View>
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
  section: {
    marginVertical: 10,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginHorizontal: 20,
    marginVertical: 10,
  },
  settingItem: {
    backgroundColor: '#fff',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  settingLabel: {
    fontSize: 15,
    color: '#333',
    fontWeight: '500',
  },
  infoItem: {
    backgroundColor: '#fff',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  infoLabel: {
    fontSize: 15,
    color: '#333',
    fontWeight: '500',
  },
  infoValue: {
    fontSize: 14,
    color: '#999',
  },
});

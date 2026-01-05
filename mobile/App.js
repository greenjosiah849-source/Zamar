import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text } from 'react-native';

// Screens
import HomeScreen from './screens/HomeScreen';
import GamesScreen from './screens/GamesScreen';
import ProfileScreen from './screens/ProfileScreen';
import ServersScreen from './screens/ServersScreen';
import SettingsScreen from './screens/SettingsScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function HomeStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="HomeScreen" component={HomeScreen} />
      <Stack.Screen name="GameDetail" component={GameDetailScreen} />
    </Stack.Navigator>
  );
}

function GameDetailScreen({ route }) {
  return (
    <Text>Game Detail Screen for {route.params?.gameId}</Text>
  );
}

export default function App() {
  return (
    <NavigationContainer>
      <Tab.Navigator
        screenOptions={({ route }) => ({
          headerShown: false,
          tabBarActiveTintColor: '#0099ff',
          tabBarInactiveTintColor: '#999',
          tabBarLabelStyle: {
            fontSize: 11,
            fontWeight: '600',
          },
          tabBarStyle: {
            backgroundColor: '#fff',
            borderTopWidth: 1,
            borderTopColor: '#eee',
          },
        })}
      >
        <Tab.Screen 
          name="Home" 
          component={HomeStack}
          options={{
            tabBarLabel: 'Home',
            tabBarIcon: ({ color }) => <Text style={{ fontSize: 20, color }}>🏠</Text>,
          }}
        />
        <Tab.Screen 
          name="Games" 
          component={GamesScreen}
          options={{
            tabBarLabel: 'Games',
            tabBarIcon: ({ color }) => <Text style={{ fontSize: 20, color }}>🎮</Text>,
          }}
        />
        <Tab.Screen 
          name="Servers" 
          component={ServersScreen}
          options={{
            tabBarLabel: 'Servers',
            tabBarIcon: ({ color }) => <Text style={{ fontSize: 20, color }}>🌐</Text>,
          }}
        />
        <Tab.Screen 
          name="Profile" 
          component={ProfileScreen}
          options={{
            tabBarLabel: 'Profile',
            tabBarIcon: ({ color }) => <Text style={{ fontSize: 20, color }}>👤</Text>,
          }}
        />
        <Tab.Screen 
          name="Settings" 
          component={SettingsScreen}
          options={{
            tabBarLabel: 'Settings',
            tabBarIcon: ({ color }) => <Text style={{ fontSize: 20, color }}>⚙️</Text>,
          }}
        />
      </Tab.Navigator>
    </NavigationContainer>
  );
}

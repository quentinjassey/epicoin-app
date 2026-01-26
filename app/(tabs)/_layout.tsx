import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import React from 'react';
import { Platform } from 'react-native';

export default function TabLayout() {
    return (
        <Tabs
            screenOptions={{
                tabBarActiveTintColor: '#0091D3',
                tabBarInactiveTintColor: '#9ca3af',
                headerShown: false,
                tabBarStyle: {
                    backgroundColor: '#ffffff',
                    borderTopWidth: 1,
                    borderTopColor: '#f3f4f6',
                    paddingTop: 8,
                    paddingBottom: Platform.OS === 'ios' ? 28 : 12,
                    height: Platform.OS === 'ios' ? 88 : 68,
                },
                tabBarLabelStyle: {
                    fontSize: 11,
                    fontWeight: '600',
                    marginTop: 2,
                },
            }}
        >
            <Tabs.Screen
                name="index"
                options={{
                    title: 'Accueil',
                    tabBarIcon: ({ color, focused }) => (
                        <Ionicons 
                            name={focused ? 'wallet' : 'wallet-outline'} 
                            size={22} 
                            color={color} 
                        />
                    ),
                }}
            />
            <Tabs.Screen
                name="shop"
                options={{
                    title: 'Boutique',
                    tabBarIcon: ({ color, focused }) => (
                        <Ionicons 
                            name={focused ? 'storefront' : 'storefront-outline'} 
                            size={22} 
                            color={color} 
                        />
                    ),
                }}
            />
            <Tabs.Screen
                name="history"
                options={{
                    title: 'Historique',
                    tabBarIcon: ({ color, focused }) => (
                        <Ionicons 
                            name={focused ? 'time' : 'time-outline'} 
                            size={22} 
                            color={color} 
                        />
                    ),
                }}
            />
            <Tabs.Screen
                name="profile"
                options={{
                    title: 'Profil',
                    tabBarIcon: ({ color, focused }) => (
                        <Ionicons 
                            name={focused ? 'person' : 'person-outline'} 
                            size={22} 
                            color={color} 
                        />
                    ),
                }}
            />
        </Tabs>
    );
}

import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, RefreshControl, Text, TextInput, View } from 'react-native';
import { supabase } from '../../lib/supabase';

type User = {
    id: string;
    email: string;
    full_name: string;
    balance: number;
    campus: string;
    is_admin: boolean;
    created_at: string;
};

export default function AdminUsers() {
    const [users, setUsers] = useState<User[]>([]);
    const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        fetchUsers();
    }, []);

    useEffect(() => {
        if (searchQuery) {
            const filtered = users.filter(user => 
                user.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                user.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                user.campus?.toLowerCase().includes(searchQuery.toLowerCase())
            );
            setFilteredUsers(filtered);
        } else {
            setFilteredUsers(users);
        }
    }, [searchQuery, users]);

    async function fetchUsers() {
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .order('created_at', { ascending: false });
            
            if (error) throw error;
            setUsers(data || []);
            setFilteredUsers(data || []);
        } catch (error: any) {
            Alert.alert('Erreur', error.message);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }

    function onRefresh() {
        setRefreshing(true);
        fetchUsers();
    }

    const totalBalance = users.reduce((sum, user) => sum + (user.balance || 0), 0);

    return (
        <View className="flex-1 bg-gray-50">
            {/* Stats */}
            <View className="p-4 flex-row gap-3">
                <View className="flex-1 bg-white p-4 rounded-xl border border-gray-100">
                    <Text className="text-gray-500 text-sm">Utilisateurs</Text>
                    <Text className="text-2xl font-bold text-gray-900">{users.length}</Text>
                </View>
                <View className="flex-1 bg-white p-4 rounded-xl border border-gray-100">
                    <Text className="text-gray-500 text-sm">Total EPC</Text>
                    <Text className="text-2xl font-bold text-epitech-blue">{totalBalance.toFixed(0)}</Text>
                </View>
            </View>

            {/* Search */}
            <View className="px-4 mb-4">
                <View className="flex-row items-center bg-white border border-gray-200 rounded-xl px-4">
                    <Ionicons name="search" size={20} color="#9ca3af" />
                    <TextInput
                        className="flex-1 p-3 text-gray-900"
                        placeholder="Rechercher un utilisateur..."
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                        placeholderTextColor="#9ca3af"
                    />
                    {searchQuery.length > 0 && (
                        <Ionicons 
                            name="close-circle" 
                            size={20} 
                            color="#9ca3af" 
                            onPress={() => setSearchQuery('')}
                        />
                    )}
                </View>
            </View>

            {loading ? (
                <View className="flex-1 justify-center items-center">
                    <ActivityIndicator size="large" color="#0091D3" />
                </View>
            ) : (
                <FlatList
                    data={filteredUsers}
                    keyExtractor={(item) => item.id}
                    contentContainerStyle={{ padding: 16, paddingTop: 0 }}
                    refreshControl={
                        <RefreshControl 
                            refreshing={refreshing} 
                            onRefresh={onRefresh}
                            tintColor="#0091D3"
                        />
                    }
                    renderItem={({ item }) => (
                        <View className="bg-white p-4 rounded-xl mb-3 shadow-sm border border-gray-100">
                            <View className="flex-row items-center">
                                <View className="w-12 h-12 bg-epitech-blue/10 rounded-full items-center justify-center mr-4">
                                    <Text className="font-bold text-epitech-blue text-lg">
                                        {item.full_name?.charAt(0) || '?'}
                                    </Text>
                                </View>
                                <View className="flex-1">
                                    <View className="flex-row items-center">
                                        <Text className="text-lg font-bold text-gray-900">
                                            {item.full_name || 'Inconnu'}
                                        </Text>
                                        {item.is_admin && (
                                            <View className="bg-red-100 px-2 py-0.5 rounded-full ml-2">
                                                <Text className="text-red-700 text-xs font-medium">Admin</Text>
                                            </View>
                                        )}
                                    </View>
                                    <Text className="text-gray-500 text-sm">{item.email}</Text>
                                    {item.campus && (
                                        <Text className="text-gray-400 text-xs mt-0.5">📍 {item.campus}</Text>
                                    )}
                                </View>
                                <View className="items-end">
                                    <Text className="text-epitech-blue font-bold text-lg">
                                        {item.balance?.toFixed(2)}
                                    </Text>
                                    <Text className="text-gray-400 text-xs">EPC</Text>
                                </View>
                            </View>
                        </View>
                    )}
                    ListEmptyComponent={
                        <View className="items-center py-12">
                            <Ionicons name="people-outline" size={48} color="#d1d5db" />
                            <Text className="text-gray-400 mt-4">Aucun utilisateur trouvé</Text>
                        </View>
                    }
                />
            )}
        </View>
    );
}

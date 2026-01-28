import { SymbolView } from 'expo-symbols';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, RefreshControl, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { supabase } from '../../lib/supabase';
import { Colors } from '@/constants/NativeColors';

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
        <View style={{ flex: 1, backgroundColor: Colors.systemGroupedBackground }}>
            {/* Stats */}
            <View style={{ padding: 16, flexDirection: 'row', gap: 12 }}>
                <View style={{
                    flex: 1,
                    backgroundColor: Colors.secondarySystemGroupedBackground,
                    padding: 16,
                    borderRadius: 12,
                    borderCurve: 'continuous',
                    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.06)',
                }}>
                    <Text style={{ color: Colors.secondaryLabel, fontSize: 13, marginBottom: 4 }}>
                        Utilisateurs
                    </Text>
                    <Text style={{
                        fontSize: 24,
                        fontWeight: '700',
                        color: Colors.label,
                        fontVariant: ['tabular-nums'],
                    }}>
                        {users.length}
                    </Text>
                </View>
                <View style={{
                    flex: 1,
                    backgroundColor: Colors.secondarySystemGroupedBackground,
                    padding: 16,
                    borderRadius: 12,
                    borderCurve: 'continuous',
                    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.06)',
                }}>
                    <Text style={{ color: Colors.secondaryLabel, fontSize: 13, marginBottom: 4 }}>
                        Total EPC
                    </Text>
                    <Text style={{
                        fontSize: 24,
                        fontWeight: '700',
                        color: Colors.epitechBlue,
                        fontVariant: ['tabular-nums'],
                    }}>
                        {totalBalance.toFixed(0)}
                    </Text>
                </View>
            </View>

            {/* Search */}
            <View style={{ paddingHorizontal: 16, marginBottom: 16 }}>
                <View style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    backgroundColor: Colors.secondarySystemGroupedBackground,
                    borderRadius: 12,
                    borderCurve: 'continuous',
                    paddingHorizontal: 16,
                    paddingVertical: 10,
                }}>
                    <SymbolView name="magnifyingglass" size={18} tintColor={Colors.tertiaryLabel} />
                    <TextInput
                        style={{
                            flex: 1,
                            marginLeft: 12,
                            fontSize: 16,
                            color: Colors.label,
                        }}
                        placeholder="Rechercher un utilisateur..."
                        placeholderTextColor={Colors.tertiaryLabel}
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                    />
                    {searchQuery.length > 0 && (
                        <TouchableOpacity onPress={() => setSearchQuery('')}>
                            <SymbolView name="xmark.circle.fill" size={18} tintColor={Colors.tertiaryLabel} />
                        </TouchableOpacity>
                    )}
                </View>
            </View>

            {loading ? (
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                    <ActivityIndicator size="large" color={Colors.epitechBlue} />
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
                            tintColor={Colors.epitechBlue}
                        />
                    }
                    renderItem={({ item }) => (
                        <View style={{
                            backgroundColor: Colors.secondarySystemGroupedBackground,
                            padding: 16,
                            borderRadius: 12,
                            borderCurve: 'continuous',
                            marginBottom: 12,
                            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.06)',
                        }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                <View style={{
                                    width: 48,
                                    height: 48,
                                    backgroundColor: 'rgba(0, 145, 211, 0.1)',
                                    borderRadius: 24,
                                    borderCurve: 'continuous',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    marginRight: 16,
                                }}>
                                    <Text style={{
                                        fontWeight: '700',
                                        color: Colors.epitechBlue,
                                        fontSize: 18,
                                    }}>
                                        {item.full_name?.charAt(0) || '?'}
                                    </Text>
                                </View>
                                <View style={{ flex: 1 }}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                        <Text style={{
                                            fontSize: 17,
                                            fontWeight: '700',
                                            color: Colors.label,
                                        }}>
                                            {item.full_name || 'Inconnu'}
                                        </Text>
                                        {item.is_admin && (
                                            <View style={{
                                                backgroundColor: 'rgba(239, 68, 68, 0.15)',
                                                paddingHorizontal: 8,
                                                paddingVertical: 2,
                                                borderRadius: 8,
                                                borderCurve: 'continuous',
                                                marginLeft: 8,
                                            }}>
                                                <Text style={{
                                                    color: Colors.systemRed,
                                                    fontSize: 11,
                                                    fontWeight: '700',
                                                }}>
                                                    Admin
                                                </Text>
                                            </View>
                                        )}
                                    </View>
                                    <Text style={{
                                        color: Colors.secondaryLabel,
                                        fontSize: 13,
                                        marginTop: 2,
                                    }}>
                                        {item.email}
                                    </Text>
                                    {item.campus && (
                                        <Text style={{
                                            color: Colors.tertiaryLabel,
                                            fontSize: 12,
                                            marginTop: 2,
                                        }}>
                                            📍 {item.campus}
                                        </Text>
                                    )}
                                </View>
                                <View style={{ alignItems: 'flex-end' }}>
                                    <Text style={{
                                        color: Colors.epitechBlue,
                                        fontWeight: '700',
                                        fontSize: 17,
                                        fontVariant: ['tabular-nums'],
                                    }}>
                                        {item.balance?.toFixed(2)}
                                    </Text>
                                    <Text style={{
                                        color: Colors.tertiaryLabel,
                                        fontSize: 12,
                                    }}>
                                        EPC
                                    </Text>
                                </View>
                            </View>
                        </View>
                    )}
                    ListEmptyComponent={
                        <View style={{
                            alignItems: 'center',
                            justifyContent: 'center',
                            paddingVertical: 80,
                        }}>
                            <SymbolView name="person.3.fill" size={48} tintColor={Colors.tertiaryLabel} />
                            <Text style={{
                                color: Colors.secondaryLabel,
                                fontSize: 17,
                                marginTop: 16,
                            }}>
                                Aucun utilisateur trouvé
                            </Text>
                        </View>
                    }
                />
            )}
        </View>
    );
}

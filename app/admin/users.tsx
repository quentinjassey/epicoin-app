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
        <View style={{ flex: 1, backgroundColor: Colors.white }}>
            {/* Stats */}
            <View style={{ padding: 16, flexDirection: 'row', gap: 12 }}>
                <View style={{
                    flex: 1,
                    backgroundColor: Colors.white,
                    padding: 16,
                    borderRadius: 0,
                    borderWidth: 2,
                    borderColor: Colors.black,
                    shadowColor: Colors.black,
                    shadowOffset: { width: 3, height: 3 },
                    shadowOpacity: 1,
                    shadowRadius: 0,
                }}>
                    <Text style={{ color: Colors.secondaryLabel, fontSize: 13, marginBottom: 4, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 }}>
                        Utilisateurs
                    </Text>
                    <Text style={{
                        fontSize: 24,
                        fontWeight: '900',
                        color: Colors.black,
                        fontVariant: ['tabular-nums'],
                    }}>
                        {users.length}
                    </Text>
                </View>
                <View style={{
                    flex: 1,
                    backgroundColor: Colors.white,
                    padding: 16,
                    borderRadius: 0,
                    borderWidth: 2,
                    borderColor: Colors.black,
                    shadowColor: Colors.black,
                    shadowOffset: { width: 3, height: 3 },
                    shadowOpacity: 1,
                    shadowRadius: 0,
                }}>
                    <Text style={{ color: Colors.secondaryLabel, fontSize: 13, marginBottom: 4, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 }}>
                        Total EPC
                    </Text>
                    <Text style={{
                        fontSize: 24,
                        fontWeight: '900',
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
                    backgroundColor: Colors.offWhite,
                    borderRadius: 0,
                    paddingHorizontal: 16,
                    paddingVertical: 10,
                    borderWidth: 2,
                    borderColor: Colors.black,
                }}>
                    <SymbolView name="magnifyingglass" size={18} tintColor={Colors.secondaryLabel} />
                    <TextInput
                        style={{
                            flex: 1,
                            marginLeft: 12,
                            fontSize: 16,
                            color: Colors.black,
                            fontWeight: '700',
                        }}
                        placeholder="Rechercher un utilisateur..."
                        placeholderTextColor={Colors.tertiaryLabel}
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                    />
                    {searchQuery.length > 0 && (
                        <TouchableOpacity onPress={() => setSearchQuery('')}>
                            <SymbolView name="xmark.circle.fill" size={18} tintColor={Colors.secondaryLabel} />
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
                            backgroundColor: Colors.white,
                            padding: 16,
                            borderRadius: 0,
                            marginBottom: 12,
                            borderWidth: 2,
                            borderColor: Colors.black,
                            shadowColor: Colors.black,
                            shadowOffset: { width: 3, height: 3 },
                            shadowOpacity: 1,
                            shadowRadius: 0,
                        }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                <View style={{
                                    width: 48,
                                    height: 48,
                                    backgroundColor: Colors.offWhite,
                                    borderRadius: 0,
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    marginRight: 16,
                                    borderWidth: 2,
                                    borderColor: Colors.black,
                                }}>
                                    <Text style={{
                                        fontWeight: '900',
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
                                            fontWeight: '800',
                                            color: Colors.black,
                                        }}>
                                            {item.full_name || 'Inconnu'}
                                        </Text>
                                        {item.is_admin && (
                                            <View style={{
                                                backgroundColor: Colors.offWhite,
                                                paddingHorizontal: 8,
                                                paddingVertical: 2,
                                                borderRadius: 0,
                                                marginLeft: 8,
                                                borderWidth: 2,
                                                borderColor: Colors.accentOrange,
                                            }}>
                                                <Text style={{
                                                    color: Colors.accentOrange,
                                                    fontSize: 11,
                                                    fontWeight: '900',
                                                    textTransform: 'uppercase',
                                                    letterSpacing: 0.5,
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
                                        fontWeight: '700',
                                    }}>
                                        {item.email}
                                    </Text>
                                    {item.campus && (
                                        <Text style={{
                                            color: Colors.tertiaryLabel,
                                            fontSize: 12,
                                            marginTop: 2,
                                            fontWeight: '700',
                                        }}>
                                            {item.campus}
                                        </Text>
                                    )}
                                </View>
                                <View style={{ alignItems: 'flex-end' }}>
                                    <Text style={{
                                        color: Colors.epitechBlue,
                                        fontWeight: '900',
                                        fontSize: 17,
                                        fontVariant: ['tabular-nums'],
                                    }}>
                                        {item.balance?.toFixed(2)}
                                    </Text>
                                    <Text style={{
                                        color: Colors.secondaryLabel,
                                        fontSize: 12,
                                        fontWeight: '700',
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
                                color: Colors.black,
                                fontSize: 17,
                                marginTop: 16,
                                fontWeight: '800',
                                textTransform: 'uppercase',
                                letterSpacing: 1,
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

import { SymbolView } from 'expo-symbols';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Modal, RefreshControl, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { supabase } from '../../lib/supabase';
import { Colors } from '@/constants/NativeColors';

type Product = {
    id: string;
    name: string;
    description: string | null;
    price_epicoin: number;
    stock_quantity: number;
    category: string | null;
};

export default function AdminProducts() {
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [saving, setSaving] = useState(false);
    const [modalVisible, setModalVisible] = useState(false);
    const [editingProduct, setEditingProduct] = useState<Product | null>(null);
    const [newProduct, setNewProduct] = useState({
        name: '',
        description: '',
        price_epicoin: '',
        stock_quantity: '',
        category: 'Snacks',
    });

    useEffect(() => {
        fetchProducts();
    }, []);

    async function fetchProducts() {
        try {
            const { data, error } = await supabase
                .from('products')
                .select('*')
                .order('name', { ascending: true });

            if (error) throw error;
            setProducts(data || []);
        } catch (error: any) {
            Alert.alert('Erreur', error.message);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }

    function openAddModal() {
        setEditingProduct(null);
        setNewProduct({
            name: '',
            description: '',
            price_epicoin: '',
            stock_quantity: '',
            category: 'Snacks',
        });
        setModalVisible(true);
    }

    function openEditModal(product: Product) {
        setEditingProduct(product);
        setNewProduct({
            name: product.name,
            description: product.description || '',
            price_epicoin: product.price_epicoin.toString(),
            stock_quantity: product.stock_quantity.toString(),
            category: product.category || 'Snacks',
        });
        setModalVisible(true);
    }

    async function addProduct() {
        if (!newProduct.name || !newProduct.price_epicoin) {
            Alert.alert('Erreur', 'Nom et prix sont requis');
            return;
        }

        setSaving(true);
        try {
            const { error } = await supabase.from('products').insert([{
                name: newProduct.name,
                description: newProduct.description,
                price_epicoin: parseFloat(newProduct.price_epicoin),
                stock_quantity: parseInt(newProduct.stock_quantity) || 0,
                category: newProduct.category,
            }]);

            if (error) throw error;

            Alert.alert('Succès', 'Produit ajouté');
            setModalVisible(false);
            setNewProduct({
                name: '',
                description: '',
                price_epicoin: '',
                stock_quantity: '',
                category: 'Snacks',
            });
            fetchProducts();
        } catch (error: any) {
            Alert.alert('Erreur', error.message);
        } finally {
            setSaving(false);
        }
    }

    async function updateProduct() {
        if (!editingProduct || !newProduct.name || !newProduct.price_epicoin) {
            Alert.alert('Erreur', 'Nom et prix sont requis');
            return;
        }

        setSaving(true);
        try {
            const { error } = await supabase
                .from('products')
                .update({
                    name: newProduct.name,
                    description: newProduct.description,
                    price_epicoin: parseFloat(newProduct.price_epicoin),
                    stock_quantity: parseInt(newProduct.stock_quantity) || 0,
                    category: newProduct.category,
                })
                .eq('id', editingProduct.id);

            if (error) throw error;

            Alert.alert('Succès', 'Produit modifié');
            setModalVisible(false);
            setEditingProduct(null);
            setNewProduct({
                name: '',
                description: '',
                price_epicoin: '',
                stock_quantity: '',
                category: 'Snacks',
            });
            fetchProducts();
        } catch (error: any) {
            Alert.alert('Erreur', error.message);
        } finally {
            setSaving(false);
        }
    }

    function handleSave() {
        if (editingProduct) {
            updateProduct();
        } else {
            addProduct();
        }
    }

    if (loading) {
        return (
            <View style={{
                flex: 1,
                justifyContent: 'center',
                alignItems: 'center',
                backgroundColor: Colors.systemGroupedBackground,
            }}>
                <ActivityIndicator size="large" color={Colors.epitechBlue} />
            </View>
        );
    }

    return (
        <View style={{ flex: 1, backgroundColor: Colors.systemGroupedBackground }}>
            <View style={{ padding: 16 }}>
                <TouchableOpacity
                    style={{
                        backgroundColor: Colors.epitechBlue,
                        borderRadius: 12,
                        borderCurve: 'continuous',
                        padding: 16,
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'center',
                    }}
                    onPress={openAddModal}
                >
                    <SymbolView name="plus.circle.fill" size={20} tintColor="#fff" />
                    <Text style={{ color: '#fff', fontWeight: '700', marginLeft: 8, fontSize: 16 }}>
                        Ajouter un produit
                    </Text>
                </TouchableOpacity>
            </View>

            <FlatList
                data={products}
                keyExtractor={(item) => item.id}
                contentContainerStyle={{ padding: 16, paddingTop: 0 }}
                refreshControl={
                    <RefreshControl 
                        refreshing={refreshing} 
                        onRefresh={() => { setRefreshing(true); fetchProducts(); }}
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
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
                            <Text style={{ fontSize: 17, fontWeight: '700', color: Colors.label, flex: 1 }}>
                                {item.name}
                            </Text>
                            <TouchableOpacity
                                onPress={() => openEditModal(item)}
                                style={{
                                    backgroundColor: Colors.systemFill,
                                    borderRadius: 8,
                                    borderCurve: 'continuous',
                                    padding: 8,
                                    marginLeft: 12,
                                }}
                            >
                                <SymbolView name="pencil" size={16} tintColor={Colors.epitechBlue} />
                            </TouchableOpacity>
                        </View>
                        {item.description && (
                            <Text style={{ color: Colors.secondaryLabel, fontSize: 13, marginBottom: 8 }}>
                                {item.description}
                            </Text>
                        )}
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                            <Text style={{
                                fontSize: 20,
                                fontWeight: '700',
                                color: Colors.epitechBlue,
                                fontVariant: ['tabular-nums'],
                            }}>
                                {item.price_epicoin.toFixed(2)} EPC
                            </Text>
                            <Text style={{ color: Colors.secondaryLabel, fontSize: 14 }}>
                                Stock: {item.stock_quantity}
                            </Text>
                        </View>
                    </View>
                )}
            />

            <Modal
                visible={modalVisible}
                animationType="slide"
                presentationStyle="formSheet"
                onRequestClose={() => setModalVisible(false)}
            >
                <View style={{ flex: 1, backgroundColor: Colors.systemGroupedBackground }}>
                    <View style={{
                        padding: 16,
                        paddingTop: 24,
                        backgroundColor: Colors.secondarySystemBackground,
                        borderBottomWidth: 1,
                        borderBottomColor: Colors.separator,
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                    }}>
                        <Text style={{ fontSize: 20, fontWeight: '700', color: Colors.label }}>
                            {editingProduct ? 'Modifier le produit' : 'Nouveau produit'}
                        </Text>
                        <TouchableOpacity onPress={() => setModalVisible(false)}>
                            <SymbolView name="xmark.circle.fill" size={28} tintColor={Colors.tertiaryLabel} />
                        </TouchableOpacity>
                    </View>

                    <ScrollView contentContainerStyle={{ padding: 24, gap: 16 }}>
                        <View>
                            <Text style={{ color: Colors.secondaryLabel, fontWeight: '600', marginBottom: 8 }}>Nom</Text>
                            <TextInput
                                style={{
                                    backgroundColor: Colors.systemFill,
                                    borderRadius: 12,
                                    borderCurve: 'continuous',
                                    padding: 12,
                                    fontSize: 16,
                                    color: Colors.label,
                                }}
                                placeholder="Ex: Coca-Cola"
                                placeholderTextColor={Colors.tertiaryLabel}
                                value={newProduct.name}
                                onChangeText={(text) => setNewProduct({ ...newProduct, name: text })}
                            />
                        </View>

                        <View>
                            <Text style={{ color: Colors.secondaryLabel, fontWeight: '600', marginBottom: 8 }}>Description</Text>
                            <TextInput
                                style={{
                                    backgroundColor: Colors.systemFill,
                                    borderRadius: 12,
                                    borderCurve: 'continuous',
                                    padding: 12,
                                    fontSize: 16,
                                    color: Colors.label,
                                    minHeight: 80,
                                    textAlignVertical: 'top',
                                }}
                                placeholder="Description du produit (optionnel)"
                                placeholderTextColor={Colors.tertiaryLabel}
                                value={newProduct.description}
                                onChangeText={(text) => setNewProduct({ ...newProduct, description: text })}
                                multiline
                                numberOfLines={4}
                            />
                        </View>

                        <View>
                            <Text style={{ color: Colors.secondaryLabel, fontWeight: '600', marginBottom: 8 }}>Prix (EPC)</Text>
                            <TextInput
                                style={{
                                    backgroundColor: Colors.systemFill,
                                    borderRadius: 12,
                                    borderCurve: 'continuous',
                                    padding: 12,
                                    fontSize: 16,
                                    color: Colors.label,
                                }}
                                placeholder="2.50"
                                placeholderTextColor={Colors.tertiaryLabel}
                                value={newProduct.price_epicoin}
                                onChangeText={(text) => setNewProduct({ ...newProduct, price_epicoin: text })}
                                keyboardType="decimal-pad"
                            />
                        </View>

                        <View>
                            <Text style={{ color: Colors.secondaryLabel, fontWeight: '600', marginBottom: 8 }}>Stock</Text>
                            <TextInput
                                style={{
                                    backgroundColor: Colors.systemFill,
                                    borderRadius: 12,
                                    borderCurve: 'continuous',
                                    padding: 12,
                                    fontSize: 16,
                                    color: Colors.label,
                                }}
                                placeholder="10"
                                placeholderTextColor={Colors.tertiaryLabel}
                                value={newProduct.stock_quantity}
                                onChangeText={(text) => setNewProduct({ ...newProduct, stock_quantity: text })}
                                keyboardType="number-pad"
                            />
                        </View>

                        <TouchableOpacity
                            style={{
                                backgroundColor: Colors.epitechBlue,
                                borderRadius: 14,
                                borderCurve: 'continuous',
                                padding: 16,
                                alignItems: 'center',
                                marginTop: 16,
                            }}
                            onPress={handleSave}
                            disabled={saving}
                        >
                            {saving ? (
                                <ActivityIndicator color="#fff" />
                            ) : (
                                <Text style={{ color: '#fff', fontSize: 17, fontWeight: '700' }}>
                                    {editingProduct ? 'Modifier' : 'Ajouter'}
                                </Text>
                            )}
                        </TouchableOpacity>
                    </ScrollView>
                </View>
            </Modal>
        </View>
    );
}

import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Modal, RefreshControl, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { supabase } from '../../lib/supabase';

type Product = {
    id: string;
    name: string;
    description: string | null;
    price_epicoin: number;
    stock_quantity: number;
    category: string | null;
    created_at: string;
};

const CATEGORIES = [
    { id: 'boissons', name: 'Boissons', icon: 'cafe', color: '#d97706' },
    { id: 'snacks', name: 'Snacks', icon: 'fast-food', color: '#ea580c' },
    { id: 'repas', name: 'Repas', icon: 'restaurant', color: '#16a34a' },
    { id: 'fournitures', name: 'Fournitures', icon: 'pencil', color: '#2563eb' },
    { id: 'autres', name: 'Autres', icon: 'cube', color: '#6b7280' },
];

export default function AdminProducts() {
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [modalVisible, setModalVisible] = useState(false);
    const [categoryModalVisible, setCategoryModalVisible] = useState(false);
    const [newProduct, setNewProduct] = useState({ 
        name: '', 
        description: '',
        price_epicoin: '', 
        stock_quantity: '',
        category: 'Autres'
    });
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        fetchProducts();
    }, []);

    async function fetchProducts() {
        try {
            const { data, error } = await supabase
                .from('products')
                .select('*')
                .order('category', { ascending: true })
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

    function onRefresh() {
        setRefreshing(true);
        fetchProducts();
    }

    async function handleAddProduct() {
        if (!newProduct.name || !newProduct.price_epicoin) {
            Alert.alert('Erreur', 'Le nom et le prix sont requis');
            return;
        }

        setSaving(true);
        try {
            const { error } = await supabase.from('products').insert({
                name: newProduct.name,
                description: newProduct.description || null,
                price_epicoin: parseFloat(newProduct.price_epicoin),
                stock_quantity: parseInt(newProduct.stock_quantity || '0'),
                category: newProduct.category,
            });

            if (error) throw error;

            setModalVisible(false);
            setNewProduct({ name: '', description: '', price_epicoin: '', stock_quantity: '', category: 'Autres' });
            fetchProducts();
            Alert.alert('Succès', 'Produit ajouté avec succès');
        } catch (error: any) {
            Alert.alert('Erreur', error.message);
        } finally {
            setSaving(false);
        }
    }

    async function handleDeleteProduct(id: string, name: string) {
        Alert.alert(
            'Supprimer le produit',
            `Êtes-vous sûr de vouloir supprimer "${name}" ?`,
            [
                { text: 'Annuler', style: 'cancel' },
                {
                    text: 'Supprimer',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            const { error } = await supabase.from('products').delete().eq('id', id);
                            if (error) throw error;
                            fetchProducts();
                        } catch (error: any) {
                            Alert.alert('Erreur', error.message);
                        }
                    }
                }
            ]
        );
    }

    async function handleUpdateStock(id: string, currentStock: number, name: string) {
        Alert.prompt(
            'Modifier le stock',
            `Stock actuel de "${name}" : ${currentStock}`,
            [
                { text: 'Annuler', style: 'cancel' },
                {
                    text: 'Mettre à jour',
                    onPress: async (value?: string) => {
                        const newStock = parseInt(value || '0');
                        if (isNaN(newStock) || newStock < 0) {
                            Alert.alert('Erreur', 'Quantité invalide');
                            return;
                        }
                        try {
                            const { error } = await supabase
                                .from('products')
                                .update({ stock_quantity: newStock })
                                .eq('id', id);
                            if (error) throw error;
                            fetchProducts();
                        } catch (error: any) {
                            Alert.alert('Erreur', error.message);
                        }
                    }
                }
            ],
            'plain-text',
            currentStock.toString()
        );
    }

    const getCategoryInfo = (category: string | null) => {
        const cat = CATEGORIES.find(c => c.name.toLowerCase() === category?.toLowerCase());
        return cat || CATEGORIES[CATEGORIES.length - 1];
    };

    // Group products by category
    const groupedProducts = products.reduce((acc, product) => {
        const category = product.category || 'Autres';
        if (!acc[category]) {
            acc[category] = [];
        }
        acc[category].push(product);
        return acc;
    }, {} as Record<string, Product[]>);

    const totalProducts = products.length;
    const totalStock = products.reduce((sum, p) => sum + p.stock_quantity, 0);
    const lowStockCount = products.filter(p => p.stock_quantity <= 5 && p.stock_quantity > 0).length;
    const outOfStockCount = products.filter(p => p.stock_quantity === 0).length;

    return (
        <View className="flex-1 bg-gray-50">
            {/* Stats */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="px-4 py-3">
                <View className="flex-row gap-3">
                    <View className="bg-white px-4 py-3 rounded-xl border border-gray-100">
                        <Text className="text-gray-500 text-xs">Produits</Text>
                        <Text className="text-xl font-bold text-gray-900">{totalProducts}</Text>
                    </View>
                    <View className="bg-white px-4 py-3 rounded-xl border border-gray-100">
                        <Text className="text-gray-500 text-xs">Stock total</Text>
                        <Text className="text-xl font-bold text-epitech-blue">{totalStock}</Text>
                    </View>
                    <View className="bg-amber-50 px-4 py-3 rounded-xl border border-amber-200">
                        <Text className="text-amber-600 text-xs">Stock faible</Text>
                        <Text className="text-xl font-bold text-amber-700">{lowStockCount}</Text>
                    </View>
                    <View className="bg-red-50 px-4 py-3 rounded-xl border border-red-200">
                        <Text className="text-red-600 text-xs">Rupture</Text>
                        <Text className="text-xl font-bold text-red-700">{outOfStockCount}</Text>
                    </View>
                </View>
            </ScrollView>

            {/* Add Button */}
            <View className="px-4 mb-2">
                <TouchableOpacity
                    className="bg-epitech-blue p-4 rounded-xl flex-row items-center justify-center"
                    onPress={() => setModalVisible(true)}
                >
                    <Ionicons name="add-circle" size={22} color="white" />
                    <Text className="text-white font-bold ml-2">Ajouter un produit</Text>
                </TouchableOpacity>
            </View>

            {loading ? (
                <View className="flex-1 justify-center items-center">
                    <ActivityIndicator size="large" color="#0091D3" />
                </View>
            ) : (
                <FlatList
                    data={Object.entries(groupedProducts)}
                    keyExtractor={([category]) => category}
                    contentContainerStyle={{ padding: 16, paddingTop: 8 }}
                    refreshControl={
                        <RefreshControl 
                            refreshing={refreshing} 
                            onRefresh={onRefresh}
                            tintColor="#0091D3"
                        />
                    }
                    renderItem={({ item: [category, categoryProducts] }) => {
                        const catInfo = getCategoryInfo(category);
                        return (
                            <View className="mb-6">
                                <View className="flex-row items-center mb-3">
                                    <Ionicons name={catInfo.icon as any} size={18} color={catInfo.color} />
                                    <Text className="text-gray-700 font-bold ml-2">{category}</Text>
                                    <Text className="text-gray-400 text-sm ml-2">({categoryProducts.length})</Text>
                                </View>
                                
                                {categoryProducts.map((item) => (
                                    <View 
                                        key={item.id}
                                        className="bg-white p-4 rounded-xl mb-2 shadow-sm border border-gray-100"
                                    >
                                        <View className="flex-row items-center">
                                            <View className="flex-1">
                                                <Text className="font-bold text-gray-900">{item.name}</Text>
                                                {item.description && (
                                                    <Text className="text-gray-500 text-sm" numberOfLines={1}>
                                                        {item.description}
                                                    </Text>
                                                )}
                                                <View className="flex-row items-center mt-2">
                                                    <Text className="text-epitech-blue font-bold">
                                                        {item.price_epicoin} EPC
                                                    </Text>
                                                    <Text className="text-gray-300 mx-2">•</Text>
                                                    <TouchableOpacity 
                                                        onPress={() => handleUpdateStock(item.id, item.stock_quantity, item.name)}
                                                        className={`px-2 py-0.5 rounded-full ${
                                                            item.stock_quantity === 0 
                                                                ? 'bg-red-100' 
                                                                : item.stock_quantity <= 5 
                                                                    ? 'bg-amber-100' 
                                                                    : 'bg-green-100'
                                                        }`}
                                                    >
                                                        <Text className={`text-xs font-medium ${
                                                            item.stock_quantity === 0 
                                                                ? 'text-red-700' 
                                                                : item.stock_quantity <= 5 
                                                                    ? 'text-amber-700' 
                                                                    : 'text-green-700'
                                                        }`}>
                                                            {item.stock_quantity === 0 ? 'Rupture' : `${item.stock_quantity} en stock`}
                                                        </Text>
                                                    </TouchableOpacity>
                                                </View>
                                            </View>
                                            <TouchableOpacity 
                                                onPress={() => handleDeleteProduct(item.id, item.name)}
                                                className="p-2 ml-2"
                                            >
                                                <Ionicons name="trash-outline" size={20} color="#ef4444" />
                                            </TouchableOpacity>
                                        </View>
                                    </View>
                                ))}
                            </View>
                        );
                    }}
                    ListEmptyComponent={
                        <View className="items-center py-12">
                            <Ionicons name="cube-outline" size={48} color="#d1d5db" />
                            <Text className="text-gray-400 mt-4">Aucun produit</Text>
                            <Text className="text-gray-400 text-sm">Ajoutez votre premier produit</Text>
                        </View>
                    }
                />
            )}

            {/* Add Product Modal */}
            <Modal visible={modalVisible} animationType="slide" transparent>
                <View className="flex-1 justify-end bg-black/50">
                    <View className="bg-white rounded-t-3xl p-6 max-h-[90%]">
                        <View className="flex-row justify-between items-center mb-6">
                            <Text className="text-xl font-bold text-gray-900">Nouveau produit</Text>
                            <TouchableOpacity 
                                onPress={() => setModalVisible(false)}
                                className="bg-gray-100 p-2 rounded-full"
                            >
                                <Ionicons name="close" size={24} color="#374151" />
                            </TouchableOpacity>
                        </View>

                        <ScrollView showsVerticalScrollIndicator={false}>
                            {/* Name */}
                            <View className="mb-4">
                                <Text className="text-gray-600 font-medium mb-2">Nom du produit *</Text>
                                <TextInput
                                    className="border border-gray-300 rounded-xl p-4 bg-gray-50 text-gray-900"
                                    placeholder="Ex: Café, Sandwich..."
                                    value={newProduct.name}
                                    onChangeText={(t) => setNewProduct({ ...newProduct, name: t })}
                                    placeholderTextColor="#9ca3af"
                                />
                            </View>

                            {/* Description */}
                            <View className="mb-4">
                                <Text className="text-gray-600 font-medium mb-2">Description</Text>
                                <TextInput
                                    className="border border-gray-300 rounded-xl p-4 bg-gray-50 text-gray-900"
                                    placeholder="Description optionnelle..."
                                    value={newProduct.description}
                                    onChangeText={(t) => setNewProduct({ ...newProduct, description: t })}
                                    placeholderTextColor="#9ca3af"
                                    multiline
                                    numberOfLines={2}
                                />
                            </View>

                            {/* Category */}
                            <View className="mb-4">
                                <Text className="text-gray-600 font-medium mb-2">Catégorie</Text>
                                <TouchableOpacity
                                    className="border border-gray-300 rounded-xl p-4 bg-gray-50 flex-row items-center justify-between"
                                    onPress={() => setCategoryModalVisible(true)}
                                >
                                    <View className="flex-row items-center">
                                        <Ionicons 
                                            name={getCategoryInfo(newProduct.category).icon as any} 
                                            size={20} 
                                            color={getCategoryInfo(newProduct.category).color} 
                                        />
                                        <Text className="text-gray-900 ml-2">{newProduct.category}</Text>
                                    </View>
                                    <Ionicons name="chevron-down" size={20} color="#9ca3af" />
                                </TouchableOpacity>
                            </View>

                            {/* Price */}
                            <View className="mb-4">
                                <Text className="text-gray-600 font-medium mb-2">Prix (EPC) *</Text>
                                <TextInput
                                    className="border border-gray-300 rounded-xl p-4 bg-gray-50 text-gray-900"
                                    placeholder="Ex: 2.50"
                                    value={newProduct.price_epicoin}
                                    onChangeText={(t) => setNewProduct({ ...newProduct, price_epicoin: t })}
                                    keyboardType="decimal-pad"
                                    placeholderTextColor="#9ca3af"
                                />
                            </View>

                            {/* Stock */}
                            <View className="mb-6">
                                <Text className="text-gray-600 font-medium mb-2">Quantité en stock</Text>
                                <TextInput
                                    className="border border-gray-300 rounded-xl p-4 bg-gray-50 text-gray-900"
                                    placeholder="Ex: 100"
                                    value={newProduct.stock_quantity}
                                    onChangeText={(t) => setNewProduct({ ...newProduct, stock_quantity: t })}
                                    keyboardType="number-pad"
                                    placeholderTextColor="#9ca3af"
                                />
                            </View>

                            {/* Submit */}
                            <TouchableOpacity 
                                className={`p-4 rounded-xl items-center mb-3 ${saving ? 'bg-gray-300' : 'bg-epitech-blue'}`}
                                onPress={handleAddProduct}
                                disabled={saving}
                            >
                                {saving ? (
                                    <ActivityIndicator color="#fff" />
                                ) : (
                                    <Text className="text-white font-bold text-lg">Créer le produit</Text>
                                )}
                            </TouchableOpacity>

                            <TouchableOpacity 
                                className="p-4 items-center mb-4" 
                                onPress={() => setModalVisible(false)}
                            >
                                <Text className="text-gray-500 font-bold">Annuler</Text>
                            </TouchableOpacity>
                        </ScrollView>
                    </View>
                </View>
            </Modal>

            {/* Category Selection Modal */}
            <Modal visible={categoryModalVisible} animationType="slide" transparent>
                <View className="flex-1 justify-end bg-black/50">
                    <View className="bg-white rounded-t-3xl p-6">
                        <View className="flex-row justify-between items-center mb-4">
                            <Text className="text-xl font-bold text-gray-900">Choisir une catégorie</Text>
                            <TouchableOpacity 
                                onPress={() => setCategoryModalVisible(false)}
                                className="bg-gray-100 p-2 rounded-full"
                            >
                                <Ionicons name="close" size={24} color="#374151" />
                            </TouchableOpacity>
                        </View>

                        {CATEGORIES.map((cat) => (
                            <TouchableOpacity
                                key={cat.id}
                                className={`p-4 rounded-xl mb-2 flex-row items-center ${
                                    newProduct.category === cat.name ? 'bg-epitech-blue/10 border-2 border-epitech-blue' : 'bg-gray-50'
                                }`}
                                onPress={() => {
                                    setNewProduct({ ...newProduct, category: cat.name });
                                    setCategoryModalVisible(false);
                                }}
                            >
                                <View 
                                    className="w-10 h-10 rounded-full items-center justify-center mr-3"
                                    style={{ backgroundColor: `${cat.color}20` }}
                                >
                                    <Ionicons name={cat.icon as any} size={20} color={cat.color} />
                                </View>
                                <Text className={`flex-1 font-medium ${
                                    newProduct.category === cat.name ? 'text-epitech-blue' : 'text-gray-900'
                                }`}>
                                    {cat.name}
                                </Text>
                                {newProduct.category === cat.name && (
                                    <Ionicons name="checkmark-circle" size={24} color="#0091D3" />
                                )}
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>
            </Modal>
        </View>
    );
}

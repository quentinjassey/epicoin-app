import { Ionicons } from '@expo/vector-icons';
import * as LocalAuthentication from 'expo-local-authentication';
import { useFocusEffect } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Modal,
    Platform,
    RefreshControl,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { supabase } from '../../lib/supabase';
import { collectTransactionContext, buildTransactionPayload } from '../../lib/transactionContext';

type Product = {
    id: string;
    name: string;
    description: string | null;
    price_epicoin: number;
    stock_quantity: number;
    image_url: string | null;
    category: string | null;
};

type BiometricType = 'faceid' | 'touchid' | 'fingerprint' | 'none';

export default function ShopScreen() {
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [balance, setBalance] = useState<number>(0);
    
    // Purchase modal state
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
    const [quantity, setQuantity] = useState(1);
    const [showPurchaseModal, setShowPurchaseModal] = useState(false);
    const [purchasing, setPurchasing] = useState(false);
    
    // Auth state
    const [authMethod, setAuthMethod] = useState<'biometric' | 'password'>('password');
    const [biometricType, setBiometricType] = useState<BiometricType>('none');
    const [password, setPassword] = useState('');

    useFocusEffect(
        useCallback(() => {
            fetchProducts();
            fetchBalance();
            checkBiometricAvailability();
        }, [])
    );

    async function checkBiometricAvailability() {
        const hasHardware = await LocalAuthentication.hasHardwareAsync();
        const isEnrolled = await LocalAuthentication.isEnrolledAsync();
        
        if (hasHardware && isEnrolled) {
            setAuthMethod('biometric');
            const supportedTypes = await LocalAuthentication.supportedAuthenticationTypesAsync();
            
            if (Platform.OS === 'ios') {
                if (supportedTypes.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
                    setBiometricType('faceid');
                } else if (supportedTypes.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
                    setBiometricType('touchid');
                }
            } else {
                if (supportedTypes.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
                    setBiometricType('fingerprint');
                }
            }
        } else {
            setAuthMethod('password');
            setBiometricType('none');
        }
    }

    function getBiometricLabel(): string {
        switch (biometricType) {
            case 'faceid': return 'Face ID';
            case 'touchid': return 'Touch ID';
            case 'fingerprint': return 'Empreinte';
            default: return 'Biométrie';
        }
    }

    function getBiometricIcon(): string {
        switch (biometricType) {
            case 'faceid': return 'scan';
            case 'touchid':
            case 'fingerprint': return 'finger-print';
            default: return 'lock-closed';
        }
    }

    async function fetchProducts() {
        try {
            const { data, error } = await supabase
                .from('products')
                .select('*')
                .gt('stock_quantity', 0)
                .order('name', { ascending: true });

            if (error) throw error;
            setProducts(data || []);
        } catch (error) {
            console.error('Error fetching products:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }

    async function fetchBalance() {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data, error } = await supabase
                .from('profiles')
                .select('balance')
                .eq('id', user.id)
                .single();

            if (!error && data) {
                setBalance(data.balance);
            }
        } catch (error) {
            console.error('Error fetching balance:', error);
        }
    }

    function onRefresh() {
        setRefreshing(true);
        fetchProducts();
        fetchBalance();
    }

    function handleProductPress(product: Product) {
        setSelectedProduct(product);
        setQuantity(1);
        setPassword('');
        setShowPurchaseModal(true);
    }

    async function handleConfirmPurchase() {
        if (!selectedProduct) return;

        if (authMethod === 'biometric') {
            const promptMessage = biometricType === 'faceid' 
                ? 'Confirmez votre achat avec Face ID'
                : biometricType === 'touchid'
                ? 'Confirmez votre achat avec Touch ID'
                : 'Confirmez votre achat avec votre empreinte';

            const result = await LocalAuthentication.authenticateAsync({
                promptMessage,
                fallbackLabel: 'Utiliser le mot de passe',
                cancelLabel: 'Annuler',
                disableDeviceFallback: true,
            });

            if (result.success) {
                processPurchase();
            } else if (result.error !== 'user_cancel' && result.error !== 'system_cancel') {
                setAuthMethod('password');
            }
        } else {
            if (!password) {
                Alert.alert('Erreur', 'Veuillez entrer votre mot de passe');
                return;
            }

            setPurchasing(true);
            const { data: { user } } = await supabase.auth.getUser();
            
            if (user && user.email) {
                const { error } = await supabase.auth.signInWithPassword({
                    email: user.email,
                    password: password,
                });

                if (error) {
                    Alert.alert('Erreur', 'Mot de passe incorrect');
                    setPurchasing(false);
                } else {
                    processPurchase();
                }
            } else {
                setPurchasing(false);
                Alert.alert('Erreur', 'Session utilisateur introuvable');
            }
        }
    }

    async function processPurchase() {
        if (!selectedProduct) return;

        setPurchasing(true);
        const totalPrice = selectedProduct.price_epicoin * quantity;

        try {
            // Récupérer l'utilisateur actuel
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                throw new Error('Session utilisateur introuvable');
            }

            // Collecter le contexte de la transaction
            const context = await collectTransactionContext();

            // Construire le payload enrichi pour fraud-detection
            const payload = buildTransactionPayload({
                userId: user.id,
                amount: totalPrice,
                type: 'purchase',
                productId: selectedProduct.id,
                description: `Achat: ${quantity}x ${selectedProduct.name}`,
                context,
                metadata: {
                    product_name: selectedProduct.name,
                    quantity: quantity,
                    unit_price: selectedProduct.price_epicoin,
                },
            });

            // Appeler fraud-detection Edge Function
            const { data: fraudResponse, error: fraudError } = await supabase.functions.invoke('fraud-detection', {
                body: { transaction: payload }
            });

            if (fraudError) {
                console.warn('[Shop] Fraud detection unavailable, proceeding without ML:', fraudError);
                // Continue sans fraud detection si l'Edge Function échoue
            }

            // Vérifier si la transaction est bloquée par fraud-detection
            if (fraudResponse?.decision === 'blocked') {
                setShowPurchaseModal(false);
                Alert.alert(
                    'Transaction Bloquée', 
                    fraudResponse.reason || 'Cette transaction a été bloquée par notre système de sécurité.',
                    [{ text: 'OK' }]
                );
                return;
            }

            // Effectuer l'achat avec les scores de fraude
            const { data, error } = await supabase.rpc('purchase_product', {
                product_id: selectedProduct.id,
                qty: quantity,
                fraud_score: fraudResponse?.riskScore || 0,
                fraud_features: fraudResponse?.features || {}
            });

            if (error) throw error;

            if (data && data.success) {
                if (data.status === 'pending_review') {
                    setShowPurchaseModal(false);
                    Alert.alert(
                        'Vérification de sécurité', 
                        'Votre achat a été signalé pour vérification de sécurité. Il sera traité après approbation par un administrateur.',
                        [{ text: 'OK' }]
                    );
                } else {
                    setShowPurchaseModal(false);
                    Alert.alert(
                        'Achat réussi ! 🎉',
                        `Vous avez acheté ${quantity}x ${selectedProduct.name} pour ${totalPrice} EPC`,
                        [{ text: 'Super !' }]
                    );
                }
                fetchProducts();
                fetchBalance();
            } else {
                Alert.alert('Erreur', data?.message || 'L\'achat a échoué');
            }
        } catch (error: any) {
            Alert.alert('Erreur', error.message);
        } finally {
            setPurchasing(false);
        }
    }

    const filteredProducts = products.filter(product =>
        product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.description?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const getCategoryIcon = (category: string | null): string => {
        switch (category?.toLowerCase()) {
            case 'boissons': return 'cafe';
            case 'snacks': return 'fast-food';
            case 'repas': return 'restaurant';
            case 'fournitures': return 'pencil';
            default: return 'cube';
        }
    };

    const getCategoryColor = (category: string | null): { bg: string; color: string } => {
        switch (category?.toLowerCase()) {
            case 'boissons': return { bg: 'bg-amber-100', color: '#d97706' };
            case 'snacks': return { bg: 'bg-orange-100', color: '#ea580c' };
            case 'repas': return { bg: 'bg-green-100', color: '#16a34a' };
            case 'fournitures': return { bg: 'bg-blue-100', color: '#2563eb' };
            default: return { bg: 'bg-gray-100', color: '#6b7280' };
        }
    };

    const renderProduct = ({ item }: { item: Product }) => {
        const categoryStyle = getCategoryColor(item.category);
        const canAfford = balance >= item.price_epicoin;

        return (
            <TouchableOpacity
                className={`bg-white rounded-2xl p-4 mb-3 shadow-sm border border-gray-100 ${!canAfford ? 'opacity-60' : ''}`}
                onPress={() => canAfford && handleProductPress(item)}
                disabled={!canAfford}
            >
                <View className="flex-row items-center">
                    <View className={`${categoryStyle.bg} p-4 rounded-xl mr-4`}>
                        <Ionicons 
                            name={getCategoryIcon(item.category) as any} 
                            size={28} 
                            color={categoryStyle.color} 
                        />
                    </View>
                    
                    <View className="flex-1">
                        <Text className="font-bold text-lg text-gray-900" numberOfLines={1}>
                            {item.name}
                        </Text>
                        {item.description && (
                            <Text className="text-gray-500 text-sm mt-0.5" numberOfLines={1}>
                                {item.description}
                            </Text>
                        )}
                        <View className="flex-row items-center mt-2">
                            <View className={`${item.stock_quantity > 5 ? 'bg-green-100' : 'bg-amber-100'} px-2 py-0.5 rounded-full`}>
                                <Text className={`text-xs font-medium ${item.stock_quantity > 5 ? 'text-green-700' : 'text-amber-700'}`}>
                                    {item.stock_quantity} en stock
                                </Text>
                            </View>
                        </View>
                    </View>
                    
                    <View className="items-end">
                        <Text className="text-epitech-blue font-bold text-xl">
                            {item.price_epicoin}
                        </Text>
                        <Text className="text-gray-400 text-xs">EPC</Text>
                        {!canAfford && (
                            <Text className="text-red-500 text-xs mt-1">Solde insuffisant</Text>
                        )}
                    </View>
                </View>
            </TouchableOpacity>
        );
    };

    if (loading) {
        return (
            <View className="flex-1 justify-center items-center bg-gray-50">
                <ActivityIndicator size="large" color="#0091D3" />
            </View>
        );
    }

    return (
        <View className="flex-1 bg-gray-50">
            {/* Header */}
            <View className="bg-epitech-blue pt-14 pb-6 px-6">
                <View className="flex-row justify-between items-center mb-4">
                    <View>
                        <Text className="text-blue-100 text-sm">Boutique</Text>
                        <Text className="text-white text-2xl font-bold">EpiShop</Text>
                    </View>
                    <View className="bg-white/20 px-4 py-2 rounded-full">
                        <Text className="text-white font-bold">{balance.toFixed(2)} EPC</Text>
                    </View>
                </View>

                {/* Search */}
                <View className="flex-row items-center bg-white/20 rounded-xl px-4 py-3">
                    <Ionicons name="search" size={20} color="white" />
                    <TextInput
                        className="flex-1 ml-3 text-white"
                        placeholder="Rechercher un produit..."
                        placeholderTextColor="rgba(255,255,255,0.6)"
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                    />
                    {searchQuery.length > 0 && (
                        <TouchableOpacity onPress={() => setSearchQuery('')}>
                            <Ionicons name="close-circle" size={20} color="white" />
                        </TouchableOpacity>
                    )}
                </View>
            </View>

            {/* Products List */}
            <FlatList
                data={filteredProducts}
                renderItem={renderProduct}
                keyExtractor={(item) => item.id}
                contentContainerStyle={{ padding: 16 }}
                refreshControl={
                    <RefreshControl 
                        refreshing={refreshing} 
                        onRefresh={onRefresh}
                        tintColor="#0091D3"
                    />
                }
                ListEmptyComponent={
                    <View className="items-center py-16">
                        <View className="bg-gray-100 p-6 rounded-full mb-4">
                            <Ionicons name="cart-outline" size={48} color="#9ca3af" />
                        </View>
                        <Text className="text-gray-500 text-lg font-medium">Aucun produit disponible</Text>
                        <Text className="text-gray-400 text-center mt-2">
                            Les produits apparaîtront ici une fois ajoutés.
                        </Text>
                    </View>
                }
            />

            {/* Purchase Modal */}
            <Modal
                visible={showPurchaseModal}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setShowPurchaseModal(false)}
            >
                <View className="flex-1 justify-center items-center bg-black/50 p-6">
                    <View className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl">
                        {/* Header */}
                        <View className="items-center mb-6">
                            <View className="bg-epitech-blue/10 p-4 rounded-full mb-3">
                                <Ionicons name="cart" size={32} color="#0091D3" />
                            </View>
                            <Text className="text-xl font-bold text-gray-900">Confirmer l'achat</Text>
                        </View>

                        {/* Product Info */}
                        {selectedProduct && (
                            <View className="bg-gray-50 rounded-xl p-4 mb-4">
                                <Text className="text-lg font-bold text-gray-900 mb-1">
                                    {selectedProduct.name}
                                </Text>
                                <Text className="text-epitech-blue font-bold">
                                    {selectedProduct.price_epicoin} EPC / unité
                                </Text>
                            </View>
                        )}

                        {/* Quantity Selector */}
                        <View className="mb-4">
                            <Text className="text-gray-600 font-medium mb-2">Quantité</Text>
                            <View className="flex-row items-center justify-center bg-gray-50 rounded-xl p-2">
                                <TouchableOpacity
                                    className="bg-white w-12 h-12 rounded-xl items-center justify-center shadow-sm"
                                    onPress={() => setQuantity(Math.max(1, quantity - 1))}
                                >
                                    <Ionicons name="remove" size={24} color="#0091D3" />
                                </TouchableOpacity>
                                <Text className="text-2xl font-bold text-gray-900 mx-8">{quantity}</Text>
                                <TouchableOpacity
                                    className="bg-white w-12 h-12 rounded-xl items-center justify-center shadow-sm"
                                    onPress={() => setQuantity(Math.min(selectedProduct?.stock_quantity || 1, quantity + 1))}
                                >
                                    <Ionicons name="add" size={24} color="#0091D3" />
                                </TouchableOpacity>
                            </View>
                        </View>

                        {/* Total */}
                        <View className="bg-epitech-blue/10 rounded-xl p-4 mb-4">
                            <View className="flex-row justify-between items-center">
                                <Text className="text-gray-600">Total à payer</Text>
                                <Text className="text-2xl font-bold text-epitech-blue">
                                    {selectedProduct ? (selectedProduct.price_epicoin * quantity).toFixed(2) : 0} EPC
                                </Text>
                            </View>
                            <View className="flex-row justify-between items-center mt-2">
                                <Text className="text-gray-400 text-sm">Solde après achat</Text>
                                <Text className="text-gray-500 font-medium">
                                    {selectedProduct ? (balance - (selectedProduct.price_epicoin * quantity)).toFixed(2) : balance} EPC
                                </Text>
                            </View>
                        </View>

                        {/* Auth Method Indicator */}
                        <View className="bg-amber-50 p-3 rounded-xl mb-4 border border-amber-200">
                            <View className="flex-row items-center">
                                <Ionicons 
                                    name={authMethod === 'biometric' ? getBiometricIcon() as any : 'key'} 
                                    size={18} 
                                    color="#d97706" 
                                />
                                <Text className="text-amber-800 font-medium ml-2 text-sm">
                                    {authMethod === 'biometric' 
                                        ? `Confirmation par ${getBiometricLabel()}`
                                        : 'Confirmation par mot de passe'
                                    }
                                </Text>
                            </View>
                        </View>

                        {/* Password Input */}
                        {authMethod === 'password' && (
                            <View className="mb-4">
                                <View className="flex-row items-center border border-gray-300 rounded-xl bg-gray-50 px-4 py-3">
                                    <Ionicons name="lock-closed-outline" size={20} color="#6b7280" />
                                    <TextInput
                                        className="flex-1 ml-3 text-gray-900"
                                        placeholder="Mot de passe"
                                        value={password}
                                        onChangeText={setPassword}
                                        secureTextEntry
                                        placeholderTextColor="#9ca3af"
                                    />
                                </View>
                            </View>
                        )}

                        {/* Actions */}
                        <View className="flex-row gap-3">
                            <TouchableOpacity
                                className="flex-1 bg-gray-100 p-4 rounded-xl items-center"
                                onPress={() => setShowPurchaseModal(false)}
                            >
                                <Text className="text-gray-700 font-bold">Annuler</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                className={`flex-1 p-4 rounded-xl items-center flex-row justify-center ${purchasing ? 'bg-gray-300' : 'bg-epitech-blue'}`}
                                onPress={handleConfirmPurchase}
                                disabled={purchasing}
                            >
                                {purchasing ? (
                                    <ActivityIndicator color="#fff" />
                                ) : (
                                    <>
                                        <Ionicons 
                                            name={authMethod === 'biometric' ? getBiometricIcon() as any : 'checkmark-circle'} 
                                            size={20} 
                                            color="white" 
                                        />
                                        <Text className="text-white font-bold ml-2">Acheter</Text>
                                    </>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
}



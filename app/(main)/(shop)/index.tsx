import { SymbolView } from 'expo-symbols';
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
    ScrollView,
    Text,
    TextInput,
    TouchableOpacity,
    View,
    Switch,
} from 'react-native';
import Slider from '@react-native-community/slider';
import { supabase } from '../../../lib/supabase';
import { collectTransactionContext, buildTransactionPayload } from '../../../lib/transactionContext';
import { Colors } from '@/constants/NativeColors';

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
    
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
    const [quantity, setQuantity] = useState(1);
    const [showPurchaseModal, setShowPurchaseModal] = useState(false);
    const [purchasing, setPurchasing] = useState(false);
    
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
            case 'faceid': return 'faceid';
            case 'touchid': return 'touchid';
            case 'fingerprint': return 'fingerprint';
            default: return 'lock.fill';
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

        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                throw new Error('Session utilisateur introuvable');
            }

            // Re-vérifier le stock en temps réel avant de lancer l'achat
            const { data: freshProduct } = await supabase
                .from('products')
                .select('stock_quantity, price_epicoin')
                .eq('id', selectedProduct.id)
                .single();

            if (!freshProduct) {
                Alert.alert('Erreur', 'Ce produit n\'est plus disponible');
                setShowPurchaseModal(false);
                fetchProducts();
                return;
            }

            if (freshProduct.stock_quantity < quantity) {
                Alert.alert(
                    'Stock insuffisant',
                    `Il ne reste que ${freshProduct.stock_quantity} unité(s) en stock.`,
                );
                // Mettre à jour le stock local pour ajuster le slider
                setSelectedProduct({ ...selectedProduct, stock_quantity: freshProduct.stock_quantity });
                if (quantity > freshProduct.stock_quantity) {
                    setQuantity(Math.max(1, freshProduct.stock_quantity));
                }
                return;
            }

            const totalPrice = freshProduct.price_epicoin * quantity;

            const context = await collectTransactionContext();

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

            const { data: fraudResponse, error: fraudError } = await supabase.functions.invoke('fraud-detection', {
                body: { transaction: payload }
            });

            if (fraudError) {
                console.warn('[Shop] Fraud detection unavailable, proceeding without ML:', fraudError);
            }

            if (fraudResponse?.decision === 'blocked') {
                setShowPurchaseModal(false);
                Alert.alert(
                    'Transaction Bloquée', 
                    fraudResponse.reason || 'Cette transaction a été bloquée par notre système de sécurité.',
                    [{ text: 'OK' }]
                );
                return;
            }

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
                        'Achat réussi',
                        `Vous avez acheté ${quantity}x ${selectedProduct.name} pour ${totalPrice.toFixed(2)} EPC`,
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
            case 'boissons': return 'cup.and.saucer.fill';
            case 'snacks': return 'takeoutbag.and.cup.and.straw.fill';
            case 'repas': return 'fork.knife';
            case 'fournitures': return 'pencil.and.ruler';
            default: return 'cube.fill';
        }
    };

    const getCategoryColor = (category: string | null): any => {
        switch (category?.toLowerCase()) {
            case 'boissons': return Colors.systemOrange;
            case 'snacks': return Colors.systemYellow;
            case 'repas': return Colors.systemRed;
            case 'fournitures': return Colors.systemBlue;
            default: return Colors.systemGray;
        }
    };

    const renderProduct = ({ item, index }: { item: Product, index: number }) => {
        const totalPrice = item.price_epicoin;
        const canAfford = balance >= totalPrice;

        return (
            <TouchableOpacity
                key={item.id}
                style={{
                    width: '47%',
                    backgroundColor: Colors.secondarySystemGroupedBackground,
                    borderRadius: 20,
                    borderCurve: 'continuous',
                    padding: 16,
                    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
                    minHeight: 180,
                }}
                onPress={() => handleProductPress(item)}
                disabled={!canAfford}
            >
                {/* Category Icon */}
                <View style={{
                    backgroundColor: `${getCategoryColor(item.category)}20`,
                    padding: 16,
                    borderRadius: 16,
                    borderCurve: 'continuous',
                    alignSelf: 'center',
                    marginBottom: 12,
                }}>
                    <SymbolView 
                        name={getCategoryIcon(item.category) as any} 
                        size={40}
                        tintColor={getCategoryColor(item.category)}
                    />
                </View>

                {/* Product Info */}
                <View style={{ flex: 1, justifyContent: 'space-between' }}>
                    <View>
                        <Text style={{
                            fontSize: 16,
                            fontWeight: '700',
                            color: Colors.label,
                            marginBottom: 4,
                            textAlign: 'center',
                        }} numberOfLines={2}>
                            {item.name}
                        </Text>
                        {item.description && (
                            <Text style={{
                                fontSize: 12,
                                color: Colors.tertiaryLabel,
                                marginBottom: 8,
                                textAlign: 'center',
                            }} numberOfLines={2}>
                                {item.description}
                            </Text>
                        )}
                    </View>

                    <View>
                        {/* Price */}
                        <Text style={{
                            fontSize: 20,
                            fontWeight: '700',
                            color: canAfford ? Colors.epitechBlue : Colors.tertiaryLabel,
                            fontVariant: ['tabular-nums'],
                            textAlign: 'center',
                            marginBottom: 6,
                        }}>
                            {totalPrice.toFixed(2)} EPC
                        </Text>

                        {/* Stock Badge */}
                        <View style={{
                            backgroundColor: item.stock_quantity > 10 ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                            paddingHorizontal: 10,
                            paddingVertical: 4,
                            borderRadius: 8,
                            borderCurve: 'continuous',
                            alignSelf: 'center',
                        }}>
                            <Text style={{
                                fontSize: 11,
                                color: item.stock_quantity > 10 ? Colors.systemGreen : Colors.systemOrange,
                                fontWeight: '700',
                            }}>
                                {item.stock_quantity > 10 ? 'En stock' : `${item.stock_quantity} restant${item.stock_quantity > 1 ? 's' : ''}`}
                            </Text>
                        </View>
                    </View>
                </View>

                {/* Insufficient Balance Overlay */}
                {!canAfford && (
                    <View style={{
                        position: 'absolute',
                        top: 8,
                        right: 8,
                        backgroundColor: 'rgba(239, 68, 68, 0.9)',
                        padding: 6,
                        borderRadius: 12,
                        borderCurve: 'continuous',
                    }}>
                        <SymbolView 
                            name="lock.fill" 
                            size={14}
                            tintColor="#fff"
                        />
                    </View>
                )}
            </TouchableOpacity>
        );
    };

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
        <View style={{
            flex: 1,
            backgroundColor: Colors.systemGroupedBackground,
        }}>
            <ScrollView
                style={{ flex: 1 }}
                contentInsetAdjustmentBehavior="automatic"
                contentContainerStyle={{
                    paddingTop: 16,
                    paddingBottom: 32,
                }}
                refreshControl={
                    <RefreshControl 
                        refreshing={refreshing} 
                        onRefresh={onRefresh}
                        tintColor={Colors.epitechBlue}
                    />
                }
            >
                {/* Title */}
                <View style={{
                    paddingHorizontal: 24,
                    marginBottom: 16,
                }}>
                    <Text style={{
                        fontSize: 34,
                        fontWeight: '700',
                        color: Colors.label,
                    }}>
                        Boutique
                    </Text>
                </View>

                {/* Balance Header */}
                <View style={{
                    backgroundColor: Colors.secondarySystemGroupedBackground,
                    padding: 16,
                    marginHorizontal: 16,
                    marginBottom: 16,
                    borderRadius: 16,
                    borderCurve: 'continuous',
                    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)',
                }}>
                    <View style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                    }}>
                        <Text style={{
                            fontSize: 15,
                            color: Colors.secondaryLabel,
                        }}>
                            Solde disponible
                        </Text>
                        <Text style={{
                            fontSize: 24,
                            fontWeight: '700',
                            color: Colors.epitechBlue,
                            fontVariant: ['tabular-nums'],
                        }}>
                            {balance.toFixed(2)} EPC
                        </Text>
                    </View>
                </View>

                {/* Search Bar */}
                <View style={{
                    paddingHorizontal: 16,
                    marginBottom: 16,
                }}>
                    <View style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        backgroundColor: Colors.secondarySystemGroupedBackground,
                        borderRadius: 12,
                        borderCurve: 'continuous',
                        paddingHorizontal: 12,
                        paddingVertical: 10,
                    }}>
                        <SymbolView 
                            name="magnifyingglass" 
                            size={18}
                            tintColor={Colors.tertiaryLabel}
                            style={{ marginRight: 8 }}
                        />
                        <TextInput
                            style={{
                                flex: 1,
                                fontSize: 16,
                                color: Colors.label,
                            }}
                            placeholder="Rechercher un produit..."
                            placeholderTextColor={Colors.tertiaryLabel}
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                        />
                        {searchQuery.length > 0 && (
                            <TouchableOpacity onPress={() => setSearchQuery('')}>
                                <SymbolView 
                                    name="xmark.circle.fill" 
                                    size={18}
                                    tintColor={Colors.tertiaryLabel}
                                />
                            </TouchableOpacity>
                        )}
                    </View>
                </View>

                {/* Products Grid */}
                {filteredProducts.length === 0 ? (
                    <View style={{
                        alignItems: 'center',
                        justifyContent: 'center',
                        paddingVertical: 80,
                    }}>
                        <View style={{
                            backgroundColor: Colors.systemFill,
                            padding: 24,
                            borderRadius: 48,
                            borderCurve: 'continuous',
                            marginBottom: 16,
                        }}>
                            <SymbolView 
                                name="bag.fill" 
                                size={48}
                                tintColor={Colors.tertiaryLabel}
                            />
                        </View>
                        <Text style={{
                            color: Colors.secondaryLabel,
                            fontSize: 17,
                            fontWeight: '600',
                        }}>
                            {searchQuery ? 'Aucun produit trouvé' : 'Boutique vide'}
                        </Text>
                    </View>
                ) : (
                    <View style={{
                        paddingHorizontal: 10,
                        flexDirection: 'row',
                        flexWrap: 'wrap',
                        gap: 12,
                    }}>
                        {filteredProducts.map((item, index) => renderProduct({ item, index }))}
                    </View>
                )}
            </ScrollView>

            {/* Purchase Modal */}
            <Modal
                visible={showPurchaseModal}
                animationType="slide"
                presentationStyle="formSheet"
                onRequestClose={() => setShowPurchaseModal(false)}
            >
                <View style={{
                    flex: 1,
                    backgroundColor: Colors.systemGroupedBackground,
                }}>
                    {/* Modal Header */}
                    <View style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: 16,
                        paddingTop: 24,
                        backgroundColor: Colors.secondarySystemGroupedBackground,
                        borderBottomWidth: 1,
                        borderBottomColor: Colors.separator,
                    }}>
                        <Text style={{
                            fontSize: 20,
                            fontWeight: '700',
                            color: Colors.label,
                        }}>
                            Confirmer l'achat
                        </Text>
                        <TouchableOpacity onPress={() => setShowPurchaseModal(false)}>
                            <SymbolView 
                                name="xmark.circle.fill" 
                                size={28}
                                tintColor={Colors.tertiaryLabel}
                            />
                        </TouchableOpacity>
                    </View>

                    <View style={{ flex: 1, padding: 16 }}>
                        {selectedProduct && (
                            <>
                                {/* Product Info */}
                                <View style={{
                                    backgroundColor: Colors.secondarySystemGroupedBackground,
                                    borderRadius: 16,
                                    borderCurve: 'continuous',
                                    padding: 16,
                                    marginBottom: 24,
                                }}>
                                    <Text style={{
                                        fontSize: 20,
                                        fontWeight: '700',
                                        color: Colors.label,
                                        marginBottom: 8,
                                    }}>
                                        {selectedProduct.name}
                                    </Text>
                                    <Text style={{
                                        fontSize: 15,
                                        color: Colors.secondaryLabel,
                                        marginBottom: 12,
                                    }}>
                                        {selectedProduct.description}
                                    </Text>
                                    <Text style={{
                                        fontSize: 24,
                                        fontWeight: '700',
                                        color: Colors.epitechBlue,
                                        fontVariant: ['tabular-nums'],
                                    }}>
                                        {selectedProduct.price_epicoin.toFixed(2)} EPC / unité
                                    </Text>
                                </View>

                                {/* Quantity Slider */}
                                <View style={{
                                    backgroundColor: Colors.secondarySystemGroupedBackground,
                                    borderRadius: 16,
                                    borderCurve: 'continuous',
                                    padding: 16,
                                    marginBottom: 24,
                                }}>
                                    <View style={{
                                        flexDirection: 'row',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        marginBottom: 16,
                                    }}>
                                        <Text style={{
                                            fontSize: 17,
                                            fontWeight: '600',
                                            color: Colors.label,
                                        }}>
                                            Quantité
                                        </Text>
                                        <View style={{
                                            backgroundColor: Colors.epitechBlue,
                                            paddingHorizontal: 16,
                                            paddingVertical: 8,
                                            borderRadius: 12,
                                            borderCurve: 'continuous',
                                        }}>
                                            <Text style={{
                                                fontSize: 20,
                                                fontWeight: '700',
                                                color: '#fff',
                                                fontVariant: ['tabular-nums'],
                                            }}>
                                                {quantity}
                                            </Text>
                                        </View>
                                    </View>
                                    <Slider
                                        style={{ width: '100%', height: 40 }}
                                        minimumValue={1}
                                        maximumValue={Math.min(10, selectedProduct.stock_quantity)}
                                        step={1}
                                        value={quantity}
                                        onValueChange={setQuantity}
                                        minimumTrackTintColor="#0091D3"
                                        maximumTrackTintColor="rgba(120, 120, 128, 0.2)"
                                        thumbTintColor="#0091D3"
                                    />
                                </View>

                                {/* Total */}
                                <View style={{
                                    backgroundColor: Colors.secondarySystemGroupedBackground,
                                    borderRadius: 16,
                                    borderCurve: 'continuous',
                                    padding: 16,
                                    marginBottom: 24,
                                }}>
                                    <View style={{
                                        flexDirection: 'row',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                    }}>
                                        <Text style={{
                                            fontSize: 17,
                                            fontWeight: '600',
                                            color: Colors.label,
                                        }}>
                                            Total
                                        </Text>
                                        <Text style={{
                                            fontSize: 28,
                                            fontWeight: '700',
                                            color: Colors.epitechBlue,
                                            fontVariant: ['tabular-nums'],
                                        }}>
                                            {(selectedProduct.price_epicoin * quantity).toFixed(2)} EPC
                                        </Text>
                                    </View>
                                </View>

                                {/* Auth Method */}
                                <View style={{
                                    backgroundColor: Colors.secondarySystemGroupedBackground,
                                    borderRadius: 16,
                                    borderCurve: 'continuous',
                                    padding: 16,
                                    marginBottom: 24,
                                }}>
                                    {biometricType !== 'none' && (
                                        <View style={{
                                            flexDirection: 'row',
                                            justifyContent: 'space-between',
                                            alignItems: 'center',
                                            marginBottom: authMethod === 'password' ? 16 : 0,
                                        }}>
                                            <Text style={{
                                                fontSize: 15,
                                                fontWeight: '600',
                                                color: Colors.label,
                                            }}>
                                                Utiliser {getBiometricLabel()}
                                            </Text>
                                            <Switch
                                                value={authMethod === 'biometric'}
                                                onValueChange={(value) => setAuthMethod(value ? 'biometric' : 'password')}
                                                trackColor={{ false: Colors.systemFill, true: Colors.epitechBlue }}
                                            />
                                        </View>
                                    )}

                                    {authMethod === 'password' && (
                                        <View>
                                            <Text style={{
                                                fontSize: 15,
                                                fontWeight: '600',
                                                color: Colors.label,
                                                marginBottom: 8,
                                            }}>
                                                Mot de passe
                                            </Text>
                                            <TextInput
                                                style={{
                                                    backgroundColor: Colors.systemFill,
                                                    borderRadius: 12,
                                                    borderCurve: 'continuous',
                                                    padding: 12,
                                                    fontSize: 16,
                                                    color: Colors.label,
                                                }}
                                                placeholder="Entrez votre mot de passe"
                                                placeholderTextColor={Colors.tertiaryLabel}
                                                value={password}
                                                onChangeText={setPassword}
                                                secureTextEntry
                                                autoCapitalize="none"
                                            />
                                        </View>
                                    )}
                                </View>

                                {/* Confirm Button */}
                                <TouchableOpacity
                                    style={{
                                        backgroundColor: Colors.epitechBlue,
                                        borderRadius: 14,
                                        borderCurve: 'continuous',
                                        padding: 16,
                                        alignItems: 'center',
                                        flexDirection: 'row',
                                        justifyContent: 'center',
                                        gap: 8,
                                    }}
                                    onPress={handleConfirmPurchase}
                                    disabled={purchasing || (authMethod === 'password' && !password)}
                                >
                                    {purchasing ? (
                                        <ActivityIndicator color="#fff" />
                                    ) : (
                                        <>
                                            <SymbolView 
                                                name={(authMethod === 'biometric' ? getBiometricIcon() : 'lock.fill') as any} 
                                                size={20}
                                                tintColor="#fff"
                                            />
                                            <Text style={{
                                                color: '#fff',
                                                fontSize: 17,
                                                fontWeight: '700',
                                            }}>
                                                {authMethod === 'biometric' 
                                                    ? `Confirmer avec ${getBiometricLabel()}`
                                                    : 'Confirmer l\'achat'
                                                }
                                            </Text>
                                        </>
                                    )}
                                </TouchableOpacity>
                            </>
                        )}
                    </View>
                </View>
            </Modal>
        </View>
    );
}

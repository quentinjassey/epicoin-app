import Icon from '@/components/Icon';
import * as LocalAuthentication from 'expo-local-authentication';
import { useFocusEffect } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
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
import GlitchIn from '@/components/GlitchIn';
import { useAccessibility } from '@/lib/AccessibilityContext';

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

// ── Brutalist shadow preset ──
const brutalistShadow = {
    shadowColor: Colors.black,
    shadowOffset: { width: 3, height: 3 },
    shadowOpacity: 1,
    shadowRadius: 0,
};

export default function ShopScreen() {
    const { adaptiveColors } = useAccessibility();
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [balance, setBalance] = useState<number>(0);
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

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
                const msg = data?.message || 'L\'achat a échoué';
                // Si le produit a été supprimé ou le stock est épuisé, fermer le modal et rafraîchir
                if (msg.includes('introuvable') || msg.includes('Stock insuffisant')) {
                    setShowPurchaseModal(false);
                    Alert.alert('Produit indisponible', msg);
                    fetchProducts();
                } else {
                    Alert.alert('Erreur', msg);
                }
            }
        } catch (error: any) {
            Alert.alert('Erreur', error.message);
        } finally {
            setPurchasing(false);
            fetchProducts();
            fetchBalance();
        }
    }

    const filteredProducts = products.filter(product => {
        const matchesSearch = searchQuery === '' ||
            product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            product.description?.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesCategory = !selectedCategory || product.category === selectedCategory;
        return matchesSearch && matchesCategory;
    });

    // Group products by category
    const groupedProducts = filteredProducts.reduce((groups, product) => {
        const cat = product.category || 'Autres';
        if (!groups[cat]) groups[cat] = [];
        groups[cat].push(product);
        return groups;
    }, {} as Record<string, Product[]>);

    // Order categories
    const categoryOrder = ['Boissons', 'Snacks', 'Repas', 'Fournitures', 'Goodies', 'Autres'];
    const sortedCategories = Object.keys(groupedProducts).sort(
        (a, b) => (categoryOrder.indexOf(a) === -1 ? 99 : categoryOrder.indexOf(a)) - (categoryOrder.indexOf(b) === -1 ? 99 : categoryOrder.indexOf(b))
    );

    const CATEGORIES = [
        { key: 'Boissons', icon: 'cup.and.saucer.fill', color: adaptiveColors.warning },
        { key: 'Snacks', icon: 'takeoutbag.and.cup.and.straw.fill', color: adaptiveColors.warning },
        { key: 'Repas', icon: 'fork.knife', color: adaptiveColors.accent },
        { key: 'Fournitures', icon: 'pencil.and.ruler', color: adaptiveColors.primary },
        { key: 'Goodies', icon: 'tshirt.fill', color: adaptiveColors.success },
    ];

    const getCategoryIcon = (category: string | null): string => {
        return CATEGORIES.find(c => c.key.toLowerCase() === category?.toLowerCase())?.icon || 'cube.fill';
    };

    const getCategoryColor = (category: string | null): any => {
        return CATEGORIES.find(c => c.key.toLowerCase() === category?.toLowerCase())?.color || Colors.mediumGray;
    };

    const renderProduct = ({ item, index }: { item: Product, index: number }) => {
        const totalPrice = item.price_epicoin;
        const canAfford = balance >= totalPrice;

        return (
            <TouchableOpacity
                key={item.id}
                style={{
                    width: '47%',
                    backgroundColor: Colors.white,
                    borderRadius: 0,
                    padding: 16,
                    borderWidth: 2,
                    borderColor: Colors.black,
                    minHeight: 180,
                    ...brutalistShadow,
                }}
                onPress={() => handleProductPress(item)}
                disabled={!canAfford}
            >
                {/* Category Icon */}
                <View style={{
                    backgroundColor: Colors.offWhite,
                    padding: 16,
                    borderRadius: 0,
                    borderWidth: 2,
                    borderColor: Colors.black,
                    alignSelf: 'center',
                    marginBottom: 12,
                }}>
                    <Icon
                        name={getCategoryIcon(item.category)}
                        size={40}
                        color={getCategoryColor(item.category)}
                    />
                </View>

                {/* Product Info */}
                <View style={{ flex: 1, justifyContent: 'space-between' }}>
                    <View>
                        <Text style={{
                            fontSize: 16,
                            fontWeight: '800',
                            color: Colors.black,
                            marginBottom: 4,
                            textAlign: 'center',
                            textTransform: 'uppercase',
                            letterSpacing: 0.5,
                        }} numberOfLines={2}>
                            {item.name}
                        </Text>
                        {item.description && (
                            <Text style={{
                                fontSize: 12,
                                color: Colors.mediumGray,
                                marginBottom: 8,
                                textAlign: 'center',
                                fontWeight: '700',
                            }} numberOfLines={2}>
                                {item.description}
                            </Text>
                        )}
                    </View>

                    <View>
                        {/* Price */}
                        <Text style={{
                            fontSize: 20,
                            fontWeight: '900',
                            color: canAfford ? adaptiveColors.primary : Colors.mediumGray,
                            fontVariant: ['tabular-nums'],
                            textAlign: 'center',
                            marginBottom: 6,
                        }}>
                            {totalPrice.toFixed(2)} EPC
                        </Text>

                        {/* Stock Badge */}
                        <View style={{
                            backgroundColor: item.stock_quantity > 10 ? adaptiveColors.success : adaptiveColors.warning,
                            paddingHorizontal: 10,
                            paddingVertical: 4,
                            borderRadius: 0,
                            borderWidth: 2,
                            borderColor: Colors.black,
                            alignSelf: 'center',
                        }}>
                            <Text style={{
                                fontSize: 11,
                                color: Colors.white,
                                fontWeight: '900',
                                textTransform: 'uppercase',
                                letterSpacing: 0.5,
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
                        top: 0,
                        right: 0,
                        backgroundColor: adaptiveColors.error,
                        padding: 6,
                        borderRadius: 0,
                        borderLeftWidth: 2,
                        borderBottomWidth: 2,
                        borderColor: Colors.black,
                    }}>
                        <Icon
                            name="lock.fill"
                            size={14}
                            color={Colors.white}
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
                backgroundColor: Colors.white,
            }}>
                <ActivityIndicator size="large" color={adaptiveColors.primary} />
            </View>
        );
    }

    return (
        <View style={{
            flex: 1,
            backgroundColor: Colors.white,
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
                        tintColor={adaptiveColors.primary}
                    />
                }
            >
                {/* Title */}
                <GlitchIn delay={0}>
                <View style={{
                    paddingHorizontal: 24,
                    marginBottom: 16,
                }}>
                    <Text style={{
                        fontSize: 34,
                        fontWeight: '900',
                        color: Colors.black,
                        textTransform: 'uppercase',
                        letterSpacing: 2,
                    }}>
                        Boutique
                    </Text>
                </View>
                </GlitchIn>

                {/* Balance Header */}
                <GlitchIn delay={80}>
                <View style={{
                    backgroundColor: Colors.white,
                    padding: 16,
                    marginHorizontal: 16,
                    marginBottom: 16,
                    borderRadius: 0,
                    borderWidth: 2,
                    borderColor: Colors.black,
                    ...brutalistShadow,
                }}>
                    <View style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                    }}>
                        <Text style={{
                            fontSize: 15,
                            color: Colors.mediumGray,
                            fontWeight: '800',
                            textTransform: 'uppercase',
                            letterSpacing: 1,
                        }}>
                            Solde disponible
                        </Text>
                        <Text style={{
                            fontSize: 24,
                            fontWeight: '900',
                            color: adaptiveColors.primary,
                            fontVariant: ['tabular-nums'],
                        }}>
                            {balance.toFixed(2)} EPC
                        </Text>
                    </View>
                </View>
                </GlitchIn>

                {/* Search Bar */}
                <GlitchIn delay={120}>
                <View style={{
                    paddingHorizontal: 16,
                    marginBottom: 12,
                }}>
                    <View style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        backgroundColor: Colors.white,
                        borderRadius: 0,
                        borderWidth: 2,
                        borderColor: Colors.black,
                        paddingHorizontal: 12,
                        paddingVertical: 10,
                    }}>
                        <Icon
                            name="magnifyingglass"
                            size={18}
                            color={Colors.mediumGray}
                            style={{ marginRight: 8 }}
                        />
                        <TextInput
                            style={{
                                flex: 1,
                                fontSize: 16,
                                color: Colors.black,
                                fontWeight: '700',
                            }}
                            placeholder="RECHERCHER UN PRODUIT..."
                            placeholderTextColor={Colors.mediumGray}
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                        />
                        {searchQuery.length > 0 && (
                            <TouchableOpacity onPress={() => setSearchQuery('')}>
                                <Icon
                                    name="xmark.circle.fill"
                                    size={18}
                                    color={Colors.mediumGray}
                                />
                            </TouchableOpacity>
                        )}
                    </View>
                </View>
                </GlitchIn>

                {/* Category Filters */}
                <GlitchIn delay={160}>
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={{
                        paddingHorizontal: 16,
                        gap: 8,
                        marginBottom: 20,
                    }}
                >
                    <TouchableOpacity
                        onPress={() => setSelectedCategory(null)}
                        style={{
                            backgroundColor: !selectedCategory ? Colors.black : Colors.white,
                            borderWidth: 2,
                            borderColor: Colors.black,
                            paddingHorizontal: 16,
                            paddingVertical: 10,
                        }}
                    >
                        <Text style={{
                            color: !selectedCategory ? Colors.white : Colors.black,
                            fontWeight: '900',
                            fontSize: 12,
                            textTransform: 'uppercase',
                            letterSpacing: 1,
                        }}>
                            Tout
                        </Text>
                    </TouchableOpacity>
                    {CATEGORIES.map((cat) => {
                        const isActive = selectedCategory === cat.key;
                        const count = products.filter(p => p.category === cat.key).length;
                        if (count === 0) return null;
                        return (
                            <TouchableOpacity
                                key={cat.key}
                                onPress={() => setSelectedCategory(isActive ? null : cat.key)}
                                style={{
                                    backgroundColor: isActive ? cat.color : Colors.white,
                                    borderWidth: 2,
                                    borderColor: isActive ? cat.color : Colors.black,
                                    paddingHorizontal: 14,
                                    paddingVertical: 10,
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    gap: 6,
                                }}
                            >
                                <Icon
                                    name={cat.icon}
                                    size={14}
                                    color={isActive ? Colors.white : cat.color}
                                />
                                <Text style={{
                                    color: isActive ? Colors.white : Colors.black,
                                    fontWeight: '800',
                                    fontSize: 12,
                                    textTransform: 'uppercase',
                                    letterSpacing: 0.5,
                                }}>
                                    {cat.key}
                                </Text>
                                <Text style={{
                                    color: isActive ? 'rgba(255,255,255,0.7)' : Colors.mediumGray,
                                    fontWeight: '700',
                                    fontSize: 11,
                                }}>
                                    {count}
                                </Text>
                            </TouchableOpacity>
                        );
                    })}
                </ScrollView>
                </GlitchIn>

                {/* Products grouped by category */}
                <GlitchIn delay={240}>
                {filteredProducts.length === 0 ? (
                    <View style={{
                        alignItems: 'center',
                        justifyContent: 'center',
                        paddingVertical: 80,
                    }}>
                        <View style={{
                            backgroundColor: Colors.offWhite,
                            padding: 24,
                            borderRadius: 0,
                            borderWidth: 2,
                            borderColor: Colors.black,
                            marginBottom: 16,
                            ...brutalistShadow,
                        }}>
                            <Icon
                                name="bag.fill"
                                size={48}
                                color={Colors.mediumGray}
                            />
                        </View>
                        <Text style={{
                            color: Colors.black,
                            fontSize: 17,
                            fontWeight: '800',
                            textTransform: 'uppercase',
                            letterSpacing: 1,
                        }}>
                            {searchQuery ? 'Aucun produit trouve' : 'Boutique vide'}
                        </Text>
                    </View>
                ) : (
                    <View style={{ paddingBottom: 16 }}>
                        {sortedCategories.map((category) => (
                            <View key={category} style={{ marginBottom: 24 }}>
                                {/* Category Header */}
                                <View style={{
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    paddingHorizontal: 16,
                                    marginBottom: 12,
                                    gap: 10,
                                }}>
                                    <View style={{
                                        backgroundColor: getCategoryColor(category),
                                        padding: 6,
                                        borderWidth: 2,
                                        borderColor: Colors.black,
                                    }}>
                                        <Icon
                                            name={getCategoryIcon(category)}
                                            size={16}
                                            color={Colors.white}
                                        />
                                    </View>
                                    <Text style={{
                                        fontSize: 16,
                                        fontWeight: '900',
                                        color: Colors.black,
                                        textTransform: 'uppercase',
                                        letterSpacing: 2,
                                        flex: 1,
                                    }}>
                                        {category}
                                    </Text>
                                    <Text style={{
                                        fontSize: 13,
                                        fontWeight: '700',
                                        color: Colors.mediumGray,
                                    }}>
                                        {groupedProducts[category].length} article{groupedProducts[category].length > 1 ? 's' : ''}
                                    </Text>
                                </View>

                                {/* Category separator line */}
                                <View style={{
                                    height: 2,
                                    backgroundColor: Colors.black,
                                    marginHorizontal: 16,
                                    marginBottom: 12,
                                }} />

                                {/* Products Grid */}
                                <View style={{
                                    paddingHorizontal: 10,
                                    flexDirection: 'row',
                                    flexWrap: 'wrap',
                                    gap: 12,
                                }}>
                                    {groupedProducts[category].map((item, index) => renderProduct({ item, index }))}
                                </View>
                            </View>
                        ))}
                    </View>
                )}
                </GlitchIn>
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
                    backgroundColor: Colors.white,
                }}>
                    {/* Modal Header */}
                    <View style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: 16,
                        paddingTop: 24,
                        backgroundColor: Colors.white,
                        borderBottomWidth: 2,
                        borderBottomColor: Colors.black,
                    }}>
                        <Text style={{
                            fontSize: 20,
                            fontWeight: '900',
                            color: Colors.black,
                            textTransform: 'uppercase',
                            letterSpacing: 1,
                        }}>
                            Confirmer l'achat
                        </Text>
                        <TouchableOpacity
                            onPress={() => setShowPurchaseModal(false)}
                            style={{
                                borderWidth: 2,
                                borderColor: Colors.black,
                                borderRadius: 0,
                                padding: 4,
                            }}
                        >
                            <Icon
                                name="xmark"
                                size={20}
                                color={Colors.black}
                            />
                        </TouchableOpacity>
                    </View>

                    <View style={{ flex: 1, padding: 16 }}>
                        {selectedProduct && (
                            <>
                                {/* Product Info */}
                                <View style={{
                                    backgroundColor: Colors.white,
                                    borderRadius: 0,
                                    borderWidth: 2,
                                    borderColor: Colors.black,
                                    padding: 16,
                                    marginBottom: 16,
                                    ...brutalistShadow,
                                }}>
                                    <Text style={{
                                        fontSize: 20,
                                        fontWeight: '900',
                                        color: Colors.black,
                                        marginBottom: 8,
                                        textTransform: 'uppercase',
                                        letterSpacing: 0.5,
                                    }}>
                                        {selectedProduct.name}
                                    </Text>
                                    <Text style={{
                                        fontSize: 15,
                                        color: Colors.mediumGray,
                                        marginBottom: 12,
                                        fontWeight: '700',
                                    }}>
                                        {selectedProduct.description}
                                    </Text>
                                    <Text style={{
                                        fontSize: 24,
                                        fontWeight: '900',
                                        color: adaptiveColors.primary,
                                        fontVariant: ['tabular-nums'],
                                    }}>
                                        {selectedProduct.price_epicoin.toFixed(2)} EPC / unité
                                    </Text>
                                </View>

                                {/* Quantity Slider */}
                                <View style={{
                                    backgroundColor: Colors.white,
                                    borderRadius: 0,
                                    borderWidth: 2,
                                    borderColor: Colors.black,
                                    padding: 16,
                                    marginBottom: 16,
                                    ...brutalistShadow,
                                }}>
                                    <View style={{
                                        flexDirection: 'row',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        marginBottom: 16,
                                    }}>
                                        <Text style={{
                                            fontSize: 17,
                                            fontWeight: '800',
                                            color: Colors.black,
                                            textTransform: 'uppercase',
                                            letterSpacing: 1,
                                        }}>
                                            Quantité
                                        </Text>
                                        <View style={{
                                            backgroundColor: adaptiveColors.primary,
                                            paddingHorizontal: 16,
                                            paddingVertical: 8,
                                            borderRadius: 0,
                                            borderWidth: 2,
                                            borderColor: Colors.black,
                                        }}>
                                            <Text style={{
                                                fontSize: 20,
                                                fontWeight: '900',
                                                color: Colors.white,
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
                                        minimumTrackTintColor={adaptiveColors.primary}
                                        maximumTrackTintColor={Colors.lightGray}
                                        thumbTintColor={adaptiveColors.primary}
                                    />
                                </View>

                                {/* Total */}
                                <View style={{
                                    backgroundColor: Colors.offWhite,
                                    borderRadius: 0,
                                    borderWidth: 2,
                                    borderColor: Colors.black,
                                    padding: 16,
                                    marginBottom: 16,
                                    ...brutalistShadow,
                                }}>
                                    <View style={{
                                        flexDirection: 'row',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                    }}>
                                        <Text style={{
                                            fontSize: 17,
                                            fontWeight: '800',
                                            color: Colors.black,
                                            textTransform: 'uppercase',
                                            letterSpacing: 1,
                                        }}>
                                            Total
                                        </Text>
                                        <Text style={{
                                            fontSize: 28,
                                            fontWeight: '900',
                                            color: adaptiveColors.primary,
                                            fontVariant: ['tabular-nums'],
                                        }}>
                                            {(selectedProduct.price_epicoin * quantity).toFixed(2)} EPC
                                        </Text>
                                    </View>
                                </View>

                                {/* Auth Method */}
                                <View style={{
                                    backgroundColor: Colors.white,
                                    borderRadius: 0,
                                    borderWidth: 2,
                                    borderColor: Colors.black,
                                    padding: 16,
                                    marginBottom: 16,
                                    ...brutalistShadow,
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
                                                fontWeight: '800',
                                                color: Colors.black,
                                                textTransform: 'uppercase',
                                                letterSpacing: 0.5,
                                            }}>
                                                Utiliser {getBiometricLabel()}
                                            </Text>
                                            <Switch
                                                value={authMethod === 'biometric'}
                                                onValueChange={(value) => setAuthMethod(value ? 'biometric' : 'password')}
                                                trackColor={{ false: Colors.lightGray, true: adaptiveColors.primary }}
                                            />
                                        </View>
                                    )}

                                    {authMethod === 'password' && (
                                        <View>
                                            <Text style={{
                                                fontSize: 15,
                                                fontWeight: '800',
                                                color: Colors.black,
                                                marginBottom: 8,
                                                textTransform: 'uppercase',
                                                letterSpacing: 0.5,
                                            }}>
                                                Mot de passe
                                            </Text>
                                            <TextInput
                                                style={{
                                                    backgroundColor: Colors.offWhite,
                                                    borderRadius: 0,
                                                    borderWidth: 2,
                                                    borderColor: Colors.black,
                                                    padding: 12,
                                                    fontSize: 16,
                                                    color: Colors.black,
                                                    fontWeight: '700',
                                                }}
                                                placeholder="Entrez votre mot de passe"
                                                placeholderTextColor={Colors.mediumGray}
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
                                        backgroundColor: adaptiveColors.primary,
                                        borderRadius: 0,
                                        borderWidth: 2,
                                        borderColor: Colors.black,
                                        padding: 16,
                                        alignItems: 'center',
                                        flexDirection: 'row',
                                        justifyContent: 'center',
                                        gap: 8,
                                        ...brutalistShadow,
                                    }}
                                    onPress={handleConfirmPurchase}
                                    disabled={purchasing || (authMethod === 'password' && !password)}
                                >
                                    {purchasing ? (
                                        <ActivityIndicator color={Colors.white} />
                                    ) : (
                                        <>
                                            <Icon
                                                name={authMethod === 'biometric' ? getBiometricIcon() : 'lock.fill'}
                                                size={20}
                                                color={Colors.white}
                                            />
                                            <Text style={{
                                                color: Colors.white,
                                                fontSize: 17,
                                                fontWeight: '900',
                                                textTransform: 'uppercase',
                                                letterSpacing: 1,
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

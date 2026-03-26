import { Tabs } from 'expo-router';
import { Text, View, TouchableOpacity } from 'react-native';
import Icon from '@/components/Icon';
import NotifBanner from '@/components/NotifBanner';
import { Colors } from '@/constants/NativeColors';
import { useAccessibility } from '@/lib/AccessibilityContext';
import { useGlitch } from '@/lib/GlitchContext';
import { useNotifications } from '@/lib/NotificationContext';

const TAB_CONFIG = [
    { name: '(wallet)', label: 'WALLET', icon: 'wallet.pass.fill' },
    { name: '(history)', label: 'RECENTS', icon: 'clock' },
    { name: '(shop)', label: 'BOUTIQUE', icon: 'bag.fill' },
    { name: '(profile)', label: 'PROFIL', icon: 'person.fill' },
];

function BrutalistTabBar({ state, descriptors, navigation }: any) {
    const { adaptiveColors } = useAccessibility();
    const { unreadCount } = useNotifications();
    const { triggerGlitch } = useGlitch();
    return (
        <View style={{
            flexDirection: 'row',
            backgroundColor: Colors.white,
            borderTopWidth: 2,
            borderTopColor: Colors.black,
            paddingBottom: 24,
            paddingTop: 8,
        }}>
            {state.routes.map((route: any, index: number) => {
                const config = TAB_CONFIG[index];
                if (!config) return null;

                const isFocused = state.index === index;

                const onPress = () => {
                    const event = navigation.emit({
                        type: 'tabPress',
                        target: route.key,
                        canPreventDefault: true,
                    });
                    if (!isFocused && !event.defaultPrevented) {
                        triggerGlitch();
                        navigation.navigate(route.name, route.params);
                    }
                };

                return (
                    <TouchableOpacity
                        key={route.key}
                        onPress={onPress}
                        style={{
                            flex: 1,
                            alignItems: 'center',
                            justifyContent: 'center',
                            paddingVertical: 4,
                        }}
                    >
                        <View style={{ position: 'relative' }}>
                            <View style={{
                                backgroundColor: isFocused ? adaptiveColors.primary : 'transparent',
                                padding: 7,
                                borderWidth: isFocused ? 2 : 0,
                                borderColor: Colors.black,
                                marginBottom: 5,
                            }}>
                                <Icon
                                    name={config.icon}
                                    size={26}
                                    color={isFocused ? Colors.white : Colors.mediumGray}
                                />
                            </View>
                            {config.name === '(profile)' && unreadCount > 0 && (
                                <View style={{
                                    position: 'absolute',
                                    top: -4,
                                    right: -6,
                                    backgroundColor: adaptiveColors.error,
                                    minWidth: 18,
                                    height: 18,
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    borderWidth: 2,
                                    borderColor: Colors.white,
                                    paddingHorizontal: 4,
                                }}>
                                    <Text style={{ color: Colors.white, fontSize: 10, fontWeight: '900' }}>
                                        {unreadCount > 99 ? '99+' : unreadCount}
                                    </Text>
                                </View>
                            )}
                        </View>
                        <Text style={{
                            fontSize: 10,
                            fontWeight: '900',
                            color: isFocused ? Colors.black : Colors.mediumGray,
                            textTransform: 'uppercase',
                            letterSpacing: 0.5,
                        }}>
                            {config.label}
                        </Text>
                    </TouchableOpacity>
                );
            })}
        </View>
    );
}

export default function MainTabsLayout() {
    const { banner, dismissBanner } = useNotifications();

    return (
        <View style={{ flex: 1 }}>
        <Tabs
            tabBar={(props) => <BrutalistTabBar {...props} />}
            screenOptions={{ headerShown: false }}
        >
            <Tabs.Screen name="(wallet)" />
            <Tabs.Screen name="(history)" />
            <Tabs.Screen name="(shop)" />
            <Tabs.Screen name="(profile)" />
        </Tabs>
        <NotifBanner
            visible={banner.visible}
            title={banner.title}
            body={banner.body}
            type={banner.type}
            onDismiss={dismissBanner}
        />
        </View>
    );
}

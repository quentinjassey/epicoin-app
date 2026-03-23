import { Tabs } from 'expo-router';
import { Text, View, TouchableOpacity } from 'react-native';
import Icon from '@/components/Icon';
import { Colors } from '@/constants/NativeColors';
import { useAccessibility } from '@/lib/AccessibilityContext';

const TAB_CONFIG = [
    { name: '(wallet)', label: 'WALLET', icon: 'wallet.pass.fill' },
    { name: '(history)', label: 'RECENTS', icon: 'clock' },
    { name: '(shop)', label: 'BOUTIQUE', icon: 'bag.fill' },
    { name: '(profile)', label: 'PROFIL', icon: 'person.fill' },
];

function BrutalistTabBar({ state, descriptors, navigation }: any) {
    const { adaptiveColors } = useAccessibility();
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
    return (
        <Tabs
            tabBar={(props) => <BrutalistTabBar {...props} />}
            screenOptions={{ headerShown: false }}
        >
            <Tabs.Screen name="(wallet)" />
            <Tabs.Screen name="(history)" />
            <Tabs.Screen name="(shop)" />
            <Tabs.Screen name="(profile)" />
        </Tabs>
    );
}

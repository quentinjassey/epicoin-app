import { NativeTabs, Icon, Label } from 'expo-router/unstable-native-tabs';
import { Theme } from '@/components/Theme';
import { Platform } from 'react-native';

export default function MainTabsLayout() {
  return (
    <Theme>
      <NativeTabs
        sidebarAdaptable
        minimizeBehavior="onScrollDown"
        tintColor="#013AFB"
      >
        <NativeTabs.Trigger name="(wallet)">
          <Icon
            sf="wallet.pass.fill"
            drawable={Platform.OS === 'android' ? 'ic_menu_wallet' : undefined}
          />
          <Label>Wallet</Label>
        </NativeTabs.Trigger>

        <NativeTabs.Trigger name="(history)" role="recents">
          <Icon
            sf="clock.fill"
            drawable={Platform.OS === 'android' ? 'ic_menu_recent_history' : undefined}
          />
          <Label>Historique</Label>
        </NativeTabs.Trigger>

        <NativeTabs.Trigger name="(shop)">
          <Icon
            sf="bag.fill"
            drawable={Platform.OS === 'android' ? 'ic_menu_gallery' : undefined}
          />
          <Label>Boutique</Label>
        </NativeTabs.Trigger>

        <NativeTabs.Trigger name="(profile)">
          <Icon
            sf="person.fill"
            drawable={Platform.OS === 'android' ? 'ic_menu_myplaces' : undefined}
          />
          <Label>Profil</Label>
        </NativeTabs.Trigger>
      </NativeTabs>
    </Theme>
  );
}

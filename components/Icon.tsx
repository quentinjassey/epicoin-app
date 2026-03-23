import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import React from 'react';

// Mapping SF Symbols -> Material Icons (sharp style)
const ICON_MAP: Record<string, string> = {
    // Navigation
    'chevron.left': 'chevron-left',
    'chevron.right': 'chevron-right',
    'chevron.down': 'expand-more',
    'chevron.up': 'expand-less',
    'xmark': 'close',
    'xmark.circle': 'cancel',
    'xmark.circle.fill': 'cancel',

    // Actions
    'plus.circle.fill': 'add-circle',
    'paperplane.fill': 'send',
    'magnifyingglass': 'search',
    'square.and.arrow.up': 'share',
    'arrow.up.right': 'open-in-new',
    'arrow.left.arrow.right': 'swap-horiz',
    'shield.fill': 'shield',
    'tag.fill': 'local-offer',
    'iphone.and.arrow.forward': 'smartphone',
    'eye.fill': 'visibility',
    'eye.slash.fill': 'visibility-off',
    'checkmark': 'check',
    'pencil': 'edit',
    'slider.horizontal.3': 'tune',

    // Finance
    'creditcard.fill': 'credit-card',
    'dollarsign.circle.fill': 'attach-money',
    'wallet.pass.fill': 'account-balance-wallet',
    'cart.fill': 'shopping-cart',
    'bag.fill': 'shopping-bag',

    // User
    'person.fill': 'person',
    'person.circle': 'account-circle',
    'person.3.fill': 'group',
    'faceid': 'face-unlock',
    'touchid': 'fingerprint',
    'fingerprint': 'fingerprint',

    // Security
    'lock.fill': 'lock',
    'lock.shield.fill': 'verified-user',
    'shield.checkered': 'shield',
    'checkmark.shield.fill': 'verified-user',
    'checkmark.circle.fill': 'check-circle',
    'checkmark.circle': 'check-circle-outline',
    'exclamationmark.triangle.fill': 'warning',

    // Communication
    'envelope.fill': 'email',
    'bell.badge.fill': 'notifications-active',

    // Content
    'doc.text': 'description',
    'clock': 'access-time-filled',
    'clock.fill': 'access-time-filled',
    'location.fill': 'location-on',
    'questionmark.circle': 'help-outline',
    'questionmark.circle.fill': 'help',

    // Data
    'chart.bar.fill': 'bar-chart',
    'list.bullet.rectangle': 'list-alt',
    'gearshape.fill': 'settings',
    'info.circle.fill': 'info',
    'key.fill': 'vpn-key',
    'arrow.clockwise': 'refresh',
    'rectangle.portrait.and.arrow.right': 'logout',

    // Transaction
    'arrow.up.circle.fill': 'arrow-upward',
    'arrow.down.circle.fill': 'arrow-downward',
    'plus.circle': 'add-circle-outline',

    // QR
    'qrcode': 'qr-code-2',

    // Shop categories
    'cup.and.saucer.fill': 'local-cafe',
    'takeoutbag.and.cup.and.straw.fill': 'fastfood',
    'fork.knife': 'restaurant',
    'pencil.and.ruler': 'build',
    'cube.fill': 'category',
    'tshirt.fill': 'checkroom',
};

type IconProps = {
    name: string;
    size?: number;
    color?: string;
    style?: any;
    tintColor?: any; // alias for color (SymbolView compat)
};

export default function Icon({ name, size = 24, color, tintColor, style }: IconProps) {
    const materialName = ICON_MAP[name] || 'help-outline';
    const iconColor = color || tintColor || '#181818';

    return (
        <MaterialIcons
            name={materialName as any}
            size={size}
            color={iconColor}
            style={style}
        />
    );
}

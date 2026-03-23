import React, { createContext, useContext, useEffect, useState } from 'react';
import * as SecureStore from 'expo-secure-store';

const ACCESSIBILITY_KEY = 'epipay_accessibility';

export type ColorBlindMode = 'none' | 'protanopia' | 'deuteranopia' | 'tritanopia' | 'achromatopsia';

export type AccessibilityPrefs = {
    largeText: boolean;
    highContrast: boolean;
    reduceMotion: boolean;
    boldText: boolean;
    colorBlindMode: ColorBlindMode;
};

const DEFAULT_PREFS: AccessibilityPrefs = {
    largeText: false,
    highContrast: false,
    reduceMotion: false,
    boldText: false,
    colorBlindMode: 'none',
};

type ContextType = {
    prefs: AccessibilityPrefs;
    updatePrefs: (newPrefs: AccessibilityPrefs) => void;
    fontScale: number;
    // Adjusted colors based on colorblind mode
    adaptiveColors: {
        primary: string;
        accent: string;
        success: string;
        error: string;
        warning: string;
        info: string;
    };
};

// Color palettes adapted for each type of color blindness
export function getAdaptiveColors(mode: ColorBlindMode) {
    switch (mode) {
        case 'protanopia': // No red
            return { primary: '#0072B2', accent: '#56B4E9', success: '#0072B2', error: '#E69F00', warning: '#F0E442', info: '#56B4E9' };
        case 'deuteranopia': // No green
            return { primary: '#0072B2', accent: '#56B4E9', success: '#0072B2', error: '#D55E00', warning: '#F0E442', info: '#56B4E9' };
        case 'tritanopia': // No blue
            return { primary: '#E69F00', accent: '#CC79A7', success: '#009E73', error: '#D55E00', warning: '#CC79A7', info: '#E69F00' };
        case 'achromatopsia': // No color
            return { primary: '#333333', accent: '#666666', success: '#666666', error: '#333333', warning: '#999999', info: '#555555' };
        default:
            return { primary: '#013AFB', accent: '#ff1ef7', success: '#00C853', error: '#ff5a3a', warning: '#F59E0B', info: '#013AFB' };
    }
}

const AccessibilityContext = createContext<ContextType>({
    prefs: DEFAULT_PREFS,
    updatePrefs: () => {},
    fontScale: 1,
    adaptiveColors: getAdaptiveColors('none'),
});

export function AccessibilityProvider({ children }: { children: React.ReactNode }) {
    const [prefs, setPrefs] = useState<AccessibilityPrefs>(DEFAULT_PREFS);

    useEffect(() => {
        SecureStore.getItemAsync(ACCESSIBILITY_KEY).then((stored) => {
            if (stored) {
                try { setPrefs({ ...DEFAULT_PREFS, ...JSON.parse(stored) }); } catch {}
            }
        });
    }, []);

    function updatePrefs(newPrefs: AccessibilityPrefs) {
        setPrefs(newPrefs);
        SecureStore.setItemAsync(ACCESSIBILITY_KEY, JSON.stringify(newPrefs));
    }

    const fontScale = prefs.largeText ? 1.25 : 1;
    const adaptiveColors = getAdaptiveColors(prefs.colorBlindMode);

    return (
        <AccessibilityContext.Provider value={{ prefs, updatePrefs, fontScale, adaptiveColors }}>
            {children}
        </AccessibilityContext.Provider>
    );
}

export function useAccessibility() {
    return useContext(AccessibilityContext);
}

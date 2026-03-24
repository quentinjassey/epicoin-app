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

// Color palettes based on Wong/Okabe-Ito colorblind-safe palette
// Source: Nature Methods, Bang Wong (2011)
// Hex: Orange #E69F00, Sky Blue #56B4E9, Bluish Green #009E73,
//       Yellow #F0E442, Blue #0072B2, Vermillion #D55E00,
//       Reddish Purple #CC79A7, Black #000000
export function getAdaptiveColors(mode: ColorBlindMode) {
    switch (mode) {
        case 'protanopia': // No red — avoid red/green, use blue/orange/yellow
            return { primary: '#0072B2', accent: '#CC79A7', success: '#009E73', error: '#E69F00', warning: '#F0E442', info: '#56B4E9' };
        case 'deuteranopia': // No green — avoid green/red, use blue/orange/purple
            return { primary: '#0072B2', accent: '#CC79A7', success: '#56B4E9', error: '#D55E00', warning: '#F0E442', info: '#0072B2' };
        case 'tritanopia': // No blue — avoid blue/yellow, use green/red/purple
            return { primary: '#D55E00', accent: '#CC79A7', success: '#009E73', error: '#E69F00', warning: '#CC79A7', info: '#D55E00' };
        case 'achromatopsia': // No color — max contrast grayscale
            return { primary: '#222222', accent: '#777777', success: '#555555', error: '#000000', warning: '#999999', info: '#444444' };
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
                try {
                    const parsed = JSON.parse(stored);
                    setPrefs({
                        ...DEFAULT_PREFS,
                        ...parsed,
                        colorBlindMode: parsed.colorBlindMode || 'none',
                    });
                } catch {}
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

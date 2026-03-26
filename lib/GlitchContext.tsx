import React, { createContext, useContext, useState, useCallback } from 'react';

type GlitchContextType = {
    glitchKey: number;
    triggerGlitch: () => void;
};

const GlitchContext = createContext<GlitchContextType>({
    glitchKey: 0,
    triggerGlitch: () => {},
});

export function GlitchProvider({ children }: { children: React.ReactNode }) {
    const [glitchKey, setGlitchKey] = useState(0);

    const triggerGlitch = useCallback(() => {
        setGlitchKey(k => k + 1);
    }, []);

    return (
        <GlitchContext.Provider value={{ glitchKey, triggerGlitch }}>
            {children}
        </GlitchContext.Provider>
    );
}

export function useGlitch() {
    return useContext(GlitchContext);
}

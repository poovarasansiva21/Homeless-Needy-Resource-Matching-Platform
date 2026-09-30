import React, { createContext, useContext, useState, useEffect } from 'react';

interface SimpleModeContextType {
  isSimpleMode: boolean;
  toggleSimpleMode: () => void;
  isLowBandwidth: boolean;
  toggleLowBandwidth: () => void;
}

const SimpleModeContext = createContext<SimpleModeContextType | undefined>(undefined);

export const SimpleModeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isSimpleMode, setIsSimpleMode] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('sahaayaa_simple_mode');
      if (saved !== null) return saved === 'true';
    } catch {
      // ignore
    }
    return false;
  });

  const [isLowBandwidth, setIsLowBandwidth] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('sahaayaa_low_bandwidth');
      if (saved !== null) return saved === 'true';

      // Auto-detect network conditions if available
      if (typeof navigator !== 'undefined' && 'connection' in navigator) {
        const conn = (navigator as any).connection;
        if (conn?.saveData || conn?.effectiveType === '2g' || conn?.effectiveType === '3g') {
          return true;
        }
      }
    } catch {
      // ignore
    }
    return false;
  });

  const toggleSimpleMode = () => {
    setIsSimpleMode((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('sahaayaa_simple_mode', String(next));
      } catch {
        // ignore
      }
      return next;
    });
  };

  const toggleLowBandwidth = () => {
    setIsLowBandwidth((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('sahaayaa_low_bandwidth', String(next));
      } catch {
        // ignore
      }
      return next;
    });
  };

  useEffect(() => {
    if (isSimpleMode) {
      document.body.classList.add('simple-mode-active');
    } else {
      document.body.classList.remove('simple-mode-active');
    }
  }, [isSimpleMode]);

  useEffect(() => {
    if (isLowBandwidth) {
      document.body.classList.add('low-bandwidth-active');
    } else {
      document.body.classList.remove('low-bandwidth-active');
    }
  }, [isLowBandwidth]);

  return (
    <SimpleModeContext.Provider
      value={{
        isSimpleMode,
        toggleSimpleMode,
        isLowBandwidth,
        toggleLowBandwidth,
      }}
    >
      {children}
    </SimpleModeContext.Provider>
  );
};

export const useSimpleMode = (): SimpleModeContextType => {
  const context = useContext(SimpleModeContext);
  if (!context) {
    throw new Error('useSimpleMode must be used within a SimpleModeProvider');
  }
  return context;
};

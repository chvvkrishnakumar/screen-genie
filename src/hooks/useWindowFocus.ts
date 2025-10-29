import { useEffect, useRef } from 'react';
import { useAppContext } from '../contexts/AppContext';
import { useScreenContext } from '../contexts/ScreenContext';

interface UseWindowFocusOptions {
  onWindowBlur?: () => void;
  onWindowFocus?: () => void;
  debounceMs?: number;
  pipIsOpen?: boolean; // Pass the actual PIP state from parent
}

export const useWindowFocus = (options: UseWindowFocusOptions = {}) => {
  const { onWindowBlur, onWindowFocus, debounceMs = 1500, pipIsOpen = false } = options;
  const { autoFloatEnabled } = useAppContext();
  const { hasScreenAccess } = useScreenContext();
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const isBlurredRef = useRef(false);
  const lastToggleRef = useRef(0);

  useEffect(() => {
    if (!autoFloatEnabled) {
      console.log('Auto-float disabled, not setting up window focus listeners');
      return;
    }

    const handleWindowBlur = () => {
      console.log('🔍 Window blur detected', { 
        hasScreenAccess, 
        pipIsOpen, 
        autoFloatEnabled,
        isBlurredRef: isBlurredRef.current,
        lastToggle: Date.now() - lastToggleRef.current
      });
      
      // Only auto-open if screen sharing is active and PIP is not already open
      if (!hasScreenAccess) {
        console.log('❌ Auto-open blocked: No screen access');
        return;
      }
      if (pipIsOpen) {
        console.log('❌ Auto-open blocked: PIP already open');
        return;
      }
      
      isBlurredRef.current = true;
      
      // Clear existing timeout
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
      
      console.log(`⏰ Setting timeout for auto-open (${debounceMs}ms)`);
      
      // Debounce to avoid rapid window switching
      debounceRef.current = setTimeout(() => {
        const now = Date.now();
        console.log('⏰ Timeout triggered, checking conditions', {
          isBlurredRef: isBlurredRef.current,
          hasScreenAccess,
          pipIsOpen,
          autoFloatEnabled,
          timeSinceLastToggle: now - lastToggleRef.current
        });
        
        if (isBlurredRef.current && hasScreenAccess && !pipIsOpen && autoFloatEnabled) {
          // Prevent rapid toggling (minimum 3 seconds between toggles)
          if (now - lastToggleRef.current > 3000) {
            console.log('✅ Auto-opening PIP window due to window blur');
            lastToggleRef.current = now;
            onWindowBlur?.();
          } else {
            console.log('❌ Auto-open blocked: Too soon since last toggle');
          }
        } else {
          console.log('❌ Auto-open blocked: Conditions not met');
        }
      }, debounceMs);
    };

    const handleWindowFocus = () => {
      console.log('Window focus detected', { pipIsOpen, autoFloatEnabled });
      
      isBlurredRef.current = false;
      
      // Clear debounce timer if user returns quickly
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
        debounceRef.current = null;
      }
      
      // Auto-close PIP if it's open when main window regains focus
      if (pipIsOpen && autoFloatEnabled) {
        const now = Date.now();
        // Prevent rapid toggling (minimum 3 seconds between toggles)
        if (now - lastToggleRef.current > 3000) {
          console.log('Auto-closing PIP window due to window focus');
          lastToggleRef.current = now;
          // Small delay to ensure focus is stable
          setTimeout(() => {
            if (!isBlurredRef.current && pipIsOpen) {
              onWindowFocus?.();
            }
          }, 500);
        }
      }
    };

    // Listen for window focus/blur events
    window.addEventListener('blur', handleWindowBlur);
    window.addEventListener('focus', handleWindowFocus);
    
    // Also listen for visibility change API for more reliable detection
    const handleVisibilityChange = () => {
      console.log('Visibility change:', document.hidden ? 'hidden' : 'visible');
      if (document.hidden) {
        handleWindowBlur();
      } else {
        handleWindowFocus();
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);

    console.log('Window focus listeners set up', { autoFloatEnabled, hasScreenAccess, pipIsOpen });

    return () => {
      window.removeEventListener('blur', handleWindowBlur);
      window.removeEventListener('focus', handleWindowFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [autoFloatEnabled, hasScreenAccess, pipIsOpen, onWindowBlur, onWindowFocus, debounceMs]);

  return {
    isWindowFocused: !isBlurredRef.current,
  };
};
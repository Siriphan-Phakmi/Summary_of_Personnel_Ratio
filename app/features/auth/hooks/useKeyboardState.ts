'use client';

import { useState, useEffect } from 'react';

export const useKeyboardState = () => {
  const [capsLockOn, setCapsLockOn] = useState(false);
  
  useEffect(() => {
    const handleKeyDown = (e: Event) => {
      if (e instanceof KeyboardEvent && e.getModifierState) {
        setCapsLockOn(e.getModifierState('CapsLock'));
      }
    };
    
    const handleKeyUp = (e: Event) => {
      if (e instanceof KeyboardEvent && e.getModifierState) {
        setCapsLockOn(e.getModifierState('CapsLock'));
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  return { capsLockOn };
}; 
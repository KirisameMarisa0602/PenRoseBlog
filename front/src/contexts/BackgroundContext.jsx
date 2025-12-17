import React, { useState, useEffect } from 'react';
import BackgroundContext from './backgroundContextCore';
import { BACKGROUND_DATA } from '@utils/backgroundData';

export const BackgroundProvider = ({ children }) => {
  // Store the list of background objects. The first one is the "active" background.
  const [backgrounds, setBackgrounds] = useState(() => {
    // We don't persist the whole object in local storage to avoid staleness if code changes.
    // We could persist just the ID of the active one, but for now let's just persist the order if needed.
    // Or simpler: just persist the ID of the current active background and rotate the list to match.
    const savedId = localStorage.getItem('active_bg_id');
    if (savedId) {
      const index = BACKGROUND_DATA.findIndex(b => String(b.id) === String(savedId));
      if (index > -1) {
        // Rotate so that index is at 0
        const rotated = [...BACKGROUND_DATA.slice(index), ...BACKGROUND_DATA.slice(0, index)];
        return rotated;
      }
    }
    return BACKGROUND_DATA;
  });

  useEffect(() => {
    if (backgrounds.length > 0) {
      localStorage.setItem('active_bg_id', backgrounds[0].id);
    }
  }, [backgrounds]);

  const nextBackground = () => {
    setBackgrounds(prev => {
      const newBgs = [...prev];
      const first = newBgs.shift();
      newBgs.push(first);
      return newBgs;
    });
  };

  const prevBackground = () => {
    setBackgrounds(prev => {
      const newBgs = [...prev];
      const last = newBgs.pop();
      newBgs.unshift(last);
      return newBgs;
    });
  };

  // Helper to jump to a specific background (by ID)
  const setBackgroundById = (id) => {
    const index = backgrounds.findIndex(b => b.id === id);
    if (index === -1) return;
    if (index === 0) return; // Already active

    setBackgrounds(prev => {
      const newBgs = [...prev];
      // Rotate `index` times
      const toMove = newBgs.splice(0, index);
      return [...newBgs, ...toMove];
    });
  };

  return (
    <BackgroundContext.Provider value={{ 
      backgrounds, 
      activeBackground: backgrounds[0],
      nextBackground, 
      prevBackground,
      setBackgroundById 
    }}>
      {children}
    </BackgroundContext.Provider>
  );
};

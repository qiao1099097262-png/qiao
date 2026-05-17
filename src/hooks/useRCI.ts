import { useState, useEffect } from 'react';
import type { RCIData } from '../types';
import { loadRCI, saveRCI } from '../utils/storage';
import { calcFullRCI } from '../utils/rci';

export function useRCI() {
  const [rci, setRCI] = useState<RCIData>(loadRCI);

  useEffect(() => {
    // Recalculate on load and on change
    const updated = calcFullRCI(rci);
    setRCI(updated);
  }, []);

  const updateRCI = (newRCI: RCIData) => {
    const updated = calcFullRCI(newRCI);
    setRCI(updated);
    saveRCI(updated);
  };

  return { rci, updateRCI };
}

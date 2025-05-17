import { useState, useCallback } from 'react';

// Returns [flashId, triggerFlash(id)]
// flashId is the id of the row currently flashing (cleared after 700ms)
export default function useFlashRow() {
  const [flashId, setFlashId] = useState(null);

  const triggerFlash = useCallback((id) => {
    setFlashId(id);
    setTimeout(() => setFlashId(null), 700);
  }, []);

  return [flashId, triggerFlash];
}

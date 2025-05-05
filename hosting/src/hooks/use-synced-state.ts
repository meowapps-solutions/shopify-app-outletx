import { useState, useEffect, Dispatch, SetStateAction } from 'react';

export default function useSyncedState<T>(externalValue: T): [T, Dispatch<SetStateAction<T>>] {
  const [internalState, setInternalState] = useState<T>(externalValue);

  useEffect(() => {
    setInternalState(externalValue);
  }, [externalValue]);

  return [internalState, setInternalState];
}
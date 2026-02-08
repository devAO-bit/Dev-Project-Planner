import { useEffect, useState } from 'react';

/**
 * Delays updating the returned value until after `delay` ms
 * have passed since the last change.
 *
 * @param value The value to debounce
 * @param delay Delay in milliseconds (default: 300)
 */
export function useDebounce<T>(value: T, delay = 300): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(timer);
    };
  }, [value, delay]);

  return debouncedValue;
}

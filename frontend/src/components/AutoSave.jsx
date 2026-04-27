import { useEffect, useRef } from 'react';

const AutoSave = ({ data, onSave, interval = 30000 }) => {
  const timeoutRef = useRef(null);

  useEffect(() => {
    timeoutRef.current = setTimeout(() => {
      onSave(data);
    }, interval);

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [data, interval, onSave]);

  return null;
};

export default AutoSave;
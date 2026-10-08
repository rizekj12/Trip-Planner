import { useEffect, useRef } from "react";

// Returns a ref; clicking anywhere outside that element calls onOutside (e.g. to close a dropdown).
export function useClickOutside(onOutside) {
  const ref = useRef(null);
  const handlerRef = useRef(onOutside);
  handlerRef.current = onOutside;

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) handlerRef.current();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return ref;
}

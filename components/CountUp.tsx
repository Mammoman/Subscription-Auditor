"use client";

import { useEffect, useRef, useState } from "react";
import { animate } from "framer-motion";

export default function CountUp({
  value,
  format,
  duration = 1.1,
}: {
  value: number;
  format: (n: number) => string;
  duration?: number;
}) {
  const [display, setDisplay] = useState(0);
  const prev = useRef(0);

  useEffect(() => {
    const controls = animate(prev.current, value, {
      duration,
      ease: "easeOut",
      onUpdate: (v) => setDisplay(v),
    });
    prev.current = value;
    return () => controls.stop();
  }, [value, duration]);

  return <>{format(display)}</>;
}

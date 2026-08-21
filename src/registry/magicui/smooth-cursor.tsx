"use client";

import { motion, useMotionValue, useSpring } from "framer-motion";
import { useEffect, useState } from "react";

export type SmoothCursorProps = {
  spring?: { damping: number; stiffness: number; mass: number };
};

export function SmoothCursor({ spring = { damping: 28, stiffness: 430, mass: 0.7 } }: SmoothCursorProps) {
  const x = useMotionValue(-100);
  const y = useMotionValue(-100);
  const smoothX = useSpring(x, spring);
  const smoothY = useSpring(y, spring);
  const [visible, setVisible] = useState(false);
  const [interactive, setInteractive] = useState(false);

  useEffect(() => {
    const finePointer = matchMedia("(pointer: fine)").matches;
    const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!finePointer || reducedMotion) return;

    document.documentElement.classList.add("has-smooth-cursor");
    const move = (event: PointerEvent) => {
      x.set(event.clientX);
      y.set(event.clientY);
      setVisible(true);
      const target = event.target as HTMLElement | null;
      setInteractive(Boolean(target?.closest("button, a, label, input, [role='button']")));
    };
    const leave = () => setVisible(false);
    window.addEventListener("pointermove", move, { passive: true });
    document.documentElement.addEventListener("mouseleave", leave);
    return () => {
      document.documentElement.classList.remove("has-smooth-cursor");
      window.removeEventListener("pointermove", move);
      document.documentElement.removeEventListener("mouseleave", leave);
    };
  }, [x, y]);

  return <>
    <motion.div className="smooth-cursor-glow" style={{ x: smoothX, y: smoothY }} animate={{ opacity: visible ? 1 : 0, scale: interactive ? 1.6 : 1 }} />
    <motion.div className="smooth-cursor-ring" style={{ x: smoothX, y: smoothY }} animate={{ opacity: visible ? 1 : 0, scale: interactive ? 1.22 : 1, rotate: interactive ? -8 : 0 }} transition={{ duration: .18 }}>
      <svg viewBox="0 0 32 38" aria-hidden="true">
        <path d="M4.6 3.7c-.9-.55-2.05.16-1.91 1.2l3.7 27.07c.17 1.2 1.69 1.58 2.4.6l6.05-8.32a2.8 2.8 0 0 1 1.24-.94l9.7-3.83c1.13-.45 1.2-2.02.13-2.58L4.6 3.7Z" />
      </svg>
    </motion.div>
  </>;
}

export default SmoothCursor;

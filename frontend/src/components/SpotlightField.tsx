import * as React from "react";
import { cn } from "@/lib/utils";

type Props = {
  className?: string;
  children: React.ReactNode;
};

/**
 * Signature moment: an ambient spotlight that follows the pointer.
 * - GPU-friendly (radial gradient)
 * - Respects prefers-reduced-motion
 */
export default function SpotlightField({ className, children }: Props) {
  const ref = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (mq.matches) return;

    const onMove = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      const x = ((e.clientX - r.left) / r.width) * 100;
      const y = ((e.clientY - r.top) / r.height) * 100;
      el.style.setProperty("--spot-x", `${x}%`);
      el.style.setProperty("--spot-y", `${y}%`);
    };

    el.addEventListener("pointermove", onMove);
    return () => el.removeEventListener("pointermove", onMove);
  }, []);

  return (
    <div
      ref={ref}
      className={cn(
        "relative overflow-hidden rounded-2xl border bg-card shadow-elev-1 grain",
        "before:pointer-events-none before:absolute before:inset-0",
        "before:bg-[radial-gradient(500px_circle_at_var(--spot-x,50%)_var(--spot-y,40%),hsl(var(--accent)/0.22),transparent_60%)]",
        className,
      )}
    >
      {children}
    </div>
  );
}

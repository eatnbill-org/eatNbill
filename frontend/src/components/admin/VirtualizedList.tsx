import * as React from "react";

type VirtualizedListProps<T> = {
  items: T[];
  /** Height of each row in px. Keep this close to your actual row height. */
  itemHeight: number;
  /** Extra rows to render above/below the viewport. */
  overscan?: number;
  className?: string;
  renderItem: (item: T, index: number) => React.ReactNode;
};

/**
 * Lightweight, dependency-free virtualization for vertical lists.
 * NOTE: This assumes fixed row height.
 */
export default function VirtualizedList<T>({
  items,
  itemHeight,
  overscan = 6,
  className,
  renderItem,
}: VirtualizedListProps<T>) {
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const [viewportHeight, setViewportHeight] = React.useState(0);
  const [scrollTop, setScrollTop] = React.useState(0);

  React.useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const ro = new ResizeObserver(() => setViewportHeight(el.clientHeight));
    ro.observe(el);
    setViewportHeight(el.clientHeight);
    return () => ro.disconnect();
  }, []);

  const onScroll = React.useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  }, []);

  const totalHeight = items.length * itemHeight;

  const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
  const visibleCount = Math.ceil(viewportHeight / itemHeight) + overscan * 2;
  const endIndex = Math.min(items.length, startIndex + visibleCount);
  const offsetY = startIndex * itemHeight;

  const slice = items.slice(startIndex, endIndex);

  return (
    <div ref={containerRef} className={className} onScroll={onScroll} style={{ overflow: "auto" }}>
      <div style={{ height: totalHeight, position: "relative" }}>
        <div style={{ transform: `translateY(${offsetY}px)` }}>
          {slice.map((item, i) => (
            <div key={startIndex + i} style={{ height: itemHeight }}>
              {renderItem(item, startIndex + i)}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

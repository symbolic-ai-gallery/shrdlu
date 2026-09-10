import { useLayoutEffect, useRef, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import { createPortal } from "react-dom";
import { BottomFixed } from "react-bottom-fixed";

// iOS needs a layout-viewport anchor. Keeping this outside the resized lab
// prevents both the viewport fit and BottomFixed from applying the same offset.
export default function ComposerDock({ children }: { children: ReactNode }) {
  const [ios] = useState(
    () =>
      Boolean(window.visualViewport) &&
      (/iPad|iPhone|iPod/.test(navigator.userAgent) ||
        (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)),
  );
  const slot = useRef<HTMLDivElement>(null),
    content = useRef<HTMLDivElement>(null);
  const [geometry, setGeometry] = useState({ left: 0, width: 0, height: 0 });
  useLayoutEffect(() => {
    if (!ios) return;
    const measure = () => {
      const box = slot.current!.getBoundingClientRect();
      const height = content.current!.getBoundingClientRect().height;
      setGeometry((previous) =>
        previous.left === box.left &&
        previous.width === box.width &&
        previous.height === height
          ? previous
          : { left: box.left, width: box.width, height },
      );
    };
    const observer = new ResizeObserver(measure);
    observer.observe(slot.current!);
    observer.observe(content.current!);
    window.addEventListener("resize", measure);
    window.visualViewport?.addEventListener("resize", measure);
    measure();
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", measure);
      window.visualViewport?.removeEventListener("resize", measure);
    };
  }, [ios]);
  const dock = (
    <BottomFixed
      className={`composer-dock ${ios ? "composer-dock-ios" : "composer-dock-flow"}`}
    >
      <div ref={content}>{children}</div>
    </BottomFixed>
  );
  return (
    <div
      className="composer-slot"
      ref={slot}
      style={ios ? { height: geometry.height } : undefined}
    >
      {ios
        ? createPortal(
            <div
              className="composer-portal"
              style={
                {
                  "--dock-left": `${geometry.left}px`,
                  "--dock-width": `${geometry.width}px`,
                } as CSSProperties
              }
            >
              {dock}
            </div>,
            document.body,
          )
        : dock}
    </div>
  );
}

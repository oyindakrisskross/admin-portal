import { useEffect, useState, type CSSProperties, type RefObject } from "react";

const OPEN_ABOVE_THRESHOLD = 0.75;

export function shouldOpenDropdownAbove(
  rect: Pick<DOMRect, "bottom">,
  viewportHeight = window.innerHeight
) {
  return rect.bottom > viewportHeight * OPEN_ABOVE_THRESHOLD;
}

export function getFixedDropdownStyle(
  rect: Pick<DOMRect, "left" | "top" | "bottom" | "width">,
  gap = 6
): CSSProperties {
  const openAbove = shouldOpenDropdownAbove(rect);

  return {
    position: "fixed",
    left: rect.left,
    width: rect.width,
    zIndex: 9999,
    ...(openAbove
      ? {
          top: rect.top - gap,
          transform: "translateY(-100%)",
        }
      : {
          top: rect.bottom + gap,
        }),
  };
}

export function useDropdownOpenAbove<T extends HTMLElement>(
  open: boolean,
  triggerRef: RefObject<T | null>
) {
  const [openAbove, setOpenAbove] = useState(false);

  useEffect(() => {
    if (!open) return;

    const updatePlacement = () => {
      const trigger = triggerRef.current;
      if (!trigger) return;
      setOpenAbove(shouldOpenDropdownAbove(trigger.getBoundingClientRect()));
    };

    updatePlacement();
    window.addEventListener("scroll", updatePlacement, true);
    window.addEventListener("resize", updatePlacement);
    return () => {
      window.removeEventListener("scroll", updatePlacement, true);
      window.removeEventListener("resize", updatePlacement);
    };
  }, [open, triggerRef]);

  return openAbove;
}

import { useRef, useEffect } from "react";

export default function useStaggeredAnimation(delay = 150) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const elements = ref.current?.querySelectorAll('.stagger-item');
    if (!elements) return;

    elements.forEach((element, index) => {
      const htmlElement = element as HTMLElement;
      htmlElement.style.animationDelay = `${index * delay}ms`;
    });
  }, [delay]);

  return ref;
}

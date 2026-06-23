import type { PointerEvent, RefObject } from "react";
import { useEffect, useRef } from "react";
import { useGSAP } from "@gsap/react";
import { useReducedMotion } from "framer-motion";
import gsap from "gsap";

gsap.registerPlugin(useGSAP);

interface HeroMotion {
  sectionRef: RefObject<HTMLElement | null>;
  stageRef: RefObject<HTMLDivElement | null>;
  handlePointerMove: (event: PointerEvent<HTMLElement>) => void;
  handlePointerLeave: () => void;
}

export function useHeroMotion(): HeroMotion {
  const sectionRef = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const pointerX = useRef(0);
  const pointerY = useRef(0);
  const scrollProgress = useRef(0);
  const transformFrame = useRef(0);
  const shouldReduceMotion = Boolean(useReducedMotion());

  const updateLayerTransforms = () => {
    const stage = stageRef.current;
    const section = sectionRef.current;
    if (!stage) {
      return;
    }

    if (section) {
      const bounds = section.getBoundingClientRect();
      const scrollableDistance = section.offsetHeight - window.innerHeight;
      const nextProgress =
        scrollableDistance > 0 ? -bounds.top / scrollableDistance : 0;

      scrollProgress.current = Math.min(Math.max(nextProgress, 0), 1);
    }

    stage
      .querySelectorAll<HTMLElement>("[data-hero-layer]")
      .forEach((layer) => {
        const depthX = Number(layer.dataset.heroDepthX ?? 0);
        const depthY = Number(layer.dataset.heroDepthY ?? 0);
        const scrollY = Number(layer.dataset.heroScrollY ?? 0);
        const nextX = shouldReduceMotion ? 0 : pointerX.current * depthX;
        const nextY = shouldReduceMotion
          ? 0
          : pointerY.current * depthY + scrollProgress.current * scrollY;

        layer.style.setProperty("--khix-layer-x", `${nextX.toFixed(3)}px`);
        layer.style.setProperty("--khix-layer-y", `${nextY.toFixed(3)}px`);
      });
  };

  const scheduleLayerTransforms = () => {
    if (transformFrame.current) {
      return;
    }

    transformFrame.current = window.requestAnimationFrame(() => {
      transformFrame.current = 0;
      updateLayerTransforms();
    });
  };

  useEffect(() => {
    let frame = 0;

    const updateScrollProgress = () => {
      const section = sectionRef.current;
      if (!section) {
        return;
      }

      const bounds = section.getBoundingClientRect();
      const scrollableDistance = section.offsetHeight - window.innerHeight;
      const nextProgress =
        scrollableDistance > 0 ? -bounds.top / scrollableDistance : 0;

      scrollProgress.current = Math.min(Math.max(nextProgress, 0), 1);
      scheduleLayerTransforms();
    };

    const scheduleScrollProgress = () => {
      if (frame) {
        return;
      }

      frame = window.requestAnimationFrame(() => {
        frame = 0;
        updateScrollProgress();
      });
    };

    updateScrollProgress();
    window.addEventListener("scroll", scheduleScrollProgress, {
      passive: true,
    });
    window.addEventListener("resize", scheduleScrollProgress);

    return () => {
      window.removeEventListener("scroll", scheduleScrollProgress);
      window.removeEventListener("resize", scheduleScrollProgress);
      if (frame) {
        window.cancelAnimationFrame(frame);
      }
      if (transformFrame.current) {
        window.cancelAnimationFrame(transformFrame.current);
      }
    };
  });

  useGSAP(
    () => {
      const layers = gsap.utils.toArray<HTMLElement>("[data-hero-layer]");
      const art = "[data-hero-art]";
      const introVeil = "[data-hero-intro-veil]";
      const glowLayer = "[data-hero-glow-layer]";
      const title = "[data-hero-title]";
      const titleLogo = "[data-hero-title-logo]";
      const pondImage = "[data-hero-pond-layer] [data-hero-layer-image]";
      const glowOffOpacity = 0.025;
      const glowPeakOpacity = 0.76;

      if (shouldReduceMotion) {
        gsap.set(title, {
          autoAlpha: 1,
          rotation: 0,
          scale: 1,
          x: 0,
          y: 0,
          "--khix-title-glow-opacity": 0.62,
        });
        gsap.set(titleLogo, {
          autoAlpha: 1,
          scale: 1,
          y: 0,
        });
        gsap.set(layers, {
          autoAlpha: 1,
          clearProps: "--khix-hero-glow-opacity",
        });
        gsap.set(glowLayer, {
          opacity: 0.18,
          visibility: "visible",
        });
        gsap.set(art, { autoAlpha: 1 });
        gsap.set(introVeil, {
          autoAlpha: 0,
          backdropFilter: "blur(0px) saturate(1)",
        });
        return;
      }

      gsap.set(layers, {
        autoAlpha: 1,
      });
      gsap.set(title, {
        autoAlpha: 1,
        rotation: 0,
        x: 0,
        y: 0,
        "--khix-title-glow-opacity": 0.32,
      });
      gsap.set(titleLogo, {
        autoAlpha: 0,
        scale: 0.965,
        y: 0,
      });

      gsap.set(art, { autoAlpha: 1 });
      gsap.set(introVeil, {
        autoAlpha: 1,
        backdropFilter: "blur(26px) saturate(1.04)",
      });

      gsap
        .timeline()
        .to(introVeil, {
          backdropFilter: "blur(0px) saturate(1)",
          autoAlpha: 0,
          duration: 1.55,
          ease: "power2.out",
        })
        .to(
          titleLogo,
          {
            autoAlpha: 1,
            y: -18,
            scale: 1,
            duration: 0.72,
            ease: "power3.out",
          },
          "-=0.06",
        )
        .to(
          title,
          {
            "--khix-title-glow-opacity": 0.62,
            duration: 0.42,
            ease: "sine.out",
          },
          "-=0.5",
        )
        .to(titleLogo, {
          y: 0,
          duration: 0.46,
          ease: "sine.out",
        });

      gsap.to(titleLogo, {
        y: -7,
        delay: 2.8,
        duration: 3.4,
        ease: "sine.inOut",
        repeat: -1,
        yoyo: true,
      });

      gsap.set(glowLayer, {
        opacity: glowOffOpacity,
        visibility: "visible",
      });

      gsap
        .timeline({
          delay: 0.45,
          repeat: -1,
          repeatDelay: 0.32,
        })
        .to(glowLayer, {
          opacity: glowOffOpacity,
          duration: 0.18,
          ease: "none",
        })
        .set(glowLayer, {
          opacity: glowPeakOpacity,
        })
        .to(glowLayer, {
          duration: 0.045,
          ease: "none",
        })
        .set(glowLayer, {
          opacity: glowOffOpacity,
        })
        .to(glowLayer, {
          duration: 0.07,
          ease: "none",
        })
        .set(glowLayer, {
          opacity: glowPeakOpacity,
        })
        .to(glowLayer, {
          duration: 0.03,
          ease: "none",
        })
        .set(glowLayer, {
          opacity: glowOffOpacity,
        })
        .to(glowLayer, {
          duration: 0.11,
          ease: "none",
        })
        .set(glowLayer, {
          opacity: glowPeakOpacity,
        })
        .to(glowLayer, {
          duration: 0.075,
          ease: "none",
        })
        .set(glowLayer, {
          opacity: glowOffOpacity,
        })
        .to(glowLayer, {
          duration: 0.05,
          ease: "none",
        })
        .set(glowLayer, {
          opacity: glowPeakOpacity,
        })
        .to(glowLayer, {
          duration: 0.025,
          ease: "none",
        })
        .set(glowLayer, {
          opacity: glowOffOpacity,
        })
        .to(glowLayer, {
          duration: 0.16,
          ease: "none",
        })
        .set(glowLayer, {
          opacity: glowPeakOpacity,
        })
        .to(glowLayer, {
          duration: 0.055,
          ease: "none",
        })
        .set(glowLayer, {
          opacity: glowOffOpacity,
        })
        .to(glowLayer, {
          duration: 0.28,
          ease: "none",
        });

      gsap
        .timeline({
          delay: 0.2,
          repeat: -1,
        })
        .to(pondImage, {
          x: 10,
          y: -2,
          scaleX: 1.014,
          scaleY: 0.992,
          skewX: 0.32,
          duration: 3.1,
          ease: "sine.inOut",
        })
        .to(pondImage, {
          x: -8,
          y: 2,
          scaleX: 0.994,
          scaleY: 1.008,
          skewX: -0.28,
          duration: 3.4,
          ease: "sine.inOut",
        })
        .to(pondImage, {
          x: 0,
          y: 0,
          scaleX: 1,
          scaleY: 1,
          skewX: 0,
          duration: 2.6,
          ease: "sine.inOut",
        });
    },
    { dependencies: [shouldReduceMotion], scope: stageRef },
  );

  const handlePointerMove = (event: PointerEvent<HTMLElement>) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    const nextX = ((event.clientX - bounds.left) / bounds.width - 0.5) * 2;
    const nextY = ((event.clientY - bounds.top) / bounds.height - 0.5) * 2;

    pointerX.current = nextX;
    pointerY.current = nextY;
    scheduleLayerTransforms();
  };

  const handlePointerLeave = () => {
    pointerX.current = 0;
    pointerY.current = 0;
    scheduleLayerTransforms();
  };

  return {
    sectionRef,
    stageRef,
    handlePointerMove,
    handlePointerLeave,
  };
}

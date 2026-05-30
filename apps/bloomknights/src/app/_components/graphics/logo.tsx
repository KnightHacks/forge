"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

const logoPieceOffsets = [
  {
    x: "-76px",
    y: "42px",
    rotate: "-9deg",
    returnX: "6px",
    returnY: "-3px",
    returnRotate: "1deg",
    scale: "0.94",
  },
  {
    x: "-42px",
    y: "-58px",
    rotate: "7deg",
    returnX: "3px",
    returnY: "5px",
    returnRotate: "-1deg",
    scale: "0.92",
  },
  {
    x: "68px",
    y: "54px",
    rotate: "-6deg",
    returnX: "-5px",
    returnY: "-4px",
    returnRotate: "1deg",
    scale: "0.93",
  },
  {
    x: "92px",
    y: "-28px",
    rotate: "8deg",
    returnX: "-7px",
    returnY: "2px",
    returnRotate: "-1deg",
    scale: "0.94",
  },
  {
    x: "-86px",
    y: "-20px",
    rotate: "-7deg",
    returnX: "7px",
    returnY: "2px",
    returnRotate: "1deg",
    scale: "0.95",
  },
  {
    x: "48px",
    y: "-62px",
    rotate: "6deg",
    returnX: "-4px",
    returnY: "5px",
    returnRotate: "-1deg",
    scale: "0.92",
  },
  {
    x: "-54px",
    y: "64px",
    rotate: "-5deg",
    returnX: "4px",
    returnY: "-5px",
    returnRotate: "1deg",
    scale: "0.95",
  },
  {
    x: "78px",
    y: "36px",
    rotate: "7deg",
    returnX: "-6px",
    returnY: "-3px",
    returnRotate: "-1deg",
    scale: "0.94",
  },
] as const;

function assembleLogoPieces(svgText: string) {
  const parser = new DOMParser();
  const svgDocument = parser.parseFromString(svgText, "image/svg+xml");
  const svg = svgDocument.querySelector("svg");
  const assemblyRoot = svgDocument.querySelector("#g28");

  if (!svg || !assemblyRoot) {
    return null;
  }

  svg.setAttribute("aria-hidden", "true");
  svg.setAttribute("focusable", "false");
  svg.classList.add("bloom-logo-svg");

  Array.from(assemblyRoot.children).forEach((child, index) => {
    const wrapper = svgDocument.createElementNS(
      "http://www.w3.org/2000/svg",
      "g",
    );
    const offset =
      logoPieceOffsets[index % logoPieceOffsets.length] ?? logoPieceOffsets[0];

    wrapper.classList.add("bloom-logo-piece");
    wrapper.style.setProperty("--logo-delay", `${index * 42}ms`);
    wrapper.style.setProperty("--logo-x", offset.x);
    wrapper.style.setProperty("--logo-y", offset.y);
    wrapper.style.setProperty("--logo-rotate", offset.rotate);
    wrapper.style.setProperty("--logo-return-x", offset.returnX);
    wrapper.style.setProperty("--logo-return-y", offset.returnY);
    wrapper.style.setProperty("--logo-return-rotate", offset.returnRotate);
    wrapper.style.setProperty("--logo-scale", offset.scale);

    assemblyRoot.insertBefore(wrapper, child);
    wrapper.appendChild(child);
  });

  return svg.outerHTML;
}

const Logo = () => {
  const [assembledLogo, setAssembledLogo] = useState<string | null>();

  useEffect(() => {
    const controller = new AbortController();

    async function loadLogo() {
      try {
        const response = await fetch("/BloomKnights.svg", {
          signal: controller.signal,
        });
        const svgText = await response.text();
        const assembled = assembleLogoPieces(svgText);

        if (!controller.signal.aborted) {
          setAssembledLogo(assembled);
        }
      } catch {
        if (!controller.signal.aborted) {
          setAssembledLogo(null);
        }
      }
    }

    void loadLogo();

    return () => controller.abort();
  }, []);

  return (
    <div
      className="bloom-logo-shell flex w-full items-center justify-center px-4 sm:px-6 md:px-8 lg:px-10"
      role="img"
      aria-label="BloomKnights 2026 UCF hackathon logo"
    >
      {assembledLogo ? (
        <div
          className="bloom-logo-assembly h-auto w-[325px] sm:w-[390px] md:w-[520px] lg:w-[650px]"
          dangerouslySetInnerHTML={{ __html: assembledLogo }}
        />
      ) : assembledLogo === undefined ? (
        <div className="bloom-logo-placeholder w-[325px] sm:w-[390px] md:w-[520px] lg:w-[650px]" />
      ) : (
        <Image
          src="/BloomKnights.svg"
          alt=""
          width={650}
          height={325}
          draggable="false"
          unoptimized
          className="h-auto w-[325px] sm:w-[390px] md:w-[520px] lg:w-[650px]"
        />
      )}
      <span className="bloom-logo-glint bloom-logo-glint-one" aria-hidden />
      <span className="bloom-logo-glint bloom-logo-glint-two" aria-hidden />
      <span className="bloom-logo-glint bloom-logo-glint-three" aria-hidden />
    </div>
  );
};
export default Logo;

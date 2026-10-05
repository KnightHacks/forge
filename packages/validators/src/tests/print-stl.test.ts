import { describe, expect, it } from "vitest";

import { isPrintStl } from "../print-stl";

const triangle = `solid part
facet normal 0 0 1
outer loop
vertex 0 0 0
vertex 1 0 0
vertex 0 1 0
endloop
endfacet
endsolid part`;
const bytes = (text: string) => new TextEncoder().encode(text);

describe("printing STL structure", () => {
  it("accepts a complete ASCII mesh with finite scientific coordinates", () => {
    expect(isPrintStl(bytes(triangle))).toBe(true);
    expect(isPrintStl(bytes(triangle.replaceAll(" ", "\t  ")))).toBe(true);
    expect(isPrintStl(bytes(triangle.replace("1 0 0", "1e-3 -2.5 +0")))).toBe(
      true,
    );
  });

  it.each([
    "@echo off\ncalc.exe",
    "<html><script>alert(1)</script></html>",
    "solid part\nendsolid part",
    triangle.replace("vertex 1 0 0\n", ""),
    triangle.replace("1 0 0", "NaN 0 0"),
    triangle.replace("1 0 0", "1e999 0 0"),
    triangle + "\n@echo off",
    triangle + "\n" + " ".repeat(1025) + "x",
  ])("rejects scripts, incomplete models, and trailing content: %s", (text) => {
    expect(isPrintStl(bytes(text))).toBe(false);
  });

  it("requires exact binary triangle count and finite floats, even with a solid header", () => {
    const binary = new Uint8Array(134);
    binary.set(bytes("solid binary"));
    const view = new DataView(binary.buffer);
    view.setUint32(80, 1, true);
    expect(isPrintStl(binary)).toBe(true);
    expect(isPrintStl(binary.slice(0, -1))).toBe(false);
    expect(isPrintStl(new Uint8Array([...binary, 0]))).toBe(false);
    view.setFloat32(84, Infinity, true);
    expect(isPrintStl(binary)).toBe(false);
    view.setFloat32(84, 0, true);
    view.setUint32(80, 0xffffffff, true);
    expect(isPrintStl(binary)).toBe(false);
  });
});

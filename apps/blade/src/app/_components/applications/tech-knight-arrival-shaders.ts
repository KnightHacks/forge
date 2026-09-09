export const arrivalVertexShader = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vPosition;

  void main() {
    vUv = uv;
    vPosition = position;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

export const arrivalFragmentShader = /* glsl */ `
  uniform float uTime;
  uniform float uIntensity;
  varying vec2 vUv;
  varying vec3 vPosition;

  void main() {
    float edge = pow(max(0.0, 1.0 - abs(vUv.x - 0.5) * 2.0), 3.0);
    float longitudinal = sin(vUv.y * 58.0 - uTime * 8.0) * 0.12 + 0.88;
    float interference = sin(vUv.y * 17.0 + vPosition.x * 8.0 + uTime * 3.0);
    float alpha = edge * longitudinal * (0.82 + interference * 0.18) * uIntensity;
    vec3 deepBlue = vec3(0.09, 0.22, 0.95);
    vec3 whiteHot = vec3(0.76, 0.98, 1.0);
    vec3 color = mix(deepBlue, whiteHot, edge);
    gl_FragColor = vec4(color * (1.4 + edge * 2.6), alpha * 0.34);
  }
`;

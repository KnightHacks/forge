export const blackHoleVertexShader = /* glsl */ `
  varying vec2 vUv;

  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

export const blackHoleFragmentShader = /* glsl */ `
  precision highp float;

  uniform float uBirth;
  uniform float uFlash;
  uniform float uPull;
  uniform float uTime;
  varying vec2 vUv;

  float hash(vec2 point) {
    return fract(sin(dot(point, vec2(127.1, 311.7))) * 43758.5453123);
  }

  float noise(vec2 point) {
    vec2 cell = floor(point);
    vec2 local = fract(point);
    local = local * local * (3.0 - 2.0 * local);
    return mix(
      mix(hash(cell), hash(cell + vec2(1.0, 0.0)), local.x),
      mix(hash(cell + vec2(0.0, 1.0)), hash(cell + vec2(1.0)), local.x),
      local.y
    );
  }

  float fbm(vec2 point) {
    float value = 0.0;
    float amplitude = 0.5;
    for (int octave = 0; octave < 4; octave++) {
      value += noise(point) * amplitude;
      point = point * 2.07 + 17.13;
      amplitude *= 0.5;
    }
    return value;
  }

  void main() {
    vec2 point = (vUv - 0.5) * 2.0;
    float radius = length(point);
    float angle = atan(point.y, point.x);
    float time = uTime * 0.34;

    vec2 discPoint = vec2(point.x, point.y * 3.35);
    float discRadius = length(discPoint);
    float spiral = fbm(vec2(angle * 1.7 - time * 1.8, discRadius * 7.0 - time));
    float band = smoothstep(0.96, 0.24, discRadius) * smoothstep(0.2, 0.34, discRadius);
    band *= 0.48 + spiral * 0.72;
    band *= 0.82 + sin(angle * 5.0 - time * 4.0 + discRadius * 34.0) * 0.18;

    float photonRing = exp(-abs(radius - 0.252) * 104.0);
    float innerRing = exp(-abs(radius - 0.31) * 42.0) * 0.46;
    float lens = exp(-abs(radius - 0.34) * 11.0) * 0.22;
    float core = 1.0 - smoothstep(0.18, 0.235, radius);
    float outerFade = 1.0 - smoothstep(0.68, 1.0, radius);

    vec3 midnight = vec3(0.025, 0.045, 0.18);
    vec3 electricBlue = vec3(0.08, 0.48, 1.0);
    vec3 cyan = vec3(0.35, 0.94, 1.0);
    vec3 whiteHot = vec3(0.94, 0.99, 1.0);
    vec3 discColor = mix(midnight, electricBlue, smoothstep(0.18, 0.78, spiral));
    discColor = mix(discColor, cyan, smoothstep(0.45, 0.92, band));

    float energy = band + photonRing * 1.25 + innerRing + lens;
    vec3 color = discColor * band * 1.15;
    color += mix(cyan, whiteHot, photonRing) * (photonRing * 1.2 + innerRing * 0.7);
    color += electricBlue * lens * 0.72;
    color += whiteHot * uFlash * exp(-radius * 4.5) * 2.4;
    color *= 0.78 + uPull * 0.42;

    float alpha = max(core * 0.995, energy * outerFade);
    alpha = clamp(alpha * uBirth + uFlash * exp(-radius * 5.5), 0.0, 1.0);
    color = mix(color, vec3(0.0), core);
    gl_FragColor = vec4(color, alpha);
  }
`;

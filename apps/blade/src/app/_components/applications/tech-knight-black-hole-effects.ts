import * as THREE from "three";

import {
  blackHoleFragmentShader,
  blackHoleVertexShader,
} from "./tech-knight-arrival-shaders";

export const SINGULARITY_POSITION = new THREE.Vector3(3.65, 1.55, -2.8);
export const MOBILE_SINGULARITY_POSITION = new THREE.Vector3(0.78, 1.55, -2.8);

function seededRandom(index: number) {
  const value = Math.sin(index * 91.3458) * 47453.5453;
  return value - Math.floor(value);
}

export function createStarField() {
  const positions = new Float32Array(760 * 3);
  for (let index = 0; index < 760; index += 1) {
    positions[index * 3] = (seededRandom(index * 3) - 0.5) * 32;
    positions[index * 3 + 1] = (seededRandom(index * 3 + 1) - 0.5) * 19;
    positions[index * 3 + 2] = 2 - seededRandom(index * 3 + 2) * 48;
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  const material = new THREE.PointsMaterial({
    blending: THREE.AdditiveBlending,
    color: 0xa4b9e5,
    depthWrite: false,
    opacity: 0.46,
    size: 0.018,
    transparent: true,
  });
  return { geometry, material, points: new THREE.Points(geometry, material) };
}

export function createGravityField() {
  const count = 240;
  const positions = new Float32Array(count * 6);
  const anchors = Array.from({ length: count }, (_, index) => ({
    angle: seededRandom(index * 7 + 410) * Math.PI * 2,
    radius: 2.2 + seededRandom(index * 7 + 411) * 10.5,
    speed: 0.2 + seededRandom(index * 7 + 412) * 0.55,
    vertical: 0.24 + seededRandom(index * 7 + 413) * 0.68,
    z: -1 + seededRandom(index * 7 + 414) * 4,
  }));
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  const material = new THREE.LineBasicMaterial({
    blending: THREE.AdditiveBlending,
    color: 0x70cfff,
    depthWrite: false,
    opacity: 0,
    transparent: true,
  });
  const lines = new THREE.LineSegments(geometry, material);

  const update = (time: number, intensity: number) => {
    const attribute = geometry.getAttribute(
      "position",
    ) as THREE.BufferAttribute;
    anchors.forEach((anchor, index) => {
      const orbit =
        (time * 0.00008 * anchor.speed + seededRandom(index + 2200)) % 1;
      const inward = Math.pow(orbit, 1.65);
      const radius = anchor.radius * (1 - inward * 0.92);
      const angle = anchor.angle + inward * (2.8 + anchor.speed * 4.2);
      const tailRadius = radius + 0.08 + intensity * (0.22 + inward * 0.55);
      const yScale = anchor.vertical;
      attribute.setXYZ(
        index * 2,
        SINGULARITY_POSITION.x + Math.cos(angle) * radius,
        SINGULARITY_POSITION.y + Math.sin(angle) * radius * yScale,
        SINGULARITY_POSITION.z + anchor.z * (1 - inward),
      );
      attribute.setXYZ(
        index * 2 + 1,
        SINGULARITY_POSITION.x + Math.cos(angle - 0.08) * tailRadius,
        SINGULARITY_POSITION.y + Math.sin(angle - 0.08) * tailRadius * yScale,
        SINGULARITY_POSITION.z + anchor.z * (1 - inward) + 0.08,
      );
    });
    attribute.needsUpdate = true;
    material.opacity = intensity * 0.58;
  };

  return { geometry, lines, material, update };
}

export function createSingularityRig() {
  const group = new THREE.Group();
  group.position.copy(SINGULARITY_POSITION);
  group.scale.setScalar(0.001);

  const discUniforms = {
    uBirth: { value: 0 },
    uFlash: { value: 0 },
    uPull: { value: 0 },
    uTime: { value: 0 },
  };
  const discMaterial = new THREE.ShaderMaterial({
    depthWrite: false,
    fragmentShader: blackHoleFragmentShader,
    transparent: true,
    uniforms: discUniforms,
    vertexShader: blackHoleVertexShader,
  });
  const disc = new THREE.Mesh(
    new THREE.PlaneGeometry(3.9, 3.9, 1, 1),
    discMaterial,
  );
  disc.renderOrder = 1;
  group.add(disc);

  const coreMaterial = new THREE.MeshBasicMaterial({
    color: 0x000000,
    depthWrite: false,
  });
  const core = new THREE.Mesh(
    new THREE.SphereGeometry(0.46, 48, 32),
    coreMaterial,
  );
  core.position.z = 0.06;
  core.renderOrder = 2;
  group.add(core);

  const ringMaterials: THREE.MeshBasicMaterial[] = [];
  const rings = Array.from({ length: 5 }, (_, index) => {
    const material = new THREE.MeshBasicMaterial({
      blending: THREE.AdditiveBlending,
      color: index === 2 ? 0xe4fbff : index % 2 === 0 ? 0x5bdcff : 0x5268ff,
      depthWrite: false,
      opacity: 0,
      side: THREE.DoubleSide,
      transparent: true,
      toneMapped: false,
    });
    ringMaterials.push(material);
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(0.58 + index * 0.15, 0.009, 8, 120),
      material,
    );
    ring.scale.y = 0.28 + index * 0.025;
    ring.rotation.z = index * 0.18;
    ring.position.z = 0.1 - index * 0.04;
    group.add(ring);
    return ring;
  });

  return {
    core,
    coreMaterial,
    disc,
    discMaterial,
    discUniforms,
    group,
    ringMaterials,
    rings,
  };
}

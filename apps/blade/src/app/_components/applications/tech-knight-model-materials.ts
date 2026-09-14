import * as THREE from "three";

export interface ModelMaterialState {
  depthWrite: boolean;
  material: THREE.Material;
  opacity: number;
  transparent: boolean;
}

function materialsFor(object: THREE.Object3D) {
  if (!(object instanceof THREE.Mesh)) return [];
  const mesh = object as THREE.Mesh<
    THREE.BufferGeometry,
    THREE.Material | THREE.Material[]
  >;
  return Array.isArray(mesh.material) ? mesh.material : [mesh.material];
}

export function prepareModelForArrival(root: THREE.Object3D) {
  const states: ModelMaterialState[] = [];
  const visited = new Set<THREE.Material>();
  root.traverse((object) => {
    materialsFor(object).forEach((material) => {
      if (visited.has(material)) return;
      visited.add(material);
      states.push({
        depthWrite: material.depthWrite,
        material,
        opacity: material.opacity,
        transparent: material.transparent,
      });
      material.depthWrite = false;
      material.opacity = 0;
      material.transparent = true;
    });
  });
  return states;
}

export function disposeSceneResources(root: THREE.Object3D) {
  root.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    const mesh = object as THREE.Mesh<THREE.BufferGeometry>;
    mesh.geometry.dispose();
    materialsFor(mesh).forEach((material) => material.dispose());
  });
}

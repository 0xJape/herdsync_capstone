"use client";

import { Canvas } from "@react-three/fiber";
import { ContactShadows, OrbitControls, useGLTF } from "@react-three/drei";
import { useEffect, useMemo } from "react";
import * as THREE from "three";

export const markingPresets = [
  { label: "Cream", value: "#f1eee5" },
  { label: "Natural brown", value: "#8b5e3c" },
  { label: "Black", value: "#202522" },
  { label: "White", value: "#fffaf0" },
  { label: "Red", value: "#a94a36" },
  { label: "Golden", value: "#c89442" },
];

const modelPaths: Record<string, string> = {
  Calf: "/models/calf-textured.glb",
  Heifer: "/models/heifer-textured.glb",
  Cow: "/models/adult-cow-textured.glb",
  "Yearling bull": "/models/yearling-bull-textured.glb",
  Bull: "/models/adult-bull-textured.glb",
};

function GrassGround() {
  const texture = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 256;
    const context = canvas.getContext("2d");
    if (!context) return null;
    context.fillStyle = "#7da755";
    context.fillRect(0, 0, 256, 256);
    let seed = 17;
    for (let index = 0; index < 1800; index++) {
      seed = seed * 16807 % 2147483647;
      const x = seed % 256;
      seed = seed * 16807 % 2147483647;
      const y = seed % 256;
      seed = seed * 16807 % 2147483647;
      context.fillStyle = seed % 3 === 0 ? "#547d3e" : seed % 2 === 0 ? "#94ba61" : "#6d964b";
      context.fillRect(x, y, 1, 2 + seed % 4);
    }
    const result = new THREE.CanvasTexture(canvas);
    result.wrapS = result.wrapT = THREE.RepeatWrapping;
    result.repeat.set(8, 8);
    result.colorSpace = THREE.SRGBColorSpace;
    return result;
  }, []);
  return <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -.035, 0]} receiveShadow>
    <planeGeometry args={[8, 8]} />
    <meshStandardMaterial map={texture} color="#8aaa61" roughness={1} />
  </mesh>;
}

function CattleModel({ color, path }: { color: string; path: string }) {
  const { scene } = useGLTF(path);
  const cloned = useMemo(() => {
    const copy = scene.clone(true);
    copy.traverse((object) => {
      if (object instanceof THREE.Mesh) {
        object.castShadow = true;
        object.receiveShadow = true;
        object.material = Array.isArray(object.material)
          ? object.material.map((material) => material.clone())
          : object.material.clone();
      }
    });
    const bounds = new THREE.Box3().setFromObject(copy);
    const size = bounds.getSize(new THREE.Vector3());
    const center = bounds.getCenter(new THREE.Vector3());
    const largestSide = Math.max(size.x, size.y, size.z) || 1;
    copy.position.sub(center);
    copy.scale.setScalar(1.15 / largestSide);
    const floorBounds = new THREE.Box3().setFromObject(copy);
    copy.position.y -= floorBounds.min.y + 0.03;
    return copy;
  }, [scene]);

  useEffect(() => {
    const marking = new THREE.Color(color);
    cloned.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return;
      const partName = `${object.name} ${(object.material as THREE.Material).name}`.toLowerCase();
      if (/(horn|eye|hoof|foot|leg|nose|snout|mouth|tail|bell|nail)/.test(partName)) return;
      const materials = Array.isArray(object.material) ? object.material : [object.material];
      materials.forEach((material) => {
        if (!("color" in material) || !(material.color instanceof THREE.Color)) return;
        material.color.copy(marking);
      });
    });
  }, [cloned, color]);

  return <primitive object={cloned} rotation={[0, -0.35, 0]} />;
}

export default function CattlePreview({ marking, category }: { marking: string; category: string }) {
  const color = /^#[0-9a-f]{6}$/i.test(marking) ? marking : "#f1eee5";
  const modelPath = modelPaths[category] ?? "/models/adult-cow-textured.glb";
  return <div className="cattle-preview" aria-label={`Cattle preview for ${category || "new cattle"}`}>
    <Canvas fallback={<div className="cattle-preview-fallback" role="status">3D preview unavailable. Reload to retry.</div>} shadows="percentage" camera={{ position: [0, 0.15, 3.4], fov: 35 }} dpr={[1, 1.5]}>
      <ambientLight intensity={1.7} />
      <directionalLight position={[3, 4, 2]} intensity={2.2} castShadow shadow-mapSize={[1024, 1024]} />
      <GrassGround />
      <ContactShadows position={[0, -.025, 0]} opacity={.48} scale={3.5} blur={2.4} far={1.8} />
      <CattleModel key={modelPath} color={color} path={modelPath} />
      <OrbitControls enablePan={false} autoRotate autoRotateSpeed={0.7} minDistance={2.2} maxDistance={4.5} />
    </Canvas>
    <span className="cattle-preview-caption">{category || "Category pending"}</span>
  </div>;
}

Object.values(modelPaths).forEach((path) => useGLTF.preload(path));
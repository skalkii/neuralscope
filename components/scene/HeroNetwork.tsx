'use client';

import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { magma } from '@/lib/colormaps';
import { instancedMeshArgs } from '@/lib/scene/instancedMeshArgs';

const PALETTE = [
  { color: '#22d3ee', emissive: '#0e7490' },
  { color: '#a78bfa', emissive: '#5b21b6' },
  { color: '#fbbf24', emissive: '#92400e' },
  { color: '#f87171', emissive: '#7f1d1d' },
  { color: '#34d399', emissive: '#065f46' },
  { color: '#ec4899', emissive: '#831843' },
];
const N_BLOCKS = 6;
const SPACING = 3.2;
const SWEEP_PERIOD = 4.5;
const NEURONS_PER_BLOCK = 49;
const NEURON_COLS = 7;

function HeroBlock({ index }: { index: number }) {
  const matRef = useRef<THREE.MeshStandardMaterial>(null);
  const gridRef = useRef<THREE.InstancedMesh>(null);
  const tmpObjRef = useRef(new THREE.Object3D());
  const tmpColorRef = useRef(new THREE.Color());
  const x = (index - (N_BLOCKS - 1) / 2) * SPACING;
  const palette = PALETTE[index % PALETTE.length];
  const heightMod = 0.85 + 0.35 * Math.sin(index * 1.7);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    const phase = (t % SWEEP_PERIOD) / SWEEP_PERIOD;
    const sweepX = phase * N_BLOCKS;
    const dist = Math.abs(sweepX - index);
    const arrival = Math.max(0, 1 - dist);

    if (matRef.current) {
      matRef.current.emissiveIntensity = 0.45 + 2.4 * arrival;
    }

    const mesh = gridRef.current;
    if (mesh) {
      const tmpObj = tmpObjRef.current;
      const tmpColor = tmpColorRef.current;
      for (let i = 0; i < NEURONS_PER_BLOCK; i++) {
        const row = Math.floor(i / NEURON_COLS);
        const col = i % NEURON_COLS;
        const lx = (col - (NEURON_COLS - 1) / 2) * 0.08;
        const ly = (row - (NEURON_COLS - 1) / 2) * 0.08;
        tmpObj.position.set(lx, ly, 0);
        tmpObj.rotation.set(0, 0, 0);
        tmpObj.scale.setScalar(0.06);
        tmpObj.updateMatrix();
        mesh.setMatrixAt(i, tmpObj.matrix);

        const shimmer = 0.5 + 0.5 * Math.sin(t * 1.6 + index * 0.7 + i * 0.42);
        const v = Math.min(1, shimmer * (0.35 + 0.95 * arrival));
        const [r, g, b] = magma(v);
        tmpColor.setRGB(r, g, b);
        mesh.setColorAt(i, tmpColor);
      }
      mesh.count = NEURONS_PER_BLOCK;
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    }
  });

  return (
    <group position={[x, 0, 0]}>
      <mesh>
        <boxGeometry args={[2, heightMod, 1.1]} />
        <meshStandardMaterial
          ref={matRef}
          color={palette.color}
          emissive={palette.emissive}
          emissiveIntensity={0.45}
          metalness={0.3}
          roughness={0.35}
        />
      </mesh>
      <instancedMesh
        ref={gridRef}
        args={instancedMeshArgs(NEURONS_PER_BLOCK)}
        position={[0, heightMod / 2 + 0.55, 0]}
        frustumCulled={false}
      >
        <boxGeometry args={[1, 1, 1]} />
        <meshBasicMaterial toneMapped={false} />
      </instancedMesh>
    </group>
  );
}

function IdlePacket() {
  const meshRef = useRef<THREE.Mesh>(null);
  const trailRef = useRef<THREE.Mesh>(null);
  const lightRef = useRef<THREE.PointLight>(null);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    const phase = (t % SWEEP_PERIOD) / SWEEP_PERIOD;
    const minX = (-(N_BLOCKS - 1) / 2) * SPACING - 2.5;
    const maxX = ((N_BLOCKS - 1) / 2) * SPACING + 2.5;
    const x = minX + phase * (maxX - minX);

    if (meshRef.current) meshRef.current.position.set(x, 0.55, 0);
    if (trailRef.current) {
      const trailLen = 1.4;
      trailRef.current.position.set(x - trailLen / 2, 0.55, 0);
      trailRef.current.scale.set(trailLen, 0.18, 0.18);
    }
    if (lightRef.current) {
      lightRef.current.position.set(x, 0.55, 0);
      const pulse = 0.5 + 0.5 * Math.sin(t * 4);
      lightRef.current.intensity = 3 + 1.5 * pulse;
    }
  });

  return (
    <group>
      <mesh ref={trailRef}>
        <boxGeometry args={[1, 1, 1]} />
        <meshBasicMaterial
          color="#22d3ee"
          transparent
          opacity={0.35}
          toneMapped={false}
        />
      </mesh>
      <mesh ref={meshRef}>
        <sphereGeometry args={[0.22, 16, 16]} />
        <meshBasicMaterial color="#7dd3fc" toneMapped={false} />
      </mesh>
      <pointLight
        ref={lightRef}
        color="#22d3ee"
        intensity={3}
        distance={12}
        decay={2}
      />
    </group>
  );
}

export function HeroNetwork() {
  return (
    <group>
      {Array.from({ length: N_BLOCKS }, (_, i) => (
        <HeroBlock key={i} index={i} />
      ))}
      <IdlePacket />
    </group>
  );
}

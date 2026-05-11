'use client';

import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useScopeStore } from '@/lib/store/useScopeStore';
import { ANIMATION } from '@/lib/config';

const { SWEEP_DURATION_S: DURATION, PACKET_Y, PACKET_RADIUS } = ANIMATION;

export function SignalPacket() {
  const meshRef = useRef<THREE.Mesh>(null);
  const trailRef = useRef<THREE.Mesh>(null);
  const lightRef = useRef<THREE.PointLight>(null);

  useFrame(() => {
    const { firingStartedAt, bounds } = useScopeStore.getState();
    const mesh = meshRef.current;
    const trail = trailRef.current;
    const light = lightRef.current;

    if (!firingStartedAt || !bounds) {
      if (mesh) mesh.visible = false;
      if (trail) trail.visible = false;
      if (light) light.intensity = 0;
      return;
    }

    const elapsed = (performance.now() - firingStartedAt) / 1000;
    if (elapsed > DURATION) {
      if (mesh) mesh.visible = false;
      if (trail) trail.visible = false;
      if (light) light.intensity = 0;
      return;
    }

    const t = elapsed / DURATION;
    const eased = 1 - Math.pow(1 - t, 3);
    const startX = bounds.minX - 1;
    const endX = bounds.maxX + 1;
    const x = startX + eased * (endX - startX);

    if (mesh) {
      mesh.visible = true;
      mesh.position.set(x, PACKET_Y, 0);
    }
    if (trail) {
      trail.visible = true;
      const trailLen = Math.max(0.4, 1.5 * (1 - t * 0.5));
      trail.position.set(x - trailLen / 2, PACKET_Y, 0);
      trail.scale.set(trailLen, 0.18, 0.18);
    }
    if (light) {
      const peak = 4;
      const intensity = peak * Math.sin(Math.PI * t);
      light.intensity = Math.max(0, intensity);
      light.position.set(x, PACKET_Y, 0);
    }
  });

  return (
    <group>
      <mesh ref={trailRef} visible={false}>
        <boxGeometry args={[1, 1, 1]} />
        <meshBasicMaterial
          color="#22d3ee"
          transparent
          opacity={0.35}
          toneMapped={false}
        />
      </mesh>
      <mesh ref={meshRef} visible={false}>
        <sphereGeometry args={[PACKET_RADIUS, 16, 16]} />
        <meshBasicMaterial color="#7dd3fc" toneMapped={false} />
      </mesh>
      <pointLight
        ref={lightRef}
        color="#22d3ee"
        intensity={0}
        distance={10}
        decay={2}
      />
    </group>
  );
}

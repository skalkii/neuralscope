'use client';

import { Canvas } from '@react-three/fiber';
import { OrbitControls, Grid } from '@react-three/drei';
import { Suspense } from 'react';

function PlaceholderBlock() {
  return (
    <mesh position={[0, 0, 0]}>
      <boxGeometry args={[2, 1.2, 1.2]} />
      <meshStandardMaterial
        color="#22d3ee"
        emissive="#0e7490"
        emissiveIntensity={0.6}
      />
    </mesh>
  );
}

export function Scene() {
  return (
    <Canvas
      camera={{ position: [6, 4, 8], fov: 50, near: 0.1, far: 200 }}
      dpr={[1, 2]}
      gl={{ antialias: true, alpha: false }}
    >
      <color attach="background" args={['#05060a']} />
      <fog attach="fog" args={['#05060a', 25, 80]} />

      <ambientLight intensity={0.35} />
      <directionalLight position={[5, 10, 5]} intensity={0.8} />

      <Suspense fallback={null}>
        <PlaceholderBlock />
        <Grid
          position={[0, -1, 0]}
          args={[40, 40]}
          cellColor="#1e293b"
          sectionColor="#334155"
          fadeDistance={50}
          fadeStrength={1.5}
          infiniteGrid
        />
      </Suspense>

      <OrbitControls
        enableDamping
        dampingFactor={0.08}
        minDistance={2}
        maxDistance={60}
      />
    </Canvas>
  );
}

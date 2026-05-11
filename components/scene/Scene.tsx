'use client';

import { Canvas } from '@react-three/fiber';
import {
  OrbitControls,
  Grid,
  Bounds,
  useBounds,
  Stars,
} from '@react-three/drei';
import { Suspense, useEffect, useState } from 'react';
import { useScopeStore } from '@/lib/store/useScopeStore';
import { LayerBlock } from './LayerBlock';
import { SignalPacket } from './SignalPacket';
import { HeroNetwork } from './HeroNetwork';
import { SceneEffects } from './SceneEffects';
import { LODController } from './LODController';
import { BlockAnimator } from './BlockAnimator';

function Network() {
  const graph = useScopeStore((s) => s.graph);
  const layout = useScopeStore((s) => s.layout);
  if (!graph || !layout) return <HeroNetwork />;
  return (
    <>
      {graph.groups.map((g) => {
        const item = layout[g.id];
        if (!item) return null;
        return <LayerBlock key={g.id} group={g} item={item} />;
      })}
    </>
  );
}

function AutoFit() {
  const bounds = useBounds();
  const modelName = useScopeStore((s) => s.modelName);
  const fitTrigger = useScopeStore((s) => s.fitTrigger);
  useEffect(() => {
    if (modelName) {
      bounds.refresh().clip().fit();
    }
  }, [modelName, fitTrigger, bounds]);
  return null;
}

function Lighting() {
  return (
    <>
      <ambientLight intensity={0.25} />
      <hemisphereLight
        color="#7dd3fc"
        groundColor="#1e1b4b"
        intensity={0.45}
      />
      <directionalLight
        position={[10, 14, 6]}
        intensity={0.9}
        color="#dbeafe"
      />
      <pointLight
        position={[-12, 6, -8]}
        intensity={1.6}
        color="#a78bfa"
        distance={50}
        decay={2}
      />
      <pointLight
        position={[12, 4, 10]}
        intensity={1.2}
        color="#22d3ee"
        distance={50}
        decay={2}
      />
    </>
  );
}

export function Scene() {
  const hasGraph = useScopeStore((s) => Boolean(s.graph));
  const [userInteracted, setUserInteracted] = useState(false);

  useEffect(() => {
    if (userInteracted) return;
    const stop = () => setUserInteracted(true);
    window.addEventListener('pointerdown', stop, { once: true, passive: true });
    window.addEventListener('wheel', stop, { once: true, passive: true });
    return () => {
      window.removeEventListener('pointerdown', stop);
      window.removeEventListener('wheel', stop);
    };
  }, [userInteracted]);

  return (
    <Canvas
      camera={{ position: [10, 6, 16], fov: 50, near: 0.1, far: 500 }}
      dpr={[1, 2]}
      gl={{ antialias: false, alpha: false, powerPreference: 'high-performance' }}
      onPointerMissed={() => useScopeStore.getState().selectLayer(null)}
      aria-label="Interactive 3D visualisation of the loaded neural network. Drag to orbit, scroll to zoom."
      role="img"
    >
      <color attach="background" args={['#04050b']} />
      <fog attach="fog" args={['#04050b', 50, 180]} />

      <Lighting />

      <Stars
        radius={120}
        depth={60}
        count={2400}
        factor={3}
        saturation={0}
        fade
        speed={0.4}
      />

      <LODController />
      <BlockAnimator />

      <Suspense fallback={null}>
        <Bounds margin={1.4}>
          <AutoFit />
          <Network />
          <SignalPacket />
        </Bounds>
        <Grid
          position={[0, -2, 0]}
          args={[120, 120]}
          cellColor="#1e293b"
          sectionColor="#475569"
          cellSize={1}
          sectionSize={5}
          cellThickness={0.6}
          sectionThickness={1.2}
          fadeDistance={70}
          fadeStrength={2}
          infiniteGrid
        />
      </Suspense>

      <SceneEffects />

      <OrbitControls
        makeDefault
        enableDamping
        dampingFactor={0.08}
        minDistance={2}
        maxDistance={200}
        autoRotate={!hasGraph && !userInteracted}
        autoRotateSpeed={0.45}
      />
    </Canvas>
  );
}

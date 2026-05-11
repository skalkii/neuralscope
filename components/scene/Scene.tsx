'use client';

import { Canvas } from '@react-three/fiber';
import { OrbitControls, Grid, Bounds, useBounds } from '@react-three/drei';
import { Suspense, useEffect } from 'react';
import { useScopeStore } from '@/lib/store/useScopeStore';
import { LayerBlock } from './LayerBlock';

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

function Network() {
  const graph = useScopeStore((s) => s.graph);
  const layout = useScopeStore((s) => s.layout);
  if (!graph || !layout) return <PlaceholderBlock />;
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
  useEffect(() => {
    if (modelName) {
      bounds.refresh().clip().fit();
    }
  }, [modelName, bounds]);
  return null;
}

function ClearSelectionOnBgClick() {
  const selectLayer = useScopeStore((s) => s.selectLayer);
  return (
    <mesh
      position={[0, -100, 0]}
      onPointerMissed={() => selectLayer(null)}
      visible={false}
    >
      <planeGeometry args={[1, 1]} />
    </mesh>
  );
}

export function Scene() {
  return (
    <Canvas
      camera={{ position: [8, 6, 14], fov: 50, near: 0.1, far: 500 }}
      dpr={[1, 2]}
      gl={{ antialias: true, alpha: false }}
      onPointerMissed={() => useScopeStore.getState().selectLayer(null)}
    >
      <color attach="background" args={['#05060a']} />
      <fog attach="fog" args={['#05060a', 40, 140]} />

      <ambientLight intensity={0.35} />
      <directionalLight position={[5, 10, 5]} intensity={0.8} />

      <Suspense fallback={null}>
        <Bounds margin={1.4}>
          <AutoFit />
          <Network />
        </Bounds>
        <Grid
          position={[0, -2, 0]}
          args={[80, 80]}
          cellColor="#1e293b"
          sectionColor="#334155"
          fadeDistance={120}
          fadeStrength={1.5}
          infiniteGrid
        />
        <ClearSelectionOnBgClick />
      </Suspense>

      <OrbitControls
        makeDefault
        enableDamping
        dampingFactor={0.08}
        minDistance={2}
        maxDistance={200}
      />
    </Canvas>
  );
}

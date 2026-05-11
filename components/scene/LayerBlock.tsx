'use client';

import { Html } from '@react-three/drei';
import { ThreeEvent } from '@react-three/fiber';
import { useScopeStore } from '@/lib/store/useScopeStore';
import { paletteFor, collapsedPalette } from '@/lib/onnx/opPalette';
import type { LayerGroup, LayerLayoutItem } from '@/lib/onnx/types';

type Props = { group: LayerGroup; item: LayerLayoutItem };

export function LayerBlock({ group, item }: Props) {
  const selectedId = useScopeStore((s) => s.selectedLayerId);
  const selectLayer = useScopeStore((s) => s.selectLayer);
  const isCollapsed = group.id === '__collapsed__';
  const palette = isCollapsed
    ? collapsedPalette()
    : paletteFor(group.primary.op);
  const selected = selectedId === group.id;

  const handleOver = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    document.body.style.cursor = 'pointer';
  };
  const handleOut = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    document.body.style.cursor = 'default';
  };
  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    if (!isCollapsed) selectLayer(group.id);
  };

  return (
    <group position={[item.position.x, item.position.y, item.position.z]}>
      <mesh
        onPointerOver={handleOver}
        onPointerOut={handleOut}
        onClick={handleClick}
      >
        <boxGeometry
          args={[item.size.width, item.size.height, item.size.depth]}
        />
        <meshStandardMaterial
          color={palette.color}
          emissive={palette.emissive}
          emissiveIntensity={selected ? 1.2 : 0.5}
          metalness={0.2}
          roughness={0.4}
        />
      </mesh>
      <Html
        distanceFactor={10}
        position={[0, item.size.height / 2 + 0.4, 0]}
        center
        style={{ pointerEvents: 'none', userSelect: 'none' }}
      >
        <div
          className={`px-1.5 py-0.5 text-[10px] rounded whitespace-nowrap font-mono ${
            selected
              ? 'bg-cyan-400 text-black'
              : 'bg-zinc-900/80 text-zinc-200 border border-zinc-700'
          }`}
        >
          {group.label}
        </div>
      </Html>
    </group>
  );
}

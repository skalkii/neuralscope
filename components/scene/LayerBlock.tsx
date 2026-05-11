'use client';

import { useRef } from 'react';
import { Html } from '@react-three/drei';
import { ThreeEvent, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useScopeStore } from '@/lib/store/useScopeStore';
import { paletteFor, collapsedPalette } from '@/lib/onnx/opPalette';
import { NeuronGrid } from './NeuronGrid';
import type { LayerGroup, LayerLayoutItem } from '@/lib/onnx/types';

const SWEEP_DURATION = 1.8;
const FADE_WIDTH = 1.0;

type Props = { group: LayerGroup; item: LayerLayoutItem };

export function LayerBlock({ group, item }: Props) {
  const selectedId = useScopeStore((s) => s.selectedLayerId);
  const selectLayer = useScopeStore((s) => s.selectLayer);
  const summary = useScopeStore((s) => s.summariesByGroup[group.id]);
  const globalMax = useScopeStore((s) => s.globalMaxActivation);

  const isCollapsed = group.id === '__collapsed__';
  const palette = isCollapsed
    ? collapsedPalette()
    : paletteFor(group.primary.op);
  const selected = selectedId === group.id;

  const matRef = useRef<THREE.MeshStandardMaterial>(null);
  const baseIntensity = selected ? 1.2 : 0.5;

  useFrame(() => {
    const mat = matRef.current;
    if (!mat) return;
    const { firingStartedAt, bounds } = useScopeStore.getState();
    let intensity = baseIntensity;
    if (summary) {
      const normalized = Math.min(1, summary.scalar / globalMax);
      if (bounds && firingStartedAt) {
        const elapsed = (performance.now() - firingStartedAt) / 1000;
        if (elapsed <= SWEEP_DURATION + 0.5) {
          const t = Math.min(1, elapsed / SWEEP_DURATION);
          const eased = 1 - Math.pow(1 - t, 3);
          const packetX =
            bounds.minX - 1 + eased * (bounds.maxX - bounds.minX + 2);
          const arrival = Math.max(
            0,
            Math.min(
              1,
              (packetX - (item.position.x - FADE_WIDTH)) / FADE_WIDTH,
            ),
          );
          const overshoot = Math.max(0, packetX - (item.position.x + FADE_WIDTH));
          const decay = Math.max(0, 1 - overshoot / (FADE_WIDTH * 4));
          const fade = arrival * decay;
          intensity = baseIntensity + 3.0 * fade * normalized;
        } else {
          intensity = baseIntensity + 0.7 * normalized;
        }
      } else {
        intensity = baseIntensity + 0.7 * normalized;
      }
    }
    mat.emissiveIntensity = intensity;
  });

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

  const labelOffset =
    item.size.height / 2 + (summary && summary.values.length > 0 ? 1.6 : 0.4);

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
          ref={matRef}
          color={palette.color}
          emissive={palette.emissive}
          emissiveIntensity={baseIntensity}
          metalness={0.2}
          roughness={0.4}
        />
      </mesh>

      {summary && summary.values.length > 0 && (
        <NeuronGrid
          summary={summary}
          originY={item.size.height / 2 + 0.7}
        />
      )}

      <Html
        distanceFactor={10}
        position={[0, labelOffset, 0]}
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

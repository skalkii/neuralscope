'use client';

import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useScopeStore, type LodLevel } from '@/lib/store/useScopeStore';
import { LOD } from '@/lib/config';

const { FAR_THRESHOLD, MID_THRESHOLD, NEAR_HARD_MAX, RECOMPUTE_EVERY_N_FRAMES } = LOD;

export function LODController() {
  const prevRef = useRef<{
    map: Record<string, LodLevel>;
    near: string | null;
  }>({ map: {}, near: null });
  const tickRef = useRef(0);

  useFrame(({ camera }) => {
    tickRef.current = (tickRef.current + 1) % RECOMPUTE_EVERY_N_FRAMES;
    if (tickRef.current !== 0) return;
    const { layout, setLodMap } = useScopeStore.getState();
    if (!layout || Object.keys(layout).length === 0) {
      if (
        prevRef.current.near !== null ||
        Object.keys(prevRef.current.map).length > 0
      ) {
        prevRef.current = { map: {}, near: null };
        setLodMap({}, null);
      }
      return;
    }

    const cx = camera.position.x;
    const cy = camera.position.y;
    const cz = camera.position.z;

    const ids = Object.keys(layout);
    let nearestId: string | null = null;
    let nearestDist = Infinity;
    const dist: Record<string, number> = {};
    for (const id of ids) {
      const p = layout[id].position;
      const dx = cx - p.x;
      const dy = cy - p.y;
      const dz = cz - p.z;
      const d = Math.sqrt(dx * dx + dy * dy + dz * dz);
      dist[id] = d;
      if (d < nearestDist) {
        nearestDist = d;
        nearestId = id;
      }
    }

    const newMap: Record<string, LodLevel> = {};
    for (const id of ids) {
      const d = dist[id];
      if (d > FAR_THRESHOLD) newMap[id] = 'far';
      else if (d > MID_THRESHOLD) newMap[id] = 'mid';
      else newMap[id] = id === nearestId ? 'near' : 'mid';
    }
    const near =
      nearestId && nearestDist <= NEAR_HARD_MAX ? nearestId : null;
    if (near === null) {
      for (const id of ids) if (newMap[id] === 'near') newMap[id] = 'mid';
    }

    const prev = prevRef.current;
    let changed = prev.near !== near;
    if (!changed) {
      for (const id of ids) {
        if (prev.map[id] !== newMap[id]) {
          changed = true;
          break;
        }
      }
      if (!changed) {
        for (const id of Object.keys(prev.map)) {
          if (!(id in newMap)) {
            changed = true;
            break;
          }
        }
      }
    }
    if (changed) {
      prevRef.current = { map: newMap, near };
      setLodMap(newMap, near);
    }
  });

  return null;
}

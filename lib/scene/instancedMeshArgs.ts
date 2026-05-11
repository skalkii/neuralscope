import type { BufferGeometry, Material } from 'three';

/**
 * `<instancedMesh args={...}>` accepts [geometry, material, count]
 * at construction time. R3F replaces the first two via JSX children,
 * but TypeScript still demands real BufferGeometry / Material values.
 *
 * Producing an `as unknown as` triple-cast at every call site is
 * noisy; this helper centralises the lie.
 */
export function instancedMeshArgs(
  count: number,
): [BufferGeometry, Material, number] {
  return [
    undefined as unknown as BufferGeometry,
    undefined as unknown as Material,
    count,
  ];
}

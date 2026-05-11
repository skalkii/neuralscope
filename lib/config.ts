// Centralised tuning constants. Lifted from inline magic numbers across
// the codebase. Edit here, see effect everywhere.

export const MODEL = {
  // Hard cap on .onnx file size accepted by ModelLoader.
  MAX_BYTES: 50 * 1024 * 1024,
  // Cap on logical layer groups rendered. Bigger graphs collapse the middle.
  MAX_LOGICAL_LAYERS: 500,
  HEAD_KEEP: 100,
  TAIL_KEEP: 100,
} as const;

export const LAYOUT = {
  X_SPACING: 3.2,
  Z_SPACING: 4,
  BLOCK_WIDTH: 2,
} as const;

export const LOD = {
  FAR_THRESHOLD: 30,
  MID_THRESHOLD: 8,
  NEAR_HARD_MAX: 8,
  // LOD recompute interval (frames between checks).
  RECOMPUTE_EVERY_N_FRAMES: 4,
} as const;

export const NEURON_GRID = {
  MAX_INSTANCES: 4096,
  MID_CELL: 0.06,
  MID_SPACING: 0.08,
  NEAR_CELL: 0.14,
  NEAR_SPACING: 0.18,
} as const;

export const WEIGHT_HEATMAP = {
  MAX_DIM: 64,
  CELL: 0.08,
  SPACING: 0.1,
} as const;

export const ANIMATION = {
  SWEEP_DURATION_S: 1.8,
  FADE_WIDTH: 1.0,
  PACKET_Y: 0.6,
  PACKET_RADIUS: 0.22,
} as const;

export const SUMMARY = {
  MAX_VALUES: 4096,
} as const;

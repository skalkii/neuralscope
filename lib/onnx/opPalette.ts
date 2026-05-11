type Palette = { color: string; emissive: string };

const TABLE: Record<string, Palette> = {
  Conv: { color: '#22d3ee', emissive: '#0e7490' },
  ConvTranspose: { color: '#06b6d4', emissive: '#155e75' },
  MatMul: { color: '#a78bfa', emissive: '#5b21b6' },
  Gemm: { color: '#c084fc', emissive: '#6d28d9' },
  BatchNormalization: { color: '#fbbf24', emissive: '#92400e' },
  LayerNormalization: { color: '#fbbf24', emissive: '#92400e' },
  InstanceNormalization: { color: '#fbbf24', emissive: '#92400e' },
  GroupNormalization: { color: '#fbbf24', emissive: '#92400e' },
  Relu: { color: '#f87171', emissive: '#7f1d1d' },
  LeakyRelu: { color: '#f87171', emissive: '#7f1d1d' },
  Gelu: { color: '#fb7185', emissive: '#881337' },
  Sigmoid: { color: '#fb923c', emissive: '#7c2d12' },
  Tanh: { color: '#fb923c', emissive: '#7c2d12' },
  Softmax: { color: '#fb923c', emissive: '#7c2d12' },
  MaxPool: { color: '#34d399', emissive: '#065f46' },
  AveragePool: { color: '#34d399', emissive: '#065f46' },
  GlobalAveragePool: { color: '#34d399', emissive: '#065f46' },
  Add: { color: '#94a3b8', emissive: '#334155' },
  Mul: { color: '#94a3b8', emissive: '#334155' },
  Sub: { color: '#94a3b8', emissive: '#334155' },
  Div: { color: '#94a3b8', emissive: '#334155' },
  Concat: { color: '#e879f9', emissive: '#86198f' },
  Reshape: { color: '#64748b', emissive: '#1e293b' },
  Transpose: { color: '#64748b', emissive: '#1e293b' },
  Flatten: { color: '#64748b', emissive: '#1e293b' },
  Squeeze: { color: '#64748b', emissive: '#1e293b' },
  Unsqueeze: { color: '#64748b', emissive: '#1e293b' },
  Dropout: { color: '#475569', emissive: '#0f172a' },
  Attention: { color: '#ec4899', emissive: '#831843' },
  MultiHeadAttention: { color: '#ec4899', emissive: '#831843' },
};

const FALLBACK: Palette = { color: '#cbd5e1', emissive: '#475569' };

const COLLAPSED: Palette = { color: '#1e293b', emissive: '#0f172a' };

export function paletteFor(op: string): Palette {
  return TABLE[op] ?? FALLBACK;
}

export function collapsedPalette(): Palette {
  return COLLAPSED;
}

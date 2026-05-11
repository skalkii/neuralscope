type RGB = [number, number, number];

// 16-stop magma palette (good on dark backgrounds).
const MAGMA: RGB[] = [
  [0.001, 0.0, 0.014],
  [0.054, 0.03, 0.158],
  [0.149, 0.046, 0.323],
  [0.262, 0.039, 0.404],
  [0.366, 0.073, 0.432],
  [0.466, 0.11, 0.43],
  [0.567, 0.142, 0.42],
  [0.673, 0.169, 0.397],
  [0.776, 0.198, 0.362],
  [0.87, 0.235, 0.31],
  [0.939, 0.297, 0.249],
  [0.978, 0.398, 0.196],
  [0.992, 0.514, 0.166],
  [0.996, 0.633, 0.176],
  [0.992, 0.752, 0.23],
  [0.987, 0.991, 0.749],
];

// 16-stop viridis palette.
const VIRIDIS: RGB[] = [
  [0.267, 0.005, 0.329],
  [0.283, 0.131, 0.449],
  [0.254, 0.265, 0.53],
  [0.207, 0.372, 0.553],
  [0.164, 0.471, 0.558],
  [0.128, 0.567, 0.551],
  [0.135, 0.659, 0.518],
  [0.267, 0.749, 0.441],
  [0.478, 0.821, 0.318],
  [0.741, 0.873, 0.15],
  [0.993, 0.906, 0.144],
  [0.993, 0.823, 0.122],
  [0.992, 0.732, 0.104],
  [0.992, 0.633, 0.083],
  [0.992, 0.52, 0.062],
  [0.992, 0.388, 0.04],
];

function sample(table: RGB[], t: number): RGB {
  if (t <= 0) return table[0];
  if (t >= 1) return table[table.length - 1];
  const scaled = t * (table.length - 1);
  const i = Math.floor(scaled);
  const f = scaled - i;
  const a = table[i];
  const b = table[i + 1];
  return [
    a[0] + (b[0] - a[0]) * f,
    a[1] + (b[1] - a[1]) * f,
    a[2] + (b[2] - a[2]) * f,
  ];
}

export function magma(t: number): RGB {
  return sample(MAGMA, t);
}

export function viridis(t: number): RGB {
  return sample(VIRIDIS, t);
}

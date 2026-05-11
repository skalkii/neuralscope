export type LayerOp = string;

export type Layer = {
  id: string;
  op: LayerOp;
  inputs: string[];
  outputs: string[];
  inputShape: number[] | null;
  outputShape: number[] | null;
  paramCount: number;
};

export type LayerGroup = {
  id: string;
  primary: Layer;
  layers: Layer[];
  label: string;
  paramCount: number;
  outputShape: number[] | null;
  depth: number;
  branchLane: number;
};

export type Graph = {
  layers: Layer[];
  groups: LayerGroup[];
  inputs: string[];
  outputs: string[];
  inputShapes: Record<string, number[] | null>;
  paramCount: number;
  truncated: boolean;
  modelName: string;
};

export type Position3D = { x: number; y: number; z: number };

export type LayerLayoutItem = {
  groupId: string;
  position: Position3D;
  size: { width: number; height: number; depth: number };
};

export type LayerLayout = Record<string, LayerLayoutItem>;

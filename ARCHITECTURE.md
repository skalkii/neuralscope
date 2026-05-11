# Architecture

## Overview

NeuralScope is a single-page Next.js app with three concurrent execution
contexts:

1. **Main thread** — React tree, R3F scene, Zustand store, all UI input
2. **R3F frame loop** — single per-frame iteration; animation /
   LOD writers, no React reconciliation
3. **Web Worker** — `onnxruntime-web` session, all ONNX protobuf
   decode + re-encode + inference + initializer extraction

No backend. No network calls except `/labels/imagenet-1k.json` and
the bundled example ONNX files. Models never leave the user's machine.

```
              ┌────────────────────────────────────────┐
              │ Main thread (React + R3F controls)     │
              │                                        │
   user ─►    │  panels/  ─writes─►  Zustand store     │
              │     ▲                    │             │
              │     │                    │ subscribe   │
              │   props                  ▼             │
              │     │           scene/ R3F components  │
              │     │                    │             │
              │     │                    │ refs        │
              │     │                    ▼             │
              │     │           ┌── R3F frame loop ────┤
              │     │           │  BlockAnimator       │
              │     │           │  LODController       │
              │     │           │  SignalPacket        │
              │     │           └──────────────────────┤
              │     │                    ▲             │
              │   prediction list        │             │
              │     ▲                    │             │
              └─────│────────────────────│─────────────┘
                    │                    │
                    │  postMessage       │
                    │ (transferable)     │
                    │                    │
              ┌─────│────────────────────│─────────────┐
              │     ▼                    │             │
              │  inferenceClient ─request─►            │
              │           │       ◄─response─┐         │
              │           ▼                  ▼         │
              │     onnxruntime-web Web Worker         │
              │       • cached ModelProto              │
              │       • patchAllOutputs                │
              │       • InferenceSession.run           │
              │       • extractWeightsFromModel        │
              └────────────────────────────────────────┘
```

## Module map

```
app/                              Next.js routes — only page.tsx
components/
  scene/                          R3F mounts (live inside <Canvas>)
    Scene.tsx                     root: lights, stars, fog, Bounds,
                                  OrbitControls, postprocessing
    LayerBlock.tsx                one mesh per group + label + grids
    NeuronGrid.tsx                <InstancedMesh> of activation cubes
    WeightHeatmap.tsx             <InstancedMesh> of weight cells
    SignalPacket.tsx              sphere + trail + pointLight sweep
    BlockAnimator.tsx             centralised per-frame emissive writer
    LODController.tsx             camera-distance → far/mid/near
    HeroNetwork.tsx               idle-state demo when graph === null
    SceneEffects.tsx              Bloom + Vignette + SMAA
  panels/                         HTML overlay & sidebar
    ModelLoader.tsx               drag-drop .onnx file
    ExampleModels.tsx             one-click bundled models
    InputPanel.tsx                shape-aware router
    MnistInput.tsx                28×28 drawable canvas
    ImageInput.tsx                image drop-zone + normalize presets
    TensorInput.tsx               JSON tensor textarea
    PredictionList.tsx            shared top-k bar list + copy
    SessionManager.tsx            worker init/dispose lifecycle
    EngineToggle.tsx              WASM / WebGPU
    HeroOverlay.tsx               gradient title on empty state
  ErrorBoundary.tsx               class boundary around <Scene>
lib/
  onnx/                           model pipeline (mostly pure)
    parseGraph.ts                 protobuf → Graph + fused groups
    patchOutputs.ts               appends every node output to graph.output
    extractWeights.ts             initializer → Float32Array
    inferenceWorker.ts            module Worker entry
    inferenceClient.ts            RPC wrapper
    runHelpers.ts                 feed → summarise → softmax helper
    summarize.ts                  tensor → per-channel/neuron mean-abs
    imageToTensor.ts              File → Float32Array NCHW
    loadModel.ts                  bytes → parse → layout → store
    labels.ts                     ImageNet 1k lookup
    opPalette.ts                  op → colour
    types.ts                      Graph / Layer / LayerGroup / Layout
  layout/
    topologicalLayout.ts          Graph → 3D positions
  scene/
    animationRegistry.ts          module-level Map of block refs
  store/
    useScopeStore.ts              single Zustand store
  colormaps.ts                    magma + viridis palettes
  config.ts                       every tuning constant
scripts/
  copy-ort-wasm.mjs               postinstall → public/ort-wasm/
public/
  examples/                       bundled .onnx demo models
  labels/                         imagenet-1k.json
  ort-wasm/                       onnxruntime-web binaries (gitignored)
```

## Data flow

### Loading a model

```
ModelLoader / ExampleModels
  │  Uint8Array
  ▼
loadOnnxFromBytes
  │  parseOnnxBytes → Graph
  │  computeLayout  → LayerLayout, bounds
  ▼
store.setModel + store.setGraph
  ▼
SessionManager useEffect fires
  ▼
inferenceClient.initInference(bytes, provider)
  ▼
Worker:
  cachedModel = ModelProto.decode(bytes)
  patchAllOutputsOnModel(cachedModel)
  bytes' = ModelProto.encode(cachedModel)
  session = ort.InferenceSession.create(bytes', { ep })
  inputNames, outputNames → back to client
  ▼
store.setSessionStatus('ready', { inputNames, outputNames, activeProvider })
```

### Running inference

```
MnistInput / ImageInput / TensorInput
  │ Float32Array, dims, inputName
  ▼
runWithFeed (lib/onnx/runHelpers.ts)
  ▼
inferenceClient.runInference({ [inputName]: { data, dims } })
  ▼
Worker:
  feeds = { name: ort.Tensor('float32', data, dims) }
  results = await session.run(feeds)
  returns Record<tensorName, { data:ArrayBuffer, dims, dtype }>
  ▼
summarizeRun(graph, outputs) → GroupSummary[]
  ▼
store.setSummaries(summaries, elapsedMs)
  → globalMaxActivation, firingStartedAt = performance.now()
  ▼
BlockAnimator + SignalPacket pick up firingStartedAt next frame
```

### LOD pipeline

```
useFrame in LODController, every N frames:
  for each group: distance = camera.position - layout[id].position
  classify → 'far' / 'mid' / 'near'
  pick nearestId if within NEAR_HARD_MAX → set as 'near'
  diff vs prev; if changed, store.setLodMap(map, near)
  ▼
LayerBlock subscribes to lodByGroup[id]
  far  → just the box
  mid  → box + small NeuronGrid
  near → box + large NeuronGrid (clickable) + WeightHeatmap when
         selected; on first near+selected, extractWeights() RPC to
         worker, cached in weightsByGroup
```

### Animation

```
store.firingStartedAt = performance.now() (set in setSummaries)
  ▼
BlockAnimator useFrame:
  elapsed = (now - firingStartedAt) / 1000
  packetX = lerp(bounds.minX-1, bounds.maxX+1, easeOutCubic(t))
  for each entry in animationRegistry:
    arrival = clamp((packetX - x + FADE_WIDTH) / FADE_WIDTH)
    decay   = 1 - max(0, packetX - x - FADE_WIDTH) / (FADE_WIDTH * 4)
    intensity = base + 3.0 * arrival * decay * (summary.scalar / globalMax)
    entry.material.current.emissiveIntensity = intensity

SignalPacket useFrame (also reads firingStartedAt + bounds):
  positions sphere + trail + point-light at packetX
```

## State

Single Zustand store, `lib/store/useScopeStore.ts`. Sliced fields:

- **Model** — `modelBytes`, `modelName`, `graph`, `layout`, `bounds`,
  `loadError`
- **Session** — `sessionStatus`, `sessionError`, `executionProvider`,
  `activeProvider`, `inputNames`, `outputNames`
- **Run output** — `summaries`, `summariesByGroup`, `globalMaxActivation`,
  `firingStartedAt`, `lastRunMs`, `isInferring`
- **Selection** — `selectedLayerId`, `selectedNeuronIndex`
- **LOD** — `lodByGroup`, `nearGroupId`
- **Weights** — `weightsByGroup`

## Worker protocol

Defined inside `lib/onnx/inferenceWorker.ts` and mirrored in
`lib/onnx/inferenceClient.ts`. Messages:

| Client → Worker | Worker → Client | Notes |
|---|---|---|
| `init { modelBytes, executionProvider }` | `init-ok { inputNames, outputNames, addedCount, activeProvider }` | Worker decodes ModelProto, patches outputs, creates session. WebGPU falls back to WASM on failure. |
| `run { feeds }` | `run-ok { outputs, elapsed }` | Tensor buffers transferred both ways. |
| `extract-weights { layerInputs }` | `extract-weights-ok { weights }` | Uses cached ModelProto, no re-decode. |
| `dispose` | (none) | Releases session + clears cached ModelProto. |
| any | `err { id, message }` | Generic error path. |

## Performance budget

- **Single useFrame** for all blocks (BlockAnimator)
- **LOD recompute** every 4 frames instead of every frame
- **Max 4096 instances** per neuron grid; bigger layers stride-sample
- **Max 500 logical layers** per graph; bigger graphs collapse the middle
- **50 MB hard cap** on model size enforced before parse
- **InstancedMesh everywhere** (one draw call per layer's grid / per heatmap)
- **Web Worker** keeps main thread free during inference + extract
- **Transferable ArrayBuffers** on both ends of every run/extract

## Testing

`vitest` with `pnpm test`. Coverage via `pnpm test:coverage`.
Pure-function tests live next to source as `*.test.ts`. Worker /
React / Three components are not covered (too much DOM/WebGL
mocking for the marginal value).

## CI

`.github/workflows/ci.yml` runs `typecheck → test → build` on every
push to main and on every PR.

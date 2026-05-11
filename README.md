# NeuralScope

> Local-first, browser-based 3D inspector for small ONNX neural networks.
> Drop a model, type/upload an input, watch inference happen layer by layer
> with semantic zoom from "whole network" down to "individual activation."

Inference-only. Models never leave your machine. Targets small models
(<50 MB, <~50M params): MNIST CNNs, tiny ResNets, nano-GPT class
transformers. Not for 7B+ LLMs.

## Status: Phase 3 — inference with intermediate activations

- [x] Next.js 16 + React Three Fiber + Tailwind 4 + Zustand boilerplate
- [x] R3F Canvas with OrbitControls, dark scene, grid, fog
- [x] Sidebar shell showing model state from Zustand store
- [x] Drag-drop `.onnx` loader (50 MB cap, .onnx ext check)
- [x] ONNX protobuf parse via `onnx-proto` → `Graph` with `Layer` + `LayerGroup`
- [x] Op fusion (Conv/Gemm/MatMul ← BN ← activation) into single block
- [x] Topological 3D layout: X = depth, Z = branch lane, Y/Z size = log(params)/log(channels)
- [x] Op-keyed color palette + clickable LayerBlock with floating label
- [x] Auto-fit camera on model load via drei `<Bounds>`
- [x] Selected-layer inspector card (id, params, shapes, fused ops)
- [x] 500-logical-layer cap with head/middle-placeholder/tail collapse
- [x] Bundled example models (MNIST CNN, Super-Resolution, SqueezeNet 1.0)
      with one-click load from sidebar
- [x] `patchAllOutputs`: rewrites ONNX so every node output is also a graph
      output → `session.run()` returns every intermediate tensor
- [x] `onnxruntime-web` in Web Worker (transferable buffers, single-thread WASM)
- [x] Local-served WASM at `/ort-wasm/` via postinstall + predev/prebuild copy
- [x] MNIST drawable canvas (28×28 with feathered stamp) + Run button +
      top-3 softmax predictions
- [x] Per-layer summaries (conv → per-channel mean-abs, dense → per-neuron,
      seq → per-feature, capped at 4096 values) stored in Zustand and logged
      to console
- [ ] Phase 4: NeuronGrid InstancedMesh + activation color mapping +
      animated signal packet
- [ ] Phase 4: activation visualization + signal packet animation
- [ ] Phase 5: LOD manager + semantic zoom + inspector panel
- [ ] Phase 6: transformer support + bloom polish
- [ ] Phase 7: bundled example models

## Run locally

```bash
pnpm install
pnpm dev
```

Open <http://localhost:3000>.

## Requirements

- Node 20+ (tested on 22)
- A browser with WebGL2 (WebGPU optional, Chrome/Edge)

## Stack

- Next.js 16 (app router) + TypeScript + Turbopack
- React Three Fiber + drei + three.js
- `onnxruntime-web` (Phase 3+)
- `onnx` (npm) for graph parsing (Phase 2+)
- Zustand
- Tailwind CSS 4

## Project layout

```
app/                 Next.js app router
components/scene/    R3F components (Scene, LayerBlock, NeuronGrid, …)
components/panels/   HTML panels (ModelLoader, InputPanel, Inspector)
lib/onnx/            graph parse, output patching, worker, summarise
lib/layout/          topological 3D layout
lib/store/           Zustand store
public/ort-wasm/     ONNX Runtime WASM artifacts (added Phase 3)
public/examples/     bundled demo ONNX models (added Phase 7)
```

## Honest limitations

Raw activations are not "concepts." Neuron N lighting up does not mean
"this is the cat detector." Real interpretability needs sparse
autoencoders or circuit tracing; out of scope here. Labels say
"neuron N," not "the X detector."

## License

TBD.

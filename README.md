# NeuralScope

> Local-first, browser-based 3D inspector for small ONNX neural networks.
> Drop a model, type/upload an input, watch inference happen layer by layer
> with semantic zoom from "whole network" down to "individual activation."

Inference-only. Models never leave your machine. Targets small models
(<50 MB, <~50M params): MNIST CNNs, tiny ResNets, nano-GPT class
transformers. Not for 7B+ LLMs.

## Status: Phase 1 — skeleton

- [x] Next.js 16 + React Three Fiber + Tailwind 4 + Zustand boilerplate
- [x] R3F Canvas with OrbitControls, dark scene, placeholder block, grid
- [x] Sidebar shell showing model state from Zustand store
- [ ] Phase 2: ONNX drag-drop + graph parse + per-layer blocks
- [ ] Phase 3: `onnxruntime-web` in Web Worker + intermediate activations
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

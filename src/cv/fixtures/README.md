# CV Test Fixtures

## Synthetic Tensors

`synthetic-tensor.ts` provides a factory for creating YOLO-format output tensors with known detections embedded. Use these to test `postProcess()` without any model.

```ts
import { createSyntheticTensor, DIGIT_7_FIXTURE } from './synthetic-tensor';

const tensor = createSyntheticTensor(10, 8400, [DIGIT_7_FIXTURE]);
const results = postProcess({ output: tensor, numAnchors: 8400, numClasses: 10, ... });
// results[0].digit === 7
```

## Adding Labeled Test Frames (Future)

When real-device testing begins (M9), add labeled test frames here for regression testing:

1. Capture a frame using the Debug HUD's fixture capture button (`?debug=true`)
2. Save the frame as `frames/<description>.jpg` (e.g., `digit-7-bright.jpg`)
3. Save the expected detections as `frames/<description>.json` with the format:
   ```json
   {
     "detections": [
       { "digit": 7, "confidence": 0.95, "bbox": { "x": 0.15, "y": 0.3, "width": 0.08, "height": 0.1 } }
     ]
   }
   ```
4. Use `FixtureFrameSource` (M5) to replay these frames through the full pipeline

### Naming convention

- `digit-<N>-<condition>.jpg` — single digit (e.g., `digit-7-bright.jpg`, `digit-6-dim.jpg`)
- `multi-<digits>-<condition>.jpg` — multi-digit (e.g., `multi-13-normal.jpg`)
- `empty-<condition>.jpg` — no tiles visible (negative example)
- `hand-<condition>.jpg` — hand partially occluding tiles

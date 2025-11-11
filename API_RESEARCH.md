# FigJam API Research - Detailed Findings

## 1. Plugin Development Basics

### 1.1 Plugin Structure
A FigJam plugin consists of two parts:
1. **Main code (code.ts)** - Runs in a sandboxed environment with access to Figma/FigJam API
2. **UI (ui.html + ui.ts)** - Optional, runs in iframe with access to browser APIs

### 1.2 Manifest Configuration
```json
{
  "name": "Plugin Name",
  "id": "unique-plugin-id",
  "api": "1.0.0",
  "main": "code.js",
  "editorType": ["figjam"],  // Specify FigJam only
  "ui": "ui.html"
}
```

### 1.3 Communication Between Code and UI
```typescript
// In code.ts (sandbox)
figma.ui.postMessage({ type: 'data', payload: data });

// In ui.ts (browser)
window.onmessage = (event) => {
  const msg = event.data.pluginMessage;
  if (msg.type === 'data') {
    // Handle data
  }
};

// From UI to code
parent.postMessage({ pluginMessage: { type: 'action' } }, '*');
```

---

## 2. FigJam Node Types

### 2.1 Common Properties (All Nodes)
```typescript
interface BaseNode {
  id: string;
  name: string;
  type: string;
  visible: boolean;
  locked: boolean;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;  // In degrees
  parent: BaseNode | null;
}
```

### 2.2 Shape Nodes
```typescript
// Rectangle
interface RectangleNode extends BaseNode {
  type: 'RECTANGLE';
  cornerRadius: number;  // For rounded corners
  fills: Paint[];
  strokes: Paint[];
  strokeWeight: number;
  strokeAlign: 'INSIDE' | 'OUTSIDE' | 'CENTER';
}

// Ellipse
interface EllipseNode extends BaseNode {
  type: 'ELLIPSE';
  fills: Paint[];
  strokes: Paint[];
  strokeWeight: number;
  arcData: ArcData;  // For partial circles
}

// Polygon
interface PolygonNode extends BaseNode {
  type: 'POLYGON';
  pointCount: number;  // Number of sides (3 = triangle, 5 = pentagon, etc.)
  fills: Paint[];
  strokes: Paint[];
  strokeWeight: number;
}
```

### 2.3 FigJam-Specific Nodes
```typescript
// ShapeWithTextNode - Common in FigJam
interface ShapeWithTextNode extends BaseNode {
  type: 'SHAPE_WITH_TEXT';
  shapeType: 'SQUARE' | 'ELLIPSE' | 'ROUNDED_RECTANGLE' |
             'DIAMOND' | 'TRIANGLE_UP' | 'TRIANGLE_DOWN' |
             'PARALLELOGRAM_RIGHT' | 'PARALLELOGRAM_LEFT';
  text: TextNode;
  fills: Paint[];
  strokes: Paint[];
}

// StickyNode - Sticky notes
interface StickyNode extends BaseNode {
  type: 'STICKY';
  text: TextNode;
  fills: Paint[];  // Usually solid color
}

// ConnectorNode - Lines and arrows
interface ConnectorNode extends BaseNode {
  type: 'CONNECTOR';
  connectorStart: ConnectorEndpoint;
  connectorEnd: ConnectorEndpoint;
  strokeWeight: number;
  strokes: Paint[];
  cornerRadius: number;
}
```

---

## 3. Paint (Fill & Stroke) Properties

### 3.1 Paint Types
```typescript
type Paint = SolidPaint | GradientPaint | ImagePaint;

interface SolidPaint {
  type: 'SOLID';
  color: RGB;
  opacity?: number;
  visible?: boolean;
}

interface RGB {
  r: number;  // 0-1
  g: number;  // 0-1
  b: number;  // 0-1
}

interface GradientPaint {
  type: 'GRADIENT_LINEAR' | 'GRADIENT_RADIAL' | 'GRADIENT_ANGULAR' | 'GRADIENT_DIAMOND';
  gradientStops: ColorStop[];
  gradientTransform: Transform;
  opacity?: number;
  visible?: boolean;
}

interface ColorStop {
  position: number;  // 0-1
  color: RGBA;
}

interface ImagePaint {
  type: 'IMAGE';
  scaleMode: 'FILL' | 'FIT' | 'CROP' | 'TILE';
  imageHash: string | null;
  imageTransform?: Transform;
  opacity?: number;
  visible?: boolean;
}
```

---

## 4. Text Properties

### 4.1 Text Node
```typescript
interface TextNode extends BaseNode {
  type: 'TEXT';
  characters: string;
  fontSize: number | typeof figma.mixed;
  fontName: FontName | typeof figma.mixed;
  textAlignHorizontal: 'LEFT' | 'CENTER' | 'RIGHT' | 'JUSTIFIED';
  textAlignVertical: 'TOP' | 'CENTER' | 'BOTTOM';
  letterSpacing: LetterSpacing | typeof figma.mixed;
  lineHeight: LineHeight | typeof figma.mixed;
  fills: Paint[];
}

interface FontName {
  family: string;
  style: string;  // 'Regular', 'Bold', 'Italic', etc.
}

interface LetterSpacing {
  value: number;
  unit: 'PIXELS' | 'PERCENT';
}

interface LineHeight {
  value: number;
  unit: 'PIXELS' | 'PERCENT' | 'AUTO';
}
```

### 4.2 Reading Text Properties
```typescript
// For mixed formatting, need to check ranges
const textNode: TextNode = selection[0] as TextNode;

// Get text content
const text = textNode.characters;

// For properties that might be mixed
if (textNode.fontSize === figma.mixed) {
  // Handle mixed font sizes
  for (let i = 0; i < text.length; i++) {
    const fontSize = textNode.getRangeFontSize(i, i + 1);
  }
} else {
  const fontSize = textNode.fontSize;
}
```

---

## 5. Selection and Iteration

### 5.1 Getting Current Selection
```typescript
const selection = figma.currentPage.selection;

if (selection.length === 0) {
  figma.notify('Please select at least one object');
  return;
}

// Iterate through selection
for (const node of selection) {
  console.log(`Selected: ${node.name} (${node.type})`);

  // Type checking
  if (node.type === 'RECTANGLE') {
    const rect = node as RectangleNode;
    console.log(`Size: ${rect.width}x${rect.height}`);
  }
}
```

### 5.2 Handling Groups
```typescript
function processNode(node: SceneNode) {
  if (node.type === 'GROUP' || node.type === 'FRAME') {
    // Recursively process children
    const container = node as GroupNode | FrameNode;
    for (const child of container.children) {
      processNode(child);
    }
  } else {
    // Process individual node
    extractNodeData(node);
  }
}
```

---

## 6. Coordinate Systems and Transforms

### 6.1 Position and Size
```typescript
// Absolute position on canvas
const x = node.x;
const y = node.y;
const width = node.width;
const height = node.height;

// For rotated nodes, might need to calculate bounds
const bounds = node.absoluteBoundingBox;
if (bounds) {
  const left = bounds.x;
  const top = bounds.y;
  const right = bounds.x + bounds.width;
  const bottom = bounds.y + bounds.height;
}
```

### 6.2 Rotation
```typescript
// Rotation in degrees, clockwise
const rotation = node.rotation;

// Convert to radians if needed
const rotationRadians = (rotation * Math.PI) / 180;
```

### 6.3 Transform Matrix
```typescript
// For more complex transformations
const transform = node.relativeTransform;
// Transform is a 2x3 matrix:
// [[a, b, tx],
//  [c, d, ty]]
```

---

## 7. Exporting Node Data

### 7.1 Basic Extraction Pattern
```typescript
function extractNodeData(node: SceneNode) {
  const baseData = {
    id: node.id,
    name: node.name,
    type: node.type,
    x: node.x,
    y: node.y,
    width: node.width,
    height: node.height,
    rotation: node.rotation,
    visible: node.visible
  };

  // Add type-specific data
  switch (node.type) {
    case 'RECTANGLE':
      return {
        ...baseData,
        ...extractRectangleData(node as RectangleNode)
      };
    case 'ELLIPSE':
      return {
        ...baseData,
        ...extractEllipseData(node as EllipseNode)
      };
    // ... other types
  }
}

function extractRectangleData(rect: RectangleNode) {
  return {
    cornerRadius: rect.cornerRadius,
    fills: rect.fills,
    strokes: rect.strokes,
    strokeWeight: rect.strokeWeight,
    strokeAlign: rect.strokeAlign
  };
}
```

### 7.2 Handling Complex Properties
```typescript
// Extract fills (handle array)
function extractFills(fills: readonly Paint[]) {
  return fills
    .filter(fill => fill.visible !== false)
    .map(fill => {
      if (fill.type === 'SOLID') {
        return {
          type: 'solid',
          color: {
            r: fill.color.r,
            g: fill.color.g,
            b: fill.color.b
          },
          opacity: fill.opacity || 1
        };
      }
      // Handle other fill types...
    });
}
```

---

## 8. Plugin Execution Patterns

### 8.1 Run Once (No UI)
```typescript
// In code.ts
const selection = figma.currentPage.selection;

if (selection.length === 0) {
  figma.notify('Please select an object');
  figma.closePlugin();
  return;
}

// Process selection
processSelection(selection);
figma.notify('Copied to PowerPoint format!');
figma.closePlugin();
```

### 8.2 With UI
```typescript
// In code.ts
figma.showUI(__html__, { width: 300, height: 400 });

figma.ui.onmessage = msg => {
  if (msg.type === 'process-selection') {
    const selection = figma.currentPage.selection;
    const data = extractData(selection);
    figma.ui.postMessage({ type: 'data-ready', data });
  }

  if (msg.type === 'close') {
    figma.closePlugin();
  }
};

// In ui.html / ui.ts
function copyToClipboard() {
  parent.postMessage({
    pluginMessage: { type: 'process-selection' }
  }, '*');
}

window.onmessage = (event) => {
  const msg = event.data.pluginMessage;
  if (msg.type === 'data-ready') {
    // Now copy to clipboard (has browser API access here)
    navigator.clipboard.writeText(JSON.stringify(msg.data));
  }
};
```

---

## 9. Limitations and Considerations

### 9.1 Sandbox Restrictions
- **No clipboard access** in main code
- **No network access** directly (can use iframe/UI context)
- **No file system access**
- Must communicate with UI via postMessage for browser APIs

### 9.2 Performance
- Large selections may take time to process
- Consider showing progress for >50 objects
- Async operations are recommended

### 9.3 Browser Compatibility
- Plugin UI runs in modern Chromium-based environment
- Can use modern JavaScript/TypeScript features
- Clipboard API is fully supported

---

## 10. Useful Plugin API Methods

```typescript
// Notifications
figma.notify('Message', { timeout: 3000 });

// Close plugin
figma.closePlugin();

// Current page
const page = figma.currentPage;

// All nodes on page
const allNodes = page.findAll();

// Find specific nodes
const rectangles = page.findAll(node => node.type === 'RECTANGLE');

// Viewport
const viewport = figma.viewport;
const center = viewport.center;
const zoom = viewport.zoom;

// Scroll to node
figma.viewport.scrollAndZoomIntoView([node]);
```

---

## 11. TypeScript Setup

### 11.1 Install Types
```bash
npm install --save-dev @figma/plugin-typings
```

### 11.2 tsconfig.json
```json
{
  "compilerOptions": {
    "target": "ES6",
    "lib": ["ES2015"],
    "typeRoots": ["./node_modules/@types", "./node_modules/@figma"]
  }
}
```

---

## 12. Common Pitfalls

1. **Assuming single fill/stroke**: Nodes can have multiple fills and strokes
2. **Forgetting to check visibility**: Hidden paints should be ignored
3. **Mixed text properties**: Text might have mixed formatting
4. **Coordinate systems**: Parent transformations affect child positions
5. **Async operations**: Plugin API is mostly synchronous, but clipboard isn't

---

## 13. Recommended Approach for This Plugin

1. **Extract data in sandbox** (code.ts)
   - Process selection
   - Extract all node properties
   - Convert to intermediate JSON format

2. **Send to UI** (postMessage)
   - Transfer serializable data only
   - Keep data structure flat and simple

3. **Handle clipboard in UI** (ui.ts)
   - Convert JSON to desired format (XML, etc.)
   - Use browser Clipboard API
   - Handle multiple clipboard formats

4. **User feedback**
   - Show loading state during processing
   - Notify success/error
   - Provide instructions for pasting

---

## 14. Additional Resources

- [Figma Plugin API Documentation](https://www.figma.com/plugin-docs/)
- [FigJam-specific Features](https://www.figma.com/plugin-docs/figjam/)
- [TypeScript Plugin Typings](https://www.npmjs.com/package/@figma/plugin-typings)
- [Figma Community Forum](https://forum.figma.com/)

---

## 15. Implementation Notes for figjam2pptx

### Current Implementation

The `figjam2pptx` plugin implements the recommended architecture:

1. **Data Extraction** (src/code.ts)
   - Extracts all node types with comprehensive property capture
   - Handles fills, strokes, text, and positioning
   - Recursively processes groups and frames

2. **Data Conversion** (src/pptx-converter.ts)
   - Converts to both JSON and XML formats
   - Maps FigJam node types to PowerPoint equivalents
   - Provides utility methods for color conversion and coordinate transformation

3. **User Interface** (src/ui.html, src/ui.ts)
   - Clean, modern interface with format selection
   - Real-time status updates
   - Clipboard integration using browser APIs
   - Error handling and user feedback

### Future Improvements

- Direct .pptx file generation using JSZip and XML builders
- Image embedding support
- Advanced text formatting preservation
- Batch processing for multiple pages
- Custom export templates

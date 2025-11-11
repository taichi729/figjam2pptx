// FigJam to PowerPoint Plugin - Main Code
// This runs in the Figma plugin sandbox with access to the FigJam API

interface ExtractedNodeData {
  id: string;
  name: string;
  type: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  visible: boolean;
  fills?: any[];
  strokes?: any[];
  strokeWeight?: number;
  text?: string;
  cornerRadius?: number;
  shapeType?: string;
  connectorStart?: any;
  connectorEnd?: any;
  children?: ExtractedNodeData[];
}

// Show UI when plugin runs
figma.showUI(__html__, {
  width: 400,
  height: 500,
  themeColors: true
});

// Handle messages from UI
figma.ui.onmessage = (msg) => {
  if (msg.type === 'process-selection') {
    processSelection();
  } else if (msg.type === 'close') {
    figma.closePlugin();
  }
};

function processSelection() {
  const selection = figma.currentPage.selection;

  if (selection.length === 0) {
    figma.ui.postMessage({
      type: 'error',
      message: 'Please select at least one object to export'
    });
    return;
  }

  try {
    const extractedData: ExtractedNodeData[] = [];

    for (const node of selection) {
      const data = extractNodeData(node);
      if (data) {
        extractedData.push(data);
      }
    }

    // Send data to UI for clipboard handling
    figma.ui.postMessage({
      type: 'data-ready',
      data: extractedData,
      pageInfo: {
        name: figma.currentPage.name,
        width: figma.currentPage.width,
        height: figma.currentPage.height
      }
    });
  } catch (error) {
    figma.ui.postMessage({
      type: 'error',
      message: `Error processing selection: ${error}`
    });
  }
}

function extractNodeData(node: SceneNode): ExtractedNodeData | null {
  // Base properties common to all nodes
  const baseData: ExtractedNodeData = {
    id: node.id,
    name: node.name,
    type: node.type,
    x: node.x,
    y: node.y,
    width: 'width' in node ? node.width : 0,
    height: 'height' in node ? node.height : 0,
    rotation: 'rotation' in node ? node.rotation : 0,
    visible: node.visible
  };

  // Extract type-specific properties
  switch (node.type) {
    case 'RECTANGLE':
      return extractRectangleData(node as RectangleNode, baseData);

    case 'ELLIPSE':
      return extractEllipseData(node as EllipseNode, baseData);

    case 'POLYGON':
      return extractPolygonData(node as PolygonNode, baseData);

    case 'SHAPE_WITH_TEXT':
      return extractShapeWithTextData(node as ShapeWithTextNode, baseData);

    case 'STICKY':
      return extractStickyData(node as StickyNode, baseData);

    case 'TEXT':
      return extractTextData(node as TextNode, baseData);

    case 'CONNECTOR':
      return extractConnectorData(node as ConnectorNode, baseData);

    case 'GROUP':
    case 'FRAME':
      return extractContainerData(node as GroupNode | FrameNode, baseData);

    default:
      // For unsupported types, return base data
      console.log(`Unsupported node type: ${node.type}`);
      return baseData;
  }
}

function extractRectangleData(rect: RectangleNode, baseData: ExtractedNodeData): ExtractedNodeData {
  return {
    ...baseData,
    cornerRadius: rect.cornerRadius as number,
    fills: extractFills(rect.fills),
    strokes: extractStrokes(rect.strokes),
    strokeWeight: rect.strokeWeight
  };
}

function extractEllipseData(ellipse: EllipseNode, baseData: ExtractedNodeData): ExtractedNodeData {
  return {
    ...baseData,
    fills: extractFills(ellipse.fills),
    strokes: extractStrokes(ellipse.strokes),
    strokeWeight: ellipse.strokeWeight
  };
}

function extractPolygonData(polygon: PolygonNode, baseData: ExtractedNodeData): ExtractedNodeData {
  return {
    ...baseData,
    fills: extractFills(polygon.fills),
    strokes: extractStrokes(polygon.strokes),
    strokeWeight: polygon.strokeWeight,
    shapeType: `polygon-${polygon.pointCount}`
  };
}

function extractShapeWithTextData(shape: ShapeWithTextNode, baseData: ExtractedNodeData): ExtractedNodeData {
  return {
    ...baseData,
    shapeType: shape.shapeType,
    fills: extractFills(shape.fills),
    strokes: extractStrokes(shape.strokes),
    text: extractTextContent(shape.text)
  };
}

function extractStickyData(sticky: StickyNode, baseData: ExtractedNodeData): ExtractedNodeData {
  return {
    ...baseData,
    fills: extractFills(sticky.fills),
    text: extractTextContent(sticky.text)
  };
}

function extractTextData(textNode: TextNode, baseData: ExtractedNodeData): ExtractedNodeData {
  return {
    ...baseData,
    text: textNode.characters,
    fills: extractFills(textNode.fills)
  };
}

function extractConnectorData(connector: ConnectorNode, baseData: ExtractedNodeData): ExtractedNodeData {
  return {
    ...baseData,
    strokes: extractStrokes(connector.strokes),
    strokeWeight: connector.strokeWeight,
    connectorStart: {
      x: connector.connectorStart.position?.x || 0,
      y: connector.connectorStart.position?.y || 0,
      endpointNodeId: connector.connectorStart.endpointNodeId
    },
    connectorEnd: {
      x: connector.connectorEnd.position?.x || 0,
      y: connector.connectorEnd.position?.y || 0,
      endpointNodeId: connector.connectorEnd.endpointNodeId
    }
  };
}

function extractContainerData(container: GroupNode | FrameNode, baseData: ExtractedNodeData): ExtractedNodeData {
  const children: ExtractedNodeData[] = [];

  for (const child of container.children) {
    const childData = extractNodeData(child);
    if (childData) {
      children.push(childData);
    }
  }

  return {
    ...baseData,
    children
  };
}

function extractTextContent(textNode: TextNode): string {
  return textNode.characters;
}

function extractFills(fills: readonly Paint[] | typeof figma.mixed): any[] {
  if (fills === figma.mixed || !fills) {
    return [];
  }

  return Array.from(fills)
    .filter(fill => fill.visible !== false)
    .map(fill => {
      if (fill.type === 'SOLID') {
        return {
          type: 'solid',
          color: {
            r: Math.round(fill.color.r * 255),
            g: Math.round(fill.color.g * 255),
            b: Math.round(fill.color.b * 255)
          },
          opacity: fill.opacity !== undefined ? fill.opacity : 1
        };
      } else if (fill.type === 'IMAGE') {
        return {
          type: 'image',
          imageHash: fill.imageHash,
          scaleMode: fill.scaleMode,
          opacity: fill.opacity !== undefined ? fill.opacity : 1
        };
      } else if (fill.type.startsWith('GRADIENT')) {
        return {
          type: 'gradient',
          gradientType: fill.type,
          gradientStops: fill.gradientStops.map(stop => ({
            position: stop.position,
            color: {
              r: Math.round(stop.color.r * 255),
              g: Math.round(stop.color.g * 255),
              b: Math.round(stop.color.b * 255),
              a: stop.color.a
            }
          })),
          opacity: fill.opacity !== undefined ? fill.opacity : 1
        };
      }
      return { type: 'unknown' };
    });
}

function extractStrokes(strokes: readonly Paint[] | typeof figma.mixed): any[] {
  // Same logic as fills
  return extractFills(strokes);
}

// Initialize plugin
console.log('FigJam to PowerPoint plugin loaded');

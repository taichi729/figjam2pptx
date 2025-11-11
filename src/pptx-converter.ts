// PowerPoint Converter Module
// Converts FigJam node data to PowerPoint-compatible formats

export interface PPTXShape {
  type: string;
  position: { x: number; y: number };
  size: { width: number; height: number };
  rotation: number;
  fill?: PPTXFill;
  stroke?: PPTXStroke;
  text?: string;
  properties?: any;
}

export interface PPTXFill {
  type: 'solid' | 'gradient' | 'image';
  color?: { r: number; g: number; b: number };
  opacity?: number;
  gradientStops?: any[];
}

export interface PPTXStroke {
  color: { r: number; g: number; b: number };
  width: number;
  opacity?: number;
}

export class PPTXConverter {
  /**
   * Convert FigJam nodes to PowerPoint XML format
   */
  static toXML(nodes: any[], pageInfo: any): string {
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += '<!-- FigJam to PowerPoint Export -->\n';
    xml += '<presentation xmlns="http://schemas.figjam2pptx.com/presentation">\n';
    xml += `  <metadata>\n`;
    xml += `    <exportDate>${new Date().toISOString()}</exportDate>\n`;
    xml += `    <sourcePage>${this.escapeXML(pageInfo.name)}</sourcePage>\n`;
    xml += `    <objectCount>${nodes.length}</objectCount>\n`;
    xml += `  </metadata>\n`;
    xml += `  <slide width="${pageInfo.width}" height="${pageInfo.height}">\n`;

    nodes.forEach(node => {
      xml += this.nodeToXML(node, 2);
    });

    xml += '  </slide>\n';
    xml += '</presentation>';

    return xml;
  }

  /**
   * Convert FigJam nodes to simplified JSON format
   */
  static toJSON(nodes: any[], pageInfo: any): string {
    const output = {
      format: 'figjam2pptx',
      version: '1.0.0',
      exportDate: new Date().toISOString(),
      page: {
        name: pageInfo.name,
        width: pageInfo.width,
        height: pageInfo.height
      },
      shapes: nodes.map(node => this.nodeToShape(node))
    };

    return JSON.stringify(output, null, 2);
  }

  /**
   * Convert single node to PowerPoint shape format
   */
  private static nodeToShape(node: any): PPTXShape {
    const shape: PPTXShape = {
      type: this.mapNodeTypeToPPTX(node.type),
      position: { x: node.x, y: node.y },
      size: { width: node.width, height: node.height },
      rotation: node.rotation
    };

    // Add fill
    if (node.fills && node.fills.length > 0) {
      const fill = node.fills[0]; // Use first fill
      if (fill.type === 'solid') {
        shape.fill = {
          type: 'solid',
          color: fill.color,
          opacity: fill.opacity
        };
      } else if (fill.type === 'gradient') {
        shape.fill = {
          type: 'gradient',
          gradientStops: fill.gradientStops,
          opacity: fill.opacity
        };
      }
    }

    // Add stroke
    if (node.strokes && node.strokes.length > 0 && node.strokeWeight) {
      const stroke = node.strokes[0];
      if (stroke.type === 'solid') {
        shape.stroke = {
          color: stroke.color,
          width: node.strokeWeight,
          opacity: stroke.opacity
        };
      }
    }

    // Add text
    if (node.text) {
      shape.text = node.text;
    }

    // Add type-specific properties
    if (node.cornerRadius !== undefined) {
      shape.properties = { ...shape.properties, cornerRadius: node.cornerRadius };
    }

    if (node.shapeType) {
      shape.properties = { ...shape.properties, shapeType: node.shapeType };
    }

    return shape;
  }

  /**
   * Convert node to XML representation
   */
  private static nodeToXML(node: any, indent: number): string {
    const spaces = '  '.repeat(indent);
    const pptxType = this.mapNodeTypeToPPTX(node.type);

    let xml = `${spaces}<shape>\n`;
    xml += `${spaces}  <type>${this.escapeXML(pptxType)}</type>\n`;
    xml += `${spaces}  <id>${this.escapeXML(node.id)}</id>\n`;
    xml += `${spaces}  <name>${this.escapeXML(node.name)}</name>\n`;

    // Geometry
    xml += `${spaces}  <geometry>\n`;
    xml += `${spaces}    <position x="${node.x}" y="${node.y}"/>\n`;
    xml += `${spaces}    <size width="${node.width}" height="${node.height}"/>\n`;
    xml += `${spaces}    <rotation degrees="${node.rotation}"/>\n`;
    xml += `${spaces}  </geometry>\n`;

    // Fill
    if (node.fills && node.fills.length > 0) {
      xml += `${spaces}  <fill>\n`;
      const fill = node.fills[0];
      if (fill.type === 'solid') {
        xml += `${spaces}    <solid r="${fill.color.r}" g="${fill.color.g}" b="${fill.color.b}" opacity="${fill.opacity || 1}"/>\n`;
      } else if (fill.type === 'gradient') {
        xml += `${spaces}    <gradient type="${fill.gradientType}">\n`;
        fill.gradientStops?.forEach((stop: any) => {
          xml += `${spaces}      <stop position="${stop.position}" r="${stop.color.r}" g="${stop.color.g}" b="${stop.color.b}" a="${stop.color.a}"/>\n`;
        });
        xml += `${spaces}    </gradient>\n`;
      }
      xml += `${spaces}  </fill>\n`;
    }

    // Stroke
    if (node.strokes && node.strokes.length > 0) {
      xml += `${spaces}  <stroke weight="${node.strokeWeight || 1}">\n`;
      const stroke = node.strokes[0];
      if (stroke.type === 'solid') {
        xml += `${spaces}    <color r="${stroke.color.r}" g="${stroke.color.g}" b="${stroke.color.b}" opacity="${stroke.opacity || 1}"/>\n`;
      }
      xml += `${spaces}  </stroke>\n`;
    }

    // Text
    if (node.text) {
      xml += `${spaces}  <text><![CDATA[${node.text}]]></text>\n`;
    }

    // Properties
    if (node.cornerRadius !== undefined || node.shapeType) {
      xml += `${spaces}  <properties>\n`;
      if (node.cornerRadius !== undefined) {
        xml += `${spaces}    <cornerRadius>${node.cornerRadius}</cornerRadius>\n`;
      }
      if (node.shapeType) {
        xml += `${spaces}    <shapeType>${this.escapeXML(node.shapeType)}</shapeType>\n`;
      }
      xml += `${spaces}  </properties>\n`;
    }

    // Children
    if (node.children && node.children.length > 0) {
      xml += `${spaces}  <group>\n`;
      node.children.forEach((child: any) => {
        xml += this.nodeToXML(child, indent + 2);
      });
      xml += `${spaces}  </group>\n`;
    }

    xml += `${spaces}</shape>\n`;
    return xml;
  }

  /**
   * Map FigJam node types to PowerPoint equivalents
   */
  private static mapNodeTypeToPPTX(nodeType: string): string {
    const mapping: { [key: string]: string } = {
      'RECTANGLE': 'rectangle',
      'ELLIPSE': 'ellipse',
      'POLYGON': 'polygon',
      'SHAPE_WITH_TEXT': 'shape',
      'STICKY': 'textbox',
      'TEXT': 'text',
      'CONNECTOR': 'line',
      'GROUP': 'group',
      'FRAME': 'frame',
      'LINE': 'line'
    };

    return mapping[nodeType] || 'shape';
  }

  /**
   * Escape XML special characters
   */
  private static escapeXML(str: string): string {
    if (typeof str !== 'string') return String(str);

    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  /**
   * Convert RGB (0-255) to hex color
   */
  static rgbToHex(r: number, g: number, b: number): string {
    return '#' + [r, g, b]
      .map(x => {
        const hex = x.toString(16);
        return hex.length === 1 ? '0' + hex : hex;
      })
      .join('');
  }

  /**
   * Convert FigJam coordinates to PowerPoint EMU (English Metric Units)
   * PowerPoint uses EMUs where 914400 EMUs = 1 inch
   */
  static toEMU(pixels: number, dpi: number = 96): number {
    return Math.round((pixels / dpi) * 914400);
  }
}

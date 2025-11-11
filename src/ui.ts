// FigJam to PowerPoint Plugin - UI Code
// This runs in the browser iframe with access to browser APIs

interface PluginMessage {
  type: string;
  data?: any;
  message?: string;
  pageInfo?: any;
}

let lastExtractedData: any = null;

// DOM Elements
const exportBtn = document.getElementById('exportBtn') as HTMLButtonElement;
const closeBtn = document.getElementById('closeBtn') as HTMLButtonElement;
const statusDiv = document.getElementById('status') as HTMLDivElement;
const infoBox = document.getElementById('infoBox') as HTMLDivElement;
const infoContent = document.getElementById('infoContent') as HTMLDivElement;

// Format selector
const formatOptions = document.querySelectorAll('.format-option');
formatOptions.forEach(option => {
  option.addEventListener('click', () => {
    formatOptions.forEach(opt => opt.classList.remove('selected'));
    option.classList.add('selected');
  });
});

// Event Listeners
exportBtn.addEventListener('click', () => {
  exportBtn.disabled = true;
  updateStatus('processing', 'Processing selection...');

  // Request data from plugin code
  parent.postMessage({
    pluginMessage: { type: 'process-selection' }
  }, '*');
});

closeBtn.addEventListener('click', () => {
  parent.postMessage({
    pluginMessage: { type: 'close' }
  }, '*');
});

// Handle messages from plugin code
window.onmessage = async (event) => {
  const msg: PluginMessage = event.data.pluginMessage;

  if (!msg) return;

  switch (msg.type) {
    case 'data-ready':
      await handleDataReady(msg.data, msg.pageInfo);
      break;

    case 'error':
      handleError(msg.message || 'Unknown error occurred');
      break;
  }
};

async function handleDataReady(data: any[], pageInfo: any) {
  lastExtractedData = { nodes: data, pageInfo };

  try {
    // Get selected format
    const selectedFormat = (document.querySelector('input[name="format"]:checked') as HTMLInputElement).value;

    let clipboardContent: string;

    if (selectedFormat === 'xml') {
      clipboardContent = convertToXML(data, pageInfo);
    } else {
      clipboardContent = JSON.stringify(lastExtractedData, null, 2);
    }

    // Copy to clipboard
    await navigator.clipboard.writeText(clipboardContent);

    updateStatus('success', `Successfully exported ${data.length} object(s) to clipboard!`);
    showInfo(data.length, pageInfo);

  } catch (error) {
    handleError(`Failed to copy to clipboard: ${error}`);
  } finally {
    exportBtn.disabled = false;
  }
}

function handleError(message: string) {
  updateStatus('error', message);
  exportBtn.disabled = false;
}

function updateStatus(type: 'success' | 'error' | 'processing' | 'default', message: string) {
  statusDiv.className = 'status';

  if (type !== 'default') {
    statusDiv.classList.add(type);
  }

  if (type === 'processing') {
    statusDiv.innerHTML = `<span class="spinner"></span>${message}`;
  } else {
    statusDiv.textContent = message;
  }
}

function showInfo(nodeCount: number, pageInfo: any) {
  infoBox.classList.remove('hidden');

  const nodeTypes: { [key: string]: number } = {};
  if (lastExtractedData && lastExtractedData.nodes) {
    lastExtractedData.nodes.forEach((node: any) => {
      nodeTypes[node.type] = (nodeTypes[node.type] || 0) + 1;
    });
  }

  const typesList = Object.entries(nodeTypes)
    .map(([type, count]) => `${type}: ${count}`)
    .join(', ');

  infoContent.innerHTML = `
    <div>Total objects: ${nodeCount}</div>
    <div>Types: ${typesList}</div>
    <div>Page: ${pageInfo.name}</div>
    <div style="margin-top: 8px; color: #666; font-size: 10px;">
      Data has been copied to your clipboard. You can now paste it into PowerPoint or save it to a file.
    </div>
  `;
}

function convertToXML(nodes: any[], pageInfo: any): string {
  // Basic PowerPoint XML structure
  // This is a simplified version - full PowerPoint XML is much more complex

  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  xml += '<presentation>\n';
  xml += `  <page name="${escapeXML(pageInfo.name)}" width="${pageInfo.width}" height="${pageInfo.height}">\n`;

  nodes.forEach(node => {
    xml += convertNodeToXML(node, 2);
  });

  xml += '  </page>\n';
  xml += '</presentation>';

  return xml;
}

function convertNodeToXML(node: any, indent: number): string {
  const spaces = '  '.repeat(indent);
  let xml = `${spaces}<shape type="${escapeXML(node.type)}" id="${escapeXML(node.id)}">\n`;

  // Position and size
  xml += `${spaces}  <bounds x="${node.x}" y="${node.y}" width="${node.width}" height="${node.height}" rotation="${node.rotation}"/>\n`;

  // Fills
  if (node.fills && node.fills.length > 0) {
    xml += `${spaces}  <fills>\n`;
    node.fills.forEach((fill: any) => {
      if (fill.type === 'solid') {
        xml += `${spaces}    <fill type="solid" r="${fill.color.r}" g="${fill.color.g}" b="${fill.color.b}" opacity="${fill.opacity}"/>\n`;
      } else if (fill.type === 'gradient') {
        xml += `${spaces}    <fill type="gradient" gradientType="${fill.gradientType}"/>\n`;
      }
    });
    xml += `${spaces}  </fills>\n`;
  }

  // Strokes
  if (node.strokes && node.strokes.length > 0) {
    xml += `${spaces}  <strokes weight="${node.strokeWeight || 1}">\n`;
    node.strokes.forEach((stroke: any) => {
      if (stroke.type === 'solid') {
        xml += `${spaces}    <stroke type="solid" r="${stroke.color.r}" g="${stroke.color.g}" b="${stroke.color.b}" opacity="${stroke.opacity}"/>\n`;
      }
    });
    xml += `${spaces}  </strokes>\n`;
  }

  // Text
  if (node.text) {
    xml += `${spaces}  <text>${escapeXML(node.text)}</text>\n`;
  }

  // Shape type
  if (node.shapeType) {
    xml += `${spaces}  <shapeType>${escapeXML(node.shapeType)}</shapeType>\n`;
  }

  // Corner radius
  if (node.cornerRadius !== undefined) {
    xml += `${spaces}  <cornerRadius>${node.cornerRadius}</cornerRadius>\n`;
  }

  // Children
  if (node.children && node.children.length > 0) {
    xml += `${spaces}  <children>\n`;
    node.children.forEach((child: any) => {
      xml += convertNodeToXML(child, indent + 2);
    });
    xml += `${spaces}  </children>\n`;
  }

  xml += `${spaces}</shape>\n`;
  return xml;
}

function escapeXML(str: string): string {
  if (typeof str !== 'string') return String(str);

  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

console.log('UI loaded');

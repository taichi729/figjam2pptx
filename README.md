# FigJam to PowerPoint

A FigJam plugin that exports your FigJam content to PowerPoint-compatible formats. Select any objects in FigJam and export them with a single click.

## Features

- **Multi-format Export**: Export to JSON or PowerPoint XML format
- **Comprehensive Data Extraction**: Captures shapes, text, colors, strokes, and positioning
- **Clipboard Integration**: Automatically copies exported data to your clipboard
- **Support for Multiple Node Types**:
  - Rectangles (with corner radius)
  - Ellipses/Circles
  - Polygons
  - Shape with Text
  - Sticky Notes
  - Text nodes
  - Connectors/Lines
  - Groups and Frames

## Installation

### Prerequisites

- Node.js (v18 or later)
- npm or yarn
- Figma Desktop App (for plugin development)

### Setup

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd figjam2pptx
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Build the plugin:
   ```bash
   npm run build
   # or use the build script
   ./build.sh
   ```

4. Load the plugin in FigJam:
   - Open FigJam Desktop App
   - Go to **Menu > Plugins > Development > Import plugin from manifest...**
   - Select the `manifest.json` file from this directory
   - The plugin will now appear in your Plugins menu

## Usage

1. **Select objects** in your FigJam board that you want to export
2. **Run the plugin** from Plugins menu > Development > FigJam to PowerPoint
3. **Choose format**:
   - **JSON**: Structured data format for programmatic use
   - **PowerPoint XML**: XML format closer to PowerPoint structure
4. **Click "Export to PowerPoint"**
5. The data is automatically **copied to your clipboard**
6. Paste the content where needed (PowerPoint, text editor, etc.)

## Exported Data Structure

### JSON Format

```json
{
  "format": "figjam2pptx",
  "version": "1.0.0",
  "exportDate": "2025-11-11T...",
  "page": {
    "name": "Page Name",
    "width": 1920,
    "height": 1080
  },
  "shapes": [
    {
      "type": "rectangle",
      "position": { "x": 100, "y": 200 },
      "size": { "width": 300, "height": 150 },
      "rotation": 0,
      "fill": {
        "type": "solid",
        "color": { "r": 255, "g": 100, "b": 50 },
        "opacity": 1
      },
      "stroke": {
        "color": { "r": 0, "g": 0, "b": 0 },
        "width": 2,
        "opacity": 1
      },
      "text": "Sample Text",
      "properties": {
        "cornerRadius": 8
      }
    }
  ]
}
```

### XML Format

```xml
<?xml version="1.0" encoding="UTF-8"?>
<presentation xmlns="http://schemas.figjam2pptx.com/presentation">
  <metadata>
    <exportDate>2025-11-11T...</exportDate>
    <sourcePage>Page Name</sourcePage>
    <objectCount>5</objectCount>
  </metadata>
  <slide width="1920" height="1080">
    <shape>
      <type>rectangle</type>
      <geometry>
        <position x="100" y="200"/>
        <size width="300" height="150"/>
        <rotation degrees="0"/>
      </geometry>
      <fill>
        <solid r="255" g="100" b="50" opacity="1"/>
      </fill>
      <text><![CDATA[Sample Text]]></text>
    </shape>
  </slide>
</presentation>
```

## Development

### Project Structure

```
figjam2pptx/
├── src/
│   ├── code.ts           # Main plugin code (sandbox)
│   ├── ui.html           # Plugin UI interface
│   ├── ui.ts             # UI logic (browser context)
│   └── pptx-converter.ts # Converter utilities
├── dist/                 # Compiled output
├── manifest.json         # Plugin manifest
├── package.json          # Node dependencies
├── tsconfig.json         # TypeScript config (main)
├── tsconfig.ui.json      # TypeScript config (UI)
└── build.sh              # Build script
```

### Building

```bash
# One-time build
npm run build

# Watch mode (auto-rebuild on changes)
npm run watch
```

### Scripts

- `npm run build`: Compile TypeScript files
- `npm run watch`: Watch mode for development
- `./build.sh`: Build script with helpful output

## Supported Node Types

| FigJam Type | PowerPoint Equivalent | Properties Extracted |
|-------------|----------------------|---------------------|
| Rectangle | Rectangle | Position, size, fills, strokes, corner radius |
| Ellipse | Ellipse | Position, size, fills, strokes |
| Polygon | Polygon | Position, size, fills, strokes, point count |
| Shape with Text | Shape + Text | All shape properties + text content |
| Sticky | Text Box | Position, size, fill color, text |
| Text | Text | Position, size, text content, fills |
| Connector | Line | Start/end points, strokes, connected nodes |
| Group/Frame | Group | Container with children |

## Limitations

- **Sandbox Restrictions**: The main plugin code runs in a sandbox without direct clipboard access
- **Complex Gradients**: Gradient conversions are simplified
- **Image Fills**: Images are referenced by hash, not embedded
- **Font Information**: Limited font property extraction for mixed text
- **PowerPoint Import**: The exported XML is a custom format; direct PowerPoint import requires additional conversion

## Future Enhancements

- [ ] Native .pptx file generation
- [ ] Image embedding support
- [ ] Advanced text formatting (bold, italic, font families)
- [ ] Layer effects (shadows, blurs)
- [ ] Batch export multiple pages
- [ ] Custom slide size templates
- [ ] Direct PowerPoint API integration

## Technical Details

### Architecture

The plugin uses a two-part architecture:

1. **Main Code (code.ts)**: Runs in Figma's sandbox with access to the FigJam API
   - Extracts node data
   - Processes selection
   - Sends data to UI via postMessage

2. **UI (ui.html + ui.ts)**: Runs in browser iframe
   - Provides user interface
   - Has access to browser APIs (Clipboard API)
   - Formats data for export

### Communication Flow

```
User Selection → Plugin Code → Extract Data → postMessage →
UI Receives → Format Data → Clipboard API → Copy Success
```

## Contributing

Contributions are welcome! Please feel free to submit issues or pull requests.

### Development Workflow

1. Make changes to source files in `src/`
2. Run `npm run build` or use watch mode
3. Reload plugin in FigJam (Plugins > Development > Reload)
4. Test your changes
5. Commit and push

## API Research

For detailed information about the FigJam Plugin API, see [API_RESEARCH.md](./API_RESEARCH.md).

## License

MIT License - see [LICENSE](./LICENSE) file for details.

## Support

- **Issues**: Report bugs or request features via GitHub Issues
- **Documentation**: See the `/docs` folder for additional documentation
- **FigJam Plugin API**: https://www.figma.com/plugin-docs/

## Credits

Built with the Figma Plugin API and TypeScript.

---

**Note**: This plugin is not officially affiliated with Figma, Inc. or Microsoft Corporation.

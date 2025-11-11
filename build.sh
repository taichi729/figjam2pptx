#!/bin/bash

# FigJam to PowerPoint Plugin Build Script

echo "Building FigJam to PowerPoint plugin..."

# Create dist directory
mkdir -p dist

# Compile TypeScript
echo "Compiling TypeScript..."
npx tsc
npx tsc -p tsconfig.ui.json

# Copy UI HTML to dist
echo "Copying UI files..."
cp src/ui.html dist/ui.html

# Build complete
echo "Build complete! Files generated in dist/"
echo ""
echo "Plugin files:"
echo "  - dist/code.js (main plugin code)"
echo "  - dist/ui.js (UI code)"
echo "  - dist/ui.html (UI interface)"
echo ""
echo "To use in Figma/FigJam:"
echo "1. Open FigJam desktop app"
echo "2. Go to Menu > Plugins > Development > Import plugin from manifest..."
echo "3. Select the manifest.json file from this directory"

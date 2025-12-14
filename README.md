# JPGs to PDF

Simple desktop app that converts a folder of JPG/JPEGs into a PDF — with features to control page size, orientation, margins, and image fitting.

Built with Electron.

---

## Features

### Converts folders
- Create/select a folder containing `.jpg` / `.jpeg` files
- All images are combined into PDF
- One image per page
- Files are sorted in natural order (`1, 2, 3` etc.)
- Optional reverse order

### Page formatting
- Page sizes:
  - **A4**
  - **Letter**
  - **Match image size** (page matches each image’s dimensions)
- Orientation:
  - **Portrait**
  - **Landscape**

### Image layout options
- **Contain** (no cropping, letterboxes if needed)
- **Cover** (fills the page, crops overflow)
- Adjustable **margins** (in points)

### Rotation
- Auto — follows camera orientation metadata
- Manual:
  - 90°
  - 180°
  - 270°
- Or none

### UI
- Haven't made any CSS for it so it looks ugly,
- But, it works

---

### Icon
- It's an ugly stock photo
- I'll make a real one later
 
---

## Platforms

- Windows - tested and functional
- macOS - untested

---

## Usage (Standalone App)

1. Launch
2. Pick folder containing JPG images
3. Choose where to save the output PDF + name
4. Adjust page and layout settings
5. Click "Convert"

---

## Development

### Install dependencies
```bash
npm install

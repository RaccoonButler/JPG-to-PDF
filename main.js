const { app, BrowserWindow, ipcMain, dialog } = require("electron");
const path = require("path");
const fs = require("fs");
const sharp = require("sharp");
const { PDFDocument } = require("pdf-lib");

function createWindow() {
  const win = new BrowserWindow({
    width: 860,
    height: 700,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  win.loadFile("index.html");
}

app.whenReady().then(() => {
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

// ----- Helpers -----
function naturalCompare(a, b) {
  const ax = a.toLowerCase().match(/\d+|\D+/g) || [];
  const bx = b.toLowerCase().match(/\d+|\D+/g) || [];
  const len = Math.max(ax.length, bx.length);

  for (let i = 0; i < len; i++) {
    const ac = ax[i], bc = bx[i];
    if (ac === undefined) return -1;
    if (bc === undefined) return 1;

    const an = /^\d+$/.test(ac) ? Number(ac) : null;
    const bn = /^\d+$/.test(bc) ? Number(bc) : null;

    if (an !== null && bn !== null) {
      if (an !== bn) return an - bn;
    } else {
      if (ac !== bc) return ac < bc ? -1 : 1;
    }
  }
  return 0;
}

const PAGE_SIZES_PT = {
  A4: [595.28, 841.89],
  Letter: [612, 792]
};

function getPageSizePt(pageFormat, orientation) {
  if (pageFormat === "Image") return null; // handled per-image
  const base = PAGE_SIZES_PT[pageFormat] || PAGE_SIZES_PT.A4;
  const [w, h] = base;
  if (orientation === "Landscape") return [h, w];
  return [w, h];
}

function fitRect(imgW, imgH, boxW, boxH, mode) {
  // mode: "Contain" (letterbox) or "Cover" (crop)
  const imgAR = imgW / imgH;
  const boxAR = boxW / boxH;

  let drawW, drawH;
  if (mode === "Cover") {
    // fill box, crop overflow
    if (imgAR > boxAR) {
      drawH = boxH;
      drawW = boxH * imgAR;
    } else {
      drawW = boxW;
      drawH = boxW / imgAR;
    }
  } else {
    // contain inside box
    if (imgAR > boxAR) {
      drawW = boxW;
      drawH = boxW / imgAR;
    } else {
      drawH = boxH;
      drawW = boxH * imgAR;
    }
  }

  const x = (boxW - drawW) / 2;
  const y = (boxH - drawH) / 2;
  return { x, y, width: drawW, height: drawH };
}

// ----- Dialog IPC -----
ipcMain.handle("pick-folder", async () => {
  const res = await dialog.showOpenDialog({
    properties: ["openDirectory"]
  });
  if (res.canceled || !res.filePaths?.[0]) return null;
  return res.filePaths[0];
});

ipcMain.handle("pick-save", async () => {
  const res = await dialog.showSaveDialog({
    title: "Save PDF",
    defaultPath: "output.pdf",
    filters: [{ name: "PDF", extensions: ["pdf"] }]
  });
  if (res.canceled || !res.filePath) return null;
  return res.filePath;
});

// ----- Convert IPC -----
ipcMain.handle("convert", async (_evt, options) => {
  const {
    inputFolder,
    outputFile,
    pageFormat,        // "A4" | "Letter" | "Image"
    orientation,       // "Portrait" | "Landscape"
    fitMode,           // "Contain" | "Cover"
    marginPt,          // number
    rotate,            // "None" | "Auto" | "90" | "180" | "270"
    reverseOrder       // boolean
  } = options || {};

  if (!inputFolder || !outputFile) {
    throw new Error("Missing inputFolder or outputFile.");
  }
  if (!fs.existsSync(inputFolder) || !fs.statSync(inputFolder).isDirectory()) {
    throw new Error("Input folder is invalid.");
  }

  let files = fs
    .readdirSync(inputFolder)
    .filter((f) => /\.(jpe?g)$/i.test(f))
    .sort(naturalCompare);

  if (reverseOrder) files = files.reverse();
  if (files.length === 0) throw new Error("No .jpg/.jpeg files found.");

  const pdfDoc = await PDFDocument.create();
  const fixedPageSize = getPageSizePt(pageFormat, orientation);

  let processed = 0;

  for (const file of files) {
    const fullPath = path.join(inputFolder, file);
    const jpgBytes = fs.readFileSync(fullPath);

    // Use sharp to auto-rotate by EXIF if requested, and/or rotate explicitly.
    let img = sharp(jpgBytes);
    if (rotate === "Auto") img = img.rotate(); // respects EXIF orientation
    else if (rotate !== "None") img = img.rotate(Number(rotate));

    // We embed JPG bytes into PDF. sharp can output JPG again after rotations.
    const normalizedJpg = await img.jpeg({ quality: 95 }).toBuffer();

    const embedded = await pdfDoc.embedJpg(normalizedJpg);
    const imgW = embedded.width;
    const imgH = embedded.height;

    let pageW, pageH;
    if (fixedPageSize) {
      [pageW, pageH] = fixedPageSize;
    } else {
      // Page matches image size, but allow orientation toggle to swap if desired.
      if (orientation === "Landscape") {
        pageW = Math.max(imgW, imgH);
        pageH = Math.min(imgW, imgH);
      } else {
        pageW = imgW;
        pageH = imgH;
      }
    }

    const page = pdfDoc.addPage([pageW, pageH]);

    const m = Math.max(0, Number(marginPt) || 0);
    const boxW = Math.max(1, pageW - m * 2);
    const boxH = Math.max(1, pageH - m * 2);

    const rect = fitRect(imgW, imgH, boxW, boxH, fitMode);
    page.drawImage(embedded, {
      x: m + rect.x,
      y: m + rect.y,
      width: rect.width,
      height: rect.height
    });

    processed++;
  }

  const pdfBytes = await pdfDoc.save();
  fs.writeFileSync(outputFile, pdfBytes);

  return { ok: true, processed, outputFile };
});

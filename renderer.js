const el = (id) => document.getElementById(id);

function setStatus(msg) {
  el("status").textContent = msg;
}

el("pickFolderBtn").addEventListener("click", async () => {
  const folder = await window.api.pickFolder();
  if (folder) el("inputFolder").value = folder;
});

el("pickSaveBtn").addEventListener("click", async () => {
  const out = await window.api.pickSave();
  if (out) el("outputFile").value = out;
});

el("convertBtn").addEventListener("click", async () => {
  try {
    setStatus("Working…");

    const options = {
      inputFolder: el("inputFolder").value.trim(),
      outputFile: el("outputFile").value.trim(),
      pageFormat: el("pageFormat").value,
      orientation: el("orientation").value,
      fitMode: el("fitMode").value,
      marginPt: Number(el("marginPt").value || 0),
      rotate: el("rotate").value,
      reverseOrder: el("reverseOrder").checked
    };

    const res = await window.api.convert(options);
    setStatus(`Done!\nImages processed: ${res.processed}\nSaved: ${res.outputFile}`);
  } catch (err) {
    setStatus(`Error:\n${err?.message || String(err)}`);
  }
});

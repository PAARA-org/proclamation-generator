/**
 * Background Web Worker for Proclamation Layout & PDF Generation
 * Keeps all OpenType font shaping, Auto-Fit binary search, TrueType subsetting,
 * and 900+ vector PDF path operators off the main UI thread.
 */
/* global importScripts */
self.window = self;

importScripts(
  '../vendor/pdf-lib.min.js',
  '../vendor/fontkit.umd.min.js',
  './themes.js',
  './layout.js',
  './pdf-export.js'
);

let workerFontBuffers = null;
let workerFontMetrics = null;

self.onmessage = async (e) => {
  const msg = e.data;
  if (!msg || typeof msg !== 'object') return;

  if (msg.type === 'init') {
    workerFontBuffers = msg.fontBuffers;
    workerFontMetrics = {};
    for (const [key, buf] of Object.entries(workerFontBuffers)) {
      workerFontMetrics[key] = self.fontkit.create(new Uint8Array(buf));
    }
    self.postMessage({ type: 'ready' });
    return;
  }

  if (msg.type === 'layout') {
    if (!workerFontMetrics) return;
    try {
      const fullLayout = self.PAARA.computeProclamationLayout(msg.stateLite, workerFontMetrics);
      // Omit heavy border.primitives array in postMessage (main thread caches border primitives by theme+size)
      const { primitives, ...borderMeta } = fullLayout.border;
      const slimLayout = {
        ...fullLayout,
        border: borderMeta
      };
      self.postMessage({ type: 'layoutResult', seq: msg.seq, layout: slimLayout });
    } catch (err) {
      self.postMessage({ type: 'error', seq: msg.seq, message: err.message });
    }
    return;
  }

  if (msg.type === 'generatePdf') {
    if (!workerFontBuffers) return;
    try {
      const pdfBytes = await self.PAARA.generateProclamationPdfBytes(
        msg.layout,
        workerFontBuffers,
        msg.assets
      );
      self.postMessage(
        { type: 'pdfResult', reqId: msg.reqId, seq: msg.seq, pdfBuffer: pdfBytes.buffer },
        [pdfBytes.buffer]
      );
    } catch (err) {
      self.postMessage({
        type: 'pdfError',
        reqId: msg.reqId,
        seq: msg.seq,
        message: err.message
      });
    }
  }
};

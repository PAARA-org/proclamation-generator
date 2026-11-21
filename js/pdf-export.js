/**
 * True-Vector PDF Exporter (powered by local pdf-lib + @pdf-lib/fontkit)
 * Works seamlessly both over HTTP(S) and direct file:// opening.
 */
(function () {
  'use strict';

  function hexToPdfRgb(hex) {
    const { rgb } = window.PDFLib;
    if (!hex || hex === 'none') return null;
    const clean = hex.replace('#', '');
    const full =
      clean.length === 3
        ? clean
            .split('')
            .map((c) => c + c)
            .join('')
        : clean;
    const num = parseInt(full, 16);
    const r = ((num >> 16) & 255) / 255;
    const g = ((num >> 8) & 255) / 255;
    const b = (num & 255) / 255;
    return rgb(r, g, b);
  }

  function dataUrlToUint8Array(dataUrl) {
    const idx = dataUrl.indexOf(',');
    const b64 = idx >= 0 ? dataUrl.slice(idx + 1) : dataUrl;
    const bin = atob(b64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) {
      bytes[i] = bin.charCodeAt(i);
    }
    return bytes;
  }

  function drawVectorPrimitivesOnPdfPage(page, primitives, pageHeight) {
    const {
      pushGraphicsState,
      popGraphicsState,
      moveTo,
      lineTo,
      closePath,
      fill,
      stroke,
      fillAndStroke,
      setFillingColor,
      setStrokingColor,
      setLineWidth,
      setLineJoin,
      LineJoinStyle
    } = window.PDFLib;

    for (const prim of primitives) {
      const fillCol = prim.fill ? hexToPdfRgb(prim.fill) : null;
      const strokeCol = prim.stroke ? hexToPdfRgb(prim.stroke) : null;
      const sw = prim.strokeWidth || 1;

      if (prim.type === 'rect') {
        page.drawRectangle({
          x: prim.x,
          y: pageHeight - prim.y - prim.h,
          width: prim.w,
          height: prim.h,
          color: fillCol || undefined,
          borderColor: strokeCol || undefined,
          borderWidth: strokeCol ? sw : 0
        });
      } else if (prim.type === 'circle') {
        page.drawCircle({
          x: prim.cx,
          y: pageHeight - prim.cy,
          size: prim.r,
          color: fillCol || undefined,
          borderColor: strokeCol || undefined,
          borderWidth: strokeCol ? sw : 0
        });
      } else if (prim.type === 'line') {
        if (strokeCol) {
          page.drawLine({
            start: { x: prim.x1, y: pageHeight - prim.y1 },
            end: { x: prim.x2, y: pageHeight - prim.y2 },
            color: strokeCol,
            thickness: sw
          });
        }
      } else if (prim.type === 'poly' && prim.points && prim.points.length >= 2) {
        const ops = [pushGraphicsState(), setLineJoin(LineJoinStyle.Round)];
        if (fillCol) ops.push(setFillingColor(fillCol));
        if (strokeCol) {
          ops.push(setStrokingColor(strokeCol), setLineWidth(sw));
        }
        const [fx, fy] = prim.points[0];
        ops.push(moveTo(fx, pageHeight - fy));
        for (let i = 1; i < prim.points.length; i++) {
          const [px, py] = prim.points[i];
          ops.push(lineTo(px, pageHeight - py));
        }
        if (prim.closed) {
          ops.push(closePath());
        }
        if (fillCol && strokeCol) {
          ops.push(fillAndStroke());
        } else if (fillCol) {
          ops.push(fill());
        } else if (strokeCol) {
          ops.push(stroke());
        }
        ops.push(popGraphicsState());
        page.pushOperators(...ops);
      }
    }
  }

  async function rasterizeSvgAtHighDpi(svgSrc, targetPixelWidth = 1938, targetPixelHeight = 1254) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      if (!svgSrc.startsWith('data:')) {
        img.crossOrigin = 'anonymous';
      }
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = targetPixelWidth;
        canvas.height = targetPixelHeight;
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, targetPixelWidth, targetPixelHeight);
        ctx.drawImage(img, 0, 0, targetPixelWidth, targetPixelHeight);
        canvas.toBlob(
          async (blob) => {
            if (!blob) return reject(new Error('Failed to encode logo PNG'));
            resolve(await blob.arrayBuffer());
          },
          'image/png'
        );
      };
      img.onerror = reject;
      img.src = svgSrc;
    });
  }

  async function cropPhotoToJpegBytes(photoBlock) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      if (!photoBlock.dataUrl.startsWith('data:')) {
        img.crossOrigin = 'anonymous';
      }
      img.onload = () => {
        const { crop } = photoBlock;
        const maxDim = 2200;
        let outW = Math.round(crop.width);
        let outH = Math.round(crop.height);
        if (Math.max(outW, outH) > maxDim) {
          const scale = maxDim / Math.max(outW, outH);
          outW = Math.max(1, Math.round(outW * scale));
          outH = Math.max(1, Math.round(outH * scale));
        }

        const canvas = document.createElement('canvas');
        canvas.width = outW;
        canvas.height = outH;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, outW, outH);
        ctx.drawImage(img, crop.x, crop.y, crop.width, crop.height, 0, 0, outW, outH);
        canvas.toBlob(
          async (blob) => {
            if (!blob) return reject(new Error('Failed to crop photo'));
            resolve(await blob.arrayBuffer());
          },
          'image/jpeg',
          0.92
        );
      };
      img.onerror = reject;
      img.src = photoBlock.dataUrl;
    });
  }

  let cachedLogoPngBytes = null;
  const cachedUrlBytes = new Map();

  async function loadAssetBytes(relPath) {
    if (cachedUrlBytes.has(relPath)) return cachedUrlBytes.get(relPath);
    const offlineDataUrl = window.PAARA_OFFLINE?.dataUrls?.[relPath];
    if (offlineDataUrl && (window.location?.protocol === 'file:' || !window.fetch)) {
      const bytes = dataUrlToUint8Array(offlineDataUrl);
      cachedUrlBytes.set(relPath, bytes);
      return bytes;
    }
    try {
      const res = await fetch(relPath);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const buf = await res.arrayBuffer();
      cachedUrlBytes.set(relPath, buf);
      return buf;
    } catch (err) {
      if (offlineDataUrl) {
        const bytes = dataUrlToUint8Array(offlineDataUrl);
        cachedUrlBytes.set(relPath, bytes);
        return bytes;
      }
      throw err;
    }
  }

  async function generateProclamationPdfBytes(layout, fontBuffers) {
    const { PDFDocument } = window.PDFLib;
    const pdfDoc = await PDFDocument.create();
    pdfDoc.registerFontkit(window.fontkit);

    const honoreeTitle = layout.bestowal?.honoree?.text || 'PAARA Life Member';
    pdfDoc.setTitle(`PAARA Lifetime Membership Proclamation — ${honoreeTitle}`);
    pdfDoc.setAuthor('Palo Alto Amateur Radio Association (W6OTX)');
    pdfDoc.setCreator('PAARA Proclamation Generator');

    const pdfFonts = {
      regular: await pdfDoc.embedFont(fontBuffers.regular, { subset: true }),
      bold: await pdfDoc.embedFont(fontBuffers.bold, { subset: true }),
      italic: await pdfDoc.embedFont(fontBuffers.italic, { subset: true }),
      boldItalic: await pdfDoc.embedFont(fontBuffers.boldItalic, { subset: true }),
      displayBold: await pdfDoc.embedFont(fontBuffers.displayBold, { subset: true })
    };

    const W = layout.page.width;
    const H = layout.page.height;
    const page = pdfDoc.addPage([W, H]);

    // 1. Border
    if (layout.border.rasterUrl) {
      const borderJpgBytes = await loadAssetBytes(layout.border.rasterUrl);
      const borderImage = await pdfDoc.embedJpg(borderJpgBytes);
      page.drawImage(borderImage, { x: 0, y: 0, width: W, height: H });
    } else {
      drawVectorPrimitivesOnPdfPage(page, layout.border.primitives, H);
    }

    // 2. Club Logo (use data: URI from offline bundle when available so canvas never taints on file://)
    if (!cachedLogoPngBytes) {
      const svgSrc =
        window.PAARA_OFFLINE?.dataUrls?.['assets/logos/paara-logo.svg'] ||
        'assets/logos/paara-logo.svg';
      try {
        cachedLogoPngBytes = await rasterizeSvgAtHighDpi(svgSrc, 1938, 1254);
      } catch {
        cachedLogoPngBytes = await loadAssetBytes('assets/logos/paara-logo-transparent.png');
      }
    }
    const logoImg = await pdfDoc.embedPng(cachedLogoPngBytes);
    page.drawImage(logoImg, {
      x: layout.logoBox.x,
      y: H - layout.logoBox.y - layout.logoBox.height,
      width: layout.logoBox.width,
      height: layout.logoBox.height
    });

    const textCol = hexToPdfRgb(layout.border.textColor || '#111111');
    const honoreeCol = hexToPdfRgb(layout.border.honoreeColor || '#0A0A0A');
    const accentCol = hexToPdfRgb(layout.border.accentColor || '#823E42');
    const secondaryCol = hexToPdfRgb(layout.border.secondaryAccent || '#B68B3A');

    // 3. Optional Header
    if (layout.headerBlock) {
      const hb = layout.headerBlock;
      page.drawText(hb.text, {
        x: hb.x,
        y: H - hb.baselineY,
        size: hb.fontSize,
        font: pdfFonts[hb.fontKey] || pdfFonts.bold,
        color: textCol
      });
    }

    // 4. Citation Lines
    for (const line of layout.citationLines) {
      const py = H - line.baselineY;
      for (const word of line.words) {
        page.drawText(word.text, {
          x: word.x,
          y: py,
          size: line.fontSize,
          font: pdfFonts[word.fontKey] || pdfFonts.bold,
          color: textCol
        });
      }
    }

    // 5. Bestowal Block
    for (const pre of layout.bestowal.preambles) {
      page.drawText(pre.text, {
        x: pre.x,
        y: H - pre.baselineY,
        size: pre.fontSize,
        font: pdfFonts.bold,
        color: textCol
      });
    }

    if (layout.bestowal.dividerOrnament) {
      const d = layout.bestowal.dividerOrnament;
      const py = H - d.y;
      if (d.style === 'gold-diamond') {
        page.drawLine({
          start: { x: d.centerX - d.halfSpan, y: py },
          end: { x: d.centerX - 10, y: py },
          color: secondaryCol,
          thickness: 0.9
        });
        page.drawLine({
          start: { x: d.centerX + 10, y: py },
          end: { x: d.centerX + d.halfSpan, y: py },
          color: secondaryCol,
          thickness: 0.9
        });
        drawVectorPrimitivesOnPdfPage(
          page,
          [
            {
              type: 'poly',
              points: [
                [d.centerX, d.y - 4],
                [d.centerX + 5.5, d.y],
                [d.centerX, d.y + 4],
                [d.centerX - 5.5, d.y]
              ],
              closed: true,
              fill: layout.border.secondaryAccent || '#B68B3A'
            }
          ],
          H
        );
      } else if (d.style === 'paara-lightning') {
        page.drawLine({
          start: { x: d.centerX - d.halfSpan, y: py },
          end: { x: d.centerX - 14, y: py },
          color: accentCol,
          thickness: 1.2
        });
        page.drawLine({
          start: { x: d.centerX + 14, y: py },
          end: { x: d.centerX + d.halfSpan, y: py },
          color: accentCol,
          thickness: 1.2
        });
        drawVectorPrimitivesOnPdfPage(
          page,
          [
            {
              type: 'poly',
              points: [
                [d.centerX - 10, d.y + 3.8],
                [d.centerX + 1.5, d.y - 4.2],
                [d.centerX - 0.6, d.y - 0.5],
                [d.centerX + 10, d.y - 3.8],
                [d.centerX - 1.5, d.y + 4.2],
                [d.centerX + 0.6, d.y + 0.5]
              ],
              closed: true,
              fill: '#D22329'
            }
          ],
          H
        );
      }
    }

    const hon = layout.bestowal.honoree;
    page.drawText(hon.text, {
      x: hon.x,
      y: H - hon.baselineY,
      size: hon.fontSize,
      font: pdfFonts.bold,
      color: honoreeCol
    });

    if (layout.bestowal.award) {
      const aw = layout.bestowal.award;
      page.drawText(aw.text, {
        x: aw.x,
        y: H - aw.baselineY,
        size: aw.fontSize,
        font: pdfFonts.bold,
        color: textCol
      });
    }

    if (layout.bestowal.date) {
      const dt = layout.bestowal.date;
      page.drawText(dt.text, {
        x: dt.x,
        y: H - dt.baselineY,
        size: dt.fontSize,
        font: pdfFonts.bold,
        color: textCol
      });
    }

    // 6. Signatories
    if (layout.signatoriesBlock) {
      const sb = layout.signatoriesBlock;
      page.drawText(sb.heading.text, {
        x: sb.heading.x,
        y: H - sb.heading.baselineY,
        size: sb.heading.fontSize,
        font: pdfFonts.bold,
        color: textCol
      });
      for (const row of sb.rows) {
        const ry = H - row.baselineY;
        if (row.left) {
          page.drawText(row.left.text, {
            x: row.left.x,
            y: ry,
            size: row.fontSize,
            font: pdfFonts.boldItalic,
            color: textCol
          });
        }
        if (row.right) {
          page.drawText(row.right.text, {
            x: row.right.x,
            y: ry,
            size: row.fontSize,
            font: pdfFonts.boldItalic,
            color: textCol
          });
        }
      }
    }

    // 7. Framed / Cropped Honoree Photo
    if (layout.photoBlock) {
      const pb = layout.photoBlock;
      const croppedBytes = await cropPhotoToJpegBytes(pb);
      const pdfPhoto = await pdfDoc.embedJpg(croppedBytes);
      const pdfY = H - pb.y - pb.height;

      if (pb.frame) {
        const pad = 3.5;
        page.drawRectangle({
          x: pb.x - pad,
          y: pdfY - pad,
          width: pb.width + pad * 2,
          height: pb.height + pad * 2,
          color: hexToPdfRgb('#FFFFFF'),
          borderColor: accentCol,
          borderWidth: 1.1
        });
      }

      page.drawImage(pdfPhoto, {
        x: pb.x,
        y: pdfY,
        width: pb.width,
        height: pb.height
      });
    }

    return await pdfDoc.save();
  }

  window.PAARA = window.PAARA || {};
  Object.assign(window.PAARA, { generateProclamationPdfBytes });
})();

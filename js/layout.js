/**
 * Deterministic Proclamation Layout & Auto-Fit Engine
 * Works both over HTTP(S) and direct file:// opening (classic script).
 */
(function () {
  'use strict';

  const PAGE_SIZES = {
    legal: {
      id: 'legal',
      label: 'US Legal (8.5" × 14")',
      shortLabel: '8.5" × 14" Legal',
      width: 612,
      height: 1008
    },
    tabloid: {
      id: 'tabloid',
      label: 'Tabloid / Ledger (11" × 17")',
      shortLabel: '11" × 17" Tabloid',
      width: 792,
      height: 1224
    },
    letter: {
      id: 'letter',
      label: 'US Letter (8.5" × 11")',
      shortLabel: '8.5" × 11" Letter',
      width: 612,
      height: 792
    }
  };

  const ASPECT_PRESETS = {
    original: null,
    '4:3': 4 / 3,
    '16:10': 16 / 10,
    '1:1': 1,
    '4:5': 4 / 5
  };

  const LOGO_ASPECT = 969 / 627;

  function measureTextWidth(text, fontKey, fontSize, fontMetrics) {
    if (!text) return 0;
    const fk = fontMetrics && fontMetrics[fontKey];
    if (fk) {
      try {
        const run = fk.layout(text);
        return (run.advanceWidth / fk.unitsPerEm) * fontSize;
      } catch {
        // Fallback below
      }
    }
    return text.length * fontSize * 0.52;
  }

  function tokenizeStyledWords(paragraph, baseWeight = 'bold') {
    const words = [];
    const regex = /\*([^*]+)\*|([^*]+)/g;
    let match;
    while ((match = regex.exec(paragraph)) !== null) {
      const isItalic = match[1] !== undefined;
      const raw = isItalic ? match[1] : match[2];
      const fontKey = isItalic
        ? baseWeight === 'bold'
          ? 'boldItalic'
          : 'italic'
        : baseWeight === 'bold'
          ? 'bold'
          : 'regular';

      const parts = raw.split(/\s+/).filter(Boolean);
      for (const part of parts) {
        words.push({ text: part, fontKey });
      }
    }
    return words;
  }

  function layoutParagraphs({
    text,
    x,
    maxWidth,
    fontSize,
    lineHeight,
    align = 'justify',
    baseWeight = 'bold',
    fontMetrics
  }) {
    const rawParagraphs = (text || '')
      .replace(/\r\n/g, '\n')
      .split(/\n+/)
      .map((p) => p.trim())
      .filter(Boolean);

    if (rawParagraphs.length === 0) {
      return { lines: [], height: 0 };
    }

    const spaceFontKey = baseWeight === 'bold' ? 'bold' : 'regular';
    const spaceW = measureTextWidth(' ', spaceFontKey, fontSize, fontMetrics);
    const allLines = [];
    let cursorY = 0;

    rawParagraphs.forEach((para, pIdx) => {
      const tokens = tokenizeStyledWords(para, baseWeight);
      if (tokens.length === 0) return;

      const paraLines = [];
      let current = [];
      let currentWordsWidth = 0;

      for (const tok of tokens) {
        const w = measureTextWidth(tok.text, tok.fontKey, fontSize, fontMetrics);
        const projectedWidth =
          current.length === 0 ? w : currentWordsWidth + current.length * spaceW + w;

        if (current.length > 0 && projectedWidth > maxWidth) {
          paraLines.push({ items: current, wordsWidth: currentWordsWidth });
          current = [{ ...tok, width: w }];
          currentWordsWidth = w;
        } else {
          current.push({ ...tok, width: w });
          currentWordsWidth += w;
        }
      }
      if (current.length > 0) {
        paraLines.push({ items: current, wordsWidth: currentWordsWidth });
      }

      paraLines.forEach((ln, lIdx) => {
        const isLast = lIdx === paraLines.length - 1;
        const count = ln.items.length;
        const naturalWidth = ln.wordsWidth + Math.max(0, count - 1) * spaceW;

        let gap = spaceW;
        let startX = x;

        if (align === 'center') {
          startX = x + (maxWidth - naturalWidth) / 2;
        } else if (align === 'right') {
          startX = x + (maxWidth - naturalWidth);
        } else if (align === 'justify' && !isLast && count > 1) {
          const candidateGap = (maxWidth - ln.wordsWidth) / (count - 1);
          if (candidateGap <= fontSize * 1.65) {
            gap = candidateGap;
          }
        }

        const positionedWords = [];
        let wx = startX;
        for (const item of ln.items) {
          positionedWords.push({
            text: item.text,
            fontKey: item.fontKey,
            x: wx,
            width: item.width
          });
          wx += item.width + gap;
        }

        allLines.push({
          relY: cursorY + fontSize * 0.84,
          fontSize,
          words: positionedWords
        });
        cursorY += lineHeight;
      });

      if (pIdx < rawParagraphs.length - 1) {
        cursorY += lineHeight * 0.42;
      }
    });

    const totalHeight = Math.max(0, cursorY - (lineHeight - fontSize));
    return { lines: allLines, height: totalHeight };
  }

  function formatSignatoryLine(entry) {
    if (!entry) return '';
    return [entry.name, entry.callsign, entry.role]
      .map((s) => (s || '').trim())
      .filter(Boolean)
      .join(', ');
  }

  function fitSingleLineSize(text, fontKey, desiredSize, maxWidth, fontMetrics, minSize = 9) {
    if (!text) return { fontSize: desiredSize, width: 0 };
    const w = measureTextWidth(text, fontKey, desiredSize, fontMetrics);
    if (w <= maxWidth || w === 0) {
      return { fontSize: desiredSize, width: w };
    }
    const scaled = Math.max(minSize, desiredSize * (maxWidth / w) * 0.98);
    return {
      fontSize: scaled,
      width: measureTextWidth(text, fontKey, scaled, fontMetrics)
    };
  }

  function evaluateLayoutPass(state, pageSpec, border, fontMetrics, fitScale = 1.0) {
    const W = pageSpec.width;
    const H = pageSpec.height;
    const widthScale = W / 612;
    const heightRatio = H / 1008;
    const pageScale = widthScale * (heightRatio < 0.85 ? 0.88 : 1.0);

    const safeLeft = border.insets.left;
    const safeRight = W - border.insets.right;
    const safeTop = border.insets.top;
    const safeBottom = H - border.insets.bottom;
    const innerWidth = safeRight - safeLeft;
    const safeHeight = safeBottom - safeTop;
    const centerX = (safeLeft + safeRight) / 2;

    const lineSpacingMult = Number(state.lineSpacing) || 1.38;
    const headingScale = (Number(state.headingScale) || 1.0) * (0.35 + 0.65 * fitScale);

    const logoScaleFactor = 0.78 + 0.22 * Math.min(1.12, fitScale);
    const logoH = 78 * pageScale * logoScaleFactor;
    const logoW = logoH * LOGO_ASPECT;

    const headerText = (state.headerText || '').trim();
    const hasHeader = Boolean(state.showHeader && headerText);
    const desiredHeaderSize = 24.5 * pageScale * headingScale;
    const headerFontKey = state.headerFont === 'cinzel' ? 'displayBold' : 'bold';
    const headerFit = hasHeader
      ? fitSingleLineSize(headerText, headerFontKey, desiredHeaderSize, innerWidth, fontMetrics, 12)
      : { fontSize: 0, width: 0 };

    const baseCitationPt = (Number(state.citationFontSize) || 15.5) * pageScale * fitScale;
    const citationFontSize = Math.max(8.5, Math.min(30, baseCitationPt));
    const citationLineHeight = citationFontSize * lineSpacingMult;
    const citationWeight = state.citationWeight === 'regular' ? 'regular' : 'bold';
    const citationLayout = layoutParagraphs({
      text: state.citation,
      x: safeLeft,
      maxWidth: innerWidth,
      fontSize: citationFontSize,
      lineHeight: citationLineHeight,
      align: state.citationAlign || 'justify',
      baseWeight: citationWeight,
      fontMetrics
    });

    const bSizeBase = Math.max(10, 18.5 * pageScale * headingScale);
    const bestowalLinesRaw = [
      (state.bestowalLine1 || '').trim(),
      (state.bestowalLine2 || '').trim(),
      (state.bestowalLine3 || '').trim()
    ].filter(Boolean);

    const bestowalLines = bestowalLinesRaw.map((txt) => {
      const f = fitSingleLineSize(txt, 'bold', bSizeBase, innerWidth, fontMetrics, 10);
      return { text: txt, fontSize: f.fontSize, width: f.width };
    });

    const honoreeFull = [state.honoreeName, state.honoreeCallsign]
      .map((s) => (s || '').trim())
      .filter(Boolean)
      .join(', ');
    const honoreeFit = fitSingleLineSize(
      honoreeFull || 'Honoree Name, CALL',
      'bold',
      Math.max(15, 31 * pageScale * headingScale),
      innerWidth,
      fontMetrics,
      14
    );

    const awardTitleText = (state.awardTitle || '').trim();
    const awardFit = fitSingleLineSize(
      awardTitleText,
      'bold',
      Math.max(12, 21.5 * pageScale * headingScale),
      innerWidth,
      fontMetrics,
      11
    );

    const dateLineText = (state.dateLine || '').trim();
    const dateFit = fitSingleLineSize(
      dateLineText,
      'bold',
      Math.max(9.5, 14.2 * pageScale * headingScale),
      innerWidth,
      fontMetrics,
      9
    );

    const bestowalLineGap = bSizeBase * 1.35;
    const hasOrnamentalRule = border.dividerStyle && border.dividerStyle !== 'none';
    let bestowalHeight = 0;
    if (bestowalLines.length > 0) {
      bestowalHeight += (bestowalLines.length - 1) * bestowalLineGap + bSizeBase;
    }
    bestowalHeight += (hasOrnamentalRule ? 18 : 13) * pageScale * Math.min(1.1, fitScale);
    bestowalHeight += honoreeFit.fontSize * 1.05;
    if (awardTitleText) {
      bestowalHeight += 10 * pageScale * Math.min(1.1, fitScale) + awardFit.fontSize;
    }
    if (dateLineText) {
      bestowalHeight += 9 * pageScale * Math.min(1.1, fitScale) + dateFit.fontSize;
    }

    const leftEntries = (state.signatoriesLeft || []).map(formatSignatoryLine).filter(Boolean);
    const rightEntries = (state.signatoriesRight || []).map(formatSignatoryLine).filter(Boolean);
    const sigRowCount = Math.max(leftEntries.length, rightEntries.length);
    const hasSignatories = Boolean(state.showSignatories && sigRowCount > 0);

    const sigHeadingSize = 13.5 * pageScale * Math.min(1.08, 0.45 + 0.55 * fitScale);
    let sigEntrySize = 10.6 * pageScale * Math.min(1.08, 0.45 + 0.55 * fitScale);
    const sigInsetX = safeLeft + innerWidth * 0.01;
    const sigUsableW = innerWidth * 0.98;
    const colGap = 16 * pageScale;
    const colWidth = (sigUsableW - colGap) / 2;

    if (hasSignatories) {
      for (const line of [...leftEntries, ...rightEntries]) {
        const w = measureTextWidth(line, 'boldItalic', sigEntrySize, fontMetrics);
        if (w > colWidth && w > 0) {
          sigEntrySize = Math.max(7.2, sigEntrySize * (colWidth / w) * 0.97);
        }
      }
    }
    const sigRowGap = sigEntrySize * 1.68;
    const sigBlockHeight = hasSignatories
      ? sigHeadingSize + 7 * pageScale + (sigRowCount - 1) * sigRowGap + sigEntrySize
      : 0;

    const hasPhoto = Boolean(
      state.photo && state.photo.dataUrl && state.photo.naturalWidth && state.photo.naturalHeight
    );
    let photoW = 0;
    let photoH = 0;
    let photoAspect = 4 / 3;
    if (hasPhoto) {
      const presetAspect = ASPECT_PRESETS[state.photoAspect || 'original'];
      photoAspect = presetAspect || state.photo.naturalWidth / state.photo.naturalHeight;
      const maxPhotoRatio = Math.max(0.12, Math.min(0.48, Number(state.photoMaxHeightRatio) || 0.28));
      const photoFitFactor = fitScale < 1 ? 0.55 + 0.45 * fitScale : Math.min(1.12, 0.8 + 0.2 * fitScale);
      const maxH = safeHeight * maxPhotoRatio * photoFitFactor;
      const maxW = innerWidth * 0.96;

      photoH = maxH;
      photoW = photoH * photoAspect;
      if (photoW > maxW) {
        photoW = maxW;
        photoH = photoW / photoAspect;
      }
    }

    const gScale = pageScale * Math.max(0.55, Math.min(1.25, fitScale));
    const baseGaps = {
      afterLogo: (hasHeader ? 14 : 18) * gScale,
      afterHeader: hasHeader ? 14 * gScale : 0,
      afterCitation: 20 * gScale,
      afterBestowal: (hasSignatories ? 20 : hasPhoto ? 22 : 0) * gScale,
      afterSignatories: hasSignatories && hasPhoto ? 16 * gScale : 0
    };

    const contentOnlyHeight =
      logoH +
      (hasHeader ? headerFit.fontSize : 0) +
      citationLayout.height +
      bestowalHeight +
      sigBlockHeight +
      photoH;

    const baseGapsTotal =
      baseGaps.afterLogo +
      baseGaps.afterHeader +
      baseGaps.afterCitation +
      baseGaps.afterBestowal +
      baseGaps.afterSignatories;

    const minTotalHeight = contentOnlyHeight + baseGapsTotal;
    const slack = safeHeight - minTotalHeight;
    const overflowPt = Math.max(0, -slack);

    const flexSlots =
      1 +
      (hasHeader ? 0.6 : 0) +
      1.3 +
      (hasSignatories ? 1.1 : 0) +
      (hasPhoto ? 1.1 : 0) +
      (!hasPhoto ? 1.2 : 0.25);

    const extraPerUnit = slack > 0 ? slack / flexSlots : 0;

    let y = safeTop + (!hasPhoto && slack > 0 ? extraPerUnit * 0.35 : 0);

    const logoBox = {
      x: centerX - logoW / 2,
      y,
      width: logoW,
      height: logoH
    };
    y += logoH + baseGaps.afterLogo + extraPerUnit * 0.85;

    let headerBlock = null;
    if (hasHeader) {
      headerBlock = {
        text: headerText,
        fontKey: headerFontKey,
        fontSize: headerFit.fontSize,
        width: headerFit.width,
        x: centerX - headerFit.width / 2,
        baselineY: y + headerFit.fontSize * 0.84
      };
      y += headerFit.fontSize + baseGaps.afterHeader + extraPerUnit * 0.6;
    }

    const citationTopY = y;
    const positionedCitationLines = citationLayout.lines.map((ln) => ({
      ...ln,
      baselineY: citationTopY + ln.relY
    }));
    y += citationLayout.height + baseGaps.afterCitation + extraPerUnit * 1.25;

    const bestowalItems = [];
    for (let i = 0; i < bestowalLines.length; i++) {
      const bl = bestowalLines[i];
      bestowalItems.push({
        kind: 'preamble',
        text: bl.text,
        fontKey: 'bold',
        fontSize: bl.fontSize,
        width: bl.width,
        x: centerX - bl.width / 2,
        baselineY: y + bl.fontSize * 0.84
      });
      y += i < bestowalLines.length - 1 ? bestowalLineGap : bl.fontSize;
    }

    let dividerOrnament = null;
    const preHonoreeGap = (hasOrnamentalRule ? 18 : 13) * pageScale * Math.min(1.1, fitScale);
    if (hasOrnamentalRule) {
      dividerOrnament = {
        style: border.dividerStyle,
        centerX,
        y: y + preHonoreeGap * 0.52,
        halfSpan: Math.min(innerWidth * 0.36, Math.max(95 * pageScale, honoreeFit.width * 0.55))
      };
    }
    y += preHonoreeGap;

    const honoreeItem = {
      text: honoreeFull || 'Honoree Name',
      fontKey: 'bold',
      fontSize: honoreeFit.fontSize,
      width: honoreeFit.width,
      x: centerX - honoreeFit.width / 2,
      baselineY: y + honoreeFit.fontSize * 0.84
    };
    y += honoreeFit.fontSize * 1.05;

    let awardItem = null;
    if (awardTitleText) {
      y += 10 * pageScale * Math.min(1.1, fitScale);
      awardItem = {
        text: awardTitleText,
        fontKey: 'bold',
        fontSize: awardFit.fontSize,
        width: awardFit.width,
        x: centerX - awardFit.width / 2,
        baselineY: y + awardFit.fontSize * 0.84
      };
      y += awardFit.fontSize;
    }

    let dateItem = null;
    if (dateLineText) {
      y += 9 * pageScale * Math.min(1.1, fitScale);
      dateItem = {
        text: dateLineText,
        fontKey: 'bold',
        fontSize: dateFit.fontSize,
        width: dateFit.width,
        x: centerX - dateFit.width / 2,
        baselineY: y + dateFit.fontSize * 0.84
      };
      y += dateFit.fontSize;
    }

    let signatoriesBlock = null;
    if (hasSignatories) {
      y += baseGaps.afterBestowal + extraPerUnit * 1.05;
      const headingText = (state.signatoriesHeading || 'Signed by:').trim();
      const headingWidth = measureTextWidth(headingText, 'bold', sigHeadingSize, fontMetrics);
      const headingBaselineY = y + sigHeadingSize * 0.84;
      y += sigHeadingSize + 7 * pageScale;

      const leftColX = sigInsetX + 12 * pageScale;
      const rightColX = sigInsetX + colWidth + colGap + 6 * pageScale;
      const rows = [];
      for (let r = 0; r < sigRowCount; r++) {
        const rowBaselineY = y + r * sigRowGap + sigEntrySize * 0.84;
        const leftText = leftEntries[r] || '';
        const rightText = rightEntries[r] || '';
        rows.push({
          baselineY: rowBaselineY,
          fontSize: sigEntrySize,
          left: leftText
            ? {
                text: leftText,
                x: leftColX,
                width: measureTextWidth(leftText, 'boldItalic', sigEntrySize, fontMetrics)
              }
            : null,
          right: rightText
            ? {
                text: rightText,
                x: rightColX,
                width: measureTextWidth(rightText, 'boldItalic', sigEntrySize, fontMetrics)
              }
            : null
        });
      }
      signatoriesBlock = {
        heading: {
          text: headingText,
          fontKey: 'bold',
          fontSize: sigHeadingSize,
          width: headingWidth,
          x: sigInsetX,
          baselineY: headingBaselineY
        },
        rows
      };
      y += (sigRowCount - 1) * sigRowGap + sigEntrySize;
    }

    let photoBlock = null;
    if (hasPhoto) {
      y += (hasSignatories ? baseGaps.afterSignatories : baseGaps.afterBestowal) + extraPerUnit * 1.05;
      const srcW = state.photo.naturalWidth;
      const srcH = state.photo.naturalHeight;
      const srcAspect = srcW / srcH;
      const zoom = Math.max(1, Math.min(3, Number(state.photoZoom) || 1));
      const panX = Math.max(-1, Math.min(1, (Number(state.photoPanX) || 0) / 100));
      const panY = Math.max(-1, Math.min(1, (Number(state.photoPanY) || 0) / 100));

      let baseCropW = srcW;
      let baseCropH = srcH;
      if (photoAspect > srcAspect) {
        baseCropH = srcW / photoAspect;
      } else {
        baseCropW = srcH * photoAspect;
      }
      const cropW = baseCropW / zoom;
      const cropH = baseCropH / zoom;
      const maxShiftX = (srcW - cropW) / 2;
      const maxShiftY = (srcH - cropH) / 2;
      const cropX = (srcW - cropW) / 2 - panX * maxShiftX;
      const cropY = (srcH - cropH) / 2 - panY * maxShiftY;

      photoBlock = {
        x: centerX - photoW / 2,
        y,
        width: photoW,
        height: photoH,
        aspect: photoAspect,
        frame: Boolean(state.photoFrame),
        crop: { x: cropX, y: cropY, width: cropW, height: cropH },
        naturalWidth: srcW,
        naturalHeight: srcH,
        dataUrl: state.photo.dataUrl
      };
      y += photoH;
    }

    return {
      page: pageSpec,
      border,
      safeRect: { x: safeLeft, y: safeTop, width: innerWidth, height: safeHeight },
      logoBox,
      headerBlock,
      citationLines: positionedCitationLines,
      effectiveCitationPt: Number((citationFontSize / pageScale).toFixed(1)),
      renderedCitationPt: Number(citationFontSize.toFixed(1)),
      bestowal: {
        preambles: bestowalItems,
        dividerOrnament,
        honoree: honoreeItem,
        award: awardItem,
        date: dateItem
      },
      signatoriesBlock,
      photoBlock,
      usedHeight: minTotalHeight,
      safeHeight,
      overflowPt: Number(overflowPt.toFixed(1)),
      fitScale
    };
  }

  function computeProclamationLayout(state, fontMetrics) {
    const pageSpec = PAGE_SIZES[state.pageSize] || PAGE_SIZES.legal;
    const border = window.PAARA.buildThemeBorder(state.theme, pageSpec.width, pageSpec.height);

    if (!state.autoFit) {
      return evaluateLayoutPass(state, pageSpec, border, fontMetrics, 1.0);
    }

    const targetRatio = state.photo && state.photo.dataUrl ? 0.94 : 0.86;
    let lo = 0.56;
    let hi = 1.36;
    let best = null;

    for (let iter = 0; iter < 14; iter++) {
      const mid = (lo + hi) / 2;
      const candidate = evaluateLayoutPass(state, pageSpec, border, fontMetrics, mid);
      const targetH = candidate.safeHeight * targetRatio;

      if (candidate.overflowPt <= 0) {
        best = candidate;
        if (candidate.usedHeight < targetH) {
          lo = mid;
        } else {
          hi = mid;
        }
      } else {
        hi = mid;
      }
    }

    return best || evaluateLayoutPass(state, pageSpec, border, fontMetrics, lo);
  }

  window.PAARA = window.PAARA || {};
  Object.assign(window.PAARA, {
    PAGE_SIZES,
    ASPECT_PRESETS,
    measureTextWidth,
    formatSignatoryLine,
    computeProclamationLayout
  });
})();

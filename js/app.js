/**
 * Main Application Controller — PAARA Life Membership Proclamation Generator
 * Supports both HTTP(S) hosting (GitHub Pages / paara.org) AND direct file:// double-clicking!
 */
(function () {
  'use strict';

  const { THEMES, PAGE_SIZES, computeProclamationLayout, generateProclamationPdfBytes } =
    window.PAARA;

  const STORAGE_KEY = 'paara_proclamation_draft_v2';
  const SVG_NS = 'http://www.w3.org/2000/svg';
  const IS_FILE_PROTOCOL = window.location.protocol === 'file:';

  const FONT_PATHS = {
    regular: 'assets/fonts/Gelasio-Regular.ttf',
    bold: 'assets/fonts/Gelasio-Bold.ttf',
    italic: 'assets/fonts/Gelasio-Italic.ttf',
    boldItalic: 'assets/fonts/Gelasio-BoldItalic.ttf',
    displayBold: 'assets/fonts/Cinzel-Bold.ttf'
  };

  let fontBuffers = {};
  let fontMetrics = {};
  let signatoriesData = { defaultRosterId: '2026', rosters: [] };
  let examplesData = [];
  let currentLayout = null;
  let activeViewTab = 'live';
  let currentPdfBlobUrl = null;
  let saveTimer = null;

  const state = {
    pageSize: 'legal',
    theme: 'guilloche-classic',
    headerFont: 'serif',
    showHeader: false,
    headerText: 'OFFICIAL PROCLAMATION',
    citation: '',
    citationAlign: 'left',
    citationWeight: 'bold',
    bestowalLine1: 'The Officers and Directors of the',
    bestowalLine2: 'Palo Alto Amateur Radio Association',
    bestowalLine3: 'do hereby award and bestow upon',
    honoreeName: 'Doug Teter',
    honoreeCallsign: 'KG6LWE',
    awardTitle: 'a Lifetime Membership',
    dateLine: 'on this date of 9 January, 2026',
    autoFit: true,
    citationFontSize: 15.5,
    headingScale: 1.0,
    lineSpacing: 1.38,
    showSignatories: true,
    rosterId: '2026',
    signatoriesHeading: 'Signed by:',
    signatoriesLeft: [],
    signatoriesRight: [],
    photo: null,
    photoMaxHeightRatio: 0.28,
    photoAspect: 'original',
    photoZoom: 1.0,
    photoPanX: 0,
    photoPanY: 0,
    photoFrame: false
  };

  const els = {
    proclamationForm: document.getElementById('proclamationForm'),
    brandLogoImg: document.getElementById('brandLogoImg'),
    autosaveStatus: document.getElementById('autosaveStatus'),
    exampleSelect: document.getElementById('exampleSelect'),
    openDraftBtn: document.getElementById('openDraftBtn'),
    openDraftInput: document.getElementById('openDraftInput'),
    saveDraftBtn: document.getElementById('saveDraftBtn'),
    exportPdfBtn: document.getElementById('exportPdfBtn'),
    themeGrid: document.getElementById('themeGrid'),
    pageSizeSelect: document.getElementById('pageSizeSelect'),
    headerFontSelect: document.getElementById('headerFontSelect'),
    honoreeNameInput: document.getElementById('honoreeNameInput'),
    honoreeCallInput: document.getElementById('honoreeCallInput'),
    showHeaderCheck: document.getElementById('showHeaderCheck'),
    headerTextInput: document.getElementById('headerTextInput'),
    citationInput: document.getElementById('citationInput'),
    citationWeightSelect: document.getElementById('citationWeightSelect'),
    awardTitleInput: document.getElementById('awardTitleInput'),
    dateLineInput: document.getElementById('dateLineInput'),
    bestowal1Input: document.getElementById('bestowal1Input'),
    bestowal2Input: document.getElementById('bestowal2Input'),
    bestowal3Input: document.getElementById('bestowal3Input'),
    autoFitCheck: document.getElementById('autoFitCheck'),
    fitBanner: document.getElementById('fitBanner'),
    fitBannerText: document.getElementById('fitBannerText'),
    applyAutoFitBtn: document.getElementById('applyAutoFitBtn'),
    citationSizeGroup: document.getElementById('citationSizeGroup'),
    citationSizeRange: document.getElementById('citationSizeRange'),
    citationSizeVal: document.getElementById('citationSizeVal'),
    headingScaleRange: document.getElementById('headingScaleRange'),
    headingScaleVal: document.getElementById('headingScaleVal'),
    lineSpacingRange: document.getElementById('lineSpacingRange'),
    lineSpacingVal: document.getElementById('lineSpacingVal'),
    photoEmptyState: document.getElementById('photoEmptyState'),
    photoDropzone: document.getElementById('photoDropzone'),
    useSamplePhotoBtn: document.getElementById('useSamplePhotoBtn'),
    photoFileInput: document.getElementById('photoFileInput'),
    photoControlsWrap: document.getElementById('photoControlsWrap'),
    photoThumb: document.getElementById('photoThumb'),
    photoMetaText: document.getElementById('photoMetaText'),
    replacePhotoBtn: document.getElementById('replacePhotoBtn'),
    removePhotoBtn: document.getElementById('removePhotoBtn'),
    photoHeightRange: document.getElementById('photoHeightRange'),
    photoHeightVal: document.getElementById('photoHeightVal'),
    photoAspectSelect: document.getElementById('photoAspectSelect'),
    photoZoomRange: document.getElementById('photoZoomRange'),
    photoZoomVal: document.getElementById('photoZoomVal'),
    photoFrameCheck: document.getElementById('photoFrameCheck'),
    photoPanXRange: document.getElementById('photoPanXRange'),
    photoPanXVal: document.getElementById('photoPanXVal'),
    photoPanYRange: document.getElementById('photoPanYRange'),
    photoPanYVal: document.getElementById('photoPanYVal'),
    showSignatoriesCheck: document.getElementById('showSignatoriesCheck'),
    signatoriesBody: document.getElementById('signatoriesBody'),
    rosterSelect: document.getElementById('rosterSelect'),
    sigHeadingInput: document.getElementById('sigHeadingInput'),
    leftSigList: document.getElementById('leftSigList'),
    rightSigList: document.getElementById('rightSigList'),
    addLeftSigBtn: document.getElementById('addLeftSigBtn'),
    addRightSigBtn: document.getElementById('addRightSigBtn'),
    exportRosterJsonBtn: document.getElementById('exportRosterJsonBtn'),
    editorTablist: document.getElementById('editorTablist'),
    edTabText: document.getElementById('edTabText'),
    edTabTheme: document.getElementById('edTabTheme'),
    edTabPhoto: document.getElementById('edTabPhoto'),
    edTabSigs: document.getElementById('edTabSigs'),
    edPanelText: document.getElementById('edPanelText'),
    edPanelTheme: document.getElementById('edPanelTheme'),
    edPanelPhoto: document.getElementById('edPanelPhoto'),
    edPanelSigs: document.getElementById('edPanelSigs'),
    paneSplitter: document.getElementById('paneSplitter'),
    previewTablist: document.getElementById('previewTablist'),
    tabLiveBtn: document.getElementById('tabLiveBtn'),
    tabPdfBtn: document.getElementById('tabPdfBtn'),
    livePanel: document.getElementById('livePanel'),
    pdfPanel: document.getElementById('pdfPanel'),
    pageSpecBadge: document.getElementById('pageSpecBadge'),
    previewZoomSelect: document.getElementById('previewZoomSelect'),
    liveStage: document.getElementById('liveStage'),
    svgPageWrap: document.getElementById('svgPageWrap'),
    proclamationSvg: document.getElementById('proclamationSvg'),
    pdfPreviewFrame: document.getElementById('pdfPreviewFrame'),
    globalDropOverlay: document.getElementById('globalDropOverlay')
  };

  function resolveAssetUrl(relPath) {
    if (!relPath) return relPath;
    if (IS_FILE_PROTOCOL && window.PAARA_OFFLINE?.dataUrls?.[relPath]) {
      return window.PAARA_OFFLINE.dataUrls[relPath];
    }
    return relPath;
  }

  function base64ToUint8Array(b64) {
    const bin = atob(b64);
    const arr = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) {
      arr[i] = bin.charCodeAt(i);
    }
    return arr;
  }

  /**
   * Inject embedded @font-face data: URIs when opened over file:// so Safari/Firefox
   * don't block cross-directory local font files.
   */
  function injectOfflineFontFacesIfNeeded() {
    if (!IS_FILE_PROTOCOL || !window.PAARA_OFFLINE?.fontsBase64) return;
    const f = window.PAARA_OFFLINE.fontsBase64;
    const style = document.createElement('style');
    style.textContent = `
      @font-face { font-family: 'GelasioLocal'; src: url('data:font/ttf;base64,${f.regular}') format('truetype'); font-weight: 400; font-style: normal; }
      @font-face { font-family: 'GelasioLocal'; src: url('data:font/ttf;base64,${f.bold}') format('truetype'); font-weight: 700; font-style: normal; }
      @font-face { font-family: 'GelasioLocal'; src: url('data:font/ttf;base64,${f.italic}') format('truetype'); font-weight: 400; font-style: italic; }
      @font-face { font-family: 'GelasioLocal'; src: url('data:font/ttf;base64,${f.boldItalic}') format('truetype'); font-weight: 700; font-style: italic; }
      @font-face { font-family: 'CinzelLocal'; src: url('data:font/ttf;base64,${f.displayBold}') format('truetype'); font-weight: 700; font-style: normal; }
    `;
    document.head.appendChild(style);
  }

  function svgEl(tag, attrs = {}) {
    const node = document.createElementNS(SVG_NS, tag);
    for (const [k, v] of Object.entries(attrs)) {
      if (v !== undefined && v !== null) {
        node.setAttribute(k, String(v));
      }
    }
    return node;
  }

  function fontCssAttrs(fontKey) {
    switch (fontKey) {
      case 'displayBold':
        return {
          'font-family': 'CinzelLocal, Georgia, serif',
          'font-weight': '700',
          'font-style': 'normal'
        };
      case 'boldItalic':
        return {
          'font-family': 'GelasioLocal, Georgia, serif',
          'font-weight': '700',
          'font-style': 'italic'
        };
      case 'italic':
        return {
          'font-family': 'GelasioLocal, Georgia, serif',
          'font-weight': '400',
          'font-style': 'italic'
        };
      case 'regular':
        return {
          'font-family': 'GelasioLocal, Georgia, serif',
          'font-weight': '400',
          'font-style': 'normal'
        };
      case 'bold':
      default:
        return {
          'font-family': 'GelasioLocal, Georgia, serif',
          'font-weight': '700',
          'font-style': 'normal'
        };
    }
  }

  function renderSvgPreview(layout) {
    const svg = els.proclamationSvg;
    const W = layout.page.width;
    const H = layout.page.height;
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    svg.replaceChildren();

    const titleNode = svgEl('title');
    titleNode.textContent = `Proclamation preview for ${layout.bestowal?.honoree?.text || 'PAARA Honoree'}`;
    svg.appendChild(titleNode);

    const defs = svgEl('defs');
    svg.appendChild(defs);

    if (layout.border.rasterUrl) {
      svg.appendChild(
        svgEl('image', {
          href: resolveAssetUrl(layout.border.rasterUrl),
          x: 0,
          y: 0,
          width: W,
          height: H,
          preserveAspectRatio: 'none'
        })
      );
    } else {
      for (const prim of layout.border.primitives) {
        if (prim.type === 'rect') {
          svg.appendChild(
            svgEl('rect', {
              x: prim.x,
              y: prim.y,
              width: prim.w,
              height: prim.h,
              fill: prim.fill || 'none',
              stroke: prim.stroke || 'none',
              'stroke-width': prim.stroke ? prim.strokeWidth || 1 : 0
            })
          );
        } else if (prim.type === 'circle') {
          svg.appendChild(
            svgEl('circle', {
              cx: prim.cx,
              cy: prim.cy,
              r: prim.r,
              fill: prim.fill || 'none',
              stroke: prim.stroke || 'none',
              'stroke-width': prim.stroke ? prim.strokeWidth || 1 : 0
            })
          );
        } else if (prim.type === 'line') {
          svg.appendChild(
            svgEl('line', {
              x1: prim.x1,
              y1: prim.y1,
              x2: prim.x2,
              y2: prim.y2,
              stroke: prim.stroke || '#000',
              'stroke-width': prim.strokeWidth || 1
            })
          );
        } else if (prim.type === 'poly' && prim.points?.length) {
          const ptsAttr = prim.points.map(([px, py]) => `${px.toFixed(2)},${py.toFixed(2)}`).join(' ');
          svg.appendChild(
            svgEl(prim.closed ? 'polygon' : 'polyline', {
              points: ptsAttr,
              fill: prim.closed ? prim.fill || 'none' : 'none',
              stroke: prim.stroke || 'none',
              'stroke-width': prim.stroke ? prim.strokeWidth || 1 : 0,
              'stroke-linejoin': 'round',
              'stroke-linecap': 'round'
            })
          );
        }
      }
    }

    svg.appendChild(
      svgEl('image', {
        href: resolveAssetUrl('assets/logos/paara-logo.svg'),
        x: layout.logoBox.x,
        y: layout.logoBox.y,
        width: layout.logoBox.width,
        height: layout.logoBox.height,
        preserveAspectRatio: 'xMidYMid meet'
      })
    );

    const textColor = layout.border.textColor || '#111111';
    const honoreeColor = layout.border.honoreeColor || '#0A0A0A';
    const accentColor = layout.border.accentColor || '#823E42';
    const secondaryColor = layout.border.secondaryAccent || '#B68B3A';

    if (layout.headerBlock) {
      const hb = layout.headerBlock;
      const t = svgEl('text', {
        x: hb.x,
        y: hb.baselineY,
        fill: textColor,
        'font-size': hb.fontSize,
        ...fontCssAttrs(hb.fontKey)
      });
      t.textContent = hb.text;
      svg.appendChild(t);
    }

    const citGroup = svgEl('g');
    for (const line of layout.citationLines) {
      for (const word of line.words) {
        const tw = svgEl('text', {
          x: word.x,
          y: line.baselineY,
          fill: textColor,
          'font-size': line.fontSize,
          ...fontCssAttrs(word.fontKey)
        });
        tw.textContent = word.text;
        citGroup.appendChild(tw);
      }
    }
    svg.appendChild(citGroup);

    for (const pre of layout.bestowal.preambles) {
      const t = svgEl('text', {
        x: pre.x,
        y: pre.baselineY,
        fill: textColor,
        'font-size': pre.fontSize,
        ...fontCssAttrs('bold')
      });
      t.textContent = pre.text;
      svg.appendChild(t);
    }

    if (layout.bestowal.dividerOrnament) {
      const d = layout.bestowal.dividerOrnament;
      if (d.style === 'gold-diamond') {
        svg.appendChild(
          svgEl('line', {
            x1: d.centerX - d.halfSpan,
            y1: d.y,
            x2: d.centerX - 10,
            y2: d.y,
            stroke: secondaryColor,
            'stroke-width': 0.9
          })
        );
        svg.appendChild(
          svgEl('line', {
            x1: d.centerX + 10,
            y1: d.y,
            x2: d.centerX + d.halfSpan,
            y2: d.y,
            stroke: secondaryColor,
            'stroke-width': 0.9
          })
        );
        svg.appendChild(
          svgEl('polygon', {
            points: `${d.centerX},${d.y - 4} ${d.centerX + 5.5},${d.y} ${d.centerX},${d.y + 4} ${d.centerX - 5.5},${d.y}`,
            fill: secondaryColor
          })
        );
      } else if (d.style === 'paara-lightning') {
        svg.appendChild(
          svgEl('line', {
            x1: d.centerX - d.halfSpan,
            y1: d.y,
            x2: d.centerX - 14,
            y2: d.y,
            stroke: accentColor,
            'stroke-width': 1.2
          })
        );
        svg.appendChild(
          svgEl('line', {
            x1: d.centerX + 14,
            y1: d.y,
            x2: d.centerX + d.halfSpan,
            y2: d.y,
            stroke: accentColor,
            'stroke-width': 1.2
          })
        );
        svg.appendChild(
          svgEl('polygon', {
            points: `${d.centerX - 10},${d.y + 3.8} ${d.centerX + 1.5},${d.y - 4.2} ${d.centerX - 0.6},${d.y - 0.5} ${d.centerX + 10},${d.y - 3.8} ${d.centerX - 1.5},${d.y + 4.2} ${d.centerX + 0.6},${d.y + 0.5}`,
            fill: '#D22329'
          })
        );
      }
    }

    const hon = layout.bestowal.honoree;
    const honEl = svgEl('text', {
      x: hon.x,
      y: hon.baselineY,
      fill: honoreeColor,
      'font-size': hon.fontSize,
      ...fontCssAttrs('bold')
    });
    honEl.textContent = hon.text;
    svg.appendChild(honEl);

    if (layout.bestowal.award) {
      const aw = layout.bestowal.award;
      const awEl = svgEl('text', {
        x: aw.x,
        y: aw.baselineY,
        fill: textColor,
        'font-size': aw.fontSize,
        ...fontCssAttrs('bold')
      });
      awEl.textContent = aw.text;
      svg.appendChild(awEl);
    }

    if (layout.bestowal.date) {
      const dt = layout.bestowal.date;
      const dtEl = svgEl('text', {
        x: dt.x,
        y: dt.baselineY,
        fill: textColor,
        'font-size': dt.fontSize,
        ...fontCssAttrs('bold')
      });
      dtEl.textContent = dt.text;
      svg.appendChild(dtEl);
    }

    if (layout.signatoriesBlock) {
      const sb = layout.signatoriesBlock;
      const sh = svgEl('text', {
        x: sb.heading.x,
        y: sb.heading.baselineY,
        fill: textColor,
        'font-size': sb.heading.fontSize,
        ...fontCssAttrs('bold')
      });
      sh.textContent = sb.heading.text;
      svg.appendChild(sh);

      for (const row of sb.rows) {
        if (row.left) {
          const lt = svgEl('text', {
            x: row.left.x,
            y: row.baselineY,
            fill: textColor,
            'font-size': row.fontSize,
            ...fontCssAttrs('boldItalic')
          });
          lt.textContent = row.left.text;
          svg.appendChild(lt);
        }
        if (row.right) {
          const rt = svgEl('text', {
            x: row.right.x,
            y: row.baselineY,
            fill: textColor,
            'font-size': row.fontSize,
            ...fontCssAttrs('boldItalic')
          });
          rt.textContent = row.right.text;
          svg.appendChild(rt);
        }
      }
    }

    if (layout.photoBlock) {
      const pb = layout.photoBlock;
      if (pb.frame) {
        const pad = 3.5;
        svg.appendChild(
          svgEl('rect', {
            x: pb.x - pad,
            y: pb.y - pad,
            width: pb.width + pad * 2,
            height: pb.height + pad * 2,
            fill: '#FFFFFF',
            stroke: accentColor,
            'stroke-width': 1.1
          })
        );
      }

      const clipId = 'honoreePhotoClip';
      const clipPath = svgEl('clipPath', { id: clipId });
      clipPath.appendChild(svgEl('rect', { x: pb.x, y: pb.y, width: pb.width, height: pb.height }));
      defs.appendChild(clipPath);

      const scaleX = pb.width / pb.crop.width;
      const scaleY = pb.height / pb.crop.height;
      const imgDrawW = pb.naturalWidth * scaleX;
      const imgDrawH = pb.naturalHeight * scaleY;
      const imgDrawX = pb.x - pb.crop.x * scaleX;
      const imgDrawY = pb.y - pb.crop.y * scaleY;

      const photoGroup = svgEl('g', { 'clip-path': `url(#${clipId})` });
      photoGroup.appendChild(
        svgEl('image', {
          href: pb.dataUrl,
          x: imgDrawX,
          y: imgDrawY,
          width: imgDrawW,
          height: imgDrawH,
          preserveAspectRatio: 'none'
        })
      );
      svg.appendChild(photoGroup);

      const hitRect = svgEl('rect', {
        x: pb.x,
        y: pb.y,
        width: pb.width,
        height: pb.height,
        fill: 'transparent',
        class: 'svg-photo-hit'
      });
      attachSvgPhotoPanHandler(hitRect);
      svg.appendChild(hitRect);
    }

    if (layout.overflowPt > 1) {
      const safeBottomY = layout.safeRect.y + layout.safeRect.height;
      svg.appendChild(
        svgEl('line', {
          x1: layout.safeRect.x - 10,
          y1: safeBottomY,
          x2: layout.safeRect.x + layout.safeRect.width + 10,
          y2: safeBottomY,
          stroke: '#dc2626',
          'stroke-width': 1.5,
          'stroke-dasharray': '5,4'
        })
      );
    }

    updatePreviewZoomSizing(layout.page);
  }

  function updatePreviewZoomSizing(pageSpec) {
    const mode = els.previewZoomSelect.value;
    const stageRect = els.liveStage.getBoundingClientRect();
    const availW = Math.max(260, stageRect.width - 48);
    const availH = Math.max(320, stageRect.height - 48);
    const aspect = pageSpec.width / pageSpec.height;

    let displayW;
    let displayH;
    if (mode === 'fit') {
      displayH = availH;
      displayW = displayH * aspect;
      if (displayW > availW) {
        displayW = availW;
        displayH = displayW / aspect;
      }
    } else if (mode === 'fit-width') {
      displayW = Math.min(availW, 920);
      displayH = displayW / aspect;
    } else {
      const scale = Number(mode) || 1;
      displayW = pageSpec.width * (96 / 72) * scale * 0.78;
      displayH = displayW / aspect;
    }

    els.svgPageWrap.style.width = `${Math.round(displayW)}px`;
    els.svgPageWrap.style.height = `${Math.round(displayH)}px`;
  }

  function attachSvgPhotoPanHandler(hitRect) {
    hitRect.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      hitRect.setPointerCapture(e.pointerId);
      const startX = e.clientX;
      const startY = e.clientY;
      const origPanX = Number(state.photoPanX) || 0;
      const origPanY = Number(state.photoPanY) || 0;

      const onMove = (ev) => {
        const dx = ev.clientX - startX;
        const dy = ev.clientY - startY;
        state.photoPanX = Math.max(-100, Math.min(100, Math.round(origPanX + dx * 0.65)));
        state.photoPanY = Math.max(-100, Math.min(100, Math.round(origPanY + dy * 0.65)));
        els.photoPanXRange.value = state.photoPanX;
        els.photoPanYRange.value = state.photoPanY;
        syncRangeProgress(els.photoPanXRange);
        syncRangeProgress(els.photoPanYRange);
        els.photoPanXVal.textContent = `${state.photoPanX}%`;
        els.photoPanYVal.textContent = `${state.photoPanY}%`;
        renderAll({ skipPdfRefresh: true });
      };

      const onUp = () => {
        hitRect.removeEventListener('pointermove', onMove);
        hitRect.removeEventListener('pointerup', onUp);
        scheduleAutosave();
      };

      hitRect.addEventListener('pointermove', onMove);
      hitRect.addEventListener('pointerup', onUp);
    });
  }

  function syncRangeProgress(slider) {
    if (!slider) return;
    const min = Number(slider.min) || 0;
    const max = Number(slider.max) || 100;
    const val = Number(slider.value) || 0;
    const pct = ((val - min) / (max - min)) * 100;
    slider.style.setProperty('--progress', `${pct.toFixed(1)}%`);
  }

  /**
   * Build accessible native `<input type="radio" name="theme">` cards inside `<fieldset>`.
   */
  function renderThemeCards() {
    els.themeGrid.replaceChildren();
    for (const t of THEMES) {
      const label = document.createElement('label');
      label.className = 'theme-radio-label';
      const radioId = `theme-radio-${t.id}`;
      label.setAttribute('for', radioId);

      const radio = document.createElement('input');
      radio.type = 'radio';
      radio.id = radioId;
      radio.name = 'theme';
      radio.value = t.id;
      radio.className = 'visually-hidden';
      radio.checked = state.theme === t.id;
      radio.addEventListener('change', () => {
        if (radio.checked) {
          state.theme = t.id;
          renderAll();
          scheduleAutosave();
        }
      });

      const swatchesHtml = t.swatch
        .map((c) => `<span class="theme-swatch" style="background:${c}"></span>`)
        .join('');

      const content = document.createElement('div');
      content.style.width = '100%';
      content.innerHTML = `
        <div class="theme-card-top">
          <span class="theme-swatches" aria-hidden="true">${swatchesHtml}</span>
          <span class="theme-badge">${t.badge}</span>
        </div>
        <div class="theme-card-name">${t.name}</div>
        <div class="theme-card-desc">${t.description}</div>
      `;

      label.append(radio, content);
      els.themeGrid.appendChild(label);
    }
  }

  function renderSignatoryColumns() {
    const buildColumn = (container, list, side) => {
      container.replaceChildren();
      list.forEach((item, idx) => {
        const row = document.createElement('div');
        row.className = 'sig-row';
        const displayWho = item.name || `${side} signatory ${idx + 1}`;

        const nameIn = document.createElement('input');
        nameIn.type = 'text';
        nameIn.placeholder = 'Name';
        nameIn.value = item.name || '';
        nameIn.setAttribute('aria-label', `${side} row ${idx + 1} name`);
        nameIn.addEventListener('input', () => {
          item.name = nameIn.value;
          renderAll();
          scheduleAutosave();
        });

        const callIn = document.createElement('input');
        callIn.type = 'text';
        callIn.placeholder = 'Call';
        callIn.value = item.callsign || '';
        callIn.setAttribute('autocorrect', 'off');
        callIn.setAttribute('autocapitalize', 'characters');
        callIn.setAttribute('spellcheck', 'false');
        callIn.setAttribute('aria-label', `${side} row ${idx + 1} callsign`);
        callIn.addEventListener('input', () => {
          item.callsign = callIn.value;
          renderAll();
          scheduleAutosave();
        });

        const roleIn = document.createElement('input');
        roleIn.type = 'text';
        roleIn.placeholder = 'Title / Role';
        roleIn.value = item.role || '';
        roleIn.setAttribute('aria-label', `${side} row ${idx + 1} role`);
        roleIn.addEventListener('input', () => {
          item.role = roleIn.value;
          renderAll();
          scheduleAutosave();
        });

        const actions = document.createElement('div');
        actions.className = 'sig-row-actions';

        const upBtn = document.createElement('button');
        upBtn.type = 'button';
        upBtn.className = 'icon-btn';
        upBtn.setAttribute('aria-label', `Move ${displayWho} up`);
        upBtn.textContent = '↑';
        upBtn.disabled = idx === 0;
        upBtn.addEventListener('click', () => {
          if (idx > 0) {
            [list[idx - 1], list[idx]] = [list[idx], list[idx - 1]];
            renderSignatoryColumns();
            renderAll();
            scheduleAutosave();
          }
        });

        const swapBtn = document.createElement('button');
        swapBtn.type = 'button';
        swapBtn.className = 'icon-btn';
        swapBtn.setAttribute(
          'aria-label',
          side === 'left'
            ? `Move ${displayWho} to right column`
            : `Move ${displayWho} to left column`
        );
        swapBtn.textContent = '⇄';
        swapBtn.addEventListener('click', () => {
          const [moved] = list.splice(idx, 1);
          if (side === 'left') {
            state.signatoriesRight.push(moved);
          } else {
            state.signatoriesLeft.push(moved);
          }
          renderSignatoryColumns();
          renderAll();
          scheduleAutosave();
        });

        const delBtn = document.createElement('button');
        delBtn.type = 'button';
        delBtn.className = 'icon-btn danger';
        delBtn.setAttribute('aria-label', `Remove ${displayWho}`);
        delBtn.textContent = '×';
        delBtn.addEventListener('click', () => {
          list.splice(idx, 1);
          renderSignatoryColumns();
          renderAll();
          scheduleAutosave();
        });

        actions.append(upBtn, swapBtn, delBtn);
        row.append(nameIn, callIn, roleIn, actions);
        container.appendChild(row);
      });
    };

    buildColumn(els.leftSigList, state.signatoriesLeft, 'left');
    buildColumn(els.rightSigList, state.signatoriesRight, 'right');
  }

  function syncFormFromState() {
    renderThemeCards();
    els.pageSizeSelect.value = state.pageSize;
    els.headerFontSelect.value = state.headerFont || 'serif';
    els.honoreeNameInput.value = state.honoreeName || '';
    els.honoreeCallInput.value = state.honoreeCallsign || '';
    els.showHeaderCheck.checked = Boolean(state.showHeader);
    els.headerTextInput.value = state.headerText || 'OFFICIAL PROCLAMATION';
    els.headerTextInput.disabled = !state.showHeader;
    els.citationInput.value = state.citation || '';
    els.citationWeightSelect.value = state.citationWeight || 'bold';
    els.awardTitleInput.value = state.awardTitle || '';
    els.dateLineInput.value = state.dateLine || '';
    els.bestowal1Input.value = state.bestowalLine1 || '';
    els.bestowal2Input.value = state.bestowalLine2 || '';
    els.bestowal3Input.value = state.bestowalLine3 || '';

    document.querySelectorAll('.seg-btn[data-align]').forEach((btn) => {
      btn.setAttribute('aria-pressed', String(btn.dataset.align === state.citationAlign));
    });

    els.autoFitCheck.checked = Boolean(state.autoFit);
    els.citationSizeRange.value = state.citationFontSize;
    els.headingScaleRange.value = state.headingScale;
    els.headingScaleVal.textContent = `${Math.round(state.headingScale * 100)}%`;
    els.lineSpacingRange.value = state.lineSpacing;
    els.lineSpacingVal.textContent = `${Number(state.lineSpacing).toFixed(2)}×`;

    [els.citationSizeRange, els.headingScaleRange, els.lineSpacingRange].forEach(syncRangeProgress);

    els.showSignatoriesCheck.checked = Boolean(state.showSignatories);
    els.signatoriesBody.classList.toggle('hidden', !state.showSignatories);
    if (state.rosterId && els.rosterSelect.querySelector(`option[value="${state.rosterId}"]`)) {
      els.rosterSelect.value = state.rosterId;
    }
    els.sigHeadingInput.value = state.signatoriesHeading || 'Signed by:';
    renderSignatoryColumns();

    syncPhotoUi();
  }

  function syncPhotoUi() {
    const hasPhoto = Boolean(state.photo && state.photo.dataUrl);
    if (els.photoEmptyState) {
      els.photoEmptyState.classList.toggle('hidden', hasPhoto);
    } else {
      els.photoDropzone.classList.toggle('hidden', hasPhoto);
    }
    els.photoControlsWrap.classList.toggle('hidden', !hasPhoto);
    if (els.edTabPhoto) {
      els.edTabPhoto.textContent = hasPhoto ? 'Photo ●' : 'Photo';
    }

    if (hasPhoto) {
      els.photoThumb.src = state.photo.dataUrl;
      els.photoMetaText.textContent = `${state.photo.name || 'Photo'} (${state.photo.naturalWidth}×${state.photo.naturalHeight})`;
      els.photoHeightRange.value = state.photoMaxHeightRatio;
      els.photoHeightVal.textContent = `${Math.round(state.photoMaxHeightRatio * 100)}%`;
      els.photoAspectSelect.value = state.photoAspect || 'original';
      els.photoZoomRange.value = state.photoZoom || 1;
      els.photoZoomVal.textContent = `${Number(state.photoZoom || 1).toFixed(2)}×`;
      els.photoFrameCheck.checked = Boolean(state.photoFrame);
      els.photoPanXRange.value = state.photoPanX || 0;
      els.photoPanXVal.textContent = `${state.photoPanX || 0}%`;
      els.photoPanYRange.value = state.photoPanY || 0;
      els.photoPanYVal.textContent = `${state.photoPanY || 0}%`;
      [
        els.photoHeightRange,
        els.photoZoomRange,
        els.photoPanXRange,
        els.photoPanYRange
      ].forEach(syncRangeProgress);
    }
  }

  let pdfRefreshTimer = null;

  function renderAll(opts = {}) {
    currentLayout = computeProclamationLayout(state, fontMetrics);
    renderSvgPreview(currentLayout);

    const pageSpec = PAGE_SIZES[state.pageSize] || PAGE_SIZES.legal;
    els.pageSpecBadge.textContent = pageSpec.shortLabel;

    els.citationSizeGroup.classList.toggle('disabled', state.autoFit);
    els.citationSizeRange.disabled = state.autoFit;
    if (state.autoFit) {
      els.citationSizeVal.textContent = `${currentLayout.effectiveCitationPt} pt (Auto)`;
    } else {
      els.citationSizeVal.textContent = `${Number(state.citationFontSize).toFixed(2)} pt`;
    }

    if (currentLayout.overflowPt > 1) {
      els.fitBanner.className = 'fit-banner warn';
      els.fitBannerText.textContent = `⚠ Overflows page by ${Math.ceil(currentLayout.overflowPt)} pt — reduce font/photo size or enable Auto-Fit`;
      els.applyAutoFitBtn.classList.remove('hidden');
    } else {
      els.fitBanner.className = 'fit-banner ok';
      els.fitBannerText.textContent = state.autoFit
        ? `✓ Auto-fitted cleanly (${currentLayout.renderedCitationPt} pt rendered body)`
        : `✓ Fits cleanly on 1 page (${Math.round(currentLayout.safeHeight - currentLayout.usedHeight)} pt spare)`;
      els.applyAutoFitBtn.classList.add('hidden');
    }

    if (activeViewTab === 'pdf' && !opts.skipPdfRefresh) {
      clearTimeout(pdfRefreshTimer);
      pdfRefreshTimer = setTimeout(() => {
        refreshEmbeddedPdfViewer();
      }, 280);
    }
  }

  async function refreshEmbeddedPdfViewer() {
    if (!currentLayout || !fontBuffers.bold) return;
    try {
      const bytes = await generateProclamationPdfBytes(currentLayout, fontBuffers);
      const blob = new Blob([bytes], { type: 'application/pdf' });
      if (currentPdfBlobUrl) URL.revokeObjectURL(currentPdfBlobUrl);
      currentPdfBlobUrl = URL.createObjectURL(blob);
      els.pdfPreviewFrame.src = currentPdfBlobUrl;
    } catch (err) {
      console.error('PDF preview error:', err);
    }
  }

  function applyRosterById(rosterId) {
    const roster =
      signatoriesData.rosters.find((r) => r.id === rosterId) || signatoriesData.rosters[0];
    if (!roster) return;
    state.rosterId = roster.id;
    state.signatoriesHeading = roster.heading || 'Signed by:';
    state.signatoriesLeft = structuredClone(roster.leftColumn || []);
    state.signatoriesRight = structuredClone(roster.rightColumn || []);
  }

  function loadPhotoFromDataUrl(dataUrl, name = 'Photo') {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        state.photo = {
          dataUrl,
          naturalWidth: img.naturalWidth,
          naturalHeight: img.naturalHeight,
          name
        };
        state.photoZoom = 1.0;
        state.photoPanX = 0;
        state.photoPanY = 0;
        syncPhotoUi();
        renderAll();
        scheduleAutosave();
        resolve();
      };
      img.onerror = reject;
      img.src = dataUrl;
    });
  }

  async function loadPhotoFromUrl(url, name = 'Photo') {
    const offlineDataUrl = window.PAARA_OFFLINE?.dataUrls?.[url];
    if (offlineDataUrl && IS_FILE_PROTOCOL) {
      return loadPhotoFromDataUrl(offlineDataUrl, name);
    }
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const blob = await res.blob();
      return loadPhotoFromBlob(blob, name);
    } catch (err) {
      if (offlineDataUrl) {
        return loadPhotoFromDataUrl(offlineDataUrl, name);
      }
      throw err;
    }
  }

  function loadPhotoFromBlob(blob, name = 'Pasted Photo') {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        loadPhotoFromDataUrl(reader.result, name).then(resolve, reject);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  async function applyExample(exampleId) {
    const ex = examplesData.find((e) => e.id === exampleId);
    if (!ex) return;

    state.pageSize = ex.pageSize || 'legal';
    state.showHeader = Boolean(ex.showHeader);
    state.headerText = ex.headerText || 'OFFICIAL PROCLAMATION';
    state.citation = ex.citation || '';
    state.citationAlign = ex.citationAlign || 'justify';
    state.bestowalLine1 = ex.bestowalLine1 || 'The Officers and Directors of the';
    state.bestowalLine2 = ex.bestowalLine2 || 'Palo Alto Amateur Radio Association';
    state.bestowalLine3 = ex.bestowalLine3 || 'do hereby award and bestow upon';
    state.honoreeName = ex.honoreeName || '';
    state.honoreeCallsign = ex.honoreeCallsign || '';
    state.awardTitle = ex.awardTitle || 'a Lifetime Membership';
    state.dateLine = ex.dateLine || '';
    state.showSignatories = ex.showSignatories !== false;
    state.photoMaxHeightRatio = ex.photoMaxHeightRatio || 0.28;
    state.photoFrame = Boolean(ex.photoFrame);
    state.photoAspect = 'original';
    state.photoZoom = 1.0;
    state.photoPanX = 0;
    state.photoPanY = 0;
    state.autoFit = true;

    if (ex.rosterId) {
      applyRosterById(ex.rosterId);
    }

    if (ex.photoUrl) {
      try {
        await loadPhotoFromUrl(ex.photoUrl, ex.photoUrl.split('/').pop());
      } catch {
        state.photo = null;
      }
    } else {
      state.photo = null;
    }

    syncFormFromState();
    renderAll();
    scheduleAutosave();
  }

  function scheduleAutosave() {
    els.autosaveStatus.textContent = '● Saving...';
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
        els.autosaveStatus.textContent = '● Saved locally';
      } catch {
        try {
          const slim = { ...state, photo: null };
          localStorage.setItem(STORAGE_KEY, JSON.stringify(slim));
          els.autosaveStatus.textContent = '● Text saved';
        } catch {
          els.autosaveStatus.textContent = '● Draft active';
        }
      }
    }, 350);
  }

  function makeFilenameSlug(ext = 'pdf') {
    const raw = [state.honoreeName, state.honoreeCallsign]
      .map((s) => (s || '').trim())
      .filter(Boolean)
      .join('_')
      .replace(/[^A-Za-z0-9_-]+/g, '_')
      .replace(/^_+|_+$/g, '');
    return `${raw || 'PAARA_Member'}_proclamation.${ext}`;
  }

  function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 3000);
  }

  function selectPreviewTab(mode, focusTab = false) {
    activeViewTab = mode;
    const tabs = [
      { btn: els.tabLiveBtn, panel: els.livePanel, id: 'live' },
      { btn: els.tabPdfBtn, panel: els.pdfPanel, id: 'pdf' }
    ];
    for (const t of tabs) {
      const selected = t.id === mode;
      t.btn.setAttribute('aria-selected', String(selected));
      t.btn.toggleAttribute('focusgroupstart', selected);
      t.btn.tabIndex = selected ? 0 : -1;
      t.panel.hidden = !selected;
      if (selected) {
        t.panel.setAttribute('tabindex', '0');
      } else {
        t.panel.removeAttribute('tabindex');
      }
      if (selected && focusTab) {
        t.btn.focus();
      }
    }

    if (mode === 'live') {
      if (currentLayout) updatePreviewZoomSizing(currentLayout.page);
    } else {
      refreshEmbeddedPdfViewer();
    }
  }

  function bindEvents() {
    els.proclamationForm.addEventListener('submit', (e) => e.preventDefault());

    els.exampleSelect.addEventListener('change', () => {
      if (els.exampleSelect.value) {
        applyExample(els.exampleSelect.value);
      }
    });

    els.pageSizeSelect.addEventListener('change', () => {
      state.pageSize = els.pageSizeSelect.value;
      renderAll();
      scheduleAutosave();
    });
    els.headerFontSelect.addEventListener('change', () => {
      state.headerFont = els.headerFontSelect.value;
      renderAll();
      scheduleAutosave();
    });

    const bindText = (el, key) => {
      el.addEventListener('input', () => {
        state[key] = el.value;
        renderAll();
        scheduleAutosave();
      });
    };
    bindText(els.honoreeNameInput, 'honoreeName');
    bindText(els.honoreeCallInput, 'honoreeCallsign');
    bindText(els.headerTextInput, 'headerText');
    bindText(els.citationInput, 'citation');
    bindText(els.awardTitleInput, 'awardTitle');
    bindText(els.dateLineInput, 'dateLine');
    bindText(els.bestowal1Input, 'bestowalLine1');
    bindText(els.bestowal2Input, 'bestowalLine2');
    bindText(els.bestowal3Input, 'bestowalLine3');
    bindText(els.sigHeadingInput, 'signatoriesHeading');

    els.showHeaderCheck.addEventListener('change', () => {
      state.showHeader = els.showHeaderCheck.checked;
      els.headerTextInput.disabled = !state.showHeader;
      renderAll();
      scheduleAutosave();
    });

    document.querySelectorAll('.seg-btn[data-align]').forEach((btn) => {
      btn.addEventListener('click', () => {
        state.citationAlign = btn.dataset.align;
        document.querySelectorAll('.seg-btn[data-align]').forEach((b) => {
          b.setAttribute('aria-pressed', String(b === btn));
        });
        renderAll();
        scheduleAutosave();
      });
    });

    els.citationWeightSelect.addEventListener('change', () => {
      state.citationWeight = els.citationWeightSelect.value;
      renderAll();
      scheduleAutosave();
    });

    els.autoFitCheck.addEventListener('change', () => {
      if (!els.autoFitCheck.checked && currentLayout) {
        state.citationFontSize = currentLayout.effectiveCitationPt;
        els.citationSizeRange.value = state.citationFontSize;
        syncRangeProgress(els.citationSizeRange);
      }
      state.autoFit = els.autoFitCheck.checked;
      renderAll();
      scheduleAutosave();
    });

    els.applyAutoFitBtn.addEventListener('click', () => {
      state.autoFit = true;
      els.autoFitCheck.checked = true;
      renderAll();
      scheduleAutosave();
    });

    els.citationSizeRange.addEventListener('input', () => {
      state.citationFontSize = Number(els.citationSizeRange.value);
      syncRangeProgress(els.citationSizeRange);
      renderAll();
      scheduleAutosave();
    });

    els.headingScaleRange.addEventListener('input', () => {
      state.headingScale = Number(els.headingScaleRange.value);
      syncRangeProgress(els.headingScaleRange);
      els.headingScaleVal.textContent = `${Math.round(state.headingScale * 100)}%`;
      renderAll();
      scheduleAutosave();
    });

    els.lineSpacingRange.addEventListener('input', () => {
      state.lineSpacing = Number(els.lineSpacingRange.value);
      syncRangeProgress(els.lineSpacingRange);
      els.lineSpacingVal.textContent = `${state.lineSpacing.toFixed(2)}×`;
      renderAll();
      scheduleAutosave();
    });

    const openPhotoPicker = () => els.photoFileInput.click();
    els.photoDropzone.addEventListener('click', openPhotoPicker);
    if (els.useSamplePhotoBtn) {
      els.useSamplePhotoBtn.addEventListener('click', () => {
        loadPhotoFromUrl('assets/examples/doug_teter.jpg', 'doug_teter.jpg');
      });
    }
    els.replacePhotoBtn.addEventListener('click', openPhotoPicker);
    els.removePhotoBtn.addEventListener('click', () => {
      state.photo = null;
      syncPhotoUi();
      renderAll();
      scheduleAutosave();
    });

    els.photoFileInput.addEventListener('change', () => {
      const file = els.photoFileInput.files?.[0];
      if (file) {
        loadPhotoFromBlob(file, file.name);
        els.photoFileInput.value = '';
      }
    });

    els.photoHeightRange.addEventListener('input', () => {
      state.photoMaxHeightRatio = Number(els.photoHeightRange.value);
      syncRangeProgress(els.photoHeightRange);
      els.photoHeightVal.textContent = `${Math.round(state.photoMaxHeightRatio * 100)}%`;
      renderAll();
      scheduleAutosave();
    });

    els.photoAspectSelect.addEventListener('change', () => {
      state.photoAspect = els.photoAspectSelect.value;
      renderAll();
      scheduleAutosave();
    });

    els.photoZoomRange.addEventListener('input', () => {
      state.photoZoom = Number(els.photoZoomRange.value);
      syncRangeProgress(els.photoZoomRange);
      els.photoZoomVal.textContent = `${state.photoZoom.toFixed(2)}×`;
      renderAll();
      scheduleAutosave();
    });

    els.photoFrameCheck.addEventListener('change', () => {
      state.photoFrame = els.photoFrameCheck.checked;
      renderAll();
      scheduleAutosave();
    });

    els.photoPanXRange.addEventListener('input', () => {
      state.photoPanX = Number(els.photoPanXRange.value);
      syncRangeProgress(els.photoPanXRange);
      els.photoPanXVal.textContent = `${state.photoPanX}%`;
      renderAll();
      scheduleAutosave();
    });

    els.photoPanYRange.addEventListener('input', () => {
      state.photoPanY = Number(els.photoPanYRange.value);
      syncRangeProgress(els.photoPanYRange);
      els.photoPanYVal.textContent = `${state.photoPanY}%`;
      renderAll();
      scheduleAutosave();
    });

    window.addEventListener('paste', (e) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (const item of items) {
        if (item.type.startsWith('image/')) {
          const blob = item.getAsFile();
          if (blob) {
            e.preventDefault();
            loadPhotoFromBlob(blob, 'Clipboard Paste');
            return;
          }
        }
      }
    });

    let dragDepth = 0;
    window.addEventListener('dragenter', (e) => {
      if (e.dataTransfer?.types?.includes('Files')) {
        dragDepth++;
        els.globalDropOverlay.classList.remove('hidden');
      }
    });
    window.addEventListener('dragleave', () => {
      dragDepth = Math.max(0, dragDepth - 1);
      if (dragDepth === 0) els.globalDropOverlay.classList.add('hidden');
    });
    window.addEventListener('dragover', (e) => {
      e.preventDefault();
    });
    window.addEventListener('drop', (e) => {
      e.preventDefault();
      dragDepth = 0;
      els.globalDropOverlay.classList.add('hidden');
      const file = e.dataTransfer?.files?.[0];
      if (!file) return;
      if (file.type.startsWith('image/')) {
        loadPhotoFromBlob(file, file.name);
      } else if (file.name.endsWith('.json')) {
        importDraftFile(file);
      }
    });

    els.showSignatoriesCheck.addEventListener('change', () => {
      state.showSignatories = els.showSignatoriesCheck.checked;
      els.signatoriesBody.classList.toggle('hidden', !state.showSignatories);
      renderAll();
      scheduleAutosave();
    });

    els.rosterSelect.addEventListener('change', () => {
      applyRosterById(els.rosterSelect.value);
      els.sigHeadingInput.value = state.signatoriesHeading;
      renderSignatoryColumns();
      renderAll();
      scheduleAutosave();
    });

    els.addLeftSigBtn.addEventListener('click', () => {
      state.signatoriesLeft.push({ name: '', callsign: '', role: 'Officer' });
      renderSignatoryColumns();
      renderAll();
      scheduleAutosave();
    });

    els.addRightSigBtn.addEventListener('click', () => {
      state.signatoriesRight.push({ name: '', callsign: '', role: 'Director' });
      renderSignatoryColumns();
      renderAll();
      scheduleAutosave();
    });

    els.exportRosterJsonBtn.addEventListener('click', () => {
      const yearGuess = new Date().getFullYear();
      const updated = structuredClone(signatoriesData);
      const activeIdx = updated.rosters.findIndex((r) => r.id === state.rosterId);
      const currentEntry = {
        id: state.rosterId || String(yearGuess),
        label:
          activeIdx >= 0
            ? updated.rosters[activeIdx].label
            : `${yearGuess} Board of Directors (Current)`,
        year: activeIdx >= 0 ? updated.rosters[activeIdx].year : yearGuess,
        heading: state.signatoriesHeading || 'Signed by:',
        leftColumn: structuredClone(state.signatoriesLeft),
        rightColumn: structuredClone(state.signatoriesRight)
      };
      if (activeIdx >= 0) {
        updated.rosters[activeIdx] = currentEntry;
      } else {
        updated.rosters.unshift(currentEntry);
        updated.defaultRosterId = currentEntry.id;
      }
      const blob = new Blob([JSON.stringify(updated, null, 2) + '\n'], {
        type: 'application/json'
      });
      downloadBlob(blob, 'signatories.json');
    });

    els.saveDraftBtn.addEventListener('click', () => {
      const payload = {
        schema: 'paara-proclamation-draft-v1',
        savedAt: new Date().toISOString(),
        state
      };
      const blob = new Blob([JSON.stringify(payload, null, 2) + '\n'], {
        type: 'application/json'
      });
      downloadBlob(blob, makeFilenameSlug('json'));
    });

    els.openDraftBtn.addEventListener('click', () => els.openDraftInput.click());
    els.openDraftInput.addEventListener('change', () => {
      const file = els.openDraftInput.files?.[0];
      if (file) {
        importDraftFile(file);
        els.openDraftInput.value = '';
      }
    });

    // Left Editor Section Tabs (Text | Theme & Sizing | Photo | Signatories)
    const editorTabs = [
      { id: 'text', btn: els.edTabText, panel: els.edPanelText },
      { id: 'theme', btn: els.edTabTheme, panel: els.edPanelTheme },
      { id: 'photo', btn: els.edTabPhoto, panel: els.edPanelPhoto },
      { id: 'sigs', btn: els.edTabSigs, panel: els.edPanelSigs }
    ];
    let activeEditorTabIdx = 0;

    function selectEditorTab(idx, focusBtn = false) {
      activeEditorTabIdx = (idx + editorTabs.length) % editorTabs.length;
      editorTabs.forEach((t, i) => {
        const selected = i === activeEditorTabIdx;
        t.btn.setAttribute('aria-selected', String(selected));
        t.btn.toggleAttribute('focusgroupstart', selected);
        t.btn.tabIndex = selected ? 0 : -1;
        t.panel.hidden = !selected;
        if (selected && focusBtn) {
          t.btn.focus();
        }
      });
    }

    editorTabs.forEach((t, idx) => {
      t.btn.addEventListener('click', () => selectEditorTab(idx));
    });

    if (!Object.hasOwn(HTMLElement.prototype, 'focusGroup')) {
      els.editorTablist.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowRight') {
          e.preventDefault();
          selectEditorTab(activeEditorTabIdx + 1, true);
        } else if (e.key === 'ArrowLeft') {
          e.preventDefault();
          selectEditorTab(activeEditorTabIdx - 1, true);
        }
      });
    }

    // Draggable Sidebar Resizer
    if (els.paneSplitter) {
      const clampSidebarWidth = (px) => Math.max(390, Math.min(Math.round(window.innerWidth * 0.62), px));

      els.paneSplitter.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        els.paneSplitter.setPointerCapture(e.pointerId);
        els.paneSplitter.classList.add('dragging');

        const onMove = (ev) => {
          const nextW = clampSidebarWidth(ev.clientX);
          document.documentElement.style.setProperty('--sidebar-width', `${nextW}px`);
          if (currentLayout && activeViewTab === 'live') {
            updatePreviewZoomSizing(currentLayout.page);
          }
        };

        const onUp = () => {
          els.paneSplitter.classList.remove('dragging');
          els.paneSplitter.removeEventListener('pointermove', onMove);
          els.paneSplitter.removeEventListener('pointerup', onUp);
        };

        els.paneSplitter.addEventListener('pointermove', onMove);
        els.paneSplitter.addEventListener('pointerup', onUp);
      });

      els.paneSplitter.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
          e.preventDefault();
          const cur =
            parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--sidebar-width')) ||
            540;
          const delta = e.key === 'ArrowRight' ? 24 : -24;
          document.documentElement.style.setProperty(
            '--sidebar-width',
            `${clampSidebarWidth(cur + delta)}px`
          );
          if (currentLayout && activeViewTab === 'live') {
            updatePreviewZoomSizing(currentLayout.page);
          }
        }
      });
    }

    // Accessible Preview Tabs (click + roving ArrowLeft/ArrowRight fallback when focusgroup is absent)
    els.tabLiveBtn.addEventListener('click', () => selectPreviewTab('live'));
    els.tabPdfBtn.addEventListener('click', () => selectPreviewTab('pdf'));

    if (!Object.hasOwn(HTMLElement.prototype, 'focusGroup')) {
      els.previewTablist.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
          e.preventDefault();
          const nextMode = activeViewTab === 'live' ? 'pdf' : 'live';
          selectPreviewTab(nextMode, true);
        }
      });
    }

    els.previewZoomSelect.addEventListener('change', () => {
      if (currentLayout) updatePreviewZoomSizing(currentLayout.page);
    });

    window.addEventListener('resize', () => {
      if (currentLayout && activeViewTab === 'live') {
        updatePreviewZoomSizing(currentLayout.page);
      }
    });

    els.exportPdfBtn.addEventListener('click', async () => {
      const origText = els.exportPdfBtn.textContent;
      els.exportPdfBtn.disabled = true;
      els.exportPdfBtn.textContent = 'Generating PDF...';
      try {
        const bytes = await generateProclamationPdfBytes(currentLayout, fontBuffers);
        const blob = new Blob([bytes], { type: 'application/pdf' });
        downloadBlob(blob, makeFilenameSlug('pdf'));
      } catch (err) {
        console.error('Export PDF failed:', err);
        alert(`Failed to generate PDF: ${err.message}`);
      } finally {
        els.exportPdfBtn.disabled = false;
        els.exportPdfBtn.textContent = origText;
      }
    });
  }

  async function importDraftFile(file) {
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      const incoming = parsed.state || parsed;
      if (incoming && typeof incoming === 'object') {
        Object.assign(state, incoming);
        syncFormFromState();
        renderAll();
        scheduleAutosave();
      }
    } catch (err) {
      alert(`Could not load JSON draft: ${err.message}`);
    }
  }

  async function loadFonts() {
    await Promise.all(
      Object.entries(FONT_PATHS).map(async ([key, relUrl]) => {
        if (!IS_FILE_PROTOCOL) {
          try {
            const res = await fetch(relUrl);
            if (res.ok) {
              const buf = await res.arrayBuffer();
              const u8 = new Uint8Array(buf);
              fontBuffers[key] = u8;
              fontMetrics[key] = window.fontkit.create(u8);
              return;
            }
          } catch {
            // Fall back to offline bundle below
          }
        }
        const b64 = window.PAARA_OFFLINE?.fontsBase64?.[key];
        if (!b64) throw new Error(`Missing font asset: ${key}`);
        const u8 = base64ToUint8Array(b64);
        fontBuffers[key] = u8;
        fontMetrics[key] = window.fontkit.create(u8);
      })
    );
  }

  async function loadJsonData() {
    if (!IS_FILE_PROTOCOL) {
      try {
        const [sigRes, exRes] = await Promise.all([
          fetch('data/signatories.json'),
          fetch('data/examples.json')
        ]);
        if (sigRes.ok && exRes.ok) {
          signatoriesData = await sigRes.json();
          const exJson = await exRes.json();
          examplesData = exJson.examples || [];
          return;
        }
      } catch {
        // Fall back to offline bundle below
      }
    }
    signatoriesData = structuredClone(window.PAARA_OFFLINE.signatories);
    examplesData = structuredClone(window.PAARA_OFFLINE.examples.examples || []);
  }

  async function init() {
    injectOfflineFontFacesIfNeeded();
    if (IS_FILE_PROTOCOL && window.PAARA_OFFLINE?.dataUrls?.['assets/logos/paara-logo.svg']) {
      els.brandLogoImg.src = window.PAARA_OFFLINE.dataUrls['assets/logos/paara-logo.svg'];
    }

    bindEvents();
    await Promise.all([loadFonts(), loadJsonData()]);

    els.rosterSelect.replaceChildren();
    for (const r of signatoriesData.rosters) {
      const opt = document.createElement('option');
      opt.value = r.id;
      opt.textContent = r.label;
      els.rosterSelect.appendChild(opt);
    }

    els.exampleSelect.replaceChildren();
    for (const ex of examplesData) {
      const opt = document.createElement('option');
      opt.value = ex.id;
      opt.textContent = ex.label;
      els.exampleSelect.appendChild(opt);
    }

    const savedRaw = localStorage.getItem(STORAGE_KEY);
    if (savedRaw) {
      try {
        const saved = JSON.parse(savedRaw);
        Object.assign(state, saved);
        syncFormFromState();
        renderAll();
        els.autosaveStatus.textContent = '● Restored local draft';
        return;
      } catch {
        // Fall through to default example
      }
    }

    els.exampleSelect.value = 'doug-teter-2026';
    await applyExample('doug-teter-2026');
  }

  init();
})();

/**
 * PAARA Proclamation Themes & Vector Border Primitives
 * Works both over HTTP(S) and direct file:// opening (classic script).
 */
(function () {
  'use strict';

  const THEMES = [
    {
      id: 'guilloche-classic',
      name: 'Classic Burgundy Guilloché',
      badge: 'Vector Default',
      description:
        'Crisp infinite-resolution vector recreation of PAARA’s traditional burgundy scalloped guilloché border, auto-proportioned to any page size.',
      swatch: ['#843F43', '#C99A9D', '#FFFFFF']
    },
    {
      id: 'original-extracted',
      name: 'Original Archive Border',
      badge: '2019–2026 Exact',
      description:
        'Classic raster certificate border matching PAARA’s 2019–2026 historical proclamations.',
      swatch: ['#88484B', '#B78386', '#FFFFFF']
    },
    {
      id: 'burgundy-gold',
      name: 'Formal Burgundy & Gold',
      badge: 'Warm Parchment',
      description:
        'Stately ivory parchment stock with deep maroon architectural framing, antique gold filigree double-pinlines, and classical corner medallions.',
      swatch: ['#641C23', '#B68B3A', '#FFFCF5']
    },
    {
      id: 'paara-heritage',
      name: 'PAARA Red & Black (1937)',
      badge: 'Club Colors',
      description:
        'Inspired directly by the 1937 W6OTX emblem: charcoal black outer frame, PAARA lightning-bolt red inner trim, and radio-era corner chevrons.',
      swatch: ['#161616', '#D22329', '#FFFFFF']
    }
  ];

  function getThemeById(id) {
    return THEMES.find((t) => t.id === id) || THEMES[0];
  }

  function polarPoint(cx, cy, r, angleRad) {
    return [cx + r * Math.cos(angleRad), cy + r * Math.sin(angleRad)];
  }

  function arcPoints(cx, cy, r, startAngle, endAngle, steps = 28) {
    const pts = [];
    for (let i = 0; i <= steps; i++) {
      const t = startAngle + ((endAngle - startAngle) * i) / steps;
      pts.push(polarPoint(cx, cy, r, t));
    }
    return pts;
  }

  function ellipsePoints(cx, cy, rx, ry, rotationRad = 0, steps = 24) {
    const pts = [];
    const cosR = Math.cos(rotationRad);
    const sinR = Math.sin(rotationRad);
    for (let i = 0; i < steps; i++) {
      const t = (Math.PI * 2 * i) / steps;
      const lx = rx * Math.cos(t);
      const ly = ry * Math.sin(t);
      pts.push([cx + lx * cosR - ly * sinR, cy + lx * sinR + ly * cosR]);
    }
    return pts;
  }

  function buildGuillocheClassic(W, H) {
    const s = Math.min(W, H) / 612;
    const primitives = [];

    const outerPad = 8 * s;
    const bandThick = 28 * s;
    const innerFrameOuter = outerPad + bandThick;
    const whiteGap = 3.2 * s;
    const barX = innerFrameOuter + whiteGap;
    const barThick = 6.2 * s;
    const pin1Offset = barX + barThick + 2.6 * s;
    const pin2Offset = pin1Offset + 2.2 * s;

    const burgundy = '#823E42';
    const burgundyDark = '#682B2E';
    const burgundyMid = '#985458';
    const latheStroke = '#DEC0C2';
    const white = '#FFFFFF';

    function addScallop(bx, by, tx, ty, nx, ny, halfSpan, radius) {
      const baseAngle = Math.atan2(ny, nx);
      const dome = [];
      const steps = 28;
      for (let i = 0; i <= steps; i++) {
        const a = -Math.PI / 2 + (Math.PI * i) / steps;
        const along = Math.sin(a) * halfSpan;
        const out = Math.cos(a) * radius;
        dome.push([bx + tx * along + nx * out, by + ty * along + ny * out]);
      }
      primitives.push({
        type: 'poly',
        points: dome,
        closed: true,
        fill: burgundy,
        stroke: burgundyDark,
        strokeWidth: 0.7 * s
      });

      const fanCount = 11;
      for (let k = 0; k < fanCount; k++) {
        const u1 = -0.88 + (1.76 * k) / (fanCount - 1);
        const archPts = [];
        const subSteps = 14;
        for (let j = 0; j <= subSteps; j++) {
          const p = j / subSteps;
          const a = -Math.PI / 2 + Math.PI * p;
          const shift = u1 * 0.35 * Math.cos(p * Math.PI);
          const along = (Math.sin(a) * 0.9 + shift * 0.45) * halfSpan * 0.92;
          const out = Math.sin(p * Math.PI) * radius * (0.52 + 0.42 * (1 - Math.abs(u1) * 0.55));
          archPts.push([bx + tx * along + nx * out, by + ty * along + ny * out]);
        }
        primitives.push({
          type: 'poly',
          points: archPts,
          closed: false,
          stroke: latheStroke,
          strokeWidth: 0.42 * s
        });
      }

      const rib = [];
      for (let i = 0; i <= 20; i++) {
        const a = -Math.PI / 2 + (Math.PI * i) / 20;
        rib.push([
          bx + tx * Math.sin(a) * halfSpan * 0.48 + nx * Math.cos(a) * radius * 0.46,
          by + ty * Math.sin(a) * halfSpan * 0.48 + ny * Math.cos(a) * radius * 0.46
        ]);
      }
      primitives.push({
        type: 'poly',
        points: rib,
        closed: false,
        stroke: white,
        strokeWidth: 0.65 * s
      });

      const eyeCx = bx + nx * (radius * 0.23);
      const eyeCy = by + ny * (radius * 0.23);
      primitives.push({
        type: 'poly',
        points: ellipsePoints(eyeCx, eyeCy, 4.2 * s, 2.2 * s, baseAngle, 20),
        closed: true,
        fill: white,
        stroke: burgundyDark,
        strokeWidth: 0.6 * s
      });
      primitives.push({
        type: 'poly',
        points: ellipsePoints(eyeCx, eyeCy, 2.3 * s, 1.0 * s, baseAngle, 16),
        closed: true,
        fill: burgundyMid
      });
    }

    function addCusp(cx, cy, tx, ty, nx, ny, r) {
      const pts = [
        [cx - tx * 3.2 * s + nx * r * 0.55, cy - ty * 3.2 * s + ny * r * 0.55],
        [cx + nx * r * 0.96, cy + ny * r * 0.96],
        [cx + tx * 3.2 * s + nx * r * 0.55, cy + ty * 3.2 * s + ny * r * 0.55],
        [cx + nx * r * 0.22, cy + ny * r * 0.22]
      ];
      primitives.push({
        type: 'poly',
        points: pts,
        closed: true,
        fill: burgundyDark,
        stroke: latheStroke,
        strokeWidth: 0.35 * s
      });
    }

    const spanX = W - 2 * innerFrameOuter;
    const spanY = H - 2 * innerFrameOuter;
    const countX = Math.max(7, Math.round(spanX / (54 * s)));
    const countY = Math.max(10, Math.round(spanY / (54 * s)));
    const stepX = spanX / countX;
    const stepY = spanY / countY;

    primitives.push({
      type: 'rect',
      x: innerFrameOuter - 2 * s,
      y: innerFrameOuter - 2 * s,
      w: spanX + 4 * s,
      h: spanY + 4 * s,
      stroke: burgundy,
      strokeWidth: 5 * s
    });

    for (let i = 0; i < countX; i++) {
      const cx = innerFrameOuter + (i + 0.5) * stepX;
      addScallop(cx, innerFrameOuter, 1, 0, 0, -1, stepX * 0.52, bandThick);
      addScallop(cx, H - innerFrameOuter, -1, 0, 0, 1, stepX * 0.52, bandThick);
      if (i > 0) {
        const jx = innerFrameOuter + i * stepX;
        addCusp(jx, innerFrameOuter, 1, 0, 0, -1, bandThick);
        addCusp(jx, H - innerFrameOuter, -1, 0, 0, 1, bandThick);
      }
    }

    for (let i = 0; i < countY; i++) {
      const cy = innerFrameOuter + (i + 0.5) * stepY;
      addScallop(innerFrameOuter, cy, 0, -1, -1, 0, stepY * 0.52, bandThick);
      addScallop(W - innerFrameOuter, cy, 0, 1, 1, 0, stepY * 0.52, bandThick);
      if (i > 0) {
        const jy = innerFrameOuter + i * stepY;
        addCusp(innerFrameOuter, jy, 0, -1, -1, 0, bandThick);
        addCusp(W - innerFrameOuter, jy, 0, 1, 1, 0, bandThick);
      }
    }

    const outerCorners = [
      { cx: innerFrameOuter, cy: innerFrameOuter, start: Math.PI * 0.92, end: Math.PI * 1.58 },
      { cx: W - innerFrameOuter, cy: innerFrameOuter, start: Math.PI * 1.42, end: Math.PI * 2.08 },
      { cx: W - innerFrameOuter, cy: H - innerFrameOuter, start: -Math.PI * 0.08, end: Math.PI * 0.58 },
      { cx: innerFrameOuter, cy: H - innerFrameOuter, start: Math.PI * 0.42, end: Math.PI * 1.08 }
    ];
    for (const c of outerCorners) {
      const wedge = [[c.cx, c.cy], ...arcPoints(c.cx, c.cy, bandThick * 1.04, c.start, c.end, 28)];
      primitives.push({
        type: 'poly',
        points: wedge,
        closed: true,
        fill: burgundy,
        stroke: burgundyDark,
        strokeWidth: 0.75 * s
      });
      for (let k = 0; k <= 10; k++) {
        const a = c.start + ((c.end - c.start) * k) / 10;
        const p1 = polarPoint(c.cx, c.cy, bandThick * 0.15, a);
        const pMid = polarPoint(c.cx, c.cy, bandThick * 0.62, a + 0.12 * (k % 2 === 0 ? 1 : -1));
        const p2 = polarPoint(c.cx, c.cy, bandThick * 0.96, a);
        primitives.push({
          type: 'poly',
          points: [p1, pMid, p2],
          closed: false,
          stroke: latheStroke,
          strokeWidth: 0.45 * s
        });
      }
      primitives.push({
        type: 'poly',
        points: arcPoints(c.cx, c.cy, bandThick * 0.52, c.start, c.end, 18),
        closed: false,
        stroke: white,
        strokeWidth: 0.65 * s
      });
    }

    primitives.push({
      type: 'rect',
      x: innerFrameOuter,
      y: innerFrameOuter,
      w: W - 2 * innerFrameOuter,
      h: H - 2 * innerFrameOuter,
      fill: white
    });
    primitives.push({
      type: 'rect',
      x: barX + barThick / 2,
      y: barX + barThick / 2,
      w: W - 2 * barX - barThick,
      h: H - 2 * barX - barThick,
      stroke: burgundy,
      strokeWidth: barThick
    });
    primitives.push({
      type: 'rect',
      x: pin1Offset,
      y: pin1Offset,
      w: W - 2 * pin1Offset,
      h: H - 2 * pin1Offset,
      stroke: burgundy,
      strokeWidth: 0.9 * s
    });
    primitives.push({
      type: 'rect',
      x: pin2Offset,
      y: pin2Offset,
      w: W - 2 * pin2Offset,
      h: H - 2 * pin2Offset,
      stroke: burgundyMid,
      strokeWidth: 0.45 * s
    });

    const innerCornerX = barX + barThick;
    const fanR = 26 * s;
    const innerCorners = [
      { cx: innerCornerX, cy: innerCornerX, a0: 0, a1: Math.PI / 2, dx: 1, dy: 1 },
      { cx: W - innerCornerX, cy: innerCornerX, a0: Math.PI / 2, a1: Math.PI, dx: -1, dy: 1 },
      { cx: W - innerCornerX, cy: H - innerCornerX, a0: Math.PI, a1: Math.PI * 1.5, dx: -1, dy: -1 },
      { cx: innerCornerX, cy: H - innerCornerX, a0: Math.PI * 1.5, a1: Math.PI * 2, dx: 1, dy: -1 }
    ];
    for (const ic of innerCorners) {
      const fanPts = [[ic.cx, ic.cy]];
      const spikes = 6;
      for (let i = 0; i <= spikes * 4; i++) {
        const u = i / (spikes * 4);
        const ang = ic.a0 + (ic.a1 - ic.a0) * u;
        const wave = 1 + 0.14 * Math.sin(u * spikes * Math.PI * 2);
        fanPts.push(polarPoint(ic.cx, ic.cy, fanR * 0.82 * wave, ang));
      }
      primitives.push({
        type: 'poly',
        points: fanPts,
        closed: true,
        fill: burgundy
      });

      for (let d = 1; d <= 3; d++) {
        const ang = ic.a0 + ((ic.a1 - ic.a0) * d) / 4;
        const pDot = polarPoint(ic.cx, ic.cy, fanR * (d === 2 ? 1.16 : 1.05), ang);
        primitives.push({
          type: 'poly',
          points: ellipsePoints(pDot[0], pDot[1], 2.6 * s, 1.3 * s, ang, 14),
          closed: true,
          fill: d === 2 ? white : burgundy,
          stroke: burgundy,
          strokeWidth: 0.6 * s
        });
      }

      const jx = ic.cx + ic.dx * 7.5 * s;
      const jy = ic.cy + ic.dy * 7.5 * s;
      const jr = 4.2 * s;
      primitives.push({
        type: 'poly',
        points: [
          [jx, jy - jr],
          [jx + jr, jy],
          [jx, jy + jr],
          [jx - jr, jy]
        ],
        closed: true,
        fill: white
      });
      primitives.push({
        type: 'poly',
        points: [
          [jx, jy - jr * 0.45],
          [jx + jr * 0.45, jy],
          [jx, jy + jr * 0.45],
          [jx - jr * 0.45, jy]
        ],
        closed: true,
        fill: burgundyMid
      });
    }

    return {
      themeId: 'guilloche-classic',
      background: '#FFFFFF',
      textColor: '#111111',
      accentColor: burgundy,
      honoreeColor: '#0A0A0A',
      dividerStyle: 'none',
      rasterUrl: null,
      insets: {
        top: 56 * s,
        bottom: 62 * s,
        left: 74 * s,
        right: 74 * s
      },
      primitives
    };
  }

  function buildOriginalExtracted(W, H) {
    const s = Math.min(W, H) / 612;
    return {
      themeId: 'original-extracted',
      background: '#FFFFFF',
      textColor: '#111111',
      accentColor: '#823E42',
      honoreeColor: '#0A0A0A',
      dividerStyle: 'none',
      rasterUrl: 'assets/borders/original-cleaned.jpg',
      insets: {
        top: Math.max(54 * s, H * 0.056),
        bottom: Math.max(60 * s, H * 0.062),
        left: W * 0.122,
        right: W * 0.122
      },
      primitives: []
    };
  }

  function buildBurgundyGold(W, H) {
    const s = Math.min(W, H) / 612;
    const primitives = [];

    const cream = '#FFFCF5';
    const maroon = '#641C23';
    const maroonLight = '#87333B';
    const gold = '#B68B3A';
    const goldLight = '#D7B76E';

    primitives.push({ type: 'rect', x: 0, y: 0, w: W, h: H, fill: cream });

    const m1 = 22 * s;
    const m2 = 29 * s;
    const m3 = 36 * s;
    const m4 = 40.5 * s;

    primitives.push({ type: 'rect', x: m1, y: m1, w: W - 2 * m1, h: H - 2 * m1, stroke: gold, strokeWidth: 1.1 * s });
    primitives.push({ type: 'rect', x: m2, y: m2, w: W - 2 * m2, h: H - 2 * m2, stroke: maroon, strokeWidth: 6.5 * s });
    primitives.push({ type: 'rect', x: m3, y: m3, w: W - 2 * m3, h: H - 2 * m3, stroke: gold, strokeWidth: 1.6 * s });
    primitives.push({ type: 'rect', x: m4, y: m4, w: W - 2 * m4, h: H - 2 * m4, stroke: maroonLight, strokeWidth: 0.65 * s });

    const corners = [
      [m2, m2, 1, 1],
      [W - m2, m2, -1, 1],
      [W - m2, H - m2, -1, -1],
      [m2, H - m2, 1, -1]
    ];
    const box = 26 * s;
    for (const [cx, cy, dx, dy] of corners) {
      const rx = dx > 0 ? cx - 4 * s : cx - box + 4 * s;
      const ry = dy > 0 ? cy - 4 * s : cy - box + 4 * s;
      primitives.push({ type: 'rect', x: rx, y: ry, w: box, h: box, fill: cream, stroke: maroon, strokeWidth: 2.2 * s });
      primitives.push({
        type: 'rect',
        x: rx + 3.5 * s,
        y: ry + 3.5 * s,
        w: box - 7 * s,
        h: box - 7 * s,
        stroke: gold,
        strokeWidth: 1.2 * s
      });
      const mx = rx + box / 2;
      const my = ry + box / 2;
      const dr = 5.5 * s;
      primitives.push({
        type: 'poly',
        points: [
          [mx, my - dr],
          [mx + dr, my],
          [mx, my + dr],
          [mx - dr, my]
        ],
        closed: true,
        fill: maroon,
        stroke: goldLight,
        strokeWidth: 0.9 * s
      });
      primitives.push({ type: 'circle', cx: mx, cy: my, r: 1.8 * s, fill: goldLight });

      const sx = cx + dx * (box - 1 * s);
      const sy = cy + dy * (box - 1 * s);
      primitives.push({
        type: 'poly',
        points: [
          [sx, cy + dy * 14 * s],
          [sx + dx * 18 * s, cy + dy * 14 * s],
          [sx + dx * 18 * s, cy + dy * 8.5 * s]
        ],
        closed: false,
        stroke: gold,
        strokeWidth: 1.1 * s
      });
      primitives.push({
        type: 'poly',
        points: [
          [cx + dx * 14 * s, sy],
          [cx + dx * 14 * s, sy + dy * 18 * s],
          [cx + dx * 8.5 * s, sy + dy * 18 * s]
        ],
        closed: false,
        stroke: gold,
        strokeWidth: 1.1 * s
      });
    }

    return {
      themeId: 'burgundy-gold',
      background: cream,
      textColor: '#1E1415',
      accentColor: maroon,
      secondaryAccent: gold,
      honoreeColor: maroon,
      dividerStyle: 'gold-diamond',
      rasterUrl: null,
      insets: {
        top: 56 * s,
        bottom: 60 * s,
        left: 72 * s,
        right: 72 * s
      },
      primitives
    };
  }

  function buildPaaraHeritage(W, H) {
    const s = Math.min(W, H) / 612;
    const primitives = [];

    const black = '#141414';
    const paaraRed = '#D22329';
    const charcoal = '#3A3A3A';
    const white = '#FFFFFF';

    primitives.push({ type: 'rect', x: 0, y: 0, w: W, h: H, fill: white });

    const mOuter = 24 * s;
    const mRed = 33 * s;
    const mInner = 38.5 * s;

    primitives.push({ type: 'rect', x: mOuter, y: mOuter, w: W - 2 * mOuter, h: H - 2 * mOuter, stroke: black, strokeWidth: 5.2 * s });
    primitives.push({ type: 'rect', x: mRed, y: mRed, w: W - 2 * mRed, h: H - 2 * mRed, stroke: paaraRed, strokeWidth: 2.4 * s });
    primitives.push({ type: 'rect', x: mInner, y: mInner, w: W - 2 * mInner, h: H - 2 * mInner, stroke: charcoal, strokeWidth: 0.7 * s });

    const corners = [
      { x: mOuter, y: mOuter, dx: 1, dy: 1, a0: 0, a1: Math.PI / 2 },
      { x: W - mOuter, y: mOuter, dx: -1, dy: 1, a0: Math.PI / 2, a1: Math.PI },
      { x: W - mOuter, y: H - mOuter, dx: -1, dy: -1, a0: Math.PI, a1: Math.PI * 1.5 },
      { x: mOuter, y: H - mOuter, dx: 1, dy: -1, a0: Math.PI * 1.5, a1: Math.PI * 2 }
    ];

    for (const c of corners) {
      const bSize = 18 * s;
      const bx = c.dx > 0 ? c.x - 2.6 * s : c.x - bSize + 2.6 * s;
      const by = c.dy > 0 ? c.y - 2.6 * s : c.y - bSize + 2.6 * s;
      primitives.push({ type: 'rect', x: bx, y: by, w: bSize, h: bSize, fill: black });

      primitives.push({
        type: 'poly',
        points: [
          [c.x + c.dx * 2 * s, c.y + c.dy * 12 * s],
          [c.x + c.dx * 12 * s, c.y + c.dy * 2 * s],
          [c.x + c.dx * 14.5 * s, c.y + c.dy * 4.5 * s],
          [c.x + c.dx * 4.5 * s, c.y + c.dy * 14.5 * s]
        ],
        closed: true,
        fill: paaraRed
      });

      const icx = c.x + c.dx * (mInner - mOuter);
      const icy = c.y + c.dy * (mInner - mOuter);
      for (const rWave of [11 * s, 16 * s, 21 * s]) {
        primitives.push({
          type: 'poly',
          points: arcPoints(icx, icy, rWave, c.a0 + 0.14, c.a1 - 0.14, 16),
          closed: false,
          stroke: rWave === 16 * s ? paaraRed : black,
          strokeWidth: (rWave === 16 * s ? 1.1 : 0.65) * s
        });
      }
    }

    return {
      themeId: 'paara-heritage',
      background: white,
      textColor: '#121212',
      accentColor: paaraRed,
      secondaryAccent: black,
      honoreeColor: '#111111',
      dividerStyle: 'paara-lightning',
      rasterUrl: null,
      insets: {
        top: 54 * s,
        bottom: 58 * s,
        left: 70 * s,
        right: 70 * s
      },
      primitives
    };
  }

  function buildThemeBorder(themeId, width, height) {
    switch (themeId) {
      case 'original-extracted':
        return buildOriginalExtracted(width, height);
      case 'burgundy-gold':
        return buildBurgundyGold(width, height);
      case 'paara-heritage':
        return buildPaaraHeritage(width, height);
      case 'guilloche-classic':
      default:
        return buildGuillocheClassic(width, height);
    }
  }

  window.PAARA = window.PAARA || {};
  Object.assign(window.PAARA, { THEMES, getThemeById, buildThemeBorder });
})();

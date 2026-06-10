/*
 * Levellio store-mockup art — the SAME recreated vector art as the app's
 * HeroAvatar / Wisp components and the generated app mark, ported to inline SVG
 * strings so the HTML screenshot templates render the real thing (no images,
 * no network, no build step). Geometry is kept byte-for-byte in sync with
 * src/components/HeroAvatar.tsx, src/components/Wisp.tsx and src/tools/icon.
 */
(function (global) {
  let uid = 0;

  const HERO = {
    teal: '#16C8A8', tealShade: '#11A98F', tealDeep: '#0E8F79',
    navy: '#222A4A', navyShade: '#1A2038',
    violet: '#6C4CF1', violetShade: '#5A3FD6',
    gold: '#FFB23E', goldShade: '#F0A02A',
    skin: '#F0C9A8', skinShade: '#E3B594', hair: '#222A4A',
    white: '#FFFFFF', shadow: '#1B1B2A',
  };
  const C = HERO;

  function star(cx, cy, r, fill) {
    const p = `${cx},${cy - r} ${cx + r * 0.32},${cy - r * 0.32} ${cx + r},${cy} ` +
      `${cx + r * 0.32},${cy + r * 0.32} ${cx},${cy + r} ${cx - r * 0.32},${cy + r * 0.32} ` +
      `${cx - r},${cy} ${cx - r * 0.32},${cy - r * 0.32}`;
    return `<polygon points="${p}" fill="${fill}"/>`;
  }

  const TIERS = ['novice', 'pathfinder', 'luminary'];
  const PRESENTATIONS = ['female', 'male', 'neutral'];
  const STAGES = ['spark', 'ember', 'phoenixling'];
  const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

  function hero(tier, presentation, size) {
    const t = TIERS.includes(tier) ? tier : 'novice';
    const p = PRESENTATIONS.includes(presentation) ? presentation : 'neutral';
    const id = `h${uid++}`;
    const sleeve = `stroke="${C.teal}" stroke-width="7" stroke-linecap="round" fill="none"`;

    const arms = t === 'pathfinder'
      ? `<path d="M35 48 Q26 54 38 66" ${sleeve}/><path d="M65 48 Q74 54 62 66" ${sleeve}/>` +
        `<circle cx="38" cy="66" r="3.2" fill="${C.skin}"/><circle cx="62" cy="66" r="3.2" fill="${C.skin}"/>`
      : t === 'luminary'
      ? `<path d="M35 49 Q26 40 22 28" ${sleeve}/><path d="M65 49 Q74 40 78 28" ${sleeve}/>` +
        `<circle cx="22" cy="26" r="3.4" fill="${C.skin}"/><circle cx="78" cy="26" r="3.4" fill="${C.skin}"/>`
      : `<path d="M35 49 Q30 60 33 70" ${sleeve}/><path d="M65 48 Q75 40 78 30" ${sleeve}/>` +
        `<circle cx="33" cy="71" r="3.2" fill="${C.skin}"/><circle cx="78.5" cy="28" r="3.4" fill="${C.skin}"/>`;

    const lum = t === 'luminary';
    const cape = t === 'novice' ? '' :
      `<g>${lum ? `<path d="M31 43 Q13 71 26 92 L74 92 Q87 71 69 43 Z" fill="${C.gold}"/>` : ''}` +
      `<path d="${lum ? 'M34 44 Q16 70 28 89 L72 89 Q84 70 66 44 Z' : 'M36 45 Q24 68 33 84 L67 84 Q76 68 64 45 Z'}" fill="${C.violet}"/>` +
      `<path d="${lum ? 'M50 45 Q60 70 60 88 L72 89 Q84 70 66 44 Z' : 'M50 45 Q58 67 58 83 L67 84 Q76 68 64 45 Z'}" fill="${C.violetShade}" opacity="0.55"/></g>`;

    const body =
      `<path d="M33 47 Q33 42 39 42 L61 42 Q67 42 67 47 L67 72 Q67 75 63 75 L37 75 Q34 75 34 72 Z" fill="${C.teal}"/>` +
      `<path d="M55 43 L67 47 L67 72 Q67 75 63 75 L55 75 Z" fill="${C.tealShade}"/>` +
      `<path d="M44 42 L56 42 L50 49 Z" fill="${C.tealDeep}"/>` +
      `<rect x="41" y="59" width="18" height="11" rx="4" fill="${C.tealDeep}"/>` +
      `<rect x="45.4" y="47" width="1.8" height="8" rx="0.9" fill="${C.white}"/>` +
      `<rect x="52.8" y="47" width="1.8" height="8" rx="0.9" fill="${C.white}"/>` +
      `<circle cx="46.3" cy="55.5" r="1.2" fill="${C.white}"/><circle cx="53.7" cy="55.5" r="1.2" fill="${C.white}"/>`;

    const legs =
      `<rect x="39" y="74" width="9" height="15" rx="4" fill="${C.navy}"/>` +
      `<rect x="52" y="74" width="9" height="15" rx="4" fill="${C.navy}"/>` +
      `<rect x="57" y="74" width="4" height="15" rx="2" fill="${C.navyShade}"/>` +
      `<ellipse cx="43.5" cy="90" rx="6" ry="3" fill="${C.teal}"/><ellipse cx="56.5" cy="90" rx="6" ry="3" fill="${C.teal}"/>`;

    const bob = p === 'female'
      ? `<path d="M34 28 Q34 16 50 16 Q66 16 66 28 L66 42 Q60 38 60 32 L40 32 Q40 38 34 42 Z" fill="${C.hair}"/>` : '';
    const crown = p === 'male'
      ? `M37 27 Q39 16 50 16 Q61 16 63 27 Q57 22 50 22 Q43 22 37 27 Z`
      : `M36 28 Q37 14 50 14 Q63 14 64 28 Q56 21 50 21 Q44 21 36 28 Z`;
    const head =
      `${bob}<circle cx="50" cy="28" r="13" fill="${C.skin}"/>` +
      `<path d="M40 33 Q50 41 60 33 Q57 39 50 39 Q43 39 40 33 Z" fill="${C.skinShade}"/>` +
      `<path d="${crown}" fill="${C.hair}"/>` +
      `<circle cx="45.5" cy="29" r="1.8" fill="${C.navyShade}"/><circle cx="54.5" cy="29" r="1.8" fill="${C.navyShade}"/>` +
      `<path d="M45 33 Q50 37 55 33 Q52 35 50 35 Q48 35 45 33 Z" fill="${C.navyShade}"/>` +
      (t === 'pathfinder' ? `<path d="M37 22 Q50 18 63 22 L63 25 Q50 21 37 25 Z" fill="${C.violet}"/>` : '');

    const gear = t === 'pathfinder'
      ? `<polygon points="39,44 42,44 63,70 60,70" fill="${C.gold}"/>` +
        `<rect x="59" y="66" width="9" height="7" rx="2.5" fill="${C.gold}"/>` +
        `<rect x="59" y="66" width="3" height="7" rx="1.5" fill="${C.goldShade}"/>` + star(50, 52, 3.6, C.gold)
      : t === 'luminary'
      ? `<rect x="36" y="70" width="28" height="4" rx="2" fill="${C.gold}"/>` +
        `<circle cx="50" cy="54" r="4.8" fill="${C.gold}"/><circle cx="50" cy="54" r="2.6" fill="${C.violet}"/>` +
        `<ellipse cx="43" cy="9" rx="5" ry="2.4" fill="${C.gold}" transform="rotate(-28 43 9)"/>` +
        `<ellipse cx="57" cy="9" rx="5" ry="2.4" fill="${C.gold}" transform="rotate(28 57 9)"/>` +
        `<circle cx="50" cy="8" r="1.8" fill="${C.goldShade}"/>`
      : '';

    const sparkles = t === 'novice' ? '' : star(20, 40, 2.4, C.gold) + star(82, 52, 3, C.gold) + star(76, 70, 2, C.gold);
    const aura = lum ? `<circle cx="50" cy="50" r="50" fill="url(#aura${id})"/>` : '';

    return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 100 100" role="img" aria-label="${cap(p)} hero, ${cap(t)} tier">` +
      `<defs><radialGradient id="aura${id}" cx="50%" cy="50%" r="50%">` +
      `<stop offset="0%" stop-color="${C.gold}" stop-opacity="0.35"/>` +
      `<stop offset="55%" stop-color="${C.violet}" stop-opacity="0.16"/>` +
      `<stop offset="100%" stop-color="${C.violet}" stop-opacity="0"/></radialGradient>` +
      `<radialGradient id="gs${id}" cx="50%" cy="50%" r="50%">` +
      `<stop offset="0%" stop-color="${C.shadow}" stop-opacity="0.18"/>` +
      `<stop offset="100%" stop-color="${C.shadow}" stop-opacity="0"/></radialGradient></defs>` +
      `<ellipse cx="50" cy="94" rx="24" ry="6" fill="url(#gs${id})"/>${aura}${cape}${arms}${body}${legs}${head}${gear}${sparkles}</svg>`;
  }

  function wisp(stage, size) {
    const s = STAGES.includes(stage) ? stage : 'spark';
    const id = `w${uid++}`;
    const aura = s === 'phoenixling' ? `<circle cx="50" cy="50" r="48" fill="url(#wa${id})"/>` : '';
    const wings = s === 'phoenixling'
      ? `<path d="M38 52 Q12 40 14 66 Q26 64 38 62 Z" fill="${C.violet}"/>` +
        `<path d="M62 52 Q88 40 86 66 Q74 64 62 62 Z" fill="${C.violet}"/>` +
        `<path d="M38 56 Q22 50 18 63 Q28 61 38 60 Z" fill="${C.violetShade}" opacity="0.6"/>`
      : s === 'ember'
      ? `<ellipse cx="32" cy="58" rx="7" ry="4" fill="${C.tealDeep}"/><ellipse cx="68" cy="58" rx="7" ry="4" fill="${C.tealDeep}"/>`
      : '';
    const body =
      `<path d="M50 20 C40 36 30 50 50 80 C70 50 60 36 50 20 Z" fill="${C.teal}"/>` +
      `<path d="M50 20 C52 38 56 56 50 80 C70 50 60 36 50 20 Z" fill="${C.tealShade}"/>`;
    const crest = s === 'ember'
      ? `<path d="M38 63 Q50 71 62 63 Q50 67 38 63 Z" fill="${C.gold}"/>` + star(50, 16, 4, C.gold)
      : s === 'phoenixling'
      ? `<polygon points="40,22 44,14 50,20 56,14 60,22" fill="${C.gold}"/>` +
        `<circle cx="50" cy="62" r="4.5" fill="${C.gold}"/><circle cx="50" cy="62" r="2.5" fill="${C.violet}"/>`
      : '';
    const eyes =
      `<ellipse cx="43" cy="48" rx="5" ry="6" fill="${C.white}"/><ellipse cx="57" cy="48" rx="5" ry="6" fill="${C.white}"/>` +
      `<circle cx="43.5" cy="49" r="2.4" fill="${C.navy}"/><circle cx="56.5" cy="49" r="2.4" fill="${C.navy}"/>` +
      `<circle cx="44.4" cy="48" r="0.8" fill="${C.white}"/><circle cx="57.4" cy="48" r="0.8" fill="${C.white}"/>`;

    return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 100 100" role="img" aria-label="Wisp companion: ${cap(s)}">` +
      `<defs><radialGradient id="wa${id}" cx="50%" cy="50%" r="50%">` +
      `<stop offset="0%" stop-color="${C.gold}" stop-opacity="0.4"/>` +
      `<stop offset="60%" stop-color="${C.violet}" stop-opacity="0.16"/>` +
      `<stop offset="100%" stop-color="${C.violet}" stop-opacity="0"/></radialGradient>` +
      `<radialGradient id="ws${id}" cx="50%" cy="50%" r="50%">` +
      `<stop offset="0%" stop-color="${C.shadow}" stop-opacity="0.18"/>` +
      `<stop offset="100%" stop-color="${C.shadow}" stop-opacity="0"/></radialGradient></defs>` +
      `<ellipse cx="50" cy="88" rx="18" ry="4.5" fill="url(#ws${id})"/>${aura}${wings}${body}${crest}${eyes}${star(72, 34, 2.6, C.gold)}</svg>`;
  }

  // The generated app mark (level-up double chevron), as a simple inline SVG.
  function mark(size, withShadow) {
    const arm = (apexY, hw, drop, thick, fill, dy) => {
      const ax = 500, ay = apexY + (dy || 0);
      const lx = 500 - hw, rx = 500 + hw, ey = apexY + drop + (dy || 0);
      const r = thick / 2;
      const seg = (x1, y1, x2, y2) => {
        const dx = x2 - x1, dyy = y2 - y1, len = Math.hypot(dx, dyy) || 1;
        const nx = (-dyy / len) * r, ny = (dx / len) * r;
        return `<polygon points="${x1 + nx},${y1 + ny} ${x2 + nx},${y2 + ny} ${x2 - nx},${y2 - ny} ${x1 - nx},${y1 - ny}" fill="${fill}"/>` +
          `<circle cx="${x1}" cy="${y1}" r="${r}" fill="${fill}"/><circle cx="${x2}" cy="${y2}" r="${r}" fill="${fill}"/>`;
      };
      return seg(ax, ay, lx, ey) + seg(ax, ay, rx, ey);
    };
    const specs = [
      { apexY: 510, fill: C.teal },
      { apexY: 290, fill: C.gold },
    ];
    let body = '';
    if (withShadow) for (const s of specs) body += arm(s.apexY, 235, 205, 150, '#1B1B2A14', 26);
    for (const s of specs) body += arm(s.apexY, 235, 205, 150, s.fill, 0);
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 1000 1000" role="img" aria-label="Levellio">${body}</svg>`;
  }

  global.LevellioArt = { hero, wisp, mark, palette: HERO };
})(window);

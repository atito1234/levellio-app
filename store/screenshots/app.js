/*
 * Renders a framed Levellio store screenshot. Each HTML template calls
 * Levellio.render('<screen>'); the export size is chosen via ?size=appstore
 * (1290x2796, default) or ?size=play (1080x1920). Layout is relative to --w/--h
 * so a full-page capture is pixel-accurate at either size.
 */
(function (global) {
  const A = global.LevellioArt;

  const SIZES = {
    appstore: { w: 1290, h: 2796 },
    play: { w: 1080, h: 1920 },
  };

  const CAPTIONS = {
    onboarding: {
      h: 'Pick your hero.<br>Start your <span class="accent">story</span>.',
      p: 'Turn real-life habits, workouts and goals into an RPG you actually want to play.',
    },
    dashboard: {
      h: 'Every habit is a <span class="accent">quest</span>.',
      p: 'Complete quests, earn XP, and watch your hero level up — one real day at a time.',
    },
    celebrate: {
      h: 'Feel the <span class="accent">win</span>.',
      p: 'Satisfying celebrations make showing up something you look forward to.',
    },
    character: {
      h: 'Level up a hero<br>that’s truly <span class="accent">yours</span>.',
      p: 'Three tiers, an evolving Wisp companion, and gear you earn by living well.',
    },
    premium: {
      h: 'Go further with <span class="accent">Premium</span>.',
      p: 'AI habit coaching, unlimited quests, and exclusive hero cosmetics.',
    },
  };

  const box = (k, svg) => `<div class="art" style="width:calc(var(--w)*${k});height:calc(var(--w)*${k})">${svg}</div>`;
  const statusbar = (light) =>
    `<div class="statusbar${light ? ' light' : ''}"><span>9:41</span><span class="dots">5G &nbsp; ▮▮▮</span></div>`;

  const quest = (icon, bg, title, meta, xp, done) =>
    `<div class="quest${done ? ' done' : ''}">` +
    `<div class="cat" style="background:${bg}">${icon}</div>` +
    `<div class="qt">${title}<small>${meta}</small></div>` +
    `<span class="pill gold">+${xp} XP</span>` +
    `<div class="check${done ? ' done' : ''}">${done ? '✓' : ''}</div></div>`;

  const tierstep = (tier, name, on) =>
    `<div class="tierstep${on ? ' on' : ''}"><div class="ring">${box(0.13, A.hero(tier, 'neutral', '100%'))}</div><span class="nm">${name}</span></div>`;

  const stage = (st, name, on) =>
    `<div class="tierstep${on ? ' on' : ''}"><div class="ring">${box(0.12, A.wisp(st, '100%'))}</div><span class="nm">${name}</span></div>`;

  const feat = (label) => `<div class="feat"><span class="tick">✓</span>${label}</div>`;

  function confetti() {
    const cols = ['#FFB23E', '#16C8A8', '#FFFFFF', '#8b6ff7', '#FFB23E', '#16C8A8'];
    const spots = [
      [8, 14], [22, 8], [37, 18], [58, 10], [74, 15], [88, 12], [14, 30], [30, 38],
      [70, 34], [86, 40], [6, 52], [92, 56], [18, 66], [80, 70], [44, 6], [62, 60],
    ];
    return (
      '<div class="confetti">' +
      spots
        .map(([x, y], i) => `<i style="left:${x}%;top:${y}%;background:${cols[i % cols.length]};transform:rotate(${(i * 47) % 360}deg)"></i>`)
        .join('') +
      '</div>'
    );
  }

  const SCREENS = {
    onboarding: () =>
      statusbar(false) +
      '<div class="content u-col" style="gap:calc(var(--w)*0.04)">' +
        `<div class="brandrow">${box(0.08, A.mark('100%', false))}<span class="name">Levellio</span></div>` +
        '<div class="u-col u-center" style="gap:6px">' +
          '<div class="h-title">Choose your hero</div>' +
          '<div class="h-sub">Same journey — your story. You can change this anytime.</div>' +
        '</div>' +
        '<div class="u-row u-gap" style="align-items:stretch;margin-top:calc(var(--w)*0.02)">' +
          `<div class="herocard sel">${box(0.15, A.hero('novice', 'female', '100%'))}<span class="lbl">Aria</span><span class="pill teal">Selected</span></div>` +
          `<div class="herocard">${box(0.15, A.hero('novice', 'male', '100%'))}<span class="lbl">Kano</span></div>` +
          `<div class="herocard">${box(0.15, A.hero('novice', 'neutral', '100%'))}<span class="lbl">Sky</span></div>` +
        '</div>' +
        '<div class="btn teal" style="margin-top:auto">Begin your journey</div>' +
      '</div>',

    dashboard: () =>
      statusbar(false) +
      '<div class="content u-col" style="gap:calc(var(--w)*0.032)">' +
        '<div class="u-row u-between">' +
          '<div class="u-col"><div class="h-sub" style="margin:0">Good evening 👋</div><div class="h-title">Tito the Pathfinder</div></div>' +
          box(0.16, A.hero('pathfinder', 'male', '100%')) +
        '</div>' +
        '<div class="card u-col" style="gap:calc(var(--w)*0.02)">' +
          '<div class="u-row u-between"><strong style="font-size:calc(var(--w)*0.034);color:var(--text)">Level 7</strong><span class="pill violet">Pathfinder</span></div>' +
          '<div class="bar"><i style="width:64%"></i></div>' +
          '<div class="h-sub" style="margin:0">320 / 500 XP to Level 8</div>' +
        '</div>' +
        '<div class="u-row u-between" style="margin-top:calc(var(--w)*0.005)"><strong style="font-size:calc(var(--w)*0.034);color:var(--text)">Today’s quests</strong><span class="h-sub" style="margin:0">2 of 5 done</span></div>' +
        '<div class="card" style="padding:0;overflow:hidden">' +
          quest('🏋️', 'var(--tealSoft)', 'Morning workout', 'Fitness · 30 min', 30, true) +
          quest('🧠', 'var(--violetSoft)', 'Read 10 pages', 'Mind', 20, true) +
          quest('💧', 'var(--tealSoft)', 'Drink 2L water', 'Health', 10, false) +
          quest('✍️', 'var(--goldSoft)', 'Journal one win', 'Creativity', 15, false) +
        '</div>' +
      '</div>' +
      '<div class="tabbar">' +
        '<div class="tab on"><span class="ic">🏠</span>Home</div>' +
        '<div class="tab"><span class="ic">⚔️</span>Quests</div>' +
        '<div class="tab"><span class="ic">🦸</span>Hero</div>' +
        '<div class="tab"><span class="ic">⚙️</span>Settings</div>' +
      '</div>',

    celebrate: () =>
      statusbar(true) +
      '<div class="content violet u-col u-center" style="gap:calc(var(--w)*0.025);position:relative">' +
        confetti() +
        '<div style="position:relative;width:calc(var(--w)*0.46);height:calc(var(--w)*0.46)">' +
          `<div class="art" style="position:absolute;inset:0">${A.hero('pathfinder', 'male', '100%')}</div>` +
          `<div class="art" style="position:absolute;right:-6%;bottom:-2%;width:42%;height:42%">${A.wisp('ember', '100%')}</div>` +
        '</div>' +
        '<div class="cel-title">Quest Complete!</div>' +
        '<div class="xpburst">+50 XP</div>' +
        '<div style="width:78%">' +
          '<div class="bar teal" style="background:rgba(255,255,255,0.25)"><i style="width:72%"></i></div>' +
          '<div class="cel-sub" style="margin-top:calc(var(--w)*0.015)">Level 7 — almost to Pathfinder II</div>' +
        '</div>' +
        '<div class="btn ghost" style="width:62%;margin-top:calc(var(--w)*0.02)">Share your win</div>' +
      '</div>',

    character: () =>
      statusbar(false) +
      '<div class="content u-col" style="gap:calc(var(--w)*0.028)">' +
        '<div class="eyebrow u-center">Your hero</div>' +
        `<div class="u-center">${box(0.42, A.hero('luminary', 'female', '100%'))}</div>` +
        '<div class="u-col u-center" style="gap:2px">' +
          '<div class="h-title">Aria the Luminary</div>' +
          '<div class="h-sub" style="margin:0">Level 12 · 4,820 XP</div>' +
        '</div>' +
        '<div class="card u-col" style="gap:calc(var(--w)*0.018)">' +
          '<strong style="font-size:calc(var(--w)*0.03);color:var(--text)">Hero journey</strong>' +
          '<div class="u-row">' + tierstep('novice', 'Novice', false) + tierstep('pathfinder', 'Pathfinder', false) + tierstep('luminary', 'Luminary', true) + '</div>' +
        '</div>' +
        '<div class="card u-col" style="gap:calc(var(--w)*0.018)">' +
          '<strong style="font-size:calc(var(--w)*0.03);color:var(--text)">Wisp companion</strong>' +
          '<div class="u-row">' + stage('spark', 'Spark', false) + stage('ember', 'Ember', false) + stage('phoenixling', 'Phoenixling', true) + '</div>' +
        '</div>' +
        '<div class="u-row u-gap u-center"><span class="pill gold">🔥 28-day streak</span><span class="pill teal">✅ 142 quests done</span></div>' +
      '</div>' +
      '<div class="tabbar">' +
        '<div class="tab"><span class="ic">🏠</span>Home</div>' +
        '<div class="tab"><span class="ic">⚔️</span>Quests</div>' +
        '<div class="tab on"><span class="ic">🦸</span>Hero</div>' +
        '<div class="tab"><span class="ic">⚙️</span>Settings</div>' +
      '</div>',

    premium: () =>
      statusbar(false) +
      '<div class="content u-col" style="gap:calc(var(--w)*0.03)">' +
        '<div class="eyebrow">Settings · Premium</div>' +
        '<div class="card u-col" style="gap:calc(var(--w)*0.02);background:linear-gradient(135deg,#fff,var(--goldSoft));border-color:var(--gold)">' +
          '<div class="u-row u-between">' +
            `<div class="u-row" style="gap:calc(var(--w)*0.02)">${box(0.1, A.mark('100%', false))}<div class="u-col"><strong style="font-size:calc(var(--w)*0.04);color:var(--text)">Levellio Premium</strong><span class="h-sub" style="margin:0">Unlock your full potential</span></div></div>` +
            '<span class="pill gold">$4.99/mo</span>' +
          '</div>' +
        '</div>' +
        '<div class="card u-col">' +
          feat('AI habit coach &amp; smart quest ideas') +
          feat('Unlimited quests, goals &amp; habits') +
          feat('Exclusive hero cosmetics &amp; capes') +
          feat('Advanced stats, insights &amp; trends') +
          feat('Cloud sync across all your devices') +
        '</div>' +
        '<div class="btn gold">Go Premium</div>' +
        '<div class="h-sub u-center" style="margin:0">Free plan: 5 quests/day · core hero &amp; Wisp · local-only</div>' +
      '</div>',
  };

  function render(screen) {
    const params = new URLSearchParams(global.location.search);
    const size = SIZES[params.get('size') || ''] || SIZES.appstore;
    const cap = CAPTIONS[screen];
    const root = document.createElement('div');
    root.className = 'canvas';
    root.style.setProperty('--w', size.w + 'px');
    root.style.setProperty('--h', size.h + 'px');
    root.innerHTML =
      `<header class="caption"><h1>${cap.h}</h1><p>${cap.p}</p></header>` +
      '<div class="phone-wrap"><div class="phone"><div class="island"></div>' +
      `<div class="screen">${SCREENS[screen]()}</div></div></div>`;
    document.body.appendChild(root);
    document.title = `Levellio — ${screen} (${size.w}×${size.h})`;
    fitPhone(root);
    if (global.addEventListener) {
      global.addEventListener('load', () => fitPhone(root));
      global.addEventListener('resize', () => fitPhone(root));
    }
  }

  // Scale the device so it always fits the free space below the caption,
  // keeping the in-screen UI proportions identical across export sizes.
  function fitPhone(root) {
    if (!root || typeof root.querySelector !== 'function') return; // no DOM (tests)
    const wrap = root.querySelector('.phone-wrap');
    const phone = root.querySelector('.phone');
    if (!wrap || !phone) return;
    phone.style.transform = 'scale(1)';
    const s = Math.min((wrap.clientWidth * 0.96) / phone.offsetWidth, (wrap.clientHeight * 0.98) / phone.offsetHeight);
    phone.style.transform = `scale(${s})`;
  }

  global.Levellio = { render, SIZES };
})(window);

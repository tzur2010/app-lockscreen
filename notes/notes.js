// ============================================================================
// אפליקציית "פתקים" לקוסמים - 100 מפורסמים
// ----------------------------------------------------------------------------
// הצופה זורק שם של מפורסם ומספר בין 1 ל-100. הקוסם לוחץ על 🔍 ומקליד בסתר את השם
// והמספר (למשל "ישי ריבו 82", בכל סדר). על המסך רואים רק את מילת החיפוש התמימה
// ("מפורסמים"). לוחצים על הפתק שמופיע (או "חפש" במקלדת) - ובשורה 82 כתוב ישי ריבו.
// אם השם כבר היה ברשימה במקום אחר, הוא מוחלף שם בשם שהיה במקום 82 (אין כפילויות).
// הגדרות הקוסם: ⋮ למעלה ← "הגדרות".
// ============================================================================
(function () {
  const STORE = 'magic_notes_100_v1';
  const DEFAULT_NAMES = ['נועה קירל', 'עומר אדם', 'אייל גולן', 'שרית חדד', 'עדן בן זקן', 'סטטיק', 'בן אל תבורי', 'אושר כהן', 'עידן רייכל', 'שלמה ארצי',
    'אביב גפן', 'ריטה', 'משה פרץ', 'עברי לידר', 'נטע ברזילי', 'אליעד נחום', 'דודו אהרון', 'מרגי', 'אגם בוחבוט', 'ישי ריבו',
    'חנן בן ארי', 'עקיבא', 'נסרין קדרי', 'שירי מימון', 'הראל סקעת', 'מאיה בוסקילה', 'קרן פלס', 'יהודית רביץ', 'אריק אינשטיין', 'זוהר ארגוב',
    'אהוד בנאי', 'מוקי', 'שלום חנוך', 'אתי אנקרי', 'גלי עטרי', 'אסף אמדורסקי', 'ברי סחרוף', 'דנה אינטרנשיונל', 'יובל דיין', 'אנה זק',
    'נועה תשבי', 'גל גדות', 'ליאור רז', 'צחי הלוי', 'יהודה לוי', 'אסי כהן', 'גורי אלפי', 'אדיר מילר', 'שלום אסייג', 'צביקה הדר',
    'אסי עזר', 'רותם סלע', 'בר רפאלי', 'יעל בר זוהר', 'לוסי אהריש', 'אורנה בנאי', 'אלי יצפאן', 'מני ממטרה', 'טל מוסרי', 'אברי גלעד',
    'גיא פינס', 'ליאור שליין', 'יונית לוי', 'דני קושמרו', 'אילנה דיין', 'רינה מצליח', 'ירדנה ארזי', 'עופרה חזה', 'חיים משה', 'קובי פרץ',
    'עדן חסון', 'אודיה', 'אנה ארונוב', 'שחר חסון', 'עומרי כספי', 'ערן זהבי', 'יוסי בניון', 'מנור סולומון', 'יעל ארד', 'לינוי אשרם',
    'ארטיום דולגופיאט', 'גל פרידמן', 'שחר פאר', 'דני אבדיה', 'טל ברודי', "מיקי ברקוביץ'", 'אבי נמני', 'אלי אוחנה', "אייל ברקוביץ'", 'ששון גבאי',
    'מוני מושונוב', 'שייקה אופיר', 'חיים טופול', 'ספי ריבלין', 'טוביה צפיר', 'יגאל שילון', 'אורי גלר', 'נינט טייב', 'שלומי שבת', 'מרגלית צנעני'];
  (function shuffleFixed(arr) {
    let s = 20261124;
    const r = () => (s = (s * 16807) % 2147483647) / 2147483647;
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(r() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
  })(DEFAULT_NAMES);

  const DECOYS = [
    { t: 'רשימת קניות', body: 'חלב\nלחם\nביצים\nעגבניות\nגבינה צהובה\nבמבה לילדים\nשמן זית', d: 2 },
    { t: 'רעיונות לטיול', body: '1. עין גדי\n2. נחל עמוד\n3. ראש הנקרה\n4. מכתש רמון\nלבדוק מזג אוויר!', d: 6 },
    { t: 'מתכון עוגה', body: '3 ביצים\nכוס סוכר\nחצי כוס שמן\nכוס קמח תופח\n4 כפות קקאו\n180 מעלות, 35 דק׳', d: 47 }
  ];

  const DEF = { title: '100 מפורסמים', decoy: 'מפורסמים', ageDays: 19, names: '' };
  let cfg = load();
  function load() {
    try { return Object.assign({}, DEF, JSON.parse(localStorage.getItem(STORE) || '{}')); } catch (e) { return Object.assign({}, DEF); }
  }
  function save() {
    try { localStorage.setItem(STORE, JSON.stringify(cfg)); } catch (e) {}
  }

  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const norm = (s) => String(s || '').replace(/[\s'"`׳״\-.]/g, '').toLowerCase();

  // רשימה של בדיוק 100 שמות: מה שהקוסם כתב, ומשלימים מברירת המחדל
  function buildNames(custom) {
    const out = [];
    const seen = new Set();
    const add = (n) => {
      const v = String(n || '').trim();
      if (!v || seen.has(norm(v)) || out.length >= 100) return;
      seen.add(norm(v));
      out.push(v);
    };
    String(custom || '').split('\n').forEach(add);
    DEFAULT_NAMES.forEach(add);
    return out;
  }
  // "ישי ריבו 82" / "82 ישי ריבו" -> { name, num }
  function parseSecret(raw) {
    const s = String(raw || '');
    const m = s.match(/\d+/);
    const num = m ? Number(m[0]) : 0;
    const name = s.replace(/\d+/g, ' ').replace(/[.,;:#]/g, ' ').replace(/\s+/g, ' ').trim();
    return { name, num: num >= 1 && num <= 100 ? num : 0 };
  }

  let names = buildNames(cfg.names);
  let shown = names.slice();
  function inject(name, num) {
    shown = names.slice();
    if (!name || !num) return;
    const k = num - 1;
    const j = shown.findIndex((n, i) => i !== k && norm(n) === norm(name));
    if (j >= 0) shown[j] = shown[k];
    shown[k] = name;
  }

  const dayDate = (daysAgo) => new Date(Date.now() - daysAgo * 86400000);
  const shortDate = (d) => new Intl.DateTimeFormat('he-IL', { day: 'numeric', month: 'short' }).format(d);
  function groupName(d) {
    const now = new Date();
    if (d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()) return 'החודש הנוכחי';
    return new Intl.DateTimeFormat('he-IL', { month: 'long', year: d.getFullYear() === now.getFullYear() ? undefined : 'numeric' }).format(d);
  }

  function trickNote() {
    return { t: cfg.title || DEF.title, body: shown.map((n, i) => `${i + 1} ${n}`).join('\n'), d: Number(cfg.ageDays) || DEF.ageDays, trick: true };
  }
  function allNotes() {
    return DECOYS.concat([trickNote()]).sort((a, b) => a.d - b.d);
  }

  const IC = {
    menu: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"><path d="M4 6.5h16M4 12h16M4 17.5h16"/></svg>',
    search: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="10.8" cy="10.8" r="6.3"/><path d="M15.6 15.6l4.6 4.6"/></svg>',
    pdf: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"><path d="M6 3.5h8.5L19 8v12.5H6z"/><path d="M14 3.5V8.5h5"/><text x="12.4" y="17.6" text-anchor="middle" font-size="5.4" font-family="sans-serif" font-weight="700" fill="currentColor" stroke="none">PDF</text></svg>',
    more: '<svg viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="5.5" r="1.7"/><circle cx="12" cy="12" r="1.7"/><circle cx="12" cy="18.5" r="1.7"/></svg>',
    fab: '<svg viewBox="0 0 24 24" fill="none" stroke="#ef4a2f" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M19 13.5V19a1.5 1.5 0 0 1-1.5 1.5h-12A1.5 1.5 0 0 1 4 19V7a1.5 1.5 0 0 1 1.5-1.5H11"/><path d="M10 15l.8-3.6 8-8 2.8 2.8-8 8z"/></svg>',
    back: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 5l7 7-7 7"/></svg>',
    book: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"><path d="M3 5.5C5.5 4.5 8.5 4.5 12 6.5c3.5-2 6.5-2 9-1v13c-2.5-1-5.5-1-9 1-3.5-2-6.5-2-9-1z"/><path d="M12 6.5v13"/></svg>',
    plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M12 4.5v15M4.5 12h15"/></svg>',
    undo: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M9 7L4.5 11.5 9 16"/><path d="M5 11.5h9.5a5 5 0 0 1 0 10H12"/></svg>',
    redo: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M15 7l4.5 4.5L15 16"/><path d="M19 11.5H9.5a5 5 0 0 0 0 10H12"/></svg>',
    ai: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M10 3l1.8 5.2L17 10l-5.2 1.8L10 17l-1.8-5.2L3 10l5.2-1.8z"/><path d="M17.5 14l.9 2.6 2.6.9-2.6.9-.9 2.6-.9-2.6-2.6-.9 2.6-.9z"/></svg>',
    caret: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M7 10h10l-5 5.5z"/></svg>',
    tbox: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="4" y="4" width="16" height="16" rx="3"/><path d="M8.5 8.5h7M12 8.5v7.5" stroke-linecap="round"/></svg>',
    tfmt: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M6 5h12M12 5v11M5 20.5h14"/></svg>',
    check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"><rect x="4" y="4" width="16" height="16" rx="3"/><path d="M8 12.3l2.8 2.7L16.3 9" stroke-linecap="round"/></svg>',
    hand: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M5 19l1-4 9-9 3 3-9 9z"/><path d="M14 20c2 0 4-.8 5.5-2"/></svg>'
  };

  const app = document.getElementById('app');
  app.innerHTML = `
    <section class="pg pg-on" data-pg="list">
      <div class="scroll" data-list-scroll>
        <div class="hero"><h1>כל ההערות</h1><div class="cnt" data-count></div></div>
        <div class="bar"><span class="ib">${IC.menu}</span><span class="sp"></span><span class="ib">${IC.pdf}</span><span class="ib" data-search>${IC.search}</span><span class="ib" data-more>${IC.more}</span></div>
        <div data-grid></div>
      </div>
      <div class="fab">${IC.fab}</div>
      <div class="menu" data-menu><div data-act="edit">עריכה</div><div data-act="view">תצוגה</div><div data-act="settings">הגדרות</div></div>
    </section>

    <section class="pg" data-pg="search">
      <div class="sbar">
        <span class="ib" data-back>${IC.back}</span>
        <label class="field">
          <span class="field-txt"><span data-decoy></span><i class="caret"></i><span class="ph" data-ph>חיפוש</span></span>
          <input class="real" data-real type="text" inputmode="text" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" enterkeyhint="search" aria-label="חיפוש">
        </label>
      </div>
      <div class="scroll sres"><div class="grid" data-results></div><div class="none" data-none>אין תוצאות</div></div>
    </section>

    <section class="pg" data-pg="note">
      <div class="nbar"><span class="ib" data-back>${IC.back}</span><span class="ntitle" data-ntitle></span><span class="sp"></span><span class="ib">${IC.book}</span><span class="ib">${IC.plus}</span><span class="ib">${IC.more}</span></div>
      <div class="scroll nscroll"><div class="nbody" data-nbody></div></div>
      <div class="tools">
        <span class="t off">${IC.undo}</span><span class="t off">${IC.redo}</span>
        <span class="t">${IC.ai}<i class="cr">${IC.caret}</i></span>
        <span class="t aa"><i class="cr">${IC.caret}</i>Aa</span>
        <span class="t">${IC.tbox}</span><span class="t">${IC.tfmt}</span><span class="t">${IC.check}</span>
        <span class="t pen">${IC.hand}</span>
      </div>
    </section>

    <section class="pg" data-pg="settings">
      <div class="nbar"><span class="ib" data-back>${IC.back}</span><span class="ntitle">הגדרות הקסם</span></div>
      <div class="scroll set">
        <div class="card how">
          <b>איך עושים את הקסם</b>
          1. הצופה זורק שם של מפורסם, ואחר כך מספר בין 1 ל-100.<br>
          2. לוחצים על 🔍 ומקלידים את השם והמספר, למשל <b>ישי ריבו 82</b> (הסדר לא משנה). על המסך רואים רק את המילה שבחרת למטה.<br>
          3. לוחצים על הפתק שמופיע (או "חפש" במקלדת), וגוללים יחד עם הצופה למספר שלו.<br>
          חוזרים לכאן: ⋮ למעלה ← הגדרות.
        </div>
        <label class="lbl">שם הפתק</label>
        <input class="inp" data-set="title" maxlength="40" placeholder="${DEF.title}">
        <label class="lbl">מה רואים בשורת החיפוש כשאתה מקליד</label>
        <input class="inp" data-set="decoy" maxlength="20" placeholder="${DEF.decoy}">
        <div class="hint">כדאי מילה מתוך שם הפתק, כדי שהוא יופיע בתוצאות.</div>
        <label class="lbl">לפני כמה ימים "נכתב" הפתק</label>
        <input class="inp" data-set="ageDays" type="number" min="1" max="400" inputmode="numeric">
        <label class="lbl">100 השמות (שם בכל שורה) <span data-ncount></span></label>
        <textarea class="inp ta" data-set="names" rows="10"></textarea>
        <button type="button" class="btn" data-reset>החזר את רשימת ברירת המחדל</button>
      </div>
    </section>`;

  const q = (s) => app.querySelector(s);
  const real = q('[data-real]');
  let stack = ['list'];

  function show(id, goingBack) {
    app.querySelectorAll('.pg').forEach((p) => p.classList.remove('pg-on', 'pg-back'));
    const p = q(`[data-pg="${id}"]`);
    p.classList.add('pg-on');
    if (goingBack) p.classList.add('pg-back');
    if (id !== 'search') real.blur();
    q('[data-menu]').classList.remove('open');
  }
  function go(id) { stack.push(id); show(id); }
  function back() {
    if (stack.length <= 1) return false;
    const leaving = stack.pop();
    if (leaving === 'settings') { names = buildNames(cfg.names); shown = names.slice(); renderList(); }
    show(stack[stack.length - 1], true);
    return true;
  }

  function card(n, hl) {
    let title = esc(n.t);
    if (hl) {
      const i = n.t.indexOf(hl);
      if (i >= 0) title = esc(n.t.slice(0, i)) + '<mark>' + esc(hl) + '</mark>' + esc(n.t.slice(i + hl.length));
    }
    const lines = n.body.split('\n').slice(0, 12).map((l) => `<div>${esc(l) || '&nbsp;'}</div>`).join('');
    return `<div class="card-n" ${n.trick ? 'data-open' : 'data-other'}><div class="thumb">${lines}</div><div class="ct">${title}</div><div class="cd">${shortDate(dayDate(n.d))}</div></div>`;
  }

  function renderList() {
    const notes = allNotes();
    q('[data-count]').textContent = `${notes.length} הערות`;
    let html = '';
    let cur = null;
    notes.forEach((n) => {
      const g = groupName(dayDate(n.d));
      if (g !== cur) {
        if (cur !== null) html += '</div>';
        html += `<div class="sec">${esc(g)}</div><div class="grid">`;
        cur = g;
      }
      html += card(n);
    });
    q('[data-grid]').innerHTML = html + (cur !== null ? '</div>' : '');
  }

  // מה שהקוסם מקליד נשאר בשדה נסתר; על המסך מופיעה מילת החיפוש התמימה, אות אחרי אות
  function renderSearch() {
    const decoy = (cfg.decoy || '').trim() || DEF.decoy;
    const vis = decoy.slice(0, Math.min(Array.from(real.value).length, decoy.length));
    q('[data-decoy]').textContent = vis;
    q('[data-ph]').style.display = vis ? 'none' : '';
    const res = vis ? allNotes().filter((n) => n.t.includes(vis)) : [];
    q('[data-results]').innerHTML = res.map((n) => card(n, vis)).join('');
    q('[data-none]').style.display = vis && !res.length ? '' : 'none';
  }

  function openNote(fromSearch) {
    if (fromSearch) {
      const { name, num } = parseSecret(real.value);
      inject(name, num);
      renderList();
    }
    const n = trickNote();
    q('[data-ntitle]').textContent = n.t;
    q('[data-nbody]').innerHTML = shown.map((nm, i) => `<div class="ln"><span class="num">${i + 1}</span><span>${esc(nm)}</span></div>`).join('');
    go('note');
    q('.nscroll').scrollTop = 0;
  }

  function openSettings() {
    app.querySelectorAll('[data-set]').forEach((el) => {
      const k = el.dataset.set;
      el.value = k === 'names' ? buildNames(cfg.names).join('\n') : (k === 'ageDays' ? cfg.ageDays : (cfg[k] || ''));
    });
    countNames();
    go('settings');
  }
  function countNames() {
    const n = q('[data-set="names"]').value.split('\n').filter((l) => l.trim()).length;
    q('[data-ncount]').textContent = n >= 100 ? '' : `(${n}/100 - השאר יושלמו מהרשימה הרגילה)`;
  }

  app.addEventListener('click', (e) => {
    const t = e.target;
    if (t.closest('[data-back]')) return back();
    if (t.closest('[data-search]')) {
      real.value = '';
      renderSearch();
      go('search');
      try { real.focus({ preventScroll: true }); } catch (err) { real.focus(); }
      return;
    }
    if (t.closest('[data-more]')) return q('[data-menu]').classList.toggle('open');
    const act = t.closest('[data-act]');
    if (act) {
      q('[data-menu]').classList.remove('open');
      if (act.dataset.act === 'settings') openSettings();
      return;
    }
    if (t.closest('[data-reset]')) {
      cfg.names = '';
      save();
      q('[data-set="names"]').value = DEFAULT_NAMES.join('\n');
      countNames();
      return;
    }
    if (t.closest('[data-open]')) return openNote(stack[stack.length - 1] === 'search');
    q('[data-menu]').classList.remove('open');
  });

  real.addEventListener('input', renderSearch);
  real.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); openNote(true); }
  });
  real.addEventListener('focus', () => app.classList.add('typing'));
  real.addEventListener('blur', () => app.classList.remove('typing'));

  app.querySelectorAll('[data-set]').forEach((el) => {
    el.addEventListener('input', () => {
      const k = el.dataset.set;
      if (k === 'names') {
        const lines = el.value.split('\n').map((l) => l.trim()).filter(Boolean).slice(0, 100).join('\n');
        cfg.names = lines === DEFAULT_NAMES.join('\n') ? '' : lines;
        countNames();
      } else if (k === 'ageDays') {
        cfg.ageDays = Math.max(1, Math.min(400, Number(el.value) || DEF.ageDays));
      } else {
        cfg[k] = el.value;
      }
      save();
    });
  });

  // כפתור "חזרה" של הטלפון: חוזרים מסך אחד אחורה, כמו באפליקציה אמיתית
  // (ב-APK הכפתור מטופל ב-MainActivity דרך NotesBack; כאן - לגרסת האתר)
  if (location.protocol !== 'file:') {
    try {
      history.pushState({ n: 1 }, '');
      window.addEventListener('popstate', () => {
        back();
        history.pushState({ n: 1 }, '');
      });
    } catch (e) {}
  }
  window.NotesBack = back; // לעטיפת האנדרואיד

  renderList();
  if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(() => {});
})();

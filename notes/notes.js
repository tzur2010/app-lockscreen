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

  // הפתקים מהטלפון של הקוסם (מהסרטון), אחד לאחד.
  // סימונים בגוף הפתק: "~" = דף חדש | "_" בתחילת שורה = נטוי | "3  טקסט" (מספר ושני רווחים) = שורה ממוספרת
  // "!" בתחילת שורה = HTML (הסימונים הצבעוניים במטלות)
  const DECOYS = [
    { id: 'u1', t: 'הערת טקסט 21.11', date: new Date(2026, 10, 21, 20, 14), body: 'טעיתי ב-1מ' },
    { id: 'u2', t: 'קסמי קלפים', date: new Date(2026, 10, 16, 22, 3), body: [
      '1  קלף עקשן', '2.הקלף המתחלף (קלף כפול)', 'הקלפים שמשנים הכל', 'הקוסם הרשלן', 'ספירה לאחור', '',
      '2.קריאת מחשבות עם תלפ"י (תלתן, לב, עלה, יהלום)', '1  קריאת מחשבות עם פורסים', '_להלנן פורסים:', '',
      '2  פורסים על הקלף הראשון בחבילה תמיד:', 'לתת למתנדב לחתוך את החבילה איפה שהוא רוצה ואז להסיח את דעתו ולהראות לו כאילו הוא חתך על הקלף הכי למעלה', '', '',
      'להוריד קלפים שהחבילה על הצד וברגע שמתחילים לוקחים ביחד איתך את הקלף הכי עליון מתי שהוא אומר סטופ אתה מביא לו אותו',
      '~',
      'להוריד קלפים מלמעלה עד שהוא אומר סטופ ולהראות לו את ההכי למטה (פורס לקלף הכי תחתון בערמה)', '',
      'להחזיק את הערמה על הצד לרפרף ושהוא אומר סטופ לעשות תתנועה גדולה ותוך כדי להגניב את הקלף למעלה', '',
      'לעשות קאט ואז לשמור פניקי להגיד לו לומר לך סטופ ולא משנה מה להרים איפה שהפנקי', '',
      'להגיד לו שאתה הולך להוריד קלפים ושהוא רוצה שיגיד סטופ ואז בקלף השלישי לקטוע את עצמך בדיבור ופשוט לפרוס את הקלפים לומר שיגע במה שהוא רוצה ואז לקפל הכל שזה יראה כאילו זה הקלף הראשון', '', '',
      '5  החלפת קלפים ביד של המתנדב', '2  קריאת מחשבות לחמישה אנשים ביחד עם קיק',
      '~',
      '  קארדאים', '3  שוטרים וגנבים', '4  קלף תאום', '5  למצוא את כל רביעית קלפים שתבחר', '6  שחור אדום לפי אינטואיציה', '7  קלף מפתח קסם פשוט לכל דבר',
      '8  קסם שהחבילה מאייתת את בקלף', '9  חזרה אחורה בזמן', '10  הגנבת קלף קסם מיומנות', '11  קסם הסיפור', '12  להפוך את הקלפים למטה ואז זה נראה שהחבילה התהפכה',
      '_ערבובי דמה בקלפים:', '', '', '1  קאט משולש רגיל', '2  אליקס 190', '_דברים מרשימים:',
      '~',
      '1  מניפה',
      '~', ''
    ].join('\n') },
    { id: 'u3', t: 'הערת טקסט 14.11', date: new Date(2026, 10, 14, 21, 40), body: 'שלוש תלתן\nארבע לב\nמלך יהלום\nגוקר\nשלוש לב' },
    { id: 'u4', t: 'מטלות', date: new Date(2026, 10, 1, 18, 25), body: [
      '!<div class="mt">דחוף ממש = <i class="hl hl-r">...........</i></div>',
      '!<div class="mt">בנוני = <i class="hl hl-y">...........</i></div>',
      '!<div class="mt">בזמני הפנוי = <i class="hl hl-g">...........</i></div>',
      '!<div class="mt"><b class="mk mk-r">לבנות את הדמקה</b></div>',
      '!<div class="mt"><b class="mk mk-g">ללמוד קסמים</b></div>',
      '~', ''
    ].join('\n') }
  ];

  // mic: האפליקציה שומעת את הצופה | searchMode: 'spectator' = הצופה מקליד בעצמו, 'secret' = אתה מקליד בסתר
  const DEF = { title: '100 מפורסמים', decoy: 'מפורסמים', ageDays: 19, names: '', mic: false, searchMode: 'spectator', vibe: true, volKeys: true };
  let cfg = load();
  // 1.4: המיקרופון לא אמין ב-100% -> כבוי כברירת מחדל (פעם אחת; אפשר להדליק בהגדרות)
  if (!cfg.micOff14) { cfg.mic = false; cfg.micOff14 = true; save(); }
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
    const date = dayDate(Number(cfg.ageDays) || DEF.ageDays);
    date.setHours(21, 47, 0, 0);
    return { id: 'trick', t: cfg.title || DEF.title, body: shown.map((n, i) => `${i + 1}  ${n}`).join('\n'), date, trick: true };
  }
  // פתקים שהצופה כתב עכשיו (רק עד שסוגרים את האפליקציה - לא נשמרים)
  const fresh = [];
  function allNotes() {
    return fresh.concat(DECOYS, [trickNote()]).sort((a, b) => b.date - a.date);
  }
  const noteById = (id) => allNotes().find((n) => n.id === id);

  // שורה אחת בגוף הפתק -> HTML (אותו דבר בתצוגה המוקטנת ובפתק עצמו)
  function lineHtml(l) {
    if (l.startsWith('!')) return l.slice(1);
    if (!l.trim()) return '<div class="pl pl-empty">&nbsp;</div>';
    if (l.startsWith('_')) return `<div class="pl pl-i">${esc(l.slice(1))}</div>`;
    const m = l.match(/^(\d*)\s{2}(.*)$/);
    if (m) return `<div class="ln"><span class="num">${m[1]}</span><span>${esc(m[2])}</span></div>`;
    return `<div class="pl">${esc(l)}</div>`;
  }

  const IC = {
    menu: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"><path d="M4 6.5h16M4 12h16M4 17.5h16"/></svg>',
    search: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="10.8" cy="10.8" r="6.3"/><path d="M15.6 15.6l4.6 4.6"/></svg>',
    pdf: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" stroke-linecap="round"><path d="M14 20.5H6V3.5h8.5L19 8v5"/><path d="M14 3.5V8.5h5"/><text x="11.3" y="15.2" text-anchor="middle" font-size="5.2" font-family="sans-serif" font-weight="700" fill="currentColor" stroke="none">PDF</text><path d="M18.5 15.5v6M15.5 18.5h6"/></svg>',
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
    gear: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="3"/><path d="M12 2.8l1.6 2.3 2.7-.7.6 2.7 2.6 1-1 2.6 1.6 2.3-2.3 1.6.3 2.8-2.8.2-1.1 2.6-2.5-1.3-2.5 1.3-1.1-2.6-2.8-.2.3-2.8L4.2 14l1.6-2.3-1-2.6 2.6-1 .6-2.7 2.7.7z" stroke-linejoin="round"/></svg>',
    notesIc: '<svg viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="3" width="13" height="18" rx="2"/><rect x="4" y="6" width="4" height="1.6" rx=".8" fill="#fff" stroke="currentColor" stroke-width=".8"/><rect x="4" y="11.2" width="4" height="1.6" rx=".8" fill="#fff" stroke="currentColor" stroke-width=".8"/><rect x="4" y="16.4" width="4" height="1.6" rx=".8" fill="#fff" stroke="currentColor" stroke-width=".8"/></svg>',
    shared: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"><path d="M6 3.5h9l3 3V12M6 3.5v17h6"/><circle cx="15" cy="14.5" r="1.8"/><circle cx="19.2" cy="14.8" r="1.5"/><path d="M11.8 20.5c.4-2 1.6-3 3.2-3s2.8 1 3.2 3M17.5 17.6c1.8-.3 3 .7 3.3 2.9"/></svg>',
    trash: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M4.5 6.5h15M9.5 6.5V4.5h5v2M6.5 6.5l1 13.5h9l1-13.5M10.2 10v6.5M13.8 10v6.5"/></svg>',
    folder: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"><path d="M3.5 6.5a1.5 1.5 0 0 1 1.5-1.5h4.5l2 2.2H19a1.5 1.5 0 0 1 1.5 1.5V18a1.5 1.5 0 0 1-1.5 1.5H5A1.5 1.5 0 0 1 3.5 18z"/></svg>',
    mic: '<svg viewBox="0 0 24 24" fill="currentColor"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>',
    chevUp: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 15l6-6 6 6"/></svg>',
    hand: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M5 19l1-4 9-9 3 3-9 9z"/><path d="M14 20c2 0 4-.8 5.5-2"/></svg>'
  };

  const app = document.getElementById('app');
  app.innerHTML = `
    <section class="pg pg-on" data-pg="list">
      <div class="scroll" data-list-scroll>
        <div class="hero" data-hero><h1 data-peek>כל ההערות</h1><div class="cnt" data-count></div></div>
        <div class="bar" data-bar><span class="ib" data-drawer>${IC.menu}</span><span class="bar-t">כל ההערות</span><span class="sp"></span><span class="ib">${IC.pdf}</span><span class="ib" data-search>${IC.search}</span><span class="ib" data-more>${IC.more}</span></div>
        <div data-grid></div>
      </div>
      <div class="fab" data-new>${IC.fab}</div>
      <div class="menu" data-menu><div data-act="edit">עריכה</div><div data-act="view">תצוגה</div><div data-act="settings">הגדרות</div></div>
      <div class="dim" data-dim></div>
      <div class="drawer" data-drawer-panel>
        <div class="dr-top"><span class="ib dr-gear" data-act="settings">${IC.gear}</span></div>
        <div class="dr-item on">${IC.notesIc}<span>כל ההערות</span><i data-dcount></i></div>
        <div class="dr-item">${IC.shared}<span>פתקים משותפים <em>BETA</em></span><i></i></div>
        <div class="dr-item">${IC.trash}<span>סל מיחזור</span><i>1</i></div>
        <div class="dr-sep"></div>
        <div class="dr-item">${IC.folder}<span>תיקיות</span><i>4</i></div>
        <div class="dr-btn">נהל תיקיות</div>
      </div>
    </section>

    <section class="pg" data-pg="new">
      <div class="nbar"><span class="ib" data-back>${IC.back}</span>
        <input class="new-t" data-new-t type="text" placeholder="כותרת" autocomplete="off" autocorrect="off" spellcheck="false" dir="rtl">
        <span class="ib">${IC.book}</span><span class="ib">${IC.plus}</span><span class="ib">${IC.more}</span></div>
      <div class="scroll nscroll newnote">
        <div class="npage new-page"><textarea class="new-b" data-new-b placeholder="" dir="rtl"></textarea></div>
      </div>
      <div class="tools">
        <span class="t off">${IC.undo}</span><span class="t off">${IC.redo}</span>
        <span class="t">${IC.ai}</span>
        <span class="t aa"><i class="cr">${IC.caret}</i>15</span>
        <span class="t aa"><i class="cr">${IC.caret}</i>Aa</span>
        <span class="t">${IC.tbox}</span><span class="t">${IC.tfmt}</span><span class="t">${IC.check}</span>
        <span class="t pen">${IC.hand}</span>
      </div>
    </section>

    <section class="pg" data-pg="search">
      <div class="sbar"><span class="ib" data-back>${IC.back}</span></div>
      <div class="scroll sres">
        <div data-sidle>
          <div class="flt-h">מסננים<span class="flt-up">${IC.chevUp}</span></div>
          <div class="flt">
            <div class="flt-t">שעה</div>
            <div class="chips"><span>אתמול</span><span>7 ימים אחרונים</span><span>30 ימים אחרונים</span></div>
            <div class="flt-t">סוג</div>
            <div class="chips"><span>רשמקול</span><span>כותרת</span></div>
          </div>
          <div class="no-recent">אין חיפושים אחרונים</div>
        </div>
        <div class="grid" data-results></div><div class="none" data-none>אין תוצאות</div>
      </div>
      <label class="field">
        <span class="field-txt"><span data-decoy></span><i class="caret"></i><span class="ph" data-ph>חיפוש</span></span>
        <input class="real" data-real type="text" inputmode="text" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" enterkeyhint="search" aria-label="חיפוש" placeholder="חיפוש">
        <span class="field-ic">${IC.mic}</span><span class="field-ic">${IC.more}</span>
      </label>
    </section>

    <section class="pg" data-pg="note">
      <div class="nbar"><span class="ib" data-back>${IC.back}</span><span class="ntitle" data-ntitle></span><span class="sp"></span><span class="ib">${IC.book}</span><span class="ib">${IC.plus}</span><span class="ib">${IC.more}</span></div>
      <div class="scroll nscroll" data-nscroll><div class="nbody" data-nbody></div></div>
      <div class="sbi" data-sbi></div>
      <div class="tools">
        <span class="t off">${IC.undo}</span><span class="t off">${IC.redo}</span>
        <span class="t">${IC.ai}</span><span class="t cr">${IC.caret}</span>
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
          בכל פעם צריך שני דברים: <b>שם</b> ו<b>מספר</b>. אפשר לערבב בין הדרכים.<br><br>
          <b>✏️ דרכים לשם</b><br>
          • <b>הצופה רושם:</b> "תרשום לי אותו שלא נשכח" - לוחצים על העיפרון למטה, הצופה כותב את השם ולוחץ חזרה.<br>
          • <b>אתה רושם:</b> אותו דבר, רק שאתה כותב את השם בפתק החדש ("אני רושם שלא נשכח").<br>
          • <b>חיפוש סודי:</b> בהגדרה "מי מקליד בחיפוש" בוחרים "אני מקליד בסתר" - מקלידים בחיפוש, ורואים רק "מפורסמים".<br><br>
          <b>🔢 דרכים למספר</b><br>
          • <b>בפתק:</b> הצופה רושם בפתק החדש גם את המספר (למשל "ישי ריבו" ובשורה מתחת "82").<br>
          • <b>הקשות על הכותרת:</b> במסך הראשי, על "כל ההערות": צד ימין = 10, צד שמאל = 1 (82 = 8 ימין + 2 שמאל).<br>
          • <b>כפתורי ווליום:</b> ווליום למעלה = 10, ווליום למטה = 1 (82 = 8 למעלה + 2 למטה). עובד גם כשהטלפון בכיס או מאחורי הגב.<br>
          • <b>חיפוש סודי:</b> מקלידים בחיפוש את השם והמספר ביחד ("ישי ריבו 82").<br>
          כל הקשה / לחיצה = רטט קטן. הפסקה של 4 שניות = מתחילים מספר מחדש.<br><br>
          <b>✨ החשיפה:</b> נכנסים לפתק "${esc(DEF.title)}" וגוללים יחד עם הצופה למספר שלו.<br>
          👀 <b>לבדוק מה נקלט:</b> לחיצה ארוכה על "כל ההערות" - מתחת לכותרת מופיע לשנייה השם והמספר.<br>
          🎤 <b>מיקרופון</b> (לא אמין ב-100%, כבוי): אפשר להדליק למטה.<br>
          חוזרים לכאן: ⋮ למעלה ← הגדרות.
        </div>
        <div class="card upd" data-upd>
          <div class="upd-t" data-upd-t>גרסה <span data-ver></span></div>
          <div class="upd-s" data-upd-s>בודק עדכונים...</div>
          <button type="button" class="btn upd-btn" data-upd-btn style="display:none">עדכן עכשיו</button>
        </div>
        <label class="lbl">🎤 האפליקציה שומעת את הצופה</label>
        <select class="inp" data-set="mic"><option value="1">דולק</option><option value="0">כבוי</option></select>
        <div class="hint" data-micstat></div>
        <label class="lbl">⌨️ מי מקליד בחיפוש</label>
        <select class="inp" data-set="searchMode"><option value="spectator">הצופה מקליד את השם (רואים מה שהוא כותב, "אין תוצאות")</option><option value="secret">אני מקליד בסתר (רואים רק את המילה למטה)</option></select>
        <label class="lbl">🔊 מספר בכפתורי הווליום</label>
        <select class="inp" data-set="volKeys"><option value="1">דולק (ווליום למעלה = 10, למטה = 1)</option><option value="0">כבוי (הכפתורים משנים עוצמת קול כרגיל)</option></select>
        <label class="lbl">📳 רטט כשמשהו נקלט</label>
        <select class="inp" data-set="vibe"><option value="1">דולק</option><option value="0">כבוי</option></select>
        <label class="lbl">מה הטלפון שמע (אחרון למעלה)</label>
        <div class="card log" data-log>עוד לא נשמע כלום</div>
        <label class="lbl">שם הפתק</label>
        <input class="inp" data-set="title" maxlength="40" placeholder="${DEF.title}">
        <label class="lbl">מה רואים בשורת החיפוש כשאתה מקליד בסתר</label>
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
    if (app.classList.contains('drawer-open')) { drawer(false); return true; }
    if (stack.length <= 1) return false;
    const leaving = stack.pop();
    if (leaving === 'settings') { names = buildNames(cfg.names); shown = names.slice(); renderList(); }
    if (leaving === 'new') saveFresh();
    show(stack[stack.length - 1], true);
    return true;
  }

  function card(n, hl) {
    let title = esc(n.t);
    if (hl) {
      const i = n.t.indexOf(hl);
      if (i >= 0) title = esc(n.t.slice(0, i)) + '<mark>' + esc(hl) + '</mark>' + esc(n.t.slice(i + hl.length));
    }
    const lines = n.body.split('\n').filter((l) => l !== '~' && l.trim()).slice(0, 14).map(lineHtml).join(''); // בתצוגה המוקטנת אין שורות ריקות (כמו באמיתי)
    return `<div class="card-n" data-open="${n.id}"><div class="thumb"><div class="thumb-in">${lines}</div></div><div class="ct">${title}</div><div class="cd">${shortDate(n.date)}</div></div>`;
  }

  function renderList() {
    const notes = allNotes();
    q('[data-count]').textContent = `${notes.length} הערות`;
    q('[data-dcount]').textContent = notes.length;
    let html = '';
    let cur = null;
    notes.forEach((n) => {
      const g = groupName(n.date);
      if (g !== cur) {
        if (cur !== null) html += '</div>';
        html += `<div class="sec">${esc(g)}</div><div class="grid">`;
        cur = g;
      }
      html += card(n);
    });
    q('[data-grid]').innerHTML = html + (cur !== null ? '</div>' : '');
  }

  // ==========================================================================
  // מה שנקלט מהצופה (מיקרופון / הקלדה בחיפוש / הקשות סודיות)
  // ==========================================================================
  const secret = { name: '', num: 0, revealed: false };
  const heardLog = [];

  function vibe(pattern) {
    if (!cfg.vibe) return;
    try {
      if (window.NotesNative && NotesNative.vibrate) NotesNative.vibrate(String(pattern));
      else if (navigator.vibrate) navigator.vibrate(String(pattern).split(',').map(Number));
    } catch (e) {}
  }
  function setName(name, src) {
    name = String(name || '').replace(/\s+/g, ' ').trim();
    if (!name || name.length < 2) return;
    if (secret.revealed) { secret.num = 0; secret.revealed = false; } // צופה חדש
    if (norm(name) === norm(secret.name)) return;
    secret.name = name;
    vibe('35');
    logHeard('✅ שם: ' + name + ' (' + src + ')');
  }
  function setNum(num, src) {
    if (!(num >= 1 && num <= 100)) return;
    if (secret.revealed) return; // אחרי החשיפה מחכים לשם של הצופה הבא
    secret.num = num;
    vibe('35,90,35');
    logHeard('✅ מספר: ' + num + ' (' + src + ')');
  }
  function logHeard(line) {
    heardLog.unshift(line);
    heardLog.length = Math.min(heardLog.length, 14);
    const el = q('[data-log]');
    if (el) el.innerHTML = heardLog.map((l) => `<div>${esc(l)}</div>`).join('');
  }

  // ---- מספרים בעברית ("שמונים ושתיים" -> 82). גוגל בדרך כלל מחזיר ספרות, זה גיבוי ----
  const UNITS = { 'אחת': 1, 'אחד': 1, 'שתיים': 2, 'שתים': 2, 'שניים': 2, 'שנים': 2, 'שתי': 2, 'שני': 2, 'שלוש': 3, 'שלושה': 3, 'ארבע': 4, 'ארבעה': 4,
    'חמש': 5, 'חמישה': 5, 'שש': 6, 'שישה': 6, 'שבע': 7, 'שבעה': 7, 'שמונה': 8, 'תשע': 9, 'תשעה': 9 };
  const TENS = { 'עשרים': 20, 'שלושים': 30, 'ארבעים': 40, 'חמישים': 50, 'שישים': 60, 'שבעים': 70, 'שמונים': 80, 'תשעים': 90 };
  function numbersIn(text) {
    const out = [];
    (String(text).match(/\d+/g) || []).forEach((d) => out.push(Number(d)));
    const w = String(text).replace(/[.,!?]/g, ' ').split(/\s+/).filter(Boolean).map((x) => (x.length > 2 && x[0] === 'ו' ? x.slice(1) : x));
    for (let i = 0; i < w.length; i++) {
      const x = w[i];
      if (x === 'מאה') { out.push(100); continue; }
      if (x === 'עשר' || x === 'עשרה') { out.push(10); continue; }
      if (TENS[x]) {
        const u = UNITS[w[i + 1]];
        if (u) { out.push(TENS[x] + u); i++; } else out.push(TENS[x]);
        continue;
      }
      if (UNITS[x]) {
        if (w[i + 1] === 'עשר' || w[i + 1] === 'עשרה') { out.push(10 + UNITS[x]); i++; } else out.push(UNITS[x]);
      }
    }
    return out;
  }
  // מילים שהקוסם (או הצופה) אומרים מסביב לשם: "תזרוק שם של מפורסם", "נגיד", "תבחר מספר".
  // הן נמחקות מהמשפט, ומה שנשאר (1-3 מילים) הוא השם. כך "תזרוק שם של מפורסם ישי ריבו" -> "ישי ריבו"
  const STOP = new Set(['מספר', 'מספרים', 'מפורסם', 'מפורסמת', 'מפורסמים', 'זרוק', 'תזרוק', 'תזרקי', 'זורק', 'זרקת', 'תגיד', 'תגידי', 'תגידו', 'אמרת', 'אומר',
    'תבחר', 'תבחרי', 'בחר', 'בחרת', 'בוחר', 'שם', 'שמות', 'בין', 'בוא', 'בואו', 'אוקיי', 'אוקי', 'יפה', 'יופי', 'טוב', 'מאוד', 'עכשיו', 'אז', 'נו', 'הנה',
    'פתק', 'פתקים', 'אפליקציה', 'תראה', 'תראי', 'נראה', 'כן', 'לא', 'רגע', 'סבבה', 'מה', 'אני', 'אתה', 'את', 'אתם', 'הוא', 'היא', 'יש', 'אין', 'לי',
    'לך', 'לו', 'של', 'שלי', 'שלך', 'זה', 'זאת', 'פה', 'כאן', 'עם', 'על', 'אם', 'גם', 'רק', 'כל', 'היה', 'היית', 'בסדר', 'מגניב', 'אחלה', 'וואו', 'מאמין',
    'תחשוב', 'תחשבי', 'מישהו', 'מישהי', 'בבקשה', 'תודה', 'שלום', 'נגיד', 'סתם', 'אולי', 'אחד', 'אחת', 'כזה', 'כזאת', 'משהו', 'איזה', 'איזשהו', 'בואי',
    'תן', 'תני', 'ניכנס', 'נכנס', 'נכנסים', 'תסתכל', 'שים', 'לב', 'בדיוק', 'דווקא', 'מאה', 'עשר', 'עשרה', 'ממ', 'אממ', 'אה', 'אהה', 'ו', 'ה', 'ל', 'ב']);
  Object.keys(UNITS).concat(Object.keys(TENS)).forEach((w) => STOP.add(w));
  const PREFIX = 'והלבשמכ';
  function isStop(tok) {
    if (STOP.has(tok)) return true;
    // "ושם", "לשם", "המספר", "שתזרוק"... (אות אחת או שתיים לפני המילה)
    for (let k = 1; k <= 2; k++) {
      if (tok.length - k < 2 || !PREFIX.includes(tok[k - 1])) break;
      if (STOP.has(tok.slice(k))) return true;
    }
    return false;
  }
  function leftoverName(t) {
    return String(t).replace(/\d+/g, ' ').replace(/[.,!?;:"()״\-–]/g, ' ').split(/\s+/)
      .map((w) => w.replace(/^'+|'+$/g, (m, off) => (off === 0 ? '' : m))) // גרש בסוף נשאר (ברקוביץ')
      .filter((w) => w.length >= 2 && !isStop(w));
  }

  // השמות שנשמעו לאחרונה. כשמגיע מספר, לוקחים את השם האחרון - ומעדיפים שם של 2-3 מילים
  // (שם של מילה אחת יכול להיות סתם מילה מהשיחה)
  const cands = [];
  window.onNotesHeard = function (text, isFinal) {
    if (!isFinal) return;
    const t = String(text || '').trim();
    if (!t) return;
    logHeard('🎤 ' + t);
    const nums = numbersIn(t).filter((n) => n >= 1 && n <= 100);
    const left = leftoverName(t);
    let here = null;
    if (left.length >= 1 && left.length <= 3) {
      here = { name: left.join(' '), multi: left.length >= 2, at: Date.now() };
      cands.push(here);
      if (cands.length > 12) cands.shift();
      // רטט "שם נקלט" מיד (שם של מילה אחת לא דורס שם של 2-3 מילים)
      if (here.multi || !secret.name || secret.revealed || !secret.name.includes(' ')) setName(here.name, 'מיקרופון');
    }
    // "בין 1 ל-100" (שני מספרים) = הקוסם מסביר -> לא מספר
    if (nums.length !== 1) return;
    let pick = here;
    if (!pick) {
      const recent = cands.filter((c) => Date.now() - c.at < 120000);
      pick = recent.slice().reverse().find((c) => c.multi) || recent[recent.length - 1] || null;
    }
    if (pick) setName(pick.name, 'מיקרופון');
    setNum(nums[0], 'מיקרופון');
    cands.length = 0;
  };
  window.onNotesMic = function (msg) {
    const el = q('[data-micstat]');
    if (msg === 'ok') { if (el) el.textContent = '🎤 המיקרופון מקשיב'; return; }
    if (String(msg).startsWith('err:')) {
      if (el) el.textContent = '⚠️ ' + String(msg).slice(4);
      logHeard('⚠️ ' + String(msg).slice(4));
    }
  };

  // ---- הקשבה: באפליקציה (APK) דרך אנדרואיד, בדפדפן Chrome דרך זיהוי הדיבור של הדפדפן ----
  let webRec = null;
  function applyMic() {
    const on = Boolean(cfg.mic);
    if (window.NotesNative && NotesNative.listen) { try { NotesNative.listen(on); } catch (e) {} return; }
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR || location.protocol === 'file:') return;
    if (!on) {
      if (webRec) { const r = webRec; webRec = null; try { r.stop(); } catch (e) {} }
      return;
    }
    if (webRec) return;
    webRec = new SR();
    webRec.lang = 'he-IL';
    webRec.continuous = true;
    webRec.interimResults = false;
    webRec.onresult = (ev) => {
      for (let i = ev.resultIndex; i < ev.results.length; i++) if (ev.results[i].isFinal) window.onNotesHeard(ev.results[i][0].transcript, true);
    };
    webRec.onstart = () => window.onNotesMic('ok');
    webRec.onerror = (ev) => { if (ev.error === 'not-allowed') window.onNotesMic('err:אין הרשאת מיקרופון'); };
    webRec.onend = () => { setTimeout(() => { try { if (webRec) webRec.start(); } catch (e) {} }, 300); };
    try { webRec.start(); } catch (e) {}
  }

  // ---- מספר בסתר: עשרות + אחדות. הפסקה של 4 שניות = מתחילים מספר חדש ----
  let tapTens = 0, tapUnits = 0, tapLast = 0, tapTimer = null;
  function secretTap(isTen, src) {
    const now = Date.now();
    if (now - tapLast > 4000) { tapTens = 0; tapUnits = 0; }
    tapLast = now;
    if (isTen) tapTens++; else tapUnits++;
    secret.num = Math.min(100, tapTens * 10 + tapUnits);
    secret.revealed = false;
    vibe('12');
    clearTimeout(tapTimer);
    tapTimer = setTimeout(() => logHeard('✅ מספר: ' + secret.num + ' (' + src + ')'), 4100);
  }
  // הקשות על הכותרת הגדולה: צד ימין = 10, צד שמאל = 1
  q('[data-hero]').addEventListener('click', (e) => {
    const r = e.currentTarget.getBoundingClientRect();
    secretTap(e.clientX > r.left + r.width / 2, 'הקשות');
  });
  // כפתורי הווליום (רק באפליקציה המותקנת): למעלה = 10, למטה = 1. אפשר גם כשהטלפון בכיס
  window.onNotesKey = function (k) {
    if (!cfg.volKeys) return false;
    secretTap(k === 'up', 'ווליום');
    return true;
  };
  function applyVolKeys() {
    try { if (window.NotesNative && NotesNative.volumeKeys) NotesNative.volumeKeys(Boolean(cfg.volKeys)); } catch (e) {}
  }

  // ---- הצצה סודית: לחיצה ארוכה על "כל ההערות" מראה לשנייה מה נקלט ----
  (function () {
    const h = q('[data-peek]');
    let t = null;
    const cancel = () => clearTimeout(t);
    h.addEventListener('pointerdown', () => {
      cancel();
      t = setTimeout(() => {
        const c = q('[data-count]');
        const orig = c.textContent;
        c.textContent = `${secret.name || '—'} · ${secret.num || '—'}`;
        vibe('20');
        setTimeout(() => { c.textContent = orig; }, 1600);
      }, 700);
    });
    ['pointerup', 'pointerleave', 'pointercancel'].forEach((ev) => h.addEventListener(ev, cancel));
  })();

  // ==========================================================================
  // חיפוש
  // ==========================================================================
  function renderSearch() {
    const spect = cfg.searchMode !== 'secret';
    app.classList.toggle('spect', spect);
    let vis;
    if (spect) {
      vis = real.value.trim(); // הצופה רואה בדיוק מה שהוא כותב
    } else {
      // מה שהקוסם מקליד נשאר בשדה נסתר; על המסך מופיעה מילת החיפוש התמימה, אות אחרי אות
      const decoy = (cfg.decoy || '').trim() || DEF.decoy;
      vis = decoy.slice(0, Math.min(Array.from(real.value).length, decoy.length));
      q('[data-decoy]').textContent = vis;
    }
    q('[data-ph]').style.display = real.value ? 'none' : '';
    q('[data-sidle]').style.display = vis ? 'none' : ''; // לפני שמקלידים: מסננים + "אין חיפושים אחרונים"
    const res = vis ? allNotes().filter((n) => n.t.includes(vis) || (spect && n.body.includes(vis))) : [];
    q('[data-results]').innerHTML = res.map((n) => card(n, n.t.includes(vis) ? vis : '')).join('');
    q('[data-none]').style.display = vis && !res.length ? '' : 'none';
  }
  // ---- פתק חדש: הצופה רושם את השם בעצמו. בחזרה הפתק נשמר ברשימה, והשם נקלט ----
  function openNew() {
    q('[data-new-t]').value = '';
    q('[data-new-b]').value = '';
    go('new');
    try { q('[data-new-t]').focus({ preventScroll: true }); } catch (e) { q('[data-new-t]').focus(); }
  }
  function saveFresh() {
    const t = q('[data-new-t]').value.trim();
    const b = q('[data-new-b]').value.trim();
    q('[data-new-t]').blur();
    q('[data-new-b]').blur();
    if (!t && !b) return;
    fresh.push({ id: 'f' + fresh.length, t: t || b.split('\n')[0], body: b || t, date: new Date() });
    // השם: הכותרת (או השורה הראשונה). המספר: המספר הראשון בכל הפתק (הצופה יכול לרשום גם אותו)
    const name = parseSecret(t || b.split('\n')[0]).name || parseSecret(b).name.split(' ').slice(0, 3).join(' ');
    const num = ((t + ' ' + b).match(/\d+/g) || []).map(Number).find((n) => n >= 1 && n <= 100) || 0; // רק ספרות ("שני כהן" זה שם, לא 2)
    if (name) setName(name, 'הצופה רשם');
    if (num) setNum(num, 'הצופה רשם');
    renderList();
  }

  function takeSearch() {
    const { name, num } = parseSecret(real.value);
    if (name) setName(name, cfg.searchMode === 'secret' ? 'הקלדה סודית' : 'הצופה הקליד');
    if (num) setNum(num, 'הקלדה');
  }

  // הפתק בתצוגת דפים (כמו באמיתי): כל דף בגובה A4 ביחס לרוחב המסך, פס אפור בין הדפים ו"1/4" בפינה
  // פתק עם "~" -> הדפים בדיוק כמו בפתק המקורי. בלי "~" (פתק הקסם) -> כמה שורות שנכנסות בדף
  function renderPages(n) {
    const box = q('[data-nbody]');
    const pageH = Math.round((q('[data-pg="note"] .nscroll').clientWidth || innerWidth) * 1.414);
    let pages;
    if (n.body.includes('\n~')) {
      pages = [[]];
      n.body.split('\n').forEach((l) => { if (l === '~') pages.push([]); else pages[pages.length - 1].push(lineHtml(l)); });
    } else {
      const lines = n.body.split('\n').map(lineHtml);
      box.innerHTML = `<div class="npage">${lines[0]}</div>`;
      const lnH = box.firstChild.firstChild ? box.firstChild.firstChild.offsetHeight || 27 : 27;
      const per = Math.max(5, Math.floor((pageH - 40) / lnH));
      pages = [];
      for (let i = 0; i < lines.length; i += per) pages.push(lines.slice(i, i + per));
    }
    box.innerHTML = pages.map((p, i) => `<div class="npage" style="min-height:${pageH}px">${p.join('')}<span class="pno">${i + 1}/${pages.length}</span></div>`).join('');
  }

  function openNote(id) {
    if (id === 'trick' && secret.name && secret.num) {
      inject(secret.name, secret.num);
      secret.revealed = true;
    }
    renderList();
    const n = noteById(id || 'trick');
    if (!n) return;
    q('[data-ntitle]').textContent = n.t;
    go('note');
    renderPages(n);
    q('[data-pg="note"] .nscroll').scrollTop = 0;
  }

  // ---- תפריט ☰ (כמו באמיתי: חלון צף מלמעלה, הרקע מטושטש) ----
  function drawer(open) {
    app.classList.toggle('drawer-open', open);
  }
  // ---- פס גלילה דק בצד שמאל של הפתק: מופיע בזמן גלילה ונעלם (כמו באמיתי) ----
  (function () {
    const sc = q('[data-nscroll]');
    const bar = q('[data-sbi]');
    let t = null;
    sc.addEventListener('scroll', () => {
      const max = sc.scrollHeight - sc.clientHeight;
      const h = Math.max(60, sc.clientHeight * sc.clientHeight / sc.scrollHeight);
      bar.style.height = h + 'px';
      bar.style.transform = `translateY(${max > 0 ? (sc.scrollTop / max) * (sc.clientHeight - h) : 0}px)`;
      bar.classList.add('on');
      clearTimeout(t);
      t = setTimeout(() => bar.classList.remove('on'), 900);
    }, { passive: true });
  })();

  // ---- כשגוללים את הרשימה: "כל ההערות" הקטן מופיע בסרגל העליון ----
  q('[data-list-scroll]').addEventListener('scroll', (e) => {
    const h = q('[data-hero]').offsetHeight;
    q('[data-bar]').classList.toggle('collapsed', e.target.scrollTop > h - 20);
  }, { passive: true });

  // ==========================================================================
  // הגדרות
  // ==========================================================================
  function openSettings() {
    app.querySelectorAll('[data-set]').forEach((el) => {
      const k = el.dataset.set;
      if (k === 'names') el.value = buildNames(cfg.names).join('\n');
      else if (k === 'mic' || k === 'vibe' || k === 'volKeys') el.value = cfg[k] ? '1' : '0';
      else el.value = cfg[k] == null ? '' : cfg[k];
    });
    const ms = q('[data-micstat]');
    if (!cfg.mic) ms.textContent = '';
    else if (!window.NotesNative && !(window.SpeechRecognition || window.webkitSpeechRecognition)) ms.textContent = 'המיקרופון עובד רק באפליקציה המותקנת';
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
    if (t.closest('[data-drawer]')) return drawer(true);
    if (t.closest('[data-dim]')) return drawer(false);
    if (app.classList.contains('drawer-open') && !t.closest('[data-act]')) { if (!t.closest('[data-drawer-panel]')) drawer(false); return; }
    if (t.closest('[data-new]')) return openNew();
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
      drawer(false);
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
    const op = t.closest('[data-open]');
    if (op) {
      if (stack[stack.length - 1] === 'search') takeSearch();
      return openNote(op.dataset.open);
    }
    q('[data-menu]').classList.remove('open');
  });

  real.addEventListener('input', renderSearch);
  real.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    takeSearch();
    if (cfg.searchMode === 'secret') openNote('trick');
    else real.blur(); // הצופה לחץ "חפש": נשארים ב"אין תוצאות"
  });
  real.addEventListener('focus', () => app.classList.add('typing'));
  real.addEventListener('blur', () => {
    app.classList.remove('typing');
    if (cfg.searchMode !== 'secret' && real.value.trim()) takeSearch();
  });

  app.querySelectorAll('[data-set]').forEach((el) => {
    const onChange = () => {
      const k = el.dataset.set;
      if (k === 'names') {
        const lines = el.value.split('\n').map((l) => l.trim()).filter(Boolean).slice(0, 100).join('\n');
        cfg.names = lines === DEFAULT_NAMES.join('\n') ? '' : lines;
        countNames();
      } else if (k === 'ageDays') {
        cfg.ageDays = Math.max(1, Math.min(400, Number(el.value) || DEF.ageDays));
      } else if (k === 'mic' || k === 'vibe' || k === 'volKeys') {
        cfg[k] = el.value === '1';
        if (k === 'mic') applyMic();
        if (k === 'volKeys') applyVolKeys();
      } else {
        cfg[k] = el.value;
      }
      save();
    };
    el.addEventListener('input', onChange);
    el.addEventListener('change', onChange);
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

  // ==========================================================================
  // עדכונים מתוך האפליקציה: בודקים את version.json באתר. יש גרסה חדשה -> נקודה אדומה
  // קטנה על ⋮ (נראה כמו התראה רגילה), ובהגדרות כפתור "עדכן עכשיו" שמוריד את ה-APK.
  // ==========================================================================
  const UPDATE_URL = 'https://tzur2010.github.io/app-lockscreen/notes/version.json';
  const native = window.NotesNative;
  const myCode = native && native.versionCode ? Number(native.versionCode()) : 0;
  const myName = native && native.versionName ? String(native.versionName()) : 'אתר';
  let update = null;
  q('[data-ver]').textContent = myName;

  function checkUpdate() {
    fetch(UPDATE_URL + '?t=' + Date.now(), { cache: 'no-store' })
      .then((r) => r.json())
      .then((v) => {
        update = native && Number(v.code) > myCode ? v : null;
        app.classList.toggle('has-update', Boolean(update));
        q('[data-upd-s]').textContent = update ? `יש גרסה חדשה: ${v.version}${v.notes ? ' - ' + v.notes : ''}` : (native ? 'יש לך את הגרסה האחרונה ✓' : 'גרסת אתר - תמיד מעודכנת');
        q('[data-upd-btn]').style.display = update ? '' : 'none';
      })
      .catch(() => { q('[data-upd-s]').textContent = 'אין חיבור - לא הצלחתי לבדוק עדכונים'; });
  }
  q('[data-upd-btn]').addEventListener('click', () => {
    if (!update) return;
    q('[data-upd-s]').textContent = 'מוריד... כשההורדה מסתיימת: לוחצים על הקובץ ← "עדכן"';
    native.openUrl(update.apk_url + '?v=' + update.code);
  });
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') checkUpdate(); });

  renderList();
  applyMic();
  applyVolKeys();
  checkUpdate();
})();

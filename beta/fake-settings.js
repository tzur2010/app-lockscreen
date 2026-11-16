// ============================================================================
// קסם "תחליף לי את הסיסמה": העתק של אפליקציית ההגדרות של סמסונג (One UI 8, מצב בהיר)
// ----------------------------------------------------------------------------
// הקוסם פותח "הגדרות" -> מסך נעילה ו-AOD -> סוג נעילת מסך -> מקליד "קוד נוכחי" (כל קוד)
// -> PIN -> הצופה קובע קוד חדש ומאשר. הקוד נשלח לקוסם בסתר (onPinSet), והטלפון חוזר
// להגדרות - בדיוק כמו טלפון אמיתי. הנעילה עצמה קורית רק כשמכבים את המסך (app.js).
// ============================================================================
(function () {
  const I = {
    heart: '<path d="M12 21s-7.5-4.6-9.3-9.2C1.3 8.3 3.6 5 7 5c2 0 3.6 1.2 5 3 1.4-1.8 3-3 5-3 3.4 0 5.7 3.3 4.3 6.8C19.5 16.4 12 21 12 21z"/>',
    wifi: '<path d="M12 18.5a1.8 1.8 0 1 0 0 3.6 1.8 1.8 0 0 0 0-3.6zM5.2 13.7l1.7 1.7a7.2 7.2 0 0 1 10.2 0l1.7-1.7a9.6 9.6 0 0 0-13.6 0zM1.8 10.3l1.7 1.7a12 12 0 0 1 17 0l1.7-1.7a14.4 14.4 0 0 0-20.4 0z"/>',
    devices: '<rect x="3" y="4" width="11" height="12" rx="2"/><rect x="11" y="8" width="10" height="12" rx="2" fill="#fff" opacity=".9"/>',
    ai: '<path d="M12 2l2.2 6.3L20 10l-5.8 1.7L12 18l-2.2-6.3L4 10l5.8-1.7z"/><path d="M18.5 15l.9 2.4 2.4.9-2.4.9-.9 2.4-.9-2.4-2.4-.9 2.4-.9z"/>',
    modes: '<path d="M12 3a9 9 0 1 0 9 9" stroke="#fff" stroke-width="2.2" fill="none"/><path d="M8 12l3 3 6-6" stroke="#fff" stroke-width="2.2" fill="none"/>',
    sound: '<path d="M4 9h4l5-4v14l-5-4H4z"/><path d="M16 8.5a5 5 0 0 1 0 7" stroke="#fff" stroke-width="2" fill="none"/>',
    bell: '<path d="M12 22a2.5 2.5 0 0 0 2.5-2.5h-5A2.5 2.5 0 0 0 12 22zm7-6V11a7 7 0 0 0-5.5-6.8V3.5a1.5 1.5 0 0 0-3 0v.7A7 7 0 0 0 5 11v5l-2 2v1h18v-1z"/>',
    sun: '<circle cx="12" cy="12" r="5"/><path d="M12 1v3M12 20v3M1 12h3M20 12h3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1" stroke="#fff" stroke-width="2"/>',
    battery: '<rect x="7" y="3" width="10" height="19" rx="2"/><rect x="10" y="1" width="4" height="3" rx="1"/>',
    wallpaper: '<path d="M5 19l4.5-6 3.5 4.5 2.5-3L19 19z"/><circle cx="9" cy="8" r="2"/>',
    themes: '<path d="M12 3C7 3 3 7 3 12s4 9 9 9c1 0 1.6-.8 1.6-1.6 0-.4-.2-.8-.4-1.1-.3-.3-.4-.7-.4-1.1 0-.9.7-1.6 1.6-1.6H17c2.8 0 5-2.2 5-5C22 6.6 17.5 3 12 3z"/>',
    home: '<path d="M3 11l9-8 9 8v10h-6v-6H9v6H3z"/>',
    lock: '<path d="M7 10V7a5 5 0 0 1 10 0v3h1a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2zm2 0h6V7a3 3 0 0 0-6 0z"/>',
    shield: '<path d="M12 2l8 3v6c0 5-3.4 9.6-8 11-4.6-1.4-8-6-8-11V5z"/>',
    pin: '<path d="M12 2a7 7 0 0 0-7 7c0 5 7 13 7 13s7-8 7-13a7 7 0 0 0-7-7zm0 9.5A2.5 2.5 0 1 1 12 6a2.5 2.5 0 0 1 0 5.5z"/>',
    sos: '<path d="M12 2l10 18H2z"/>',
    cloud: '<path d="M7 19a5 5 0 0 1-.5-10A6.5 6.5 0 0 1 19 10a4.5 4.5 0 0 1-.5 9z"/>',
    g: '<path d="M21 12.2c0-.7-.1-1.3-.2-1.9H12v3.6h5c-.2 1.2-.9 2.2-1.9 2.8v2.3h3c1.8-1.6 2.9-4 2.9-6.8z"/><path d="M12 21c2.5 0 4.6-.8 6.1-2.2l-3-2.3c-.8.6-1.9.9-3.1.9-2.4 0-4.4-1.6-5.1-3.8H3.8v2.4A9 9 0 0 0 12 21z" opacity=".8"/>',
    plus: '<path d="M11 4h2v16h-2zM4 11h16v2H4z"/>',
    leaf: '<path d="M20 4C9 4 4 9 4 17c0 1 .1 2 .3 3C6 13 10 10 15 9c-4 2-7 5-8.5 10C17 18 20 12 20 4z"/>',
    care: '<path d="M12 3a9 9 0 1 0 9 9" stroke="#fff" stroke-width="2.4" fill="none"/><circle cx="12" cy="12" r="3"/>',
    apps: '<rect x="4" y="4" width="7" height="7" rx="2"/><rect x="13" y="4" width="7" height="7" rx="2"/><rect x="4" y="13" width="7" height="7" rx="2"/><rect x="13" y="13" width="7" height="7" rx="2"/>',
    gear: '<path d="M12 8.5A3.5 3.5 0 1 0 12 15.5 3.5 3.5 0 0 0 12 8.5zm8.6 5l1.9 1.5-2 3.4-2.3-.9a8 8 0 0 1-2.2 1.3L15.6 21h-4l-.4-2.4a8 8 0 0 1-2.2-1.3l-2.3.9-2-3.4 1.9-1.5a8 8 0 0 1 0-2.6L4.7 9.2l2-3.4 2.3.9a8 8 0 0 1 2.2-1.3L11.6 3h4l.4 2.4a8 8 0 0 1 2.2 1.3l2.3-.9 2 3.4-1.9 1.5a8 8 0 0 1 0 2.6z"/>',
    access: '<circle cx="12" cy="4.5" r="2"/><path d="M4 8h16v2h-5.5v4l2 7h-2.2L12 15l-2.3 6H7.5l2-7v-4H4z"/>',
    update: '<path d="M12 4V1L8 5l4 4V6a6 6 0 1 1-6 6H4a8 8 0 1 0 8-8z"/>',
    tips: '<path d="M9 21h6v-1.5H9zM12 2a7 7 0 0 0-4 12.7V18h8v-3.3A7 7 0 0 0 12 2z"/>',
    info: '<circle cx="12" cy="12" r="9.5"/>'
  };

  // [כותרת, תת-כותרת, סוג]  סוג: 'on'/'off' = מתג, 'blue' = ערך כחול
  const PAGES = {
    warranty: ['אחריות וטיפול', [[['האחריות שלי', 'בדוק את מצב האחריות של המכשיר'], ['שירות ותיקונים', 'מצא מרכז שירות קרוב'], ['טיפים לטיפול במכשיר']]]],
    connections: ['חיבורים', [[['Wi-Fi', 'מחובר', 'on'], ['Bluetooth', '', 'on']], [['NFC ותשלומים ללא מגע', '', 'on'], ['מצב טיסה', '', 'off']], [['ניהול SIM'], ['שימוש בנתונים'], ['נקודה חמה ושיתוף אינטרנט']], [['הגדרות חיבור נוספות']]]],
    devices: ['מכשירים מחוברים', [[['שיתוף מהיר', 'אנשי קשר בלבד', 'blue'], ['Auto switch Buds', '', 'on']], [['Smart View'], ['Android Auto'], ['Galaxy Wearable']], [['מצלמה רציפה'], ['המשך אפליקציות במכשירים אחרים', '', 'on']]]],
    ai: ['Galaxy AI', [[['סיוע בשיחות', 'תרגום חי ועוד'], ['סיוע בכתיבה'], ['סיוע בהערות'], ['סיוע בתמונות']], [['עיבוד נתונים במכשיר בלבד', '', 'off']]]],
    modes: ['מצבים ושגרות', [[['שינה', 'מושבת'], ['נהיגה', 'מושבת'], ['אימון', 'מושבת'], ['עבודה', 'מושבת']], [['הוסף מצב']]]],
    sounds: ['צלילים ורטט', [[['מצב צליל', 'צליל', 'blue'], ['רטט בזמן צלצול', '', 'on']], [['רינגטון', 'Over the Horizon'], ['צליל התראה', 'Spaceline'], ['צלילי מערכת', 'Galaxy']], [['עוצמת קול'], ['עוצמת רטט'], ['איכות צליל ואפקטים']]]],
    notif: ['התראות', [[['התראות של אפליקציות'], ['התראות במסך הנעילה', 'הצג תוכן', 'blue'], ['סגנון התראות קופצות', 'מקוצר']], [['נא לא להפריע', '', 'off']], [['הגדרות מתקדמות']]]],
    display: ['תצוגה', [[['בהיר'], ['כהה']], [['מצב כהה אוטומטי', '', 'off']], [['בהירות'], ['בהירות מסתגלת', '', 'on']], [['חלקות תנועה', 'מסתגל', 'blue'], ['מגן נוחות עיניים', '', 'off']], [['גודל וסגנון גופן'], ['זום מסך']]]],
    battery: ['סוללה', [[['__BATTERY__', 'נותר זמן שימוש רב']], [['חיסכון בחשמל', '', 'off'], ['הגבלות שימוש ברקע']], [['הגנה על הסוללה', 'אדפטיבי', 'blue'], ['הגדרות טעינה']]]],
    wallpaper: ['טפט וסגנון', [[['שנה טפטים'], ['לוח צבעים'], ['מסך כהה לטפט', '', 'off']], [['טפטים מתחלפים']]]],
    themes: ['ערכות נושא', [[['ערכות נושא'], ['טפטים'], ['סמלים'], ['AOD']]]],
    home: ['מסך הבית', [[['פריסת מסך הבית', 'בית ומסך אפליקציות', 'blue'], ['רשת מסך הבית', '4x5'], ['רשת מסך האפליקציות', '4x6']], [['תגים לסמלי אפליקציות', '', 'on'], ['הוסף אפליקציות חדשות לבית', '', 'off'], ['נעל את פריסת מסך הבית', '', 'off']]]],
    security: ['אבטחה ופרטיות', [[['מצב האבטחה', 'נראה שהכל בסדר', 'blue']], [['נעילת מסך וביומטריה'], ['חשבונות'], ['איתור המכשיר שלי', '', 'on']], [['פרטיות'], ['תיקייה מאובטחת'], ['הגדרות אבטחה נוספות']]]],
    location: ['מיקום', [[['מיקום', '', 'on']], [['הרשאות של אפליקציות'], ['שירותי מיקום']], [['בקשות מיקום אחרונות', 'אין בקשות']]]],
    safety: ['בטיחות וחירום', [[['מידע רפואי'], ['אנשי קשר לחירום']], [['SOS לחירום', '', 'off'], ['התראות חירום אלחוטיות']]]],
    accounts: ['חשבונות וגיבוי', [[['ניהול חשבונות']], [['גיבוי נתונים'], ['שחזור נתונים']], [['Smart Switch']]]],
    google: ['Google', [[['ניהול חשבון Google']], [['גיבוי'], ['מכשירים ושיתוף'], ['מילוי אוטומטי'], ['מודעות']]]],
    advanced: ['תכונות מתקדמות', [[['לחצן צד'], ['תנועות ומחוות']], [['מסך מפוצל', '', 'on'], ['חלון צף', '', 'on']], [['צילום מסך והקלטת מסך'], ['הצגת אנשי קשר בשיתוף', '', 'on']]]],
    wellbeing: ['רווחה דיגיטלית ופיקוח הורים', [[['זמן מסך היום', 'שעה ו-12 דקות']], [['מטרות זמן מסך'], ['מגבלות אפליקציה'], ['מצב שינה']]]],
    care: ['טיפול במכשיר', [[['ייעול כעת']], [['סוללה'], ['אחסון'], ['זיכרון']], [['אופטימיזציה אוטומטית', '', 'on']]]],
    apps: ['אפליקציות', [[['האפליקציות שלך']], [['בחירת אפליקציות ברירת מחדל'], ['הגדרות אפליקציות של Samsung']]]],
    general: ['ניהול כללי', [[['שפה', 'עברית', 'blue'], ['תאריך ושעה']], [['רשימת מקלדות וברירת מחדל'], ['הגדרות מקלדת Samsung']], [['איפוס'], ['צור קשר']]]],
    accessibility: ['נגישות', [[['TalkBack', 'מושבת'], ['שיפורי ראייה'], ['שיפורי שמיעה']], [['אינטראקציה ומיומנות'], ['הגדרות מתקדמות']]]],
    update: ['עדכון תוכנה', [[['הורד והתקן'], ['הורדה אוטומטית ב-Wi-Fi', '', 'on']], [['עדכון אחרון']]]],
    tips: ['טיפים ומדריך למשתמש', [[['טיפים'], ['מדריך למשתמש']]]],
    about: ['אודות הטלפון', [[['__MODEL__'], ['מספר טלפון'], ['מספר דגם']], [['מידע על המצב'], ['מידע משפטי'], ['פרטי תוכנה'], ['פרטי סוללה']]]],
    account: ['Samsung Account', [[['פרופיל'], ['אבטחה ופרטיות'], ['Samsung Cloud'], ['מכשירים']]]]
  };

  // הרשימה הראשית - בדיוק לפי הסדר בסרטון (One UI 8)
  const MAIN = [
    [['warranty', 'אחריות וטיפול', 'heart', '#69c03e']],
    [['connections', 'חיבורים', 'wifi', '#3f7cfb'], ['devices', 'מכשירים מחוברים', 'devices', '#4778f9']],
    [['ai', 'Galaxy AI', 'ai', 'linear-gradient(135deg,#3098ff,#6d6cff)'], ['modes', 'מצבים ושגרות', 'modes', '#6e56e2'], ['sounds', 'צלילים ורטט', 'sound', '#7a62f4'], ['notif', 'התראות', 'bell', '#e78f5f']],
    [['display', 'תצוגה', 'sun', '#3fae5a'], ['battery', 'סוללה', 'battery', '#4fb85a']],
    [['wallpaper', 'טפט וסגנון', 'wallpaper', '#e5627d'], ['themes', 'ערכות נושא', 'themes', '#8b5cf6'], ['home', 'מסך הבית', 'home', '#3f7cfb'], ['lock', 'מסך נעילה ו-AOD', 'lock', '#5d63f2']],
    [['security', 'אבטחה ופרטיות', 'shield', '#3f7cfb'], ['location', 'מיקום', 'pin', '#38b37a'], ['safety', 'בטיחות וחירום', 'sos', '#e5544b']],
    [['accounts', 'חשבונות וגיבוי', 'cloud', '#3f86f6'], ['google', 'Google', 'g', '#4285f4']],
    [['advanced', 'תכונות מתקדמות', 'plus', '#f0a23b']],
    [['wellbeing', 'רווחה דיגיטלית ופיקוח הורים', 'leaf', '#3fae5a'], ['care', 'טיפול במכשיר', 'care', '#2fb5a4']],
    [['apps', 'אפליקציות', 'apps', '#4f7cf6'], ['general', 'ניהול כללי', 'gear', '#7b8794']],
    [['accessibility', 'נגישות', 'access', '#3f86f6'], ['update', 'עדכון תוכנה', 'update', '#6b62f2']],
    [['tips', 'טיפים ומדריך למשתמש', 'tips', '#f0a23b'], ['about', 'אודות הטלפון', 'info', '#8a8f98']]
  ];

  const BACK = '<svg viewBox="0 0 24 24" fill="none" stroke="#111" stroke-width="2.2" stroke-linecap="round"><path d="M9 5l7 7-7 7"/></svg>';
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const ic = (name, color) => `<div class="fs-ic" style="background:${color}"><svg viewBox="0 0 24 24">${I[name] || ''}</svg></div>`;

  let root = null;
  let stack = ['main'];
  let typed = '';
  let newPin = '';
  let opts = {};
  const listeners = { pinSet: [], secret: [] };

  function row([t1, t2 = '', kind = ''], attrs = '') {
    const sw = kind === 'on' || kind === 'off' ? `<div class="fs-sw ${kind === 'on' ? 'fs-swon' : ''}"></div>` : '';
    const sub = t2 ? `<div class="fs-t2 ${kind === 'blue' ? 'fs-blue' : ''}">${esc(t2)}</div>` : '';
    return `<div class="fs-row" ${sw ? 'data-fs-toggle' : ''} ${attrs}><div class="fs-txt"><div class="fs-t1">${esc(t1)}</div>${sub}</div>${sw}</div>`;
  }
  function shell(id, title, inner) {
    return `<section class="fs-page" data-fs-page="${id}">
      <div class="fs-appbar"><div class="fs-back" data-fs-back>${BACK}</div><div class="fs-small-title">${esc(title)}</div></div>
      <div class="fs-scroll"><div class="fs-hero"><h1>${esc(title)}</h1></div>${inner}</div></section>`;
  }
  function pinPage(id, stage, title, sub, okText) {
    return `<section class="fs-page" data-fs-page="${id}"><div class="fs-appbar"><div class="fs-back" data-fs-back>${BACK}</div></div>
      <div class="fs-pin" data-fs-stage="${stage}"><div class="fs-pin-title">${title}</div><div class="fs-pin-sub">${sub}</div><div class="fs-pin-box"></div>
      <div class="fs-pin-foot"><button type="button" class="fs-pbtn" data-fs-ok disabled>${okText}</button><button type="button" class="fs-pbtn" data-fs-back>ביטול</button></div></div></section>`;
  }

  function build() {
    root = document.createElement('div');
    root.id = 'fakeSettings';
    let html = `<div class="fs-status"><div class="fs-st-left"><span class="fs-bat" data-fs-bat>80</span>
      <svg class="fs-st-ic" viewBox="0 0 16 16"><rect x="1" y="10" width="2.4" height="4" rx=".6" fill="#555"/><rect x="5" y="7.5" width="2.4" height="6.5" rx=".6" fill="#555"/><rect x="9" y="5" width="2.4" height="9" rx=".6" fill="#555"/><rect x="13" y="2.5" width="2.4" height="11.5" rx=".6" fill="#bbb"/></svg>
      <span style="font-size:8px;font-weight:700;color:#444;line-height:1">4G+</span></div><span class="fs-time" data-fs-time></span></div>`;

    // המסך הראשי (בלי סרגל עליון - הכותרת גוללת יחד עם הכל, כמו בסרטון)
    let main = `<div class="fs-card"><div class="fs-profile" data-fs-go="account"><div><div class="fs-name" data-fs-name></div><div class="fs-acc">Samsung Account</div></div><div class="fs-avatar" data-fs-avatar><svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="5"/><path d="M2 24c0-6 4.5-9 10-9s10 3 10 9z"/></svg></div></div></div>`;
    MAIN.forEach((card) => {
      main += '<div class="fs-card">' + card.map(([key, label, icon, color]) => `<div class="fs-row" data-fs-go="${key}">${ic(icon, color)}<div class="fs-txt"><div class="fs-t1">${esc(label)}</div></div></div>`).join('') + '</div>';
    });
    html += `<section class="fs-page" data-fs-page="main"><div class="fs-scroll"><div class="fs-hero"><h1>הגדרות</h1></div>${main}</div></section>`;

    Object.entries(PAGES).forEach(([key, [title, cards]]) => {
      html += shell(key, title, cards.map((c) => '<div class="fs-card fs-noicon">' + c.map((r) => row(r)).join('') + '</div>').join(''));
    });

    html += shell('lock', 'מסך נעילה ו-AOD', `
      <div class="fs-card"><div class="fs-preview"><div class="fs-thumb" data-fs-thumb><b data-fs-time></b><span data-fs-date></span></div><div class="fs-t1">ערוך</div></div></div>
      <div class="fs-card fs-noicon">
        ${row(['סוג נעילת מסך', 'PIN', 'blue'], 'data-fs-go="verify"')}
        ${row(['הגדרות נעילה מאובטחת', 'הגדר את הפונקציות של הנעילה המאובטחת'])}
      </div>
      <div class="fs-card fs-noicon">
        <div class="fs-row" data-fs-toggle><div class="fs-txt"><div class="fs-t1">Always On Display</div><div class="fs-t2 fs-blue">הקש כדי להציג</div></div><div class="fs-sw-sep"></div><div class="fs-sw fs-swon"></div></div>
        ${row(['רוטציה של מסך הנעילה', '', 'off'])}
      </div>
      <div class="fs-card fs-noicon">${row(["ווידג'טים"])}${row(['פרטי קשר'])}${row(['אודות מסך הנעילה'])}</div>`);

    html += pinPage('verify', 'verify', 'אמת את ה-PIN', 'הזן את ה-PIN הנוכחי כדי להמשיך', 'המשך');
    html += shell('type', 'סוג נעילת מסך', `
      <div class="fs-card fs-noicon">${row(['החלקה'])}${row(['דפוס'])}${row(['PIN', 'נוכחי', 'blue'], 'data-fs-go="new"')}${row(['סיסמה'])}${row(['ללא'])}</div>
      <div class="fs-sec">ביומטריה</div>
      <div class="fs-card fs-noicon">${row(['פנים', '', 'off'])}${row(['טביעות אצבע', '', 'off'])}</div>`);
    html += pinPage('new', 'new', 'הגדר PIN', 'ה-PIN חייב להכיל לפחות 4 ספרות', 'המשך');
    html += pinPage('confirm', 'confirm', 'אשר PIN', 'הזן שוב את ה-PIN', 'אישור');

    html += `<div class="fs-kbd" data-fs-kbd>
      <button type="button" class="fs-k">1</button><button type="button" class="fs-k">2</button><button type="button" class="fs-k">3</button>
      <button type="button" class="fs-k">4</button><button type="button" class="fs-k">5</button><button type="button" class="fs-k">6</button>
      <button type="button" class="fs-k">7</button><button type="button" class="fs-k">8</button><button type="button" class="fs-k">9</button>
      <button type="button" class="fs-k fs-fn" data-k="del">⌫</button><button type="button" class="fs-k">0</button><button type="button" class="fs-k fs-go" data-k="ok">בוצע</button></div>
      <div class="fs-search" data-fs-search><div class="fs-search-r"><svg viewBox="0 0 24 24" fill="none" stroke="#8d8d90" stroke-width="2"><circle cx="11" cy="11" r="6.5"/><path d="M16 16l4.5 4.5"/></svg>חיפוש</div>
        <svg viewBox="0 0 24 24" fill="#3a3a3a"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5.5 11a6.5 6.5 0 0 0 13 0" stroke="#3a3a3a" stroke-width="1.8" fill="none"/><path d="M12 17.5V21" stroke="#3a3a3a" stroke-width="1.8"/></svg></div>
      <div class="fs-nav"><div><svg viewBox="0 0 24 24"><path d="M7 6v12M12 6v12M17 6v12"/></svg></div><div data-fs-home><svg viewBox="0 0 24 24"><rect x="5.5" y="5.5" width="13" height="13" rx="4"/></svg></div><div data-fs-navback><svg viewBox="0 0 24 24"><path d="M10 6l6 6-6 6"/></svg></div></div>
      <div class="fs-toast" data-fs-toast></div>
      <div data-fs-secret style="position:absolute;top:0;right:0;width:76px;height:76px;z-index:80;"></div>`;

    root.innerHTML = html;
    document.body.appendChild(root);
    bind();
  }

  const q = (s) => root.querySelector(s);
  const page = (id) => root.querySelector(`[data-fs-page="${id}"]`);
  const cur = () => stack[stack.length - 1];

  function show(id, goingBack) {
    root.querySelectorAll('.fs-page').forEach((p) => p.classList.remove('fs-on', 'fs-going-back'));
    const p = page(id);
    if (!p) return;
    p.classList.add('fs-on');
    if (goingBack) p.classList.add('fs-going-back');
    typed = '';
    const box = p.querySelector('.fs-pin-box');
    if (box) box.innerHTML = '';
    const ok = p.querySelector('[data-fs-ok]');
    if (ok) ok.disabled = true;
    const sub = p.querySelector('.fs-pin-sub');
    if (sub) sub.classList.remove('fs-err');
    q('[data-fs-kbd]').classList.toggle('fs-on', Boolean(p.querySelector('.fs-pin')));
    q('[data-fs-search]').style.display = id === 'main' ? 'flex' : 'none';
    const sc = p.querySelector('.fs-scroll');
    if (sc && !goingBack) sc.scrollTop = 0;
    syncAppbar(p);
  }
  function go(id) {
    stack.push(id);
    show(id);
  }
  function back() {
    if (stack.length <= 1) return;
    stack.pop();
    while (stack.length > 1 && ['verify', 'new', 'confirm'].includes(cur())) stack.pop();
    show(cur(), true);
  }
  function syncAppbar(p) {
    const sc = p.querySelector('.fs-scroll');
    const bar = p.querySelector('.fs-appbar');
    const hero = p.querySelector('.fs-hero');
    if (!sc || !hero) return;
    const y = sc.scrollTop;
    if (bar) bar.classList.toggle('fs-solid', y > hero.offsetHeight - 70);
    hero.style.opacity = String(Math.max(0, 1 - y / (hero.offsetHeight * 0.7)));
  }

  function toast(msg) {
    const t = q('[data-fs-toast]');
    t.textContent = msg;
    t.classList.add('fs-show');
    clearTimeout(toast.t);
    toast.t = setTimeout(() => t.classList.remove('fs-show'), 2200);
  }

  function renderPin() {
    const w = page(cur()) && page(cur()).querySelector('.fs-pin');
    if (!w) return;
    const box = w.querySelector('.fs-pin-box');
    box.innerHTML = '';
    for (let i = 0; i < typed.length; i++) box.appendChild(document.createElement('i'));
    w.querySelector('[data-fs-ok]').disabled = typed.length < 4;
  }

  function submit() {
    const w = page(cur()) && page(cur()).querySelector('.fs-pin');
    if (!w || typed.length < 4) return;
    const stage = w.dataset.fsStage;
    const sub = w.querySelector('.fs-pin-sub');
    if (stage === 'verify') {
      stack.pop();
      go('type');
    } else if (stage === 'new') {
      newPin = typed;
      go('confirm');
    } else if (stage === 'confirm') {
      if (typed !== newPin) {
        sub.textContent = 'ה-PIN לא תואם';
        sub.classList.add('fs-err');
        typed = '';
        renderPin();
        return;
      }
      // כמו בטלפון אמיתי: חוזרים ל"מסך נעילה ו-AOD", והטלפון נשאר פתוח עד שמכבים את המסך
      const code = newPin;
      stack = ['main', 'lock'];
      show('lock', true);
      toast('ה-PIN הוגדר');
      listeners.pinSet.forEach((fn) => {
        try {
          fn(code);
        } catch (e) {}
      });
    }
  }

  function vibrate(ms) {
    try {
      if (navigator.vibrate) navigator.vibrate(ms);
    } catch (e) {}
  }

  function bind() {
    root.addEventListener('click', (e) => {
      const b = e.target.closest('[data-fs-back]');
      const g = e.target.closest('[data-fs-go]');
      const t = e.target.closest('[data-fs-toggle]');
      if (b) return back();
      if (g) return go(g.dataset.fsGo);
      if (t) {
        const sw = t.querySelector('.fs-sw');
        if (sw) sw.classList.toggle('fs-swon');
        return;
      }
      if (e.target.closest('[data-fs-ok]')) return submit();
      if (e.target.closest('[data-fs-navback]')) return back();
      if (e.target.closest('[data-fs-home]')) {
        stack = ['main'];
        show('main', true);
      }
    });
    q('[data-fs-kbd]').addEventListener('click', (e) => {
      const k = e.target.closest('.fs-k');
      if (!k) return;
      vibrate(8);
      if (k.dataset.k === 'del') typed = typed.slice(0, -1);
      else if (k.dataset.k === 'ok') return submit();
      else if (typed.length < 16) typed += k.textContent;
      renderPin();
    });
    // יציאה סודית להגדרות האמיתיות של Magic Lock: לחיצה ארוכה (2.5 שניות) בפינה הימנית העליונה
    const secret = q('[data-fs-secret]');
    let secretTimer = null;
    const cancel = () => clearTimeout(secretTimer);
    secret.addEventListener('pointerdown', () => {
      cancel();
      secretTimer = setTimeout(() => {
        vibrate(50);
        listeners.secret.forEach((fn) => {
          try {
            fn();
          } catch (e) {}
        });
      }, 2500);
    });
    ['pointerup', 'pointerleave', 'pointercancel'].forEach((ev) => secret.addEventListener(ev, cancel));
    root.addEventListener('scroll', (e) => {
      if (e.target.classList && e.target.classList.contains('fs-scroll')) syncAppbar(e.target.closest('.fs-page'));
    }, true);
  }

  function tick() {
    if (!root) return;
    const d = new Date();
    const t = String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
    const dt = new Intl.DateTimeFormat('he-IL', { weekday: 'long', day: 'numeric', month: 'long' }).format(d);
    root.querySelectorAll('[data-fs-time]').forEach((el) => (el.textContent = t));
    root.querySelectorAll('[data-fs-date]').forEach((el) => (el.textContent = dt));
  }

  function applyOpts() {
    q('[data-fs-name]').textContent = opts.name || 'החשבון שלי';
    const av = q('[data-fs-avatar]');
    av.classList.toggle('fs-has-photo', Boolean(opts.photo));
    av.style.backgroundImage = opts.photo ? `url("${opts.photo}")` : '';
    const bat = String(opts.battery || 80).replace(/\D/g, '') || '80';
    q('[data-fs-bat]').textContent = bat;
    root.querySelectorAll('.fs-t1').forEach((el) => {
      if (el.dataset.fsOrig === undefined) el.dataset.fsOrig = el.textContent;
      if (el.dataset.fsOrig === '__BATTERY__') el.textContent = bat + '%';
      if (el.dataset.fsOrig === '__MODEL__') el.textContent = opts.model || 'Galaxy';
    });
    const thumb = q('[data-fs-thumb]');
    if (thumb && opts.lockWallpaper) thumb.style.backgroundImage = `url("${opts.lockWallpaper}")`;
  }

  window.FakeSettings = {
    open(o) {
      if (!root) build();
      opts = o || {};
      applyOpts();
      tick();
      clearInterval(this._clock);
      this._clock = setInterval(tick, 15000);
      stack = ['main'];
      show('main');
      root.classList.add('fs-open');
    },
    close() {
      if (root) root.classList.remove('fs-open');
      clearInterval(this._clock);
    },
    isOpen() {
      return Boolean(root && root.classList.contains('fs-open'));
    },
    // נגיעה בכפתור "חזרה" של אנדרואיד בזמן שההגדרות פתוחות
    back() {
      if (stack.length > 1) {
        back();
        return true;
      }
      return false;
    },
    onPinSet(fn) {
      listeners.pinSet.push(fn);
    },
    onSecret(fn) {
      listeners.secret.push(fn);
    }
  };
})();

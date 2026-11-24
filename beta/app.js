// ============================================================================
// MAGIC LOCKSCREEN SIMULATOR (ONE UI 1:1 & iOS + BIOMETRICS + FULLSCREEN)
// ============================================================================

const CONFIG_STORAGE_KEY = 'magic_lockscreen_config_v6';
const WALLPAPER_STORAGE_KEY = 'magic_custom_wallpaper';
// 🔮 הטלפון ידע מראש: התמונה המקורית (בלי שעון/טקסט) שעליה נכתבת המילה
const WORD_WALLPAPER_KEY = 'magic_word_clean_wallpaper';
const SELECTED_WALLPAPER_ID_KEY = 'magic_selected_wallpaper_id_v1';
const HOMESCREEN_STORAGE_KEY = 'magic_custom_homescreen';
const LAST_PIN_KEY = 'last_entered_pin';
const HISTORY_KEY = 'pin_history';
const FORCE_MODE_STORAGE_KEY = 'forceUnlockMode';
const NOTES_TITLE_STORAGE_KEY = 'magic_notes_title_v1';
const NOTES_BODY_STORAGE_KEY = 'magic_notes_body_v1';

// ביטול contextmenu לחלוטין (מניעת תפריטי דפדפן בלחיצה ארוכה)
window.addEventListener(
  'contextmenu',
  (e) => {
    e.preventDefault();
    return false;
  },
  { capture: true }
);

// רוטינת "כפיית פתיחה" (Any PIN Unlocks / Force Routine) - ברירת מחדל: true
let forceUnlockMode = (() => {
  const saved = localStorage.getItem(FORCE_MODE_STORAGE_KEY);
  if (saved === null) {
    localStorage.setItem(FORCE_MODE_STORAGE_KEY, 'true');
    return true;
  }
  return saved === 'true';
})();
let isForceMode = forceUnlockMode;

function setForceModeState(nextState) {
  forceUnlockMode = Boolean(nextState);
  isForceMode = forceUnlockMode;
  try {
    localStorage.setItem(FORCE_MODE_STORAGE_KEY, String(forceUnlockMode));
  } catch (e) {}
  const toggleEl = document.getElementById('toggleForceUnlockMode');
  if (toggleEl) toggleEl.checked = forceUnlockMode;
  const selectorEl = document.getElementById('forceModeSelector');
  if (selectorEl) {
    selectorEl.querySelectorAll('.seg-pill').forEach((btn) => {
      btn.classList.toggle('active', (btn.dataset.forcemode === 'true') === forceUnlockMode);
    });
  }
  // מעדכן את השלט בטלפון השני (אם מחובר)
  if (typeof scheduleLiveStatePublish === 'function') {
    try {
      scheduleLiveStatePublish();
    } catch (e) {}
  }
}

function triggerHaptic(msOrPattern) {
  if (navigator.vibrate) {
    try {
      navigator.vibrate(msOrPattern);
    } catch (e) {}
  }
  if (window.AndroidBridge && typeof window.AndroidBridge.vibrate === 'function') {
    try {
      const arr = Array.isArray(msOrPattern) ? msOrPattern : [msOrPattern];
      window.AndroidBridge.vibrate(JSON.stringify(arr));
    } catch (e) {}
  }
}

let pinAudioCtx = null;
function playKeyClickSound() {
  if (typeof config !== 'undefined' && config && config.keySound === false) return;
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    if (!pinAudioCtx) pinAudioCtx = new AudioCtx();
    if (pinAudioCtx.state === 'suspended') {
      pinAudioCtx.resume().catch(() => {});
    }
    const now = pinAudioCtx.currentTime;
    // צליל הקשה מקורי ועדין של סמסונג (One UI Key Tap)
    const osc = pinAudioCtx.createOscillator();
    const subOsc = pinAudioCtx.createOscillator();
    const gain = pinAudioCtx.createGain();
    osc.type = 'sine';
    subOsc.type = 'triangle';
    osc.frequency.setValueAtTime(640, now);
    osc.frequency.exponentialRampToValueAtTime(195, now + 0.022);
    subOsc.frequency.setValueAtTime(1180, now);
    subOsc.frequency.exponentialRampToValueAtTime(320, now + 0.014);
    gain.gain.setValueAtTime(0.055, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.024);
    osc.connect(gain);
    subOsc.connect(gain);
    gain.connect(pinAudioCtx.destination);
    osc.start(now);
    subOsc.start(now);
    osc.stop(now + 0.025);
    subOsc.stop(now + 0.016);
  } catch (e) {}
}

const FORCE_SECRET_OFF_KEY = 'magic_force_secret_off_v1';

function toggleForceModeSecretly() {
  trackEvent('secret_toggle');
  setForceModeState(!forceUnlockMode);
  // חיווי סודי שמרגישים בלי להסתכל: רטט אחד = נדלק, שני רטטים = נכבה
  triggerHaptic(forceUnlockMode ? 40 : [40, 110, 40]);
  try {
    if (forceUnlockMode) localStorage.removeItem(FORCE_SECRET_OFF_KEY);
    else localStorage.setItem(FORCE_SECRET_OFF_KEY, '1');
  } catch (e) {}
}

// בכניסה להגדרות: אם "פתיחה בכל קוד" כובתה בסתר (לחיצה כפולה) - הודעה ברורה עם כפתור הדלקה
function maybeShowForceOffNotice() {
  let flagged = false;
  try {
    flagged = localStorage.getItem(FORCE_SECRET_OFF_KEY) === '1';
  } catch (e) {}
  const old = document.getElementById('forceOffNotice');
  if (old) old.remove();
  if (forceUnlockMode || !flagged) return;
  const n = document.createElement('div');
  n.id = 'forceOffNotice';
  n.className = 'force-off-notice';
  const txt = document.createElement('span');
  txt.textContent = '⚠️ "פתיחה בכל קוד" כבויה - כבתה בלחיצה כפולה על השעון. רק הקוד שהגדרת יפתח.';
  const on = document.createElement('button');
  on.type = 'button';
  on.textContent = 'הדלק';
  on.addEventListener('click', () => {
    setForceModeState(true);
    try {
      localStorage.removeItem(FORCE_SECRET_OFF_KEY);
    } catch (e) {}
    n.remove();
  });
  const close = document.createElement('button');
  close.type = 'button';
  close.className = 'fon-close';
  close.textContent = '✕';
  close.addEventListener('click', () => {
    try {
      localStorage.removeItem(FORCE_SECRET_OFF_KEY);
    } catch (e) {}
    n.remove();
  });
  n.append(txt, on, close);
  setupOverlay.appendChild(n);
}

// ----------------------------------------------------------------------------
// 1. מחולל טפטים רשמיים מובנים (SVG Data-URI מהירים, חדים וללא תלות ברשת)
// ----------------------------------------------------------------------------
function createSvgWallpaper(stops, shapesSvg = '', angle = 145) {
  const rad = (angle * Math.PI) / 180;
  const x2 = Math.round(50 + Math.sin(rad) * 50);
  const y2 = Math.round(50 + Math.cos(rad) * 50);
  const stopsXml = stops
    .map(([offset, color]) => `<stop offset="${offset}%" stop-color="${color}"/>`)
    .join('');

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1080 2400" preserveAspectRatio="xMidYMid slice">
    <defs>
      <linearGradient id="bg" x1="0%" y1="0%" x2="${x2}%" y2="${y2}%">${stopsXml}</linearGradient>
      <radialGradient id="glow1" cx="30%" cy="25%" r="55%">
        <stop offset="0%" stop-color="rgba(255,255,255,0.28)"/>
        <stop offset="100%" stop-color="rgba(255,255,255,0)"/>
      </radialGradient>
      <radialGradient id="glow2" cx="75%" cy="72%" r="50%">
        <stop offset="0%" stop-color="rgba(56,189,248,0.22)"/>
        <stop offset="100%" stop-color="rgba(0,0,0,0)"/>
      </radialGradient>
    </defs>
    <rect width="1080" height="2400" fill="url(#bg)"/>
    <rect width="1080" height="2400" fill="url(#glow1)"/>
    <rect width="1080" height="2400" fill="url(#glow2)"/>
    ${shapesSvg}
  </svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

// ----------------------------------------------------------------------------
// 2. מאגר דגמים מלא (Presets: Samsung S20-S26 & Apple iPhone 12-18)
// ----------------------------------------------------------------------------
const MODEL_PRESETS = {
  samsung: [
    {
      id: 's20',
      name: 'Galaxy S20',
      year: '2020',
      cutout: 'punch',
      defaultWallpaper: createSvgWallpaper(
        [[0, '#0f172a'], [38, '#1e3a8a'], [74, '#ec4899'], [100, '#fbcfe8']],
        `<path d="M-100 1700 C320 1350, 760 1980, 1200 1550 L1200 2400 L-100 2400 Z" fill="rgba(255,255,255,0.14)"/>
         <circle cx="540" cy="880" r="420" fill="rgba(244,114,182,0.18)"/>`
      )
    },
    {
      id: 's21',
      name: 'Galaxy S21',
      year: '2021',
      cutout: 'punch',
      defaultWallpaper: createSvgWallpaper(
        [[0, '#1e1b4b'], [42, '#5b21b6'], [78, '#c084fc'], [100, '#f5d0fe']],
        `<path d="M0 400 Q540 950 1080 350 L1080 1450 Q540 1000 0 1550 Z" fill="rgba(255,255,255,0.12)"/>`
      )
    },
    {
      id: 's22',
      name: 'Galaxy S22',
      year: '2022',
      cutout: 'punch',
      defaultWallpaper: createSvgWallpaper(
        [[0, '#042f2e'], [40, '#0f766e'], [78, '#fb7185'], [100, '#fde68a']],
        `<circle cx="380" cy="980" r="460" fill="rgba(45,212,191,0.2)"/>
         <circle cx="720" cy="1360" r="390" fill="rgba(251,113,133,0.22)"/>`
      )
    },
    {
      id: 's23',
      name: 'Galaxy S23',
      year: '2023',
      cutout: 'punch',
      defaultWallpaper: createSvgWallpaper(
        [[0, '#052e16'], [45, '#14532d'], [80, '#3f6212'], [100, '#bef264']],
        `<circle cx="540" cy="1120" r="480" fill="rgba(163,230,53,0.16)"/>
         <circle cx="540" cy="1120" r="290" fill="rgba(255,255,255,0.1)"/>`
      )
    },
    {
      id: 's24',
      name: 'Galaxy S24',
      year: '2024',
      cutout: 'punch',
      defaultWallpaper: createSvgWallpaper(
        [[0, '#1c1917'], [38, '#57534e'], [74, '#d97706'], [100, '#fef08a']],
        `<polygon points="540,360 960,1150 540,1920 120,1150" fill="rgba(251,191,36,0.16)"/>
         <polygon points="540,560 820,1150 540,1720 260,1150" fill="rgba(255,255,255,0.12)"/>`
      )
    },
    {
      id: 's25',
      name: 'Galaxy S25',
      year: '2025',
      cutout: 'punch',
      defaultWallpaper: createSvgWallpaper(
        [[0, '#090d1e'], [38, '#1e1b4b'], [72, '#3b0764'], [100, '#581c87']],
        `<circle cx="540" cy="960" r="500" fill="rgba(56,189,248,0.15)"/>
         <path d="M-80 1650 Q540 1220 1160 1650 L1160 2400 L-80 2400 Z" fill="rgba(192,38,211,0.16)"/>`
      )
    },
    {
      id: 's26',
      name: 'Galaxy S26',
      year: '2026',
      cutout: 'punch',
      defaultWallpaper: createSvgWallpaper(
        [[0, '#0c0a24'], [35, '#1e1b4b'], [72, '#4c1d95'], [100, '#701a75']],
        `<ellipse cx="540" cy="1080" rx="460" ry="620" fill="rgba(56,189,248,0.14)"/>
         <ellipse cx="540" cy="1080" rx="280" ry="420" fill="rgba(244,114,182,0.15)"/>`
      )
    }
  ],
  // Google Pixel: אנדרואיד "נקי" (Material You)
  pixel: [
    {
      id: 'pixel7',
      name: 'Pixel 7',
      year: '2022',
      cutout: 'punch',
      defaultWallpaper: createSvgWallpaper(
        [[0, '#10221b'], [45, '#1f4d3a'], [80, '#6fbf8e'], [100, '#d8f3dc']],
        `<circle cx="300" cy="1500" r="520" fill="rgba(255,255,255,0.10)"/>
         <circle cx="820" cy="760" r="360" fill="rgba(216,243,220,0.14)"/>`
      )
    },
    {
      id: 'pixel8',
      name: 'Pixel 8',
      year: '2023',
      cutout: 'punch',
      defaultWallpaper: createSvgWallpaper(
        [[0, '#1b1a2e'], [42, '#3d3a6b'], [78, '#a59ad9'], [100, '#ece7ff']],
        `<path d="M-60 1500 Q540 1050 1140 1500 L1140 2400 L-60 2400 Z" fill="rgba(255,255,255,0.12)"/>`
      )
    },
    {
      id: 'pixel9',
      name: 'Pixel 9',
      year: '2024',
      cutout: 'punch',
      defaultWallpaper: createSvgWallpaper(
        [[0, '#2a1610'], [40, '#6b3420'], [78, '#e0905f'], [100, '#ffe4cf']],
        `<ellipse cx="540" cy="1250" rx="520" ry="420" fill="rgba(255,228,207,0.14)"/>`
      )
    },
    {
      id: 'pixel10',
      name: 'Pixel 10',
      year: '2025',
      cutout: 'punch',
      defaultWallpaper: createSvgWallpaper(
        [[0, '#0b1a2b'], [40, '#16426b'], [78, '#7fb3e6'], [100, '#e3f0ff']],
        `<circle cx="540" cy="1100" r="460" fill="rgba(227,240,255,0.13)"/>
         <circle cx="540" cy="1100" r="260" fill="rgba(255,255,255,0.08)"/>`
      )
    }
  ],
  // Xiaomi / Redmi: ממשק HyperOS
  xiaomi: [
    {
      id: 'redmi13',
      name: 'Redmi Note 13',
      year: '2024',
      cutout: 'punch',
      defaultWallpaper: createSvgWallpaper(
        [[0, '#0e1530'], [40, '#23377a'], [76, '#5b8def'], [100, '#cfe0ff']],
        `<path d="M0 900 C360 1200, 720 600, 1080 900 L1080 2400 L0 2400 Z" fill="rgba(255,255,255,0.10)"/>`
      )
    },
    {
      id: 'redmi14',
      name: 'Redmi Note 14',
      year: '2025',
      cutout: 'punch',
      defaultWallpaper: createSvgWallpaper(
        [[0, '#1a0f24'], [42, '#4a1d5e'], [78, '#c45ab3'], [100, '#ffd6f2']],
        `<circle cx="760" cy="900" r="420" fill="rgba(255,214,242,0.14)"/>`
      )
    },
    {
      id: 'xiaomi14',
      name: 'Xiaomi 14',
      year: '2024',
      cutout: 'punch',
      defaultWallpaper: createSvgWallpaper(
        [[0, '#111111'], [42, '#2d2d2d'], [78, '#ff6900'], [100, '#ffd2b0']],
        `<circle cx="540" cy="1400" r="560" fill="rgba(255,105,0,0.14)"/>`
      )
    },
    {
      id: 'xiaomi15',
      name: 'Xiaomi 15',
      year: '2025',
      cutout: 'punch',
      defaultWallpaper: createSvgWallpaper(
        [[0, '#06141c'], [40, '#0d3b4f'], [78, '#38a3c4'], [100, '#d6f5ff']],
        `<ellipse cx="540" cy="1000" rx="480" ry="620" fill="rgba(214,245,255,0.12)"/>`
      )
    }
  ],
  ios: [
    {
      id: 'iphone12',
      name: 'iPhone 12',
      year: 'Notch',
      cutout: 'notch',
      defaultWallpaper: createSvgWallpaper(
        [[0, '#0f172a'], [36, '#1d4ed8'], [72, '#ec4899'], [100, '#fda4af']],
        `<circle cx="540" cy="1200" r="560" fill="rgba(59,130,246,0.22)"/>
         <circle cx="540" cy="1200" r="360" fill="rgba(244,114,182,0.25)"/>`
      )
    },
    {
      id: 'iphone13',
      name: 'iPhone 13',
      year: 'Notch',
      cutout: 'notch',
      defaultWallpaper: createSvgWallpaper(
        [[0, '#0c4a6e'], [42, '#0284c7'], [76, '#7dd3fc'], [100, '#f0f9ff']],
        `<path d="M0 700 C400 1050, 680 450, 1080 850 L1080 1850 C680 1450, 400 2050, 0 1700 Z" fill="rgba(255,255,255,0.22)"/>`
      )
    },
    {
      id: 'iphone14',
      name: 'iPhone 14',
      year: 'Dynamic Island',
      cutout: 'island',
      defaultWallpaper: createSvgWallpaper(
        [[0, '#2e1065'], [44, '#6d28d9'], [80, '#c084fc'], [100, '#f3e8ff']],
        `<ellipse cx="540" cy="1160" rx="480" ry="680" fill="rgba(255,255,255,0.15)"/>`
      )
    },
    {
      id: 'iphone15',
      name: 'iPhone 15',
      year: 'Dynamic Island',
      cutout: 'island',
      defaultWallpaper: createSvgWallpaper(
        [[0, '#18181b'], [40, '#3f3f46'], [76, '#60a5fa'], [100, '#dbeafe']],
        `<path d="M-60 1100 Q540 650 1140 1100 L1140 1700 Q540 1250 -60 1700 Z" fill="rgba(147,197,253,0.2)"/>`
      )
    },
    {
      id: 'iphone16',
      name: 'iPhone 16',
      year: 'Dynamic Island',
      cutout: 'island',
      defaultWallpaper: createSvgWallpaper(
        [[0, '#1e1b4b'], [38, '#4338ca'], [74, '#818cf8'], [100, '#fde68a']],
        `<circle cx="340" cy="950" r="420" fill="rgba(129,140,248,0.25)"/>
         <circle cx="740" cy="1380" r="420" fill="rgba(251,191,36,0.22)"/>`
      )
    },
    {
      id: 'iphone17',
      name: 'iPhone 17',
      year: 'Dynamic Island',
      cutout: 'island',
      defaultWallpaper: createSvgWallpaper(
        [[0, '#042f2e'], [38, '#0f766e'], [76, '#38bdf8'], [100, '#f0fdfa']],
        `<ellipse cx="540" cy="1050" rx="520" ry="440" fill="rgba(255,255,255,0.16)"/>`
      )
    },
    {
      id: 'iphone18',
      name: 'iPhone 18',
      year: 'Dynamic Island',
      cutout: 'island',
      defaultWallpaper: createSvgWallpaper(
        [[0, '#090d16'], [32, '#311042'], [68, '#0284c7'], [100, '#a5f3fc']],
        `<circle cx="540" cy="1040" r="480" fill="rgba(56,189,248,0.2)"/>
         <circle cx="540" cy="1380" r="350" fill="rgba(244,114,182,0.2)"/>`
      )
    }
  ]
};

// גלריית טפטים נוספים לכל מערכת הפעלה
const BUILTIN_GALLERY_WALLPAPERS = {
  samsung: [
    {
      id: 'sam_aurora',
      label: 'One UI Violet',
      dataUrl: createSvgWallpaper(
        [[0, '#0c0d24'], [45, '#1e1b4b'], [82, '#581c87'], [100, '#831843']],
        `<circle cx="540" cy="920" r="450" fill="rgba(56,189,248,0.16)"/>`
      )
    },
    {
      id: 'sam_titanium',
      label: 'Titanium Gold',
      dataUrl: createSvgWallpaper(
        [[0, '#1c1917'], [48, '#78350f'], [82, '#f59e0b'], [100, '#fef3c7']],
        `<polygon points="540,340 940,1200 540,2040 140,1200" fill="rgba(255,255,255,0.14)"/>`
      )
    },
    {
      id: 'sam_crystal',
      label: 'Emerald Wave',
      dataUrl: createSvgWallpaper(
        [[0, '#064e3b'], [46, '#059669'], [82, '#34d399'], [100, '#d1fae5']],
        `<path d="M-80 1550 Q540 1100 1160 1550 L1160 2400 L-80 2400 Z" fill="rgba(255,255,255,0.16)"/>`
      )
    }
  ],
  ios: [
    {
      id: 'ios_bloom',
      label: 'iOS Glow',
      dataUrl: createSvgWallpaper(
        [[0, '#1e1b4b'], [40, '#6d28d9'], [76, '#ec4899'], [100, '#fbcfe8']],
        `<circle cx="540" cy="1100" r="460" fill="rgba(255,255,255,0.18)"/>`
      )
    },
    {
      id: 'ios_ocean',
      label: 'Pacific Blue',
      dataUrl: createSvgWallpaper(
        [[0, '#082f49'], [44, '#0284c7'], [80, '#38bdf8'], [100, '#e0f2fe']],
        `<ellipse cx="540" cy="1240" rx="520" ry="380" fill="rgba(255,255,255,0.18)"/>`
      )
    },
    {
      id: 'ios_sunset',
      label: 'Desert Gold',
      dataUrl: createSvgWallpaper(
        [[0, '#3b0764'], [42, '#be185d'], [78, '#fb923c'], [100, '#fef08a']],
        `<circle cx="540" cy="960" r="440" fill="rgba(254,240,138,0.2)"/>`
      )
    }
  ]
};

// ----------------------------------------------------------------------------
// 3. קונפיגורציה ושמירה ב-localStorage
// ----------------------------------------------------------------------------
// שפת הממשק (עברית / אנגלית) - נקבעת ב-i18n.js שנטען לפני הקובץ הזה
function isEnglishUi() {
  return Boolean(window.MagicI18n && window.MagicI18n.isEn);
}
const REVEAL_TEXT_DEFAULT_HE = 'אל תשכח, הקוד של השער הוא {קוד} 😊';
const REVEAL_TEXT_DEFAULT_EN = "Don't forget, the gate code is {code} 😊";

// באנדרואיד, אחרי "פתיחה בכל קוד" האפליקציה יוצאת למסך הבית האמיתי -
// חוץ מכשיש חשיפה שקורית בתוך האפליקציה (פתקים, גלריה, שיחה נכנסת).
function staysInAppAfterUnlock() {
  // (בקסם "תחליף לי את הסיסמה" אחרי שהמסך כבה, הטלפון האמיתי נעול - לכן נשארים במסך הבית שבאפליקציה)
  return ['notes', 'gallery', 'search'].includes(config.unlockTargetScreen) || Boolean(config.callReveal) || Boolean(config.faceTrick) || Boolean(typeof settingsTrickPin !== 'undefined' && settingsTrickPin);
}

// מחליף את {קוד} / {code} בקוד שהוקלד
function fillCodePlaceholder(template, code) {
  return String(template || '').replace(/\{(קוד|code)\}/gi, String(code));
}

const DEFAULT_CONFIG = {
  osTheme: 'samsung',           // 'samsung' (כל טלפוני אנדרואיד) | 'ios'
  androidBrand: 'samsung',      // סוג האנדרואיד: 'samsung' | 'pixel' | 'xiaomi' (משנה את המראה בלבד)
  carrierText: '',              // שם הספק שמופיע למעלה במסך הנעילה (למשל Pelephone)
  lockOwnerInfo: '',            // טקסט אישי במסך הנעילה (כמו "פרטי קשר" בסמסונג)
  deviceModel: 's26',           // 's20'..'s26' | 'iphone12'..'iphone18'
  unlockMode: 'pin',            // 'pin' | 'pattern' | 'words' | 'swipe'
  pinLength: 4,                 // 4 | 6 (אורך קוד PIN: 4 או 6 ספרות)
  unlockAttemptMode: 'immediate', // ישן - נשמר רק לתאימות להגדרות קודמות
  unlockOnAttempt: null,        // 1..5 - באיזה ניסיון הטלפון ייפתח (בכפיית פתיחה)
  keySound: true,               // צליל מקשים מקורי של סמסונג
  unlockTargetScreen: 'homescreen', // 'homescreen' | 'notes'
  registeredPasscode: '1234',   // הסיסמה האישית שנרשמה ב-Setup (עבור PIN / מקלדת)
  registeredPattern: '12369',   // הדפוס האישי שנרשם ב-Setup (עבור Pattern בלבד)
  fingerprintEnrolled: false,   // האם טביעת אצבע כוילה ונרשמה ב-Setup
  secretFpBypass: true,         // החלקת אצבע סודית (מעקף מהיר על חיישן טביעת האצבע)
  fingerprintHoldMs: 480,       // משך לחיצה מכויל במילישניות
  fingerprintZoneX: 0.5,        // מיקום X מכויל על החיישן (0..1)
  fingerprintZoneY: 0.5,        // מיקום Y מכויל על החיישן (0..1)
  faceIdEnrolled: false,        // האם Face ID נרשם ב-Setup
  faceSignature: null,          // ישן (לפני זיהוי הפנים החכם)
  faceDescriptor: null,         // טביעת פנים (128 מספרים) - נשמרת רק בטלפון
  fingerprintProfile: null,     // פרופיל טביעת אצבע (מיקום, משך, גודל מגע)
  stealthPattern: false,
  showStatusBar: true,
  showPunchHole: true,
  hapticPeek: true,
  chameleonClock: true,
  holdPeek: true,
  watchPeek: false,             // שליחת הקוד שהוקלד לשעון החכם (התראה שקטה)
  remotePeek: false,            // שליחת הקוד בזמן אמת לטלפון שני (קישור סודי)
  uiLang: 'he',                 // שפת האפליקציה: 'he' | 'en'
  revealEnabled: false,         // חשיפה בהתראה אחרי הפתיחה
  revealDelaySec: 5,
  revealSender: isEnglishUi() ? 'Mom' : 'אמא',
  revealText: isEnglishUi() ? REVEAL_TEXT_DEFAULT_EN : REVEAL_TEXT_DEFAULT_HE,
  notesReveal: false,           // חשיפה בפתקים: הקוד מופיע בפתק שכאילו נכתב מראש
  notesAge: '60',               // לפני כמה דקות "נכתב" הפתק ('yesterday' = אתמול)
  galleryText: isEnglishUi() ? '{code}' : '{קוד}', // מה כתוב על הפתק בתמונה בגלריה
  searchText: isEnglishUi() ? '{code}' : '{קוד}', // החיפוש האחרון בחשיפה בחיפוש
  settingsTrick: false,         // "תחליף לי את הסיסמה": הגדרות סמסונג מזויפות, הצופה קובע PIN חדש
  settingsTrickName: '',        // השם שמופיע בראש ההגדרות המזויפות
  faceTrick: false,             // "הטלפון מזהה את הצופה": נכשל לקוסם, נפתח לצופה + סלפי שלו כטפט
  faceTrickFails: 1,            // כמה פעמים הזיהוי נכשל לקוסם לפני שמגישים לצופה
  callReveal: false,            // חשיפה בשיחה נכנסת אחרי הפתיחה
  liveRead: false,              // "קריאה בזמן אמת": כל ספרה נלחשת לאוזניית הקוסם ברגע שנלחצת
  liveReadRecap: true,          // בסוף ההקלדה - חזרה על כל הקוד
  liveReadVoice: false,         // אנדרואיד: "תחזור על הקוד" בקול - הקוד נלחש שוב
  wordPredict: false,           // "הטלפון ידע מראש": הצופה אומר מילה, והיא מופיעה מתחת לשעון
  wordPredictTpl: '{מילה}',     // מה כתוב בהתראה ({מילה} = מה שהצופה אמר)
  wordPredictTitle: 'תזכורת',    // כותרת ההתראה האמיתית במסך הנעילה
  wordPredictAgo: 180,          // ההתראה "נשלחה" לפני X דקות
  wordPredictMode: 'wallpaper', // איפה המילה מופיעה במסך הנעילה האמיתי: 'wallpaper' (בשורה למטה) או 'notification'
  liveReadLang: isEnglishUi() ? 'en' : 'he',
  cardTrick: false,             // 🃏 "הקלף בטלפון": הצופה אומר קלף - הטפט הופך לקלף שלו
  galleryPredict: false,        // 📸 "התמונה כבר הייתה שם": המילה של הצופה בתמונה "מהבוקר" בגלריה האמיתית
  galleryPredictAgo: 2,         // התמונה "צולמה" לפני X דקות (2 = תמיד ראשונה בגלריה)
  galleryPredictTpl: '{מילה}',  // מה כתוב על הפתק
  galleryPredictSource: 'voice', // 'voice' (מה שהצופה אומר) או 'code' (הקוד שהוא מקליד - 100%)
  remoteTrick: false,           // 🗣️ "שלט רחוק סודי": מילת קוד של הקוסם - קופצת הודעה / מתחלפת התמונה
  remoteWord: 'וואלה',          // מילת הקוד
  remoteAction: 'notif',        // 'notif' (הודעה במסך הנעילה) או 'photo' (הטפט מתחלף לתמונה)
  remoteNotifTitle: 'אמא',
  remoteNotifText: 'תגיד לחבר שלך שלום 👋',
  voiceLang: isEnglishUi() ? 'en' : 'he',
  callName: isEnglishUi() ? '{code}' : '{קוד}',    // שם המתקשר שמופיע על המסך
  callDelaySec: 4,
  practiceMode: false,          // מצב תרגול: בלי היסטוריה ובלי סטטיסטיקה
  showFingerprint: true,
  settingsColorScheme: 'dark'   // 'dark' | 'light' עבור ערכת הנושא של מסך ההגדרות
};

let config = loadConfig();
// התקנה ראשונה בטלפון שאינו בעברית: i18n.js כבר בחר אנגלית - שומרים את זה גם בהגדרות
if (window.MagicI18n && window.MagicI18n.isEn && config.uiLang !== 'en') config.uiLang = 'en';

// 7.6: פיצ'רים שהוסתרו מהגרסה לקוסמים (הקוד נשאר) - תמיד כבויים, גם אם נשמרו דולקים ברוטינה/גיבוי ישן.
// אחרי הפתיחה: רק מסך הבית האמיתי.
function enforceRetiredFeatures(cfg) {
  if (!cfg) return cfg;
  // 10.9: 📸 "הבוקר" הכניס את התמונה מתחת לצילומי המסך של היום -> עוברים ל"לפני 2 דקות" (פעם אחת)
  try {
    if (!localStorage.getItem('magic_gp_ago_mig_v1')) {
      if (Number(cfg.galleryPredictAgo) !== 2) cfg.galleryPredictAgo = 2;
      localStorage.setItem('magic_gp_ago_mig_v1', '1');
    }
    // 11.4 העביר בטעות ל"קוד" - מחזירים פעם אחת למילה שהצופה אומר (הקוד הוא כבר הקסם עצמו)
    if (!localStorage.getItem('magic_gp_src_mig_v2')) {
      cfg.galleryPredictSource = 'voice';
      localStorage.setItem('magic_gp_src_mig_v2', '1');
    }
  } catch (e) {}
  cfg.settingsTrick = false;
  cfg.faceTrick = false;
  cfg.notesReveal = false;
  cfg.unlockTargetScreen = 'homescreen';
  // 7.8: הוסרו גם החשיפה בהתראה והשיחה הנכנסת
  cfg.revealEnabled = false;
  cfg.callReveal = false;
  // 9.0: "הטלפון ידע מראש" הוסר (אנדרואיד לא מאפשר לכתוב בשורה של מסך הנעילה)
  cfg.wordPredict = false;
  // 9.4: הוסרו גם "הקלף בטלפון" ו"שלט רחוק סודי"
  cfg.cardTrick = false;
  cfg.remoteTrick = false;
  return cfg;
}

function loadConfig() {
  try {
    const raw = localStorage.getItem(CONFIG_STORAGE_KEY);
    if (!raw) return enforceRetiredFeatures({ ...DEFAULT_CONFIG });
    const parsed = JSON.parse(raw);
    return enforceRetiredFeatures({ ...DEFAULT_CONFIG, ...parsed });
  } catch (e) {
    return enforceRetiredFeatures({ ...DEFAULT_CONFIG });
  }
}

// באיזה ניסיון הטלפון נפתח (1-5). הגדרות ישנות: "ניסיון שני" = 2, "פתיחה מידית" = 1
function getUnlockOnAttempt() {
  const n = Number(config.unlockOnAttempt);
  if (Number.isInteger(n) && n >= 1 && n <= 5) return n;
  return config.unlockAttemptMode === 'second' ? 2 : 1;
}

function saveConfig() {
  enforceRetiredFeatures(config);
  try {
    localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(config));
  } catch (e) {
    console.warn('Could not save config', e);
  }
  if (typeof scheduleCloudBackup === 'function') scheduleCloudBackup();
  if (typeof scheduleLiveStatePublish === 'function') scheduleLiveStatePublish();
}

// ----------------------------------------------------------------------------
// 4. הפניית אלמנטים ב-DOM
// ----------------------------------------------------------------------------
const splashScreen = document.getElementById('splashScreen');
const setupOverlay = document.getElementById('setupOverlay');
const splitChoiceScreen = document.getElementById('splitChoiceScreen');
const chooseSamsungBtn = document.getElementById('chooseSamsungBtn');
const chooseIosBtn = document.getElementById('chooseIosBtn');
const deviceConfigSheet = document.getElementById('deviceConfigSheet');
const backToSplitBtn = document.getElementById('backToSplitBtn');
const selectedDevicePill = document.getElementById('selectedDevicePill');
const modelPresetsGrid = document.getElementById('modelPresetsGrid');
const launchLockscreenBtn = document.getElementById('launchLockscreenBtn');

// Setup Biometrics, Passcode & Pattern DOM
const setupPasscodeBox = document.getElementById('setupPasscodeBox');
const setupPasscodeInput = document.getElementById('setupPasscodeInput');
const setupPasscodeSavedBadge = document.getElementById('setupPasscodeSavedBadge');

const setupPatternBox = document.getElementById('setupPatternBox');
const setupPatternStatusText = document.getElementById('setupPatternStatusText');
const setupPatternSavedBadge = document.getElementById('setupPatternSavedBadge');
const setupPatternWrapper = document.getElementById('setupPatternWrapper');
const setupPatternSvg = document.getElementById('setupPatternSvg');
const setupPatternLine = document.getElementById('setupPatternLine');
const setupPatternNodes = Array.from(document.querySelectorAll('.setup-pattern-node'));

const fpEnrollSection = document.getElementById('fpEnrollSection');
const fpEnrollStatusText = document.getElementById('fpEnrollStatusText');
const openFpEnrollBtn = document.getElementById('openFpEnrollBtn');
const fpEnrollPadWrap = document.getElementById('fpEnrollPadWrap');
const fpEnrollSteps = document.getElementById('fpEnrollSteps');
const fpEnrollSensor = document.getElementById('fpEnrollSensor');
const fpEnrollHint = document.getElementById('fpEnrollHint');

const faceIdEnrollSection = document.getElementById('faceIdEnrollSection');
const faceIdEnrollStatusText = document.getElementById('faceIdEnrollStatusText');
const startFaceIdEnrollBtn = document.getElementById('startFaceIdEnrollBtn');
const faceIdCameraBox = document.getElementById('faceIdCameraBox');
const faceIdVideoCircle = document.getElementById('faceIdVideoCircle');
const setupFaceVideo = document.getElementById('setupFaceVideo');
const faceIdRingOverlay = document.getElementById('faceIdRingOverlay');
const faceIdScanCaption = document.getElementById('faceIdScanCaption');

// Lockscreen DOM
const phoneContainer = document.getElementById('phoneContainer');
const statusBar = document.getElementById('statusBar');
const cameraPunchHole = document.getElementById('cameraPunchHole');
const islandLiveCam = document.getElementById('islandLiveCam');
const statusTime = document.getElementById('statusTime');
const statusRightIcons = document.getElementById('statusRightIcons');
const lockIconTrigger = document.getElementById('lockIconTrigger');
const secretCornerTrigger = document.getElementById('secretCornerTrigger');
const secretTopRightHoldZone = document.getElementById('secretTopRightHoldZone');

const clockLockScreen = document.getElementById('clockLockScreen');
const clockLockBigTime = document.getElementById('clockLockBigTime');
const clockLockDate = document.getElementById('clockLockDate');

const titleGroup = document.getElementById('titleGroup');
const mainTitle = document.getElementById('mainTitle');
const subTitle = document.getElementById('subTitle');
const errorMsg = document.getElementById('errorMsg');

const oneUiPasswordPillWrap = document.getElementById('oneUiPasswordPillWrap');
const oneUiPasswordForm = document.getElementById('oneUiPasswordForm');
const wordGlassField = document.getElementById('wordGlassField');
const passwordInput = document.getElementById('passwordInput');
const togglePasswordEyeBtn = document.getElementById('togglePasswordEyeBtn');
const pinDotsContainer = document.getElementById('pinDots');

const viewPin = document.getElementById('viewPin');
const viewPattern = document.getElementById('viewPattern');
const viewWords = document.getElementById('viewWords');
const viewSwipe = document.getElementById('viewSwipe');
const swipeUnlockArea = document.getElementById('swipeUnlockArea');

const numericKeypad = document.getElementById('numericKeypad');
const keypadBackspaceBtn = document.getElementById('keypadBackspaceBtn');
const keypadOkBtn = document.getElementById('keypadOkBtn');
const wordSubmitInlineBtn = document.getElementById('wordSubmitInlineBtn');

const patternWrapper = document.getElementById('patternWrapper');
const patternSvg = document.getElementById('patternSvg');
const patternLine = document.getElementById('patternLine');
const patternNodes = Array.from(document.querySelectorAll('.pattern-node'));

const fingerprintContainer = document.getElementById('fingerprintContainer');
const samsungBackBtn = document.getElementById('samsungBackBtn');
const iosFooter = document.getElementById('iosFooter');
const iosSwipeHint = document.getElementById('iosSwipeHint');
const iosRightActionBtn = document.getElementById('iosRightActionBtn');

const fakeHomescreen = document.getElementById('fakeHomescreen');
const defaultHomescreenUi = document.getElementById('defaultHomescreenUi');
const fakeNotesApp = document.getElementById('fakeNotesApp');
const notesDateLine = document.getElementById('notesDateLine');
const notesTitleInput = document.getElementById('notesTitleInput');
const notesBodyTextarea = document.getElementById('notesBodyTextarea');
const notesDoneBtn = document.getElementById('notesDoneBtn');
const secretRelockZone = document.getElementById('secretRelockZone');
const homeClock = document.getElementById('homeClock');
const homeDate = document.getElementById('homeDate');

const secretPeek = document.getElementById('secretPeek');
const peekText = document.getElementById('peekText');
const peekPatternMini = document.getElementById('peekPatternMini');

// Settings Controls
const modeSelector = document.getElementById('modeSelector');
const pinLengthGroup = document.getElementById('pinLengthGroup');
const pinLengthSelector = document.getElementById('pinLengthSelector');
const unlockAttemptModeSelector = document.getElementById('unlockAttemptModeSelector');
const toggleKeySound = document.getElementById('toggleKeySound');
const inAppUpdateBanner = document.getElementById('inAppUpdateBanner');
const inAppUpdateBtn = document.getElementById('inAppUpdateBtn');
const inAppUpdateStatus = document.getElementById('inAppUpdateStatus');
const installedVersionLabel = document.getElementById('installedVersionLabel');
const cloudVersionStatusText = document.getElementById('cloudVersionStatusText');
const checkUpdateNowBtn = document.getElementById('checkUpdateNowBtn');
const pinQuickWidgetBtn = document.getElementById('pinQuickWidgetBtn');
const forceModeSelector = document.getElementById('forceModeSelector');
const unlockTargetSelector = document.getElementById('unlockTargetSelector');
const toggleForceUnlockMode = document.getElementById('toggleForceUnlockMode');
const toggleSecretFpBypass = document.getElementById('toggleSecretFpBypass');
const floatingCloseSettingsBtn = document.getElementById('floatingCloseSettingsBtn');
const settingsThemeToggleBtn = document.getElementById('settingsThemeToggleBtn');
const currentWallpaperCirclePreview = document.getElementById('currentWallpaperCirclePreview');
const statusBarSelector = document.getElementById('statusBarSelector');
const stealthPatternGroup = document.getElementById('stealthPatternGroup');
const toggleStealthPattern = document.getElementById('toggleStealthPattern');
const toggleStatusBar = document.getElementById('toggleStatusBar');
const togglePunchHole = document.getElementById('togglePunchHole');
const toggleHapticPeek = document.getElementById('toggleHapticPeek');
const toggleChameleonClock = document.getElementById('toggleChameleonClock');
const toggleHoldPeek = document.getElementById('toggleHoldPeek');
const toggleFingerprint = document.getElementById('toggleFingerprint');
const fingerprintSettingRow = document.getElementById('fingerprintSettingRow');

const wallpaperGalleryRow = document.getElementById('wallpaperGalleryRow');
const cycleWallpaperBtn = document.getElementById('cycleWallpaperBtn');
const wallpaperFileInput = document.getElementById('wallpaperFileInput');
const clearWallpaperBtn = document.getElementById('clearWallpaperBtn');
const homescreenFileInput = document.getElementById('homescreenFileInput');
const clearHomescreenBtn = document.getElementById('clearHomescreenBtn');
const settingsLastInput = document.getElementById('settingsLastInput');

// State Variables
let isLockedOut = false;
let isPasswordVisible = false;
let activePatternNodes = [];
let isDrawingPattern = false;
let isClockPeekActive = false;
let clockPeekTimeout = null;
let holdPeekTimer = null;
let faceIdUnlocked = false;
let faceIdTimer = null;
let activeCameraStream = null;
let forceAttemptCount = 0;

// ----------------------------------------------------------------------------
// 5. פתיח (Splash Screen) - 1.1 שניות
// ----------------------------------------------------------------------------
function initSplashScreen() {
  if (!splashScreen) return;
  setTimeout(() => {
    splashScreen.classList.add('fade-out');
    setTimeout(() => {
      splashScreen.style.display = 'none';
    }, 450);
  }, 1050);
}

// ----------------------------------------------------------------------------
// 6. מסך הגדרות מקדים (Setup / Onboarding) עם מעבר חלק וללא קפיצת מסך
// ----------------------------------------------------------------------------
// סוג האנדרואיד (סמסונג / פיקסל / שיאומי). כל טלפוני האנדרואיד עובדים באותו מנגנון - משתנה רק המראה
const ANDROID_BRANDS = ['samsung', 'pixel', 'xiaomi'];
const BRAND_LABELS = { samsung: 'Samsung', pixel: 'Google', xiaomi: '' };

function currentAndroidBrand() {
  return ANDROID_BRANDS.includes(config.androidBrand) ? config.androidBrand : 'samsung';
}

function getModelsForCurrentOs() {
  if (config.osTheme === 'ios') return MODEL_PRESETS.ios;
  return MODEL_PRESETS[currentAndroidBrand()] || MODEL_PRESETS.samsung;
}

function getCurrentModelObject() {
  const list = getModelsForCurrentOs();
  return list.find((m) => m.id === config.deviceModel) || list[list.length - 1];
}

function openDeviceConfigFor(osTheme, brand) {
  setTimeout(() => {
    if (typeof maybeStartTour === 'function') maybeStartTour();
  }, 700);
  config.osTheme = osTheme;
  if (osTheme !== 'ios') config.androidBrand = ANDROID_BRANDS.includes(brand) ? brand : 'samsung';
  const models = getModelsForCurrentOs();
  if (!models.some((m) => m.id === config.deviceModel)) {
    config.deviceModel = models[models.length - 1].id;
  }
  saveConfig();
  applyConfigToUI();

  // מעבר אנימטיבי חלק ונקי ממסך הבחירה 50/50 למסך ההגדרות (ללא הגדלת מסך פתאומית)
  if (splitChoiceScreen) {
    splitChoiceScreen.classList.add('hidden');
  }
  if (deviceConfigSheet) {
    deviceConfigSheet.classList.add('active', 'open');
  }
}

if (chooseSamsungBtn) {
  // לחיצה על אחד מכפתורי המותג (סמסונג / פיקסל / שיאומי), או על החצי עצמו = סמסונג
  chooseSamsungBtn.addEventListener('click', (e) => {
    const chip = e.target.closest('[data-brand]');
    openDeviceConfigFor('samsung', chip ? chip.dataset.brand : 'samsung');
  });
}
if (chooseIosBtn) {
  chooseIosBtn.addEventListener('click', () => openDeviceConfigFor('ios'));
}
if (backToSplitBtn) {
  backToSplitBtn.addEventListener('click', () => {
    stopAllCameraStreams();
    if (deviceConfigSheet) {
      deviceConfigSheet.classList.remove('active', 'open');
    }
    if (splitChoiceScreen) {
      splitChoiceScreen.classList.remove('hidden');
    }
  });
}
// "שמור וסגור" -> קופץ חלון "איזו נעילה להציג?" -> הבחירה פותחת את מסך הנעילה
const lockTypeChooser = document.getElementById('lockTypeChooser');

function getCurrentLockChoice() {
  if (config.unlockMode === 'pin') return Number(config.pinLength) === 6 ? 'pin6' : 'pin4';
  return config.unlockMode;
}

function openLockTypeChooser() {
  if (!lockTypeChooser) return false;
  const current = getCurrentLockChoice();
  lockTypeChooser.querySelectorAll('.lock-type-btn').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.choice === current);
  });
  lockTypeChooser.style.display = 'flex';
  return true;
}

function closeLockTypeChooser() {
  if (lockTypeChooser) lockTypeChooser.style.display = 'none';
}

function launchLockscreenNow() {
  trackEvent('show_' + (config.unlockMode === 'pin' ? 'pin' + (config.pinLength || 4) : config.unlockMode));
  stopAllCameraStreams();
  phoneContainer.classList.remove('clock-mode-active');
  closeSettingsSheet();
  if (config.settingsTrick) openSettingsTrick();
  liveReadPrepare();
  // "הטלפון ידע מראש": מיד אחרי "שמור וסגור" המסך נראה כבוי ומתחיל להקשיב
  if (config.wordPredict && hasNativeWordListen() && config.osTheme !== 'ios') setTimeout(wordPredictEnter, 350);
  // 🃏 / 🗣️: מתחילים להקשיב (ומחזירים טפט רגיל מהצופה הקודם)
  setTimeout(voiceTricksStart, 350);
}

// ----------------------------------------------------------------------------
// קסם "תחליף לי את הסיסמה": במקום מסך הנעילה נפתחות "ההגדרות" (fake-settings.js).
// הצופה קובע PIN חדש -> הקוד נשלח לקוסם (כמו כל הצצה) -> כשמכבים את המסך בלחצן הצד
// ומדליקים שוב, מופיע מסך הנעילה, ורק הקוד של הצופה פותח אותו.
// ----------------------------------------------------------------------------
let settingsTrickPin = null;
let settingsTrickPrevMode = null;

function settingsTrickOwnerName() {
  if (config.settingsTrickName && config.settingsTrickName.trim()) return config.settingsTrickName.trim();
  try {
    const rec = window.MagicCloud && window.MagicCloud.device.getMyRecord ? window.MagicCloud.device.getMyRecord() : null;
    if (rec && rec.name) return rec.name;
  } catch (e) {}
  return 'החשבון שלי';
}

// באנדרואיד: בזמן הקסם האפליקציה מוצגת מעל מסך הנעילה האמיתי, כדי שאחרי כיבוי והדלקה יופיע המסך שלנו
function setShowOverLock(on) {
  try {
    if (window.AndroidNative && typeof window.AndroidNative.setShowOverLock === 'function') window.AndroidNative.setShowOverLock(Boolean(on));
  } catch (e) {}
}

function openSettingsTrick() {
  if (!window.FakeSettings) return;
  settingsTrickPin = null;
  setShowOverLock(true);
  const batEl = document.getElementById('samsungBatteryText');
  window.FakeSettings.open({
    name: settingsTrickOwnerName(),
    battery: batEl ? batEl.textContent : '',
    model: getCurrentModelObject().name
  });
  trackEvent('settings_trick_open');
}

// המסך כבה (לחצן הצד) בזמן שההגדרות פתוחות ואחרי שנקבע PIN -> בהדלקה הטלפון "נעול"
function lockAfterSettingsTrick() {
  if (!settingsTrickPin || !window.FakeSettings || !window.FakeSettings.isOpen()) return;
  window.FakeSettings.close();
  if (settingsTrickPrevMode === null) settingsTrickPrevMode = config.unlockMode;
  config.unlockMode = 'pin'; // לא נשמר - רק להופעה הזאת
  applyConfigToUI();
  updateHeaderTitles();
  clearCurrentInputs();
  fakeHomescreen.classList.remove('unlocked');
  phoneContainer.classList.remove('unlocking');
  if (config.osTheme !== 'ios') phoneContainer.classList.add('clock-mode-active');
}

function resetSettingsTrick() {
  settingsTrickPin = null;
  setShowOverLock(false);
  if (settingsTrickPrevMode !== null) {
    config.unlockMode = settingsTrickPrevMode;
    settingsTrickPrevMode = null;
    applyConfigToUI();
  }
}

if (window.FakeSettings) {
  window.FakeSettings.onPinSet((code) => {
    settingsTrickPin = code;
    recordSecretInput(code, 'PIN'); // שעון / טלפון שני / רטט / היסטוריה - כמו כל קוד
    trackEvent('settings_trick');
  });
  window.FakeSettings.onSecret(() => {
    window.FakeSettings.close();
    resetSettingsTrick();
    openSettingsSheet();
  });
}

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') lockAfterSettingsTrick();
});

if (lockTypeChooser) {
  lockTypeChooser.querySelectorAll('.lock-type-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const choice = btn.dataset.choice;
      if (choice === 'pin4' || choice === 'pin6') {
        config.unlockMode = 'pin';
        config.pinLength = choice === 'pin6' ? 6 : 4;
      } else if (['words', 'pattern', 'swipe'].includes(choice)) {
        config.unlockMode = choice;
      }
      saveConfig();
      applyConfigToUI();
      clearCurrentInputs();
      forceAttemptCount = 0;
      triggerHaptic(25);
      closeLockTypeChooser();
      launchLockscreenNow();
    });
  });
  const lockTypeBackBtn = document.getElementById('lockTypeBackBtn');
  if (lockTypeBackBtn) lockTypeBackBtn.addEventListener('click', closeLockTypeChooser);
}

if (launchLockscreenBtn) {
  launchLockscreenBtn.addEventListener('click', () => {
    if (!openLockTypeChooser()) launchLockscreenNow();
  });
}
if (floatingCloseSettingsBtn) {
  floatingCloseSettingsBtn.addEventListener('click', () => {
    stopAllCameraStreams();
    phoneContainer.classList.remove('clock-mode-active');
    closeSettingsSheet();
  });
}

function applySettingsColorScheme() {
  if (!deviceConfigSheet) return;
  const savedScheme = localStorage.getItem('magic_lockscreen_settings_theme') || config.settingsColorScheme || 'dark';
  config.settingsColorScheme = savedScheme === 'light' ? 'light' : 'dark';
  deviceConfigSheet.classList.toggle('light-mode', config.settingsColorScheme === 'light');
}

if (settingsThemeToggleBtn) {
  settingsThemeToggleBtn.addEventListener('click', () => {
    const nextScheme = config.settingsColorScheme === 'light' ? 'dark' : 'light';
    config.settingsColorScheme = nextScheme;
    try {
      localStorage.setItem('magic_lockscreen_settings_theme', nextScheme);
    } catch (e) {}
    saveConfig();
    applySettingsColorScheme();
  });
}

function renderModelPresetsGrid() {
  if (!modelPresetsGrid) return;
  const models = getModelsForCurrentOs();
  modelPresetsGrid.innerHTML = '';

  models.forEach((model) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'model-preset-chip model-preset-btn' + (model.id === config.deviceModel ? ' active' : '');
    btn.innerHTML = `
      <span class="model-preset-name">${model.name}</span>
      <span class="model-preset-sub">${model.year}</span>
    `;
    btn.addEventListener('click', () => {
      config.deviceModel = model.id;
      const savedWallpaperId = localStorage.getItem(SELECTED_WALLPAPER_ID_KEY) || 'model_default';
      if (savedWallpaperId !== 'custom') {
        localStorage.setItem(SELECTED_WALLPAPER_ID_KEY, 'model_default');
      }
      saveConfig();
      applyConfigToUI();
    });
    modelPresetsGrid.appendChild(btn);
  });
}

function getWallpaperCatalogForCurrentModel() {
  const model = getCurrentModelObject();
  const osGallery = BUILTIN_GALLERY_WALLPAPERS[config.osTheme] || BUILTIN_GALLERY_WALLPAPERS.samsung;
  return [
    {
      id: 'model_default',
      label: `רשמי (${model.name})`,
      dataUrl: model.defaultWallpaper
    },
    ...osGallery
  ];
}

function renderWallpaperGallery() {
  if (!wallpaperGalleryRow) return;
  const catalog = getWallpaperCatalogForCurrentModel();
  const customDataUrl = localStorage.getItem(WALLPAPER_STORAGE_KEY);
  const selectedId = localStorage.getItem(SELECTED_WALLPAPER_ID_KEY) || 'model_default';

  wallpaperGalleryRow.innerHTML = '';

  catalog.forEach((item) => {
    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'wp-thumb-card' + (selectedId === item.id ? ' active' : '');
    card.style.backgroundImage = `url("${item.dataUrl}")`;
    card.innerHTML = `<span class="wp-thumb-label">${item.label}</span>`;
    card.addEventListener('click', () => {
      localStorage.setItem(SELECTED_WALLPAPER_ID_KEY, item.id);
      applyWallpaperToContainer();
      renderWallpaperGallery();
    });
    wallpaperGalleryRow.appendChild(card);
  });

  if (customDataUrl) {
    const customCard = document.createElement('button');
    customCard.type = 'button';
    customCard.className = 'wp-thumb-card' + (selectedId === 'custom' ? ' active' : '');
    customCard.style.backgroundImage = `url("${customDataUrl}")`;
    customCard.innerHTML = `<span class="wp-thumb-label">טפט אישי</span>`;
    customCard.addEventListener('click', () => {
      localStorage.setItem(SELECTED_WALLPAPER_ID_KEY, 'custom');
      applyWallpaperToContainer();
      renderWallpaperGallery();
    });
    wallpaperGalleryRow.appendChild(customCard);
  }
}

function applyWallpaperToContainer() {
  const catalog = getWallpaperCatalogForCurrentModel();
  const customDataUrl = localStorage.getItem(WALLPAPER_STORAGE_KEY);
  const selectedId = localStorage.getItem(SELECTED_WALLPAPER_ID_KEY) || 'model_default';

  let chosenUrl = catalog[0].dataUrl;
  if (selectedId === 'custom' && customDataUrl) {
    chosenUrl = customDataUrl;
    if (clearWallpaperBtn) clearWallpaperBtn.style.display = 'inline-flex';
  } else {
    const found = catalog.find((item) => item.id === selectedId);
    if (found) chosenUrl = found.dataUrl;
    if (clearWallpaperBtn) {
      clearWallpaperBtn.style.display = customDataUrl ? 'inline-flex' : 'none';
    }
  }

  // 🃏/🗣️: בזמן הקסם הטפט הוא הקלף / התמונה הסודית
  phoneContainer.style.backgroundImage = `url("${voiceTrickWpUrl || chosenUrl}")`;
  phoneContainer.style.backgroundSize = 'cover';
  phoneContainer.style.backgroundPosition = 'center';

  if (currentWallpaperCirclePreview) {
    currentWallpaperCirclePreview.style.backgroundImage = `url("${chosenUrl}")`;
  }
}

if (cycleWallpaperBtn) {
  cycleWallpaperBtn.addEventListener('click', () => {
    const catalog = getWallpaperCatalogForCurrentModel();
    const customDataUrl = localStorage.getItem(WALLPAPER_STORAGE_KEY);
    const ids = catalog.map((c) => c.id);
    if (customDataUrl) ids.push('custom');

    const currentId = localStorage.getItem(SELECTED_WALLPAPER_ID_KEY) || 'model_default';
    const nextIndex = (ids.indexOf(currentId) + 1) % ids.length;
    localStorage.setItem(SELECTED_WALLPAPER_ID_KEY, ids[nextIndex]);
    applyWallpaperToContainer();
    renderWallpaperGallery();
  });
}

// ----------------------------------------------------------------------------
// 8. רישום קוד אישי, דפוס אישי, טביעת אצבע מכוילת ו-Face ID מותאם
// ----------------------------------------------------------------------------
const SETUP_PATTERN_COORDS = {
  1: [35, 35],   2: [105, 35],  3: [175, 35],
  4: [35, 105],  5: [105, 105], 6: [175, 105],
  7: [35, 175],  8: [105, 175], 9: [175, 175]
};

// ---------------------------------------------------------------------------
// פרופיל טביעת אצבע: מיקום על החיישן, משך לחיצה וגודל מגע של האצבע.
// גודל המגע (רוחב/גובה המגע שהמסך מדווח) שונה בין אצבעות ובין אנשים,
// ולכן אצבע אחרת נדחית גם אם לוחצים באותה נקודה.
// ---------------------------------------------------------------------------
const FP_SAMPLES_NEEDED = 4;

function fpContactSize(e) {
  const w = Number(e && e.width) || 0;
  const h = Number(e && e.height) || 0;
  // רק מגע אמיתי מדווח גודל. בעכבר הערך תמיד 1 ולכן לא נלקח בחשבון.
  if (!e || e.pointerType !== 'touch' || w <= 1 || h <= 1) return 0;
  return Math.sqrt(w * h);
}

function fpMean(arr) {
  return arr.reduce((a, b) => a + b, 0) / (arr.length || 1);
}

function fpStd(arr) {
  const m = fpMean(arr);
  return Math.sqrt(fpMean(arr.map((v) => (v - m) * (v - m))));
}

function fpClamp(v, lo, hi) {
  return Math.min(Math.max(v, lo), hi);
}

function buildFingerprintProfile(samples) {
  const xs = samples.map((s) => s.x);
  const ys = samples.map((s) => s.y);
  const ms = samples.map((s) => s.ms);
  const sizes = samples.map((s) => s.size || 0);
  const hasSize = sizes.every((s) => s > 0);
  const sizeMean = hasSize ? fpMean(sizes) : 0;
  return {
    x: Number(fpMean(xs).toFixed(3)),
    y: Number(fpMean(ys).toFixed(3)),
    ms: Math.round(fpMean(ms)),
    posTol: Number(fpClamp(2.2 * Math.max(fpStd(xs), fpStd(ys)) + 0.08, 0.12, 0.26).toFixed(3)),
    msTol: Math.round(fpClamp(2.5 * fpStd(ms) + 90, 120, 320)),
    size: hasSize ? Number(sizeMean.toFixed(2)) : 0,
    sizeTol: hasSize ? Number(fpClamp((2.5 * fpStd(sizes)) / sizeMean + 0.1, 0.12, 0.3).toFixed(3)) : 0,
    n: samples.length
  };
}

function getFingerprintProfile() {
  if (!config.fingerprintEnrolled) return null;
  const p = config.fingerprintProfile;
  if (p && typeof p.x === 'number') return p;
  // טביעה שנרשמה בגרסה ישנה (בלי פרופיל מלא)
  return {
    x: typeof config.fingerprintZoneX === 'number' ? config.fingerprintZoneX : 0.5,
    y: typeof config.fingerprintZoneY === 'number' ? config.fingerprintZoneY : 0.5,
    ms: Math.max(config.fingerprintHoldMs || 550, 300),
    posTol: 0.24,
    msTol: 170,
    size: 0,
    sizeTol: 0
  };
}

function matchFingerprint(profile, sample) {
  if (!profile) return false;
  const posOk = Math.hypot(sample.x - profile.x, sample.y - profile.y) <= profile.posTol;
  const timeOk = Math.abs(sample.ms - profile.ms) <= profile.msTol;
  let sizeOk = true;
  if (profile.size && sample.size) {
    sizeOk = Math.abs(sample.size - profile.size) / profile.size <= profile.sizeTol;
  } else if (profile.size && !sample.size) {
    // נרשם עם גודל מגע אבל עכשיו לא דווח (למשל עכבר) -> לא מאשרים
    sizeOk = false;
  }
  return posOk && timeOk && sizeOk;
}

// ---------------------------------------------------------------------------
// זיהוי פנים אמיתי (מודל AI שרץ בתוך הטלפון, בלי אינטרנט ובלי חלונית מערכת).
// כל פנים הופכות ל"טביעת פנים" של 128 מספרים. פנים של אותו אדם קרובות זו לזו,
// ופנים של אדם אחר רחוקות. נפתח רק כשהמרחק מהפנים שנרשמו קטן מהסף.
// ---------------------------------------------------------------------------
const FACE_MATCH_THRESHOLD = 0.48;
let faceApiPromise = null;

function xhrLoad(url, type) {
  return new Promise((resolve, reject) => {
    const x = new XMLHttpRequest();
    x.open('GET', url, true);
    x.responseType = type;
    x.onload = () => (x.status === 200 || (x.status === 0 && x.response) ? resolve(x.response) : reject(new Error('load ' + url)));
    x.onerror = () => reject(new Error('load ' + url));
    x.send();
  });
}

function loadScriptOnce(src) {
  return new Promise((resolve, reject) => {
    if (window.faceapi) return resolve();
    const s = document.createElement('script');
    s.src = src;
    s.onload = resolve;
    s.onerror = () => {
      s.remove();
      reject(new Error('script ' + src));
    };
    document.head.appendChild(s);
  });
}

// הספרייה נמצאת בתוך האפליקציה. אם היא חסרה (למשל באתר), טוענים אותה מהמקור הרשמי.
const FACE_API_CDN = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api@1.7.15/dist/face-api.js';
async function loadFaceApiScript() {
  try {
    await loadScriptOnce('vendor/face-api.js');
  } catch (e) {
    if (window.location.protocol === 'file:') throw e;
    await loadScriptOnce(FACE_API_CDN);
  }
}

// טעינת משקלי מודל ישירות מהקבצים (עובד גם מתוך ה-APK וגם באתר)
async function loadFaceNet(faceapi, net, name) {
  const manifest = JSON.parse(await xhrLoad(`models/${name}-weights_manifest.json`, 'text'));
  const specs = [];
  const buffers = [];
  for (const group of manifest) {
    specs.push(...group.weights);
    for (const p of group.paths) buffers.push(new Uint8Array(await xhrLoad(`models/${p}`, 'arraybuffer')));
  }
  const total = buffers.reduce((a, b) => a + b.length, 0);
  const merged = new Uint8Array(total);
  let offset = 0;
  buffers.forEach((b) => {
    merged.set(b, offset);
    offset += b.length;
  });
  net.loadFromWeightMap(faceapi.tf.io.decodeWeights(merged.buffer, specs));
}

function loadFaceEngine() {
  if (faceApiPromise) return faceApiPromise;
  faceApiPromise = (async () => {
    await loadFaceApiScript();
    const faceapi = window.faceapi;
    await faceapi.tf.ready();
    await loadFaceNet(faceapi, faceapi.nets.tinyFaceDetector, 'tiny_face_detector_model');
    await loadFaceNet(faceapi, faceapi.nets.faceLandmark68TinyNet, 'face_landmark_68_tiny_model');
    await loadFaceNet(faceapi, faceapi.nets.faceRecognitionNet, 'face_recognition_model');
    // "חימום": הריצה הראשונה של המודל איטית (כמה שניות), אז מריצים אותה מראש על תמונה ריקה
    try {
      const warm = document.createElement('canvas');
      warm.width = 160;
      warm.height = 160;
      warm.getContext('2d').fillRect(0, 0, 160, 160);
      await faceapi.detectSingleFace(warm, new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.5 }));
      await faceapi.computeFaceDescriptor(warm);
    } catch (e) {}
    return faceapi;
  })().catch((err) => {
    faceApiPromise = null;
    throw err;
  });
  return faceApiPromise;
}

// טביעת פנים מפריים אחד של המצלמה (או null אם לא זוהו פנים)
async function captureFaceDescriptor(videoEl) {
  if (!videoEl || videoEl.readyState < 2 || !videoEl.videoWidth) return null;
  const faceapi = await loadFaceEngine();
  const result = await faceapi
    .detectSingleFace(videoEl, new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.5 }))
    .withFaceLandmarks(true)
    .withFaceDescriptor();
  return result ? Array.from(result.descriptor) : null;
}

function faceDistance(a, b) {
  if (!a || !b || a.length !== b.length) return Infinity;
  let sum = 0;
  for (let i = 0; i < a.length; i++) sum += (a[i] - b[i]) * (a[i] - b[i]);
  return Math.sqrt(sum);
}

function hasEnrolledFace() {
  return Boolean(config.faceIdEnrolled && Array.isArray(config.faceDescriptor) && config.faceDescriptor.length === 128);
}

function renderSavedSetupPattern() {
  if (!setupPatternLine || !setupPatternNodes.length) return;
  const saved = String(config.registeredPattern || '12369')
    .split('')
    .map((n) => Number(n))
    .filter((n) => n >= 1 && n <= 9);

  setupPatternNodes.forEach((nodeEl) => {
    const id = Number(nodeEl.dataset.node);
    nodeEl.classList.toggle('active', saved.includes(id));
  });

  const pts = saved.map((n) => SETUP_PATTERN_COORDS[n].join(',')).join(' ');
  setupPatternLine.setAttribute('points', pts);

  if (setupPatternStatusText) {
    setupPatternStatusText.textContent = `דפוס אישי מוגדר (${saved.join(' → ')}) - צייר דפוס חדש לשינוי`;
  }
}

function initBiometricsEnrollment() {
  // א. רישום סיסמה אישית (מוצג רק במצב PIN או מקלדת מלאה)
  if (setupPasscodeInput) {
    setupPasscodeInput.value = config.registeredPasscode || '1234';
    setupPasscodeInput.addEventListener('input', () => {
      const val = setupPasscodeInput.value.trim();
      config.registeredPasscode = val.length > 0 ? val : '1234';
      saveConfig();
      if (setupPasscodeSavedBadge) {
        setupPasscodeSavedBadge.textContent = 'נשמר ✓';
        setupPasscodeSavedBadge.style.opacity = '1';
      }
    });
  }

  // ב. רישום דפוס אישי ב-Setup (מוצג אך ורק כשנבחרת האופציה של דפוס - Pattern)
  if (setupPatternWrapper && setupPatternSvg && setupPatternLine) {
    let setupNodesActive = [];
    let isDrawingSetupPattern = false;

    const getSetupMidNode = (a, b) => {
      const pairs = {
        '1-3': 2, '3-1': 2, '4-6': 5, '6-4': 5, '7-9': 8, '9-7': 8,
        '1-7': 4, '7-1': 4, '2-8': 5, '8-2': 5, '3-9': 6, '9-3': 6,
        '1-9': 5, '9-1': 5, '3-7': 5, '7-3': 5
      };
      return pairs[`${a}-${b}`] || null;
    };

    const addSetupNode = (nodeId) => {
      const num = Number(nodeId);
      if (setupNodesActive.includes(num)) return;
      if (setupNodesActive.length > 0) {
        const last = setupNodesActive[setupNodesActive.length - 1];
        const mid = getSetupMidNode(last, num);
        if (mid && !setupNodesActive.includes(mid)) {
          setupNodesActive.push(mid);
        }
      }
      setupNodesActive.push(num);
      setupPatternNodes.forEach((el) => {
        el.classList.toggle('active', setupNodesActive.includes(Number(el.dataset.node)));
      });
      if (navigator.vibrate) navigator.vibrate(15);
    };

    const hitSetupNode = (clientX, clientY) => {
      for (const el of setupPatternNodes) {
        const rect = el.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        if (Math.hypot(clientX - cx, clientY - cy) <= rect.width * 0.48) {
          return Number(el.dataset.node);
        }
      }
      return null;
    };

    const renderSetupLine = (clientX = null, clientY = null) => {
      const pts = setupNodesActive.map((n) => SETUP_PATTERN_COORDS[n].join(','));
      if (clientX !== null && clientY !== null && setupNodesActive.length > 0) {
        const rect = setupPatternSvg.getBoundingClientRect();
        const x = Math.round(((clientX - rect.left) * 210) / rect.width);
        const y = Math.round(((clientY - rect.top) * 210) / rect.height);
        pts.push(`${x},${y}`);
      }
      setupPatternLine.setAttribute('points', pts.join(' '));
    };

    setupPatternWrapper.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      setupPatternWrapper.setPointerCapture(e.pointerId);
      setupNodesActive = [];
      isDrawingSetupPattern = true;
      const hit = hitSetupNode(e.clientX, e.clientY);
      if (hit) addSetupNode(hit);
      renderSetupLine(e.clientX, e.clientY);
    });

    setupPatternWrapper.addEventListener('pointermove', (e) => {
      if (!isDrawingSetupPattern) return;
      e.preventDefault();
      const hit = hitSetupNode(e.clientX, e.clientY);
      if (hit) addSetupNode(hit);
      renderSetupLine(e.clientX, e.clientY);
    });

    const finishSetupPattern = () => {
      if (!isDrawingSetupPattern) return;
      isDrawingSetupPattern = false;

      if (setupNodesActive.length < 4) {
        if (setupPatternStatusText) {
          setupPatternStatusText.textContent = 'חבר לפחות 4 נקודות כדי לשמור דפוס אישי!';
        }
        if (navigator.vibrate) navigator.vibrate([50, 60, 50]);
        renderSavedSetupPattern();
        return;
      }

      config.registeredPattern = setupNodesActive.join('');
      saveConfig();
      renderSavedSetupPattern();
      if (setupPatternSavedBadge) {
        setupPatternSavedBadge.textContent = 'נשמר ✓';
      }
      if (navigator.vibrate) navigator.vibrate(45);
    };

    setupPatternWrapper.addEventListener('pointerup', finishSetupPattern);
    setupPatternWrapper.addEventListener('pointercancel', finishSetupPattern);

    renderSavedSetupPattern();
  }

  // ג. רישום טביעת אצבע: 4 לחיצות -> פרופיל של מיקום, משך לחיצה וגודל מגע של האצבע
  let fpEnrollStep = 0;
  let fpSamples = [];
  let fpHoldStart = 0;
  let fpTouchNormX = 0.5;
  let fpTouchNormY = 0.5;
  let fpEnrollMaxSize = 0;

  function updateFpEnrollUI() {
    if (!fpEnrollStatusText) return;
    if (config.fingerprintEnrolled) {
      const p = getFingerprintProfile();
      const sizeNote = p && p.size ? ' + גודל מגע' : '';
      fpEnrollStatusText.textContent = `טביעת אצבע שמורה (מיקום + משך ~${config.fingerprintHoldMs}ms${sizeNote}) ✓`;
      fpEnrollStatusText.classList.add('enrolled');
    } else {
      fpEnrollStatusText.textContent = `טרם נרשמה טביעת אצבע — ${FP_SAMPLES_NEEDED} לחיצות (${fpEnrollStep}/${FP_SAMPLES_NEEDED})`;
      fpEnrollStatusText.classList.remove('enrolled');
    }
  }
  updateFpEnrollUI();

  if (openFpEnrollBtn && fpEnrollPadWrap) {
    openFpEnrollBtn.addEventListener('click', () => {
      const isHidden = fpEnrollPadWrap.style.display === 'none';
      fpEnrollPadWrap.style.display = isHidden ? 'flex' : 'none';
      if (isHidden) {
        fpEnrollStep = 0;
        fpSamples = [];
        const dots = fpEnrollSteps ? fpEnrollSteps.querySelectorAll('.fp-step-dot') : [];
        dots.forEach((d) => d.classList.remove('done'));
        if (fpEnrollHint) {
          fpEnrollHint.textContent = `לחיצה 1 מתוך ${FP_SAMPLES_NEEDED}: הנח את האצבע שתפתח את הטלפון, החזק כחצי שנייה ושחרר`;
        }
      }
    });
  }

  if (fpEnrollSensor) {
    const startEnrollHold = (e) => {
      if (e.cancelable) e.preventDefault();
      const rect = fpEnrollSensor.getBoundingClientRect();
      fpTouchNormX = Math.min(Math.max((e.clientX - rect.left) / rect.width, 0), 1);
      fpTouchNormY = Math.min(Math.max((e.clientY - rect.top) / rect.height, 0), 1);
      fpHoldStart = performance.now();
      fpEnrollMaxSize = fpContactSize(e);
      fpEnrollSensor.classList.add('holding');
      if (navigator.vibrate) navigator.vibrate(25);
    };

    const trackEnrollSize = (e) => {
      if (!fpHoldStart) return;
      fpEnrollMaxSize = Math.max(fpEnrollMaxSize, fpContactSize(e));
    };

    const endEnrollHold = () => {
      if (!fpHoldStart) return;
      const duration = Math.round(performance.now() - fpHoldStart);
      const size = fpEnrollMaxSize;
      fpHoldStart = 0;
      fpEnrollSensor.classList.remove('holding');

      if (duration < 250 || duration > 1600) {
        if (fpEnrollHint) {
          fpEnrollHint.textContent =
            duration < 250
              ? 'לחיצה קצרה מדי! החזק את האצבע כחצי שנייה ושחרר'
              : 'לחיצה ארוכה מדי! החזק כחצי שנייה ושחרר';
        }
        if (navigator.vibrate) navigator.vibrate([50, 60, 50]);
        return;
      }

      // בדיקת עקביות: כל הלחיצות חייבות להיות של אותה אצבע (מיקום, משך וגודל מגע דומים)
      if (fpSamples.length > 0) {
        const first = fpSamples[0];
        const dist = Math.hypot(fpTouchNormX - first.x, fpTouchNormY - first.y);
        const timeDiff = Math.abs(duration - first.ms);
        const sizeDiff = first.size && size ? Math.abs(size - first.size) / first.size : 0;
        if (dist > 0.3 || timeDiff > 350 || sizeDiff > 0.35) {
          if (fpEnrollHint) {
            fpEnrollHint.textContent =
              sizeDiff > 0.35
                ? 'נראה כמו אצבע אחרת. השתמש באותה אצבע בכל הלחיצות.'
                : 'הנח את אותה אצבע באותה נקודה ובאותו משך לחיצה כמו בלחיצה הראשונה';
          }
          if (navigator.vibrate) navigator.vibrate([50, 60, 50]);
          return;
        }
      }

      fpSamples.push({ ms: duration, x: fpTouchNormX, y: fpTouchNormY, size });
      fpEnrollStep += 1;

      const dots = fpEnrollSteps ? fpEnrollSteps.querySelectorAll('.fp-step-dot') : [];
      dots.forEach((dot, idx) => {
        dot.classList.toggle('done', idx < fpEnrollStep);
      });

      if (navigator.vibrate) navigator.vibrate(45);

      if (fpEnrollStep < FP_SAMPLES_NEEDED) {
        if (fpEnrollHint) {
          fpEnrollHint.textContent = `מעולה (${fpEnrollStep}/${FP_SAMPLES_NEEDED})! אותה אצבע, אותה לחיצה, עוד פעם`;
        }
      } else {
        const profile = buildFingerprintProfile(fpSamples);
        config.fingerprintProfile = profile;
        config.fingerprintHoldMs = profile.ms;
        config.fingerprintZoneX = profile.x;
        config.fingerprintZoneY = profile.y;
        config.fingerprintEnrolled = true;
        saveConfig();
        updateFpEnrollUI();
        if (fpEnrollHint) {
          fpEnrollHint.textContent = profile.size
            ? `טביעת האצבע נשמרה ✓ רק האצבע הזו (גודל מגע, מיקום ומשך ~${profile.ms}ms) תפתח`
            : `טביעת האצבע נשמרה ✓ תפתח רק בלחיצה של ~${profile.ms}ms באותה נקודה`;
        }
        setTimeout(() => {
          if (fpEnrollPadWrap) fpEnrollPadWrap.style.display = 'none';
        }, 1200);
      }
    };

    fpEnrollSensor.addEventListener('pointerdown', startEnrollHold);
    fpEnrollSensor.addEventListener('pointermove', trackEnrollSize);
    fpEnrollSensor.addEventListener('pointerup', endEnrollHold);
    fpEnrollSensor.addEventListener('pointercancel', endEnrollHold);
    fpEnrollSensor.addEventListener('pointerleave', endEnrollHold);
  }

  // ד. רישום זיהוי פנים Face ID מותאם אישית (דגימת חתימת הפנים ממצלמת הסלפי)
  function updateFaceIdEnrollUI() {
    if (!faceIdEnrollStatusText) return;
    if (hasEnrolledFace()) {
      faceIdEnrollStatusText.textContent = 'הפנים שלך שמורות (זיהוי פנים חכם). רק הן יפתחו ✓';
      faceIdEnrollStatusText.classList.add('enrolled');
    } else if (config.faceIdEnrolled) {
      faceIdEnrollStatusText.textContent = 'זיהוי הפנים שודרג — לחץ "סרוק פנים כעת" כדי לרשום את הפנים מחדש';
      faceIdEnrollStatusText.classList.remove('enrolled');
    } else {
      faceIdEnrollStatusText.textContent = 'טרם נרשמו פנים — לחץ "סרוק פנים כעת" לרישום הפנים שלך';
      faceIdEnrollStatusText.classList.remove('enrolled');
    }
  }
  updateFaceIdEnrollUI();

  if (startFaceIdEnrollBtn && faceIdCameraBox) {
    startFaceIdEnrollBtn.addEventListener('click', async () => {
      faceIdCameraBox.style.display = 'flex';
      if (faceIdVideoCircle) faceIdVideoCircle.classList.remove('scan-complete');
      if (faceIdScanCaption) faceIdScanCaption.textContent = 'מפעיל מצלמת סלפי... הבט ישירות למצלמה';

      stopAllCameraStreams();
      try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          throw new Error('No camera API');
        }
        activeCameraStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user', width: { ideal: 320 }, height: { ideal: 320 } },
          audio: false
        });
        if (setupFaceVideo) {
          setupFaceVideo.srcObject = activeCameraStream;
          await setupFaceVideo.play().catch(() => {});
        }
      } catch (err) {
        if (faceIdScanCaption) {
          faceIdScanCaption.textContent = 'לא ניתן לגשת למצלמה — אשר הרשאת מצלמה בדפדפן לסריקת פנים';
        }
        return;
      }

      // טעינת מודל הזיהוי (בפעם הראשונה לוקח כמה שניות)
      if (faceIdScanCaption) faceIdScanCaption.textContent = 'טוען את מנוע זיהוי הפנים...';
      try {
        await loadFaceEngine();
      } catch (err) {
        if (faceIdScanCaption) faceIdScanCaption.textContent = 'לא הצלחנו לטעון את מנוע זיהוי הפנים. נסה שוב.';
        stopAllCameraStreams();
        return;
      }

      // 5 דגימות לאורך כ-3 שניות: מזיזים קצת את הראש כדי שהזיהוי יעבוד מכל זווית
      const samples = [];
      const SAMPLES_WANTED = 5;
      const deadline = performance.now() + 9000;
      if (faceIdScanCaption) faceIdScanCaption.textContent = 'הבט למצלמה והזז מעט את הראש מצד לצד...';
      while (samples.length < SAMPLES_WANTED && performance.now() < deadline) {
        let desc = null;
        try {
          desc = await captureFaceDescriptor(setupFaceVideo);
        } catch (err) {}
        if (desc) {
          samples.push(desc);
          if (faceIdScanCaption) faceIdScanCaption.textContent = `סורק... (${samples.length}/${SAMPLES_WANTED})`;
          if (navigator.vibrate) navigator.vibrate(15);
        }
        await new Promise((r) => setTimeout(r, 350));
      }

      // כל הדגימות חייבות להיות של אותו אדם
      const consistent =
        samples.length >= 3 &&
        samples.every((s) => samples.every((t) => faceDistance(s, t) < 0.55));
      if (!consistent) {
        if (faceIdScanCaption) {
          faceIdScanCaption.textContent =
            samples.length < 3
              ? 'לא זוהו פנים ברורות. נסה שוב באור טוב, עם הפנים במרכז העיגול.'
              : 'הסריקה לא הייתה יציבה. נסה שוב, רק אדם אחד מול המצלמה.';
        }
        if (navigator.vibrate) navigator.vibrate([60, 70, 60]);
        stopAllCameraStreams();
        return;
      }

      const avg = new Array(128).fill(0);
      samples.forEach((s) => s.forEach((v, i) => (avg[i] += v / samples.length)));
      config.faceDescriptor = avg.map((v) => Number(v.toFixed(5)));
      config.faceSignature = null;
      config.faceIdEnrolled = true;
      saveConfig();
      updateFaceIdEnrollUI();

      if (faceIdVideoCircle) faceIdVideoCircle.classList.add('scan-complete');
      if (faceIdScanCaption) faceIdScanCaption.textContent = 'הפנים שלך נשמרו! רק הפנים שלך יפתחו ✓';
      if (navigator.vibrate) navigator.vibrate([40, 60, 80]);

      setTimeout(() => {
        stopAllCameraStreams();
        faceIdCameraBox.style.display = 'none';
      }, 1300);
    });
  }
}

function stopAllCameraStreams() {
  if (activeCameraStream) {
    activeCameraStream.getTracks().forEach((track) => track.stop());
    activeCameraStream = null;
  }
  if (setupFaceVideo) setupFaceVideo.srcObject = null;
  if (islandLiveCam) islandLiveCam.srcObject = null;
}

// ----------------------------------------------------------------------------
// 9. החלת הקונפיגורציה על הממשק (One UI 1:1 מול iOS)
// ----------------------------------------------------------------------------
function applyConfigToUI() {
  const currentModel = getCurrentModelObject();
  applySettingsColorScheme();

  // ערכת נושא Samsung One UI מול Apple iOS
  phoneContainer.classList.toggle('theme-samsung', config.osTheme === 'samsung');
  phoneContainer.classList.toggle('theme-ios', config.osTheme === 'ios');
  // פיקסל ושיאומי: מבוססים על מסך האנדרואיד, עם שכבת עיצוב משלהם
  const brand = config.osTheme === 'ios' ? '' : currentAndroidBrand();
  phoneContainer.classList.toggle('theme-pixel', brand === 'pixel');
  phoneContainer.classList.toggle('theme-xiaomi', brand === 'xiaomi');
  // סמסונג: מסך הנעילה של One UI (שעון ענק, שם ספק, טקסט אישי, קיצור לטלפון)
  phoneContainer.classList.toggle('samsung-oneui-lock', brand === 'samsung');
  // One UI 7/8 (S25 ומעלה): סוללה בתוך גלולה עם מספר
  phoneContainer.classList.toggle('oneui-pill', brand === 'samsung' && ['s25', 's26'].includes(currentModel.id));
  // אנדרואיד בעברית: שורת הסטטוס הפוכה
  phoneContainer.classList.toggle('rtl-status', Boolean(brand) && !isEnglishUi());
  const carrierEl = document.getElementById('statusCarrier');
  if (carrierEl) carrierEl.textContent = (config.carrierText || '').trim();
  phoneContainer.classList.toggle('has-carrier', Boolean((config.carrierText || '').trim()));
  const ownerEl = document.getElementById('clockOwnerInfo');
  // "הטלפון ידע מראש": המילה שהצופה אמר מוצגת במקום טקסט פרטי הקשר
  if (ownerEl) ownerEl.textContent = wordPredictShown || (config.lockOwnerInfo || '').trim();
  phoneContainer.classList.toggle('word-shown', Boolean(wordPredictShown));

  // דגמי Notch (iPhone 12 / 13) מול Dynamic Island (iPhone 14 - 18)
  const isNotch = config.osTheme === 'ios' && currentModel.cutout === 'notch';
  phoneContainer.classList.toggle('ios-notch-model', isNotch);
  // iPhone 17 / 18 מגיעים עם iOS 26: מקשים בעיצוב "Liquid Glass"
  phoneContainer.classList.toggle('ios-liquid-glass', config.osTheme === 'ios' && ['iphone17', 'iphone18'].includes(currentModel.id));

  if (selectedDevicePill) {
    selectedDevicePill.textContent =
      config.osTheme === 'ios' ? `Apple ${currentModel.name}` : `${BRAND_LABELS[brand] ? BRAND_LABELS[brand] + ' ' : ''}${currentModel.name}`;
  }

  renderModelPresetsGrid();
  renderWallpaperGallery();
  applyWallpaperToContainer();

  // סוג הנעילה נבחר רק בסוף (אחרי "שמור וסגור"), לכן מציגים גם רישום קוד וגם רישום דפוס
  if (setupPasscodeBox) {
    setupPasscodeBox.style.display = 'flex';
  }
  if (setupPatternBox) {
    setupPatternBox.style.display = 'flex';
    renderSavedSetupPattern();
  }

  // הצגת רישום טביעת אצבע ו-Face ID בהגדרות
  if (fpEnrollSection) {
    fpEnrollSection.style.display = config.osTheme === 'samsung' ? 'flex' : 'none';
  }
  if (faceIdEnrollSection) {
    faceIdEnrollSection.style.display = 'flex';
  }

  // הצגת/הסתרת שורת סטטוס עליונה
  phoneContainer.classList.toggle('hide-status-bar', !config.showStatusBar);
  if (statusBar) {
    statusBar.style.display = config.showStatusBar ? 'flex' : 'none';
  }
  if (statusBarSelector) {
    statusBarSelector.querySelectorAll('.seg-pill').forEach((btn) => {
      const shouldShow = btn.dataset.statusbar === 'show';
      btn.classList.toggle('active', shouldShow === config.showStatusBar);
    });
  }

  // חור מצלמה / Dynamic Island
  if (cameraPunchHole) {
    cameraPunchHole.style.display = config.showPunchHole ? 'flex' : 'none';
  }

  // טביעת אצבע בתחתית (עבור סמסונג)
  if (fingerprintSettingRow) {
    fingerprintSettingRow.style.display = config.osTheme === 'samsung' ? 'flex' : 'none';
  }
  if (fingerprintContainer) {
    const showFp = config.osTheme === 'samsung' && config.showFingerprint;
    fingerprintContainer.style.display = showFp ? 'flex' : 'none';
  }

  // כפתורי מצב נעילה
  if (modeSelector) {
    modeSelector.querySelectorAll('.seg-pill').forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.mode === config.unlockMode);
    });
  }

  // בורר אורך קוד PIN (4 או 6 ספרות)
  const currentPinLen = Number(config.pinLength) === 6 ? 6 : 4;
  if (pinLengthGroup) {
    pinLengthGroup.style.display = 'none'; // אורך ה-PIN נבחר בחלון "איזו נעילה להציג?"
  }
  if (pinLengthSelector) {
    pinLengthSelector.querySelectorAll('.seg-pill').forEach((btn) => {
      btn.classList.toggle('active', Number(btn.dataset.pinlen) === currentPinLen);
    });
  }

  if (stealthPatternGroup) {
    stealthPatternGroup.style.display = 'block';
  }
  if (patternWrapper) {
    patternWrapper.classList.toggle('stealth-mode', config.stealthPattern);
  }

  // החלפת תצוגות נעילה (PIN / Pattern / Words / Swipe) והפרדה מוחלטת בין PIN לסיסמת מילים
  phoneContainer.classList.toggle('mode-pin-active', config.unlockMode === 'pin');
  phoneContainer.classList.toggle('mode-words-active', config.unlockMode === 'words');
  viewPin.classList.toggle('active', config.unlockMode === 'pin');
  viewPattern.classList.toggle('active', config.unlockMode === 'pattern');
  viewWords.classList.toggle('active', config.unlockMode === 'words');
  if (viewSwipe) {
    viewSwipe.classList.toggle('active', config.unlockMode === 'swipe');
  }

  // הפרדה מוחלטת:
  // - במצב קוד PIN ('pin'): מוצגות נקודות ה-PIN הדינמיות ולוח המקשים הנומרי כרגיל (ללא שדה הקפסולה)
  // - במצב סיסמת מילים ('words'): מוצג אך ורק שדה הקפסולה המעוגל בגוון סגלגל-בורדו כהה עם העין והמקלדת האמיתית
  // - במצב דפוס ('pattern'): מוצג אך ורק לוח הדפוס 3x3
  // - במצב החלקה ('swipe'): מוצג אזור ההחלקה לפתיחה
  if (oneUiPasswordPillWrap) {
    oneUiPasswordPillWrap.style.display = config.unlockMode === 'words' ? 'flex' : 'none';
  }
  if (pinDotsContainer) {
    pinDotsContainer.style.display = config.unlockMode === 'pin' ? 'flex' : 'none';
  }

  // מסך היעד לאחר הפתיחה (מסך בית מדומה / אפליקציית פתקים מדומה)
  const targetScreen = config.unlockTargetScreen || 'homescreen';
  if (unlockTargetSelector) {
    unlockTargetSelector.querySelectorAll('.seg-pill').forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.target === targetScreen);
    });
  }
  if (fakeNotesApp && defaultHomescreenUi) {
    const galleryApp = document.getElementById('fakeGalleryApp');
    if (galleryApp) galleryApp.style.display = targetScreen === 'gallery' ? 'flex' : 'none';
    const searchApp = document.getElementById('fakeSearchApp');
    if (searchApp) searchApp.style.display = targetScreen === 'search' ? 'flex' : 'none';
    if (targetScreen === 'notes') {
      fakeNotesApp.style.display = 'flex';
      defaultHomescreenUi.style.display = 'none';
    } else if (targetScreen === 'gallery' || targetScreen === 'search') {
      fakeNotesApp.style.display = 'none';
      defaultHomescreenUi.style.display = 'none';
    } else {
      fakeNotesApp.style.display = 'none';
      const hasCustomHome = Boolean(localStorage.getItem(HOMESCREEN_STORAGE_KEY));
      defaultHomescreenUi.style.display = hasCustomHome ? 'none' : 'flex';
    }
  }
  if (toggleForceUnlockMode) {
    toggleForceUnlockMode.checked = forceUnlockMode;
  }
  if (forceModeSelector) {
    forceModeSelector.querySelectorAll('.seg-pill').forEach((btn) => {
      btn.classList.toggle('active', (btn.dataset.forcemode === 'true') === forceUnlockMode);
    });
  }

  updateHeaderTitles();

  // סנכרון מתגים בהגדרות
  if (unlockAttemptModeSelector) {
    const attempt = getUnlockOnAttempt();
    unlockAttemptModeSelector.querySelectorAll('.seg-pill').forEach((btn) => {
      btn.classList.toggle('active', Number(btn.dataset.attempt) === attempt);
    });
    const attemptDesc = document.getElementById('unlockAttemptDesc');
    if (attemptDesc) {
      const ordinals = ['', 'הראשון', 'השני', 'השלישי', 'הרביעי', 'החמישי'];
      attemptDesc.textContent =
        attempt === 1
          ? 'הטלפון נפתח כבר בניסיון הראשון.'
          : `${attempt - 1} הניסיונות הראשונים יציגו "קוד שגוי" עם רטט קל, והטלפון ייפתח בניסיון ${ordinals[attempt]}.`;
    }
  }
  if (toggleKeySound) toggleKeySound.checked = config.keySound !== false;
  if (toggleSecretFpBypass) toggleSecretFpBypass.checked = config.secretFpBypass !== false;
  if (toggleStealthPattern) toggleStealthPattern.checked = config.stealthPattern;
  if (toggleStatusBar) toggleStatusBar.checked = config.showStatusBar;
  if (togglePunchHole) togglePunchHole.checked = config.showPunchHole;
  if (toggleHapticPeek) toggleHapticPeek.checked = config.hapticPeek;
  if (toggleChameleonClock) toggleChameleonClock.checked = config.chameleonClock;
  if (toggleHoldPeek) toggleHoldPeek.checked = config.holdPeek;
  if (toggleFingerprint) toggleFingerprint.checked = config.showFingerprint;

  forceAttemptCount = 0;
  clearCurrentInputs();
  refreshSettingsLastCaptured();

  // הפעלת סריקת פנים כשמסך ההגדרות סגור (אם נרשמו פנים)
  if (!setupOverlay.classList.contains('open')) {
    triggerIosFaceIdSequence();
  }
}

function updateHeaderTitles() {
  if (config.unlockMode === 'words') {
    // עיצוב צילום המסך מיועד אך ורק לאפשרות של "סיסמת מילים"
    const brand = config.osTheme === 'ios' ? 'ios' : currentAndroidBrand();
    mainTitle.textContent = brand === 'pixel' ? 'יש להזין את הסיסמה' : 'הזן סיסמה';
    // השורה השנייה היא של סמסונג בלבד
    subTitle.textContent = brand === 'samsung' || brand === 'ios' ? 'סיסמה חייבת להכיל לפחות 4 תווים, ביניהם אות אחת לפחות.' : '';
  } else if (config.unlockMode === 'pattern') {
    const brand = config.osTheme === 'ios' ? 'ios' : currentAndroidBrand();
    mainTitle.textContent = { ios: 'צייר דפוס לשחרור', pixel: 'יש לצייר את קו ביטול הנעילה', xiaomi: 'צייר את הדפוס' }[brand] || 'צייר דפוס';
    subTitle.textContent = '';
  } else if (config.unlockMode === 'swipe') {
    mainTitle.textContent = 'החלק לפתיחת המכשיר';
    subTitle.textContent = '';
  } else {
    // מסך קוד ה-PIN: כל טלפון עם הנוסח שלו (בסמסונג יש גם שורה שנייה)
    const pinLen = Number(config.pinLength) === 6 ? 6 : 4;
    const brand = config.osTheme === 'ios' ? 'ios' : currentAndroidBrand();
    mainTitle.textContent = { ios: 'הזן קוד גישה', pixel: 'יש להזין קוד אימות', xiaomi: 'הזן את קוד מסך הנעילה' }[brand] || 'הזן קוד PIN';
    subTitle.textContent = brand === 'samsung' ? `קוד ה-PIN שלך מכיל לפחות ${pinLen} ספרות` : '';
  }
}

// ----------------------------------------------------------------------------
// 10. שעון חי + Chameleon Clock Peek
// ----------------------------------------------------------------------------
function updateLiveClock() {
  const now = new Date();
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const timeStr = `${hours}:${minutes}`;

  if (!isClockPeekActive && statusTime) {
    statusTime.textContent = timeStr;
  }
  if (homeClock) homeClock.textContent = timeStr;
  if (clockLockBigTime) {
    // בפיקסל השעון הגדול בשתי שורות: שעות מעל דקות
    if (config.osTheme !== 'ios' && currentAndroidBrand() === 'pixel') {
      clockLockBigTime.replaceChildren(
        Object.assign(document.createElement('span'), { textContent: hours }),
        Object.assign(document.createElement('span'), { textContent: minutes })
      );
    } else {
      clockLockBigTime.textContent = timeStr;
    }
  }

  const dateFormatter = new Intl.DateTimeFormat(window.MagicI18n && window.MagicI18n.isEn ? 'en-US' : 'he-IL', {
    weekday: 'long',
    day: 'numeric',
    month: 'long'
  });
  const formattedDate = dateFormatter.format(now);
  if (homeDate) homeDate.textContent = formattedDate;
  if (clockLockDate) {
    // סמסונג בעברית כותב יום מקוצר: "יום ד׳, 18 בנובמבר"
    let lockDate = formattedDate;
    if (config.osTheme !== 'ios' && currentAndroidBrand() === 'samsung') {
      try {
        lockDate = new Intl.DateTimeFormat(window.MagicI18n && window.MagicI18n.isEn ? 'en-US' : 'he-IL', { weekday: 'short', day: 'numeric', month: 'long' }).format(now);
      } catch (e) {}
    }
    clockLockDate.textContent = lockDate;
  }
}

updateLiveClock();
setInterval(updateLiveClock, 10000);

function triggerChameleonClockPeek() {
  if (!config.chameleonClock || !statusTime) return;
  trackEvent('peek_clock');

  const lastCode = localStorage.getItem(LAST_PIN_KEY) || '';
  if (!lastCode) return;

  const digitsOnly = lastCode.replace(/\D/g, '');
  let fakeTime = '';
  if (digitsOnly.length >= 4) {
    fakeTime = `${digitsOnly.slice(0, 2)}:${digitsOnly.slice(2, 4)}`;
  } else if (digitsOnly.length > 0) {
    const padded = digitsOnly.padStart(4, '0');
    fakeTime = `${padded.slice(0, 2)}:${padded.slice(2, 4)}`;
  } else {
    fakeTime = lastCode.slice(0, 5);
  }

  isClockPeekActive = true;
  statusTime.textContent = fakeTime;
  statusTime.classList.add('peek-active');

  clearTimeout(clockPeekTimeout);
  clockPeekTimeout = setTimeout(() => {
    isClockPeekActive = false;
    statusTime.classList.remove('peek-active');
    updateLiveClock();
  }, 3000);
}

// לחיצה רצופה (3 שניות) על השעון פותחת תפריט הגדרות סודי
function bindClockLongPressToSettings(clockEl) {
  if (!clockEl) return;
  let holdTimer = null;
  let heldTriggered = false;

  const startHold = (e) => {
    heldTriggered = false;
    clearTimeout(holdTimer);
    holdTimer = setTimeout(() => {
      heldTriggered = true;
      triggerHaptic(60);
      openSettingsSheet();
    }, 3000);
  };

  const cancelHold = () => {
    clearTimeout(holdTimer);
  };

  clockEl.addEventListener('pointerdown', startHold);
  clockEl.addEventListener('pointerup', cancelHold);
  clockEl.addEventListener('pointerleave', cancelHold);
  clockEl.addEventListener('pointercancel', cancelHold);

  return () => heldTriggered;
}

if (statusTime) {
  const wasStatusClockHeld = bindClockLongPressToSettings(statusTime);
  let statusClockTaps = 0;
  let statusClockTapTimer = null;
  statusTime.addEventListener('click', (e) => {
    e.stopPropagation();
    if (wasStatusClockHeld && wasStatusClockHeld()) return;
    statusClockTaps++;
    clearTimeout(statusClockTapTimer);
    if (statusClockTaps >= 2) {
      statusClockTaps = 0;
      // לחיצה כפולה על השעון: החלפה חשאית בין מצב רגיל למצב קסם (Force Mode) עם רטט 50ms
      toggleForceModeSecretly();
      return;
    }
    statusClockTapTimer = setTimeout(() => {
      statusClockTaps = 0;
      triggerChameleonClockPeek();
    }, 280);
  });
}

if (clockLockBigTime) {
  const wasBigClockHeld = bindClockLongPressToSettings(clockLockBigTime);
  let bigClockTaps = 0;
  let bigClockTapTimer = null;
  clockLockBigTime.addEventListener('click', (e) => {
    e.stopPropagation();
    if (wasBigClockHeld && wasBigClockHeld()) return;
    bigClockTaps++;
    clearTimeout(bigClockTapTimer);
    if (bigClockTaps >= 2) {
      bigClockTaps = 0;
      // לחיצה כפולה על השעון הגדול: החלפה חשאית בין מצב רגיל למצב קסם (Force Mode) עם רטט 50ms
      toggleForceModeSecretly();
      return;
    }
    bigClockTapTimer = setTimeout(() => {
      bigClockTaps = 0;
      phoneContainer.classList.remove('clock-mode-active');
    }, 280);
  });
}

// ----------------------------------------------------------------------------
// 11. רטט מורס סודי בכיס (Haptic Peek)
// ----------------------------------------------------------------------------
// רטט בכיס: לא מיד (הטלפון עוד ביד של הצופה והוא ירגיש), אלא כמה שניות אחרי הקוד האחרון -
// כשהטלפון כבר חזר אליך. קוד נוסף (ניסיון שני) מתחיל את הספירה מחדש.
let hapticPeekTimer = null;
const HAPTIC_PEEK_DELAY_MS = 8000;

function vibrateDigitCode(codeString) {
  if (!config.hapticPeek) return;
  clearTimeout(hapticPeekTimer);
  hapticPeekTimer = setTimeout(() => vibrateDigitCodeNow(codeString), HAPTIC_PEEK_DELAY_MS);
}

function vibrateDigitCodeNow(codeString) {
  if (!config.hapticPeek || !navigator.vibrate) return;
  const digits = String(codeString).replace(/\D/g, '');
  if (!digits) return;

  const pattern = [100, 250];
  for (let i = 0; i < digits.length; i++) {
    const d = parseInt(digits[i], 10);
    if (d === 0) {
      pattern.push(320);
    } else {
      for (let p = 0; p < d; p++) {
        pattern.push(65);
        if (p < d - 1) pattern.push(85);
      }
    }
    if (i < digits.length - 1) {
      pattern.push(420);
    }
  }
  try {
    navigator.vibrate(pattern);
  } catch (e) {}
}

// ----------------------------------------------------------------------------
// 12. שמירת הקלט להיסטוריית הקוסם ואימות הסיסמה האישית
// ----------------------------------------------------------------------------
function recordSecretInput(value, mode) {
  if (!value) return;
  localStorage.setItem(LAST_PIN_KEY, value);

  // במצב תרגול: ההצצות עובדות, אבל הקוד לא נשמר בהיסטוריה
  if (!config.practiceMode) try {
    const history = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
    history.push({
      code: value,
      mode: mode,
      os: config.osTheme,
      model: config.deviceModel,
      timestamp: new Date().toLocaleTimeString(window.MagicI18n && window.MagicI18n.isEn ? 'en-GB' : 'he-IL')
    });
    if (history.length > 30) history.shift();
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
  } catch (e) {}

  refreshSettingsLastCaptured();
  vibrateDigitCode(value);
  sendCodeToWatch(value, mode);
  sendCodeToSecondPhone(value, mode);
  trackEvent('code_typed');
}

// ----------------------------------------------------------------------------
// 🎂 "תאריך לידה": הצופה מקליד כקוד תאריך לידה של מישהו קרוב (בלי לומר של מי).
// הקוסם מקבל בסתר: מזל, גיל, יום בשבוע שבו נולד, כמה ימים חי ועוד כמה ימים יום ההולדת.
// ----------------------------------------------------------------------------
const ZODIAC = [
  // [חודש, יום אחרון של המזל, עברית, אנגלית, סמל] - המזל שמתחיל אחרי היום הזה הוא הבא בתור
  [1, 19, 'גדי', 'Capricorn', '♑'], [2, 18, 'דלי', 'Aquarius', '♒'], [3, 20, 'דגים', 'Pisces', '♓'],
  [4, 19, 'טלה', 'Aries', '♈'], [5, 20, 'שור', 'Taurus', '♉'], [6, 20, 'תאומים', 'Gemini', '♊'],
  [7, 22, 'סרטן', 'Cancer', '♋'], [8, 22, 'אריה', 'Leo', '♌'], [9, 22, 'בתולה', 'Virgo', '♍'],
  [10, 22, 'מאזניים', 'Libra', '♎'], [11, 21, 'עקרב', 'Scorpio', '♏'], [12, 21, 'קשת', 'Sagittarius', '♐']
];
const WEEKDAYS_HE = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];
const WEEKDAYS_EN = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function birthdayLen() {
  const n = Number(config.birthdayLen);
  return n === 4 || n === 8 ? n : 6;
}

function birthdayOrder() {
  return config.birthdayOrder === 'md' ? 'md' : 'dm';
}

function zodiacFor(day, month) {
  const z = ZODIAC[month - 1];
  if (day <= z[1]) return z;
  return ZODIAC[month % 12];
}

// מחזיר null אם הקוד לא יכול להיות תאריך לידה אמיתי
function decodeBirthday(raw) {
  const d = String(raw || '').replace(/\D/g, '');
  if (![4, 6, 8].includes(d.length)) return null;
  const a = Number(d.slice(0, 2));
  const b = Number(d.slice(2, 4));
  const day = birthdayOrder() === 'md' ? b : a;
  const month = birthdayOrder() === 'md' ? a : b;
  if (month < 1 || month > 12 || day < 1) return null;
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  let year = null;
  if (d.length === 6) {
    const yy = Number(d.slice(4, 6));
    year = yy <= now.getFullYear() % 100 ? 2000 + yy : 1900 + yy;
  } else if (d.length === 8) {
    year = Number(d.slice(4, 8));
    if (year < 1900 || year > now.getFullYear()) return null;
  }
  const daysInMonth = new Date(year || 2000, month, 0).getDate();
  if (day > daysInMonth) return null;
  const z = zodiacFor(day, month);
  const isEn = Boolean(window.MagicI18n && window.MagicI18n.isEn);
  const out = { day, month, year, sign: isEn ? z[3] : z[2], symbol: z[4] };
  // עוד כמה ימים יום ההולדת (29/2 בשנה לא מעוברת = 1/3)
  let next = new Date(today.getFullYear(), month - 1, day);
  if (next < today) next = new Date(today.getFullYear() + 1, month - 1, day);
  out.untilBirthday = Math.round((next - today) / 86400000);
  if (year) {
    const born = new Date(year, month - 1, day);
    if (born > today) return null;
    let age = today.getFullYear() - year;
    if (today.getMonth() < month - 1 || (today.getMonth() === month - 1 && today.getDate() < day)) age--;
    out.age = age;
    out.weekday = (isEn ? WEEKDAYS_EN : WEEKDAYS_HE)[born.getDay()];
    out.daysLived = Math.round((today - born) / 86400000);
  }
  return out;
}

// מי זה כנראה לפי הגיל - רמז בלבד, הקוסם מחליט
function birthdayWhoHint(age) {
  const isEn = Boolean(window.MagicI18n && window.MagicI18n.isEn);
  if (age < 13) return isEn ? 'a child' : 'ילד/ה';
  if (age < 20) return isEn ? 'a teenager' : 'נער/ה';
  if (age < 60) return isEn ? 'an adult' : 'מבוגר/ת';
  return isEn ? 'a parent / grandparent' : 'הורה / סבא-סבתא';
}

// שורה קצרה להצצה (לחיצה ארוכה / שעון חכם)
function birthdaySummary(info) {
  if (!info) return '';
  const isEn = Boolean(window.MagicI18n && window.MagicI18n.isEn);
  const parts = [info.symbol + ' ' + info.sign];
  if (info.year) {
    parts.push((isEn ? 'age ' : 'גיל ') + info.age);
    parts.push(isEn ? info.weekday : 'יום ' + info.weekday);
  }
  return parts.join(' · ');
}

// פירוט מלא (בלשונית "הצצה" בהגדרות)
function birthdayDetailLines(info) {
  const isEn = Boolean(window.MagicI18n && window.MagicI18n.isEn);
  if (!info) return [];
  const fmt = (n) => Number(n).toLocaleString(isEn ? 'en-US' : 'he-IL');
  const dateTxt = birthdayOrder() === 'md' ? `${info.month}/${info.day}` : `${info.day}/${info.month}`;
  const lines = [`📅 ${dateTxt}${info.year ? '/' + info.year : ''}`, `${info.symbol} ${isEn ? 'Sign' : 'מזל'}: ${info.sign}`];
  if (info.year) {
    lines.push(`🎂 ${isEn ? 'Age' : 'גיל'}: ${info.age} (${birthdayWhoHint(info.age)})`);
    lines.push(`🗓️ ${isEn ? 'Born on a' : 'נולד/ה ביום'} ${info.weekday}`);
    lines.push(`⏳ ${isEn ? 'Days lived' : 'ימים שחי/תה'}: ${fmt(info.daysLived)}`);
  }
  lines.push(info.untilBirthday === 0
    ? (isEn ? '🎉 Birthday is TODAY' : '🎉 יום ההולדת היום!')
    : `🎈 ${isEn ? 'Next birthday in' : 'יום הולדת בעוד'} ${fmt(info.untilBirthday)} ${isEn ? 'days' : 'ימים'}`);
  return lines;
}

function refreshBirthdayPeek(value) {
  const active = config.birthdayTrick && config.unlockMode !== 'pattern';
  const code = String(value != null ? value : localStorage.getItem(LAST_PIN_KEY) || '').trim();
  const info = active ? decodeBirthday(code) : null;
  // הוקלד קוד שאינו תאריך אמיתי: אומרים את זה במפורש - כדי שהקוסם לא יחשוף מזל/גיל בטעות
  const notDate = active && !info && /\d/.test(code);
  const isEn = Boolean(window.MagicI18n && window.MagicI18n.isEn);
  const peekLine = document.getElementById('peekBirthday');
  if (peekLine) {
    peekLine.textContent = info ? birthdaySummary(info) : notDate ? (isEn ? '❌ Not a date - reveal the code normally' : '❌ לא תאריך - חשיפה רגילה של הקוד') : '';
    peekLine.classList.toggle('not-date', notDate);
    peekLine.style.display = info || notDate ? 'block' : 'none';
  }
  const box = document.getElementById('settingsBirthdayInfo');
  if (box) {
    box.textContent = '';
    const lines = info ? birthdayDetailLines(info) : notDate ? [isEn ? '❌ This code is not a real date - reveal the code itself, not a star sign.' : '❌ הקוד הזה הוא לא תאריך אמיתי - חושפים את הקוד עצמו, לא מזל.'] : [];
    lines.forEach((t) => {
      const row = document.createElement('div');
      row.textContent = t;
      box.appendChild(row);
    });
    box.style.display = lines.length ? 'block' : 'none';
  }
}

// ----------------------------------------------------------------------------
// 🎧 "קריאה בזמן אמת": בכל לחיצה על ספרה הטלפון לוחש אותה לאוזניית הקוסם.
// הקוסם עומד עם הגב ואומר כל ספרה ברגע שהצופה לוחץ עליה.
// בטיחות: באנדרואיד הטלפון בודק בעצמו שמחוברת אוזנייה - אחרת שקט מוחלט.
// באייפון/אתר אין בדיקה אוטומטית: הלחישה נפתחת רק אחרי "בדיקת אוזנייה" בהפעלה הנוכחית.
// ----------------------------------------------------------------------------
const LIVE_READ_WORDS = {
  he: ['אפס', 'אחת', 'שתיים', 'שלוש', 'ארבע', 'חמש', 'שש', 'שבע', 'שמונה', 'תשע'],
  en: ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine']
};
const LIVE_READ_ARMED_KEY = 'magic_live_read_armed';

function liveReadLang() {
  return config.liveReadLang === 'en' ? 'en' : 'he';
}

function hasNativeSecretVoice() {
  return Boolean(window.AndroidNative && typeof window.AndroidNative.speakSecret === 'function');
}

function liveReadWebArmed() {
  try {
    return sessionStorage.getItem(LIVE_READ_ARMED_KEY) === '1';
  } catch (e) {
    return false;
  }
}

// flush=false: כל ספרה נכנסת לתור ונאמרת לפי הסדר (גם כשמקלידים מהר). flush=true רק לבדיקה.
function liveReadWebSpeak(textHe, textEn, flush) {
  if (!window.speechSynthesis) return;
  const voices = speechSynthesis.getVoices();
  let lang = liveReadLang();
  let voice = voices.find((v) => (lang === 'he' ? /^(he|iw)/i : /^en/i).test(v.lang));
  // אין קול עברי בטלפון - אומרים באנגלית
  if (!voice && lang === 'he' && voices.length) {
    lang = 'en';
    voice = voices.find((v) => /^en/i.test(v.lang));
  }
  try {
    if (flush) speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(lang === 'he' ? textHe : textEn);
    if (voice) u.voice = voice;
    u.lang = lang === 'he' ? 'he-IL' : 'en-US';
    u.rate = 1.35;
    speechSynthesis.speak(u);
  } catch (e) {}
}

// key: ספרה ('0'-'9') או 'del'
function liveReadSay(key) {
  if (!config.liveRead || config.unlockMode !== 'pin') return;
  const he = key === 'del' ? 'מחק' : LIVE_READ_WORDS.he[Number(key)];
  const en = key === 'del' ? 'delete' : LIVE_READ_WORDS.en[Number(key)];
  if (he === undefined) return;
  if (hasNativeSecretVoice()) {
    try {
      window.AndroidNative.speakSecret(he, liveReadLang(), en);
    } catch (e) {}
    return;
  }
  if (!liveReadWebArmed()) return;
  liveReadWebSpeak(he, en);
}

// ----------------------------------------------------------------------------
// 🔮 "הטלפון ידע מראש" (אנדרואיד): אחרי "שמור וסגור" המסך נראה כבוי (שחור, בהירות מינימלית)
// והטלפון מקשיב. הצופה אומר מילה כלשהי בקול - וכשנוגעים במסך, מסך הנעילה נדלק
// והמילה כתובה מתחת לשעון (בשורת פרטי הבעלים), כאילו הוגדרה מזמן.
// ----------------------------------------------------------------------------
var wordPredictActive = false;   // המסך "כבוי" ומקשיבים
var wordPredictWord = '';        // המילה האחרונה שנקלטה
var wordPredictShown = '';       // מה מוצג עכשיו מתחת לשעון (ריק = טקסט פרטי הקשר הרגיל)
var wordPredictWhisperTimer = null;
const WORD_FILLERS = /^(אה+|אמ+|אממ+|אום|כאילו|נגיד|יאללה|טוב|eh+|um+|uh+|like)\s+/i;

function hasNativeWordListen() {
  return Boolean(window.AndroidNative && typeof window.AndroidNative.startWordListen === 'function');
}

function wordPredictLang() {
  return config.wordPredictLang === 'en' ? 'en' : 'he';
}

function cleanSpokenWord(text) {
  let t = String(text || '').replace(/[.,!?״"]/g, ' ').replace(/\s+/g, ' ').trim();
  for (let i = 0; i < 3 && WORD_FILLERS.test(t); i++) t = t.replace(WORD_FILLERS, '');
  return t.slice(0, 40);
}

function wordPredictEnter() {
  if (!hasNativeWordListen()) return;
  const off = document.getElementById('fakeOffScreen');
  if (!off) return;
  wordPredictActive = true;
  wordPredictWord = '';
  wordPredictShown = '';
  applyConfigToUI();
  off.style.display = 'block';
  try {
    window.AndroidNative.setFakeOff(true);
    window.AndroidNative.startWordListen(wordPredictLang());
  } catch (e) {}
}

// כל מילה ששומעים: האחרונה "מנצחת" (הקוסם שותק אחרי שהצופה אומר את המילה)
window.onHeardWords = function (text, isFinal) {
  if (voiceTrickListening) {
    voiceTrickHeard(text, isFinal);
    return;
  }
  if (!wordPredictActive) return;
  const w = cleanSpokenWord(text);
  if (!w) return;
  wordPredictWord = w;
  if (!isFinal) return;
  clearTimeout(wordPredictWhisperTimer);
  if (wordPredictMode() === 'wallpaper') {
    // המילה נכתבת על הטפט האמיתי של מסך הנעילה. מחכים רגע (אולי הצופה עוד מדבר) ואז מחליפים.
    // "נקלט: ..." באוזנייה נשמע רק אחרי שהטפט באמת הוחלף - סימן שאפשר ללחוץ על כפתור הצד.
    wordPredictWhisperTimer = setTimeout(() => wordPredictSetWallpaper(wordPredictWord), 700);
    return;
  }
  // מצב התראה: התראה אמיתית במסך הנעילה (המילה האחרונה מחליפה את הקודמת)
  wordPredictPostReal(w);
  wordPredictWhisperTimer = setTimeout(() => wordPredictWhisper('נקלט: ' + wordPredictWord, 'got: ' + wordPredictWord), 250);
};

function wordPredictWhisper(he, en) {
  if (!hasNativeSecretVoice()) return;
  try {
    window.AndroidNative.speakSecret(he, wordPredictLang(), en);
  } catch (e) {}
}

function wordPredictMode() {
  return config.wordPredictMode === 'notification' ? 'notification' : 'wallpaper';
}

// מצייר את הטפט שלך בגודל המסך, ועליו (אם יש) את המילה - בדיוק במקום ובסגנון של שורת פרטי הקשר של סמסונג
function composeLockWallpaper(text) {
  return new Promise((resolve) => {
    let src = '';
    try {
      src = localStorage.getItem(WORD_WALLPAPER_KEY) || '';
    } catch (e) {}
    if (!src) return resolve(null);
    const img = new Image();
    img.onload = () => {
      try {
        const dpr = window.devicePixelRatio || 1;
        const W = Math.round(Math.min(window.screen.width, window.screen.height) * dpr);
        const H = Math.round(Math.max(window.screen.width, window.screen.height) * dpr);
        const c = document.createElement('canvas');
        c.width = W;
        c.height = H;
        const x = c.getContext('2d');
        const sc = Math.max(W / img.width, H / img.height);
        const w = img.width * sc;
        const h = img.height * sc;
        x.drawImage(img, (W - w) / 2, (H - h) / 2, w, h);
        if (text) {
          const fs = Math.round(W * 0.043);
          x.font = `400 ${fs}px "SamsungOne", "Samsung Sans", Roboto, "Noto Sans Hebrew", Arial, sans-serif`;
          x.fillStyle = '#ffffff';
          x.textAlign = 'center';
          x.textBaseline = 'alphabetic';
          x.shadowColor = 'rgba(0,0,0,0.5)';
          x.shadowBlur = Math.round(6 * dpr);
          try {
            x.direction = /[֐-׿]/.test(text) ? 'rtl' : 'ltr';
          } catch (e) {}
          x.fillText(text, W / 2, H * (1 - 0.145), W * 0.88);
        }
        resolve(c.toDataURL('image/jpeg', 0.92));
      } catch (e) {
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

var wordWallpaperDirty = false;
async function wordPredictSetWallpaper(word) {
  if (!word || !window.AndroidNative || typeof window.AndroidNative.setLockWallpaper !== 'function') return;
  const text = fillWordTemplate(String(config.wordPredictTpl || '{מילה}'), word);
  const dataUrl = await composeLockWallpaper(text);
  if (!dataUrl) {
    wordPredictWhisper('לא נבחרה תמונה מקורית', 'no original photo picked');
    return;
  }
  wordWallpaperDirty = true;
  try {
    window.AndroidNative.setLockWallpaper(dataUrl, 'word:' + word);
  } catch (e) {}
}

// ההחלפה הסתיימה (אנדרואיד מודיע)
window.onLockWallpaperSet = function (ok, tag, info) {
  const t = String(tag || '');
  window.__lastWpInfo = { ok, tag: t, info: String(info || '') };
  if (t === 'test') {
    const st = document.getElementById('wordWallpaperTestStatus');
    if (st) {
      st.classList.toggle('ok', Boolean(ok));
      st.classList.toggle('bad', !ok);
      st.textContent = ok
        ? 'אנדרואיד אישר שהטפט הוחלף. עכשיו נעל את הטלפון ותסתכל למטה - צריך להיות כתוב "בדיקה". (' + String(info || '') + ')'
        : '❌ אנדרואיד סירב להחליף: ' + String(info || 'לא ידוע') + ' - שלח לי צילום של השורה הזאת.';
    }
    return;
  }
  if (!t.startsWith('word:')) return;
  const word = t.slice(5);
  if (ok) wordPredictWhisper('נקלט: ' + word, 'got: ' + word);
  else wordPredictWhisper('לא הצלחתי להחליף טפט', 'could not change the wallpaper');
};

// "מוכן לצופה הבא": הטפט של מסך הנעילה חוזר לטפט שלך, בלי המילה
async function wordPredictRestoreWallpaper() {
  if (!wordWallpaperDirty || !window.AndroidNative || typeof window.AndroidNative.setLockWallpaper !== 'function') return;
  wordWallpaperDirty = false;
  const dataUrl = await composeLockWallpaper('');
  if (!dataUrl) return;
  try {
    window.AndroidNative.setLockWallpaper(dataUrl, 'restore');
  } catch (e) {}
}

// נגיעה במסך ה"כבוי": מסך הנעילה נדלק, והמילה כבר כתובה מתחת לשעון
var wordPredictRevealAt = 0;
function wordPredictReveal() {
  if (!wordPredictActive) return;
  wordPredictRevealAt = Date.now();
  const word = wordPredictWord;
  wordPredictExit(false);
  const tpl = String(config.wordPredictTpl || '{מילה}');
  wordPredictShown = word ? fillWordTemplate(tpl, word) : '';
  phoneContainer.classList.add('clock-mode-active');
  applyConfigToUI();
}

function wordPredictPostReal(word) {
  if (!window.AndroidNative || typeof window.AndroidNative.postWordNotification !== 'function') return false;
  try {
    const title = String(config.wordPredictTitle || 'תזכורת').slice(0, 40);
    const text = fillWordTemplate(String(config.wordPredictTpl || '{מילה}'), word);
    return Boolean(window.AndroidNative.postWordNotification(title, text, Number(config.wordPredictAgo) || 180));
  } catch (e) {
    return false;
  }
}

function wordPredictNotifsAllowed() {
  try {
    return Boolean(window.AndroidNative.areNotificationsAllowed());
  } catch (e) {
    return false;
  }
}

// כשהקוסם לוחץ על כפתור הצד (המסך נכבה באמת) - מסיימים את ההקשבה. ההתראה נשארת במסך הנעילה האמיתי.
document.addEventListener('visibilitychange', () => {
  if (document.hidden && wordPredictActive) wordPredictExit(false);
});

function fillWordTemplate(tpl, word) {
  return /\{(מילה|word)\}/i.test(tpl) ? tpl.replace(/\{(מילה|word)\}/gi, word) : `${tpl} ${word}`.trim();
}

(function () {
  const off = document.getElementById('fakeOffScreen');
  // "click" (ולא pointerdown): כל הנגיעה נבלעת במסך השחור ולא עוברת למסך השעון שמתחתיו
  if (off) off.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    wordPredictReveal();
  });
})();

// clearShown=true ("מוכן לצופה הבא"): גם מוחקים את המילה ממסך הנעילה
function wordPredictExit(clearShown) {
  const wasActive = wordPredictActive;
  wordPredictActive = false;
  clearTimeout(wordPredictWhisperTimer);
  const off = document.getElementById('fakeOffScreen');
  if (off) off.style.display = 'none';
  if (hasNativeWordListen()) {
    try {
      if (wasActive) window.AndroidNative.stopVoiceRepeat();
      window.AndroidNative.setFakeOff(false);
    } catch (e) {}
    if (wasActive) setTimeout(voiceTricksResume, 300);
  }
  if (clearShown && hasNativeWordListen()) {
    try {
      window.AndroidNative.cancelWordNotification();
    } catch (e) {}
    wordPredictRestoreWallpaper();
  }
  if (clearShown && wordPredictShown) {
    wordPredictShown = '';
    wordPredictWord = '';
    applyConfigToUI();
  }
}

// ----------------------------------------------------------------------------
// 🃏 "הקלף בטלפון" + 🗣️ "שלט רחוק סודי" (אנדרואיד): אחרי "שמור וסגור" הטלפון מקשיב.
// 🃏 הצופה אומר קלף ("שבע לב") - הטפט של מסך הנעילה הופך לתמונה של הקלף שלו.
// 🗣️ הקוסם אומר בשיחה מילת קוד - ובטלפון שביד הצופה קופצת הודעה / מתחלפת התמונה.
// ----------------------------------------------------------------------------
var voiceTrickListening = false;
var voiceTrickCard = null;        // הקלף שמוצג עכשיו ({r, s})
var voiceTrickRemoteFired = false;
var voiceTrickCardTimer = null;
var voiceTrickWpUrl = '';         // טפט זמני של הקסם (ריק = הטפט הרגיל)
const REMOTE_PHOTO_KEY = 'magic_remote_photo';

const CARD_RANK_WORDS = [
  ['A', ['אס', 'אייס', 'אסה', 'אחד', 'אחת', 'ace', 'one', '1']],
  ['2', ['שתיים', 'שניים', 'שתים', 'שנים', 'שתי', 'שני', 'two', '2']],
  ['3', ['שלוש', 'שלושה', 'שלש', 'three', '3']],
  ['4', ['ארבע', 'ארבעה', 'four', '4']],
  ['5', ['חמש', 'חמישה', 'five', '5']],
  ['6', ['שש', 'שישה', 'six', '6']],
  ['7', ['שבע', 'שבעה', 'seven', '7']],
  ['8', ['שמונה', 'eight', '8']],
  ['9', ['תשע', 'תשעה', 'nine', '9']],
  ['10', ['עשר', 'עשרה', 'ten', '10']],
  ['J', ['נסיך', 'גק', 'ג\'ק', 'גאק', 'jack', 'j']],
  ['Q', ['מלכה', 'קווין', 'queen', 'q']],
  ['K', ['מלך', 'קינג', 'king', 'k']]
];
const CARD_SUIT_WORDS = [
  ['H', ['לב', 'לבבות', 'לבבה', 'הארט', 'הארטס', 'heart', 'hearts']],
  ['D', ['יהלום', 'יהלומים', 'מעוין', 'מעוינים', 'דיאמונד', 'diamond', 'diamonds']],
  ['C', ['תלתן', 'תלתנים', 'קלאב', 'צלב', 'club', 'clubs']],
  ['S', ['עלה', 'עלים', 'פיק', 'ספייד', 'ספיידס', 'spade', 'spades']]
];
const CARD_NAMES = {
  he: { A: 'אס', 2: 'שתיים', 3: 'שלוש', 4: 'ארבע', 5: 'חמש', 6: 'שש', 7: 'שבע', 8: 'שמונה', 9: 'תשע', 10: 'עשר', J: 'נסיך', Q: 'מלכה', K: 'מלך', H: 'לב', D: 'יהלום', C: 'תלתן', S: 'עלה' },
  en: { A: 'ace', 2: 'two', 3: 'three', 4: 'four', 5: 'five', 6: 'six', 7: 'seven', 8: 'eight', 9: 'nine', 10: 'ten', J: 'jack', Q: 'queen', K: 'king', H: 'hearts', D: 'diamonds', C: 'clubs', S: 'spades' }
};

function voiceLang() {
  return config.voiceLang === 'en' ? 'en' : 'he';
}

function voiceTricksWanted() {
  return Boolean((config.cardTrick || config.remoteTrick || (config.galleryPredict && config.galleryPredictSource !== 'code')) && hasNativeWordListen() && config.osTheme !== 'ios');
}

function normalizeHeard(text) {
  return String(text || '').toLowerCase().replace(/[׳״'"`.,!?\-]/g, '').replace(/\s+/g, ' ').trim();
}

// מוצא בתוך משפט את הקלף (צריך גם ערך וגם צורה). האחרון במשפט מנצח.
function parseSpokenCard(text) {
  const tokens = normalizeHeard(text).split(' ').filter(Boolean);
  const lookup = (tok, table) => {
    const cands = [tok];
    // "המלכה", "הלב", "של לב" - מורידים אות שימוש בהתחלה
    if (/^[הובלשמכ]/.test(tok) && tok.length > 2) cands.push(tok.slice(1));
    for (const c of cands) {
      for (const [key, words] of table) {
        if (words.some((w) => w.replace(/'/g, '') === c)) return key;
      }
    }
    return null;
  };
  let rank = null;
  let suit = null;
  tokens.forEach((tok) => {
    const r = lookup(tok, CARD_RANK_WORDS);
    if (r) { rank = r; return; }
    const s = lookup(tok, CARD_SUIT_WORDS);
    if (s) suit = s;
  });
  return rank && suit ? { r: rank, s: suit } : null;
}

function voiceTricksStart() {
  voiceTricksReset();
  // 📸 הופעה חדשה: התמונה מהצופה הקודם יוצאת מהגלריה, ומחכים שוב ל"תגיד"
  galleryPredictDelete();
  galleryPredictStage = 'wait';
  if (!voiceTricksWanted()) {
    if (config.galleryPredict) {
      heardLog('🎤', config.galleryPredictSource === 'code' ? 'לא מקשיב - נבחר "הקוד שהוא מקליד"'
        : !hasNativeWordListen() ? 'לא מקשיב - צריך את האפליקציה המותקנת (לא דפדפן)' : 'לא מקשיב - נבחר עיצוב אייפון');
    }
    return;
  }
  voiceTrickListening = true;
  heardLog('🎤', 'התחלתי להקשיב (' + (voiceLang() === 'en' ? 'אנגלית' : 'עברית') + ')');
  try {
    window.AndroidNative.startWordListen(voiceLang());
  } catch (e) {
    heardLog('⚠️', 'ההקשבה לא נפתחה: ' + (e && e.message ? e.message : e));
  }
}

// מישהו אחר כיבה את המיקרופון (למשל "הטלפון ידע מראש") - מחזירים את ההקשבה של 📸 / 🃏
function voiceTricksResume() {
  if (!voiceTrickListening || !hasNativeWordListen()) return;
  try { window.AndroidNative.startWordListen(voiceLang()); } catch (e) {}
}

// "מוכן לצופה הבא" / הפעלה חדשה: הטפט הרגיל חוזר וההודעה נעלמת
function voiceTricksReset() {
  voiceTrickListening = false;
  voiceTrickRemoteFired = false;
  clearTimeout(voiceTrickCardTimer);
  const n = document.getElementById('remoteNotif');
  if (n) n.classList.remove('show');
  voiceTrickCard = null;
  if (voiceTrickWpUrl) {
    voiceTrickWpUrl = '';
    applyWallpaperToContainer();
  }
}

function voiceTrickWhisper(he, en) {
  if (!hasNativeSecretVoice()) return;
  try {
    window.AndroidNative.speakSecret(he, voiceLang(), en);
  } catch (e) {}
}

function voiceTrickHeard(text, isFinal) {
  // 🗣️ מילת הקוד של הקוסם - גם באמצע משפט, בלי לחכות לסוף
  if (config.remoteTrick && !voiceTrickRemoteFired) {
    const code = normalizeHeard(config.remoteWord || 'וואלה');
    if (code && (' ' + normalizeHeard(text) + ' ').includes(code)) {
      voiceTrickRemoteFired = true;
      remoteTrickFire();
      return;
    }
  }
  // 🃏 הקלף של הצופה
  if (config.cardTrick && isFinal) {
    const card = parseSpokenCard(text);
    if (!card) return;
    clearTimeout(voiceTrickCardTimer);
    voiceTrickCardTimer = setTimeout(() => cardTrickShow(card), 300);
  }
  // 📸 המילה של הצופה -> תמונה "מהבוקר" בגלריה האמיתית.
  // הקוסם אומר משפט עם "תגיד" -> רק התשובה הראשונה אחרי זה נשמרת -> ואז מפסיקים להקשיב.
  if (config.galleryPredict) {
    const heard = normalizeHeard(text);
    if (!heard) return;
    const hasCue = GALLERY_CUE.test(' ' + heard + ' ');
    const hasSaid = GALLERY_SAID.test(' ' + heard + ' ');
    // 🛟 גיבוי בקול: הקוסם אומר "אמרת ריהאנה, נכון?" -> מה שאחרי "אמרת" נשמר (גם אם כבר נשמר משהו)
    if (hasSaid) {
      if (!isFinal) return;
      const raw = String(text).replace(/[.,!?״"]/g, ' ').split(/\s+/).filter(Boolean);
      let at = -1;
      raw.forEach((tk, i) => { if (GALLERY_SAID.test(' ' + normalizeHeard(tk) + ' ')) at = i; });
      let ans = raw.slice(at + 1, at + 4);
      const cut = ans.findIndex((tk) => GALLERY_SAID_TAIL.test(normalizeHeard(tk)));
      if (cut >= 0) ans = ans.slice(0, cut);
      const w = cleanSpokenWord(ans.join(' '));
      if (w) {
        clearTimeout(galleryPredictTimer);
        galleryPredictStage = 'done';
        heardLog(text, '"אמרת" - נשמר: ' + w);
        galleryPredictSave(w, 'word');
      }
      return;
    }
    if (!isFinal) {
      // תוצאה חלקית: אם מחכים לתשובה - שומרים אותה כגיבוי (לפעמים מילה קצרה לא מגיעה כ"סופית")
      if (galleryPredictStage === 'armed' && !hasCue) {
        galleryCandidate = cleanSpokenWord(text);
        clearTimeout(galleryPredictTimer);
        galleryPredictTimer = setTimeout(() => {
          if (galleryPredictStage === 'armed' && galleryCandidate) {
            heardLog(galleryCandidate, 'נשמר (חלקי)');
            galleryPredictStage = 'done';
            galleryPredictSave(galleryCandidate, 'word');
          }
        }, 1800);
      }
      return;
    }
    if (hasCue) {
      // הצופה ענה מהר, והתשובה נדבקה למשפט של הקוסם: "תגיד שם של מפורסם ריהאנה"
      // -> מה שבא אחרי מילת הקטגוריה האחרונה הוא התשובה
      const raw = String(text).replace(/[.,!?״"]/g, ' ').split(/\s+/).filter(Boolean);
      const toks = raw.map((tk) => normalizeHeard(tk));
      let cueAt = -1;
      toks.forEach((tk, i) => { if (GALLERY_CUE.test(' ' + tk + ' ')) cueAt = i; });
      let catAt = -1;
      toks.forEach((tk, i) => { if (i > cueAt && GALLERY_CATEGORY.test(tk)) catAt = i; });
      if (catAt >= 0 && catAt < toks.length - 1) {
        const ans = cleanSpokenWord(raw.slice(catAt + 1, catAt + 4).join(' '));
        if (ans) {
          clearTimeout(galleryPredictTimer);
          galleryPredictStage = 'done';
          heardLog(text, 'נשמר מתוך המשפט: ' + ans);
          galleryPredictSave(ans, 'word');
          return;
        }
      }
      // הקוסם ביקש (שוב) - מחכים לתשובה של הצופה. באוזנייה: "מקשיב" (סימן שהבקשה נשמעה)
      clearTimeout(galleryPredictTimer);
      galleryCandidate = '';
      galleryPredictStage = 'armed';
      heardLog(text, '"תגיד" - מחכה לתשובה');
      return;
    }
    if (galleryPredictStage !== 'armed') {
      heardLog(text, galleryPredictStage === 'done' ? 'התעלמתי (כבר נשמר)' : 'התעלמתי (עוד לא נאמר "תגיד")');
      return;
    }
    const w = cleanSpokenWord(text);
    if (!w) return;
    clearTimeout(galleryPredictTimer);
    galleryPredictStage = 'done';
    heardLog(w, 'נשמר');
    galleryPredictSave(w, 'word');
  }
}

// איזה מיקרופון מקשיב (נכתב ביומן)
window.onVoiceMicMode = function (mode) {
  if (String(mode).startsWith('err:')) { heardLog('⚠️', String(mode).slice(4)); return; }
  if (String(mode).startsWith('ok:')) { heardLog('✅', 'זיהוי הדיבור עובד: ' + String(mode).slice(3)); return; }
  heardLog('🎤', mode === 'phone' ? 'מקשיב דרך המיקרופון של הטלפון' : 'חזר למיקרופון הרגיל');
};

// יומן "מה הטלפון שמע" (15 האחרונים) - כדי להבין מה קרה בהופעה
const HEARD_LOG_KEY = 'magic_heard_log';
var galleryCandidate = '';
function heardLog(text, what) {
  try {
    const arr = JSON.parse(localStorage.getItem(HEARD_LOG_KEY) || '[]');
    const d = new Date();
    arr.unshift({ t: String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0') + ':' + String(d.getSeconds()).padStart(2, '0'), s: String(text).slice(0, 80), w: what });
    localStorage.setItem(HEARD_LOG_KEY, JSON.stringify(arr.slice(0, 15)));
  } catch (e) {}
}

// המילים שמסמנות "עכשיו הצופה עונה": תגיד / תגידי / תאמר / תאמרי / תבחר / say / tell
const GALLERY_CUE = /\s[ושהכ]?(תגיד|תגידי|תגידו|תאמר|תאמרי|תבחר|תבחרי|say|tell)\s/;
// 🛟 גיבוי בקול: "אמרת X?" / "you said X?"
const GALLERY_SAID = /\s[וש]?(אמרת|said)\s/;
// מילים שבאות אחרי התשובה ולא שייכות לה ("אמרת ריהאנה נכון?")
const GALLERY_SAID_TAIL = /^(נכון|כן|לא|זה|ש|right|yes|correct|isnt|is)$/;
// מילים שמסיימות את הבקשה של הקוסם ("...שם של מפורסם", "...עיר", "...חיה")
const GALLERY_CATEGORY = /^[הלש]?(מפורסם|מפורסמת|מפורסמים|זמר|זמרת|שחקן|שחקנית|עיר|מדינה|חיה|צבע|מילה|פרי|ירק|מספר|חפץ|אוכל|מותג|דמות|קבוצה|celebrity|city|country|animal|color|colour|word|fruit|number|object|name|singer|actor)$/;
var galleryPredictStage = 'wait';

// ----------------------------------------------------------------------------
// 📸 "התמונה כבר הייתה שם": הצופה אומר מילה -> בגלריה האמיתית של הטלפון מופיעה
// תמונה של פתק בכתב יד עם המילה, שצולמה "הבוקר". ב"מוכן לצופה הבא" היא נמחקת.
// ----------------------------------------------------------------------------
var galleryPredictTimer = null;
var galleryPredictSaved = false;
const PREDICT_PAPER_KEY = 'magic_predict_paper';

function hasNativeGalleryPredict() {
  return Boolean(window.AndroidNative && typeof window.AndroidNative.savePredictionPhoto === 'function');
}

function galleryPredictText(word) {
  const tpl = String(config.galleryPredictTpl || '{מילה}');
  return /\{(מילה|word)\}/i.test(tpl) ? tpl.replace(/\{(מילה|word)\}/gi, word) : `${tpl} ${word}`.trim();
}

function loadImg(src) {
  return new Promise((resolve) => {
    if (!src) return resolve(null);
    const im = new Image();
    im.onload = () => resolve(im);
    im.onerror = () => resolve(null);
    im.src = src;
  });
}

// ----------------------------------------------------------------------------
// ✍️ כתב היד של הקוסם: כל אות נכתבת פעם אחת באצבע (קווים, לא תמונה), ונשמרת בטלפון.
// כל אות בתיבה 0..1; קו הכתיבה ב-0.72.
// ----------------------------------------------------------------------------
const HANDWRITING_KEY = 'magic_handwriting_v1';
const HAND_LETTERS = ['א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ז', 'ח', 'ט', 'י', 'כ', 'ך', 'ל', 'מ', 'ם', 'נ', 'ן', 'ס', 'ע', 'פ', 'ף', 'צ', 'ץ', 'ק', 'ר', 'ש', 'ת', '0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];

function loadHandwriting() {
  try {
    return JSON.parse(localStorage.getItem(HANDWRITING_KEY) || '{}') || {};
  } catch (e) {
    return {};
  }
}

// כל האותיות של הטקסט קיימות בכתב היד? -> מפה עם מידות; אחרת null (כותבים בגופן)
function handwritingFor(text) {
  const hw = loadHandwriting();
  const out = {};
  for (const ch of Array.from(text)) {
    if (ch === ' ') continue;
    // גרש (ג׳, צ׳, ז׳) - קו קטן, לא צריך לכתוב אותו
    const strokes = hw[ch] || (ch === '׳' || ch === "'" ? [[[0.52, 0.34], [0.5, 0.42], [0.47, 0.5]]] : null);
    if (!strokes || !strokes.length) return null;
    if (!out[ch]) {
      let minX = 1;
      let maxX = 0;
      strokes.forEach((st) => st.forEach((p) => { minX = Math.min(minX, p[0]); maxX = Math.max(maxX, p[0]); }));
      out[ch] = { strokes, minX, adv: Math.max(0.12, maxX - minX) + 0.1 };
    }
  }
  return Object.keys(out).length ? out : null;
}

function drawHandGlyph(g, strokes, S, color) {
  g.strokeStyle = color;
  g.lineWidth = Math.max(3, S * 0.032);
  g.lineCap = 'round';
  g.lineJoin = 'round';
  strokes.forEach((st) => {
    if (!st.length) return;
    g.beginPath();
    g.moveTo(st[0][0] * S, st[0][1] * S);
    if (st.length === 1) {
      g.lineTo(st[0][0] * S + 0.5, st[0][1] * S + 0.5);
    }
    for (let i = 1; i < st.length - 1; i++) {
      const mx = (st[i][0] + st[i + 1][0]) / 2;
      const my = (st[i][1] + st[i + 1][1]) / 2;
      g.quadraticCurveTo(st[i][0] * S, st[i][1] * S, mx * S, my * S);
    }
    if (st.length > 1) g.lineTo(st[st.length - 1][0] * S, st[st.length - 1][1] * S);
    g.stroke();
  });
}

// מסך הכתיבה: אות אחרי אות
function openHandwritingPad() {
  const pad = document.getElementById('handPad');
  const cv = document.getElementById('handPadCanvas');
  if (!pad || !cv) return;
  // מעל כל המסכים (גם מעל ההגדרות)
  if (pad.parentElement !== document.body) document.body.appendChild(pad);
  const hw = loadHandwriting();
  let idx = HAND_LETTERS.findIndex((l) => !hw[l]);
  if (idx < 0) idx = 0;
  let strokes = [];
  let cur = null;
  const ctx = cv.getContext('2d');
  const fit = () => {
    const r = cv.getBoundingClientRect();
    const d = window.devicePixelRatio || 1;
    cv.width = Math.round(r.width * d);
    cv.height = Math.round(r.height * d);
  };
  const render = () => {
    const Wc = cv.width;
    ctx.clearRect(0, 0, Wc, cv.height);
    // קווי עזר: קו כתיבה (0.72) וקו אמצע (0.38)
    ctx.strokeStyle = 'rgba(28,48,125,.25)';
    ctx.lineWidth = Math.max(1, Wc * 0.004);
    ctx.setLineDash([Wc * 0.02, Wc * 0.02]);
    [0.38, 0.72].forEach((yy) => { ctx.beginPath(); ctx.moveTo(0, yy * Wc); ctx.lineTo(Wc, yy * Wc); ctx.stroke(); });
    ctx.setLineDash([]);
    drawHandGlyph(ctx, strokes, Wc, '#1c307d');
  };
  const show = () => {
    const l = HAND_LETTERS[idx];
    strokes = (loadHandwriting()[l] || []).map((s) => s.slice());
    document.getElementById('handPadLetter').textContent = l;
    document.getElementById('handPadProgress').textContent = `${idx + 1} / ${HAND_LETTERS.length}`;
    render();
  };
  const toPt = (e) => {
    const r = cv.getBoundingClientRect();
    return [Math.round(((e.clientX - r.left) / r.width) * 1000) / 1000, Math.round(((e.clientY - r.top) / r.width) * 1000) / 1000];
  };
  cv.onpointerdown = (e) => {
    e.preventDefault();
    try { cv.setPointerCapture(e.pointerId); } catch (err) {}
    cur = [toPt(e)];
    strokes.push(cur);
    render();
  };
  cv.onpointermove = (e) => {
    if (!cur) return;
    e.preventDefault();
    const p = toPt(e);
    const last = cur[cur.length - 1];
    if (Math.hypot(p[0] - last[0], p[1] - last[1]) > 0.006) {
      cur.push(p);
      render();
    }
  };
  cv.onpointerup = cv.onpointercancel = () => { cur = null; };
  const save = () => {
    const all = loadHandwriting();
    const l = HAND_LETTERS[idx];
    if (strokes.length) all[l] = strokes;
    else delete all[l];
    try { localStorage.setItem(HANDWRITING_KEY, JSON.stringify(all)); } catch (e) {}
  };
  document.getElementById('handPadClear').onclick = () => { strokes = []; render(); };
  document.getElementById('handPadNext').onclick = () => {
    save();
    if (idx < HAND_LETTERS.length - 1) { idx++; show(); } else close();
  };
  document.getElementById('handPadPrev').onclick = () => { save(); if (idx > 0) { idx--; show(); } };
  const close = () => {
    save();
    pad.style.display = 'none';
    syncNewRevealsUI();
  };
  document.getElementById('handPadDone').onclick = close;
  pad.style.display = 'flex';
  requestAnimationFrame(() => { fit(); show(); });
}

// פתק בכתב יד: כל אות בנפרד, עם הטיה וגובה קצת שונים, בדיו כחול - ותאורה של צילום אמיתי
async function drawPredictionPhoto(text) {
  const W = 1536;
  const H = 2048;
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const x = c.getContext('2d');
  let paper = null;
  try { paper = await loadImg(localStorage.getItem(PREDICT_PAPER_KEY) || ''); } catch (e) {}
  if (paper) {
    const sc = Math.max(W / paper.width, H / paper.height);
    x.drawImage(paper, (W - paper.width * sc) / 2, (H - paper.height * sc) / 2, paper.width * sc, paper.height * sc);
  } else {
    // שולחן עץ כהה, ועליו דף מחברת מעט מסובב
    const desk = x.createLinearGradient(0, 0, W, H);
    desk.addColorStop(0, '#5a4330');
    desk.addColorStop(1, '#3a2a1d');
    x.fillStyle = desk;
    x.fillRect(0, 0, W, H);
    for (let i = 0; i < 90; i++) {
      x.strokeStyle = `rgba(0,0,0,${0.03 + Math.random() * 0.05})`;
      x.lineWidth = 1 + Math.random() * 3;
      x.beginPath();
      const yy = Math.random() * H;
      x.moveTo(0, yy);
      x.bezierCurveTo(W * 0.3, yy + Math.random() * 40 - 20, W * 0.7, yy + Math.random() * 40 - 20, W, yy + Math.random() * 30 - 15);
      x.stroke();
    }
    x.save();
    x.translate(W / 2, H / 2);
    x.rotate(-0.035);
    const pw = W * 0.84;
    const ph = H * 0.86;
    x.shadowColor = 'rgba(0,0,0,.45)';
    x.shadowBlur = 40;
    x.shadowOffsetY = 18;
    x.fillStyle = '#f7f4ec';
    x.fillRect(-pw / 2, -ph / 2, pw, ph);
    x.shadowColor = 'transparent';
    x.strokeStyle = 'rgba(70,120,200,.28)';
    x.lineWidth = 2;
    for (let yy = -ph / 2 + 200; yy < ph / 2 - 40; yy += 78) {
      x.beginPath();
      x.moveTo(-pw / 2, yy);
      x.lineTo(pw / 2, yy);
      x.stroke();
    }
    x.strokeStyle = 'rgba(210,70,70,.35)';
    x.beginPath();
    x.moveTo(pw / 2 - 150, -ph / 2);
    x.lineTo(pw / 2 - 150, ph / 2);
    x.stroke();
    x.restore();
  }
  // כתב יד: כותבים על דף נפרד, ואז "מרעידים" את הקווים כמו יד עם עט
  const isHe = /[֐-׿]/.test(text);
  const chars = Array.from(text);
  const FONT = (s) => `400 ${s}px "Segoe Print", "Bradley Hand", "Noteworthy", "Comic Sans MS", cursive, sans-serif`;
  const t = document.createElement('canvas');
  const TW = Math.round(W * 0.9);
  const TH = 520;
  t.width = TW;
  t.height = TH;
  const g = t.getContext('2d');
  let fs = 230;
  const baseY = TH * 0.62;
  const maxW = TW * 0.78;
  const hand = handwritingFor(text);
  let total = 0;
  if (hand) {
    // ✍️ כתב היד האמיתי של הקוסם: כל אות כפי שהוא כתב אותה באצבע
    let S = fs * 1.3;
    const adv = (ch) => (ch === ' ' ? 0.36 : hand[ch].adv);
    total = chars.reduce((s, ch) => s + adv(ch) * S, 0);
    if (total > maxW) {
      S = S * maxW / total;
      total = maxW;
    }
    fs = S / 1.3;
    let pos = isHe ? TW / 2 + total / 2 : TW / 2 - total / 2;
    chars.forEach((ch, i) => {
      const w = adv(ch) * S;
      if (ch !== ' ') {
        const gl = hand[ch];
        const left = isHe ? pos - w : pos;
        g.save();
        // נקודת הבסיס של התיבה (0.72 = קו הכתיבה), השורה עולה קצת, כל אות קצת שונה
        g.translate(left - gl.minX * S + 0.05 * S, baseY - 0.72 * S - i * S * 0.008 + (Math.random() - 0.5) * S * 0.03);
        g.rotate((Math.random() - 0.5) * 0.05);
        drawHandGlyph(g, gl.strokes, S, '#1c307d');
        g.restore();
      }
      pos = isHe ? pos - w : pos + w;
    });
  } else {
    g.font = FONT(fs);
    total = chars.reduce((s, ch) => s + g.measureText(ch).width * 0.95, 0);
    if (total > maxW) {
      fs = Math.max(80, Math.floor(fs * maxW / total));
      g.font = FONT(fs);
      total = chars.reduce((s, ch) => s + g.measureText(ch).width * 0.95, 0);
    }
    g.fillStyle = '#1c307d';
    g.textBaseline = 'alphabetic';
    let pos = isHe ? TW / 2 + total / 2 : TW / 2 - total / 2;
    chars.forEach((ch, i) => {
      const cw = g.measureText(ch).width * 0.95;
      const cx = isHe ? pos - cw : pos;
      g.save();
      // השורה עולה קצת לאורך המילה, וכל אות קצת שונה
      g.translate(cx + cw / 2, baseY - i * fs * 0.012 + (Math.random() - 0.5) * fs * 0.07);
      g.rotate((Math.random() - 0.5) * 0.14);
      g.scale(0.92 + Math.random() * 0.12, 0.92 + Math.random() * 0.14);
      g.fillText(ch, -cw / 2, 0);
      g.restore();
      pos = isHe ? pos - cw : pos + cw;
    });
  }
  // קו מתחת, כמו שמסמנים בעט
  g.lineWidth = Math.max(5, fs * 0.035);
  g.strokeStyle = '#1c307d';
  g.lineCap = 'round';
  g.beginPath();
  g.moveTo(TW / 2 - total / 2 - 14, baseY + fs * 0.24);
  g.quadraticCurveTo(TW / 2, baseY + fs * 0.34, TW / 2 + total / 2 + 24, baseY + fs * 0.16);
  g.stroke();
  // רעד יד: הזזת שורות ועמודות בגל קטן ולא קבוע
  // (בכתב היד האמיתי של הקוסם - בלי רעד, בדיוק כמו שהוא כתב)
  const warp = document.createElement('canvas');
  if (!hand) {
  warp.width = TW;
  warp.height = TH;
  const wg = warp.getContext('2d');
  const ph1 = Math.random() * 6;
  for (let yy = 0; yy < TH; yy += 2) {
    const dx = Math.sin(yy * 0.045 + ph1) * 3.2 + Math.sin(yy * 0.13) * 1.4;
    wg.drawImage(t, 0, yy, TW, 2, dx, yy, TW, 2);
  }
  g.clearRect(0, 0, TW, TH);
  const ph2 = Math.random() * 6;
  for (let xx = 0; xx < TW; xx += 2) {
    const dy = Math.sin(xx * 0.038 + ph2) * 3 + Math.sin(xx * 0.11) * 1.2;
    g.drawImage(warp, xx, 0, 2, TH, xx, dy, 2, TH);
  }
  }
  x.save();
  x.translate(W / 2, H * 0.44);
  x.rotate(-0.045);
  x.globalAlpha = 0.9;
  x.filter = 'blur(0.6px)';
  x.drawImage(t, -TW / 2, -TH / 2);
  x.filter = 'none';
  x.globalAlpha = 1;
  x.restore();
  // תאורה לא אחידה + וינייטה, כמו צילום בטלפון
  const light = x.createRadialGradient(W * 0.35, H * 0.3, W * 0.1, W * 0.5, H * 0.5, H * 0.8);
  light.addColorStop(0, 'rgba(255,248,230,.10)');
  light.addColorStop(1, 'rgba(0,0,0,.28)');
  x.fillStyle = light;
  x.fillRect(0, 0, W, H);
  return c.toDataURL('image/jpeg', 0.88);
}

async function galleryPredictSave(word, tag) {
  if (!hasNativeGalleryPredict()) return;
  const dataUrl = await drawPredictionPhoto(galleryPredictText(word));
  window.__lastPredictionWord = word;
  // בדיקה: תמיד "לפני 2 דקות" - שתהיה ראשונה בגלריה
  const mins = tag === 'test' ? 2 : Number(config.galleryPredictAgo) || 2;
  try {
    window.AndroidNative.savePredictionPhoto(dataUrl, mins, tag + ':' + word);
  } catch (e) {
    const st = document.getElementById('galleryPredictTestStatus');
    if (st && tag === 'test') { st.textContent = '❌ ' + (e && e.message ? e.message : 'bridge'); st.className = 'toggle-sub-desc live-read-status bad'; }
  }
  return dataUrl;
}

function galleryPredictDelete() {
  // אנדרואיד זוכר איזו תמונה שמרנו (גם אחרי סגירת האפליקציה) ומוחק רק אותה
  if (!hasNativeGalleryPredict()) return;
  galleryPredictSaved = false;
  try {
    window.AndroidNative.deletePredictionPhoto();
  } catch (e) {}
}

// 📸 גיבוי "הקלדה כסיסמה": פותחים את הטלפון אחרי שהתמונה נשמרה
var typedUnlockPending = false;
var typedUnlockTimer = null;
function finishTypedUnlock() {
  if (!typedUnlockPending) return;
  typedUnlockPending = false;
  clearTimeout(typedUnlockTimer);
  animateLockOpenAndUnlock();
}

// אנדרואיד מודיע שהתמונה נשמרה בגלריה
window.onPredictionPhotoSaved = function (ok, tag, info) {
  const t = String(tag || '');
  const word = t.slice(t.indexOf(':') + 1);
  if (ok) galleryPredictSaved = true;
  if (t.startsWith('typed:')) {
    heardLog(word, ok ? '📸 נשמר בגלריה ✓' : '❌ לא נשמר בגלריה: ' + String(info || ''));
    finishTypedUnlock();
    return;
  }
  if (t.startsWith('test:')) {
    const st = document.getElementById('galleryPredictTestStatus');
    if (st) {
      st.textContent = ok
        ? (isEnglishUi() ? '✓ Saved to the Gallery (Camera album). ("Ready for next spectator" deletes it.)' : '✓ נשמר בגלריה, באלבום "מצלמה". אם צילמת משהו אחרי השעה שבחרת - התמונה תהיה מתחתיו. ("מוכן לצופה הבא" מוחק אותה.)') + '\n[' + String(info || '') + ']'
        : '❌ ' + String(info || '');
      st.style.whiteSpace = 'pre-line';
      st.className = 'toggle-sub-desc live-read-status ' + (ok ? 'good' : 'bad');
    }
    // הוכחה: פותחים את התמונה בגלריה האמיתית
    if (ok) {
      setTimeout(() => {
        let opened = false;
        try { opened = Boolean(window.AndroidNative.openPredictionPhoto && window.AndroidNative.openPredictionPhoto()); } catch (e) {}
        if (!opened && st) st.textContent += '\n⚠️ הגלריה לא נפתחה אוטומטית - פתח אותה ידנית, אלבום "מצלמה".';
      }, 500);
    }
    return;
  }
  heardLog(word, ok ? '📸 נשמר בגלריה ✓' : '❌ לא נשמר בגלריה: ' + String(info || ''));
  if (ok) {
    trackEvent('gallerypredict_hit');
    voiceTrickWhisper('נקלט: ' + word, 'got: ' + word);
  } else {
    voiceTrickWhisper('לא הצלחתי לשמור', 'could not save');
  }
};

// הטפט הרגיל שנבחר באפליקציה (התמונה של הקוסם) - הקלף מצויר עליו
function currentBaseWallpaperUrl() {
  try {
    const catalog = getWallpaperCatalogForCurrentModel();
    const customDataUrl = localStorage.getItem(WALLPAPER_STORAGE_KEY);
    const selectedId = localStorage.getItem(SELECTED_WALLPAPER_ID_KEY) || 'model_default';
    if (selectedId === 'custom' && customDataUrl) return customDataUrl;
    const found = catalog.find((item) => item.id === selectedId);
    return (found || catalog[0]).dataUrl;
  } catch (e) {
    return '';
  }
}

function loadImageSafe(src) {
  return new Promise((resolve) => {
    if (!src) return resolve(null);
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

async function cardTrickShow(card) {
  const bgImg = await loadImageSafe(currentBaseWallpaperUrl());
  const dataUrl = drawCardWallpaper(card, bgImg);
  if (!dataUrl || !phoneContainer) return;
  voiceTrickCard = card;
  voiceTrickWpUrl = dataUrl;
  applyWallpaperToContainer();
  // מסך השעון (בלי מקלדת וטשטוש) - כמו טלפון נעול שמדליקים
  phoneContainer.classList.add('clock-mode-active');
  trackEvent('cardtrick_hit');
  const he = CARD_NAMES.he[card.r] + ' ' + CARD_NAMES.he[card.s];
  const en = CARD_NAMES.en[card.r] + ' of ' + CARD_NAMES.en[card.s];
  voiceTrickWhisper('נקלט: ' + he, 'got: ' + en);
}

function remoteTrickFire() {
  trackEvent('remotetrick_hit');
  if (config.remoteAction === 'photo') {
    let src = '';
    try { src = localStorage.getItem(REMOTE_PHOTO_KEY) || ''; } catch (e) {}
    if (src) {
      voiceTrickWpUrl = src;
      applyWallpaperToContainer();
    }
    return;
  }
  const n = document.getElementById('remoteNotif');
  if (!n) return;
  const title = n.querySelector('.rn-title');
  const body = n.querySelector('.rn-text');
  if (title) title.textContent = String(config.remoteNotifTitle || 'אמא').slice(0, 40);
  if (body) body.textContent = String(config.remoteNotifText || 'תגיד לחבר שלך שלום 👋').slice(0, 120);
  if (phoneContainer) phoneContainer.classList.add('clock-mode-active');
  n.classList.remove('show');
  void n.offsetWidth;
  n.classList.add('show');
  triggerHaptic([0, 70, 90, 70]);
}

// --- ציור הקלף: קלף משחק אמיתי על שולחן לבד ירוק, בגודל המסך ---
function drawSuitShape(x, suit, cx, cy, s, flip) {
  x.save();
  x.translate(cx, cy);
  if (flip) x.rotate(Math.PI);
  x.fillStyle = suit === 'H' || suit === 'D' ? '#c8102e' : '#141414';
  x.beginPath();
  if (suit === 'H') {
    x.moveTo(0, s * 0.42);
    x.bezierCurveTo(-s * 0.62, -s * 0.02, -s * 0.36, -s * 0.58, 0, -s * 0.2);
    x.bezierCurveTo(s * 0.36, -s * 0.58, s * 0.62, -s * 0.02, 0, s * 0.42);
  } else if (suit === 'D') {
    x.moveTo(0, -s * 0.5);
    x.quadraticCurveTo(s * 0.18, -s * 0.18, s * 0.38, 0);
    x.quadraticCurveTo(s * 0.18, s * 0.18, 0, s * 0.5);
    x.quadraticCurveTo(-s * 0.18, s * 0.18, -s * 0.38, 0);
    x.quadraticCurveTo(-s * 0.18, -s * 0.18, 0, -s * 0.5);
  } else if (suit === 'S') {
    x.moveTo(0, -s * 0.48);
    x.bezierCurveTo(-s * 0.62, -s * 0.02, -s * 0.36, s * 0.42, 0, s * 0.14);
    x.bezierCurveTo(s * 0.36, s * 0.42, s * 0.62, -s * 0.02, 0, -s * 0.48);
    x.moveTo(0, s * 0.1);
    x.lineTo(-s * 0.16, s * 0.5);
    x.lineTo(s * 0.16, s * 0.5);
  } else {
    const r = s * 0.2;
    x.moveTo(r, -s * 0.24);
    x.arc(0, -s * 0.24, r, 0, Math.PI * 2);
    x.moveTo(-s * 0.2 + r, s * 0.06);
    x.arc(-s * 0.2, s * 0.06, r, 0, Math.PI * 2);
    x.moveTo(s * 0.2 + r, s * 0.06);
    x.arc(s * 0.2, s * 0.06, r, 0, Math.PI * 2);
    x.moveTo(0, -s * 0.02);
    x.lineTo(-s * 0.16, s * 0.5);
    x.lineTo(s * 0.16, s * 0.5);
  }
  x.closePath();
  x.fill();
  x.restore();
}

const CARD_PIPS = {
  A: [[0.5, 0.5]],
  2: [[0.5, 0.2], [0.5, 0.8]],
  3: [[0.5, 0.2], [0.5, 0.5], [0.5, 0.8]],
  4: [[0.3, 0.2], [0.7, 0.2], [0.3, 0.8], [0.7, 0.8]],
  5: [[0.3, 0.2], [0.7, 0.2], [0.5, 0.5], [0.3, 0.8], [0.7, 0.8]],
  6: [[0.3, 0.2], [0.7, 0.2], [0.3, 0.5], [0.7, 0.5], [0.3, 0.8], [0.7, 0.8]],
  7: [[0.3, 0.2], [0.7, 0.2], [0.5, 0.35], [0.3, 0.5], [0.7, 0.5], [0.3, 0.8], [0.7, 0.8]],
  8: [[0.3, 0.2], [0.7, 0.2], [0.5, 0.35], [0.3, 0.5], [0.7, 0.5], [0.5, 0.65], [0.3, 0.8], [0.7, 0.8]],
  9: [[0.3, 0.2], [0.7, 0.2], [0.3, 0.4], [0.7, 0.4], [0.5, 0.5], [0.3, 0.6], [0.7, 0.6], [0.3, 0.8], [0.7, 0.8]],
  10: [[0.3, 0.2], [0.7, 0.2], [0.5, 0.3], [0.3, 0.4], [0.7, 0.4], [0.3, 0.6], [0.7, 0.6], [0.5, 0.7], [0.3, 0.8], [0.7, 0.8]]
};

function drawCardWallpaper(card, bgImg) {
  try {
    // בגודל המסך של האפליקציה (לא יותר מ-1440 פיקסלים רוחב)
    const vw = (phoneContainer && phoneContainer.clientWidth) || window.innerWidth || 400;
    const vh = (phoneContainer && phoneContainer.clientHeight) || window.innerHeight || 860;
    const dpr = Math.min(window.devicePixelRatio || 1, 3, 1440 / vw);
    const W = Math.max(200, Math.round(vw * dpr));
    const H = Math.max(400, Math.round(vh * dpr));
    const c = document.createElement('canvas');
    c.width = W;
    c.height = H;
    const x = c.getContext('2d');
    if (bgImg && bgImg.width) {
      // הטפט שלך (כמו במסך הנעילה האמיתי), והקלף עליו
      const sc = Math.max(W / bgImg.width, H / bgImg.height);
      const bw = bgImg.width * sc;
      const bh = bgImg.height * sc;
      x.drawImage(bgImg, (W - bw) / 2, (H - bh) / 2, bw, bh);
    } else {
      // אין טפט: שולחן לבד ירוק
      const bg = x.createRadialGradient(W * 0.5, H * 0.55, W * 0.1, W * 0.5, H * 0.55, H * 0.75);
      bg.addColorStop(0, '#1f6b45');
      bg.addColorStop(0.6, '#134d31');
      bg.addColorStop(1, '#08261a');
      x.fillStyle = bg;
      x.fillRect(0, 0, W, H);
    }
    const cw = W * (bgImg ? 0.46 : 0.52);
    const ch = cw * 1.4;
    x.save();
    x.translate(W / 2, H * 0.56);
    x.rotate(-0.06);
    x.shadowColor = 'rgba(0,0,0,0.55)';
    x.shadowBlur = 40 * dpr;
    x.shadowOffsetY = 14 * dpr;
    const rr = cw * 0.06;
    x.beginPath();
    x.moveTo(-cw / 2 + rr, -ch / 2);
    x.arcTo(cw / 2, -ch / 2, cw / 2, ch / 2, rr);
    x.arcTo(cw / 2, ch / 2, -cw / 2, ch / 2, rr);
    x.arcTo(-cw / 2, ch / 2, -cw / 2, -ch / 2, rr);
    x.arcTo(-cw / 2, -ch / 2, cw / 2, -ch / 2, rr);
    x.closePath();
    x.fillStyle = '#fbfaf6';
    x.fill();
    x.shadowColor = 'transparent';
    x.translate(-cw / 2, -ch / 2);
    const red = card.s === 'H' || card.s === 'D';
    const ink = red ? '#c8102e' : '#141414';
    // פינות: ערך + צורה
    const corner = (flip) => {
      x.save();
      if (flip) {
        x.translate(cw, ch);
        x.rotate(Math.PI);
      }
      x.fillStyle = ink;
      x.font = `700 ${Math.round(cw * 0.15)}px Georgia, "Times New Roman", serif`;
      x.textAlign = 'center';
      x.textBaseline = 'top';
      x.fillText(card.r, cw * 0.1, ch * 0.035);
      drawSuitShape(x, card.s, cw * 0.1, ch * 0.165, cw * 0.1, false);
      x.restore();
    };
    corner(false);
    corner(true);
    if (/^(J|Q|K)$/.test(card.r)) {
      // קלף תמונה: מסגרת, אות גדולה וצורות
      x.strokeStyle = ink;
      x.lineWidth = Math.max(2, cw * 0.006);
      x.strokeRect(cw * 0.2, ch * 0.13, cw * 0.6, ch * 0.74);
      x.fillStyle = red ? 'rgba(200,16,46,0.07)' : 'rgba(20,20,20,0.06)';
      x.fillRect(cw * 0.2, ch * 0.13, cw * 0.6, ch * 0.74);
      x.fillStyle = ink;
      x.font = `700 ${Math.round(cw * 0.42)}px Georgia, "Times New Roman", serif`;
      x.textAlign = 'center';
      x.textBaseline = 'middle';
      x.fillText(card.r, cw * 0.5, ch * 0.5);
      drawSuitShape(x, card.s, cw * 0.5, ch * 0.24, cw * 0.14, false);
      drawSuitShape(x, card.s, cw * 0.5, ch * 0.76, cw * 0.14, true);
    } else {
      const pips = CARD_PIPS[card.r] || [];
      const ps = card.r === 'A' ? cw * 0.42 : cw * 0.17;
      pips.forEach(([px, py]) => {
        drawSuitShape(x, card.s, cw * (0.14 + px * 0.72), ch * (0.1 + py * 0.8), ps, py > 0.55);
      });
    }
    x.restore();
    return c.toDataURL('image/jpeg', 0.9);
  } catch (e) {
    return null;
  }
}

// 🗣️ "חזרה בפקודה קולית" (אנדרואיד): אחרי שהצופה הקליד, הטלפון מקשיב למשפט "תחזור/תחזרי על הקוד"
// ולוחש את הקוד שוב. מקשיבים רק עד "מוכן לצופה הבא" או כניסה להגדרות.
function hasNativeVoiceRepeat() {
  return Boolean(window.AndroidNative && typeof window.AndroidNative.startVoiceRepeat === 'function');
}

function liveReadArmVoice(code) {
  if (!config.liveRead || !config.liveReadVoice || !hasNativeVoiceRepeat()) return;
  const digits = String(code || '').replace(/\D/g, '').split('');
  if (!digits.length) return;
  const he = 'הקוד: ' + digits.map((d) => LIVE_READ_WORDS.he[Number(d)]).join(', ');
  const en = 'the code: ' + digits.map((d) => LIVE_READ_WORDS.en[Number(d)]).join(', ');
  try {
    window.AndroidNative.startVoiceRepeat(he, en, liveReadLang());
  } catch (e) {}
}

function liveReadStopVoice() {
  if (!hasNativeVoiceRepeat()) return;
  try {
    window.AndroidNative.stopVoiceRepeat();
  } catch (e) {}
}

function liveReadMicReady() {
  try {
    return Boolean(window.AndroidNative.hasMicPermission());
  } catch (e) {
    return false;
  }
}

// תשובת אנדרואיד לבקשת הרשאת המיקרופון
window.onMicPermission = function (ok) {
  const wpSt = document.getElementById('wordPredictStatus');
  if (wpSt && config.wordPredict) {
    wpSt.textContent = ok ? (isEnglishUi() ? '✓ Microphone allowed.' : '✓ המיקרופון מאושר.') : (isEnglishUi() ? '⚠️ Microphone not allowed - the trick will not work.' : '⚠️ המיקרופון לא אושר - הקסם לא יעבוד.');
    wpSt.className = 'toggle-sub-desc live-read-status ' + (ok ? 'good' : 'bad');
  }
  const st = document.getElementById('liveReadVoiceStatus');
  if (!st) return;
  const isEn = isEnglishUi();
  st.textContent = ok
    ? (isEn ? '✓ Microphone allowed. After the code, say "repeat the code" and you will hear it again.' : '✓ המיקרופון מאושר. אחרי הקוד, תגיד "תחזור על הקוד" ותשמע אותו שוב.')
    : (isEn ? '⚠️ Microphone not allowed - the voice command will not work.' : '⚠️ המיקרופון לא אושר - הפקודה הקולית לא תעבוד.');
  st.className = 'toggle-sub-desc live-read-status ' + (ok ? 'good' : 'bad');
};

// בסוף ההקלדה: חוזרים על כל הקוד ברצף - גם אם פספסת ספרה, שומעים אותו שוב
function liveReadRecap(code) {
  if (!config.liveRead || config.liveReadRecap === false || config.unlockMode !== 'pin') return;
  const digits = String(code || '').replace(/\D/g, '').split('');
  if (!digits.length) return;
  const he = 'הקוד: ' + digits.map((d) => LIVE_READ_WORDS.he[Number(d)]).join(', ');
  const en = 'the code: ' + digits.map((d) => LIVE_READ_WORDS.en[Number(d)]).join(', ');
  if (hasNativeSecretVoice()) {
    try {
      window.AndroidNative.speakSecret(he, liveReadLang(), en);
    } catch (e) {}
    return;
  }
  if (!liveReadWebArmed()) return;
  liveReadWebSpeak(he, en);
}

// מחמם את מנוע הדיבור כשמסך הנעילה עולה - כדי שהספרה הראשונה תצא מיד
function liveReadPrepare() {
  if (!config.liveRead) return;
  if (hasNativeSecretVoice() && typeof window.AndroidNative.prepareSecretVoice === 'function') {
    try {
      window.AndroidNative.prepareSecretVoice();
    } catch (e) {}
  }
}

function liveReadHeadsetState() {
  if (hasNativeSecretVoice() && typeof window.AndroidNative.isHeadsetConnected === 'function') {
    try {
      return window.AndroidNative.isHeadsetConnected() ? 'connected' : 'missing';
    } catch (e) {
      return 'missing';
    }
  }
  return 'unknown';
}

// כפתור "בדיקת אוזנייה" בהגדרות
function liveReadTest() {
  const status = document.getElementById('liveReadStatus');
  const isEn = isEnglishUi();
  const set = (t, cls) => {
    if (!status) return;
    status.textContent = t;
    status.className = 'toggle-sub-desc live-read-status ' + (cls || '');
  };
  if (hasNativeSecretVoice()) {
    if (liveReadHeadsetState() !== 'connected') {
      set(isEn ? '⚠️ No earphone connected - the phone stays silent. Connect a Bluetooth earphone and test again.' : '⚠️ לא מחוברת אוזנייה - הטלפון ישתוק. חבר אוזניית בלוטות\' ובדוק שוב.', 'bad');
      return;
    }
    liveReadPrepare();
    const attempt = (n) => {
      const res = window.AndroidNative.speakSecret('אחת, שתיים, שלוש', liveReadLang(), 'one, two, three');
      if (res === 'not-ready' && n < 6) return setTimeout(() => attempt(n + 1), 400);
      if (res === 'no-headset') return set(isEn ? '⚠️ The earphone disconnected - the phone stays silent.' : '⚠️ האוזנייה התנתקה - הטלפון ישתוק.', 'bad');
      const note = res === 'en' && liveReadLang() === 'he' ? (isEn ? ' (no Hebrew voice on this phone - digits are said in English)' : ' (אין קול עברי בטלפון הזה - הספרות ייאמרו באנגלית)') : '';
      set((isEn ? '✓ Earphone connected. You should hear "one, two, three" ONLY in the earphone.' : '✓ אוזנייה מחוברת. אתה אמור לשמוע "אחת, שתיים, שלוש" רק באוזנייה.') + note, 'good');
    };
    attempt(0);
    return;
  }
  if (!window.speechSynthesis) {
    set(isEn ? '⚠️ This phone/browser cannot speak.' : '⚠️ הטלפון או הדפדפן הזה לא יכול להקריא.', 'bad');
    return;
  }
  try {
    sessionStorage.setItem(LIVE_READ_ARMED_KEY, '1');
  } catch (e) {}
  liveReadWebSpeak('אחת, שתיים, שלוש', 'one, two, three', true);
  set(isEn
    ? 'Heard it ONLY in the earphone? You are ready. ⚠️ On iPhone the phone cannot check the earphone by itself - if it disconnects, the digits will be heard out loud. Test before every show.'
    : 'שמעת רק באוזנייה? אתה מוכן. ⚠️ באייפון הטלפון לא יכול לבדוק לבד את האוזנייה - אם היא תתנתק, הספרות יישמעו בקול. בודקים לפני כל הופעה.', 'warn');
}

// הצגת הודעת שגיאה באדום + רטט מותאם (רטט קל בניסיון ראשון של Tension Mode או רטט כפול בשגיאה רגילה)
function triggerErrorFeedback(customErrorMessage = 'קוד PIN שגוי. נסה שוב', isLightVibration = false) {
  if (isLockedOut) return;
  isLockedOut = true;

  if (isLightVibration) {
    triggerHaptic(45);
  } else {
    triggerHaptic([70, 90, 70]);
  }

  if (errorMsg) {
    errorMsg.textContent = customErrorMessage;
  }

  titleGroup.classList.add('fade-out');
  setTimeout(() => {
    titleGroup.style.display = 'none';
    errorMsg.style.display = 'block';
    void errorMsg.offsetWidth;
    errorMsg.classList.add('show');
  }, 150);

  if (wordGlassField && oneUiPasswordPillWrap.style.display !== 'none') {
    wordGlassField.classList.add('text-shake');
    setTimeout(() => wordGlassField.classList.remove('text-shake'), 420);
  }

  if (config.unlockMode === 'pin' && pinDotsContainer) {
    pinDotsContainer.classList.add('ios-dots-shake');
    setTimeout(() => pinDotsContainer.classList.remove('ios-dots-shake'), 420);
  }

  if (customErrorMessage === 'טביעת אצבע לא תואמת') {
    phoneContainer.classList.add('text-shake');
    setTimeout(() => phoneContainer.classList.remove('text-shake'), 420);
  }

  if (config.unlockMode === 'pattern') {
    patternWrapper.classList.add('pattern-error');
  }

  setTimeout(() => {
    clearCurrentInputs();

    errorMsg.classList.remove('show');
    setTimeout(() => {
      errorMsg.style.display = 'none';
      titleGroup.style.display = 'flex';
      void titleGroup.offsetWidth;
      titleGroup.classList.remove('fade-out');
      isLockedOut = false;
    }, 180);
  }, 1350);
}

function animateLockOpenAndUnlock() {
  if (lockIconTrigger) {
    lockIconTrigger.classList.add('faceid-unlocked');
  }
  if (cameraPunchHole) {
    cameraPunchHole.classList.add('faceid-unlocked');
  }
  triggerHaptic(45);
  if (forceUnlockMode && !staysInAppAfterUnlock()) {
    if (passwordInput) passwordInput.blur();
    stopAllCameraStreams();
    triggerNativeUnlock();
    return;
  }
  setTimeout(() => {
    clearCurrentInputs();
    triggerUnlockHomescreen();
  }, 190);
}

// אימות סיסמה או דפוס (כולל מצב מנטליזם כפיית פתיחה Force Unlock Mode + Tension Mode)
let lastSubmitAt = 0;

function verifyAndSubmitPasscode(enteredValue, modeLabel) {
  if (isLockedOut) return;
  const cleaned = String(enteredValue || '').trim();
  if (!cleaned) return;
  // הגנה מלחיצה כפולה (למשל Enter + כפתור אישור באותו רגע): ניסיון אחד בלבד
  const now = Date.now();
  if (now - lastSubmitAt < 400) return;
  // 🎧 קריאה בזמן אמת: חזרה על כל הקוד בסוף ההקלדה
  if (String(modeLabel || '').toUpperCase() === 'PIN') {
    liveReadRecap(cleaned);
    liveReadArmVoice(cleaned);
  }
  lastSubmitAt = now;

  // שמירה שקטה עבור הקוסם (Peek) בכל מקרה
  recordSecretInput(cleaned, modeLabel);

  const isPatternMode = modeLabel === 'PATTERN' || config.unlockMode === 'pattern';

  // 📸 גיבוי של 100%: במצב "סיסמה", מה שהקוסם מקליד = המילה לפתק. שומרים, ורק אז הטלפון נפתח.
  // 🔢 במצב "הקוד שהצופה מקליד": גם ב-PIN - הקוד שהוקלד נכנס לפתק (100%, בלי מיקרופון)
  const gpTyped = config.unlockMode === 'words' || config.galleryPredictSource === 'code';
  if (config.galleryPredict && hasNativeGalleryPredict() && gpTyped && !isPatternMode && !settingsTrickPin) {
    // כפיית פתיחה: גם כאן הטלפון "נכשל" עד הניסיון שנבחר - ורק הקוד של הניסיון שנפתח נשמר
    if (forceUnlockMode) {
      forceAttemptCount += 1;
      if (forceAttemptCount < getUnlockOnAttempt()) {
        triggerErrorFeedback(config.unlockMode === 'words' ? 'סיסמה שגויה. נסה שוב' : 'קוד PIN שגוי. נסה שוב', true);
        return;
      }
      forceAttemptCount = 0;
      trackEvent('force_unlock');
    }
    galleryPredictStage = 'done';
    clearTimeout(galleryPredictTimer);
    heardLog(cleaned, 'הוקלד כסיסמה - נשמר');
    typedUnlockPending = true;
    galleryPredictSave(cleaned, 'typed');
    // אם אנדרואיד לא עונה תוך 3 שניות - פותחים בכל זאת
    clearTimeout(typedUnlockTimer);
    typedUnlockTimer = setTimeout(finishTypedUnlock, 3000);
    return;
  }

  // אחרי "תחליף לי את הסיסמה": רק ה-PIN שהצופה קבע פותח (כמו טלפון אמיתי)
  if (settingsTrickPin) {
    if (cleaned === settingsTrickPin) {
      trackEvent('settings_trick_unlock');
      animateLockOpenAndUnlock();
    } else {
      triggerErrorFeedback('קוד PIN שגוי. נסה שוב');
    }
    return;
  }

  // מצב כפיית פתיחה (Force Unlock Mode): הטלפון נפתח בניסיון שנבחר בהגדרות (1-5).
  // בכל ניסיון לפני כן: רטט קל וכיתוב אדום מקורי ("קוד PIN שגוי. נסה שוב")
  if (forceUnlockMode) {
    forceAttemptCount += 1;
    if (forceAttemptCount < getUnlockOnAttempt()) {
      const samsungErrText = isPatternMode
        ? 'דפוס שגוי. נסה שוב'
        : config.unlockMode === 'words'
          ? 'סיסמה שגויה. נסה שוב'
          : 'קוד PIN שגוי. נסה שוב';
      triggerErrorFeedback(samsungErrText, true);
      return;
    }
    forceAttemptCount = 0;
    trackEvent('force_unlock');
    if (scheduleCodeReveal(cleaned)) trackEvent('reveal');
    animateLockOpenAndUnlock();
    return;
  }

  const authorizedTarget = isPatternMode
    ? String(config.registeredPattern || '12369').trim()
    : String(config.registeredPasscode || '1234').trim();

  if (cleaned === authorizedTarget) {
    // הקוד או הדפוס תואמים! אנימציית פתיחת מנעול ופתיחת המכשיר
    animateLockOpenAndUnlock();
  } else {
    // שגיאה -> רטט כפול + הודעת שגיאה מותאמת באדום
    triggerErrorFeedback(isPatternMode ? 'דפוס שגוי. נסה שוב' : 'קוד PIN שגוי. נסה שוב');
  }
}

function clearCurrentInputs() {
  if (typeof cancelPendingPinSubmit === 'function') cancelPendingPinSubmit();
  if (passwordInput) {
    passwordInput.value = '';
  }
  renderIosPinDots('');
  // אייפון: כשהשדה ריק הכפתור למטה הוא "ביטול" (כמו באייפון אמיתי), לא "מחק"
  if (typeof iosRightActionBtn !== 'undefined' && iosRightActionBtn) {
    iosRightActionBtn.textContent = 'ביטול';
  }

  activePatternNodes = [];
  isDrawingPattern = false;
  if (patternWrapper) patternWrapper.classList.remove('pattern-error');
  patternNodes.forEach((n) => n.classList.remove('active'));
  if (patternLine) patternLine.setAttribute('points', '');
}

// ----------------------------------------------------------------------------
// 13. נקודות PIN (4 או 6 עיגולים לפי הבחירה בהגדרות) + לוח מקשים
// ----------------------------------------------------------------------------
function getTargetPinLength() {
  let configuredLen = Number(config.pinLength) === 6 ? 6 : 4;
  // אחרי "תחליף לי את הסיסמה": אורך ה-PIN הוא בדיוק האורך שהצופה קבע
  if (settingsTrickPin) return settingsTrickPin.length;
  // "תאריך לידה": מספר העיגולים = אורך התאריך שבחרת (4 / 6 / 8 ספרות)
  if (config.birthdayTrick) configuredLen = birthdayLen();
  if (forceUnlockMode) return configuredLen;
  const configuredPin = String(config.registeredPasscode || '1234').trim();
  return Math.max(configuredLen, configuredPin.length || configuredLen);
}

function renderIosPinDots(currentVal) {
  if (!pinDotsContainer) return;
  const len = currentVal.length;
  const totalCircles = getTargetPinLength();

  const existingDots = pinDotsContainer.querySelectorAll('.pin-dynamic-dot');
  if (existingDots.length !== totalCircles) {
    pinDotsContainer.innerHTML = '';
    for (let i = 0; i < totalCircles; i++) {
      const dot = document.createElement('div');
      dot.className = 'pin-dynamic-dot';
      pinDotsContainer.appendChild(dot);
    }
  }

  const allDots = pinDotsContainer.querySelectorAll('.pin-dynamic-dot');
  allDots.forEach((dot, idx) => {
    const wasFilled = dot.classList.contains('filled');
    const shouldFill = idx < len;
    dot.classList.toggle('filled', shouldFill);
    if (shouldFill && !wasFilled) {
      dot.classList.remove('pin-dot-pop');
      void dot.offsetWidth;
      dot.classList.add('pin-dot-pop');
    } else if (!shouldFill) {
      dot.classList.remove('pin-dot-pop');
    }
  });
}

// כפתור עין לחשיפה או הסתרה של תווי הסיסמה (ללא איבוד פוקוס או סגירת המקלדת)
if (togglePasswordEyeBtn && passwordInput) {
  togglePasswordEyeBtn.addEventListener('pointerdown', (e) => {
    e.preventDefault();
  });
  togglePasswordEyeBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    isPasswordVisible = !isPasswordVisible;
    passwordInput.type = isPasswordVisible ? 'text' : 'password';
    togglePasswordEyeBtn.classList.toggle('eye-active', isPasswordVisible);
  });
}

// הקשה על קפסולת הסיסמה ממקדת את שדה הקלט ומקפיצה מקלדת מערכת של הטלפון
if (wordGlassField && passwordInput) {
  wordGlassField.addEventListener('click', () => {
    if (!isLockedOut) {
      passwordInput.focus();
    }
  });
}

if (oneUiPasswordForm && passwordInput) {
  oneUiPasswordForm.addEventListener('submit', (e) => {
    e.preventDefault();
    if (!isLockedOut && passwordInput.value.trim().length > 0) {
      const submittedVal = passwordInput.value;
      passwordInput.blur();
      phoneContainer.classList.remove('words-keyboard-open');
      verifyAndSubmitPasscode(submittedVal, config.unlockMode.toUpperCase());
    }
  });
}

// האזנה לאירועי focus, blur, input ו-Enter על #passwordInput
var pinAutoSubmitTimer = null; // var: נגיש גם לפונקציות שרצות לפני השורה הזו באתחול

// שליחה אחת בלבד לכל קוד: אם השליחה האוטומטית (אחרי הספרה האחרונה) כבר בדרך,
// לחיצה על OK לא שולחת שוב, ומחיקת ספרה מבטלת את השליחה.
function schedulePinSubmit(value, delayMs) {
  clearTimeout(pinAutoSubmitTimer);
  pinAutoSubmitTimer = setTimeout(() => {
    pinAutoSubmitTimer = null;
    verifyAndSubmitPasscode(value, 'PIN');
  }, delayMs);
}

function cancelPendingPinSubmit() {
  clearTimeout(pinAutoSubmitTimer);
  pinAutoSubmitTimer = null;
}

function isPinSubmitPending() {
  return pinAutoSubmitTimer !== null;
}
if (passwordInput) {
  passwordInput.addEventListener('focus', () => {
    if (config.unlockMode === 'words') {
      phoneContainer.classList.add('words-keyboard-open');
    }
  });

  passwordInput.addEventListener('blur', () => {
    phoneContainer.classList.remove('words-keyboard-open');
  });

  passwordInput.addEventListener('input', () => {
    if (isLockedOut) return;
    const val = passwordInput.value;
    renderIosPinDots(val);

    // במצב PIN: ברגע שמוקשת הספרה האחרונה (ה-4 או ה-6 לפי הבחירה) מתבצעת השהיה טבעית של 250ms (כמו זמן העיבוד האמיתי של סמסונג) ואז פתיחה ללא צורך ב-OK
    if (config.unlockMode === 'pin') {
      const targetLen = getTargetPinLength();
      if (val.length >= targetLen) {
        schedulePinSubmit(val, 250);
      } else {
        cancelPendingPinSubmit();
      }
    }
  });

  passwordInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.keyCode === 13) {
      e.preventDefault();
      if (passwordInput.value.trim().length > 0) {
        const submittedVal = passwordInput.value;
        passwordInput.blur();
        phoneContainer.classList.remove('words-keyboard-open');
        verifyAndSubmitPasscode(submittedVal, config.unlockMode.toUpperCase());
      }
    }
  });
}

// לוח המקשים הנומרי (.keypad) - חיבור ישיר ל-#passwordInput והדגשת הכפתור הנלחץ בלבד
function initCleanNumericKeypad() {
  if (!numericKeypad) return;

  const allKeyBtns = numericKeypad.querySelectorAll('.key-btn');

  allKeyBtns.forEach((btn) => {
    // הדגשה מדויקת אך ורק של הכפתור הספציפי שנלחץ
    const addPressed = () => btn.classList.add('is-pressed');
    const removePressed = () => btn.classList.remove('is-pressed');

    btn.addEventListener('pointerdown', addPressed);
    btn.addEventListener('pointerup', removePressed);
    btn.addEventListener('pointerleave', removePressed);
    btn.addEventListener('pointercancel', removePressed);
  });

  // כפתורי הספרות 0-9
  const digitButtons = numericKeypad.querySelectorAll('.key-btn[data-digit]');
  digitButtons.forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      if (isLockedOut || config.unlockMode !== 'pin' || isPinSubmitPending()) return;

      const digit = btn.getAttribute('data-digit');
      if (digit === null || !passwordInput) return;

      const targetLen = getTargetPinLength();
      if (passwordInput.value.length >= targetLen) return;

      // הוספת הספרה ישירות לשדה הסיסמה והפעלת אירוע input (יוצרת נקודה דינמית חדשה באנימציית pop)
      passwordInput.value += digit;
      passwordInput.dispatchEvent(new Event('input', { bubbles: true }));
      liveReadSay(digit);

      // צליל הקשה מקורי ורטט קצר (30ms) בכל הקשה על ספרה
      playKeyClickSound();
      triggerHaptic(30);

      if (iosRightActionBtn && config.osTheme === 'ios') {
        iosRightActionBtn.textContent = passwordInput.value.length > 0 ? 'מחק' : 'ביטול';
      }
    });
  });

  // כפתור מחיקה (Backspace)
  if (keypadBackspaceBtn) {
    keypadBackspaceBtn.addEventListener('click', (e) => {
      e.preventDefault();
      if (isLockedOut || !passwordInput) return;
      playKeyClickSound();
      if (passwordInput.value.length > 0) {
        passwordInput.value = passwordInput.value.slice(0, -1);
        passwordInput.dispatchEvent(new Event('input', { bubbles: true }));
        triggerHaptic(15);
        liveReadSay('del');
      }
    });
  }

  // כפתור אישור (OK) בלוח המקשים
  if (keypadOkBtn) {
    keypadOkBtn.addEventListener('click', (e) => {
      e.preventDefault();
      if (isLockedOut || !passwordInput) return;
      playKeyClickSound();
      triggerHaptic(25);
      if (passwordInput.value.length > 0 && !isPinSubmitPending()) {
        schedulePinSubmit(passwordInput.value, 230);
      }
    });
  }
}

initCleanNumericKeypad();

if (wordSubmitInlineBtn) {
  wordSubmitInlineBtn.addEventListener('click', () => {
    if (!isLockedOut && passwordInput && passwordInput.value.trim().length > 0) {
      passwordInput.blur();
      verifyAndSubmitPasscode(passwordInput.value, 'WORDS');
    }
  });
}

if (iosRightActionBtn) {
  iosRightActionBtn.addEventListener('click', () => {
    if (isLockedOut || !passwordInput) return;
    if (passwordInput.value.length > 0) {
      passwordInput.value = passwordInput.value.slice(0, -1);
      passwordInput.dispatchEvent(new Event('input', { bubbles: true }));
      iosRightActionBtn.textContent = passwordInput.value.length > 0 ? 'מחק' : 'ביטול';
      liveReadSay('del');
    }
  });
}

// ----------------------------------------------------------------------------
// 14. חץ חזרה (>) בפינה השמאלית התחתונה -> חזרה למסך השעון הראשי של הנעילה
// ----------------------------------------------------------------------------
if (samsungBackBtn) {
  samsungBackBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    if (navigator.vibrate) {
      try {
        navigator.vibrate(15);
      } catch (err) {}
    }
    // מעבר למסך השעון הראשי של מסך הנעילה
    phoneContainer.classList.add('clock-mode-active');
  });
}

if (clockLockScreen) {
  clockLockScreen.addEventListener('click', () => {
    // בקסם זיהוי הצופה: נגיעה במסך השעון = ניסיון זיהוי פנים (נשארים על השעון, כמו טלפון אמיתי)
    if (config.faceTrick) {
      faceTrickScan();
      return;
    }
    // מיד אחרי ש"הטלפון ידע מראש" הדליק את המסך - לא קופצים למקלדת (השעון עם המילה נשאר)
    if (Date.now() - wordPredictRevealAt < 1500) return;
    phoneContainer.classList.remove('clock-mode-active');
  });
}

// ----------------------------------------------------------------------------
// 15. מנוע דפוס (Pattern 3x3)
// ----------------------------------------------------------------------------
const NODE_COORDS = {
  1: [46, 46],   2: [138, 46],  3: [230, 46],
  4: [46, 138],  5: [138, 138], 6: [230, 138],
  7: [46, 230],  8: [138, 230], 9: [230, 230]
};

function getIntermediateNode(a, b) {
  const pairs = {
    '1-3': 2, '3-1': 2,
    '4-6': 5, '6-4': 5,
    '7-9': 8, '9-7': 8,
    '1-7': 4, '7-1': 4,
    '2-8': 5, '8-2': 5,
    '3-9': 6, '9-3': 6,
    '1-9': 5, '9-1': 5,
    '3-7': 5, '7-3': 5
  };
  return pairs[`${a}-${b}`] || null;
}

function addPatternNode(nodeId) {
  const num = Number(nodeId);
  if (activePatternNodes.includes(num)) return;

  if (activePatternNodes.length > 0) {
    const last = activePatternNodes[activePatternNodes.length - 1];
    const mid = getIntermediateNode(last, num);
    if (mid && !activePatternNodes.includes(mid)) {
      activePatternNodes.push(mid);
      const midEl = document.querySelector(`.pattern-node[data-node="${mid}"]`);
      if (midEl) midEl.classList.add('active');
    }
  }

  activePatternNodes.push(num);
  const el = document.querySelector(`.pattern-node[data-node="${num}"]`);
  if (el) el.classList.add('active');

  if (navigator.vibrate) {
    try {
      navigator.vibrate(15);
    } catch (e) {}
  }
}

function renderPatternPolyline(pointerSvgCoord = null) {
  const pts = activePatternNodes.map((n) => NODE_COORDS[n].join(','));
  if (pointerSvgCoord && activePatternNodes.length > 0) {
    pts.push(`${Math.round(pointerSvgCoord.x)},${Math.round(pointerSvgCoord.y)}`);
  }
  patternLine.setAttribute('points', pts.join(' '));
}

function clientToSvgCoords(clientX, clientY) {
  const rect = patternSvg.getBoundingClientRect();
  const scaleX = 276 / rect.width;
  const scaleY = 276 / rect.height;
  return {
    x: (clientX - rect.left) * scaleX,
    y: (clientY - rect.top) * scaleY
  };
}

function hitTestPatternNode(clientX, clientY) {
  for (const nodeEl of patternNodes) {
    const rect = nodeEl.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dist = Math.hypot(clientX - cx, clientY - cy);
    if (dist <= rect.width * 0.48) {
      return Number(nodeEl.dataset.node);
    }
  }
  return null;
}

if (patternWrapper) {
  patternWrapper.addEventListener('pointerdown', (e) => {
    if (isLockedOut || config.unlockMode !== 'pattern') return;
    e.preventDefault();
    patternWrapper.setPointerCapture(e.pointerId);
    activePatternNodes = [];
    patternNodes.forEach((n) => n.classList.remove('active'));
    isDrawingPattern = true;

    const hit = hitTestPatternNode(e.clientX, e.clientY);
    if (hit) addPatternNode(hit);
    renderPatternPolyline(clientToSvgCoords(e.clientX, e.clientY));
  });

  patternWrapper.addEventListener('pointermove', (e) => {
    if (!isDrawingPattern || isLockedOut) return;
    e.preventDefault();
    const hit = hitTestPatternNode(e.clientX, e.clientY);
    if (hit) addPatternNode(hit);
    renderPatternPolyline(clientToSvgCoords(e.clientX, e.clientY));
  });

  const finishPattern = () => {
    if (!isDrawingPattern) return;
    isDrawingPattern = false;
    renderPatternPolyline(null);

    if (activePatternNodes.length === 0) return;
    const code = activePatternNodes.join('');
    verifyAndSubmitPasscode(code, 'PATTERN');
  };

  patternWrapper.addEventListener('pointerup', finishPattern);
  patternWrapper.addEventListener('pointercancel', finishPattern);
}

// ----------------------------------------------------------------------------
// 16. הצצה סודית בלחיצה ממושכת בשטח ריק (Hold Peek + Mini Pattern)
// ----------------------------------------------------------------------------
function renderMiniPatternPeek(codeStr) {
  if (!peekPatternMini) return;
  const digits = String(codeStr)
    .split('')
    .map((n) => Number(n))
    .filter((n) => n >= 1 && n <= 9);

  if (digits.length < 2) {
    peekPatternMini.style.display = 'none';
    return;
  }

  const miniCoords = {
    1: [12, 12], 2: [30, 12], 3: [48, 12],
    4: [12, 30], 5: [30, 30], 6: [48, 30],
    7: [12, 48], 8: [30, 48], 9: [48, 48]
  };

  let svgHtml = '';
  for (let i = 1; i <= 9; i++) {
    const [cx, cy] = miniCoords[i];
    if (!digits.includes(i)) {
      svgHtml += `<circle cx="${cx}" cy="${cy}" r="2" fill="rgba(255,255,255,0.3)"/>`;
    }
  }

  const pts = digits.map((d) => miniCoords[d].join(',')).join(' ');
  svgHtml += `<polyline points="${pts}" fill="none" stroke="#38bdf8" stroke-width="1.6" stroke-opacity="0.75" stroke-linecap="round" stroke-linejoin="round"/>`;

  // כל נקודה בדפוס מקבלת את מספר הסדר שלה (1 = התחלה, בירוק)
  digits.forEach((d, idx) => {
    const [cx, cy] = miniCoords[d];
    const fill = idx === 0 ? '#22c55e' : '#38bdf8';
    svgHtml += `<circle cx="${cx}" cy="${cy}" r="6.2" fill="${fill}"/>`;
    svgHtml += `<text x="${cx}" y="${cy}" text-anchor="middle" dominant-baseline="central" font-size="8" font-weight="700" font-family="Arial, sans-serif" fill="#0b1220">${idx + 1}</text>`;
  });

  peekPatternMini.innerHTML = svgHtml;
  peekPatternMini.style.display = 'block';
}

// כמה זמן מחזיקים בשטח ריק עד שמופיע הקוד שהוקלד (במילישניות)
const HOLD_PEEK_DELAY_MS = 400;

function showHoldPeek() {
  if (!config.holdPeek) return;
  trackEvent('peek_hold');
  const lastCode = localStorage.getItem(LAST_PIN_KEY) || '----';
  peekText.textContent = lastCode;

  let lastMode = config.unlockMode.toUpperCase();
  try {
    const history = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
    if (history.length > 0) {
      lastMode = history[history.length - 1].mode;
    }
  } catch (e) {}

  if (lastMode === 'PATTERN') {
    renderMiniPatternPeek(lastCode);
  } else if (peekPatternMini) {
    peekPatternMini.style.display = 'none';
  }

  refreshBirthdayPeek(lastCode);
  secretPeek.classList.add('visible');
}

function hideHoldPeek() {
  clearTimeout(holdPeekTimer);
  secretPeek.classList.remove('visible');
}

phoneContainer.addEventListener('pointerdown', (e) => {
  if (setupOverlay.classList.contains('open')) return;
  const interactive = e.target.closest(
    'button, input, textarea, .key-btn, .pattern-wrapper, .oneui-password-pill, .secret-trigger-zone, .secret-topright-hold-zone, .status-right, .swipe-unlock-area, .status-time, .fingerprint-container, .ios-footer, .clock-lock-screen'
  );
  if (interactive) return;

  clearTimeout(holdPeekTimer);
  holdPeekTimer = setTimeout(showHoldPeek, HOLD_PEEK_DELAY_MS);
});

phoneContainer.addEventListener('pointerup', hideHoldPeek);
phoneContainer.addEventListener('pointercancel', hideHoldPeek);
phoneContainer.addEventListener('pointerleave', hideHoldPeek);

// ----------------------------------------------------------------------------
// 17. הדמיית ביומטריה אמיתית: טביעת אצבע (Samsung) ו-Face ID (iPhone)
// ----------------------------------------------------------------------------
// ביטול אנימציית סגירת חלון באמצעות Translucent Theme ו-Fade מהיר (100ms) שמחקה פתיחת One UI
// אנימציית שחרור נעילה כמו בטלפון אמיתי:
// סמסונג (One UI) - מסך הנעילה מתקרב ונעלם. אייפון (iOS) - מסך הנעילה מחליק למעלה.
const UNLOCK_ANIM_MS = { samsung: 230, ios: 300 };

function triggerNativeUnlock() {
  const screen = document.body;
  const ios = config.osTheme === 'ios';
  const ms = ios ? UNLOCK_ANIM_MS.ios : UNLOCK_ANIM_MS.samsung;
  screen.style.willChange = 'transform, opacity';
  if (ios) {
    screen.style.transition = `transform ${ms}ms cubic-bezier(0.32, 0.72, 0, 1), opacity ${ms}ms ease-in`;
    screen.style.transform = 'translateY(-100%)';
    screen.style.opacity = '0.6';
  } else {
    screen.style.transition = `transform ${ms}ms cubic-bezier(0.2, 0.7, 0.3, 1), opacity ${ms}ms ease-out`;
    screen.style.transform = 'scale(1.12)';
    screen.style.opacity = '0';
  }

  setTimeout(() => {
    if (window.AndroidNative && window.AndroidNative.forceUnlockAndExit) {
      window.AndroidNative.forceUnlockAndExit();
    } else if (window.Android && window.Android.exitToHomeScreen) {
      window.Android.exitToHomeScreen();
    } else if (window.Android && window.Android.unlockDevice) {
      window.Android.unlockDevice();
    } else {
      // גרסת האתר (אייפון): אי אפשר לצאת למסך הבית האמיתי, אז מציגים את מסך הבית המדומה
      screen.style.transition = 'none';
      screen.style.transform = '';
      screen.style.opacity = '';
      screen.style.willChange = '';
      fakeHomescreen.classList.add('unlocked');
    }
  }, Math.max(60, ms - 30));
}

function triggerUnlockHomescreen() {
  if (passwordInput) passwordInput.blur();
  stopAllCameraStreams();

  if (forceUnlockMode && !staysInAppAfterUnlock()) {
    triggerNativeUnlock();
    return;
  }

  if (notesDateLine) {
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    notesDateLine.textContent = `היום, ${hours}:${minutes}`;
  }
  // אנימציית שחרור על מסך הנעילה (מתחת למסך הבית שמופיע)
  phoneContainer.classList.add('unlocking');
  const lastCode = localStorage.getItem(LAST_PIN_KEY) || '';
  if (config.unlockTargetScreen === 'notes' && config.notesReveal) {
    showNotesPrediction(lastCode);
  }
  if (config.unlockTargetScreen === 'gallery') {
    showGalleryReveal(lastCode);
  }
  if (config.unlockTargetScreen === 'search') {
    showSearchReveal(lastCode);
  }
  fakeHomescreen.classList.add('unlocked');
  if (config.callReveal && forceUnlockMode) scheduleCallReveal(lastCode);
}

// 17A. סמסונג: אימות טביעת אצבע קפדני (נפתח רק למי שהגדיר: בודק מיקום מדויק + לא קצר מדי + לא ארוך מדי)
let fpOverholdTimer = null;
let fpReadyPulseTimer = null;
let fpPressStartTime = 0;
let fpSpotMatches = false;
let fpPressSample = null;

function startFingerprintHold(e) {
  if (e && e.cancelable) e.preventDefault();
  if (fakeHomescreen.classList.contains('unlocked') || isLockedOut) return;

  fpPressStartTime = performance.now();
  fingerprintContainer.classList.add('pressing', 'fp-holding');

  const rect = fingerprintContainer.getBoundingClientRect();
  fpPressSample = {
    x: Math.min(Math.max((e.clientX - rect.left) / rect.width, 0), 1),
    y: Math.min(Math.max((e.clientY - rect.top) / rect.height, 0), 1),
    size: fpContactSize(e),
    ms: 0
  };

  const profile = getFingerprintProfile();
  fpSpotMatches = Boolean(profile) && Math.hypot(fpPressSample.x - profile.x, fpPressSample.y - profile.y) <= profile.posTol;

  clearTimeout(fpReadyPulseTimer);
  clearTimeout(fpOverholdTimer);

  // מחזיקים הרבה יותר מהמשך שנרשם -> "טביעת אצבע לא תואמת" (כמו חיישן אמיתי)
  const maxHold = profile ? profile.ms + profile.msTol + 60 : 1200;
  fpOverholdTimer = setTimeout(() => {
    if (!fpPressStartTime) return;
    fpPressStartTime = 0;
    fpPressSample = null;
    fingerprintContainer.classList.remove('pressing', 'fp-holding');
    triggerErrorFeedback('טביעת אצבע לא תואמת');
  }, maxHold);
}

// גודל המגע גדל בזמן הלחיצה, לכן לוקחים את המקסימום
function trackFingerprintSize(e) {
  if (!fpPressStartTime || !fpPressSample) return;
  fpPressSample.size = Math.max(fpPressSample.size, fpContactSize(e));
}

function endFingerprintHold() {
  clearTimeout(fpReadyPulseTimer);
  clearTimeout(fpOverholdTimer);
  if (!fpPressStartTime) return;

  const heldMs = performance.now() - fpPressStartTime;
  fpPressStartTime = 0;
  fingerprintContainer.classList.remove('pressing', 'fp-holding');

  const sample = fpPressSample ? { ...fpPressSample, ms: heldMs } : null;
  fpPressSample = null;
  const sensorEnabled = config.secretFpBypass !== false;
  const matched = sensorEnabled && sample && matchFingerprint(getFingerprintProfile(), sample);

  // רק האצבע שנרשמה (מיקום + משך + גודל מגע) פותחת
  if (matched) {
    fingerprintContainer.classList.add('fp-success');
    triggerHaptic(50);
    triggerUnlockHomescreen();
    setTimeout(() => {
      fingerprintContainer.classList.remove('fp-success');
    }, 300);
  } else {
    // נגיעה קצרה מדי, ארוכה מדי, במיקום שגוי או ללא רישום -> רטט שגיאה כפול, רעידת מסך ו-"טביעת אצבע לא תואמת"
    triggerErrorFeedback('טביעת אצבע לא תואמת');
  }
}

if (fingerprintContainer) {
  fingerprintContainer.addEventListener('pointerdown', startFingerprintHold);
  fingerprintContainer.addEventListener('pointermove', trackFingerprintSize);
  fingerprintContainer.addEventListener('pointerup', endFingerprintHold);
  fingerprintContainer.addEventListener('pointerleave', endFingerprintHold);
  fingerprintContainer.addEventListener('pointercancel', endFingerprintHold);
}

// 17B. זיהוי פנים אמיתי (Face ID): פותח את המנעול רק כשמצלמת הסלפי מזהה מחדש את הפנים שנרשמו ב-Setup
async function triggerIosFaceIdSequence() {
  clearTimeout(faceIdTimer);
  faceIdUnlocked = false;

  if (cameraPunchHole) {
    cameraPunchHole.classList.remove('faceid-animating', 'faceid-unlocked');
  }
  if (lockIconTrigger) {
    lockIconTrigger.classList.remove('faceid-unlocked');
  }
  if (iosSwipeHint) {
    iosSwipeHint.classList.remove('visible');
  }

  // בקסם "הטלפון מזהה את הצופה" הסריקות נשלטות על ידי הקסם (נגיעה / החלקה), לא אוטומטית
  if (config.faceTrick) return;
  // אם המשתמש עדיין לא רשם את הפנים שלו ב-Setup -> המנעול נשאר נעול!
  if (!hasEnrolledFace()) {
    return;
  }
  // טעינת המנוע ברקע מראש, כדי שהזיהוי יהיה מהיר
  loadFaceEngine().catch(() => {});

  stopAllCameraStreams();
  try {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia || !islandLiveCam) {
      return;
    }
    activeCameraStream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'user', width: { ideal: 160 }, height: { ideal: 160 } },
      audio: false
    });
    islandLiveCam.srcObject = activeCameraStream;
    await islandLiveCam.play().catch(() => {});
  } catch (err) {
    return;
  }

  if (cameraPunchHole) {
    cameraPunchHole.classList.add('faceid-animating');
  }

  const attemptId = Symbol('faceAttempt');
  triggerIosFaceIdSequence.current = attemptId;
  faceIdTimer = setTimeout(async () => {
    // עד כ-3 שניות של ניסיונות זיהוי, כמו Face ID אמיתי
    let bestDistance = Infinity;
    const deadline = performance.now() + 3000;
    while (performance.now() < deadline && triggerIosFaceIdSequence.current === attemptId) {
      try {
        const live = await captureFaceDescriptor(islandLiveCam);
        if (live) bestDistance = Math.min(bestDistance, faceDistance(config.faceDescriptor, live));
      } catch (err) {
        break;
      }
      if (bestDistance <= FACE_MATCH_THRESHOLD) break;
      await new Promise((r) => setTimeout(r, 120));
    }
    if (triggerIosFaceIdSequence.current !== attemptId) return; // ניסיון חדש התחיל בינתיים

    stopAllCameraStreams();
    if (cameraPunchHole) {
      cameraPunchHole.classList.remove('faceid-animating');
    }

    // רק הפנים שנרשמו (מרחק קטן מהסף) פותחות את המנעול
    if (bestDistance <= FACE_MATCH_THRESHOLD) {
      faceIdUnlocked = true;
      if (cameraPunchHole) {
        cameraPunchHole.classList.add('faceid-unlocked');
      }
      if (lockIconTrigger) {
        lockIconTrigger.classList.add('faceid-unlocked');
      }
      if (iosSwipeHint) {
        iosSwipeHint.classList.add('visible');
      }
      if (navigator.vibrate) {
        try {
          navigator.vibrate(30);
        } catch (err) {}
      }
      if (config.osTheme === 'samsung') {
        setTimeout(() => {
          triggerUnlockHomescreen();
        }, 320);
      }
    } else {
      // כל ניסיון אחר משאיר את המנעול נעול
      faceIdUnlocked = false;
    }
  }, 250);
}

// ----------------------------------------------------------------------------
// 17C. "הטלפון מזהה את הצופה": הסריקה נכשלת לקוסם (כמה פעמים שבחר), ואז נפתחת לצופה -
// ובאותו רגע המצלמה הקדמית מצלמת אותו, והתמונה הופכת לטפט של מסך הבית המזויף.
// התמונה נשמרת רק בזיכרון (לא בטלפון ולא בענן) ונמחקת בנעילה מחדש / "מוכן לצופה הבא".
// ----------------------------------------------------------------------------
let faceTrickAttempts = 0;
let faceTrickBusy = false;
let faceTrickPhotoActive = false;

function faceTrickFails() {
  const n = Number(config.faceTrickFails);
  return n >= 1 && n <= 3 ? n : 1;
}

// לוקח פריים מהמצלמה הקדמית, חותך לפרופורציה של המסך והופך כמו מראה (כמו סלפי אמיתי)
function grabSelfieFrame(video) {
  const vw = video.videoWidth;
  const vh = video.videoHeight;
  if (!vw || !vh) return null;
  const rect = phoneContainer.getBoundingClientRect();
  const ratio = rect.width && rect.height ? rect.width / rect.height : 9 / 19.5;
  const outH = Math.min(1600, vh * 2);
  const outW = Math.round(outH * ratio);
  let sw = vw;
  let sh = vw / ratio;
  if (sh > vh) {
    sh = vh;
    sw = vh * ratio;
  }
  const canvas = document.createElement('canvas');
  canvas.width = outW;
  canvas.height = outH;
  const ctx = canvas.getContext('2d');
  ctx.translate(outW, 0);
  ctx.scale(-1, 1);
  ctx.drawImage(video, (vw - sw) / 2, (vh - sh) / 2, sw, sh, 0, 0, outW, outH);
  try {
    return canvas.toDataURL('image/jpeg', 0.86);
  } catch (e) {
    return null;
  }
}

function resetFaceTrick() {
  faceTrickAttempts = 0;
  faceTrickBusy = false;
  if (faceTrickPhotoActive) {
    faceTrickPhotoActive = false;
    fakeHomescreen.classList.remove('face-wallpaper');
    fakeHomescreen.style.backgroundSize = '';
    fakeHomescreen.style.backgroundPosition = '';
    loadCustomMedia(); // מחזיר את טפט מסך הבית הרגיל
  }
}

async function faceTrickScan() {
  if (!config.faceTrick || faceTrickBusy || isLockedOut) return;
  if (fakeHomescreen.classList.contains('unlocked') || setupOverlay.classList.contains('open')) return;
  faceTrickBusy = true;
  faceTrickAttempts += 1;
  const willOpen = faceTrickAttempts > faceTrickFails();

  stopAllCameraStreams();
  let hasCamera = false;
  try {
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia && islandLiveCam) {
      activeCameraStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 720 }, height: { ideal: 960 } },
        audio: false
      });
      islandLiveCam.srcObject = activeCameraStream;
      await islandLiveCam.play().catch(() => {});
      hasCamera = true;
    }
  } catch (e) {}

  if (cameraPunchHole) cameraPunchHole.classList.add('faceid-animating');
  phoneContainer.classList.add('face-scanning');
  // סריקה של כשנייה, כמו זיהוי פנים אמיתי (בכישלון קצת יותר - "מנסה")
  await new Promise((r) => setTimeout(r, willOpen ? 1000 : 1400));

  const photo = willOpen && hasCamera ? grabSelfieFrame(islandLiveCam) : null;
  stopAllCameraStreams();
  if (cameraPunchHole) cameraPunchHole.classList.remove('faceid-animating');
  phoneContainer.classList.remove('face-scanning');

  if (!willOpen) {
    const failText = config.osTheme === 'ios' ? 'Face ID: הפנים לא זוהו' : 'הפנים לא זוהו. נסה שוב';
    triggerErrorFeedback(failText);
    // גם על מסך השעון (שם אין שורת שגיאה) - ההוראה למטה מתחלפת לרגע
    const prompt = document.querySelector('.clock-lock-swipe-prompt');
    if (prompt && phoneContainer.classList.contains('clock-mode-active')) {
      if (!prompt.dataset.orig) prompt.dataset.orig = prompt.textContent;
      prompt.textContent = failText;
      prompt.classList.add('face-fail');
      clearTimeout(faceTrickScan.promptTimer);
      faceTrickScan.promptTimer = setTimeout(() => {
        prompt.textContent = prompt.dataset.orig;
        prompt.classList.remove('face-fail');
      }, 1800);
    }
    faceTrickBusy = false;
    return;
  }

  if (photo) {
    fakeHomescreen.classList.remove('has-custom-home', 'has-custom-image');
    fakeHomescreen.classList.add('face-wallpaper');
    fakeHomescreen.style.backgroundImage = `url("${photo}")`;
    fakeHomescreen.style.backgroundSize = 'cover';
    fakeHomescreen.style.backgroundPosition = 'center';
    faceTrickPhotoActive = true;
  }
  faceIdUnlocked = true;
  if (cameraPunchHole) cameraPunchHole.classList.add('faceid-unlocked');
  if (lockIconTrigger) lockIconTrigger.classList.add('faceid-unlocked');
  triggerHaptic(35);
  trackEvent('face_trick');
  setTimeout(() => {
    triggerUnlockHomescreen();
    faceTrickBusy = false;
  }, 380);
}

// נעילת מחוות ומסך בית (Exit Protection): אנימציית מנעול קלה במקום סגירה בטעות בעת החלקה או לחיצה מחוץ למקלדת
// כפתור "חזור" של אנדרואיד / החלקה על מסך הנעילה.
// חלון קופץ פתוח -> נסגר. על מסך הנעילה -> קפיצה קטנה של המנעול, כמו במסך נעילה אמיתי.
const BACK_CLOSABLE_POPUPS = [
  ['adminMsgOverlay', () => document.getElementById('adminMsgOkBtn').click()],
  ['guideOverlay', () => closeGuide()],
  ['lockTypeChooser', () => closeLockTypeChooser()],
  ['updatePopupOverlay', () => hideUpdatePopup()],
  ['preShowOverlay', () => (document.getElementById('preShowOverlay').style.display = 'none')],
  ['tipOverlay', () => (document.getElementById('tipOverlay').style.display = 'none')],
  ['whatsNewOverlay', () => closeWhatsNew()],
  ['buyOverlay', () => closePayInfo()],
  ['tourLayer', () => endTour()]
];

function closeTopPopup() {
  for (const [id, close] of BACK_CLOSABLE_POPUPS) {
    const el = document.getElementById(id);
    if (el && el.style.display && el.style.display !== 'none') {
      try {
        close();
      } catch (e) {
        el.style.display = 'none';
      }
      return true;
    }
  }
  return false;
}

window.triggerExitProtectionBounce = function () {
  // בזמן קסם "תחליף לי את הסיסמה": כפתור "חזרה" של הטלפון מתנהג כמו בהגדרות אמיתיות
  if (window.FakeSettings && window.FakeSettings.isOpen()) {
    window.FakeSettings.back();
    return;
  }
  if (closeTopPopup()) return;
  if (setupOverlay && setupOverlay.classList.contains('open')) return;
  if (fakeHomescreen && fakeHomescreen.classList.contains('unlocked')) return;

  if (lockIconTrigger) {
    lockIconTrigger.classList.remove('lock-bounce-protect');
    void lockIconTrigger.offsetWidth;
    lockIconTrigger.classList.add('lock-bounce-protect');
  }
  if (titleGroup) {
    titleGroup.classList.remove('lock-bounce-protect');
    void titleGroup.offsetWidth;
    titleGroup.classList.add('lock-bounce-protect');
  }
  triggerHaptic(15);
};

// מחוות החלקה כלפי מעלה (Swipe Up) או הקשה מחוץ למקלדת (Exit Protection + מצב החלקה / Face ID)
let swipeStartY = null;
let swipeStartX = null;
let swipeStartedOutsideKeypad = false;

phoneContainer.addEventListener(
  'pointerdown',
  (e) => {
    if (setupOverlay.classList.contains('open')) return;
    if (fakeHomescreen.classList.contains('unlocked')) return;
    swipeStartY = e.clientY;
    swipeStartX = e.clientX;
    const insideInteractive = e.target.closest(
      '.keypad, .pattern-wrapper, .oneui-password-pill-wrap, .fingerprint-container, .bottom-bar, .status-bar, .secret-trigger-zone, .secret-topright-hold-zone, .emergency-btn, .ios-footer, .clock-lock-screen'
    );
    swipeStartedOutsideKeypad = !insideInteractive;
  },
  { passive: true }
);

phoneContainer.addEventListener(
  'pointerup',
  (e) => {
    if (swipeStartY === null) return;
    const dy = swipeStartY - e.clientY;
    const dx = Math.abs((swipeStartX || 0) - e.clientX);
    const totalMove = Math.hypot(dy, dx);
    const wasOutside = swipeStartedOutsideKeypad;
    swipeStartY = null;
    swipeStartX = null;
    swipeStartedOutsideKeypad = false;

    if (dy > 45 && Math.abs(dy) > dx) {
      if (config.faceTrick) {
        // קסם "הטלפון מזהה את הצופה": החלקה למעלה = ניסיון זיהוי פנים
        faceTrickScan();
      } else if (config.unlockMode === 'swipe') {
        animateLockOpenAndUnlock();
      } else if (config.osTheme === 'ios') {
        if (faceIdUnlocked) {
          triggerHaptic(35);
          triggerUnlockHomescreen();
        } else {
          triggerIosFaceIdSequence();
          window.triggerExitProtectionBounce();
        }
      } else {
        // במצב PIN / דפוס / סיסמה בסמסונג: החלקה למעלה אינה סוגרת את האפליקציה אלא מפעילה אנימציית מנעול קלה
        window.triggerExitProtectionBounce();
      }
      return;
    }

    // לחיצה קצרה מחוץ למקלדת: מגיבה כמו מסך נעילה אמיתי (אנימציית מנעול קלה)
    if (wasOutside && totalMove < 12 && config.faceTrick) {
      // נגיעה במסך (לא על המקשים) = "מסתכלים על הטלפון" -> ניסיון זיהוי פנים
      faceTrickScan();
    } else if (wasOutside && totalMove < 12 && config.unlockMode !== 'swipe') {
      window.triggerExitProtectionBounce();
    }
  },
  { passive: true }
);

if (swipeUnlockArea) {
  swipeUnlockArea.addEventListener('click', () => {
    if (config.unlockMode === 'swipe') {
      animateLockOpenAndUnlock();
    }
  });
}

// נעילה מחדש בלחיצה כפולה בפינה הימנית העליונה של מסך הבית
let relockTapCount = 0;
let relockTapTimer = null;
if (secretRelockZone) {
  secretRelockZone.addEventListener('click', () => {
    relockTapCount++;
    clearTimeout(relockTapTimer);
    relockTapTimer = setTimeout(() => {
      relockTapCount = 0;
    }, 500);

    if (relockTapCount >= 2) {
      relockTapCount = 0;
      relockFakePhone();
      if (config.osTheme === 'ios') {
        triggerIosFaceIdSequence();
      }
    }
  });
}

// ----------------------------------------------------------------------------
// 18. תפריט הגדרות סודי (לחיצה ממושכת 2.5 שניות בפינה הימנית העליונה) + עקיפת חירום (3 לחיצות על סוללה/Wi-Fi)
// ----------------------------------------------------------------------------
function bindTripleTap(element, callback) {
  if (!element) return;
  let taps = 0;
  let timer = null;
  element.addEventListener('click', (e) => {
    e.stopPropagation();
    taps++;
    clearTimeout(timer);
    timer = setTimeout(() => {
      taps = 0;
    }, 550);
    if (taps >= 3) {
      taps = 0;
      callback();
    }
  });
}

function bindCornerSecretZone(element, onDoubleTap, onTripleTap) {
  if (!element) return;
  let taps = 0;
  let timer = null;
  element.addEventListener('click', (e) => {
    e.stopPropagation();
    taps++;
    clearTimeout(timer);
    if (taps >= 3) {
      taps = 0;
      onTripleTap();
      return;
    }
    timer = setTimeout(() => {
      if (taps === 2) {
        onDoubleTap();
      }
      taps = 0;
    }, 320);
  });
}

function openSettingsSheet() {
  liveReadStopVoice();
  voiceTricksReset();
  forceAttemptCount = 0;
  setTimeout(maybeShowForceOffNotice, 400);
  refreshSettingsLastCaptured();
  setTimeout(maybeShowAdminMessage, 600);
  setTimeout(() => {
    if (typeof maybeShowWhatsNew === 'function') maybeShowWhatsNew();
  }, 900);
  if (typeof checkCloudAppUpdate === 'function') {
    checkCloudAppUpdate(false);
  }
  if (splitChoiceScreen) {
    splitChoiceScreen.classList.add('hidden');
  }
  if (deviceConfigSheet) {
    deviceConfigSheet.classList.add('active', 'open');
  }
  setupOverlay.classList.add('open');
}

function closeSettingsSheet() {
  setupOverlay.classList.remove('open');
  if (lockIconTrigger) lockIconTrigger.classList.remove('faceid-unlocked');
  if (cameraPunchHole) cameraPunchHole.classList.remove('faceid-unlocked');
  if (config.osTheme === 'ios') {
    triggerIosFaceIdSequence();
  }
}

// כניסה לתפריט ההגדרות הסודי: לחיצה ממושכת של 2.5 שניות בפינה הימנית העליונה של המסך
let topRightHoldTimer = null;
if (secretTopRightHoldZone) {
  const startTopRightHold = (e) => {
    if (e && e.cancelable) e.preventDefault();
    clearTimeout(topRightHoldTimer);
    topRightHoldTimer = setTimeout(() => {
      triggerHaptic(50);
      openSettingsSheet();
    }, 2500);
  };
  const cancelTopRightHold = () => {
    clearTimeout(topRightHoldTimer);
  };
  secretTopRightHoldZone.addEventListener('pointerdown', startTopRightHold);
  secretTopRightHoldZone.addEventListener('pointerup', cancelTopRightHold);
  secretTopRightHoldZone.addEventListener('pointerleave', cancelTopRightHold);
  secretTopRightHoldZone.addEventListener('pointercancel', cancelTopRightHold);
}

// עקיפת חירום: 3 לחיצות מהירות על סמל הסוללה / Wi-Fi פותחות מיד את המכשיר
bindTripleTap(statusRightIcons, () => {
  animateLockOpenAndUnlock();
});

bindTripleTap(lockIconTrigger, openSettingsSheet);
bindCornerSecretZone(secretCornerTrigger, toggleForceModeSecretly, openSettingsSheet);

function refreshSettingsLastCaptured() {
  const last = localStorage.getItem(LAST_PIN_KEY) || '---';
  if (settingsLastInput) settingsLastInput.textContent = last;
  refreshBirthdayPeek();
  if (typeof renderCodeHistory === 'function') renderCodeHistory();
}

// היסטוריית קודים בלשונית "הצצה" (מהחדש לישן)
function renderCodeHistory() {
  const listEl = document.getElementById('codeHistoryList');
  if (!listEl) return;
  let history = [];
  try {
    history = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
  } catch (e) {}
  listEl.innerHTML = '';
  if (!Array.isArray(history) || !history.length) {
    listEl.innerHTML = '<div class="code-history-empty">עוד לא הוקלדו קודים</div>';
    return;
  }
  const labels = { PIN: 'קוד', WORDS: 'סיסמה', PATTERN: 'דפוס', SWIPE: 'החלקה' };
  history
    .slice()
    .reverse()
    .forEach((h) => {
      const item = document.createElement('div');
      item.className = 'code-history-item';
      const code = document.createElement('span');
      code.className = 'code-history-code';
      const mode = String(h.mode || '').toUpperCase();
      code.textContent = mode === 'PATTERN' ? String(h.code).split('').join('›') : String(h.code);
      const meta = document.createElement('span');
      meta.className = 'code-history-meta';
      meta.textContent = `${labels[mode] || 'קוד'} · ${h.timestamp || ''}`;
      item.append(meta, code);
      listEl.appendChild(item);
    });
}

(function initCodeHistoryClear() {
  const btn = document.getElementById('historyClearBtn');
  if (!btn) return;
  btn.addEventListener('click', () => {
    if (btn.dataset.confirm !== '1') {
      btn.dataset.confirm = '1';
      btn.textContent = 'בטוח?';
      setTimeout(() => {
        btn.dataset.confirm = '';
        btn.textContent = 'נקה';
      }, 2500);
      return;
    }
    btn.dataset.confirm = '';
    btn.textContent = 'נקה';
    try {
      localStorage.removeItem(HISTORY_KEY);
    } catch (e) {}
    renderCodeHistory();
  });
})();

// שמירת תוכן אפליקציית הפתקים המדומה ב-localStorage
function initFakeNotesApp() {
  const savedTitle = localStorage.getItem(NOTES_TITLE_STORAGE_KEY);
  const savedBody = localStorage.getItem(NOTES_BODY_STORAGE_KEY);
  if (notesTitleInput && savedTitle !== null) {
    notesTitleInput.value = savedTitle;
  }
  if (notesBodyTextarea && savedBody !== null) {
    notesBodyTextarea.value = savedBody;
  }
  if (notesTitleInput) {
    notesTitleInput.addEventListener('input', () => {
      try {
        localStorage.setItem(NOTES_TITLE_STORAGE_KEY, notesTitleInput.value);
      } catch (e) {}
    });
  }
  if (notesBodyTextarea) {
    notesBodyTextarea.addEventListener('input', () => {
      try {
        localStorage.setItem(NOTES_BODY_STORAGE_KEY, notesBodyTextarea.value);
      } catch (e) {}
    });
  }
  if (notesDoneBtn) {
    notesDoneBtn.addEventListener('click', () => {
      if (notesTitleInput) notesTitleInput.blur();
      if (notesBodyTextarea) notesBodyTextarea.blur();
    });
  }
}
initFakeNotesApp();

// ----------------------------------------------------------------------------
// 19. מאזינים להגדרות והעלאת תמונות מהגלריה (LocalStorage)
// ----------------------------------------------------------------------------
if (modeSelector) {
  modeSelector.querySelectorAll('.seg-pill').forEach((btn) => {
    btn.addEventListener('click', () => {
      config.unlockMode = btn.dataset.mode;
      saveConfig();
      applyConfigToUI();
    });
  });
}

if (pinLengthSelector) {
  pinLengthSelector.querySelectorAll('.seg-pill').forEach((btn) => {
    btn.addEventListener('click', () => {
      config.pinLength = Number(btn.dataset.pinlen) === 6 ? 6 : 4;
      saveConfig();
      applyConfigToUI();
    });
  });
}

if (unlockAttemptModeSelector) {
  unlockAttemptModeSelector.querySelectorAll('.seg-pill').forEach((btn) => {
    btn.addEventListener('click', () => {
      const n = Number(btn.dataset.attempt);
      config.unlockOnAttempt = n >= 1 && n <= 5 ? n : 1;
      config.unlockAttemptMode = config.unlockOnAttempt >= 2 ? 'second' : 'immediate';
      forceAttemptCount = 0;
      saveConfig();
      applyConfigToUI();
    });
  });
}

if (toggleKeySound) {
  toggleKeySound.addEventListener('change', (e) => {
    config.keySound = e.target.checked;
    saveConfig();
    if (config.keySound) {
      playKeyClickSound();
    }
  });
}

if (pinQuickWidgetBtn) {
  pinQuickWidgetBtn.addEventListener('click', () => {
    let requested = false;
    try {
      if (window.AndroidNative && typeof window.AndroidNative.requestPinQuickWidget === 'function') {
        requested = Boolean(window.AndroidNative.requestPinQuickWidget());
      }
    } catch (e) {}
    if (requested) {
      pinQuickWidgetBtn.textContent = '✓ אשר את הוספת הווידג׳ט בחלונית שנפתחה';
    } else {
      alert('להוספת ווידג׳ט שקוף: לחץ לחיצה ארוכה על מסך הבית בטלפון -> ווידג׳טים -> בחר Lockscreen.\n\nלהפעלה מכפתור הצד של סמסונג: הגדרות המכשיר -> תכונות מתקדמות -> מקש צד -> לחיצה כפולה -> פתיחת אפליקציה -> Lockscreen.');
    }
  });
}

if (forceModeSelector) {
  forceModeSelector.querySelectorAll('.seg-pill').forEach((btn) => {
    btn.addEventListener('click', () => {
      setForceModeState(btn.dataset.forcemode === 'true');
    });
  });
}

if (unlockTargetSelector) {
  unlockTargetSelector.querySelectorAll('.seg-pill').forEach((btn) => {
    btn.addEventListener('click', () => {
      config.unlockTargetScreen = btn.dataset.target;
      saveConfig();
      applyConfigToUI();
    });
  });
}

if (toggleForceUnlockMode) {
  toggleForceUnlockMode.addEventListener('change', (e) => {
    setForceModeState(e.target.checked);
  });
}

if (toggleSecretFpBypass) {
  toggleSecretFpBypass.addEventListener('change', (e) => {
    config.secretFpBypass = e.target.checked;
    saveConfig();
  });
}

if (statusBarSelector) {
  statusBarSelector.querySelectorAll('.seg-pill').forEach((btn) => {
    btn.addEventListener('click', () => {
      config.showStatusBar = btn.dataset.statusbar === 'show';
      saveConfig();
      applyConfigToUI();
    });
  });
}

if (toggleStealthPattern) {
  toggleStealthPattern.addEventListener('change', (e) => {
    config.stealthPattern = e.target.checked;
    saveConfig();
    applyConfigToUI();
  });
}

if (toggleStatusBar) {
  toggleStatusBar.addEventListener('change', (e) => {
    config.showStatusBar = e.target.checked;
    saveConfig();
    applyConfigToUI();
  });
}

if (togglePunchHole) {
  togglePunchHole.addEventListener('change', (e) => {
    config.showPunchHole = e.target.checked;
    saveConfig();
    applyConfigToUI();
  });
}

if (toggleHapticPeek) {
  toggleHapticPeek.addEventListener('change', (e) => {
    config.hapticPeek = e.target.checked;
    saveConfig();
  });
}

if (toggleChameleonClock) {
  toggleChameleonClock.addEventListener('change', (e) => {
    config.chameleonClock = e.target.checked;
    saveConfig();
  });
}

if (toggleHoldPeek) {
  toggleHoldPeek.addEventListener('change', (e) => {
    config.holdPeek = e.target.checked;
    saveConfig();
  });
}

if (toggleFingerprint) {
  toggleFingerprint.addEventListener('change', (e) => {
    config.showFingerprint = e.target.checked;
    saveConfig();
    applyConfigToUI();
  });
}

// דחיסת תמונה ושמירה ב-localStorage
function compressAndStoreImage(file, storageKey, onSuccess) {
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (event) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const maxW = 1080;
      const maxH = 2400;
      let w = img.width;
      let h = img.height;
      const ratio = Math.min(maxW / w, maxH / h, 1);
      w = Math.round(w * ratio);
      h = Math.round(h * ratio);
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, w, h);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.84);
      try {
        localStorage.setItem(storageKey, dataUrl);
        onSuccess(dataUrl);
      } catch (err) {
        alert('התמונה גדולה מדי לשמירה בזיכרון הדפדפן.');
      }
    };
    img.src = event.target.result;
  };
  reader.readAsDataURL(file);
}

function loadCustomMedia() {
  applyWallpaperToContainer();

  const savedHome = localStorage.getItem(HOMESCREEN_STORAGE_KEY);
  // באייפון: פס מטושטש מעל השעה שבתוך הצילום - השעה והסוללה האמיתיות של המערכת מופיעות במקומן
  let statusMask = fakeHomescreen.querySelector('.home-status-mask');
  if (!statusMask) {
    statusMask = document.createElement('div');
    statusMask.className = 'home-status-mask';
    fakeHomescreen.appendChild(statusMask);
  }
  if (savedHome) {
    fakeHomescreen.style.backgroundImage = `url("${savedHome}")`;
    fakeHomescreen.style.setProperty('--home-img', `url("${savedHome}")`);
    // השורה העליונה של הצילום (מעל השעה) = טפט נקי. מותחים אותה על כל שורת הסטטוס -
    // כך לא נשאר שום זכר לשעה הישנה שבצילום, והשעה האמיתית של האייפון מופיעה מעליה
    const stripImg = new Image();
    stripImg.onload = () => {
      try {
        const cv = document.createElement('canvas');
        cv.width = Math.max(1, Math.min(stripImg.width, 400));
        cv.height = 1;
        cv.getContext('2d').drawImage(stripImg, 0, 2, stripImg.width, 1, 0, 0, cv.width, 1);
        statusMask.style.backgroundImage = `url("${cv.toDataURL('image/png')}")`;
      } catch (e) {}
    };
    stripImg.src = savedHome;
    fakeHomescreen.classList.add('has-custom-home', 'has-custom-image');
    if (clearHomescreenBtn) clearHomescreenBtn.style.display = 'inline-flex';
  } else {
    fakeHomescreen.style.backgroundImage = '';
    fakeHomescreen.style.removeProperty('--home-img');
    fakeHomescreen.classList.remove('has-custom-home', 'has-custom-image');
    if (clearHomescreenBtn) clearHomescreenBtn.style.display = 'none';
  }
  syncHomeTargetNote();
}

// הסבר "אחרי הפתיחה" לפי הטלפון: באנדרואיד יציאה אמיתית, באייפון צילום מסך הבית (חובה)
function syncHomeTargetNote() {
  const note = document.getElementById('homeTargetNote');
  const warn = document.getElementById('homeShotWarn');
  const realIos = document.documentElement.classList.contains('real-ios');
  const isEn = Boolean(window.MagicI18n && window.MagicI18n.isEn);
  const hasHome = Boolean(localStorage.getItem(HOMESCREEN_STORAGE_KEY));
  if (note) {
    note.textContent = realIos
      ? (isEn
        ? 'On iPhone, Apple doesn\'t let any app exit to the home screen by itself - so a screenshot of YOUR home screen is shown, with the real time and battery on top.'
        : 'באייפון אפל לא מאפשרת לאף אפליקציה לצאת לבד למסך הבית - לכן מוצג צילום של מסך הבית שלך, עם השעה והסוללה האמיתיות למעלה.')
      : (isEn ? 'On Android the phone really exits to your real home screen.' : 'באנדרואיד הטלפון יוצא באמת למסך הבית שלך.');
  }
  if (warn) {
    warn.style.display = realIos && !hasHome ? 'block' : 'none';
    if (isEn) warn.textContent = '⚠️ Required on iPhone: screenshot your home screen (side + volume up) and pick it here. Without it the spectator sees an empty screen.';
  }
}

if (wallpaperFileInput) {
  wallpaperFileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    compressAndStoreImage(file, WALLPAPER_STORAGE_KEY, () => {
      localStorage.setItem(SELECTED_WALLPAPER_ID_KEY, 'custom');
      loadCustomMedia();
      renderWallpaperGallery();
    });
  });
}

// 🧪 בדיקה: כותב "בדיקה" על מסך הנעילה האמיתי ומראה מה נשלח ומה אנדרואיד ענה
const wordWallpaperTestBtn = document.getElementById('wordWallpaperTestBtn');
if (wordWallpaperTestBtn) {
  wordWallpaperTestBtn.addEventListener('click', async () => {
    const st = document.getElementById('wordWallpaperTestStatus');
    const pv = document.getElementById('wordWallpaperPreview');
    const say = (txt, ok) => {
      if (!st) return;
      st.textContent = txt;
      st.classList.toggle('ok', Boolean(ok));
      st.classList.toggle('bad', !ok);
    };
    if (!window.AndroidNative || typeof window.AndroidNative.setLockWallpaper !== 'function') {
      say('❌ הגרסה באפליקציה ישנה - עדכן דרך "בדוק עדכון".', false);
      return;
    }
    const dataUrl = await composeLockWallpaper('בדיקה');
    if (!dataUrl) {
      say('❌ לא נבחרה תמונה מקורית (או שהיא לא נשמרה). לחץ "בחר את התמונה המקורית".', false);
      return;
    }
    if (pv) {
      pv.src = dataUrl;
      pv.style.display = 'block';
    }
    say('⏳ מחליף את הטפט של מסך הנעילה...', true);
    wordWallpaperDirty = true;
    try {
      window.AndroidNative.setLockWallpaper(dataUrl, 'test');
    } catch (e) {
      say('❌ ' + (e && e.message ? e.message : 'שגיאה'), false);
    }
  });
}

const wordWallpaperFileInput = document.getElementById('wordWallpaperFileInput');
if (wordWallpaperFileInput) {
  wordWallpaperFileInput.addEventListener('change', (e) => {
    compressAndStoreImage(e.target.files[0], WORD_WALLPAPER_KEY, () => {
      wordWallpaperFileInput.value = '';
      syncNewRevealsUI();
    });
  });
}

if (clearWallpaperBtn) {
  clearWallpaperBtn.addEventListener('click', () => {
    localStorage.removeItem(WALLPAPER_STORAGE_KEY);
    localStorage.setItem(SELECTED_WALLPAPER_ID_KEY, 'model_default');
    if (wallpaperFileInput) wallpaperFileInput.value = '';
    loadCustomMedia();
    renderWallpaperGallery();
  });
}

if (homescreenFileInput) {
  homescreenFileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    compressAndStoreImage(file, HOMESCREEN_STORAGE_KEY, () => {
      loadCustomMedia();
    });
  });
}

if (clearHomescreenBtn) {
  clearHomescreenBtn.addEventListener('click', () => {
    localStorage.removeItem(HOMESCREEN_STORAGE_KEY);
    if (homescreenFileInput) homescreenFileInput.value = '';
    loadCustomMedia();
  });
}

// ----------------------------------------------------------------------------
// 20. סוללה חיה + עדכון אוטומטי מ-GitHub Pages
// ----------------------------------------------------------------------------
if ('getBattery' in navigator) {
  navigator
    .getBattery()
    .then((battery) => {
      const updateBatteryUI = () => {
        const level = Math.round(battery.level * 100);
        const samText = document.getElementById('samsungBatteryText');
        const samFill = document.getElementById('samsungBatteryFill');
        const iosText = document.getElementById('iosBatteryText');
        const iosFill = document.getElementById('iosBatteryFill');

        if (samText) samText.textContent = `${level}%`;
        const samPill = document.getElementById('samsungBatteryPill');
        if (samPill) samPill.textContent = `${level}`;
        if (samFill) samFill.style.height = `${level}%`;
        if (iosText) iosText.textContent = `${level}`;
        if (iosFill) iosFill.style.width = `${level}%`;
      };
      updateBatteryUI();
      battery.addEventListener('levelchange', updateBatteryUI);
    })
    .catch(() => {});
}

// ============================================================================
// 20ב. שער גישה: בקשה -> אישור מנהל -> בדיקה חוזרת קבועה
// ----------------------------------------------------------------------------
// • אין קודי הפעלה ואין קוד מאסטר. הגישה נקבעת רק לפי הסטטוס בענן.
// • מכשיר מאושר עובד גם בלי אינטרנט עד LICENSE_OFFLINE_GRACE_MS מהבדיקה האחרונה.
// • ביטול גישה במנהל -> האפליקציה ננעלת בבדיקה הבאה (כל דקה / בחזרה לאפליקציה).
// • תקלת רשת אף פעם לא נועלת מכשיר מאושר (רק תשובה ברורה מהשרת).
// ============================================================================
const LICENSE_CACHE_KEY = 'magic_license_state_v3';
const LICENSE_OFFLINE_GRACE_MS = 14 * 24 * 60 * 60 * 1000;
const LICENSE_RECHECK_MS = 60 * 1000;
const LICENSE_PENDING_POLL_MS = 5000;
const LICENSE_ERROR_RETRY_MS = 15000;

function readLicenseCache() {
  try {
    return JSON.parse(localStorage.getItem(LICENSE_CACHE_KEY) || 'null');
  } catch (e) {
    return null;
  }
}

function writeLicenseCache(status, extra = {}) {
  try {
    localStorage.setItem(LICENSE_CACHE_KEY, JSON.stringify({ status, checkedAt: Date.now(), ...extra }));
  } catch (e) {}
}

function isCachedApprovalValid() {
  const cache = readLicenseCache();
  if (cache && cache.status === 'trial') return Date.now() < Number(cache.trialEnd || 0); // ניסיון: עד סוף התקופה בלבד
  return Boolean(cache && cache.status === 'approved' && Date.now() - Number(cache.checkedAt || 0) < LICENSE_OFFLINE_GRACE_MS);
}

// רישום שימוש לאתר הניהול (מתי נפתח לאחרונה, כמה פעמים, איזו גרסה).
// לכל היותר פעם ב-20 דקות, ברקע, בלי להשפיע על האפליקציה אם אין רשת.
const USAGE_PING_KEY = 'magic_last_usage_ping';
const USAGE_PING_MIN_GAP_MS = 20 * 60 * 1000;
let usagePingInFlight = false;

function maybeReportUsage() {
  if (usagePingInFlight || !window.MagicCloud || !window.MagicCloud.device.reportUsage) return;
  const last = Number(localStorage.getItem(USAGE_PING_KEY) || 0);
  if (Date.now() - last < USAGE_PING_MIN_GAP_MS) return;
  usagePingInFlight = true;
  window.MagicCloud.device
    .reportUsage(getInstalledAppVersion(), getStatsForReport())
    .then(() => {
      try {
        localStorage.setItem(USAGE_PING_KEY, String(Date.now()));
      } catch (e) {}
    })
    .catch(() => {})
    .finally(() => {
      usagePingInFlight = false;
    });
}

function isLicenseOverlayVisible() {
  const overlay = document.getElementById('licenseLockOverlay');
  return Boolean(overlay && overlay.style.display !== 'none');
}

function initDeviceLicenseGate() {
  const overlay = document.getElementById('licenseLockOverlay');
  const card = document.getElementById('licenseLockCard');
  const promptText = document.getElementById('licensePromptText');
  const regFormSection = document.getElementById('regFormSection');
  const regNameInput = document.getElementById('regNameInput');
  const regPhoneInput = document.getElementById('regPhoneInput');
  const submitRegBtn = document.getElementById('submitRegBtn');
  const regWaitingBox = document.getElementById('regWaitingBox');
  const regWaitingTitle = document.getElementById('regWaitingTitle');
  const regWaitingSub = document.getElementById('regWaitingSub');
  const regBlockedBox = document.getElementById('regBlockedBox');
  const errorEl = document.getElementById('licenseErrorMsg');

  if (!overlay) return;

  // ניקוי דגלי הרישיון של הגרסה הישנה (שאפשרו עקיפה)
  try {
    localStorage.removeItem('is_licensed');
  } catch (e) {}

  let devId = '';
  try {
    if (window.AndroidNative && typeof window.AndroidNative.getSimpleDeviceId === 'function') {
      devId = String(window.AndroidNative.getSimpleDeviceId() || '');
    } else {
      devId = localStorage.getItem('magic_fallback_device_id') || String(Math.floor(1000 + Math.random() * 9000));
      localStorage.setItem('magic_fallback_device_id', devId);
    }
  } catch (e) {}

  let timer = null;
  let checking = false;

  const setError = (msg) => {
    if (errorEl) errorEl.textContent = msg || '';
  };

  // מצבים: approved | form | pending | blocked | checking | config | trialEnded
  function applyState(state) {
    const trialEndBox = document.getElementById('regTrialEndBox');
    if (trialEndBox) trialEndBox.style.display = state === 'trialEnded' ? 'flex' : 'none';
    if (state === 'trialEnded') fillPayInfo();
    const titleEl = overlay.querySelector('.license-lock-title');
    if (titleEl) titleEl.textContent = state === 'trialEnded' ? 'Lockscreen' : 'הרשמה לאפליקציה';
    if (state === 'form') updateRegTrialNote();
    if (state === 'approved') {
      overlay.style.display = 'none';
      setError('');
      updateTrialBanner();
      if (typeof maybeShowUpdatePopup === 'function') maybeShowUpdatePopup();
      if (typeof maybeShowGuideFirstTime === 'function') maybeShowGuideFirstTime();
      return;
    }
    overlay.style.display = 'flex';
    if (regFormSection) regFormSection.style.display = state === 'form' ? '' : 'none';
    if (regBlockedBox) regBlockedBox.style.display = state === 'blocked' ? 'flex' : 'none';
    if (regWaitingBox) regWaitingBox.style.display = state === 'pending' || state === 'checking' ? 'flex' : 'none';
    if (promptText) promptText.style.display = state === 'form' ? '' : 'none';

    if (state === 'pending') {
      if (regWaitingTitle) regWaitingTitle.textContent = 'הבקשה נשלחה וממתינה לאישור';
      if (regWaitingSub) regWaitingSub.textContent = 'האפליקציה תיפתח אוטומטית מיד עם אישור הבקשה';
    } else if (state === 'checking') {
      if (regWaitingTitle) regWaitingTitle.textContent = 'בודק הרשאת גישה...';
      if (regWaitingSub) regWaitingSub.textContent = 'נדרש חיבור לאינטרנט';
    } else if (state === 'config') {
      setError('המערכת עדיין לא הוגדרה. פנה למנהל.');
    }
  }

  function schedule(ms) {
    clearTimeout(timer);
    timer = setTimeout(checkStatus, ms);
  }

  async function checkStatus() {
    clearTimeout(timer);
    if (!window.MagicCloud || !window.MagicCloud.isConfigured()) {
      applyState('config');
      return;
    }
    if (checking) return;
    checking = true;
    try {
      const status = await window.MagicCloud.device.getMyStatus();
      setError('');
      loadSaleConfig();
      if (status === 'trial') {
        // תקופת ניסיון: פתוח עד שהיא נגמרת, ואחר כך מסך תשלום
        const end = getTrialEnd();
        if (Date.now() < end) {
          writeLicenseCache('trial', { trialEnd: end });
          applyState('approved');
          maybeReportUsage();
          storeAdminMessage();
          schedule(LICENSE_RECHECK_MS);
        } else {
          writeLicenseCache('trialEnded');
          applyState('trialEnded');
          schedule(LICENSE_RECHECK_MS);
        }
      } else if (status === 'approved') {
        writeLicenseCache('approved');
        applyState('approved');
        maybeReportUsage();
        storeAdminMessage();
        schedule(LICENSE_RECHECK_MS);
      } else if (status === 'none') {
        // אין בקשה (או שהמנהל מחק אותה) -> טופס הרשמה
        try {
          localStorage.removeItem(LICENSE_CACHE_KEY);
        } catch (e) {}
        applyState('form');
      } else {
        writeLicenseCache(status);
        applyState(status);
        schedule(status === 'pending' ? LICENSE_PENDING_POLL_MS : LICENSE_RECHECK_MS);
      }
    } catch (err) {
      // תקלת רשת/שרת: מכשיר מאושר ממשיך לעבוד בתוך תקופת החסד
      if (isCachedApprovalValid()) {
        applyState('approved');
      } else if (!isLicenseOverlayVisible() || (readLicenseCache() || {}).status === 'approved') {
        applyState('checking');
        setError('אין חיבור לאינטרנט. יש להתחבר כדי לאמת את הגישה.');
      } else {
        setError('אין חיבור לאינטרנט, מנסה שוב...');
      }
      schedule(LICENSE_ERROR_RETRY_MS);
    } finally {
      checking = false;
    }
  }

  if (submitRegBtn) {
    submitRegBtn.onclick = async () => {
      const name = regNameInput ? regNameInput.value.trim() : '';
      const phone = regPhoneInput ? regPhoneInput.value.trim() : '';
      if (name.length < 2) {
        setError('אנא הזן שם מלא');
        return;
      }
      const terms = document.getElementById('regTermsCheck');
      if (terms && !terms.checked) {
        setError('יש לאשר את תנאי השימוש ומדיניות הפרטיות');
        return;
      }
      if (phone.replace(/\D/g, '').length < 9 || phone.length > 20) {
        setError('אנא הזן מספר טלפון תקין');
        return;
      }
      if (!window.MagicCloud || !window.MagicCloud.isConfigured()) {
        applyState('config');
        return;
      }
      const vipInput = document.getElementById('regVipInput');
      const vipCode = regVipMode && vipInput ? vipInput.value.trim() : '';
      if (regVipMode && vipCode.length < 4) {
        setError('אנא הזן את קוד ההזמנה');
        return;
      }
      setError('');
      submitRegBtn.disabled = true;
      submitRegBtn.textContent = 'שולח בקשה...';
      try {
        if (vipCode && !(await window.MagicCloud.device.checkVipCode(vipCode))) {
          setError('קוד ההזמנה לא נכון - בדוק אותו ונסה שוב');
          triggerHaptic([60, 80, 60]);
          return;
        }
        const transfer = regTransferMode && !vipCode;
        const trial = !transfer && !vipCode && getSaleConfig().trial_days > 0;
        const status = await window.MagicCloud.device.submitRequest({ name, phone, deviceId: devId, trial, transfer, vipCode });
        triggerHaptic(40);
        if (status === 'trial') {
          // נרשם לניסיון - נפתח מיד
          checking = false;
          await checkStatus();
        } else if (status === 'approved') {
          writeLicenseCache('approved');
          applyState('approved');
          schedule(LICENSE_RECHECK_MS);
        } else {
          applyState(status === 'blocked' ? 'blocked' : 'pending');
          schedule(LICENSE_PENDING_POLL_MS);
        }
      } catch (err) {
        setError(err && err.network ? 'אין חיבור לאינטרנט, נסה שוב' : 'שליחת הבקשה נכשלה, נסה שוב');
        triggerHaptic([60, 80, 60]);
        if (card) {
          card.classList.add('text-shake');
          setTimeout(() => card.classList.remove('text-shake'), 420);
        }
      } finally {
        submitRegBtn.disabled = false;
        updateRegTrialNote();
      }
    };
  }

  loadSaleConfig().then(updateRegTrialNote);

  // פתיחה מהירה: מכשיר שאושר לאחרונה נפתח מיד, והבדיקה מול הענן רצה ברקע
  if (isCachedApprovalValid()) {
    applyState('approved');
  } else {
    applyState('checking');
  }
  checkStatus();

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') checkStatus();
  });
  window.addEventListener('online', checkStatus);
}

// ============================================================================
// 21. עדכונים: המנהל מפרסם גרסה -> אצל כולם קופץ חלון "יש עדכון חדש"
// ----------------------------------------------------------------------------
// APP_VERSION חייב להיות זהה ל-versionName ב-android/app/build.gradle.
// החלון מוצג רק כשמסך ההגדרות פתוח (בפתיחת האפליקציה / בתפריט הסודי),
// ולעולם לא מעל מסך הנעילה הפעיל מול קהל.
// ============================================================================
const APP_VERSION = '11.9';
const DEFAULT_APK_URL = 'https://github.com/tzur2010/app-lockscreen/raw/main/Lockscreen.apk';
const UPDATE_CHECK_INTERVAL_MS = 5 * 60 * 1000;
const UPDATE_DISMISS_KEY = 'magic_update_dismissed_version';

function isNativeApk() {
  return Boolean(window.AndroidNative && typeof window.AndroidNative.getAppVersionName === 'function');
}

function getInstalledAppVersion() {
  try {
    if (isNativeApk()) {
      const v = String(window.AndroidNative.getAppVersionName() || '').trim();
      if (v) return v;
    }
  } catch (e) {}
  return APP_VERSION;
}

function compareSemver(verA, verB) {
  const partsA = String(verA || '0').replace(/^v/i, '').split('.').map((n) => parseInt(n, 10) || 0);
  const partsB = String(verB || '0').replace(/^v/i, '').split('.').map((n) => parseInt(n, 10) || 0);
  const len = Math.max(partsA.length, partsB.length);
  for (let i = 0; i < len; i++) {
    const a = partsA[i] || 0;
    const b = partsB[i] || 0;
    if (a > b) return 1;
    if (a < b) return -1;
  }
  return 0;
}

let latestCloudAppConfig = null;

// ערוץ בטא: גרסאות חדשות עולות קודם לתיקייה beta/ באתר. רק בודקי בטא (המנהל מסמן
// באתר הניהול) ומי שפותח את גרסת האתר של הבטא מקבלים אותן. כל השאר - רק מה שפורסם.
const BETA_BASE_URL = 'https://tzur2010.github.io/app-lockscreen/beta/';
const BETA_APK_URL = 'https://github.com/tzur2010/app-lockscreen/raw/main/beta/Lockscreen.apk';

function isOnBetaWeb() {
  return !isNativeApk() && /\/beta\//.test(window.location.pathname);
}

function useBetaChannel() {
  if (isOnBetaWeb()) return true;
  try {
    return Boolean(window.MagicCloud && window.MagicCloud.device.isTester && window.MagicCloud.device.isTester());
  } catch (e) {
    return false;
  }
}

async function fetchBetaConfig() {
  const url = `${BETA_BASE_URL}version.json?t=${Date.now()}`;
  let data = null;
  // באנדרואיד (APK) fetch ישיר לאינטרנט חסום - קוראים דרך הגשר הנייטיבי (כמו כל שאר החיבורים)
  if (window.MagicCloud && typeof window.MagicCloud.httpGet === 'function' && isNativeApk()) {
    const res = await window.MagicCloud.httpGet(url);
    if (res && res.ok) {
      data = JSON.parse(res.text || 'null');
    } else {
      // גיבוי: ניסיון ישיר (אם הגשר לא הצליח)
      try {
        const r2 = await fetch(url, { cache: 'no-store' });
        if (r2.ok) data = await r2.json();
      } catch (e) {}
    }
  } else {
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) return null;
    data = await res.json();
  }
  if (!data || !data.latest_version) return null;
  return { latest_version: String(data.latest_version), apk_url: BETA_APK_URL, message: '🧪 גרסת בטא - רק לבודקים', beta: true };
}

function hasPendingUpdate() {
  return Boolean(
    latestCloudAppConfig &&
      latestCloudAppConfig.latest_version &&
      compareSemver(latestCloudAppConfig.latest_version, getInstalledAppVersion()) > 0
  );
}

window.onApkDownloadFinished = function () {
  const ver = latestCloudAppConfig ? latestCloudAppConfig.latest_version : '';
  if (inAppUpdateBtn) {
    inAppUpdateBtn.disabled = false;
    inAppUpdateBtn.textContent = `ההורדה הושלמה (v${ver}) - פותח מתקין...`;
  }
  if (inAppUpdateStatus) {
    inAppUpdateStatus.textContent = 'קובץ העדכון ירד בהצלחה! אשר "עדכן" בחלונית ההתקנה של אנדרואיד (כל ההגדרות שלך נשמרות).';
  }
};

async function reloadWebAppToLatest(ver) {
  try {
    if ('caches' in window) {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
    }
    if ('serviceWorker' in navigator) {
      const reg = await navigator.serviceWorker.getRegistration();
      if (reg) await reg.update();
    }
  } catch (e) {}
  window.location.replace(`${window.location.pathname}?v=${encodeURIComponent(ver || Date.now())}`);
}

function performAppUpdate() {
  if (!latestCloudAppConfig) return;
  const ver = String(latestCloudAppConfig.latest_version || '').replace(/^v/i, '');
  const url = String(latestCloudAppConfig.apk_url || DEFAULT_APK_URL).trim();

  if (!isNativeApk()) {
    // בודק בטא שפתח את האתר הרגיל - עובר לכתובת של הבטא
    if (latestCloudAppConfig.beta && !isOnBetaWeb()) {
      window.location.href = BETA_BASE_URL;
      return;
    }
    // גרסת אתר (PWA): העדכון = טעינה מחדש של הקבצים העדכניים
    reloadWebAppToLatest(ver);
    return;
  }

  if (inAppUpdateBtn) {
    inAppUpdateBtn.disabled = true;
    inAppUpdateBtn.textContent = `מוריד עדכון (v${ver})...`;
  }
  if (inAppUpdateStatus) {
    inAppUpdateStatus.textContent = 'ההורדה נפתחת בדפדפן. בסיום יש לפתוח את הקובץ ולאשר "עדכן" (ההגדרות שלך נשמרות).';
  }
  let started = false;
  try {
    started = Boolean(window.AndroidNative.downloadAndInstallApk(url, ver));
  } catch (e) {}
  if (!started && inAppUpdateStatus) {
    inAppUpdateStatus.textContent = 'לא ניתן לפתוח את ההורדה. נסה שוב.';
  }
  setTimeout(() => {
    if (inAppUpdateBtn) {
      inAppUpdateBtn.disabled = false;
      inAppUpdateBtn.textContent = `יש עדכון זמין (v${ver}) - לחץ לעדכון`;
    }
  }, 4000);
}

function hideUpdatePopup() {
  const popup = document.getElementById('updatePopupOverlay');
  if (popup) popup.style.display = 'none';
}

function maybeShowUpdatePopup() {
  const popup = document.getElementById('updatePopupOverlay');
  if (!popup || !hasPendingUpdate()) return;
  // רק כשמסך ההגדרות פתוח והמשתמש מאושר - לא מעל מסך הנעילה ולא מעל מסך ההרשמה
  if (!setupOverlay || !setupOverlay.classList.contains('open')) return;
  if (isLicenseOverlayVisible()) return;

  const ver = String(latestCloudAppConfig.latest_version).replace(/^v/i, '');
  try {
    if (sessionStorage.getItem(UPDATE_DISMISS_KEY) === ver) return;
  } catch (e) {}

  const titleEl = document.getElementById('updatePopupTitle');
  const textEl = document.getElementById('updatePopupText');
  if (titleEl) titleEl.textContent = `יש עדכון חדש (v${ver})`;
  if (textEl) {
    const note = String(latestCloudAppConfig.message || '').trim();
    textEl.textContent = (note ? note + '\n\n' : '') + `הגרסה שלך: v${getInstalledAppVersion()}. כל ההגדרות נשמרות בעדכון.`;
  }
  popup.style.display = 'flex';
}

async function checkCloudAppUpdate(isManualClick = false) {
  const installedVer = getInstalledAppVersion();
  if (installedVersionLabel) {
    installedVersionLabel.textContent = `גרסה מותקנת: v${installedVer}`;
  }
  if (isManualClick && checkUpdateNowBtn) {
    checkUpdateNowBtn.disabled = true;
    checkUpdateNowBtn.textContent = 'בודק...';
  }

  let fetchFailed = false;
  try {
    if (window.MagicCloud && window.MagicCloud.isConfigured()) {
      const cfg = await window.MagicCloud.getAppConfig();
      if (cfg && cfg.latest_version) latestCloudAppConfig = cfg;
    }
  } catch (e) {
    fetchFailed = true;
  }
  // בודק בטא: אם יש בבטא גרסה חדשה יותר ממה שפורסם - מקבלים אותה
  if (useBetaChannel()) {
    try {
      const beta = await fetchBetaConfig();
      if (beta && (!latestCloudAppConfig || compareSemver(beta.latest_version, latestCloudAppConfig.latest_version) >= 0)) {
        latestCloudAppConfig = beta;
      }
    } catch (e) {}
    if (installedVersionLabel) installedVersionLabel.textContent = `גרסה מותקנת: v${installedVer} · 🧪 בודק בטא`;
  }

  const hasNewer = hasPendingUpdate();
  if (hasNewer) {
    const remoteVer = String(latestCloudAppConfig.latest_version).replace(/^v/i, '');
    if (inAppUpdateBanner) inAppUpdateBanner.style.display = 'flex';
    if (inAppUpdateBtn) {
      inAppUpdateBtn.disabled = false;
      inAppUpdateBtn.textContent = `יש עדכון זמין (v${remoteVer}) - לחץ לעדכון`;
    }
    if (cloudVersionStatusText) {
      cloudVersionStatusText.textContent = `זמינה גרסה חדשה (v${remoteVer}) — לחץ על הכפתור הירוק למעלה`;
    }
    if (isManualClick) {
      try {
        sessionStorage.removeItem(UPDATE_DISMISS_KEY);
      } catch (e) {}
    }
    maybeShowUpdatePopup();
  } else {
    if (inAppUpdateBanner) inAppUpdateBanner.style.display = 'none';
    if (cloudVersionStatusText) {
      cloudVersionStatusText.textContent = !isManualClick
        ? 'הגדרות המשתמש נשמרות במלואן בעת עדכון'
        : fetchFailed
        ? 'אין חיבור לאינטרנט, נסה שוב'
        : `האפליקציה מעודכנת לגרסה האחרונה (v${installedVer}) ✓`;
    }
  }

  if (isManualClick && checkUpdateNowBtn) {
    checkUpdateNowBtn.disabled = false;
    checkUpdateNowBtn.textContent = 'בדוק עדכון';
  }
}

function initInAppSelfUpdater() {
  if (inAppUpdateBtn) inAppUpdateBtn.addEventListener('click', performAppUpdate);
  if (checkUpdateNowBtn) checkUpdateNowBtn.addEventListener('click', () => checkCloudAppUpdate(true));

  const popupBtn = document.getElementById('updatePopupBtn');
  const popupLater = document.getElementById('updatePopupLater');
  if (popupBtn) {
    popupBtn.addEventListener('click', () => {
      hideUpdatePopup();
      performAppUpdate();
    });
  }
  if (popupLater) {
    popupLater.addEventListener('click', () => {
      try {
        if (latestCloudAppConfig) {
          sessionStorage.setItem(UPDATE_DISMISS_KEY, String(latestCloudAppConfig.latest_version).replace(/^v/i, ''));
        }
      } catch (e) {}
      hideUpdatePopup();
    });
  }

  checkCloudAppUpdate(false);
  setInterval(() => {
    if (document.visibilityState === 'visible') checkCloudAppUpdate(false);
  }, UPDATE_CHECK_INTERVAL_MS);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') checkCloudAppUpdate(false);
  });
}

// ============================================================================
// 23. הצצה לשעון החכם + חשיפה בהתראה
// ----------------------------------------------------------------------------
// השעון מחובר כבר לטלפון של הקוסם, ולכן אין צורך בחיבור נוסף: האפליקציה שולחת
// התראה שקטה (בלי צליל ובלי קפיצה על הטלפון) והשעון מציג אותה. הקוד לא נשלח לשרת.
// ============================================================================
function hasNativeNotifications() {
  return Boolean(window.AndroidNative && typeof window.AndroidNative.sendWatchPeek === 'function');
}

function formatCodeForDisplay(code, mode) {
  const clean = String(code || '');
  if (String(mode).toUpperCase() === 'PATTERN') return clean.split('').join('-');
  return clean;
}

function sendCodeToWatch(code, mode) {
  if (!config.watchPeek || !hasNativeNotifications() || !code) return;
  const m = String(mode || '').toUpperCase();
  let label = m === 'PATTERN' ? 'דפוס' : m === 'WORDS' ? 'סיסמה' : 'קוד';
  // "תאריך לידה": על השעון מופיעים גם המזל, הגיל והיום שבו נולד
  const bInfo = config.birthdayTrick && m !== 'PATTERN' ? decodeBirthday(code) : null;
  if (bInfo) label = birthdaySummary(bInfo);
  else if (config.birthdayTrick && m !== 'PATTERN') label = window.MagicI18n && window.MagicI18n.isEn ? '❌ Not a date' : '❌ לא תאריך';
  try {
    window.AndroidNative.sendWatchPeek(formatCodeForDisplay(code, m), label);
    trackEvent('watch');
  } catch (e) {}
}

function buildRevealMessage(code) {
  return fillCodePlaceholder(String(config.revealText || '{קוד}'), String(code || ''));
}

// תמונת השולח: נשמרת בנפרד מההגדרות (תמונה קטנה, 192 פיקסלים)
const REVEAL_AVATAR_KEY = 'magic_reveal_avatar_v1';
const AVATAR_COLORS = ['#0EA5E9', '#22C55E', '#F59E0B', '#EC4899', '#8B5CF6', '#EF4444', '#14B8A6'];

function getRevealAvatar() {
  try {
    return localStorage.getItem(REVEAL_AVATAR_KEY) || '';
  } catch (e) {
    return '';
  }
}

// אותו חישוב צבע כמו באנדרואיד (String.hashCode של ג'אווה), כדי שהעיגול ייראה זהה בשני המקומות
function avatarColorFor(name) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (Math.imul(31, h) + name.charCodeAt(i)) | 0;
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
}

function paintAvatar(el, name, dataUrl) {
  if (!el) return;
  const clean = String(name || '').trim();
  if (dataUrl) {
    el.style.backgroundImage = `url("${dataUrl}")`;
    el.style.backgroundColor = 'transparent';
    el.textContent = '';
  } else {
    el.style.backgroundImage = 'none';
    el.style.backgroundColor = avatarColorFor(clean);
    el.textContent = clean ? Array.from(clean)[0] : '?';
  }
}

function resizeImageToAvatar(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = () => {
      const img = new Image();
      img.onerror = reject;
      img.onload = () => {
        const size = 192;
        const side = Math.min(img.width, img.height);
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        canvas.getContext('2d').drawImage(img, (img.width - side) / 2, (img.height - side) / 2, side, side, 0, 0, size, size);
        resolve(canvas.toDataURL('image/jpeg', 0.85));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

let fakeBannerTimer = null;
function showFakeMessageBanner(sender, text) {
  const banner = document.getElementById('fakeMsgBanner');
  if (!banner) return;
  paintAvatar(document.getElementById('fakeMsgAvatar'), sender, getRevealAvatar());
  document.getElementById('fakeMsgSender').textContent = sender;
  document.getElementById('fakeMsgText').textContent = text;
  banner.classList.toggle('light', config.osTheme === 'ios');
  banner.style.display = 'flex';
  void banner.offsetWidth;
  banner.classList.add('show');
  triggerHaptic([40, 60, 40]);
  clearTimeout(fakeBannerTimer);
  fakeBannerTimer = setTimeout(hideFakeMessageBanner, 12000);
}

function hideFakeMessageBanner() {
  const banner = document.getElementById('fakeMsgBanner');
  if (!banner) return;
  banner.classList.remove('show');
  setTimeout(() => {
    if (!banner.classList.contains('show')) banner.style.display = 'none';
  }, 400);
}

// נקרא ברגע שהטלפון "נפתח" בכפיית פתיחה
function scheduleCodeReveal(code, force = false, delayOverrideMs = null) {
  if (!force && !config.revealEnabled) return false;
  const delayMs = delayOverrideMs !== null ? Math.max(0, delayOverrideMs) : Math.max(1, Number(config.revealDelaySec) || 5) * 1000;
  const sender = String(config.revealSender || 'אמא');
  const text = buildRevealMessage(code);
  // באנדרואיד: הודעה אמיתית של המערכת (מגיעה גם אחרי שהאפליקציה נסגרה למסך הבית)
  if (hasNativeNotifications()) {
    try {
      if (typeof window.AndroidNative.scheduleRevealNotificationV2 === 'function') {
        if (window.AndroidNative.scheduleRevealNotificationV2(sender, text, delayMs, getRevealAvatar())) return true;
      } else if (typeof window.AndroidNative.scheduleRevealNotification === 'function') {
        if (window.AndroidNative.scheduleRevealNotification(sender, text, delayMs)) return true;
      }
    } catch (e) {}
  }
  // בגרסת האתר: הודעה מדומה שקופצת בראש המסך
  setTimeout(() => showFakeMessageBanner(sender, text), delayMs);
  return true;
}

function syncMagicFeaturesUI() {
  const watchToggle = document.getElementById('toggleWatchPeek');
  const watchExtra = document.getElementById('watchPeekExtra');
  const watchDesc = document.getElementById('watchPeekDesc');
  const revealToggle = document.getElementById('toggleReveal');
  const revealExtra = document.getElementById('revealExtra');
  const native = hasNativeNotifications();

  if (watchToggle) {
    watchToggle.checked = Boolean(config.watchPeek) && native;
    watchToggle.disabled = !native;
  }
  if (watchExtra) watchExtra.style.display = config.watchPeek && native ? 'block' : 'none';
  if (watchDesc && !native) watchDesc.textContent = 'זמין רק באפליקציית האנדרואיד (עם שעון חכם שמחובר לטלפון).';

  if (revealToggle) revealToggle.checked = Boolean(config.revealEnabled);
  if (revealExtra) revealExtra.style.display = config.revealEnabled ? 'block' : 'none';

  const senderInput = document.getElementById('revealSenderInput');
  const textInput = document.getElementById('revealTextInput');
  if (senderInput && document.activeElement !== senderInput) senderInput.value = config.revealSender || '';
  if (textInput && document.activeElement !== textInput) textInput.value = config.revealText || '';
  document.querySelectorAll('#revealDelaySelector .seg-pill').forEach((btn) => {
    btn.classList.toggle('active', Number(btn.dataset.delay) === Number(config.revealDelaySec || 5));
  });

  const avatar = getRevealAvatar();
  paintAvatar(document.getElementById('revealAvatarPreview'), config.revealSender, avatar);
  const clearBtn = document.getElementById('revealAvatarClear');
  if (clearBtn) clearBtn.style.display = avatar ? '' : 'none';
}

function initMagicFeatures() {
  const watchToggle = document.getElementById('toggleWatchPeek');
  const revealToggle = document.getElementById('toggleReveal');
  const askPermission = () => {
    try {
      if (window.AndroidNative && typeof window.AndroidNative.requestNotificationPermission === 'function') {
        window.AndroidNative.requestNotificationPermission();
      }
    } catch (e) {}
  };

  if (watchToggle) {
    watchToggle.addEventListener('change', (e) => {
      config.watchPeek = e.target.checked;
      saveConfig();
      if (config.watchPeek) askPermission();
      syncMagicFeaturesUI();
    });
  }
  if (revealToggle) {
    revealToggle.addEventListener('change', (e) => {
      config.revealEnabled = e.target.checked;
      saveConfig();
      if (config.revealEnabled) askPermission();
      syncMagicFeaturesUI();
    });
  }

  const senderInput = document.getElementById('revealSenderInput');
  const textInput = document.getElementById('revealTextInput');
  if (senderInput) {
    senderInput.addEventListener('input', () => {
      config.revealSender = senderInput.value.slice(0, 40);
      saveConfig();
      paintAvatar(document.getElementById('revealAvatarPreview'), config.revealSender, getRevealAvatar());
    });
  }

  const avatarInput = document.getElementById('revealAvatarInput');
  if (avatarInput) {
    avatarInput.addEventListener('change', async () => {
      const file = avatarInput.files && avatarInput.files[0];
      avatarInput.value = '';
      if (!file) return;
      try {
        const dataUrl = await resizeImageToAvatar(file);
        localStorage.setItem(REVEAL_AVATAR_KEY, dataUrl);
      } catch (e) {}
      syncMagicFeaturesUI();
      scheduleCloudBackup();
    });
  }
  const avatarClear = document.getElementById('revealAvatarClear');
  if (avatarClear) {
    avatarClear.addEventListener('click', () => {
      try {
        localStorage.removeItem(REVEAL_AVATAR_KEY);
      } catch (e) {}
      syncMagicFeaturesUI();
    });
  }
  if (textInput) {
    textInput.addEventListener('input', () => {
      config.revealText = textInput.value.slice(0, 300);
      saveConfig();
    });
  }
  document.querySelectorAll('#revealDelaySelector .seg-pill').forEach((btn) => {
    btn.addEventListener('click', () => {
      config.revealDelaySec = Number(btn.dataset.delay) || 5;
      saveConfig();
      syncMagicFeaturesUI();
    });
  });

  const watchTestBtn = document.getElementById('watchPeekTestBtn');
  const watchStatus = document.getElementById('watchPeekStatus');
  if (watchTestBtn) {
    watchTestBtn.addEventListener('click', () => {
      let ok = false;
      try {
        ok = hasNativeNotifications() && window.AndroidNative.sendWatchPeek('1234', 'בדיקה - אם זה מופיע בשעון, הכל עובד');
      } catch (e) {}
      if (!ok) askPermission();
      if (watchStatus) {
        watchStatus.textContent = ok
          ? 'נשלח ✓ בדוק את השעון. אם לא הופיע: באפליקציית Galaxy Wearable ← התראות ← הדלק "הצג התראות בשעון גם כשהטלפון בשימוש".'
          : 'ההתראות חסומות. אשר את הרשאת ההתראות שקפצה ונסה שוב.';
      }
    });
  }

  const revealTestBtn = document.getElementById('revealTestBtn');
  const revealStatus = document.getElementById('revealStatus');
  if (revealTestBtn) {
    revealTestBtn.addEventListener('click', () => {
      scheduleCodeReveal('1234', true);
      if (revealStatus) revealStatus.textContent = `ההודעה תגיע בעוד ${Number(config.revealDelaySec) || 5} שניות...`;
      setTimeout(() => {
        if (revealStatus) revealStatus.textContent = '';
      }, (Number(config.revealDelaySec) || 5) * 1000 + 3000);
    });
  }

  const banner = document.getElementById('fakeMsgBanner');
  if (banner) banner.addEventListener('click', hideFakeMessageBanner);

  syncMagicFeaturesUI();
}

// ============================================================================
// 24. רוטינות שמורות: שמירת כל ההגדרות בשם ומעבר ביניהן בלחיצה
// ============================================================================
const ROUTINES_KEY = 'magic_routines_v1';
const ACTIVE_ROUTINE_KEY = 'magic_active_routine_v1';
// הגדרות שלא שייכות לרוטינה (אישיות למכשיר / למראה תפריט ההגדרות)
const ROUTINE_EXCLUDED_KEYS = ['settingsColorScheme', 'faceSignature', 'faceDescriptor', 'faceIdEnrolled', 'fingerprintEnrolled', 'fingerprintHoldMs', 'fingerprintZoneX', 'fingerprintZoneY', 'fingerprintProfile'];

function getRoutines() {
  try {
    const list = JSON.parse(localStorage.getItem(ROUTINES_KEY) || '[]');
    return Array.isArray(list) ? list : [];
  } catch (e) {
    return [];
  }
}

function saveRoutines(list) {
  try {
    localStorage.setItem(ROUTINES_KEY, JSON.stringify(list));
  } catch (e) {}
  if (typeof scheduleCloudBackup === 'function') scheduleCloudBackup();
}

function snapshotCurrentSettings() {
  const snap = {};
  Object.keys(config).forEach((k) => {
    if (!ROUTINE_EXCLUDED_KEYS.includes(k)) snap[k] = config[k];
  });
  return { config: snap, force: Boolean(forceUnlockMode) };
}

function applyRoutine(routine) {
  if (!routine || !routine.config) return;
  trackEvent('routine');
  const keep = {};
  ROUTINE_EXCLUDED_KEYS.forEach((k) => {
    if (k in config) keep[k] = config[k];
  });
  config = { ...DEFAULT_CONFIG, ...routine.config, ...keep };
  saveConfig();
  setForceModeState(routine.force !== false);
  forceAttemptCount = 0;
  applyConfigToUI();
  syncMagicFeaturesUI();
  try {
    localStorage.setItem(ACTIVE_ROUTINE_KEY, routine.id);
  } catch (e) {}
  triggerHaptic(30);
  renderRoutines();
}

function renderRoutines() {
  const listEl = document.getElementById('routineList');
  if (!listEl) return;
  const routines = getRoutines();
  const activeId = localStorage.getItem(ACTIVE_ROUTINE_KEY) || '';
  listEl.innerHTML = '';
  if (!routines.length) {
    listEl.innerHTML = '<div class="routine-empty">עוד אין רוטינות שמורות</div>';
    return;
  }
  routines.forEach((r) => {
    const item = document.createElement('div');
    item.className = 'routine-item' + (r.id === activeId ? ' active' : '');
    const name = document.createElement('span');
    name.className = 'routine-item-name';
    name.textContent = (r.id === activeId ? '✓ ' : '') + r.name;
    const load = document.createElement('button');
    load.type = 'button';
    load.className = 'routine-load-btn';
    load.textContent = 'טען';
    load.addEventListener('click', () => applyRoutine(r));
    const del = document.createElement('button');
    del.type = 'button';
    del.className = 'routine-del-btn';
    del.textContent = 'מחק';
    del.addEventListener('click', () => {
      if (del.dataset.confirm !== '1') {
        // לחיצה ראשונה מבקשת אישור (בלי חלון קופץ של הדפדפן)
        del.dataset.confirm = '1';
        del.textContent = 'בטוח?';
        setTimeout(() => {
          del.dataset.confirm = '';
          del.textContent = 'מחק';
        }, 2500);
        return;
      }
      saveRoutines(getRoutines().filter((x) => x.id !== r.id));
      renderRoutines();
    });
    item.append(name, load, del);
    listEl.appendChild(item);
  });
}

function initRoutines() {
  const input = document.getElementById('routineNameInput');
  const btn = document.getElementById('routineSaveBtn');
  if (btn && input) {
    btn.addEventListener('click', () => {
      const name = input.value.trim() || `רוטינה ${getRoutines().length + 1}`;
      const routines = getRoutines();
      const existing = routines.find((r) => r.name === name);
      const snap = snapshotCurrentSettings();
      let id;
      if (existing) {
        Object.assign(existing, snap, { savedAt: Date.now() });
        id = existing.id;
      } else {
        id = 'r' + Date.now().toString(36);
        routines.push({ id, name: name.slice(0, 30), savedAt: Date.now(), ...snap });
      }
      saveRoutines(routines.slice(-20));
      try {
        localStorage.setItem(ACTIVE_ROUTINE_KEY, id);
      } catch (e) {}
      input.value = '';
      triggerHaptic(30);
      renderRoutines();
    });
  }
  renderRoutines();
}

// ============================================================================
// 25. גיבוי הגדרות בענן לפי קוד גיבוי אישי
// ----------------------------------------------------------------------------
// אחרי התקנה מחדש הטלפון מקבל זהות חדשה, לכן הגיבוי לא קשור לזהות אלא לקוד
// אישי בן 12 תווים שהקוסם שומר אצלו. גיבוי אוטומטי כ-20 שניות אחרי כל שינוי.
// ============================================================================
var BACKUP_CODE_KEY = 'magic_backup_code_v1';
var BACKUP_LAST_KEY = 'magic_backup_last_v1';
var BACKUP_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
var backupTimer = null;
var backupInFlight = false;

function getBackupCode() {
  let code = '';
  try {
    code = localStorage.getItem(BACKUP_CODE_KEY) || '';
  } catch (e) {}
  if (!/^[A-Z0-9]{12}$/.test(code)) {
    const bytes = new Uint8Array(12);
    (window.crypto || window.msCrypto).getRandomValues(bytes);
    code = Array.from(bytes, (b) => BACKUP_ALPHABET[b % BACKUP_ALPHABET.length]).join('');
    try {
      localStorage.setItem(BACKUP_CODE_KEY, code);
    } catch (e) {}
  }
  return code;
}

function formatBackupCode(code) {
  return String(code).match(/.{1,4}/g).join('-');
}

function normalizeBackupCode(input) {
  return String(input || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
}

function buildBackupPayload() {
  const cfg = { ...config };
  // נתונים ביומטריים (פנים) נשארים רק בטלפון ולא עולים לענן
  delete cfg.faceSignature;
  delete cfg.faceDescriptor;
  delete cfg.faceIdEnrolled;
  let avatar = '';
  try {
    avatar = localStorage.getItem(REVEAL_AVATAR_KEY) || '';
  } catch (e) {}
  return JSON.stringify({
    v: 1,
    config: cfg,
    force: Boolean(forceUnlockMode),
    routines: getRoutines(),
    activeRoutine: localStorage.getItem(ACTIVE_ROUTINE_KEY) || '',
    avatar
  });
}

function canUseCloudBackup() {
  try {
    if (!window.MagicCloud || !window.MagicCloud.isConfigured() || !window.MagicCloud.device.saveBackup) return false;
    const cache = readLicenseCache();
    return Boolean(cache && cache.status === 'approved');
  } catch (e) {
    return false;
  }
}

function setBackupStatus(text, color) {
  const el = document.getElementById('backupStatus');
  if (!el) return;
  el.textContent = text || '';
  el.style.color = color || '';
}

function describeLastBackup() {
  const last = Number(localStorage.getItem(BACKUP_LAST_KEY) || 0);
  if (!last) return 'עוד לא בוצע גיבוי';
  const d = new Date(last);
  return `גובה לאחרונה: ${d.toLocaleDateString('he-IL')} ${d.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}`;
}

async function runCloudBackup(manual = false) {
  if (backupInFlight) return false;
  if (!canUseCloudBackup()) {
    if (manual) setBackupStatus('הגיבוי זמין רק כשהאפליקציה מאושרת ומחוברת', '#f87171');
    return false;
  }
  backupInFlight = true;
  if (manual) setBackupStatus('מגבה...');
  try {
    await window.MagicCloud.device.saveBackup(getBackupCode(), buildBackupPayload());
    localStorage.setItem(BACKUP_LAST_KEY, String(Date.now()));
    setBackupStatus((manual ? 'נשמר ✓ ' : '') + describeLastBackup(), manual ? '#22c55e' : '');
    return true;
  } catch (err) {
    if (manual) setBackupStatus(err && err.network ? 'אין חיבור לאינטרנט, נסה שוב' : 'הגיבוי נכשל, נסה שוב', '#f87171');
    return false;
  } finally {
    backupInFlight = false;
  }
}

function scheduleCloudBackup() {
  try {
    clearTimeout(backupTimer);
    backupTimer = setTimeout(() => runCloudBackup(false), 20000);
  } catch (e) {}
}

function applyBackupPayload(payload) {
  const data = JSON.parse(payload);
  if (!data || !data.config) throw new Error('bad backup');
  const keep = { faceSignature: config.faceSignature, faceDescriptor: config.faceDescriptor, faceIdEnrolled: config.faceIdEnrolled };
  config = { ...DEFAULT_CONFIG, ...data.config, ...keep };
  localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(config));
  setForceModeState(data.force !== false);
  localStorage.setItem(ROUTINES_KEY, JSON.stringify(Array.isArray(data.routines) ? data.routines : []));
  if (data.activeRoutine) localStorage.setItem(ACTIVE_ROUTINE_KEY, data.activeRoutine);
  if (data.avatar) localStorage.setItem(REVEAL_AVATAR_KEY, data.avatar);
  else localStorage.removeItem(REVEAL_AVATAR_KEY);
  forceAttemptCount = 0;
  applyConfigToUI();
  syncMagicFeaturesUI();
  renderRoutines();
}

function initCloudBackup() {
  const codeEl = document.getElementById('backupCodeText');
  if (codeEl) codeEl.textContent = formatBackupCode(getBackupCode());
  setBackupStatus(describeLastBackup());

  const copyBtn = document.getElementById('backupCopyBtn');
  if (copyBtn) {
    copyBtn.addEventListener('click', async () => {
      const text = formatBackupCode(getBackupCode());
      let ok = false;
      try {
        await navigator.clipboard.writeText(text);
        ok = true;
      } catch (e) {}
      copyBtn.textContent = ok ? 'הועתק ✓' : 'סמן והעתק';
      setTimeout(() => (copyBtn.textContent = 'העתק'), 2000);
    });
  }

  const nowBtn = document.getElementById('backupNowBtn');
  if (nowBtn) nowBtn.addEventListener('click', () => runCloudBackup(true));

  const restoreInput = document.getElementById('restoreCodeInput');
  const restoreBtn = document.getElementById('restoreBtn');
  const restoreStatus = document.getElementById('restoreStatus');
  const setRestoreStatus = (text, color) => {
    if (!restoreStatus) return;
    restoreStatus.textContent = text || '';
    restoreStatus.style.color = color || '';
  };
  if (restoreBtn && restoreInput) {
    restoreBtn.addEventListener('click', async () => {
      const code = normalizeBackupCode(restoreInput.value);
      if (code.length !== 12) {
        setRestoreStatus('הקוד צריך להיות 12 תווים (למשל K7P2-9XQM-4RTA)', '#f87171');
        return;
      }
      if (restoreBtn.dataset.confirm !== '1') {
        restoreBtn.dataset.confirm = '1';
        restoreBtn.textContent = 'בטוח?';
        setRestoreStatus('השחזור יחליף את כל ההגדרות הנוכחיות. לחץ שוב לאישור.', '#f59e0b');
        setTimeout(() => {
          restoreBtn.dataset.confirm = '';
          restoreBtn.textContent = 'שחזר';
        }, 4000);
        return;
      }
      restoreBtn.dataset.confirm = '';
      restoreBtn.textContent = 'משחזר...';
      restoreBtn.disabled = true;
      try {
        if (!window.MagicCloud || !window.MagicCloud.device.loadBackup) throw new Error('offline');
        const doc = await window.MagicCloud.device.loadBackup(code);
        if (!doc || !doc.data) {
          setRestoreStatus('לא נמצא גיבוי עם הקוד הזה', '#f87171');
        } else {
          applyBackupPayload(doc.data);
          localStorage.setItem(BACKUP_CODE_KEY, code);
          if (codeEl) codeEl.textContent = formatBackupCode(code);
          restoreInput.value = '';
          triggerHaptic([40, 60, 40]);
          setRestoreStatus('ההגדרות שוחזרו ✓', '#22c55e');
        }
      } catch (err) {
        setRestoreStatus(err && err.network ? 'אין חיבור לאינטרנט, נסה שוב' : 'השחזור נכשל, נסה שוב', '#f87171');
      } finally {
        restoreBtn.disabled = false;
        restoreBtn.textContent = 'שחזר';
      }
    });
  }
}

// ============================================================================
// 26. מדריך שימוש: נפתח לבד בפעם הראשונה, ובכל זמן מכפתור בראש ההגדרות
// ============================================================================
var GUIDE_SEEN_KEY = 'magic_guide_seen_v1';

function openGuide() {
  const el = document.getElementById('guideOverlay');
  if (el) el.style.display = 'flex';
}

function closeGuide() {
  const el = document.getElementById('guideOverlay');
  if (el) el.style.display = 'none';
  try {
    localStorage.setItem(GUIDE_SEEN_KEY, '1');
  } catch (e) {}
}

function maybeShowGuideFirstTime() {
  try {
    if (localStorage.getItem(GUIDE_SEEN_KEY)) return;
  } catch (e) {
    return;
  }
  if (!setupOverlay || !setupOverlay.classList.contains('open')) return;
  if (isLicenseOverlayVisible()) return;
  const updatePopup = document.getElementById('updatePopupOverlay');
  if (updatePopup && updatePopup.style.display === 'flex') return;
  // בפעם הראשונה: סיור היכרות קצר (המדריך המלא נשאר בכפתור ?)
  setTimeout(() => maybeStartTour(), 1300);
}

function initGuide() {
  const openBtn = document.getElementById('openGuideBtn');
  const headerBtn = document.getElementById('headerGuideBtn');
  const closeBtn = document.getElementById('guideCloseBtn');
  if (openBtn) openBtn.addEventListener('click', openGuide);
  if (headerBtn) headerBtn.addEventListener('click', openGuide);
  if (closeBtn) closeBtn.addEventListener('click', closeGuide);
}

// ============================================================================
// 27. לשוניות ההגדרות: טריק / הצצה / מראה / אבטחה / עוד
// ============================================================================
var SETTINGS_TAB_KEY = 'magic_settings_tab_v1';

function showSettingsTab(tab) {
  const tabs = document.querySelectorAll('#settingsTabs .settings-tab');
  const panels = document.querySelectorAll('.settings-panel');
  if (!tabs.length) return;
  const exists = Array.from(panels).some((p) => p.dataset.tab === tab);
  const target = exists ? tab : 'trick';
  tabs.forEach((t) => t.classList.toggle('active', t.dataset.tab === target));
  panels.forEach((p) => p.classList.toggle('active', p.dataset.tab === target));
  const body = document.querySelector('.config-body');
  if (body) body.scrollTop = 0;
  try {
    localStorage.setItem(SETTINGS_TAB_KEY, target);
  } catch (e) {}
}

function initSettingsTabs() {
  document.querySelectorAll('#settingsTabs .settings-tab').forEach((btn) => {
    btn.addEventListener('click', () => {
      triggerHaptic(10);
      showSettingsTab(btn.dataset.tab);
    });
  });
  let saved = 'trick';
  try {
    saved = localStorage.getItem(SETTINGS_TAB_KEY) || 'trick';
  } catch (e) {}
  showSettingsTab(saved);
}

// ============================================================================
// 28. חשיפה בפתקים + "מוכן לצופה הבא"
// ============================================================================
var NOTES_PREDICTION_DEFAULT_HE = 'דברים שצריך לזכור השבוע:\n• קניות לסוף שבוע\n• לאסוף חבילה מהדואר\n• המספר שתבחר: {קוד}';
var NOTES_PREDICTION_DEFAULT_EN = 'Things to remember this week:\n• Weekend groceries\n• Pick up the package\n• The number you will choose: {code}';
var NOTES_PREDICTION_DEFAULT = isEnglishUi() ? NOTES_PREDICTION_DEFAULT_EN : NOTES_PREDICTION_DEFAULT_HE;

function getNotesTemplate() {
  let t = null;
  try {
    t = localStorage.getItem(NOTES_BODY_STORAGE_KEY);
  } catch (e) {}
  return t !== null && t !== '' ? t : NOTES_PREDICTION_DEFAULT;
}

function formatNoteTime(date, isYesterday) {
  const hh = String(date.getHours()).padStart(2, '0');
  const mm = String(date.getMinutes()).padStart(2, '0');
  return `${isYesterday ? 'אתמול' : 'היום'}, ${hh}:${mm}`;
}

// מציג בפתק את הקוד שהצופה בחר, עם שעת כתיבה מוקדמת
function showNotesPrediction(code) {
  if (!notesBodyTextarea) return;
  trackEvent('notes_reveal');
  let template = getNotesTemplate();
  if (!/\{(קוד|code)\}/i.test(template)) template += '\n• {קוד}';
  notesBodyTextarea.value = fillCodePlaceholder(template, code || '----');
  notesBodyTextarea.readOnly = true;
  notesBodyTextarea.dataset.prediction = '1';

  if (notesDateLine) {
    const now = new Date();
    if (config.notesAge === 'yesterday') {
      const d = new Date(now.getTime() - 24 * 3600 * 1000 + 37 * 60 * 1000);
      notesDateLine.textContent = formatNoteTime(d, true);
    } else {
      const mins = Math.max(1, Number(config.notesAge) || 60);
      const d = new Date(now.getTime() - mins * 60 * 1000);
      notesDateLine.textContent = formatNoteTime(d, d.toDateString() !== now.toDateString());
    }
  }
}

function restoreNotesTemplate() {
  if (!notesBodyTextarea || notesBodyTextarea.dataset.prediction !== '1') return;
  notesBodyTextarea.value = getNotesTemplate();
  notesBodyTextarea.readOnly = false;
  notesBodyTextarea.dataset.prediction = '';
}

// נועל מחדש את הטלפון המזויף (חוזר ממסך הבית/הפתקים למסך הנעילה)
function relockFakePhone() {
  phoneContainer.classList.remove('unlocking');
  fakeHomescreen.classList.remove('unlocked');
  if (lockIconTrigger) lockIconTrigger.classList.remove('faceid-unlocked');
  if (cameraPunchHole) cameraPunchHole.classList.remove('faceid-unlocked');
  clearCurrentInputs();
  restoreNotesTemplate();
  resetFaceTrick(); // מוחק את תמונת הצופה ומאפס את ספירת הניסיונות
  if (typeof hideFakeMessageBanner === 'function') hideFakeMessageBanner();
  if (typeof endFakeCall === 'function') endFakeCall();
}

// "מוכן לצופה הבא": מנקה את הקוד האחרון, מאפס ניסיונות וחוזר למסך הנעילה
function resetForNextShow() {
  liveReadStopVoice();
  wordPredictExit(true);
  trackEvent('reset_show');
  try {
    localStorage.removeItem(LAST_PIN_KEY);
  } catch (e) {}
  forceAttemptCount = 0;
  resetSettingsTrick();
  relockFakePhone();
  if (typeof hideHoldPeek === 'function') hideHoldPeek();
  refreshSettingsLastCaptured();
  triggerHaptic([30, 40, 30]);
  launchLockscreenNow();
}

function syncNotesRevealUI() {
  const toggle = document.getElementById('toggleNotesReveal');
  const extra = document.getElementById('notesRevealExtra');
  const input = document.getElementById('notesTemplateInput');
  if (toggle) toggle.checked = Boolean(config.notesReveal);
  if (extra) extra.style.display = config.notesReveal ? 'block' : 'none';
  if (input && document.activeElement !== input) input.value = getNotesTemplate();
  document.querySelectorAll('#notesAgeSelector .seg-pill').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.age === String(config.notesAge || '60'));
  });
}

function initNotesReveal() {
  const toggle = document.getElementById('toggleNotesReveal');
  if (toggle) {
    toggle.addEventListener('change', (e) => {
      config.notesReveal = e.target.checked;
      if (config.notesReveal) {
        // החשיפה מופיעה בדף הפתקים, אז עוברים אליו אוטומטית
        config.unlockTargetScreen = 'notes';
        let stored = null;
        try {
          stored = localStorage.getItem(NOTES_BODY_STORAGE_KEY);
        } catch (err) {}
        if (!stored || !/\{(קוד|code)\}/i.test(stored)) {
          try {
            localStorage.setItem(NOTES_BODY_STORAGE_KEY, NOTES_PREDICTION_DEFAULT);
          } catch (err) {}
          if (notesBodyTextarea) notesBodyTextarea.value = NOTES_PREDICTION_DEFAULT;
        }
      }
      saveConfig();
      applyConfigToUI();
      syncNotesRevealUI();
    });
  }
  const input = document.getElementById('notesTemplateInput');
  if (input) {
    input.addEventListener('input', () => {
      try {
        localStorage.setItem(NOTES_BODY_STORAGE_KEY, input.value);
      } catch (e) {}
      if (notesBodyTextarea && notesBodyTextarea.dataset.prediction !== '1') notesBodyTextarea.value = input.value;
      scheduleCloudBackup();
    });
  }
  document.querySelectorAll('#notesAgeSelector .seg-pill').forEach((btn) => {
    btn.addEventListener('click', () => {
      config.notesAge = btn.dataset.age;
      saveConfig();
      syncNotesRevealUI();
    });
  });
  const resetBtn = document.getElementById('resetShowBtn');
  if (resetBtn) resetBtn.addEventListener('click', resetForNextShow);
  syncNotesRevealUI();
}

// ============================================================================
// 22. משוב מהקוסם (תפריט ההגדרות) -> מגיע לאתר הניהול
// ============================================================================
const FEEDBACK_LAST_SENT_KEY = 'magic_feedback_last_sent';

// ---------------- הודעה אישית מהמפתח (תשובה למשוב) ----------------
// נשמרת בטלפון כשהיא מגיעה, ומוצגת רק כשהקוסם נכנס להגדרות - אף פעם לא מעל מסך הנעילה.
const ADMIN_MSG_KEY = 'magic_admin_msg_v1'; // { text, at, seen }

function readAdminMessage() {
  try {
    return JSON.parse(localStorage.getItem(ADMIN_MSG_KEY) || 'null');
  } catch (e) {
    return null;
  }
}

function storeAdminMessage() {
  if (!window.MagicCloud || typeof window.MagicCloud.device.getMyMessage !== 'function') return;
  const msg = window.MagicCloud.device.getMyMessage();
  if (!msg || !msg.text) return;
  const prev = readAdminMessage();
  if (prev && prev.at === msg.at && prev.text === msg.text) return;
  try {
    localStorage.setItem(ADMIN_MSG_KEY, JSON.stringify({ text: msg.text, at: msg.at, seen: false }));
  } catch (e) {}
  renderAdminMessageLast();
  // אם ההגדרות כבר פתוחות - מציגים מיד
  if (setupOverlay && setupOverlay.classList.contains('open')) maybeShowAdminMessage();
}

function renderAdminMessageLast() {
  const box = document.getElementById('adminMsgLast');
  const msg = readAdminMessage();
  if (!box) return;
  if (!msg || !msg.text) {
    box.style.display = 'none';
    return;
  }
  box.innerHTML = '';
  const title = document.createElement('b');
  title.textContent = '💬 הודעה אחרונה מהמפתח:';
  box.appendChild(title);
  box.appendChild(document.createTextNode('\n' + msg.text));
  box.style.display = '';
}

function maybeShowAdminMessage() {
  const msg = readAdminMessage();
  const overlay = document.getElementById('adminMsgOverlay');
  if (!msg || msg.seen || !overlay) return;
  if (!setupOverlay || !setupOverlay.classList.contains('open')) return;
  const updatePopup = document.getElementById('updatePopupOverlay');
  if (updatePopup && updatePopup.style.display !== 'none') return; // נציג בכניסה הבאה
  document.getElementById('adminMsgText').textContent = msg.text;
  overlay.style.display = 'flex';
}

function initAdminMessage() {
  const overlay = document.getElementById('adminMsgOverlay');
  if (!overlay) return;
  const markSeen = () => {
    const msg = readAdminMessage();
    if (msg) {
      msg.seen = true;
      try {
        localStorage.setItem(ADMIN_MSG_KEY, JSON.stringify(msg));
      } catch (e) {}
    }
    overlay.style.display = 'none';
  };
  document.getElementById('adminMsgOkBtn').addEventListener('click', markSeen);
  document.getElementById('adminMsgReplyBtn').addEventListener('click', () => {
    markSeen();
    if (typeof showSettingsTab === 'function') showSettingsTab('more');
    const input = document.getElementById('feedbackInput');
    if (input) {
      input.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setTimeout(() => input.focus(), 400);
    }
  });
  renderAdminMessageLast();
}

function initFeedbackBox() {
  const input = document.getElementById('feedbackInput');
  const btn = document.getElementById('feedbackSendBtn');
  const statusEl = document.getElementById('feedbackStatus');
  if (!input || !btn) return;

  const setStatus = (msg, color) => {
    if (!statusEl) return;
    statusEl.textContent = msg || '';
    statusEl.style.color = color || '';
  };

  btn.addEventListener('click', async () => {
    const text = input.value.trim();
    if (text.length < 2) {
      setStatus('כתוב משהו לפני השליחה', '#f87171');
      return;
    }
    const last = Number(localStorage.getItem(FEEDBACK_LAST_SENT_KEY) || 0);
    if (Date.now() - last < 30 * 1000) {
      setStatus('המשוב הקודם נשלח הרגע, נסה שוב בעוד חצי דקה', '#f59e0b');
      return;
    }
    if (!window.MagicCloud || !window.MagicCloud.isConfigured()) {
      setStatus('המערכת לא מחוברת כרגע', '#f87171');
      return;
    }
    btn.disabled = true;
    btn.textContent = 'שולח...';
    setStatus('');
    try {
      await window.MagicCloud.device.sendFeedback({
        text,
        appVersion: getInstalledAppVersion(),
        os: config.osTheme,
        model: config.deviceModel
      });
      try {
        localStorage.setItem(FEEDBACK_LAST_SENT_KEY, String(Date.now()));
      } catch (e) {}
      input.value = '';
      triggerHaptic(30);
      setStatus('תודה! המשוב נשלח ✓', '#22c55e');
    } catch (err) {
      setStatus(err && err.network ? 'אין חיבור לאינטרנט, נסה שוב' : 'השליחה נכשלה, נסה שוב', '#f87171');
    } finally {
      btn.disabled = false;
      btn.textContent = 'שלח משוב';
    }
  });
}

// ============================================================================
// 30. סטטיסטיקת שימוש: באילו קסמים הקוסם משתמש (נשלח לאתר הניהול בלבד)
// ----------------------------------------------------------------------------
// נשמרים רק מונים (כמה פעמים כל פיצ'ר הופעל) - בלי קודים, בלי תמונות ובלי פנים.
// ============================================================================
const STATS_KEY = 'magic_stats_v1';

function readStats() {
  try {
    const s = JSON.parse(localStorage.getItem(STATS_KEY) || 'null');
    if (s && typeof s === 'object' && s.e) return s;
  } catch (e) {}
  return { e: {}, since: new Date().toISOString().slice(0, 10) };
}

function trackEvent(name) {
  if (config && config.practiceMode) return; // תרגול לא נספר בסטטיסטיקה
  try {
    const s = readStats();
    s.e[name] = Math.min(999999, (Number(s.e[name]) || 0) + 1);
    localStorage.setItem(STATS_KEY, JSON.stringify(s));
  } catch (e) {}
}

function getStatsForReport() {
  const s = readStats();
  // גם אילו פיצ'רים מופעלים כרגע בהגדרות
  const on = [];
  if (config.watchPeek) on.push('watch');
  if (config.remotePeek) on.push('remote');
  if (config.revealEnabled) on.push('reveal');
  if (config.notesReveal) on.push('notes');
  if (config.hapticPeek) on.push('haptic');
  if (config.holdPeek) on.push('hold');
  if (config.chameleonClock) on.push('clock');
  if (config.faceIdEnrolled) on.push('face');
  if (config.fingerprintEnrolled) on.push('fp');
  if (config.uiLang === 'en') on.push('english');
  if (config.callReveal) on.push('call');
  if (config.faceTrick) on.push('facetrick');
  if (config.settingsTrick) on.push('settingstrick');
  if (config.birthdayTrick) on.push('birthday');
  if (config.liveRead) on.push('liveread');
  if (config.wordPredict) on.push('wordpredict');
  if (config.cardTrick) on.push('cardtrick');
  if (config.remoteTrick) on.push('remotetrick');
  if (config.galleryPredict) on.push('gallerypredict');
  if (config.unlockTargetScreen === 'gallery') on.push('gallery');
  if (config.unlockTargetScreen === 'search') on.push('search');
  try {
    return JSON.stringify({ e: s.e, since: s.since, os: config.osTheme === 'ios' ? 'ios' : currentAndroidBrand(), model: config.deviceModel, mode: config.unlockMode, on });
  } catch (e) {
    return '';
  }
}

// ============================================================================
// 31. דיווח תקלות אוטומטי לאתר הניהול
// ============================================================================
const ERR_DAY_KEY = 'magic_err_day_v1';
let errorsSentThisSession = 0;
const errorsSeen = new Set();

function reportAppError(msg, src) {
  try {
    const text = String(msg || '').slice(0, 500);
    if (!text || errorsSeen.has(text) || errorsSentThisSession >= 3) return;
    // שגיאות של סקריפטים חיצוניים בלי פרטים - לא מועילות
    if (text === 'Script error.' || text === 'Script error') return;
    const today = new Date().toISOString().slice(0, 10);
    const day = JSON.parse(localStorage.getItem(ERR_DAY_KEY) || '{}');
    if (day.d !== today) {
      day.d = today;
      day.n = 0;
    }
    if (day.n >= 10) return;
    errorsSeen.add(text);
    errorsSentThisSession += 1;
    day.n += 1;
    localStorage.setItem(ERR_DAY_KEY, JSON.stringify(day));
    if (!window.MagicCloud || !window.MagicCloud.isConfigured() || !window.MagicCloud.device.reportError) return;
    window.MagicCloud.device
      .reportError({ msg: text, src: String(src || '').slice(0, 200), appVersion: getInstalledAppVersion(), model: config.deviceModel })
      .catch(() => {});
  } catch (e) {}
}

window.addEventListener('error', (e) => {
  const src = e.filename ? `${String(e.filename).split('/').pop()}:${e.lineno || 0}` : '';
  reportAppError(e.message || (e.error && e.error.message), src);
});
window.addEventListener('unhandledrejection', (e) => {
  const r = e.reason;
  // תקלות רשת הן לא באג - לא מדווחים
  if (r && (r.network || r.status === 0)) return;
  reportAppError('Promise: ' + (r && r.message ? r.message : String(r)), (r && r.stack ? String(r.stack).split('\n')[1] || '' : '').trim());
});

// ============================================================================
// 32. הצצה מטלפון שני: הקוד שהצופה מקליד מופיע מיד בטלפון אחר (של עוזר / בכיס)
// ----------------------------------------------------------------------------
// הטלפון השני פותח קישור סודי (peek.html#ערוץ) בדפדפן - לא צריך להתקין כלום.
// ============================================================================
const LIVE_CHANNEL_KEY = 'magic_live_channel_v1';
const PEEK_PAGE_URL = 'https://tzur2010.github.io/app-lockscreen/peek.html';

function newLiveChannel() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  const bytes = new Uint8Array(12);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => chars[b % chars.length]).join('');
}

function getLiveChannel() {
  let ch = '';
  try {
    ch = localStorage.getItem(LIVE_CHANNEL_KEY) || '';
  } catch (e) {}
  if (!/^[A-Za-z0-9]{12}$/.test(ch)) {
    ch = newLiveChannel();
    try {
      localStorage.setItem(LIVE_CHANNEL_KEY, ch);
    } catch (e) {}
  }
  return ch;
}

function getLivePeekLink() {
  return `${PEEK_PAGE_URL}#${getLiveChannel()}`;
}

function canUseRemotePeek() {
  return Boolean(window.MagicCloud && window.MagicCloud.isConfigured() && window.MagicCloud.device.hasLive && window.MagicCloud.device.hasLive());
}

// כל קוד חדש מקבל מספר; ניסיון חוזר של קוד ישן נעצר ברגע שהוקלד קוד חדש יותר
let liveSendSeq = 0;
const LIVE_RETRY_DELAYS_MS = [700, 1500, 3000];

async function sendCodeToSecondPhone(code, mode, isTest) {
  if ((!config.remotePeek && !isTest) || !code || !canUseRemotePeek()) return false;
  const m = String(mode || '').toUpperCase();
  if (!isTest) trackEvent('remote_peek');
  const mySeq = ++liveSendSeq;
  const payloadCode = formatCodeForDisplay(code, m);
  for (let attempt = 0; attempt <= LIVE_RETRY_DELAYS_MS.length; attempt++) {
    if (mySeq !== liveSendSeq) return false;
    try {
      await window.MagicCloud.device.pushLiveCode(getLiveChannel(), payloadCode, isTest ? 'TEST' : m);
      return true;
    } catch (e) {
      if (attempt === LIVE_RETRY_DELAYS_MS.length) return false;
      await new Promise((r) => setTimeout(r, LIVE_RETRY_DELAYS_MS[attempt]));
    }
  }
  return false;
}

function syncRemotePeekUI() {
  const toggle = document.getElementById('toggleRemotePeek');
  const extra = document.getElementById('remotePeekExtra');
  const linkEl = document.getElementById('remotePeekLink');
  if (toggle) toggle.checked = Boolean(config.remotePeek);
  if (extra) extra.style.display = config.remotePeek ? 'block' : 'none';
  if (linkEl) linkEl.textContent = getLivePeekLink();
}

function initRemotePeek() {
  const toggle = document.getElementById('toggleRemotePeek');
  const status = document.getElementById('remotePeekStatus');
  const setStatus = (t, color) => {
    if (!status) return;
    status.textContent = t || '';
    status.style.color = color || '';
  };
  if (!toggle) return;
  toggle.addEventListener('change', () => {
    config.remotePeek = toggle.checked;
    saveConfig();
    syncRemotePeekUI();
  });
  const copyBtn = document.getElementById('remotePeekCopyBtn');
  if (copyBtn) {
    copyBtn.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(getLivePeekLink());
        setStatus('הקישור הועתק ✓', '#22c55e');
      } catch (e) {
        setStatus('לא הצלחתי להעתיק - סמן את הקישור והעתק ידנית', '#f59e0b');
      }
    });
  }
  const waBtn = document.getElementById('remotePeekWaBtn');
  if (waBtn) {
    waBtn.addEventListener('click', () => {
      const text = `פתח את הקישור הזה בטלפון השני והשאר אותו פתוח:\n${getLivePeekLink()}`;
      const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
      let opened = false;
      try {
        if (window.AndroidNative && typeof window.AndroidNative.openShareUrl === 'function') opened = window.AndroidNative.openShareUrl(url);
      } catch (e) {}
      if (!opened) window.open(url, '_blank');
    });
  }
  const testBtn = document.getElementById('remotePeekTestBtn');
  if (testBtn) {
    testBtn.addEventListener('click', async () => {
      setStatus('שולח...');
      const ok = await sendCodeToSecondPhone('1234', 'PIN', true);
      setStatus(ok ? 'נשלח ✓ בטלפון השני אמור להופיע 1234' : 'השליחה נכשלה - בדוק חיבור לאינטרנט', ok ? '#22c55e' : '#f87171');
    });
  }
  const newBtn = document.getElementById('remotePeekNewBtn');
  if (newBtn) {
    newBtn.addEventListener('click', () => {
      if (!confirm('ליצור קישור חדש? הקישור הישן יפסיק לקבל קודים.')) return;
      try {
        localStorage.setItem(LIVE_CHANNEL_KEY, newLiveChannel());
      } catch (e) {}
      syncRemotePeekUI();
      setStatus('נוצר קישור חדש - שלח אותו שוב לטלפון השני', '#f59e0b');
    });
  }
  syncRemotePeekUI();
}

// ============================================================================
// 33. בחירת שפה (עברית / English)
// ============================================================================
function setUiLanguage(lang) {
  const next = lang === 'en' ? 'en' : 'he';
  if ((config.uiLang || 'he') === next) return;
  // טקסטים שלא שונו ע"י הקוסם מוחלפים לברירת המחדל בשפה החדשה
  const toEn = next === 'en';
  if (config.revealText === (toEn ? REVEAL_TEXT_DEFAULT_HE : REVEAL_TEXT_DEFAULT_EN)) {
    config.revealText = toEn ? REVEAL_TEXT_DEFAULT_EN : REVEAL_TEXT_DEFAULT_HE;
  }
  if (config.revealSender === (toEn ? 'אמא' : 'Mom')) config.revealSender = toEn ? 'Mom' : 'אמא';
  try {
    const notes = localStorage.getItem(NOTES_BODY_STORAGE_KEY);
    if (notes === (toEn ? NOTES_PREDICTION_DEFAULT_HE : NOTES_PREDICTION_DEFAULT_EN)) {
      localStorage.setItem(NOTES_BODY_STORAGE_KEY, toEn ? NOTES_PREDICTION_DEFAULT_EN : NOTES_PREDICTION_DEFAULT_HE);
    }
  } catch (e) {}
  config.uiLang = next;
  saveConfig();
  // טוענים מחדש כדי שכל המסכים יוצגו בשפה החדשה (נשארים בהגדרות)
  try {
    sessionStorage.setItem('magic_reopen_settings', '1');
  } catch (e) {}
  location.reload();
}

function initLanguage() {
  const row = document.getElementById('uiLangSelector');
  if (!row) return;
  row.querySelectorAll('.seg-pill').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.lang === (config.uiLang || 'he'));
    btn.addEventListener('click', () => setUiLanguage(btn.dataset.lang));
  });
  // אחרי החלפת שפה חוזרים ישר להגדרות, ללשונית "עוד"
  let reopen = false;
  try {
    reopen = sessionStorage.getItem('magic_reopen_settings') === '1';
    sessionStorage.removeItem('magic_reopen_settings');
  } catch (e) {}
  if (reopen) {
    setTimeout(() => {
      openSettingsSheet();
      if (typeof showSettingsTab === 'function') showSettingsTab('more');
    }, 1300);
  }
}

// ============================================================================
// 34. חשיפה בגלריה: התמונה האחרונה היא "צילום" של פתק בכתב יד עם הקוד
// ============================================================================
// מספר אקראי קבוע לפי זרע (כדי שאותו קוד ייתן אותה תמונה ואותה שעה)
function seededRandom(seedText) {
  let h = 2166136261;
  for (let i = 0; i < seedText.length; i++) h = Math.imul(h ^ seedText.charCodeAt(i), 16777619);
  return () => {
    h += 0x6d2b79f5;
    let x = Math.imul(h ^ (h >>> 15), 1 | h);
    x ^= x + Math.imul(x ^ (x >>> 7), 61 | x);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}

const HANDWRITING_FONT = '"Segoe Print", "Bradley Hand", "Marker Felt", "Comic Sans MS", "Dancing Script", cursive';

function drawNotePhoto(canvas, text, rand) {
  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;

  // שולחן עץ חם
  const desk = ctx.createLinearGradient(0, 0, w, h);
  desk.addColorStop(0, '#8a5a36');
  desk.addColorStop(0.5, '#a06a40');
  desk.addColorStop(1, '#6e4528');
  ctx.fillStyle = desk;
  ctx.fillRect(0, 0, w, h);
  ctx.globalAlpha = 0.12;
  for (let i = 0; i < 60; i++) {
    ctx.strokeStyle = rand() > 0.5 ? '#3b2414' : '#c08a5a';
    ctx.lineWidth = 1 + rand() * 3;
    ctx.beginPath();
    const y = rand() * h;
    ctx.moveTo(0, y);
    ctx.bezierCurveTo(w * 0.3, y + (rand() - 0.5) * 40, w * 0.7, y + (rand() - 0.5) * 40, w, y + (rand() - 0.5) * 30);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;

  // פתק צהוב מעט מסובב, עם צל
  const noteSize = w * 0.72;
  ctx.save();
  ctx.translate(w / 2 + (rand() - 0.5) * 40, h / 2 + (rand() - 0.5) * 60);
  ctx.rotate(((rand() - 0.5) * 9 * Math.PI) / 180);
  ctx.shadowColor = 'rgba(0,0,0,0.45)';
  ctx.shadowBlur = 38;
  ctx.shadowOffsetY = 18;
  const paper = ctx.createLinearGradient(-noteSize / 2, -noteSize / 2, noteSize / 2, noteSize / 2);
  paper.addColorStop(0, '#fff6a8');
  paper.addColorStop(1, '#f7e477');
  ctx.fillStyle = paper;
  ctx.fillRect(-noteSize / 2, -noteSize / 2, noteSize, noteSize);
  ctx.shadowColor = 'transparent';
  // פס הדבק העליון כהה מעט
  ctx.fillStyle = 'rgba(0,0,0,0.05)';
  ctx.fillRect(-noteSize / 2, -noteSize / 2, noteSize, noteSize * 0.12);

  // כתב יד בעט כחול
  const clean = String(text || '').slice(0, 40);
  let size = noteSize * (clean.length <= 6 ? 0.26 : clean.length <= 12 ? 0.15 : 0.1);
  ctx.font = `${size}px ${HANDWRITING_FONT}`;
  while (ctx.measureText(clean).width > noteSize * 0.84 && size > 20) {
    size -= 4;
    ctx.font = `${size}px ${HANDWRITING_FONT}`;
  }
  ctx.fillStyle = '#1e3a8a';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.rotate(((rand() - 0.5) * 4 * Math.PI) / 180);
  ctx.fillText(clean, 0, noteSize * 0.04);
  // קו תחתון בכתב יד
  ctx.strokeStyle = 'rgba(30,58,138,0.75)';
  ctx.lineWidth = size * 0.05;
  ctx.lineCap = 'round';
  ctx.beginPath();
  const half = Math.min(noteSize * 0.4, ctx.measureText(clean).width / 2 + 10);
  ctx.moveTo(-half, size * 0.62);
  ctx.quadraticCurveTo(0, size * 0.62 + (rand() - 0.5) * 18, half, size * 0.55);
  ctx.stroke();
  ctx.restore();

  // מראה של צילום: הצללה בקצוות ורעש עדין
  const vignette = ctx.createRadialGradient(w / 2, h / 2, w * 0.3, w / 2, h / 2, w * 0.85);
  vignette.addColorStop(0, 'rgba(0,0,0,0)');
  vignette.addColorStop(1, 'rgba(0,0,0,0.38)');
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, w, h);
  const img = ctx.getImageData(0, 0, w, h);
  for (let i = 0; i < img.data.length; i += 4) {
    const n = (rand() - 0.5) * 14;
    img.data[i] += n;
    img.data[i + 1] += n;
    img.data[i + 2] += n;
  }
  ctx.putImageData(img, 0, 0);
}

// תמונות "רגילות" קודמות בגלריה (שקיעה, ים, אוכל...) - רק צבעים, בלי תוכן אמיתי
const GALLERY_THUMB_PALETTES = [
  ['#f97316', '#fde68a'], ['#0ea5e9', '#e0f2fe'], ['#16a34a', '#bbf7d0'], ['#7c3aed', '#fbcfe8'],
  ['#334155', '#94a3b8'], ['#b45309', '#fef3c7'], ['#be123c', '#fecdd3'], ['#0f766e', '#99f6e4']
];

function buildGalleryStrip(rand, noteCanvas) {
  const strip = document.getElementById('galleryStrip');
  if (!strip) return;
  strip.innerHTML = '';
  for (let i = 0; i < 7; i++) {
    const thumb = document.createElement('canvas');
    thumb.width = 80;
    thumb.height = 80;
    thumb.className = 'gallery-thumb';
    const c = thumb.getContext('2d');
    const pal = GALLERY_THUMB_PALETTES[Math.floor(rand() * GALLERY_THUMB_PALETTES.length)];
    const g = c.createLinearGradient(0, 0, 0, 80);
    g.addColorStop(0, pal[0]);
    g.addColorStop(1, pal[1]);
    c.fillStyle = g;
    c.fillRect(0, 0, 80, 80);
    c.fillStyle = 'rgba(255,255,255,0.25)';
    c.beginPath();
    c.arc(20 + rand() * 40, 20 + rand() * 40, 8 + rand() * 18, 0, Math.PI * 2);
    c.fill();
    strip.appendChild(thumb);
  }
  const current = document.createElement('canvas');
  current.width = 80;
  current.height = 80;
  current.className = 'gallery-thumb active';
  current.getContext('2d').drawImage(noteCanvas, 0, noteCanvas.height / 2 - noteCanvas.width / 2, noteCanvas.width, noteCanvas.width, 0, 0, 80, 80);
  strip.appendChild(current);
  strip.scrollLeft = isEnglishUi() ? strip.scrollWidth : -strip.scrollWidth;
}

function showGalleryReveal(code) {
  const canvas = document.getElementById('galleryPhoto');
  if (!canvas) return;
  const value = code || '----';
  const text = fillCodePlaceholder(config.galleryText || '{קוד}', value);
  const rand = seededRandom(value + '|' + new Date().toDateString());
  drawNotePhoto(canvas, text, rand);
  buildGalleryStrip(rand, canvas);
  // "צולם אתמול" בשעת ערב
  const hh = String(19 + Math.floor(rand() * 4)).padStart(2, '0');
  const mm = String(Math.floor(rand() * 60)).padStart(2, '0');
  const dayEl = document.getElementById('galleryDay');
  const timeEl = document.getElementById('galleryTime');
  if (dayEl) dayEl.textContent = 'אתמול';
  if (timeEl) timeEl.textContent = `${hh}:${mm}`;
  trackEvent('gallery_reveal');
}

// ============================================================================
// 35. חשיפה בשיחה נכנסת
// ============================================================================
var callRevealTimer = null;
var callRingTimer = null;
var callDurationTimer = null;
var callAudioCtx = null;

function playRingBurst() {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    if (!callAudioCtx) callAudioCtx = new AudioCtx();
    if (callAudioCtx.state === 'suspended') callAudioCtx.resume().catch(() => {});
    const t0 = callAudioCtx.currentTime;
    // מנגינת צלצול קצרה (4 צלילים רכים)
    [659, 784, 988, 784].forEach((freq, i) => {
      const osc = callAudioCtx.createOscillator();
      const gain = callAudioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      const start = t0 + i * 0.16;
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(0.12, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.15);
      osc.connect(gain);
      gain.connect(callAudioCtx.destination);
      osc.start(start);
      osc.stop(start + 0.16);
    });
  } catch (e) {}
}

function stopRinging() {
  clearInterval(callRingTimer);
  callRingTimer = null;
  try {
    if (navigator.vibrate) navigator.vibrate(0);
  } catch (e) {}
}

function scheduleCallReveal(code, delayOverrideMs = null) {
  clearTimeout(callRevealTimer);
  const delay = delayOverrideMs !== null ? delayOverrideMs : Math.max(1, Number(config.callDelaySec) || 4) * 1000;
  callRevealTimer = setTimeout(() => showFakeCall(code), delay);
}

function showFakeCall(code) {
  const screen = document.getElementById('fakeCallScreen');
  if (!screen) return;
  clearTimeout(callRevealTimer);
  const name = fillCodePlaceholder(config.callName || '{קוד}', code || '----');
  document.getElementById('fakeCallName').textContent = name;
  document.getElementById('fakeCallLabel').textContent = 'שיחה נכנסת';
  paintAvatar(document.getElementById('fakeCallAvatar'), name, '');
  document.getElementById('fakeCallActions').style.display = '';
  document.getElementById('fakeCallInCall').style.display = 'none';
  screen.classList.toggle('ios', config.osTheme === 'ios');
  screen.style.display = 'flex';
  void screen.offsetWidth;
  screen.classList.add('show');
  stopRinging();
  const ring = () => {
    playRingBurst();
    triggerHaptic([500, 300, 500]);
  };
  ring();
  callRingTimer = setInterval(ring, 2200);
  trackEvent('call_reveal');
}

function answerFakeCall() {
  stopRinging();
  document.getElementById('fakeCallActions').style.display = 'none';
  document.getElementById('fakeCallInCall').style.display = '';
  document.getElementById('fakeCallLabel').textContent = '';
  const timerEl = document.getElementById('fakeCallTimer');
  const started = Date.now();
  clearInterval(callDurationTimer);
  const tick = () => {
    const s = Math.floor((Date.now() - started) / 1000);
    timerEl.textContent = `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
  };
  tick();
  callDurationTimer = setInterval(tick, 1000);
}

function endFakeCall() {
  clearTimeout(callRevealTimer);
  clearInterval(callDurationTimer);
  stopRinging();
  const screen = document.getElementById('fakeCallScreen');
  if (!screen || screen.style.display === 'none') return;
  screen.classList.remove('show');
  setTimeout(() => {
    if (!screen.classList.contains('show')) screen.style.display = 'none';
  }, 250);
}

function initCallReveal() {
  const bind = (id, fn) => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('click', (e) => {
      e.stopPropagation();
      fn();
    });
  };
  bind('fakeCallAccept', answerFakeCall);
  bind('fakeCallDecline', endFakeCall);
  bind('fakeCallEnd', endFakeCall);
}

// ============================================================================
// 36. הגדרות החשיפות החדשות + מצב תרגול
// ============================================================================
function syncNewRevealsUI() {
  const galleryExtra = document.getElementById('galleryRevealExtra');
  if (galleryExtra) galleryExtra.style.display = config.unlockTargetScreen === 'gallery' ? 'block' : 'none';
  const galleryInput = document.getElementById('galleryTextInput');
  if (galleryInput && document.activeElement !== galleryInput) galleryInput.value = config.galleryText || '{קוד}';
  const searchExtra = document.getElementById('searchRevealExtra');
  if (searchExtra) searchExtra.style.display = config.unlockTargetScreen === 'search' ? 'block' : 'none';
  const searchInput = document.getElementById('searchTextInput');
  if (searchInput && document.activeElement !== searchInput) searchInput.value = config.searchText || '{קוד}';

  const stToggle = document.getElementById('toggleSettingsTrick');
  if (stToggle) stToggle.checked = Boolean(config.settingsTrick);
  const stExtra = document.getElementById('settingsTrickExtra');
  if (stExtra) stExtra.style.display = config.settingsTrick ? 'block' : 'none';
  const stName = document.getElementById('settingsTrickName');
  if (stName && document.activeElement !== stName) {
    stName.value = config.settingsTrickName || '';
    stName.placeholder = settingsTrickOwnerName();
  }

  const faceToggle = document.getElementById('toggleFaceTrick');
  if (faceToggle) faceToggle.checked = Boolean(config.faceTrick);
  const faceExtra = document.getElementById('faceTrickExtra');
  if (faceExtra) faceExtra.style.display = config.faceTrick ? 'block' : 'none';
  document.querySelectorAll('#faceTrickFailsSelector .seg-pill').forEach((btn) => {
    btn.classList.toggle('active', Number(btn.dataset.fails) === faceTrickFails());
  });

  // 🃏 / 🗣️ (אנדרואיד בלבד)
  const voiceOk = hasNativeWordListen();
  const ctBlock = document.getElementById('cardTrickBlock');
  if (ctBlock) ctBlock.style.display = 'none';
  const rtBlock = document.getElementById('remoteTrickBlock');
  if (rtBlock) rtBlock.style.display = 'none';
  const ctToggle = document.getElementById('toggleCardTrick');
  if (ctToggle) ctToggle.checked = Boolean(config.cardTrick);
  const ctExtra = document.getElementById('cardTrickExtra');
  if (ctExtra) ctExtra.style.display = config.cardTrick ? 'block' : 'none';
  const rtToggle = document.getElementById('toggleRemoteTrick');
  if (rtToggle) rtToggle.checked = Boolean(config.remoteTrick);
  // 📸 התמונה כבר הייתה שם
  const gpBlock = document.getElementById('galleryPredictBlock');
  if (gpBlock) gpBlock.style.display = hasNativeGalleryPredict() && hasNativeWordListen() ? '' : 'none';
  const gpToggle = document.getElementById('toggleGalleryPredict');
  if (gpToggle) gpToggle.checked = Boolean(config.galleryPredict);
  const gpExtra = document.getElementById('galleryPredictExtra');
  if (gpExtra) gpExtra.style.display = config.galleryPredict ? 'block' : 'none';
  document.querySelectorAll('#galleryPredictAgoSelector .seg-pill').forEach((btn) => {
    btn.classList.toggle('active', Number(btn.dataset.gpago) === (Number(config.galleryPredictAgo) || 2));
  });
  const gpSrc = config.galleryPredictSource === 'code' ? 'code' : 'voice';
  document.querySelectorAll('#galleryPredictSourceSelector .seg-pill').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.gpsrc === gpSrc);
  });
  const gpSrcNote = document.getElementById('galleryPredictSourceNote');
  if (gpSrcNote) {
    gpSrcNote.textContent = gpSrc === 'code'
      ? '"תחשוב על מספר ותקליד אותו כקוד." הטלפון נפתח, ובגלריה פתק עם בדיוק המספר הזה. בלי מיקרופון ובלי אינטרנט - תמיד עובד. (הספרות בכתב היד שלך, אם כתבת אותן)'
      : 'הצופה אומר מילה בקול. הכי אמין עם מילים רגילות: חיה, עיר, צבע, פרי. שמות של מפורסמים - פחות.';
  }
  // במצב "קוד" לא צריך את שדות המיקרופון
  document.querySelectorAll('#galleryPredictExtra .voice-lang-selector, #galleryPredictExtra .heard-log-box').forEach((el) => {
    el.style.display = gpSrc === 'code' ? 'none' : '';
  });
  const gpTpl = document.getElementById('galleryPredictTplInput');
  if (gpTpl && document.activeElement !== gpTpl) gpTpl.value = config.galleryPredictTpl || '{מילה}';
  const hlList = document.getElementById('heardLogList');
  if (hlList) {
    let arr = [];
    try { arr = JSON.parse(localStorage.getItem(HEARD_LOG_KEY) || '[]'); } catch (e) {}
    hlList.innerHTML = '';
    if (!arr.length) hlList.textContent = 'עוד לא נשמע כלום. "שמור וסגור" ונסה.';
    arr.forEach((it) => {
      const row = document.createElement('div');
      row.className = 'heard-log-row';
      const a = document.createElement('span');
      a.textContent = it.t + '  "' + it.s + '"';
      const b = document.createElement('b');
      b.textContent = it.w;
      row.appendChild(a);
      row.appendChild(b);
      hlList.appendChild(row);
    });
  }
  const hwSt = document.getElementById('handwritingStatus');
  if (hwSt) {
    const hw = loadHandwriting();
    const he = HAND_LETTERS.filter((l) => /[֐-׿]/.test(l));
    const doneHe = he.filter((l) => hw[l]).length;
    const doneAll = HAND_LETTERS.filter((l) => hw[l]).length;
    hwSt.textContent = doneHe === he.length
      ? `✓ כתב היד שלך מוכן (${doneAll}/${HAND_LETTERS.length}) - הפתק ייכתב בכתב היד שלך`
      : doneAll
        ? `חסרות עוד ${he.length - doneHe} אותיות. מילה עם אות חסרה תיכתב בגופן רגיל.`
        : 'בלי כתב יד - הפתק ייכתב בגופן שנראה כמו עט.';
    hwSt.className = 'toggle-sub-desc live-read-status ' + (doneHe === he.length ? 'good' : doneAll ? 'warn' : '');
  }
  const ppSt = document.getElementById('predictPaperStatus');
  if (ppSt) {
    let hasPaper = false;
    try { hasPaper = Boolean(localStorage.getItem(PREDICT_PAPER_KEY)); } catch (e) {}
    ppSt.textContent = hasPaper ? '✓ הדף שלך נשמר - הפתק ייכתב עליו' : 'בלי צילום - הפתק ייכתב על דף מחברת על שולחן עץ.';
    ppSt.className = 'toggle-sub-desc live-read-status ' + (hasPaper ? 'good' : '');
  }
  const rtExtra = document.getElementById('remoteTrickExtra');
  if (rtExtra) rtExtra.style.display = config.remoteTrick ? 'block' : 'none';
  const rWord = document.getElementById('remoteWordInput');
  if (rWord && document.activeElement !== rWord) rWord.value = config.remoteWord || 'וואלה';
  const rTitle = document.getElementById('remoteNotifTitleInput');
  if (rTitle && document.activeElement !== rTitle) rTitle.value = config.remoteNotifTitle || 'אמא';
  const rText = document.getElementById('remoteNotifTextInput');
  if (rText && document.activeElement !== rText) rText.value = config.remoteNotifText || '';
  const rIsPhoto = config.remoteAction === 'photo';
  document.querySelectorAll('#remoteActionSelector .seg-pill').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.raction === (rIsPhoto ? 'photo' : 'notif'));
  });
  const rNotifF = document.getElementById('remoteNotifFields');
  if (rNotifF) rNotifF.style.display = rIsPhoto ? 'none' : '';
  const rPhotoF = document.getElementById('remotePhotoFields');
  if (rPhotoF) rPhotoF.style.display = rIsPhoto ? '' : 'none';
  const rPhotoSt = document.getElementById('remotePhotoStatus');
  if (rPhotoSt) {
    let has = false;
    try { has = Boolean(localStorage.getItem(REMOTE_PHOTO_KEY)); } catch (e) {}
    rPhotoSt.textContent = has ? '✅ התמונה נשמרה' : '⚠️ עוד לא נבחרה תמונה';
    rPhotoSt.className = 'toggle-sub-desc live-read-status ' + (has ? 'good' : 'bad');
  }
  document.querySelectorAll('.voice-lang-selector .seg-pill').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.vlang === voiceLang());
  });

  const wpBlock = document.getElementById('wordPredictBlock');
  if (wpBlock) wpBlock.style.display = 'none';
  const wpToggle = document.getElementById('toggleWordPredict');
  if (wpToggle) wpToggle.checked = Boolean(config.wordPredict);
  const wpExtra = document.getElementById('wordPredictExtra');
  if (wpExtra) wpExtra.style.display = config.wordPredict ? 'block' : 'none';
  const wpTpl = document.getElementById('wordPredictTplInput');
  if (wpTpl && document.activeElement !== wpTpl) wpTpl.value = config.wordPredictTpl || '{מילה}';
  document.querySelectorAll('#wordPredictModeSelector .seg-pill').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.wpmode === wordPredictMode());
  });
  const wpNotifFields = document.getElementById('wordPredictNotifFields');
  if (wpNotifFields) wpNotifFields.style.display = wordPredictMode() === 'notification' ? '' : 'none';
  const wpWpFields = document.getElementById('wordPredictWpFields');
  if (wpWpFields) wpWpFields.style.display = wordPredictMode() === 'wallpaper' ? '' : 'none';
  const wpWpStatus = document.getElementById('wordWallpaperStatus');
  if (wpWpStatus) {
    let hasClean = false;
    try { hasClean = Boolean(localStorage.getItem(WORD_WALLPAPER_KEY)); } catch (e) {}
    wpWpStatus.textContent = hasClean
      ? (isEnglishUi() ? '✅ Original photo saved' : '✅ התמונה המקורית נשמרה')
      : (isEnglishUi() ? '⚠️ Pick the original photo from the gallery - not a screenshot' : '⚠️ בחר את התמונה המקורית מהגלריה - לא צילום מסך');
    wpWpStatus.classList.toggle('ok', hasClean);
    wpWpStatus.classList.toggle('bad', !hasClean);
  }
  const wpModeNote = document.getElementById('wordPredictModeNote');
  if (wpModeNote) {
    const isEn = isEnglishUi();
    let hasWp = false;
    try { hasWp = Boolean(localStorage.getItem(WORD_WALLPAPER_KEY)); } catch (e) {}
    wpModeNote.textContent = wordPredictMode() === 'wallpaper'
      ? (hasWp
        ? (isEn ? 'The word is written on your photo, exactly where the contact-info line is. Delete the real contact info in the phone settings so there are not two lines.' : 'המילה נכתבת על התמונה שלך, בדיוק במקום של שורת פרטי הקשר. מחק את פרטי הקשר בהגדרות הטלפון, כדי שלא יהיו שתי שורות.')
        : (isEn ? 'Pick the ORIGINAL photo (from the gallery, not a screenshot of the lock screen) - the word is written on it.' : 'בחר את התמונה המקורית (מהגלריה, לא צילום מסך של מסך הנעילה) - עליה נכתבת המילה.'))
      : (isEn ? 'A real notification on the real lock screen.' : 'התראה אמיתית במסך הנעילה האמיתי.');
  }
  const wpTitle = document.getElementById('wordPredictTitleInput');
  if (wpTitle && document.activeElement !== wpTitle) wpTitle.value = config.wordPredictTitle || 'תזכורת';
  document.querySelectorAll('#wordPredictAgoSelector .seg-pill').forEach((btn) => {
    btn.classList.toggle('active', Number(btn.dataset.ago) === (Number(config.wordPredictAgo) || 180));
  });
  document.querySelectorAll('#wordPredictLangSelector .seg-pill').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.wplang === wordPredictLang());
  });

  const lrToggle = document.getElementById('toggleLiveRead');
  if (lrToggle) lrToggle.checked = Boolean(config.liveRead);  const lrExtra = document.getElementById('liveReadExtra');
  if (lrExtra) lrExtra.style.display = config.liveRead ? 'block' : 'none';
  document.querySelectorAll('#liveReadLangSelector .seg-pill').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.lrlang === liveReadLang());
  });
  const lrRecap = document.getElementById('toggleLiveReadRecap');
  if (lrRecap) lrRecap.checked = config.liveReadRecap !== false;
  const lrVoiceRow = document.getElementById('liveReadVoiceRow');
  if (lrVoiceRow) lrVoiceRow.style.display = hasNativeVoiceRepeat() ? '' : 'none';
  const lrVoice = document.getElementById('toggleLiveReadVoice');
  if (lrVoice) lrVoice.checked = Boolean(config.liveReadVoice);

  const bToggle = document.getElementById('toggleBirthdayTrick');
  if (bToggle) bToggle.checked = Boolean(config.birthdayTrick);
  const bExtra = document.getElementById('birthdayTrickExtra');
  if (bExtra) bExtra.style.display = config.birthdayTrick ? 'block' : 'none';
  document.querySelectorAll('#birthdayLenSelector .seg-pill').forEach((btn) => {
    btn.classList.toggle('active', Number(btn.dataset.blen) === birthdayLen());
  });
  document.querySelectorAll('#birthdayOrderSelector .seg-pill').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.border === birthdayOrder());
  });
  const bEx = document.getElementById('birthdayLenExample');
  if (bEx) {
    const isEn = Boolean(window.MagicI18n && window.MagicI18n.isEn);
    const md = birthdayOrder() === 'md';
    const ex = { 4: md ? '0315' : '1503', 6: md ? '031592' : '150392', 8: md ? '03151992' : '15031992' }[birthdayLen()];
    const what = { 4: isEn ? 'sign + next birthday (no age)' : 'מזל + יום הולדת הבא (בלי גיל)', 6: isEn ? 'sign, age, weekday, days lived' : 'מזל, גיל, יום בשבוע, ימים שחי', 8: isEn ? 'sign, age, weekday, days lived' : 'מזל, גיל, יום בשבוע, ימים שחי' }[birthdayLen()];
    const noYear = birthdayLen() === 4;
    const dateTxt = isEn ? (noYear ? 'March 15' : 'March 15, 1992') : (noYear ? '15 במרץ' : '15 במרץ 1992');
    bEx.textContent = `${isEn ? 'Example' : 'דוגמה'}: ${ex} (${dateTxt}) → ${what}`;
  }

  const callToggle = document.getElementById('toggleCallReveal');
  if (callToggle) callToggle.checked = Boolean(config.callReveal);
  const callExtra = document.getElementById('callRevealExtra');
  if (callExtra) callExtra.style.display = config.callReveal ? 'block' : 'none';
  const callInput = document.getElementById('callNameInput');
  if (callInput && document.activeElement !== callInput) callInput.value = config.callName || '{קוד}';
  document.querySelectorAll('#callDelaySelector .seg-pill').forEach((btn) => {
    btn.classList.toggle('active', Number(btn.dataset.delay) === Number(config.callDelaySec || 4));
  });

  const practice = document.getElementById('togglePracticeMode');
  if (practice) practice.checked = Boolean(config.practiceMode);
  document.body.classList.toggle('practice-on', Boolean(config.practiceMode));
}

function initNewReveals() {
  document.querySelectorAll('#unlockTargetSelector .seg-pill').forEach((btn) => btn.addEventListener('click', syncNewRevealsUI));
  const galleryInput = document.getElementById('galleryTextInput');
  if (galleryInput) {
    galleryInput.addEventListener('input', () => {
      config.galleryText = galleryInput.value.slice(0, 40);
      saveConfig();
    });
  }
  const searchTextInput = document.getElementById('searchTextInput');
  if (searchTextInput) {
    searchTextInput.addEventListener('input', () => {
      config.searchText = searchTextInput.value.slice(0, 60);
      saveConfig();
    });
  }
  const stToggle = document.getElementById('toggleSettingsTrick');
  if (stToggle) {
    stToggle.addEventListener('change', () => {
      config.settingsTrick = stToggle.checked;
      saveConfig();
      resetSettingsTrick();
      syncNewRevealsUI();
    });
  }
  // מסך הנעילה האישי: שם הספק וטקסט פרטי קשר (מתעדכן מיד על המסך)
  [['carrierTextInput', 'carrierText', 40], ['lockOwnerInfoInput', 'lockOwnerInfo', 60]].forEach(([id, key, max]) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.value = config[key] || '';
    el.addEventListener('input', () => {
      config[key] = el.value.slice(0, max);
      saveConfig();
      applyConfigToUI();
    });
  });

  const stName = document.getElementById('settingsTrickName');
  if (stName) {
    stName.addEventListener('input', () => {
      config.settingsTrickName = stName.value.slice(0, 40);
      saveConfig();
    });
  }

  const wpToggle = document.getElementById('toggleWordPredict');
  if (wpToggle) {
    wpToggle.addEventListener('change', () => {
      config.wordPredict = wpToggle.checked;
      saveConfig();
      syncNewRevealsUI();
      const st = document.getElementById('wordPredictStatus');
      if (wpToggle.checked && hasNativeWordListen()) {
        if (wordPredictMode() === 'notification' && !wordPredictNotifsAllowed()) {
          try { window.AndroidNative.requestNotificationPermission(); } catch (e) {}
        }
        if (liveReadMicReady()) {
          if (st) { st.textContent = isEnglishUi() ? '✓ Microphone allowed. After "Save & Close" the screen goes black and listens.' : '✓ המיקרופון מאושר. אחרי "שמור וסגור" המסך נהיה שחור ומקשיב.'; st.className = 'toggle-sub-desc live-read-status good'; }
        } else {
          try { window.AndroidNative.requestMicPermission(); } catch (e) {}
        }
      } else if (st) st.textContent = '';
    });
  }
  document.querySelectorAll('#wordPredictModeSelector .seg-pill').forEach((btn) => btn.addEventListener('click', () => {
    config.wordPredictMode = btn.dataset.wpmode === 'notification' ? 'notification' : 'wallpaper';
    saveConfig();
    syncNewRevealsUI();
  }));
  const wpTitleInput = document.getElementById('wordPredictTitleInput');
  if (wpTitleInput) wpTitleInput.addEventListener('input', () => {
    config.wordPredictTitle = wpTitleInput.value.slice(0, 40) || 'תזכורת';
    saveConfig();
  });
  document.querySelectorAll('#wordPredictAgoSelector .seg-pill').forEach((btn) => btn.addEventListener('click', () => {
    config.wordPredictAgo = Number(btn.dataset.ago) || 180;
    saveConfig();
    syncNewRevealsUI();
  }));
  const wpTplInput = document.getElementById('wordPredictTplInput');
  if (wpTplInput) wpTplInput.addEventListener('input', () => {
    config.wordPredictTpl = wpTplInput.value.slice(0, 60) || '{מילה}';
    saveConfig();
  });
  document.querySelectorAll('#wordPredictLangSelector .seg-pill').forEach((btn) => btn.addEventListener('click', () => {
    config.wordPredictLang = btn.dataset.wplang === 'en' ? 'en' : 'he';
    saveConfig();
    syncNewRevealsUI();
  }));

  // 🃏 / 🗣️ הגדרות
  const voiceTrickToggle = (id, key, statusId) => {
    const t = document.getElementById(id);
    if (!t) return;
    t.addEventListener('change', () => {
      config[key] = t.checked;
      saveConfig();
      syncNewRevealsUI();
      const st = document.getElementById(statusId);
      if (!st) return;
      if (!t.checked || !hasNativeWordListen()) {
        st.textContent = '';
        return;
      }
      if (liveReadMicReady()) {
        st.textContent = isEnglishUi() ? '✓ Microphone allowed. Needs internet.' : '✓ המיקרופון מאושר. צריך אינטרנט.';
        st.className = 'toggle-sub-desc live-read-status good';
      } else {
        try { window.AndroidNative.requestMicPermission(); } catch (e) {}
      }
    });
  };
  voiceTrickToggle('toggleCardTrick', 'cardTrick', 'cardTrickStatus');
  voiceTrickToggle('toggleRemoteTrick', 'remoteTrick', 'remoteTrickStatus');
  voiceTrickToggle('toggleGalleryPredict', 'galleryPredict', 'galleryPredictStatus');
  document.querySelectorAll('#galleryPredictSourceSelector .seg-pill').forEach((btn) => btn.addEventListener('click', () => {
    config.galleryPredictSource = btn.dataset.gpsrc === 'code' ? 'code' : 'voice';
    saveConfig();
    syncNewRevealsUI();
  }));
  document.querySelectorAll('#galleryPredictAgoSelector .seg-pill').forEach((btn) => btn.addEventListener('click', () => {
    config.galleryPredictAgo = Number(btn.dataset.gpago) || 360;
    saveConfig();
    syncNewRevealsUI();
  }));
  const gpTplInput = document.getElementById('galleryPredictTplInput');
  if (gpTplInput) gpTplInput.addEventListener('input', () => {
    config.galleryPredictTpl = gpTplInput.value.slice(0, 60) || '{מילה}';
    saveConfig();
  });
  const hwBtn = document.getElementById('handwritingBtn');
  if (hwBtn) hwBtn.addEventListener('click', openHandwritingPad);
  const paperInput = document.getElementById('predictPaperFileInput');
  if (paperInput) paperInput.addEventListener('change', (e) => {
    compressAndStoreImage(e.target.files[0], PREDICT_PAPER_KEY, () => {
      paperInput.value = '';
      syncNewRevealsUI();
    });
  });
  const gpTest = document.getElementById('galleryPredictTestBtn');
  if (gpTest) gpTest.addEventListener('click', async () => {
    const st = document.getElementById('galleryPredictTestStatus');
    if (!hasNativeGalleryPredict()) {
      if (st) { st.textContent = '❌ צריך לעדכן את האפליקציה ("בדוק עדכון").'; st.className = 'toggle-sub-desc live-read-status bad'; }
      return;
    }
    if (st) { st.textContent = '⏳ שומר בגלריה...'; st.className = 'toggle-sub-desc live-read-status'; }
    const url = await galleryPredictSave(isEnglishUi() ? 'test' : 'בדיקה', 'test');
    const pv = document.getElementById('galleryPredictPreview');
    if (pv && url) { pv.src = url; pv.style.display = 'block'; }
  });
  document.querySelectorAll('.voice-lang-selector .seg-pill').forEach((btn) => btn.addEventListener('click', () => {
    config.voiceLang = btn.dataset.vlang === 'en' ? 'en' : 'he';
    saveConfig();
    syncNewRevealsUI();
  }));
  document.querySelectorAll('#remoteActionSelector .seg-pill').forEach((btn) => btn.addEventListener('click', () => {
    config.remoteAction = btn.dataset.raction === 'photo' ? 'photo' : 'notif';
    saveConfig();
    syncNewRevealsUI();
  }));
  const bindText = (id, key, max, fallback) => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('input', () => {
      config[key] = el.value.slice(0, max) || fallback;
      saveConfig();
    });
  };
  bindText('remoteWordInput', 'remoteWord', 30, 'וואלה');
  bindText('remoteNotifTitleInput', 'remoteNotifTitle', 40, 'אמא');
  bindText('remoteNotifTextInput', 'remoteNotifText', 120, 'תגיד לחבר שלך שלום 👋');
  const remotePhotoInput = document.getElementById('remotePhotoFileInput');
  if (remotePhotoInput) remotePhotoInput.addEventListener('change', (e) => {
    compressAndStoreImage(e.target.files[0], REMOTE_PHOTO_KEY, () => {
      remotePhotoInput.value = '';
      syncNewRevealsUI();
    });
  });

  const lrToggle = document.getElementById('toggleLiveRead');
  if (lrToggle) {    lrToggle.addEventListener('change', () => {
      config.liveRead = lrToggle.checked;
      // הקריאה עובדת על קוד PIN (ספרות)
      if (lrToggle.checked && config.unlockMode !== 'pin') config.unlockMode = 'pin';
      saveConfig();
      applyConfigToUI();
      syncNewRevealsUI();
      liveReadPrepare();
    });
  }
  document.querySelectorAll('#liveReadLangSelector .seg-pill').forEach((btn) => btn.addEventListener('click', () => {
    config.liveReadLang = btn.dataset.lrlang === 'en' ? 'en' : 'he';
    saveConfig();
    syncNewRevealsUI();
  }));
  const lrRecapToggle = document.getElementById('toggleLiveReadRecap');
  if (lrRecapToggle) lrRecapToggle.addEventListener('change', () => {
    config.liveReadRecap = lrRecapToggle.checked;
    saveConfig();
  });
  const lrVoiceToggle = document.getElementById('toggleLiveReadVoice');
  if (lrVoiceToggle) lrVoiceToggle.addEventListener('change', () => {
    config.liveReadVoice = lrVoiceToggle.checked;
    saveConfig();
    if (lrVoiceToggle.checked && hasNativeVoiceRepeat()) {
      if (liveReadMicReady()) window.onMicPermission(true);
      else {
        try {
          window.AndroidNative.requestMicPermission();
        } catch (e) {}
      }
    } else {
      const st = document.getElementById('liveReadVoiceStatus');
      if (st) st.textContent = '';
    }
  });
  const lrTestBtn = document.getElementById('liveReadTestBtn');
  if (lrTestBtn) lrTestBtn.addEventListener('click', liveReadTest);

  const bToggle = document.getElementById('toggleBirthdayTrick');
  if (bToggle) {
    bToggle.addEventListener('change', () => {
      config.birthdayTrick = bToggle.checked;
      // התאריך הוא קוד מספרי: מעבירים אוטומטית למסך PIN
      if (bToggle.checked && config.unlockMode !== 'pin') {
        config.unlockMode = 'pin';
        if (typeof showToast === 'function') showToast(window.MagicI18n && window.MagicI18n.isEn ? 'Lock type switched to PIN' : 'סוג הנעילה הועבר לקוד PIN');
      }
      saveConfig();
      applyConfigToUI();
      syncNewRevealsUI();
      refreshBirthdayPeek();
    });
  }
  document.querySelectorAll('#birthdayLenSelector .seg-pill').forEach((btn) => btn.addEventListener('click', () => {
    config.birthdayLen = Number(btn.dataset.blen);
    saveConfig();
    applyConfigToUI();
    syncNewRevealsUI();
  }));
  document.querySelectorAll('#birthdayOrderSelector .seg-pill').forEach((btn) => btn.addEventListener('click', () => {
    config.birthdayOrder = btn.dataset.border;
    saveConfig();
    syncNewRevealsUI();
    refreshBirthdayPeek();
  }));

  const faceToggle = document.getElementById('toggleFaceTrick');
  if (faceToggle) {
    faceToggle.addEventListener('change', () => {
      config.faceTrick = faceToggle.checked;
      saveConfig();
      resetFaceTrick();
      syncNewRevealsUI();
      // מבקשים את הרשאת המצלמה כבר עכשיו (בהגדרות) - כדי שהבקשה לא תקפוץ באמצע הופעה
      if (faceToggle.checked && navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        navigator.mediaDevices
          .getUserMedia({ video: { facingMode: 'user' }, audio: false })
          .then((s) => {
            s.getTracks().forEach((t) => t.stop());
            const note = document.getElementById('faceTrickCamNote');
            if (note) note.textContent = '✓ המצלמה מוכנה';
          })
          .catch(() => {
            const note = document.getElementById('faceTrickCamNote');
            if (note) note.textContent = '⚠️ צריך לאשר גישה למצלמה (בהגדרות הטלפון) - אחרת הטלפון ייפתח אבל בלי התמונה של הצופה';
          });
      }
    });
  }
  document.querySelectorAll('#faceTrickFailsSelector .seg-pill').forEach((btn) => {
    btn.addEventListener('click', () => {
      config.faceTrickFails = Number(btn.dataset.fails) || 1;
      saveConfig();
      syncNewRevealsUI();
    });
  });

  const callToggle = document.getElementById('toggleCallReveal');
  if (callToggle) {
    callToggle.addEventListener('change', () => {
      config.callReveal = callToggle.checked;
      saveConfig();
      syncNewRevealsUI();
    });
  }
  const callInput = document.getElementById('callNameInput');
  if (callInput) {
    callInput.addEventListener('input', () => {
      config.callName = callInput.value.slice(0, 40);
      saveConfig();
    });
  }
  document.querySelectorAll('#callDelaySelector .seg-pill').forEach((btn) => {
    btn.addEventListener('click', () => {
      config.callDelaySec = Number(btn.dataset.delay) || 4;
      saveConfig();
      syncNewRevealsUI();
    });
  });
  const callTest = document.getElementById('callTestBtn');
  if (callTest) callTest.addEventListener('click', () => showFakeCall('1234'));

  const practice = document.getElementById('togglePracticeMode');
  if (practice) {
    practice.addEventListener('change', () => {
      config.practiceMode = practice.checked;
      saveConfig();
      syncNewRevealsUI();
    });
  }
  syncNewRevealsUI();
}

// ============================================================================
// 37. שלט רחוק מהטלפון השני (peek.html): פקודות מגיעות בזמן אמת
// ----------------------------------------------------------------------------
// הטלפון ביד הצופה לא רוטט ולא מראה כלום כשמגיעה פקודה.
// ============================================================================
var remoteControlSource = null;
var remoteControlPrimed = false;
var lastRemoteCommandAt = 0;
var liveStateTimer = null;
var lastPublishedState = '';

function publishLiveState() {
  if (!config.remotePeek || !canUseRemotePeek() || !window.MagicCloud.device.pushLiveState) return;
  const key = `${forceUnlockMode}|${getUnlockOnAttempt()}`;
  if (key === lastPublishedState) return;
  window.MagicCloud.device
    .pushLiveState(getLiveChannel(), forceUnlockMode, getUnlockOnAttempt())
    .then(() => {
      lastPublishedState = key;
    })
    .catch(() => {});
}

function scheduleLiveStatePublish() {
  clearTimeout(liveStateTimer);
  liveStateTimer = setTimeout(publishLiveState, 600);
}

function handleRemoteCommand(cmd, val) {
  const lastCode = localStorage.getItem(LAST_PIN_KEY) || '';
  if (cmd === 'force') {
    setForceModeState(Boolean(val));
  } else if (cmd === 'attempt') {
    const n = Math.min(5, Math.max(1, Number(val) || 1));
    config.unlockOnAttempt = n;
    config.unlockAttemptMode = n >= 2 ? 'second' : 'immediate';
    saveConfig();
  } else if (cmd === 'reset') {
    resetForNextShow();
  }
  // 7.8: "חשוף בהודעה" ו"צלצל עכשיו" הוסרו מהשלט - פקודות ישנות מטלפון שני לא עושות כלום
  trackEvent('remote_control');
  lastPublishedState = '';
  scheduleLiveStatePublish();
}

function stopRemoteControl() {
  if (remoteControlSource) {
    try {
      remoteControlSource.close();
    } catch (e) {}
  }
  remoteControlSource = null;
}

function startRemoteControl() {
  if (!config.remotePeek || !canUseRemotePeek() || typeof EventSource === 'undefined') {
    stopRemoteControl();
    return;
  }
  if (remoteControlSource && remoteControlSource.readyState !== 2) return;
  const base = window.MagicCloud.device.liveUrl();
  remoteControlPrimed = false;
  try {
    remoteControlSource = new EventSource(`${base}/ctrl/${getLiveChannel()}.json`);
  } catch (e) {
    remoteControlSource = null;
    return;
  }
  remoteControlSource.addEventListener('put', (e) => {
    let data = null;
    try {
      data = JSON.parse(e.data).data;
    } catch (err) {
      return;
    }
    // ההודעה הראשונה היא הפקודה האחרונה ששמורה - לא מבצעים אותה שוב
    if (!remoteControlPrimed) {
      remoteControlPrimed = true;
      lastRemoteCommandAt = data && data.at ? Number(data.at) : 0;
      return;
    }
    if (!data || !data.cmd || Number(data.at) <= lastRemoteCommandAt) return;
    lastRemoteCommandAt = Number(data.at);
    handleRemoteCommand(data.cmd, data.val);
  });
  lastPublishedState = '';
  scheduleLiveStatePublish();
}

function initRemoteControl() {
  const toggle = document.getElementById('toggleRemotePeek');
  if (toggle) toggle.addEventListener('change', () => setTimeout(startRemoteControl, 50));
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') startRemoteControl();
  });
  startRemoteControl();
}

// ============================================================================
// 38. בדיקה לפני הופעה: לחיצה אחת בודקת שהכל מוכן
// ----------------------------------------------------------------------------
// כל בדיקה מחזירה: ok (✓) / warn (!) / bad (✗) / info (ℹ️), ולפעמים כפתור תיקון.
// ============================================================================
const PRESHOW_ICONS = { ok: '✅', warn: '⚠️', bad: '❌', info: 'ℹ️' };

function withTimeout(promise, ms) {
  return Promise.race([promise, new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), ms))]);
}

async function collectPreShowChecks() {
  const checks = [];
  const add = (state, title, detail, fixLabel, fix) => checks.push({ state, title, detail, fixLabel, fix });

  // 1. אינטרנט + רישיון (בדיקה אמיתית מול השרת)
  let online = navigator.onLine !== false;
  let status = null;
  if (online && window.MagicCloud && window.MagicCloud.isConfigured()) {
    try {
      status = await withTimeout(window.MagicCloud.device.getMyStatus(), 8000);
    } catch (e) {
      online = false;
    }
  }
  if (online) add('ok', 'חיבור לאינטרנט', 'מחובר');
  else add('warn', 'אין חיבור לאינטרנט', 'מסך הנעילה עובד גם בלי אינטרנט, אבל טלפון שני, גיבוי ועדכונים לא.');

  if (status === 'approved' || (!status && isCachedApprovalValid())) add('ok', 'רישיון', 'האפליקציה מאושרת');
  else if (status === 'blocked') add('bad', 'רישיון', 'הגישה בוטלה - פנה למנהל');
  else if (status) add('bad', 'רישיון', 'הבקשה עוד לא אושרה');

  // 2. מצב תרגול חייב להיות כבוי
  if (config.practiceMode) {
    add('bad', 'מצב תרגול דולק', 'הקודים לא יישמרו בהיסטוריה.', 'כבה', () => {
      config.practiceMode = false;
      saveConfig();
      syncNewRevealsUI();
    });
  } else {
    add('ok', 'מצב תרגול כבוי', '');
  }

  // 3. קוד מהצופה הקודם
  const lastCode = localStorage.getItem(LAST_PIN_KEY);
  if (lastCode) {
    add('warn', 'נשאר קוד מהצופה הקודם', `הקוד האחרון (${formatCodeForDisplay(lastCode, '')}) עדיין שמור - ההצצות יראו אותו.`, 'אפס', () => {
      try {
        localStorage.removeItem(LAST_PIN_KEY);
      } catch (e) {}
      forceAttemptCount = 0;
      refreshSettingsLastCaptured();
    });
  } else {
    add('ok', 'מוכן לצופה חדש', 'אין קוד שמור מהצופה הקודם');
  }

  // 4. מצב הטריק (מידע)
  const lockNames = { pin: config.birthdayTrick ? `🎂 תאריך לידה (${birthdayLen()} ספרות)` : Number(config.pinLength) === 6 ? 'קוד 6 ספרות' : 'קוד 4 ספרות', pattern: 'דפוס', words: 'סיסמה', swipe: 'החלקה' };
  add(
    'info',
    forceUnlockMode ? `פתיחה בכל קוד: דולק (ניסיון ${getUnlockOnAttempt()})` : 'פתיחה בכל קוד: כבוי',
    `נעילה: ${lockNames[config.unlockMode] || config.unlockMode}`
  );

  // 5. חשיפות שעובדות רק בפתיחה בכל קוד
  if ((config.callReveal || config.revealEnabled) && !forceUnlockMode) {
    add('warn', 'החשיפה לא תופעל', 'שיחה נכנסת וחשיפה בהודעה עובדות רק כש"פתיחה בכל קוד" דולק.', 'הדלק', () => setForceModeState(true));
  }

  // 6. הרשאת התראות (לשעון ולחשיפה בהודעה)
  if (hasNativeNotifications() && (config.watchPeek || config.revealEnabled)) {
    let allowed = true;
    try {
      allowed = typeof window.AndroidNative.areNotificationsAllowed !== 'function' || window.AndroidNative.areNotificationsAllowed();
    } catch (e) {}
    if (allowed) add('ok', 'התראות מותרות', 'השעון והחשיפה בהודעה יעבדו');
    else {
      add('bad', 'ההתראות חסומות', 'השעון והחשיפה בהודעה לא יעבדו.', 'אשר', () => {
        try {
          window.AndroidNative.requestNotificationPermission();
        } catch (e) {}
      });
    }
  }

  // 7. טלפון שני
  if (config.remotePeek) {
    const connected = remoteControlSource && remoteControlSource.readyState === 1;
    if (connected && online) add('ok', 'טלפון שני', 'מחובר - הקודים והשלט יעבדו');
    else add('warn', 'טלפון שני לא מחובר', 'ודא שיש אינטרנט ושהקישור פתוח בטלפון השני.', 'חבר מחדש', () => {
      stopRemoteControl();
      startRemoteControl();
    });
  }

  // 8. עדכון זמין
  try {
    const cfg = online && window.MagicCloud ? await withTimeout(window.MagicCloud.getAppConfig(), 6000) : null;
    if (cfg && cfg.latest_version && compareSemver(cfg.latest_version, getInstalledAppVersion()) > 0) {
      add('warn', `יש גרסה חדשה (v${cfg.latest_version})`, 'מומלץ לעדכן אחרי ההופעה, לא רגע לפניה.');
    }
  } catch (e) {}

  // 10. "פתיחה בכל קוד" כבויה - הסיבה הכי נפוצה ל"זה לא נפתח" (נכבית בטעות בלחיצה כפולה על השעון)
  if (!forceUnlockMode && !config.settingsTrick) {
    add('warn', '"פתיחה בכל קוד" כבויה', 'רק הקוד שהגדרת יפתח את הטלפון. אם זה לא בכוונה - הדלק.', 'הדלק', () => setForceModeState(true));
  }

  // 11. "הטלפון מזהה את הצופה" צריך מצלמה
  if (config.faceTrick) {
    let camOk = false;
    try {
      const s = await withTimeout(navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: false }), 4000);
      s.getTracks().forEach((t) => t.stop());
      camOk = true;
    } catch (e) {}
    if (camOk) add('ok', 'מצלמה (זיהוי הצופה)', 'מוכנה');
    else add('bad', 'אין גישה למצלמה', 'בלי מצלמה הטלפון ייפתח לצופה אבל בלי התמונה שלו. אשר גישה למצלמה בהגדרות הטלפון.');
  }

  // 12. טפט: הכי אמין כשזה הטפט האמיתי שלך
  if (!localStorage.getItem(WALLPAPER_STORAGE_KEY)) {
    add('warn', 'הטפט לא שלך', 'מי שמכיר את הטלפון שלך ישים לב. בחר את התמונה שלך: לשונית מראה ← "בחר תמונה מהגלריה שלך".');
  }

  // 13. אייפון: נפתח מהאייקון (ולא בתוך Safari)
  if (document.documentElement.classList.contains('real-ios')) {
    const standalone = window.navigator.standalone === true || (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches);
    if (!standalone) add('bad', 'נפתח בתוך Safari', 'יופיע הסרגל של Safari. פתח את Lockscreen מהאייקון במסך הבית.');
    // הצצה בשעון מוסתרת באייפון (השעה שם של המערכת) - אין צורך באזהרה
    // באייפון אי אפשר לצאת למסך הבית האמיתי - מוצג צילום מסך הבית של הקוסם. בלי צילום = מסך ריק (פדיחה)
    if (!localStorage.getItem(HOMESCREEN_STORAGE_KEY)) {
      add('bad', 'אין צילום של מסך הבית שלך', 'באייפון, אחרי הפתיחה הצופה רואה צילום של מסך הבית שלך. בלי צילום הוא יראה מסך ריק. במסך הבית: צד + עוצמה למעלה, ואז לשונית פתיחה ← "בחר צילום של מסך הבית שלך".');
    } else {
      add('ok', 'מסך הבית שלך מוכן', 'אחרי הפתיחה יופיע מסך הבית שלך, עם השעה והסוללה האמיתיות.');
    }
  }

  // 📸 התמונה כבר הייתה שם: צריך מיקרופון
  if (config.galleryPredict && hasNativeGalleryPredict() && config.galleryPredictSource === 'code') {
    add('ok', '📸 התמונה כבר הייתה שם - מוכן (קוד)', '"תחשוב על מספר ותקליד אותו כקוד" - המספר נכנס לפתק בגלריה. בלי מיקרופון.');
  } else if (config.galleryPredict && hasNativeGalleryPredict()) {
    if (!liveReadMicReady()) add('bad', 'אין הרשאת מיקרופון', 'בלי מיקרופון 📸 לא יעבוד.', 'אשר', () => { try { window.AndroidNative.requestMicPermission(); } catch (e) {} });
    else add('ok', '📸 התמונה כבר הייתה שם - מוכן', 'משפט עם "תגיד" ← התשובה הראשונה של הצופה נשמרת ← באוזנייה "נקלט". צריך אינטרנט.');
  }

  // 🃏 / 🗣️: צריך מיקרופון (ותמונה, אם בחרו "התמונה מתחלפת")
  if ((config.cardTrick || config.remoteTrick) && hasNativeWordListen()) {
    if (!liveReadMicReady()) add('bad', 'אין הרשאת מיקרופון', 'בלי מיקרופון 🃏 / 🗣️ לא יעבדו.', 'אשר', () => { try { window.AndroidNative.requestMicPermission(); } catch (e) {} });
    else {
      if (config.cardTrick) add('ok', '🃏 הקלף בטלפון - מוכן', 'הצופה אומר את הקלף בקול, ואז הופכים את הטלפון.');
      if (config.remoteTrick) add('ok', '🗣️ שלט רחוק - מוכן', 'מילת הקוד: "' + (config.remoteWord || 'וואלה') + '"');
    }
    if (config.remoteTrick && config.remoteAction === 'photo') {
      let hasRp = false;
      try { hasRp = Boolean(localStorage.getItem(REMOTE_PHOTO_KEY)); } catch (e) {}
      if (!hasRp) add('bad', 'לא נבחרה תמונה', 'קסמים ← 🗣️ ← "בחר את התמונה שתופיע".');
    }
  }

  // 🔮 הטלפון ידע מראש: צריך מיקרופון
  if (config.wordPredict && hasNativeWordListen()) {
    let wpHasWallpaper = false;
    try { wpHasWallpaper = Boolean(localStorage.getItem(WORD_WALLPAPER_KEY)); } catch (e) {}
    if (wordPredictMode() === 'wallpaper' && !wpHasWallpaper) add('bad', 'אין תמונה מקורית', 'קסמים ← 🔮 ← "בחר את התמונה המקורית (בלי שעון)".');
    if (wordPredictMode() === 'notification' && !wordPredictNotifsAllowed()) add('bad', 'ההתראות כבויות', 'בלי התראות המילה לא תופיע במסך הנעילה האמיתי.', 'אשר', () => { try { window.AndroidNative.requestNotificationPermission(); } catch (e) {} });
    if (liveReadMicReady()) add('ok', 'הטלפון ידע מראש - מוכן', wordPredictMode() === 'wallpaper' ? 'כשנשמע "נקלט" באוזנייה - לוחצים פעמיים על כפתור הצד.' : 'ודא שבהגדרות הטלפון מופעל "הצג תוכן התראות במסך הנעילה".');
    else add('bad', 'אין הרשאת מיקרופון', 'בלי מיקרופון "הטלפון ידע מראש" לא יעבוד.', 'אשר', () => { try { window.AndroidNative.requestMicPermission(); } catch (e) {} });
  }

  // 🎧 קריאה בזמן אמת: האוזנייה חייבת להיות מחוברת (אחרת הקוסם לא שומע כלום)
  if (config.liveRead) {
    if (config.unlockMode !== 'pin') {
      add('warn', 'קריאה בזמן אמת עובדת רק עם קוד PIN', 'בחר "קוד PIN" בחלון סוג הנעילה.');
    }
    const hs = liveReadHeadsetState();
    if (hs === 'connected') add('ok', 'אוזנייה מחוברת', 'קריאה בזמן אמת מוכנה. כדאי ללחוץ "בדיקת אוזנייה" פעם אחת.');
    else if (hs === 'missing') add('bad', 'אין אוזנייה מחוברת', 'בלי אוזנייה הטלפון שותק ולא תשמע את הספרות. חבר אוזניית בלוטות\'.', 'בדוק', liveReadTest);
    else add(liveReadWebArmed() ? 'ok' : 'warn', liveReadWebArmed() ? 'האוזנייה נבדקה' : 'בדוק את האוזנייה', 'באייפון הטלפון לא בודק לבד: אם האוזנייה תתנתק, הספרות יישמעו בקול.', 'בדוק', liveReadTest);
    if (config.liveReadVoice && hasNativeVoiceRepeat()) {
      if (liveReadMicReady()) add('ok', 'פקודה קולית מוכנה', 'אחרי הקוד: "תחזור על הקוד" - והקוד נלחש שוב.');
      else add('bad', 'אין הרשאת מיקרופון', 'בלי מיקרופון הפקודה הקולית לא תעבוד.', 'אשר', () => { try { window.AndroidNative.requestMicPermission(); } catch (e) {} });
    }
  }

  // 9. סוללה
  try {
    if (navigator.getBattery) {
      const b = await withTimeout(navigator.getBattery(), 2000);
      const pct = Math.round(b.level * 100);
      if (pct < 20 && !b.charging) add('bad', `סוללה ${pct}%`, 'כדאי להטעין לפני ההופעה.');
      else if (pct < 40 && !b.charging) add('warn', `סוללה ${pct}%`, 'מספיק להופעה קצרה.');
      else add('ok', `סוללה ${pct}%`, b.charging ? 'בטעינה' : '');
    }
  } catch (e) {}

  return checks;
}

function renderPreShowChecks(checks) {
  const list = document.getElementById('preShowList');
  const summary = document.getElementById('preShowSummary');
  if (!list || !summary) return;
  list.innerHTML = '';
  checks.forEach((c) => {
    const row = document.createElement('div');
    row.className = 'preshow-item';
    const icon = document.createElement('div');
    icon.className = 'preshow-icon';
    icon.textContent = PRESHOW_ICONS[c.state] || '';
    const body = document.createElement('div');
    const title = document.createElement('div');
    title.className = 'preshow-title';
    title.textContent = c.title;
    body.appendChild(title);
    if (c.detail) {
      const detail = document.createElement('div');
      detail.className = 'preshow-detail';
      detail.textContent = c.detail;
      body.appendChild(detail);
    }
    row.append(icon, body);
    if (c.fix) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'preshow-fix';
      btn.textContent = c.fixLabel || 'תקן';
      btn.addEventListener('click', async () => {
        try {
          await c.fix();
        } catch (e) {}
        runPreShowCheck();
      });
      row.appendChild(btn);
    } else {
      row.appendChild(document.createElement('span'));
    }
    list.appendChild(row);
  });
  const bad = checks.filter((c) => c.state === 'bad').length;
  const warn = checks.filter((c) => c.state === 'warn').length;
  summary.className = 'preshow-summary ' + (bad ? 'bad' : warn ? 'warn' : 'ok');
  summary.textContent = bad
    ? bad === 1
      ? 'דבר אחד חייב תיקון לפני ההופעה'
      : `${bad} דברים חייבים תיקון לפני ההופעה`
    : warn
      ? warn === 1
        ? 'כמעט מוכן - דבר אחד לבדוק'
        : `כמעט מוכן - ${warn} דברים לבדוק`
      : 'הכל מוכן להופעה ✓';
}

let preShowRunning = false;
async function runPreShowCheck() {
  if (preShowRunning) return;
  preShowRunning = true;
  const overlay = document.getElementById('preShowOverlay');
  const summary = document.getElementById('preShowSummary');
  if (overlay) overlay.style.display = 'flex';
  if (summary) {
    summary.className = 'preshow-summary';
    summary.textContent = 'בודק...';
  }
  try {
    renderPreShowChecks(await collectPreShowChecks());
  } catch (e) {
    if (summary) summary.textContent = 'הבדיקה נכשלה, נסה שוב';
  } finally {
    preShowRunning = false;
  }
}

function initPreShowCheck() {
  const openBtn = document.getElementById('preShowCheckBtn');
  if (openBtn) openBtn.addEventListener('click', runPreShowCheck);
  const again = document.getElementById('preShowAgainBtn');
  if (again) again.addEventListener('click', runPreShowCheck);
  const close = document.getElementById('preShowCloseBtn');
  if (close) {
    close.addEventListener('click', () => {
      document.getElementById('preShowOverlay').style.display = 'none';
    });
  }
}

// ============================================================================
// 39. חשיפה בחיפוש: מסך חיפוש שבו החיפוש האחרון הוא הקוד של הצופה
// ----------------------------------------------------------------------------
// מסך חיפוש כללי (בלי לוגו של חברה מסוימת).
// ============================================================================
const SEARCH_FILLERS_HE = ['מזג אוויר מחר', 'מתכון לעוגת שוקולד', 'תוצאות המשחק אתמול', 'שעות פתיחה סופר', 'איך מכינים קפה קר', 'מסעדות קרובות'];
const SEARCH_FILLERS_EN = ['weather tomorrow', 'chocolate cake recipe', 'last night game score', 'supermarket opening hours', 'how to make cold brew', 'restaurants near me'];
const SEARCH_WHEN_HE = ['אתמול', 'אתמול', 'לפני יומיים', 'לפני 3 ימים', 'לפני שבוע'];
const SEARCH_WHEN_EN = ['Yesterday', 'Yesterday', '2 days ago', '3 days ago', '1 week ago'];

function showSearchReveal(code) {
  const list = document.getElementById('searchRecentList');
  if (!list) return;
  const en = isEnglishUi();
  const main = fillCodePlaceholder(config.searchText || '{קוד}', code || '----');
  const rand = seededRandom(String(code) + '|search|' + new Date().toDateString());
  const fillers = (en ? SEARCH_FILLERS_EN : SEARCH_FILLERS_HE).slice().sort(() => rand() - 0.5).slice(0, 4);
  const whens = en ? SEARCH_WHEN_EN : SEARCH_WHEN_HE;
  list.innerHTML = '';
  [main, ...fillers].forEach((text, i) => {
    const row = document.createElement('div');
    row.className = 'search-recent-item';
    row.innerHTML = '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8.5"></circle><path d="M12 7.5V12l3 2"></path></svg>';
    const t = document.createElement('span');
    t.className = 'search-recent-text';
    t.textContent = text;
    const w = document.createElement('span');
    w.className = 'search-recent-when';
    w.textContent = whens[Math.min(i, whens.length - 1)];
    row.append(t, w);
    list.appendChild(row);
  });
  trackEvent('search_reveal');
}

// ============================================================================
// 40. כפתור ? ליד כל קסם: איך זה עובד + מה אומרים לקהל
// ============================================================================
const TRICK_TIPS = {
  toggleForceUnlockMode: {
    he: ['🎯 פתיחה בכל קוד', 'כל קוד שהצופה מקליד פותח את הטלפון.\nאפשר להדליק ולכבות בסתר בלחיצה כפולה על השעון (מרגישים רטט קצר).', '"תבחר כל קוד שבא לך, אל תגיד לי. עכשיו תקליד אותו בטלפון שלי..."'],
    en: ['🎯 Unlock with any code', 'Any code the spectator types unlocks the phone.\nTurn it on/off secretly with a double-tap on the clock (you feel a short buzz).', '"Think of any code, don\'t tell me. Now type it on my phone..."']
  },
  unlockAttemptModeSelector: {
    he: ['🔁 באיזה ניסיון נפתח', 'בניסיונות שלפני: "קוד שגוי" עם רטט קל, בדיוק כמו טלפון אמיתי. זה הופך את הרגע שהוא נפתח להרבה יותר חזק.', '"לא? נסה שוב... תתרכז בקוד שלך... ועכשיו!"'],
    en: ['🔁 Which attempt unlocks', 'Earlier attempts show "wrong code" with a light buzz, just like a real phone. It makes the moment it opens much stronger.', '"No? Try again... focus on your code... and now!"']
  },
  toggleHoldPeek: {
    he: ['👆 הצצה בלחיצה ארוכה', 'לחיצה ארוכה בשטח ריק במסך מראה לך את הקוד בתיבה קטנה. בדפוס - הנקודות ממוספרות לפי הסדר.', '"רגע, תן לי לוודא שהמסך נעול..."'],
    en: ['👆 Long-press peek', 'Long-press an empty area to see the code in a small box. For patterns, the dots are numbered in order.', '"Wait, let me make sure the screen is locked..."']
  },
  toggleChameleonClock: {
    he: ['🕐 הצצה בשעון', 'הקשה אחת על השעון הקטן למעלה - הקוד מופיע במקום השעה ל-3 שניות.', '"כמה זמן יש לנו? רגע..."'],
    en: ['🕐 Clock peek', 'One tap on the small clock at the top - the code replaces the time for 3 seconds.', '"How much time do we have? One sec..."']
  },
  toggleHapticPeek: {
    he: ['📳 רטט בכיס', 'כשהטלפון אצלך, הוא רוטט את הספרות: מספר רטטים = הספרה, רטט ארוך = 0. לא צריך להסתכל בכלל.', '"תחזיר לי את הטלפון. אני לא מסתכל עליו בכלל."'],
    en: ['📳 Pocket vibration', 'While you hold it, the phone buzzes the digits: number of buzzes = the digit, a long buzz = 0. No need to look.', '"Give me back the phone. I\'m not even looking at it."']
  },
  toggleWatchPeek: {
    he: ['⌚ שעון חכם', 'כל קוד מופיע על השעון שלך כהתראה שקטה. בטלפון עצמו לא רואים כלום.', '"(מסתכל על השעה) יש לנו עוד דקה..."'],
    en: ['⌚ Smartwatch', 'Every code appears on your watch as a silent notification. Nothing shows on the phone.', '"(checking the time) We have one more minute..."']
  },
  toggleRemotePeek: {
    he: ['📲 טלפון שני + שלט', 'הקוד מופיע בגדול בטלפון שני (שלך בכיס או של עוזר). בטלפון השני יש גם שלט: להדליק/לכבות, לבחור ניסיון ולאפס לצופה הבא.', '"אני אפילו לא נוגע בטלפון. הכל אצלך."'],
    en: ['📲 Second phone + remote', 'The code shows big on a second phone (yours or a helper\'s). It also has a remote: on/off, attempt, and reset for the next spectator.', '"I\'m not even touching the phone. It\'s all with you."']
  },
  toggleReveal: {
    he: ['💬 חשיפה בהודעה', 'כמה שניות אחרי הפתיחה מגיעה הודעה עם הקוד, מהשולח ועם התמונה שבחרת.', '"אה, קיבלתי הודעה... אתה יכול לקרוא אותה בקול?"'],
    en: ['💬 Message reveal', 'A few seconds after unlocking, a message arrives with the code, from the sender and photo you chose.', '"Oh, I got a message... can you read it out loud?"']
  },
  toggleNotesReveal: {
    he: ['📝 חשיפה בפתקים', 'אחרי הפתיחה נפתח פתק "שנכתב לפני שעה" ובו הקוד של הצופה.', '"כתבתי משהו לפני שהגעתי לפה. תקרא מה כתוב בפתק."'],
    en: ['📝 Notes reveal', 'After unlocking, a note "written an hour ago" opens with the spectator\'s code.', '"I wrote something before I got here. Read the note."']
  },
  toggleSettingsTrick: {
    he: ['⚙️ תחליף לי את הסיסמה', '1. "שמור וסגור" - נפתחות "ההגדרות" (נראות בדיוק כמו של סמסונג).\n2. נכנסים: מסך נעילה ו-AOD ← סוג נעילת מסך ← מקלידים "קוד נוכחי" (כל קוד) ← PIN.\n3. מגישים לצופה: הוא קובע PIN חדש ומאשר. הקוד מגיע אליך בסתר (שעון / טלפון שני / רטט / לחיצה ארוכה).\n4. הטלפון חוזר להגדרות כמו טלפון אמיתי. מכבים בלחצן הצד ומגישים לו להחזיק.\n5. כשמדליקים - הטלפון נעול, ורק הקוד שלו פותח.\nיציאה סודית מההגדרות: לחיצה ארוכה בפינה הימנית העליונה.', '"תקבע לי סיסמה חדשה לטלפון. אל תראה לי, אל תגיד לי... עכשיו הוא נעול, ורק אתה יכול לפתוח אותו. או שלא?"'],
    en: ['⚙️ Change my passcode', '1. "Save & close" opens "Settings" (looks exactly like Samsung\'s).\n2. Go: Lock screen and AOD → Screen lock type → type a "current code" (any) → PIN.\n3. Hand it over: the spectator sets a new PIN and confirms. The code reaches you secretly (watch / second phone / buzz / long-press).\n4. The phone goes back to Settings like a real phone. Turn the screen off with the side button and let them hold it.\n5. When it wakes up it\'s locked - and only their code opens it.\nSecret exit from Settings: long-press the top-right corner.', '"Set a new passcode for my phone. Don\'t show me, don\'t tell me... now it\'s locked and only you can open it. Or can you?"']
  },
  toggleFaceTrick: {
    he: ['🤳 הטלפון מזהה את הצופה', '1. נגיעה במסך / החלקה למעלה = "זיהוי פנים". בפעמים הראשונות (כמה שבחרת) הוא נכשל - "הפנים לא זוהו".\n2. מגישים לצופה ונוגעים שוב במסך כשהוא מסתכל: הטלפון נפתח מיד.\n3. באותו רגע המצלמה הקדמית מצלמת אותו - והתמונה שלו היא הטפט של מסך הבית.\nטיפ: תחזיק את הטלפון מול הפנים של הצופה בגובה העיניים, כמו שמצלמים סלפי.', '"הטלפון שלי לא מזהה אותי היום... רגע, תסתכל אתה? ...איך הוא מכיר אותך?! ותסתכל על הטפט שלי..."'],
    en: ['🤳 The phone knows the spectator', '1. Tap the screen / swipe up = "face scan". The first times (as many as you chose) it fails - "Face not recognized".\n2. Hand it to the spectator and tap again while they look: it unlocks instantly.\n3. At that moment the front camera takes their photo - and it becomes the home screen wallpaper.\nTip: hold the phone at their eye level, like taking a selfie.', '"My phone doesn\'t recognize me today... wait, you try? ...how does it know you?! And look at my wallpaper..."']
  },
  toggleWordPredict: {
    he: ['🔮 הטלפון ידע מראש', 'הכנה (פעם אחת): לאשר מיקרופון. ללחוץ "בחר את התמונה המקורית" ולבחור מהגלריה את התמונה של הטפט (התמונה עצמה, לא צילום מסך), ובהגדרות הטלפון למחוק את "פרטי הקשר" במסך הנעילה (המילה תופיע במקומם). אוזנייה - מומלץ מאוד.\n\n1. "שמור וסגור" - המסך נהיה שחור, כאילו הטלפון כבוי. מניחים אותו על השולחן.\n2. "תגיד בקול שם של מפורסם - מי שבא לך." (או עיר, חיה, שם של חבר)\n3. הצופה אומר מילה. אתה שותק! (המילה האחרונה שנאמרת היא זו שמופיעה)\n4. עם אוזנייה: שומעים בסתר "נקלט: ..." - רק אז מדליקים (הטפט כבר הוחלף).\n5. "מצחיק... תסתכל על הטלפון שלי." לוחצים פעמיים על כפתור הצד: הלחיצה הראשונה מכבה באמת (לא רואים הבדל), השנייה מדליקה את מסך הנעילה האמיתי - ובשורה שלמטה כתובה המילה.\n\n💡 טיפים:\n• אחרי שהצופה אמר את המילה - לא לדבר עד שמכבים.\n• מקום שקט עובד הכי טוב. צריך אינטרנט.\n• "מוכן לצופה הבא" מחזיר את הטפט הרגיל שלך.', '"תגיד שם של מפורסם... ריהאנה? מצחיק. תסתכל על התזכורת שיש לי בטלפון מהבוקר..."'],
    en: ['🔮 My phone knew', 'Setup (once): allow the microphone. In the "Look" tab pick your real wallpaper photo, and in the phone settings delete the lock-screen "Contact information" (the word appears in its place). An earphone is highly recommended.\n\n1. "Save & Close" - the screen goes black, as if the phone is off. Put it on the table.\n2. "Say out loud the name of a celebrity - anyone you like." (or a city, an animal, a friend\'s name)\n3. The spectator says a word. You stay silent! (the last word spoken is the one that appears)\n4. With an earphone: you secretly hear "got: ..." - only then turn it on (the wallpaper is already changed).\n5. "Funny... look at my phone." Press the side button twice: the first press really turns the screen off (no visible change), the second turns on the REAL lock screen - with the word in the line at the bottom.\n\n💡 Tips:\n• After the spectator says the word - don\'t talk until you press the button.\n• A quiet place works best. Needs internet.\n• "Ready for next spectator" restores your normal wallpaper.', '"Name a celebrity... Rihanna? Funny. Look at the reminder I have on my phone from this morning..."']
  },
  toggleGalleryPredict: {
    he: ['📸 התמונה כבר הייתה שם', 'הכנה (פעם אחת): לאשר מיקרופון. מומלץ: "צלם דף ריק מהמחברת שלך". אוזנייה - מומלץ מאוד. צריך אינטרנט.\nלפני ההופעה: "🧪 נסה עכשיו" ופתח את הגלריה - לוודא שהתמונה מופיעה ראשונה.\n\n1. "שמור וסגור". הטלפון מקשיב.\n2. "תגיד בקול שם של מפורסם - מי שבא לך." (המשפט חייב לכלול "תגיד" - זה הסימן לטלפון)\n3. הצופה עונה. רק התשובה הראשונה שלו אחרי "תגיד" נשמרת.\n4. באוזנייה: "נקלט: ..." - התמונה כבר בגלריה, ומעכשיו מותר לך לדבר חופשי (רק בלי עוד "תגיד").\n   שמעת מילה לא נכונה? "תגיד שוב?" - והוא עונה מחדש.\n5. "הבוקר כתבתי משהו וצילמתי. תפתח לי את הגלריה." פותחים את הטלפון (מסך הבית האמיתי) ונותנים לו לפתוח את הגלריה בעצמו.\n6. התמונה האחרונה - "מהבוקר" - פתק עם המילה שלו. אפשר אפילו ללחוץ על "פרטים".\n\n💡 "מוכן לצופה הבא" מוחק את התמונה מהגלריה.\n\n👂 הטלפון מקשיב דרך המיקרופון שלו - תחזיק אותו קרוב לצופה (לא ליד הפה שלך).\n🛟 גיבוי בקול: לא שמעת "נקלט"? תגיד לצופה בטבעיות "אמרת ריהאנה, נכון?" - מה שאחרי "אמרת" נשמר.\n🛟 גיבוי בהקלדה (רק בנעילה "סיסמה"): מקלידים את המילה בתור הסיסמה - היא נכנסת לפתק והטלפון נפתח.', '"הבוקר כתבתי משהו על פתק וצילמתי... תגיד שם של מפורסם. ריהאנה? תפתח לי את הגלריה. מה צילמתי הבוקר?"'],
    en: ['📸 The photo was already there', 'Setup (once): allow the microphone. Recommended: "Snap a blank page from your notebook". An earphone is highly recommended. Needs internet.\nBefore the show: "🧪 Try now" and open the Gallery - make sure the photo shows first.\n\n1. "Save & Close". The phone listens.\n2. "Say out loud the name of a celebrity - anyone you like." (the sentence must include "say" - that is the cue)\n3. The spectator answers. Only their first answer after "say" is saved.\n4. In your earphone: "got: ..." - the photo is in the Gallery and you can talk freely (just no more "say").\n   Heard the wrong word? "Say it again?" - and they answer again.\n5. "I wrote something this morning and took a photo. Open my Gallery." Unlock (real home screen) and let them open the Gallery themselves.\n6. The newest photo - "from this morning" - is a note with their word. They can even tap "Details".\n\n💡 "Ready for next spectator" deletes the photo.\n\n👂 The phone listens through its own microphone - keep it close to the spectator.\n🛟 Voice backup: no "got"? Say naturally "You said Rihanna, right?" - whatever follows "said" is saved.\n🛟 Typing backup (Password lock only): type the word as the password - it goes on the note and the phone unlocks.', '"I wrote something on a note this morning and took a picture... name a celebrity. Rihanna? Open my Gallery. What did I shoot this morning?"']
  },
  toggleCardTrick: {
    he: ['🃏 הקלף בטלפון', 'הכנה: לאשר מיקרופון. צריך אינטרנט. אוזנייה - מומלץ.\n\n1. "שמור וסגור" - מסך הנעילה מופיע. מניחים את הטלפון הפוך על השולחן.\n2. הצופה בוחר קלף מהחפיסה.\n3. "תגיד בקול איזה קלף בחרת." ("שבע לב", "מלכה עלה", "אס יהלום")\n4. עם אוזנייה: שומעים בסתר "נקלט: ..." - הקלף כבר מוכן.\n5. "תהפוך את הטלפון שלי." הטפט של מסך הנעילה הוא הקלף שלו.\n\n💡 טיפים:\n• אחרי שהצופה אמר את הקלף - לא להגיד קלף אחר בקול.\n• "מוכן לצופה הבא" מחזיר את הטפט הרגיל.', '"איזה קלף בחרת? שבע לב? ...מוזר. תהפוך את הטלפון שלי."'],
    en: ['🃏 Card on the phone', 'Setup: allow the microphone. Needs internet. An earphone is recommended.\n\n1. "Save & Close" - the lock screen shows. Put the phone face down on the table.\n2. The spectator picks a card.\n3. "Say out loud which card you picked." ("seven of hearts")\n4. With an earphone: you secretly hear "got: ..." - the card is ready.\n5. "Flip my phone." The lock screen wallpaper is their card.\n\n💡 Tips:\n• After the spectator names the card - don\'t say another card out loud.\n• "Ready for next spectator" restores the normal wallpaper.', '"Which card? Seven of hearts? ...strange. Flip my phone."']
  },
  toggleRemoteTrick: {
    he: ['🗣️ שלט רחוק סודי', 'הכנה: לאשר מיקרופון ולבחור מילת קוד. צריך אינטרנט.\n\n1. "שמור וסגור" - מסך הנעילה מופיע.\n2. מגישים את הטלפון לצופה: "תחזיק רגע."\n3. ממשיכים לדבר רגיל, ובאמצע אומרים את מילת הקוד (למשל "וואלה").\n4. באותה שנייה אצלו בטלפון קופצת הודעה (עם רטט), או שהתמונה מתחלפת.\n\n💡 טיפים:\n• בחר מילה שאתה יכול להגיד בטבעיות, אבל שהצופה לא יגיד לבד.\n• עובד פעם אחת בכל הופעה. "מוכן לצופה הבא" מאפס.', '"תחזיק לי רגע את הטלפון... וואלה, איזה יום היה היום. רגע, מי שלח לך הודעה?"'],
    en: ['🗣️ Secret remote', 'Setup: allow the microphone and choose a code word. Needs internet.\n\n1. "Save & Close" - the lock screen shows.\n2. Hand the phone to the spectator: "Hold this for a sec."\n3. Keep talking normally, and say the code word in the middle.\n4. That second a message pops up on the phone in their hand (with a buzz), or the photo changes.\n\n💡 Tips:\n• Pick a word you can say naturally but the spectator won\'t say by chance.\n• Works once per show. "Ready for next spectator" resets it.', '"Hold my phone for a sec... wow, what a day. Wait, who just messaged you?"']
  },
  toggleCallReveal: {
    he: ['📞 חשיפה בשיחה נכנסת', 'אחרי הפתיחה הטלפון מצלצל, ושם המתקשר הוא הקוד. אפשר גם להפעיל מהשלט בטלפון השני.', '"מישהו מתקשר אליי... תגיד לי מי זה?"'],
    en: ['📞 Incoming call reveal', 'After unlocking the phone rings and the caller name is the code. Can also be triggered from the remote.', '"Someone is calling me... who is it?"']
  },
  unlockTargetSelector: {
    he: ['🎬 מה נפתח אחרי הפתיחה', 'מסך בית רגיל, או חשיפה: פתק עם הקוד, תמונה בגלריה של פתק בכתב יד, או מסך חיפוש שבו החיפוש האחרון הוא הקוד.', '"תסתכל מה חיפשתי אתמול בלילה..."'],
    en: ['🎬 What opens after unlocking', 'A normal home screen, or a reveal: a note with the code, a gallery photo of a handwritten note, or a search screen where the last search is the code.', '"Look what I searched for last night..."']
  },
  togglePracticeMode: {
    he: ['🎯 מצב תרגול', 'מתרגלים את כל ההצצות בלי שהקודים נשמרים בהיסטוריה ובלי שזה נספר בנתונים. זכור לכבות לפני הופעה (הבדיקה לפני הופעה תזכיר לך).', ''],
    en: ['🎯 Practice mode', 'Practice all the peeks without saving codes to history or stats. Remember to turn it off before a show (the pre-show check reminds you).', '']
  }
};

function openTrickTip(id) {
  const tip = TRICK_TIPS[id];
  if (!tip) return;
  const [title, how, patter] = isEnglishUi() ? tip.en : tip.he;
  document.getElementById('tipTitle').textContent = title;
  document.getElementById('tipHow').textContent = how;
  document.getElementById('tipPatter').textContent = patter;
  document.getElementById('tipPatterLabel').textContent = isEnglishUi() ? '💬 What to say' : '💬 מה אומרים לקהל';
  document.getElementById('tipPatterWrap').style.display = patter ? '' : 'none';
  document.getElementById('tipOverlay').style.display = 'flex';
}

function initTrickTips() {
  Object.keys(TRICK_TIPS).forEach((id) => {
    const el = document.getElementById(id);
    if (!el) return;
    const row = el.closest('.clean-toggle-row, .oneui-field-block');
    const title = row && (row.querySelector('.toggle-main-title') || row.querySelector('.config-label'));
    if (!title || title.querySelector('.trick-tip-btn')) return;
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'trick-tip-btn';
    btn.textContent = '?';
    btn.setAttribute('aria-label', 'הסבר');
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      openTrickTip(id);
    });
    title.appendChild(btn);
  });
  const close = document.getElementById('tipCloseBtn');
  if (close) close.addEventListener('click', () => (document.getElementById('tipOverlay').style.display = 'none'));
  const overlay = document.getElementById('tipOverlay');
  if (overlay) overlay.addEventListener('click', (e) => {
    if (e.target === overlay) overlay.style.display = 'none';
  });
}

// ============================================================================
// 41. סיור היכרות: בפעם הראשונה מדגיש את החלקים החשובים בהגדרות
// ============================================================================
const TOUR_DONE_KEY = 'magic_tour_done_v1';
const TOUR_STEPS = [
  { target: '#settingsTabs', tab: 'trick', he: '👋 ברוך הבא ל-Lockscreen!\nההגדרות מחולקות ל-5 לשוניות:\n🎯 טריק - מה קורה בטלפון\n🏠 פתיחה - מסך הבית אחרי הפתיחה\n👁️ הצצה - איך אתה יודע את הקוד\n📱 מראה - שהטלפון ייראה כמו שלך\n⚙️ עוד - עזרה, קוד אישי, גיבוי ושפה', en: '👋 Welcome to Lockscreen!\nSettings are split into 5 tabs:\n🎯 Trick - what happens on the phone\n🏠 Unlock - the home screen after unlocking\n👁️ Peek - how you learn the code\n📱 Look - make it look like your phone\n⚙️ More - help, personal code, backup and language' },
  { target: '.show-actions-bar', tab: 'trick', he: '🔄 שני הכפתורים האלה תמיד למעלה:\n"מוכן לצופה הבא" מאפס הכל בין צופים, ו"בדיקה לפני הופעה" מוודא שהכל מוכן.', en: '🔄 These two buttons are always at the top:\n"Ready for next spectator" resets everything between spectators, and "Pre-show check" makes sure everything is ready.' },
  { target: '#toggleForceUnlockMode', tab: 'trick', he: '🎯 פתיחה בכל קוד\nכשזה דולק, כל קוד שהצופה מקליד פותח את הטלפון.', en: '🎯 Unlock with any code\nWhen on, any code the spectator types unlocks the phone.' },
  { target: '#unlockAttemptModeSelector', tab: 'trick', he: '🔁 כאן בוחרים באיזה ניסיון הטלפון ייפתח.\nלמשל 2 = בפעם הראשונה "קוד שגוי", ובשנייה נפתח.', en: '🔁 Choose which attempt unlocks the phone.\nE.g. 2 = first try "wrong code", second try opens.' },
  { target: '#settingsTabs .settings-tab[data-tab="peek"]', tab: 'peek', he: '👁️ בלשונית הצצה: כל הדרכים לראות מה הצופה הקליד - לחיצה ארוכה על המסך, טלפון שני ועוד.', en: '👁️ The Peek tab: every way to see what the spectator typed - long-press the screen, a second phone and more.' },
  { target: '.trick-tip-btn', tab: 'trick', he: '❓ ליד כל קסם יש כפתור כזה - הסבר קצר איך מבצעים אותו ומה אומרים לקהל.', en: '❓ Every trick has a button like this - a short how-to and what to say to the audience.' },
  { target: '#launchLockscreenBtn', tab: 'trick', he: '✅ כשהכל מוכן: "שמור וסגור", בוחרים סוג נעילה ונותנים את הטלפון לצופה.', en: '✅ When ready: "Save & Close", pick a lock type and hand the phone to the spectator.' },
  { target: null, tab: 'trick', he: '🔐 הכי חשוב לזכור:\nכדי לחזור להגדרות בסתר - לחיצה ארוכה של 3 שניות על השעון במסך הנעילה.\n\nבכל שאלה - כפתור ? למעלה. בהצלחה! ✨', en: '🔐 Most important:\nTo get back to settings secretly - long-press the clock for 3 seconds on the lock screen.\n\nAny question - the ? button at the top. Good luck! ✨' }
];
let tourIndex = 0;

function maybeStartTour() {
  try {
    // רק לקוסמים חדשים (מי שכבר ראה את המדריך הישן יכול להפעיל את הסיור מלשונית "עוד")
    if (localStorage.getItem(TOUR_DONE_KEY) || localStorage.getItem(GUIDE_SEEN_KEY)) return;
  } catch (e) {
    return;
  }
  if (!setupOverlay || !setupOverlay.classList.contains('open')) return;
  if (!deviceConfigSheet || !deviceConfigSheet.classList.contains('active')) return;
  if (isLicenseOverlayVisible()) return;
  startTour();
}

function startTour() {
  tourIndex = 0;
  document.getElementById('tourLayer').style.display = 'block';
  showTourStep();
}

function endTour() {
  document.getElementById('tourLayer').style.display = 'none';
  try {
    localStorage.setItem(TOUR_DONE_KEY, '1');
    localStorage.setItem(GUIDE_SEEN_KEY, '1');
    // קוסם שעבר את הסיור כבר מכיר את כל מה שיש - לא מראים לו "מה חדש" על אותה גרסה
    if (!localStorage.getItem(WHATS_NEW_SEEN_KEY)) localStorage.setItem(WHATS_NEW_SEEN_KEY, getInstalledAppVersion());
  } catch (e) {}
  if (typeof showSettingsTab === 'function') showSettingsTab('trick');
}

function showTourStep() {
  const step = TOUR_STEPS[tourIndex];
  if (!step) return endTour();
  const en = isEnglishUi();
  if (typeof showSettingsTab === 'function') showSettingsTab(step.tab);
  document.getElementById('tourText').textContent = en ? step.en : step.he;
  document.getElementById('tourDots').textContent = TOUR_STEPS.map((_, i) => (i === tourIndex ? '●' : '○')).join('');
  document.getElementById('tourNextBtn').textContent = tourIndex === TOUR_STEPS.length - 1 ? (en ? 'Got it' : 'הבנתי') : en ? 'Next' : 'הבא';
  document.getElementById('tourSkipBtn').style.display = tourIndex === TOUR_STEPS.length - 1 ? 'none' : '';

  const spot = document.getElementById('tourSpot');
  const card = document.getElementById('tourCard');
  let target = step.target ? document.querySelector(step.target) : null;
  if (target) target = target.closest('.clean-toggle-row, .oneui-field-block') || target;
  if (!target || !target.offsetParent) {
    spot.classList.add('center');
    card.style.top = '38%';
    return;
  }
  spot.classList.remove('center');
  target.scrollIntoView({ block: 'center', behavior: 'smooth' });
  setTimeout(() => {
    const r = target.getBoundingClientRect();
    const pad = 6;
    Object.assign(spot.style, {
      left: `${r.left - pad}px`,
      top: `${r.top - pad}px`,
      width: `${r.width + pad * 2}px`,
      height: `${r.height + pad * 2}px`
    });
    // הכרטיס מתחת לאזור המודגש, או מעליו אם אין מקום
    const below = r.bottom + 16;
    const cardH = card.offsetHeight || 150;
    card.style.top = below + cardH < window.innerHeight ? `${below}px` : `${Math.max(12, r.top - cardH - 16)}px`;
  }, 380);
}

function initTour() {
  const next = document.getElementById('tourNextBtn');
  if (next) next.addEventListener('click', () => {
    tourIndex += 1;
    showTourStep();
  });
  const skip = document.getElementById('tourSkipBtn');
  if (skip) skip.addEventListener('click', endTour);
  const again = document.getElementById('startTourBtn');
  if (again) again.addEventListener('click', startTour);
  window.addEventListener('resize', () => {
    if (document.getElementById('tourLayer').style.display === 'block') showTourStep();
  });
}

// ============================================================================
// 42. מסך "מה חדש": מופיע פעם אחת אחרי עדכון, עם כל מה שהתחדש מאז הגרסה הקודמת
// ----------------------------------------------------------------------------
// בכל גרסה מוסיפים כאן את החידושים (הכי חשובים קודם). target = האלמנט בהגדרות
// שכפתור "נסה עכשיו" מוביל אליו.
// ============================================================================
const WHATS_NEW_SEEN_KEY = 'magic_whats_new_seen_v1';
const WHATS_NEW_MAX_ITEMS = 6;
const WHATS_NEW = [
  { ver: '10.5', icon: '📸', target: '#toggleGalleryPredict', he: ['התמונה כבר הייתה שם', 'הצופה אומר מילה, פותח את הגלריה האמיתית - והתמונה האחרונה, "מהבוקר", היא פתק עם המילה שלו. (אנדרואיד)'], en: ['The photo was already there', 'The spectator says a word, opens the real Gallery - and the newest photo, "from this morning", is a note with their word. (Android)'] },
  { ver: '8.0', icon: '🎧', target: '#toggleLiveRead', he: ['קריאה בזמן אמת', 'אתה עם הגב, הצופה מקליד קוד - ואתה אומר כל ספרה ברגע שהוא לוחץ עליה. הספרות נלחשות לך באוזניית בלוטות\'.'], en: ['Live reading', 'Your back is turned, the spectator types a code - and you name every digit the moment it is pressed. The digits are whispered into your Bluetooth earphone.'] },
  { ver: '7.9', icon: '🛡️', target: null, he: ['ליטוש לפני הופעות', 'עברנו על כל מסך בכל סוג טלפון. באייפון מוצג רק מה שעובד שם, והכל אמין יותר מתמיד.'], en: ['Polished for shows', 'We went over every screen on every phone type. On iPhone you see only what works there, and everything is more reliable than ever.'] },
  { ver: '7.8', icon: '✨', target: null, he: ['מראה חדש מהרגע הראשון', 'גם ההרשמה, בחירת הטלפון וכל החלונות בעיצוב החדש. האפליקציה ממוקדת: רק מה שעובד בצורה מושלמת.'], en: ['A new look from the first second', 'Sign-up, phone selection and every window now share the new design. The app is focused: only what works perfectly.'] },
  { ver: '7.6', icon: '🏠', target: '#homeTargetNote', he: ['רק מה שעובד - ומסך הבית האמיתי', 'אחרי הפתיחה הטלפון יוצא למסך הבית האמיתי. באייפון (שם אפל לא מאפשרת לצאת) מופיע צילום מסך הבית שלך עם השעה והסוללה האמיתיות. ו"תאריך לידה" מקבל הסבר מלא + "❌ לא תאריך".'], en: ['Only what works - and the real home screen', 'After unlocking the phone exits to the real home screen. On iPhone (where Apple doesn\'t allow exiting) a screenshot of your home screen appears with the real time and battery. And "Birthday" gets a full how-to + "❌ Not a date".'] },
  { ver: '7.5', icon: '🌌', target: null, he: ['עיצוב חדש: Aurora', 'הגדרות בעיצוב חדש לגמרי: זוהר צפוני ברקע, כרטיסי זכוכית זוהרים וכפתורים בגרדיאנט. יש גם גרסה בהירה (כפתור השמש למעלה).'], en: ['New design: Aurora', 'A brand-new settings design: northern lights in the background, glowing glass cards and gradient controls. There\'s a light version too (the sun button at the top).'] },
  { ver: '7.4', icon: '🗂️', target: '#settingsTabs', he: ['הגדרות מסודרות מחדש', 'כל דבר במקום שלו: 🎯 טריק · 🏠 פתיחה · 👁️ הצצה · 📱 מראה · ⚙️ עוד. ו"מוכן לצופה הבא" + "בדיקה לפני הופעה" תמיד למעלה.'], en: ['Reorganized settings', 'Everything in its place: 🎯 Trick · 🏠 Unlock · 👁️ Peek · 📱 Look · ⚙️ More. And "Ready for next spectator" + "Pre-show check" are always at the top.'] },
  { ver: '7.3', icon: '🎂', target: '#toggleBirthdayTrick', he: ['תאריך לידה', 'הצופה מקליד כקוד תאריך לידה של מישהו שהוא אוהב - ואתה יודע בסתר את המזל, הגיל, באיזה יום נולד ומי זה כנראה (ילד? הורה?).'], en: ['Birthday', 'The spectator types a loved one\'s birthday as the code - and you secretly know the star sign, age, the weekday they were born and who it probably is (child? parent?).'] },
  { ver: '7.1', icon: '🛡️', target: '#preShowCheckBtn', he: ['אמינות להופעות גדולות', 'רטט בכיס רק אחרי שהטלפון חוזר אליך, התראה אם "פתיחה בכל קוד" כבתה בטעות, ובדיקה לפני הופעה חכמה יותר.'], en: ['Rock-solid for big shows', 'Pocket buzz only after the phone is back with you, an alert if "unlock with any code" was turned off by mistake, and a smarter pre-show check.'] },
  { ver: '7.0', icon: '📱', target: '#carrierTextInput', he: ['מסך הנעילה שלך - אחד לאחד', 'מסך נעילה חדש של סמסונג (One UI 8): שעון ענק, שם הספק למעלה, טקסט פרטי קשר ושורת סטטוס בעברית. בחר את הטפט שלך מהגלריה - ואי אפשר להבדיל.'], en: ['Your lock screen - one to one', 'New Samsung lock screen (One UI 8): huge clock, carrier name, contact info text. Pick your own wallpaper from the gallery - impossible to tell apart.'] },
  { ver: '6.5', icon: '📱', target: '#backToSplitBtn', he: ['Google Pixel ו-Xiaomi', 'מעכשיו יש גם מסך נעילה של פיקסל ושל שיאומי/רדמי - "החלף מכשיר" ובוחרים את הטלפון שלך.'], en: ['Google Pixel & Xiaomi', 'Now with Pixel and Xiaomi/Redmi lock screens too - "Switch device" and pick your phone.'] },
  { ver: '6.1', icon: '📋', target: '#openWhatsNewBtn', he: ['החידושים תמיד זמינים', 'פספסת משהו? בלשונית "עוד" יש כפתור "מה חדש" שמראה את כל החידושים האחרונים.'], en: ['What\'s new, any time', 'Missed something? The More tab has a "What\'s new" button with all the latest features.'] },
  { ver: '5.9', icon: '🎉', target: null, he: ['מסך "מה חדש"', 'מעכשיו אחרי כל עדכון תראה בדיוק מה התחדש - עם כפתור שלוקח אותך ישר לנסות.'], en: ['"What\'s new" screen', 'After every update you\'ll see exactly what\'s new - with a button that takes you straight to it.'] },
  { ver: '5.8', icon: '✨', target: null, he: ['אנימציית פתיחה אמיתית', 'כשהטלפון נפתח, מסך הנעילה מתקרב ונעלם (סמסונג) או מחליק למעלה (אייפון) - בדיוק כמו בטלפון אמיתי.'], en: ['Real unlock animation', 'When the phone unlocks, the lock screen zooms away (Samsung) or slides up (iPhone) - just like a real phone.'] },
  { ver: '5.6', icon: '❓', target: '#toggleForceUnlockMode', he: ['הסבר ליד כל קסם', 'כפתור ? ליד כל קסם: איך עושים אותו, ומה אומרים לקהל.'], en: ['Help next to every trick', 'A ? button next to every trick: how to do it and what to say.'] },
  { ver: '5.5', icon: '✅', target: '#preShowCheckBtn', he: ['בדיקה לפני הופעה', 'לחיצה אחת בודקת אינטרנט, התראות, סוללה, טלפון שני ועוד - עם כפתור תיקון.'], en: ['Pre-show check', 'One tap checks internet, notifications, battery, second phone and more - with a fix button.'] },
  { ver: '5.4', icon: '🎛️', target: '#toggleRemotePeek', he: ['שלט רחוק מהטלפון השני', 'מהטלפון השני אפשר להדליק/לכבות "פתיחה בכל קוד", לבחור ניסיון ולאפס לצופה הבא - בלי לגעת בטלפון של הצופה.'], en: ['Remote control from a second phone', 'From the second phone: turn "any code" on/off, pick the attempt and reset for the next spectator - without touching the spectator\'s phone.'] },
  { ver: '5.4', icon: '🎯', target: '#togglePracticeMode', he: ['מצב תרגול', 'מתרגלים את כל ההצצות בלי שזה נשמר בהיסטוריה.'], en: ['Practice mode', 'Practice all the peeks without saving to history.'] },
  { ver: '5.2', icon: '📲', target: '#toggleRemotePeek', he: ['הצצה מטלפון שני', 'הקוד שהצופה מקליד מופיע מיד בגדול בטלפון אחר.'], en: ['Second-phone peek', 'The code the spectator types appears instantly, big, on another phone.'] },
  { ver: '5.2', icon: '🌐', target: '#uiLangSelector', he: ['אנגלית', 'אפשר להעביר את כל האפליקציה לאנגלית (לשונית עוד).'], en: ['English', 'Switch the whole app to English (More tab).'] }
];

function whatsNewSince(fromVersion, toVersion) {
  return WHATS_NEW.filter((it) => compareSemver(it.ver, fromVersion) > 0 && compareSemver(it.ver, toVersion) <= 0).slice(0, WHATS_NEW_MAX_ITEMS);
}

function getWhatsNewSeenVersion() {
  try {
    const seen = localStorage.getItem(WHATS_NEW_SEEN_KEY);
    if (seen) return seen;
    // קוסם ותיק שמעדכן מגרסה ישנה (לפני שהיה מסך כזה): מראים לו את החידושים הכי חשובים מהחודש האחרון
    if (localStorage.getItem(CONFIG_STORAGE_KEY) && localStorage.getItem(GUIDE_SEEN_KEY)) return '5.1';
  } catch (e) {}
  return null; // קוסם חדש - לא מראים (הוא מקבל את הסיור)
}

function markWhatsNewSeen() {
  try {
    localStorage.setItem(WHATS_NEW_SEEN_KEY, getInstalledAppVersion());
  } catch (e) {}
}

function maybeShowWhatsNew() {
  const overlay = document.getElementById('whatsNewOverlay');
  if (!overlay || overlay.style.display === 'flex') return;
  if (!setupOverlay || !setupOverlay.classList.contains('open') || isLicenseOverlayVisible()) return;
  const updatePopup = document.getElementById('updatePopupOverlay');
  if (updatePopup && updatePopup.style.display === 'flex') return;
  const tour = document.getElementById('tourLayer');
  if (tour && tour.style.display === 'block') return;
  const current = getInstalledAppVersion();
  const seen = getWhatsNewSeenVersion();
  if (!seen) return markWhatsNewSeen();
  if (compareSemver(current, seen) <= 0) return;
  const items = whatsNewSince(seen, current);
  if (!items.length) return markWhatsNewSeen();
  renderWhatsNew(items, current);
  overlay.style.display = 'flex';
}

// פתיחה ידנית מלשונית "עוד": תמיד מראה את החידושים האחרונים, בלי קשר למה שכבר נראה
function openWhatsNewManually() {
  const overlay = document.getElementById('whatsNewOverlay');
  if (!overlay) return;
  renderWhatsNew(WHATS_NEW.slice(0, WHATS_NEW_MAX_ITEMS), getInstalledAppVersion(), true);
  overlay.style.display = 'flex';
}

function renderWhatsNew(items, version, manual) {
  const en = isEnglishUi();
  document.getElementById('whatsNewTitle').textContent = en ? `What's new in v${version}` : `מה חדש בגרסה ${version}`;
  document.getElementById('whatsNewSub').textContent = manual
    ? en ? 'The latest features' : 'החידושים האחרונים באפליקציה'
    : en ? `${items.length} new things since your last version` : `${items.length} דברים חדשים מאז הגרסה הקודמת שלך`;
  document.getElementById('whatsNewDoneBtn').textContent = en ? "Great, let's go" : 'מעולה, בוא נתחיל';
  const list = document.getElementById('whatsNewList');
  list.innerHTML = '';
  items.forEach((it) => {
    const [title, text] = en ? it.en : it.he;
    const row = document.createElement('div');
    row.className = 'whats-new-item';
    const icon = document.createElement('div');
    icon.className = 'whats-new-icon';
    icon.textContent = it.icon;
    const body = document.createElement('div');
    const t = document.createElement('div');
    t.className = 'whats-new-item-title';
    t.textContent = title;
    const d = document.createElement('div');
    d.className = 'whats-new-item-text';
    d.textContent = text;
    body.append(t, d);
    if (it.target && document.querySelector(it.target)) {
      const tryBtn = document.createElement('button');
      tryBtn.type = 'button';
      tryBtn.className = 'whats-new-try';
      tryBtn.textContent = en ? 'Try it now →' : 'נסה עכשיו ←';
      tryBtn.addEventListener('click', () => goToSetting(it.target));
      body.appendChild(tryBtn);
    }
    row.append(icon, body);
    list.appendChild(row);
  });
}

function closeWhatsNew() {
  document.getElementById('whatsNewOverlay').style.display = 'none';
  markWhatsNewSeen();
}

// לוקח את הקוסם ישר להגדרה: פותח את הלשונית הנכונה, גולל אליה ומאיר אותה
function goToSetting(selector) {
  closeWhatsNew();
  const el = document.querySelector(selector);
  if (!el) return;
  const panel = el.closest('.settings-panel');
  if (panel && typeof showSettingsTab === 'function') showSettingsTab(panel.dataset.tab);
  const row = el.closest('.clean-toggle-row, .oneui-field-block') || el;
  setTimeout(() => {
    row.scrollIntoView({ block: 'center', behavior: 'smooth' });
    row.classList.remove('whats-new-flash');
    void row.offsetWidth;
    row.classList.add('whats-new-flash');
  }, 250);
}

function initWhatsNew() {
  const done = document.getElementById('whatsNewDoneBtn');
  if (done) done.addEventListener('click', closeWhatsNew);
  const open = document.getElementById('openWhatsNewBtn');
  if (open) open.addEventListener('click', openWhatsNewManually);
}

// ============================================================================
// 43. מכירה: תקופת ניסיון, מחיר והוראות תשלום (נקבעים באתר הניהול)
// ============================================================================
// var: בדיקת הרישיון (שרצה מוקדם יותר בקובץ) משתמשת בהם
var SALE_CFG_KEY = 'magic_sale_cfg_v1';
var DAY_MS = 24 * 60 * 60 * 1000;

function normalizeSaleConfig(c) {
  const link = String((c && c.pay_link) || '');
  return {
    price: Number(c && c.price) || 0,
    price_was: Number(c && c.price_was) || 0,
    pay_phone: (c && c.pay_phone) || '',
    pay_link: /^https:\/\/[^\s]+$/i.test(link) ? link : '',
    pay_note: (c && c.pay_note) || '',
    trial_days: Number(c && c.trial_days) || 0
  };
}

function getSaleConfig() {
  try {
    const c = JSON.parse(localStorage.getItem(SALE_CFG_KEY) || 'null');
    if (c) return normalizeSaleConfig(c);
  } catch (e) {}
  return normalizeSaleConfig(null);
}

async function loadSaleConfig() {
  try {
    if (!window.MagicCloud || !window.MagicCloud.isConfigured()) return getSaleConfig();
    const cfg = await window.MagicCloud.getAppConfig();
    if (cfg) localStorage.setItem(SALE_CFG_KEY, JSON.stringify(normalizeSaleConfig(cfg)));
  } catch (e) {}
  return getSaleConfig();
}

// סוף תקופת הניסיון = שעת ההרשמה (של השרת) + מספר ימי הניסיון
function getTrialEnd() {
  const rec = window.MagicCloud && window.MagicCloud.device.getMyRecord ? window.MagicCloud.device.getMyRecord() : null;
  const created = rec && rec.createdAt ? new Date(rec.createdAt).getTime() : Date.now();
  const days = getSaleConfig().trial_days || 3;
  return created + days * DAY_MS;
}

function payInfoText() {
  const s = getSaleConfig();
  const en = isEnglishUi();
  const lines = [];
  if (s.pay_phone) lines.push(en ? `Pay with Bit / PayBox to:\n${s.pay_phone}` : `לתשלום בביט / פייבוקס למספר:\n${s.pay_phone}`);
  else if (s.pay_link) lines.push(en ? 'Tap "Pay" to open the payment page.' : 'לוחצים "לתשלום" ונפתח עמוד התשלום.');
  if (s.pay_note) lines.push(s.pay_note);
  return lines.join('\n\n');
}

function priceText() {
  const s = getSaleConfig();
  if (!s.price) return '';
  return isEnglishUi() ? `₪${s.price} · one-time payment` : `₪${s.price} · תשלום חד-פעמי`;
}

// פותח קישור חיצוני: באפליקציה (APK) הניווט נפתח בדפדפן של הטלפון, באתר בלשונית חדשה
function openExternalLink(url) {
  if (!/^https:\/\//i.test(url)) return;
  if (window.AndroidNative) window.location.href = url;
  else window.open(url, '_blank', 'noopener');
}

// פאנל תשלום אחד שמשמש גם את מסך "הניסיון הסתיים" וגם את כפתור "לרכישה"
function renderPayPanel(container) {
  if (!container) return;
  const s = getSaleConfig();
  const en = isEnglishUi();
  // בדיקת הרישיון רצה שוב ושוב - לא בונים מחדש (וכך לא מוחקים מה שהקוסם הקליד) אם לא השתנה כלום
  const sig = JSON.stringify(s) + en;
  if (container.dataset.sig === sig && container.children.length) return;
  container.dataset.sig = sig;
  container.innerHTML = '';

  const price = document.createElement('div');
  price.className = 'reg-pay-price';
  price.textContent = priceText();
  if (s.price && s.price_was > s.price) {
    const was = document.createElement('span');
    was.className = 'pay-was';
    was.textContent = `₪${s.price_was}`;
    price.appendChild(was);
  }
  if (s.price) container.appendChild(price);

  const how = document.createElement('div');
  how.className = 'reg-pay-how';
  how.textContent = payInfoText() || (en ? 'Payment details will appear here soon.' : 'פרטי התשלום יופיעו כאן בקרוב.');
  container.appendChild(how);

  const actions = document.createElement('div');
  actions.className = 'pay-actions';
  if (s.pay_link) {
    const pay = document.createElement('button');
    pay.type = 'button';
    pay.className = 'pay-action-btn primary';
    pay.textContent = en ? '💳 Pay' : '💳 לתשלום';
    pay.addEventListener('click', () => openExternalLink(s.pay_link));
    actions.appendChild(pay);
  }
  if (s.pay_phone) {
    const copy = document.createElement('button');
    copy.type = 'button';
    copy.className = 'pay-action-btn';
    copy.textContent = en ? '📋 Copy number' : '📋 העתק מספר';
    copy.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(s.pay_phone.replace(/[^\d+]/g, ''));
        copy.textContent = en ? 'Copied ✓' : 'הועתק ✓';
      } catch (e) {
        copy.textContent = s.pay_phone;
      }
    });
    actions.appendChild(copy);
  }
  if (actions.children.length) container.appendChild(actions);

  // שם המשלם עוזר למנהל למצוא את התשלום בביט כשהוא נעשה מחשבון של מישהו אחר (למשל הורה)
  const payer = document.createElement('input');
  payer.type = 'text';
  payer.className = 'pay-payer-input';
  payer.maxLength = 60;
  payer.placeholder = en ? 'Name on the payment (if not yours)' : 'השם שמופיע בתשלום (אם לא שלך)';
  container.appendChild(payer);

  const paid = document.createElement('button');
  paid.type = 'button';
  paid.className = 'license-reg-submit-btn';
  paid.textContent = en ? 'I paid ✓ Send' : 'שילמתי ✓ שלח הודעה';
  container.appendChild(paid);

  const status = document.createElement('div');
  status.className = 'pay-status';
  status.textContent = en ? 'Once the payment is confirmed the app stays open for good.' : 'ברגע שהתשלום מאושר - האפליקציה נשארת פתוחה לתמיד.';
  container.appendChild(status);

  paid.addEventListener('click', async () => {
    paid.disabled = true;
    const who = payer.value.trim();
    const text = `💰 שילמתי${s.price ? ` ₪${s.price}` : ''} על Lockscreen - נא לאשר${who ? `\nשם בתשלום: ${who}` : ''}`;
    try {
      await window.MagicCloud.device.sendFeedback({ text, appVersion: getInstalledAppVersion(), os: config.osTheme, model: config.deviceModel, notify: 'paid' });
      status.textContent = en ? 'Sent ✓ The app opens by itself as soon as the payment is confirmed.' : 'ההודעה נשלחה ✓ האפליקציה תיפתח לבד ברגע שהתשלום יאושר.';
    } catch (e) {
      paid.disabled = false;
      status.textContent = en ? 'Sending failed - check the internet and try again' : 'השליחה נכשלה - בדוק חיבור לאינטרנט ונסה שוב';
    }
  });
}

function fillPayInfo() {
  const title = document.getElementById('regTrialEndTitle');
  if (title) title.textContent = isEnglishUi() ? '⏰ Your free trial has ended' : '⏰ תקופת הניסיון הסתיימה';
  renderPayPanel(document.getElementById('regPayPanel'));
}

// מצב "עברתי לטלפון חדש": בלי ניסיון, הבקשה מגיעה למנהל כבקשת העברה
var regTransferMode = false;
// מצב "קוד הזמנה": קוסם שהמנהל הזמין נכנס מיד, בחינם לתמיד
var regVipMode = false;

function updateRegTrialNote() {
  const note = document.getElementById('regTrialNote');
  const btn = document.getElementById('submitRegBtn');
  const toggle = document.getElementById('regTransferToggle');
  const vipToggle = document.getElementById('regVipToggle');
  const vipInput = document.getElementById('regVipInput');
  const en = isEnglishUi();
  const days = regTransferMode || regVipMode ? 0 : getSaleConfig().trial_days;
  if (vipInput) {
    vipInput.style.display = regVipMode ? '' : 'none';
    vipInput.placeholder = en ? 'Invite code (VIP)' : 'קוד הזמנה (VIP)';
  }
  if (note) {
    note.style.display = regTransferMode || regVipMode || days > 0 ? '' : 'none';
    note.textContent = regVipMode
      ? en ? '⭐ With an invite code you get in right away - free, for good' : '⭐ עם קוד הזמנה נכנסים מיד - בחינם, לתמיד'
      : regTransferMode
        ? en ? '🔁 Sign up with the same phone number you bought with - your license moves to this phone once approved' : '🔁 נרשמים עם אותו מספר טלפון שקנית איתו - הרישיון יעבור לטלפון הזה אחרי אישור'
        : en ? `🎁 You get ${days} free trial days right after signing up` : `🎁 מקבלים ${days} ימי ניסיון חינם מיד אחרי ההרשמה`;
  }
  if (btn && !btn.disabled) {
    btn.textContent = regVipMode
      ? en ? 'Enter with code' : 'כניסה עם הקוד'
      : regTransferMode
        ? en ? 'Move my license' : 'העבר את הרישיון שלי'
        : days > 0 ? (en ? 'Start free trial' : 'התחל ניסיון חינם') : en ? 'Send request' : 'שלח בקשה';
  }
  if (toggle) {
    toggle.style.display = regVipMode ? 'none' : '';
    toggle.textContent = regTransferMode
      ? en ? 'New here? Back to sign up' : 'חדש כאן? חזרה להרשמה'
      : en ? 'Already bought and got a new phone?' : 'קנית כבר ועברת לטלפון חדש?';
  }
  if (vipToggle) {
    vipToggle.style.display = regTransferMode ? 'none' : '';
    vipToggle.textContent = regVipMode ? (en ? 'No code? Back to sign up' : 'אין קוד? חזרה להרשמה') : en ? '⭐ Have an invite code?' : '⭐ יש לך קוד הזמנה?';
  }
}

function updateTrialBanner() {
  const banner = document.getElementById('trialBanner');
  if (!banner) return;
  const cache = readLicenseCache();
  if (!cache || cache.status !== 'trial') {
    banner.style.display = 'none';
    return;
  }
  const left = Math.max(0, Math.ceil((Number(cache.trialEnd) - Date.now()) / DAY_MS));
  const en = isEnglishUi();
  document.getElementById('trialBannerText').textContent = en
    ? `🎁 Free trial: ${left} day${left === 1 ? '' : 's'} left`
    : left === 1 ? '🎁 ניסיון חינם: נשאר יום אחד' : `🎁 ניסיון חינם: נשארו ${left} ימים`;
  document.getElementById('trialBuyBtn').textContent = en ? 'Buy' : 'לרכישה';
  banner.style.display = 'flex';
}

function openPayInfo() {
  const en = isEnglishUi();
  document.getElementById('buyTitle').textContent = en ? '💰 Buy Lockscreen' : '💰 רכישת Lockscreen';
  document.getElementById('buyCloseBtn').textContent = en ? 'Close' : 'סגור';
  renderPayPanel(document.getElementById('buyPanel'));
  document.getElementById('buyOverlay').style.display = 'flex';
  loadSaleConfig().then(() => renderPayPanel(document.getElementById('buyPanel')));
}

function closePayInfo() {
  document.getElementById('buyOverlay').style.display = 'none';
}

function initSale() {
  const buy = document.getElementById('trialBuyBtn');
  if (buy) buy.addEventListener('click', openPayInfo);
  const close = document.getElementById('buyCloseBtn');
  if (close) close.addEventListener('click', closePayInfo);
  const overlay = document.getElementById('buyOverlay');
  if (overlay) overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closePayInfo();
  });
  const toggle = document.getElementById('regTransferToggle');
  if (toggle) toggle.addEventListener('click', () => {
    regTransferMode = !regTransferMode;
    regVipMode = false;
    updateRegTrialNote();
  });
  const vipToggle = document.getElementById('regVipToggle');
  if (vipToggle) vipToggle.addEventListener('click', () => {
    regVipMode = !regVipMode;
    regTransferMode = false;
    updateRegTrialNote();
    const input = document.getElementById('regVipInput');
    if (regVipMode && input) input.focus();
  });
  updateTrialBanner();
}

// אתחול ראשוני
initSale();
initWhatsNew();
initTrickTips();
initTour();
initPreShowCheck();
initCallReveal();
initNewReveals();
initRemoteControl();
initLanguage();
initRemotePeek();
initFeedbackBox();
initAdminMessage();
initMagicFeatures();
initRoutines();
initCloudBackup();
initGuide();
initSettingsTabs();
initNotesReveal();
// אם נרשמו פנים: טוענים ומחממים את מנוע הזיהוי ברקע, כדי שהזיהוי מול הקהל יהיה מיידי
if (hasEnrolledFace()) setTimeout(() => loadFaceEngine().catch(() => {}), 2500);
initDeviceLicenseGate();
initSplashScreen();
initBiometricsEnrollment();
loadCustomMedia();
applyConfigToUI();
initInAppSelfUpdater();

// Service Worker: מאפשר עבודה אופליין בגרסת האתר. הקבצים מתעדכנים בפתיחה הבאה,
// בלי ריענון אוטומטי באמצע שימוש (כדי לא לשבור הופעה).
if (window.location.protocol !== 'file:' && 'serviceWorker' in navigator) {
  navigator.serviceWorker
    .register('./sw.js', { scope: './' })
    .then((reg) => reg.update())
    .catch(() => {});
}

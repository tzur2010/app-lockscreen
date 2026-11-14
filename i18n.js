// ============================================================================
// שפת האפליקציה: עברית (ברירת מחדל) או אנגלית
// ----------------------------------------------------------------------------
// כשנבחרה אנגלית, כל טקסט בעברית שמופיע במסך מתורגם אוטומטית לפי המילון
// (כולל טקסטים שנוצרים תוך כדי ריצה, דרך MutationObserver).
// הקובץ נטען לפני app.js.
// ============================================================================
(function () {
  var CONFIG_KEY = 'magic_lockscreen_config_v6';
  var lang = 'he';
  try {
    var cfg = JSON.parse(localStorage.getItem(CONFIG_KEY) || '{}');
    if (cfg && cfg.uiLang === 'en') lang = 'en';
  } catch (e) {}

  var isEn = lang === 'en';
  window.MagicI18n = { lang: lang, isEn: isEn, t: function (s) { return s; } };
  if (!isEn) return;

  document.documentElement.lang = 'en';
  document.documentElement.dir = 'ltr';

  var D = {
    // הרשמה ורישיון
    'הרשמה לאפליקציה': 'Sign up',
    'הזן שם מלא ומספר טלפון לקבלת אישור גישה': 'Enter your full name and phone number to request access',
    'שלח בקשה': 'Send request',
    'שולח בקשה...': 'Sending request...',
    'הבקשה נשלחה וממתינה לאישור': 'Request sent, waiting for approval',
    'האפליקציה תיפתח אוטומטית מיד עם אישור הבקשה': 'The app will open automatically once your request is approved',
    'הגישה למכשיר זה בוטלה': 'Access for this device has been revoked',
    'לפרטים יש לפנות למנהל': 'Please contact the administrator',
    'בודק הרשאת גישה...': 'Checking access...',
    'נדרש חיבור לאינטרנט': 'Internet connection required',
    'המערכת עדיין לא הוגדרה. פנה למנהל.': 'The system is not set up yet. Contact the administrator.',
    'אין חיבור לאינטרנט. יש להתחבר כדי לאמת את הגישה.': 'No internet connection. Connect to verify access.',
    'אין חיבור לאינטרנט, מנסה שוב...': 'No internet connection, retrying...',
    'אין חיבור לאינטרנט, נסה שוב': 'No internet connection, try again',
    'אנא הזן שם מלא': 'Please enter your full name',
    'אנא הזן מספר טלפון תקין': 'Please enter a valid phone number',
    'שליחת הבקשה נכשלה, נסה שוב': 'Sending failed, try again',
    'שם מלא': 'Full name',
    'מספר טלפון': 'Phone number',

    // מדריך
    '📖 מדריך מהיר': '📖 Quick Guide',
    '🚀 התחלה מהירה': '🚀 Quick start',
    '1. בוחרים Samsung או iPhone ואת הדגם.': '1. Choose Samsung or iPhone and the model.',
    '2. מגדירים בהגדרות מה שרוצים.': '2. Set up whatever you want in the settings.',
    '3. לוחצים': '3. Tap',
    '"שמור וסגור"': '"Save & Close"',
    'ובוחרים סוג נעילה: קוד 4 או 6 ספרות, סיסמה, דפוס או החלקה.': 'and pick a lock type: 4 or 6-digit PIN, password, pattern or swipe.',
    '4. מסך הנעילה מוכן. נותנים את הטלפון לצופה.': '4. The lock screen is ready. Hand the phone to the spectator.',
    '🔐 איך חוזרים להגדרות (בסתר)': '🔐 How to get back to settings (secretly)',
    'כל אחת מהדרכים פותחת את התפריט הסודי:': 'Any of these opens the secret menu:',
    '• לחיצה ארוכה של': '• Long-press for',
    '3 שניות על השעון': '3 seconds on the clock',
    '2.5 שניות בפינה הימנית העליונה': '2.5 seconds in the top-right corner',
    '3 הקשות': '3 taps',
    'על סמל המנעול': 'on the lock icon',
    'בפינה השמאלית העליונה': 'in the top-left corner',
    '🎯 פתיחה בכל קוד ובחירת ניסיון': '🎯 Any-code unlock & choosing the attempt',
    'כש': 'When',
    '"פתיחה בכל קוד"': '"Unlock with any code"',
    'דולק, כל קוד שהצופה מקליד פותח את הטלפון. ב': 'is on, any code the spectator types unlocks the phone. In',
    '"באיזה ניסיון הטלפון ייפתח"': '"Which attempt unlocks the phone"',
    'בוחרים 1–5: למשל 2 = בפעם הראשונה "קוד שגוי", ובשנייה נפתח.': 'choose 1–5: e.g. 2 = the first try shows "wrong code" and the second one unlocks.',
    'לחיצה כפולה על השעון': 'Double-tap the clock',
    'מדליקה/מכבה את "פתיחה בכל קוד" בסתר (מרגישים רטט קצר).': 'to secretly turn "Unlock with any code" on/off (you feel a short buzz).',
    '👁️ איך רואים מה הצופה הקליד': '👁️ How to see what the spectator typed',
    'לחיצה ארוכה בשטח ריק': 'Long-press an empty area',
    'במסך: מופיעה תיבה עם הקוד. בדפוס, הנקודות ממוספרות לפי הסדר (1 בירוק = התחלה).': 'of the screen: a box shows the code. For patterns the dots are numbered in order (green 1 = start).',
    'הקשה אחת על השעון': 'One tap on the clock',
    ': השעון מציג לשלוש שניות את הקוד כאילו הוא השעה.': ': the clock shows the code for 3 seconds as if it were the time.',
    'רטט בכיס': 'Pocket vibration',
    ': הטלפון רוטט את הספרות. מספר הרטטים = הספרה, רטט ארוך = 0.': ': the phone buzzes the digits. Number of buzzes = the digit, a long buzz = 0.',
    'שעון חכם': 'Smartwatch',
    ': מדליקים "שלח את הקוד לשעון", והקוד מופיע על השעון שביד.': ': turn on "Send the code to the watch" and the code appears on your wrist.',
    '💬 חשיפה בהתראה': '💬 Notification reveal',
    'כמה שניות אחרי שהטלפון נפתח, מגיעה הודעה שבתוכה הקוד שהצופה בחר. בהגדרות בוחרים את שם השולח, את התמונה, את הטקסט (': 'A few seconds after the phone unlocks, a message arrives containing the code the spectator chose. In settings you pick the sender name, photo, text (',
    '{קוד}': '{code}',
    'מוחלף בקוד) ואחרי כמה שניות ההודעה מגיעה.': 'is replaced with the code) and how many seconds until it arrives.',
    '📝 חשיפה בפתקים': '📝 Notes reveal',
    'בלשונית': 'In the',
    'מראה': 'Look',
    'מדליקים "חשיפה בפתקים". אחרי שהטלפון נפתח מופיע פתק שבו כבר כתוב הקוד שהצופה בחר, עם שעה מוקדמת ("לפני שעה" / "אתמול"), כאילו חזית אותו מראש. במקום שבו המספר צריך להופיע כותבים': 'tab, turn on "Notes reveal". After unlocking, a note opens that already contains the spectator\'s code, with an earlier time ("1 hour ago" / "yesterday"), as if you predicted it. Where the number should appear, write',
    '🔄 בין צופה לצופה': '🔄 Between spectators',
    'טריק': 'Trick',
    'לוחצים': 'Tap',
    '"מוכן לצופה הבא"': '"Ready for next spectator"',
    ': הקוד האחרון נמחק, הניסיונות מתאפסים והטלפון חוזר למסך הנעילה. כל הקודים נשמרים ב': ': the last code is cleared, attempts reset and the phone goes back to the lock screen. All codes are kept in the',
    'היסטוריית הקודים': 'code history',
    'בלשונית הצצה.': 'in the Peek tab.',
    'בלי להיכנס להגדרות:': 'Without opening settings:',
    '2 הקשות בפינה הימנית העליונה': '2 taps in the top-right corner',
    'של מסך הבית/הפתקים נועלות מחדש.': 'of the home/notes screen lock it again.',
    '🚪 יציאת חירום': '🚪 Emergency exit',
    '3 הקשות מהירות': '3 quick taps',
    'על סמל הסוללה/Wi-Fi פותחות את הטלפון מיד.': 'on the battery/Wi-Fi icon unlock the phone immediately.',
    '• לחיצה על': '• Pressing the',
    'חיישן טביעת האצבע': 'fingerprint sensor',
    'בתחתית, עם האצבע שרשמת בהגדרות. אצבע אחרת תקבל "טביעת אצבע לא תואמת".': 'at the bottom with the finger you enrolled. Any other finger gets "Fingerprint not recognized".',
    '⭐ רוטינות וגיבוי': '⭐ Routines & backup',
    'רוטינות': 'Routines',
    ': מגדירים טריק, נותנים לו שם ולוחצים "שמור". אחר כך עוברים בין טריקים בלחיצה על "טען".': ': set up a trick, give it a name and tap "Save". Then switch between tricks with "Load".',
    'גיבוי': 'Backup',
    ': ההגדרות נשמרות בענן אוטומטית. בטלפון חדש מכניסים את קוד הגיבוי ומקבלים הכל בחזרה. שמור את הקוד!': ': settings are saved to the cloud automatically. On a new phone, enter the backup code and get everything back. Keep the code!',
    '⚡ הפעלה מהירה': '⚡ Quick launch',
    'בהגדרות:': 'In settings:',
    '"הוסף ווידג\'ט שקוף למסך הבית"': '"Add invisible widget to home screen"',
    '. לחיצה על המקום השקוף במסך הבית פותחת את מסך הנעילה המזויף, בלי לחפש את האפליקציה.': '. Tapping the invisible spot on the home screen opens the fake lock screen without searching for the app.',
    'הבנתי': 'Got it',
    'מדריך': 'Guide',

    // חלונות
    'הודעות': 'Messages',
    'עכשיו': 'now',
    'איזו נעילה להציג?': 'Which lock to show?',
    'קוד PIN': 'PIN code',
    '4 ספרות': '4 digits',
    '6 ספרות': '6 digits',
    'סיסמה': 'Password',
    'אותיות ומספרים': 'Letters & numbers',
    'דפוס': 'Pattern',
    'ציור 3×3': '3×3 drawing',
    'החלקה': 'Swipe',
    'בלי קוד': 'No code',
    'חזרה להגדרות': 'Back to settings',
    'יש עדכון חדש': 'New update available',
    'עדכן עכשיו': 'Update now',
    'אחר כך': 'Later',
    'הודעה מהמפתח': 'Message from the developer',
    'תודה, הבנתי': 'Thanks, got it',
    'רוצה לענות? כתוב משוב': 'Want to reply? Write feedback',
    'ממשק One UI מדויק 1:1': 'Exact 1:1 One UI',
    'בחר מכשיר': 'Choose a device',
    'ממשק iOS עם Face ID': 'iOS with Face ID',
    '→ החלף מכשיר': '← Change device',

    // לשוניות הגדרות
    'הצצה': 'Peek',
    'אבטחה': 'Security',
    'עוד': 'More',
    '🔄 מוכן לצופה הבא': '🔄 Ready for next spectator',
    'רוטינות שמורות': 'Saved routines',
    'שומרים את כל ההגדרות הנוכחיות בשם, ועוברים בין טריקים בלחיצה אחת.': 'Save all current settings under a name and switch between tricks with one tap.',
    'שמור': 'Save',
    'טען': 'Load',
    'מחק': 'Delete',
    'בטוח?': 'Sure?',
    'עוד אין רוטינות שמורות': 'No saved routines yet',
    'מצבי מנטליזם וקסמים': 'Mentalism & magic modes',
    'פתיחה בכל קוד': 'Unlock with any code',
    'כל קוד של 4/6 ספרות או דפוס שיוקשו יפתחו את המכשיר מיד ויישמרו בזיכרון': 'Any 4/6-digit code or pattern entered unlocks the device and is saved',
    'באיזה ניסיון הטלפון ייפתח': 'Which attempt unlocks the phone',
    'הטלפון נפתח כבר בניסיון הראשון.': 'The phone unlocks on the first attempt.',
    'כמה שניות אחרי שהטלפון נפתח, מגיעה הודעה שבתוכה הקוד שהצופה בחר.': 'A few seconds after the phone unlocks, a message arrives containing the code the spectator chose.',
    'שם השולח': 'Sender name',
    'תמונת השולח (מה שמופיע בהודעה במקום הלוגו)': 'Sender photo (shown in the message instead of the logo)',
    'בחר תמונה מהגלריה': 'Choose from gallery',
    'הסר': 'Remove',
    'בלי תמונה: עיגול צבעוני עם האות הראשונה של השם, כמו איש קשר בלי תמונה.': 'No photo: a colored circle with the first letter of the name, like a contact without a photo.',
    'תוכן ההודעה ({קוד} יוחלף בקוד שהוקלד)': 'Message text ({code} is replaced with the typed code)',
    'אחרי כמה שניות ההודעה מגיעה': 'Seconds until the message arrives',
    'נסה עכשיו (עם הקוד 1234)': 'Try now (with code 1234)',
    'התאמה חזותית של מסך הנעילה': 'Lock screen appearance',
    'בחירת טפט': 'Wallpaper',
    'טפט מובנה של הדגם או העלאת תמונה מהגלריה': 'Built-in model wallpaper or a photo from your gallery',
    'החלף טפט': 'Change wallpaper',
    'גלריה': 'Gallery',
    'איפוס': 'Reset',
    'טפט אישי': 'Custom',
    'בחירת מצב נעילה': 'Lock mode',
    'אורך קוד PIN (פתיחה אוטומטית ללא צורך ב-OK)': 'PIN length (auto-unlock, no OK needed)',
    'דפוס בלתי נראה (ללא קו מצויר)': 'Invisible pattern (no line drawn)',
    'דגם מכשיר': 'Device model',
    'לאחר הפתיחה': 'After unlocking',
    'יעד מיד לאחר שחרור הנעילה': 'Destination after unlocking',
    'מסך בית סמסונג': 'Home screen',
    'דף פתקים מדומה (Notes)': 'Fake Notes page',
    '📝 חשיפה בפתקים (תחזית)': '📝 Notes reveal (prediction)',
    'אחרי הפתיחה נפתח פתק שבו כבר כתוב הקוד שהצופה בחר, עם שעה מוקדמת, כאילו חזית אותו מראש.': 'After unlocking, a note opens that already contains the spectator\'s code with an earlier time, as if you predicted it.',
    'תוכן הפתק ({קוד} יוחלף בקוד שהוקלד)': 'Note text ({code} is replaced with the typed code)',
    'הפתק "נכתב"': 'The note was "written"',
    'לפני רבע שעה': '15 min ago',
    'לפני שעה': '1 hour ago',
    'לפני 3 שעות': '3 hours ago',
    'אתמול': 'Yesterday',
    'צילום מסך בית אישי': 'Custom home screenshot',
    'איפוס מסך בית': 'Reset home screen',
    'קוד אישי, טביעת אצבע וזיהוי פנים': 'Personal code, fingerprint & face ID',
    'פתיחה בטביעת אצבע': 'Fingerprint unlock',
    'החיישן בתחתית פותח את המכשיר רק עם האצבע שנרשמה (מיקום, משך לחיצה וגודל מגע). אצבע אחרת = "טביעת אצבע לא תואמת".': 'The sensor at the bottom unlocks only with the enrolled finger (position, press time and contact size). Another finger = "Fingerprint not recognized".',
    'קוד ספציפי (כשכפיית פתיחה כבויה):': 'Specific code (when any-code unlock is off):',
    'נשמר ✓': 'Saved ✓',
    'רישום דפוס (Pattern) אישי': 'Personal pattern',
    'דפוס שמור ✓': 'Pattern saved ✓',
    'חבר לפחות 4 נקודות כדי לשמור דפוס אישי!': 'Connect at least 4 dots to save a pattern!',
    'כיול טביעת אצבע מדויקת': 'Fingerprint calibration',
    'כייל חיישן': 'Calibrate',
    'הנח את האצבע שתפתח את הטלפון, באותה נקודה ובאותו משך, 4 פעמים': 'Place the finger that will unlock the phone, same spot and same duration, 4 times',
    'הנח את אותה אצבע באותה נקודה ובאותו משך לחיצה כמו בלחיצה הראשונה': 'Use the same finger, same spot and same press time as the first press',
    'לחיצה ארוכה מדי! החזק כחצי שנייה ושחרר': 'Too long! Hold for about half a second and release',
    'לחיצה קצרה מדי! החזק את האצבע כחצי שנייה ושחרר': 'Too short! Hold your finger for about half a second and release',
    'נראה כמו אצבע אחרת. השתמש באותה אצבע בכל הלחיצות.': 'Looks like a different finger. Use the same finger every time.',
    'רישום זיהוי פנים (Face ID)': 'Face ID enrollment',
    'טרם נרשמו פנים — לחץ "סרוק פנים כעת" לרישום הפנים שלך': 'No face enrolled — tap "Scan face" to register your face',
    'סרוק פנים': 'Scan face',
    'מקם את הפנים במסגרת לסריקה...': 'Place your face in the frame...',
    'טוען את מנוע זיהוי הפנים...': 'Loading the face engine...',
    'מפעיל מצלמת סלפי... הבט ישירות למצלמה': 'Starting the selfie camera... look straight at it',
    'הבט למצלמה והזז מעט את הראש מצד לצד...': 'Look at the camera and move your head slightly side to side...',
    'הפנים שלך נשמרו! רק הפנים שלך יפתחו ✓': 'Your face is saved! Only your face will unlock ✓',
    'הפנים שלך שמורות (זיהוי פנים חכם). רק הן יפתחו ✓': 'Your face is saved (smart recognition). Only it will unlock ✓',
    'הסריקה לא הייתה יציבה. נסה שוב, רק אדם אחד מול המצלמה.': 'The scan was unstable. Try again with only one person in front of the camera.',
    'לא זוהו פנים ברורות. נסה שוב באור טוב, עם הפנים במרכז העיגול.': 'No clear face detected. Try again in good light with your face in the circle.',
    'לא הצלחנו לטעון את מנוע זיהוי הפנים. נסה שוב.': 'Could not load the face engine. Try again.',
    'לא ניתן לגשת למצלמה — אשר הרשאת מצלמה בדפדפן לסריקת פנים': 'Cannot access the camera — allow camera permission to scan your face',
    'זיהוי הפנים שודרג — לחץ "סרוק פנים כעת" כדי לרשום את הפנים מחדש': 'Face recognition was upgraded — tap "Scan face" to enroll again',
    'הצצה ותצוגה': 'Peek & display',
    'קוד אחרון שנקלט:': 'Last captured code:',
    'היסטוריית קודים': 'Code history',
    'נקה': 'Clear',
    'עוד לא הוקלדו קודים': 'No codes typed yet',
    '⌚ שלח את הקוד לשעון החכם': '⌚ Send the code to your smartwatch',
    'כל קוד או דפוס שהצופה מקליד מופיע מיד על השעון שמחובר לטלפון, בלי לגעת בטלפון. בטלפון עצמו לא רואים ולא שומעים כלום.': 'Every code or pattern the spectator enters appears instantly on the watch connected to the phone. Nothing shows or sounds on the phone itself.',
    'זמין רק באפליקציית האנדרואיד (עם שעון חכם שמחובר לטלפון).': 'Available only in the Android app (with a smartwatch connected to the phone).',
    'שלח בדיקה לשעון': 'Send a test to the watch',
    'בשעון Galaxy: באפליקציית Galaxy Wearable ← התראות ← יש להדליק "הצג התראות בשעון גם כשהטלפון בשימוש", ולוודא שההתראות של Lockscreen מופעלות.': 'On a Galaxy Watch: in the Galaxy Wearable app → Notifications → turn on "Show phone notifications on watch while using phone", and make sure Lockscreen notifications are allowed.',
    'בדיקה - אם זה מופיע בשעון, הכל עובד': 'Test - if you see this on the watch, it works',
    'ההתראות חסומות. אשר את הרשאת ההתראות שקפצה ונסה שוב.': 'Notifications are blocked. Allow the notification permission and try again.',
    'נשלח ✓ בדוק את השעון. אם לא הופיע: באפליקציית Galaxy Wearable ← התראות ← הדלק "הצג התראות בשעון גם כשהטלפון בשימוש".': 'Sent ✓ Check the watch. If nothing appeared: Galaxy Wearable → Notifications → turn on "Show phone notifications on watch while using phone".',
    '📲 שלח את הקוד לטלפון שני': '📲 Send the code to a second phone',
    'כל קוד שהצופה מקליד מופיע מיד בגדול בטלפון אחר: של עוזר בקהל, או טלפון שני בכיס שלך. הטלפון השני רק פותח קישור - לא צריך להתקין כלום.': 'Every code the spectator types appears instantly, big, on another phone: a helper in the audience or a second phone in your pocket. The second phone just opens a link - nothing to install.',
    'שלח קישור בוואטסאפ': 'Send link on WhatsApp',
    'העתק קישור': 'Copy link',
    'שלח בדיקה': 'Send test',
    'קישור חדש': 'New link',
    'פתח את הקישור בטלפון השני והשאר את המסך דולק. הקישור סודי - מי שיש לו אותו רואה את הקודים.': 'Open the link on the second phone and keep the screen on. The link is secret - anyone who has it sees the codes.',
    'הקישור הועתק ✓': 'Link copied ✓',
    'לא הצלחתי להעתיק - סמן את הקישור והעתק ידנית': 'Could not copy - select the link and copy it manually',
    'שולח...': 'Sending...',
    'נשלח ✓ בטלפון השני אמור להופיע 1234': 'Sent ✓ The second phone should show 1234',
    'השליחה נכשלה - בדוק חיבור לאינטרנט': 'Sending failed - check your internet connection',
    'נוצר קישור חדש - שלח אותו שוב לטלפון השני': 'New link created - send it to the second phone again',
    'ליצור קישור חדש? הקישור הישן יפסיק לקבל קודים.': 'Create a new link? The old link will stop receiving codes.',
    'צליל מקשים מקורי של סמסונג': 'Original keypad sound',
    'רטט סודי של הקוד בכיס (Haptic Peek)': 'Secret pocket vibration of the code (Haptic Peek)',
    'הצגה בשעון העליון בלחיצה (Clock Peek)': 'Show in the top clock on tap (Clock Peek)',
    'הצצה בלחיצה ממושכת בשטח ריק (Hold Peek)': 'Peek by long-pressing an empty area (Hold Peek)',
    'הצג פס סטטוס עליון (שעה, סוללה וקליטה)': 'Show status bar (time, battery, signal)',
    'הצג חור מצלמה / Dynamic Island': 'Show camera hole / Dynamic Island',
    'הצג חיישן טביעת אצבע בתחתית': 'Show fingerprint sensor at the bottom',
    'הצג פס עליון': 'Show top bar',
    'ללא פס עליון': 'No top bar',
    '📖 מדריך: איך משתמשים באפליקציה': '📖 Guide: how to use the app',
    'הפעלה מהירה': 'Quick launch',
    'הפעלה מהירה וסמויה (Quick Trigger)': 'Quick hidden launch (Quick Trigger)',
    "הפעל את מסך הנעילה בלחיצה אחת מבלי לחפש ברשימת האפליקציות: ווידג'ט שקוף 1×1 למסך הבית או כפתור צד סמסונג (לחיצה כפולה → פתיחת אפליקציה → Lockscreen).": 'Launch the lock screen with one tap without searching your apps: an invisible 1×1 home screen widget, or the Samsung side key (double press → open app → Lockscreen).',
    "+ הוסף ווידג'ט שקוף למסך הבית": '+ Add invisible widget to home screen',
    '✓ אשר את הוספת הווידג׳ט בחלונית שנפתחה': '✓ Confirm adding the widget in the dialog',
    'להוספת ווידג׳ט שקוף: לחץ לחיצה ארוכה על מסך הבית בטלפון -> ווידג׳טים -> בחר Lockscreen.\n\nלהפעלה מכפתור הצד של סמסונג: הגדרות המכשיר -> תכונות מתקדמות -> מקש צד -> לחיצה כפולה -> פתיחת אפליקציה -> Lockscreen.': 'To add an invisible widget: long-press your home screen -> Widgets -> choose Lockscreen.\n\nTo launch from the Samsung side key: Settings -> Advanced features -> Side key -> Double press -> Open app -> Lockscreen.',
    'גיבוי הגדרות': 'Settings backup',
    'ההגדרות והרוטינות נשמרות בענן אוטומטית. בטלפון חדש או אחרי התקנה מחדש, מכניסים את הקוד ומקבלים הכל בחזרה.': 'Settings and routines are saved to the cloud automatically. On a new phone or after reinstalling, enter the code and get everything back.',
    'העתק': 'Copy',
    'הועתק ✓': 'Copied ✓',
    'סמן והעתק': 'Select and copy',
    '💡 שמור את הקוד, למשל שלח אותו לעצמך בוואטסאפ.': '💡 Keep the code, e.g. send it to yourself on WhatsApp.',
    'גבה עכשיו': 'Back up now',
    'מגבה...': 'Backing up...',
    'עוד לא בוצע גיבוי': 'No backup yet',
    'הגיבוי זמין רק כשהאפליקציה מאושרת ומחוברת': 'Backup is available only when the app is approved and online',
    'הגיבוי נכשל, נסה שוב': 'Backup failed, try again',
    'שחזור מקוד גיבוי': 'Restore from backup code',
    'שחזר': 'Restore',
    'משחזר...': 'Restoring...',
    'ההגדרות שוחזרו ✓': 'Settings restored ✓',
    'לא נמצא גיבוי עם הקוד הזה': 'No backup found with this code',
    'השחזור נכשל, נסה שוב': 'Restore failed, try again',
    'השחזור יחליף את כל ההגדרות הנוכחיות. לחץ שוב לאישור.': 'Restoring replaces all current settings. Tap again to confirm.',
    'הקוד צריך להיות 12 תווים (למשל K7P2-9XQM-4RTA)': 'The code must be 12 characters (e.g. K7P2-9XQM-4RTA)',
    'משוב על האפליקציה': 'App feedback',
    'ספר לנו מה דעתך': 'Tell us what you think',
    'מה עבד טוב, מה לא עבד ומה חסר לך. המשוב נשלח ישירות למפתח.': 'What worked, what didn\'t and what you are missing. Feedback goes straight to the developer.',
    '💬 הודעה אחרונה מהמפתח:': '💬 Last message from the developer:',
    'שלח משוב': 'Send feedback',
    'כתוב משהו לפני השליחה': 'Write something before sending',
    'המשוב הקודם נשלח הרגע, נסה שוב בעוד חצי דקה': 'Feedback was just sent, try again in 30 seconds',
    'המערכת לא מחוברת כרגע': 'The system is not connected right now',
    'תודה! המשוב נשלח ✓': 'Thanks! Feedback sent ✓',
    'השליחה נכשלה, נסה שוב': 'Sending failed, try again',
    'גרסת אפליקציה ועדכונים': 'App version & updates',
    'הגדרות המשתמש נשמרות במלואן בעת עדכון': 'All your settings are kept when updating',
    'בדוק עדכון': 'Check for update',
    'בודק...': 'Checking...',
    'ההורדה נפתחת בדפדפן. בסיום יש לפתוח את הקובץ ולאשר "עדכן" (ההגדרות שלך נשמרות).': 'The download opens in the browser. When done, open the file and tap "Update" (your settings are kept).',
    'קובץ העדכון ירד בהצלחה! אשר "עדכן" בחלונית ההתקנה של אנדרואיד (כל ההגדרות שלך נשמרות).': 'The update downloaded! Tap "Update" in the Android installer (all your settings are kept).',
    'לא ניתן לפתוח את ההורדה. נסה שוב.': 'Could not open the download. Try again.',
    'התמונה גדולה מדי לשמירה בזיכרון הדפדפן.': 'The image is too large to save.',
    'שמור וסגור': 'Save & Close',
    'שפה': 'Language',

    // מסך הנעילה המזויף
    'החלק או הקש להזנת סיסמה': 'Swipe or tap to enter password',
    'הזן קוד גישה': 'Enter Passcode',
    'הזן קוד PIN': 'Enter PIN',
    'הזן סיסמה': 'Enter password',
    'סיסמה חייבת להכיל לפחות 4 תווים, ביניהם אות אחת לפחות.': 'Password must contain at least 4 characters, including at least 1 letter.',
    'צייר דפוס': 'Draw pattern',
    'צייר דפוס לשחרור': 'Draw pattern to unlock',
    'החלק לפתיחת המכשיר': 'Swipe to unlock',
    'סיסמה שגויה': 'Wrong password',
    'קוד PIN שגוי. נסה שוב': 'Incorrect PIN. Try again.',
    'דפוס שגוי. נסה שוב': 'Incorrect pattern. Try again.',
    'סיסמה שגויה. נסה שוב': 'Incorrect password. Try again.',
    'טביעת אצבע לא תואמת': 'Fingerprint not recognized',
    'החלק למעלה לפתיחה': 'Swipe up to open',
    'שיחת חירום': 'Emergency call',
    'חירום': 'Emergency',
    'ביטול': 'Cancel',
    '‹ כל הפתקים': '‹ All Notes',
    'פתקים': 'Notes',
    'סיום': 'Done',
    'קוד': 'Code',

    // תכונות (placeholder / title)
    'החלף בין מצב כהה לבהיר': 'Switch dark / light',
    'החלף ערכת נושא': 'Change theme',
    'סגור הגדרות': 'Close settings',
    'שם הרוטינה, למשל: PIN בניסיון שני': 'Routine name, e.g. PIN on 2nd try',
    'העלה טפט אישי': 'Upload custom wallpaper',
    'למשל: 1234 או ab12': 'e.g. 1234 or ab12',
    'כתוב כאן את המשוב שלך...': 'Write your feedback here...',
    'הצג/הסתר תווים': 'Show/hide characters',
    'חזרה למסך השעון הראשי': 'Back to the main clock screen',
    'אמא': 'Mom'
  };

  var ORD = { 'הראשון': '1st', 'השני': '2nd', 'השלישי': '3rd', 'הרביעי': '4th', 'החמישי': '5th' };
  var KIND = { 'קוד': 'Code', 'סיסמה': 'Password', 'דפוס': 'Pattern' };

  // טקסטים עם מספרים / ערכים משתנים
  var R = [
    [/^רשמי \((.+)\)$/, 'Official ($1)'],
    [/^(קוד|סיסמה|דפוס) · (.*)$/, function (m, k, t) { return KIND[k] + ' · ' + t; }],
    [/^גרסה מותקנת: (.+)$/, 'Installed version: $1'],
    [/^גובה לאחרונה: (.+)$/, 'Last backup: $1'],
    [/^היום, (\d{1,2}:\d{2})$/, 'Today, $1'],
    [/^אתמול, (\d{1,2}:\d{2})$/, 'Yesterday, $1'],
    [/^יש עדכון זמין \((v[\d.]+)\) - לחץ לעדכון$/, 'Update available ($1) - tap to update'],
    [/^יש עדכון חדש \((v[\d.]+)\)$/, 'New update ($1)'],
    [/^זמינה גרסה חדשה \((v[\d.]+)\) — לחץ על הכפתור הירוק למעלה$/, 'New version available ($1) — tap the green button above'],
    [/^האפליקציה מעודכנת לגרסה האחרונה \((v[\d.]+)\) ✓$/, 'The app is up to date ($1) ✓'],
    [/^הגרסה שלך: (v[\d.]+)\. כל ההגדרות נשמרות בעדכון\.$/, 'Your version: $1. All settings are kept when updating.'],
    [/^ההורדה הושלמה \((v[\d.]+)\) - פותח מתקין\.\.\.$/, 'Download complete ($1) - opening installer...'],
    [/^מוריד עדכון \((v[\d.]+)\)\.\.\.$/, 'Downloading update ($1)...'],
    [/^ההודעה תגיע בעוד (\d+) שניות\.\.\.$/, 'The message will arrive in $1 seconds...'],
    [/^(\d+) הניסיונות הראשונים יציגו "קוד שגוי" עם רטט קל, והטלפון ייפתח בניסיון (\S+)\.$/, function (m, n, o) { return 'The first ' + n + ' attempts show "wrong code" with a light buzz, and the phone unlocks on the ' + (ORD[o] || o) + ' attempt.'; }],
    [/^טרם נרשמה טביעת אצבע — (\d+) לחיצות \((\d+)\/(\d+)\)$/, 'No fingerprint enrolled — $1 presses ($2/$3)'],
    [/^לחיצה 1 מתוך (\d+): הנח את האצבע שתפתח את הטלפון, החזק כחצי שנייה ושחרר$/, 'Press 1 of $1: place the finger that will unlock the phone, hold for half a second and release'],
    [/^מעולה \((\d+)\/(\d+)\)! אותה אצבע, אותה לחיצה, עוד פעם$/, 'Great ($1/$2)! Same finger, same press, once more'],
    [/^סורק\.\.\. \((\d+)\/(\d+)\)$/, 'Scanning... ($1/$2)'],
    [/^טביעת אצבע שמורה \(מיקום \+ משך ~(\d+)ms( \+ גודל מגע)?\) ✓$/, function (m, ms, s) { return 'Fingerprint saved (position + ~' + ms + 'ms' + (s ? ' + contact size' : '') + ') ✓'; }],
    [/^טביעת האצבע נשמרה ✓ רק האצבע הזו \(גודל מגע, מיקום ומשך ~(\d+)ms\) תפתח$/, 'Fingerprint saved ✓ only this finger (contact size, position and ~$1ms) will unlock'],
    [/^טביעת האצבע נשמרה ✓ תפתח רק בלחיצה של ~(\d+)ms באותה נקודה$/, 'Fingerprint saved ✓ unlocks only with a ~$1ms press on the same spot'],
    [/^דפוס אישי מוגדר \((.+)\) - צייר דפוס חדש לשינוי$/, 'Personal pattern set ($1) - draw a new one to change it'],
    [/^קוד ה-PIN שלך מכיל לפחות (\d+) ספרות$/, 'Your PIN contains at least $1 digits'],
    [/^פתח את הקישור הזה בטלפון השני והשאר אותו פתוח:\n([\s\S]+)$/, 'Open this link on the second phone and keep it open:\n$1'],
    [/^(יום \S+), (\d+) ב(\S+)$/, function (m) { return m; }]
  ];

  function translate(raw) {
    if (!raw || !/[֐-׿]/.test(raw)) return null;
    var trimmed = raw.replace(/\s+/g, ' ').trim();
    var out = null;
    if (Object.prototype.hasOwnProperty.call(D, trimmed)) out = D[trimmed];
    else if (Object.prototype.hasOwnProperty.call(D, raw.trim())) out = D[raw.trim()];
    else {
      for (var i = 0; i < R.length; i++) {
        if (R[i][0].test(trimmed)) {
          out = trimmed.replace(R[i][0], R[i][1]);
          if (out === trimmed) out = null;
          break;
        }
      }
    }
    if (out === null) return null;
    // שומרים על רווחים בתחילת ובסוף הטקסט (חשוב לקטעים שמחוברים ל-<b>)
    var lead = /^\s/.test(raw) ? ' ' : '';
    var trail = /\s$/.test(raw) ? ' ' : '';
    return lead + out + trail;
  }

  window.MagicI18n.t = function (s) {
    var r = translate(String(s));
    return r === null ? s : r.trim();
  };

  var ATTRS = ['placeholder', 'title', 'aria-label'];
  var busy = false;

  function translateNode(node) {
    if (node.nodeType === 3) {
      var p = node.parentNode;
      if (p && (p.nodeName === 'SCRIPT' || p.nodeName === 'STYLE' || p.nodeName === 'TEXTAREA')) return;
      var tr = translate(node.nodeValue);
      if (tr !== null && tr !== node.nodeValue) node.nodeValue = tr;
      return;
    }
    if (node.nodeType !== 1) return;
    for (var a = 0; a < ATTRS.length; a++) {
      var v = node.getAttribute && node.getAttribute(ATTRS[a]);
      if (v) {
        var t = translate(v);
        if (t !== null) node.setAttribute(ATTRS[a], t.trim());
      }
    }
    var kids = node.childNodes;
    for (var i = 0; i < kids.length; i++) translateNode(kids[i]);
  }

  function run(root) {
    busy = true;
    try {
      translateNode(root);
    } finally {
      busy = false;
    }
  }

  // alert / confirm מתורגמים גם הם
  var origAlert = window.alert;
  var origConfirm = window.confirm;
  window.alert = function (m) { return origAlert.call(window, window.MagicI18n.t(m)); };
  window.confirm = function (m) { return origConfirm.call(window, window.MagicI18n.t(m)); };

  function start() {
    // שדות שהוגדרו מימין לשמאל - באנגלית הכיוון נקבע לפי מה שמקלידים
    document.querySelectorAll('[dir="rtl"]').forEach(function (el) { el.setAttribute('dir', 'auto'); });
    run(document.body);
    new MutationObserver(function (muts) {
      if (busy) return;
      busy = true;
      try {
        muts.forEach(function (m) {
          if (m.type === 'characterData') translateNode(m.target);
          else if (m.type === 'attributes') translateNode(m.target);
          else m.addedNodes.forEach(translateNode);
        });
      } finally {
        busy = false;
      }
    }).observe(document.body, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ATTRS });
  }

  if (document.body) start();
  else document.addEventListener('DOMContentLoaded', start);
})();

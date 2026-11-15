// ============================================================================
// מנוע ענן מאובטח: הרשמה, אישור/ביטול גישה ופרסום עדכונים (Firebase)
// ----------------------------------------------------------------------------
// כל הנתונים נשמרים ב-Firestore ומוגנים בחוקי אבטחה (firestore.rules):
//  • כל מכשיר מקבל זהות אנונימית משלו ויכול לראות רק את הבקשה של עצמו.
//  • רק המנהל (משתמש שרשום באוסף admins) יכול לראות את כל הלקוחות,
//    לאשר, לבטל גישה, למחוק ולפרסם עדכון.
// אין יותר קודי מאסטר וקודי הפעלה מחושבים — הגישה נקבעת רק לפי אישור המנהל.
// ============================================================================

// >>> יש להדביק כאן את הערכים מהגדרות הפרויקט ב-Firebase (ראה הוראות-הגדרה.md) <<<
window.MAGIC_FIREBASE_CONFIG = {
  apiKey: 'AIzaSyBTQKq5Lnn0IFu2RROdMxMlaIeFgx721jo',
  projectId: 'magic-lock-99194',
  databaseURL: 'https://magic-lock-99194-default-rtdb.europe-west1.firebasedatabase.app',
  // התראה לטלפון של המנהל (אפליקציית ntfy) כשמגיעה בקשה / הודעה. בלי שמות ובלי פרטים אישיים.
  adminNotifyTopic: 'magiclock-ef42nxd2rcmq9sdinyzw'
};

window.MagicCloud = (function () {
  const cfg = window.MAGIC_FIREBASE_CONFIG || {};
  const API_KEY = String(cfg.apiKey || '').trim();
  const PROJECT_ID = String(cfg.projectId || '').trim();
  const DB_BASE = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;

  function isConfigured() {
    return Boolean(API_KEY && PROJECT_ID && !API_KEY.startsWith('PASTE_') && !PROJECT_ID.startsWith('PASTE_'));
  }

  // --------------------------------------------------------------------------
  // שכבת HTTP: באפליקציית האנדרואיד עוברים דרך גשר נייטיבי (בלי בעיות CORS
  // מ-file://), בדפדפן משתמשים ב-fetch רגיל.
  // --------------------------------------------------------------------------
  const nativeCallbacks = {};
  let nativeSeq = 0;

  window.__magicNativeHttpCallback = function (id, res) {
    const cb = nativeCallbacks[id];
    if (cb) {
      delete nativeCallbacks[id];
      cb(res || {});
    }
  };

  function hasNativeHttp() {
    return Boolean(window.AndroidNative && typeof window.AndroidNative.httpRequestAsync === 'function');
  }

  function http(url, options = {}) {
    const method = options.method || 'GET';
    const headers = options.headers || {};
    const body = options.body || '';

    if (hasNativeHttp() && method !== 'PATCH') {
      return new Promise((resolve) => {
        const id = `r${++nativeSeq}_${Date.now()}`;
        const timer = setTimeout(() => {
          delete nativeCallbacks[id];
          resolve({ ok: false, status: 0, text: '', networkError: true });
        }, 20000);
        nativeCallbacks[id] = (res) => {
          clearTimeout(timer);
          const status = Number(res.status) || 0;
          resolve({
            ok: status >= 200 && status < 300,
            status,
            text: res.body || '',
            networkError: status === 0
          });
        };
        try {
          window.AndroidNative.httpRequestAsync(id, url, method, JSON.stringify(headers), body);
        } catch (e) {
          clearTimeout(timer);
          delete nativeCallbacks[id];
          resolve({ ok: false, status: 0, text: '', networkError: true });
        }
      });
    }

    return fetch(url, { method, headers, body: body || undefined, cache: 'no-store' })
      .then(async (res) => ({ ok: res.ok, status: res.status, text: await res.text(), networkError: false }))
      .catch(() => ({ ok: false, status: 0, text: '', networkError: true }));
  }

  function makeError(res, fallbackMsg) {
    let msg = fallbackMsg || 'Request failed';
    try {
      const parsed = JSON.parse(res.text || '{}');
      if (parsed && parsed.error && parsed.error.message) msg = parsed.error.message;
    } catch (e) {}
    const err = new Error(msg);
    err.status = res.status;
    err.network = Boolean(res.networkError);
    return err;
  }

  // --------------------------------------------------------------------------
  // המרה בין אובייקטים רגילים לפורמט של Firestore REST
  // --------------------------------------------------------------------------
  function toFields(obj) {
    const fields = {};
    Object.keys(obj).forEach((key) => {
      const v = obj[key];
      if (v instanceof Date) fields[key] = { timestampValue: v.toISOString() };
      else if (typeof v === 'boolean') fields[key] = { booleanValue: v };
      else if (typeof v === 'number') fields[key] = Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v };
      else if (v === null || v === undefined) fields[key] = { nullValue: null };
      else fields[key] = { stringValue: String(v) };
    });
    return fields;
  }

  function fromDoc(doc) {
    const out = {};
    const fields = (doc && doc.fields) || {};
    Object.keys(fields).forEach((key) => {
      const v = fields[key];
      if ('stringValue' in v) out[key] = v.stringValue;
      else if ('timestampValue' in v) out[key] = v.timestampValue;
      else if ('booleanValue' in v) out[key] = v.booleanValue;
      else if ('integerValue' in v) out[key] = Number(v.integerValue);
      else if ('doubleValue' in v) out[key] = v.doubleValue;
      else out[key] = null;
    });
    out.id = String((doc && doc.name) || '').split('/').pop();
    return out;
  }

  // --------------------------------------------------------------------------
  // התחברות (Firebase Auth דרך REST): מכשיר = אנונימי, מנהל = אימייל+סיסמה
  // --------------------------------------------------------------------------
  const REVOKED_SESSION_ERRORS = ['TOKEN_EXPIRED', 'USER_DISABLED', 'USER_NOT_FOUND', 'INVALID_REFRESH_TOKEN', 'MISSING_REFRESH_TOKEN'];

  function isRevokedSessionError(res) {
    if (!res || res.networkError || res.status !== 400) return false;
    try {
      const msg = String((JSON.parse(res.text || '{}').error || {}).message || '');
      return REVOKED_SESSION_ERRORS.some((code) => msg.startsWith(code));
    } catch (e) {
      return false;
    }
  }

  function createAuthSession(storageKey) {
    let session = null;
    try {
      session = JSON.parse(localStorage.getItem(storageKey) || 'null');
    } catch (e) {}

    function save(s) {
      session = s;
      try {
        if (s) localStorage.setItem(storageKey, JSON.stringify(s));
        else localStorage.removeItem(storageKey);
      } catch (e) {}
    }

    function storeFromAuthResponse(data, extra = {}) {
      save({
        uid: data.localId || data.user_id,
        idToken: data.idToken || data.id_token,
        refreshToken: data.refreshToken || data.refresh_token,
        expiresAt: Date.now() + (Number(data.expiresIn || data.expires_in) || 3600) * 1000,
        email: extra.email || (session && session.email) || data.email || ''
      });
    }

    async function getToken() {
      if (!session || !session.refreshToken) return null;
      if (session.idToken && Date.now() < session.expiresAt - 60000) return session.idToken;

      const res = await http(`https://securetoken.googleapis.com/v1/token?key=${API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `grant_type=refresh_token&refresh_token=${encodeURIComponent(session.refreshToken)}`
      });
      if (!res.ok) {
        // מוחקים את הזהות רק כשהשרת אומר במפורש שהיא בוטלה / נמחקה.
        // תקלה זמנית (עומס, חסימת מפתח, אין רשת) לא מוחקת - אחרת המכשיר היה
        // מקבל זהות חדשה שלא אושרה, וננעל באמצע הופעה.
        if (isRevokedSessionError(res)) save(null);
        throw makeError(res, 'Session refresh failed');
      }
      storeFromAuthResponse(JSON.parse(res.text));
      return session.idToken;
    }

    return {
      get uid() {
        return session ? session.uid : null;
      },
      get email() {
        return session ? session.email : '';
      },
      hasSession: () => Boolean(session && session.refreshToken),
      getToken,
      storeFromAuthResponse,
      clear: () => save(null)
    };
  }

  const deviceAuth = createAuthSession('magic_device_auth_v1');
  const adminAuth = createAuthSession('magic_admin_auth_v1');

  async function authedRequest(auth, url, options = {}) {
    const token = await auth.getToken();
    const headers = { ...(options.headers || {}) };
    if (token) headers.Authorization = `Bearer ${token}`;
    if (options.body) headers['Content-Type'] = 'application/json';
    return http(url, { ...options, headers });
  }

  // --------------------------------------------------------------------------
  // צד המכשיר (אפליקציית הלקוח)
  // --------------------------------------------------------------------------
  async function ensureDeviceSession() {
    if (deviceAuth.hasSession()) return deviceAuth.uid;
    const res = await http(`https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ returnSecureToken: true })
    });
    if (!res.ok) throw makeError(res, 'Anonymous sign-in failed');
    deviceAuth.storeFromAuthResponse(JSON.parse(res.text));
    return deviceAuth.uid;
  }

  // הרשומה האחרונה שנקראה מהשרת (כוללת הודעה מהמנהל, אם יש)
  let lastMyRecord = null;
  // בודק בטא: מקבל עדכונים מערוץ הבטא לפני כולם (המנהל מסמן באתר הניהול)
  function isTester() {
    if (lastMyRecord) {
      const t = lastMyRecord.tester === true;
      try {
        localStorage.setItem('magic_is_tester_v1', t ? '1' : '0');
      } catch (e) {}
      return t;
    }
    try {
      return localStorage.getItem('magic_is_tester_v1') === '1';
    } catch (e) {
      return false;
    }
  }

  function getMyMessage() {
    if (!lastMyRecord || !lastMyRecord.adminMessage) return null;
    return { text: lastMyRecord.adminMessage, at: lastMyRecord.adminMessageAt || '' };
  }

  // מחזיר: 'none' (לא נשלחה בקשה) | 'pending' | 'approved' | 'blocked'
  async function getMyStatus() {
    const uid = await ensureDeviceSession();
    const res = await authedRequest(deviceAuth, `${DB_BASE}/users/${uid}`);
    if (res.status === 404) return 'none';
    if (!res.ok) throw makeError(res, 'Status check failed');
    const rec = fromDoc(JSON.parse(res.text));
    lastMyRecord = rec;
    return ['pending', 'approved', 'blocked', 'trial'].includes(rec.status) ? rec.status : 'pending';
  }

  // הרשמה: "ניסיון" (אם המנהל הפעיל תקופת ניסיון) או "ממתין לאישור".
  // שעת ההרשמה נקבעת בשרת - ממנה נספרת תקופת הניסיון, ואי אפשר לזייף אותה מהטלפון.
  // transfer = קוסם שכבר קנה ועבר לטלפון חדש: בקשה רגילה (בלי ניסיון) שמסומנת למנהל כהעברה
  async function submitRequest({ name, phone, deviceId, trial = false, transfer = false }) {
    const uid = await ensureDeviceSession();
    const status = trial && !transfer ? 'trial' : 'pending';
    const data = {
      name: String(name || '').trim(),
      phone: String(phone || '').trim(),
      deviceId: String(deviceId || '').trim(),
      status
    };
    if (transfer) data.transfer = true;
    const res = await authedRequest(deviceAuth, `${DB_BASE}:commit`, {
      method: 'POST',
      body: JSON.stringify({
        writes: [
          {
            update: {
              name: `projects/${PROJECT_ID}/databases/(default)/documents/users/${uid}`,
              fields: toFields(data)
            },
            updateTransforms: [{ fieldPath: 'createdAt', setToServerValue: 'REQUEST_TIME' }],
            currentDocument: { exists: false }
          }
        ]
      })
    });
    // כבר נרשם מהמכשיר הזה
    if (res.status === 409 || (res.status === 400 && /exist/i.test(res.text || ''))) return getMyStatus();
    if (!res.ok) throw makeError(res, 'Request failed');
    notifyAdmin(transfer ? 'transfer' : 'request');
    return status;
  }

  function getMyRecord() {
    return lastMyRecord;
  }

  // רישום שימוש: מתי נפתחה האפליקציה לאחרונה, כמה פעמים ובאיזו גרסה.
  // הזמן והספירה מחושבים בשרת (לא ניתן לזייף מהטלפון).
  async function reportUsage(appVersion, stats) {
    const uid = await ensureDeviceSession();
    const fields = { appVersion: String(appVersion || '').slice(0, 20) };
    const paths = ['appVersion'];
    if (stats) {
      fields.stats = String(stats).slice(0, 3000);
      paths.push('stats');
    }
    const res = await authedRequest(deviceAuth, `${DB_BASE}:commit`, {
      method: 'POST',
      body: JSON.stringify({
        writes: [
          {
            update: {
              name: `projects/${PROJECT_ID}/databases/(default)/documents/users/${uid}`,
              fields: toFields(fields)
            },
            updateMask: { fieldPaths: paths },
            updateTransforms: [
              { fieldPath: 'lastSeen', setToServerValue: 'REQUEST_TIME' },
              { fieldPath: 'openCount', increment: { integerValue: '1' } }
            ],
            currentDocument: { exists: true }
          }
        ]
      })
    });
    if (!res.ok) throw makeError(res, 'Usage report failed');
    return true;
  }

  // גיבוי הגדרות בענן לפי קוד גיבוי אישי (12 תווים). הקוד הוא "המפתח":
  // רק מי שיודע אותו יכול לקרוא או לעדכן את הגיבוי.
  async function saveBackup(code, dataString) {
    const uid = await ensureDeviceSession();
    const res = await authedRequest(deviceAuth, `${DB_BASE}:commit`, {
      method: 'POST',
      body: JSON.stringify({
        writes: [
          {
            update: {
              name: `projects/${PROJECT_ID}/databases/(default)/documents/backups/${code}`,
              fields: toFields({ data: String(dataString || ''), owner: uid })
            },
            updateTransforms: [{ fieldPath: 'updatedAt', setToServerValue: 'REQUEST_TIME' }]
          }
        ]
      })
    });
    if (!res.ok) throw makeError(res, 'Backup failed');
    return true;
  }

  async function loadBackup(code) {
    await ensureDeviceSession();
    const res = await authedRequest(deviceAuth, `${DB_BASE}/backups/${encodeURIComponent(code)}`);
    if (res.status === 404) return null;
    if (!res.ok) throw makeError(res, 'Restore failed');
    return fromDoc(JSON.parse(res.text));
  }

  // שליחת משוב מהקוסם (מגיע לאתר הניהול)
  async function sendFeedback({ text, appVersion, os, model, notify = 'message' }) {
    const uid = await ensureDeviceSession();
    const res = await authedRequest(deviceAuth, `${DB_BASE}/feedback`, {
      method: 'POST',
      body: JSON.stringify({
        fields: toFields({
          uid,
          text: String(text || '').trim().slice(0, 2000),
          appVersion: String(appVersion || '').slice(0, 20),
          os: String(os || '').slice(0, 20),
          model: String(model || '').slice(0, 40),
          createdAt: new Date()
        })
      })
    });
    if (!res.ok) throw makeError(res, 'Feedback failed');
    notifyAdmin(notify === 'paid' ? 'paid' : 'message');
    return true;
  }

  // התראה קצרה לטלפון של המנהל (ntfy.sh). לא נשלח שום פרט אישי - רק סוג האירוע.
  const ADMIN_PAGE_URL = 'https://tzur2010.github.io/app-lockscreen/admin.html';
  function notifyAdmin(kind) {
    const topic = String(cfg.adminNotifyTopic || '').trim();
    if (!/^[A-Za-z0-9_-]{8,64}$/.test(topic)) return Promise.resolve(false);
    const kinds = {
      request: ['🔔 בקשת גישה חדשה מחכה לאישור', 'bell'],
      message: ['💬 הודעה חדשה מקוסם', 'speech_balloon'],
      paid: ['💰 קוסם דיווח שהוא שילם - בדוק בביט ואשר', 'moneybag'],
      transfer: ['🔁 בקשה להעביר רישיון לטלפון חדש', 'arrows_counterclockwise'],
      test: ['🧪 בדיקת התראה - הכל עובד!', 'test_tube']
    };
    const [text, tag] = kinds[kind] || kinds.test;
    return fetch(`https://ntfy.sh/${topic}`, {
      method: 'POST',
      body: text,
      headers: { Title: 'Magic Lock', Click: ADMIN_PAGE_URL, Tags: tag }
    })
      .then((r) => r.ok)
      .catch(() => false);
  }

  // דיווח תקלה אוטומטי (שגיאת JavaScript באפליקציה) לאתר הניהול
  async function reportError({ msg, src, appVersion, model }) {
    const uid = await ensureDeviceSession();
    const res = await authedRequest(deviceAuth, `${DB_BASE}/errors`, {
      method: 'POST',
      body: JSON.stringify({
        fields: toFields({
          uid,
          msg: String(msg || 'Unknown error').slice(0, 500),
          src: String(src || '').slice(0, 200),
          appVersion: String(appVersion || '').slice(0, 20),
          model: String(model || '').slice(0, 40),
          createdAt: new Date()
        })
      })
    });
    if (!res.ok) throw makeError(res, 'Error report failed');
    return true;
  }

  // --------------------------------------------------------------------------
  // שיתוף הקוד בזמן אמת לטלפון שני (Realtime Database)
  // --------------------------------------------------------------------------
  const RTDB_URL = String(cfg.databaseURL || '').replace(/\/$/, '');

  async function pushLiveCode(channel, code, mode) {
    if (!RTDB_URL || !/^[A-Za-z0-9]{12}$/.test(String(channel || ''))) throw new Error('No live channel');
    const uid = await ensureDeviceSession();
    const token = await deviceAuth.getToken();
    const res = await http(`${RTDB_URL}/live/${channel}.json?auth=${encodeURIComponent(token)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        owner: uid,
        code: String(code || '').slice(0, 64),
        mode: String(mode || '').slice(0, 12),
        at: { '.sv': 'timestamp' }
      })
    });
    if (!res.ok) throw makeError(res, 'Live push failed');
    return true;
  }

  // המצב הנוכחי של הטלפון (לשלט בטלפון השני): פתיחה בכל קוד + באיזה ניסיון
  async function pushLiveState(channel, force, attempt) {
    if (!RTDB_URL || !/^[A-Za-z0-9]{12}$/.test(String(channel || ''))) throw new Error('No live channel');
    const uid = await ensureDeviceSession();
    const token = await deviceAuth.getToken();
    const n = Math.min(5, Math.max(1, Number(attempt) || 1));
    const res = await http(`${RTDB_URL}/state/${channel}.json?auth=${encodeURIComponent(token)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ owner: uid, force: Boolean(force), attempt: n, at: { '.sv': 'timestamp' } })
    });
    if (!res.ok) throw makeError(res, 'Live state failed');
    return true;
  }

  // --------------------------------------------------------------------------
  // הגדרות עדכון (ציבורי לקריאה, רק המנהל כותב)
  // --------------------------------------------------------------------------
  async function getAppConfig() {
    if (!isConfigured()) return null;
    const res = await http(`${DB_BASE}/app_config/main`);
    if (res.status === 404) return null;
    if (!res.ok) throw makeError(res, 'Config fetch failed');
    return fromDoc(JSON.parse(res.text));
  }

  // --------------------------------------------------------------------------
  // צד המנהל (admin.html)
  // --------------------------------------------------------------------------
  async function adminSignIn(email, password) {
    const res = await http(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, returnSecureToken: true })
    });
    if (!res.ok) throw makeError(res, 'Sign-in failed');
    adminAuth.storeFromAuthResponse(JSON.parse(res.text), { email });
    const ok = await adminIsAdmin();
    if (!ok) {
      adminAuth.clear();
      const err = new Error('NOT_ADMIN');
      err.status = 403;
      throw err;
    }
    return true;
  }

  async function adminIsAdmin() {
    if (!adminAuth.hasSession()) return false;
    const res = await authedRequest(adminAuth, `${DB_BASE}/admins/${adminAuth.uid}`);
    if (res.ok) return true;
    if (res.networkError) throw makeError(res, 'Network error');
    return false;
  }

  async function adminListUsers() {
    const users = [];
    let pageToken = '';
    do {
      const url = `${DB_BASE}/users?pageSize=300${pageToken ? `&pageToken=${encodeURIComponent(pageToken)}` : ''}`;
      const res = await authedRequest(adminAuth, url);
      if (!res.ok) throw makeError(res, 'List failed');
      const data = JSON.parse(res.text || '{}');
      (data.documents || []).forEach((doc) => users.push(fromDoc(doc)));
      pageToken = data.nextPageToken || '';
    } while (pageToken);
    users.sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')));
    return users;
  }

  async function adminSetStatus(uid, status) {
    const url =
      `${DB_BASE}/users/${encodeURIComponent(uid)}` +
      '?updateMask.fieldPaths=status&updateMask.fieldPaths=updatedAt&currentDocument.exists=true';
    const res = await authedRequest(adminAuth, url, {
      method: 'PATCH',
      body: JSON.stringify({ fields: toFields({ status, updatedAt: new Date() }) })
    });
    if (!res.ok) throw makeError(res, 'Update failed');
    return true;
  }

  async function adminSetTester(uid, on) {
    const url = `${DB_BASE}/users/${encodeURIComponent(uid)}?updateMask.fieldPaths=tester&currentDocument.exists=true`;
    const res = await authedRequest(adminAuth, url, {
      method: 'PATCH',
      body: JSON.stringify({ fields: toFields({ tester: Boolean(on) }) })
    });
    if (!res.ok) throw makeError(res, 'Update failed');
    return true;
  }

  async function adminDeleteUser(uid) {
    const res = await authedRequest(adminAuth, `${DB_BASE}/users/${encodeURIComponent(uid)}`, { method: 'DELETE' });
    if (!res.ok && res.status !== 404) throw makeError(res, 'Delete failed');
    return true;
  }

  async function adminListFeedback() {
    const items = [];
    let pageToken = '';
    do {
      const url = `${DB_BASE}/feedback?pageSize=300${pageToken ? `&pageToken=${encodeURIComponent(pageToken)}` : ''}`;
      const res = await authedRequest(adminAuth, url);
      if (!res.ok) throw makeError(res, 'Feedback list failed');
      const data = JSON.parse(res.text || '{}');
      (data.documents || []).forEach((doc) => items.push(fromDoc(doc)));
      pageToken = data.nextPageToken || '';
    } while (pageToken);
    items.sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')));
    return items;
  }

  async function adminDeleteFeedback(id) {
    const res = await authedRequest(adminAuth, `${DB_BASE}/feedback/${encodeURIComponent(id)}`, { method: 'DELETE' });
    if (!res.ok && res.status !== 404) throw makeError(res, 'Delete failed');
    return true;
  }

  // היסטוריית ההודעות שהמנהל שלח (כדי להציג שיחה מלאה עם כל קוסם). רק המנהל רואה.
  async function adminLogMessage(uid, text, via) {
    const res = await authedRequest(adminAuth, `${DB_BASE}/admin_messages`, {
      method: 'POST',
      body: JSON.stringify({ fields: toFields({ uid, text: String(text || '').trim().slice(0, 2000), via: via || 'app', createdAt: new Date() }) })
    });
    if (!res.ok) throw makeError(res, 'Message log failed');
    return true;
  }

  async function adminListMessages() {
    const items = [];
    let pageToken = '';
    do {
      const url = `${DB_BASE}/admin_messages?pageSize=300${pageToken ? `&pageToken=${encodeURIComponent(pageToken)}` : ''}`;
      const res = await authedRequest(adminAuth, url);
      if (!res.ok) throw makeError(res, 'Messages list failed');
      const data = JSON.parse(res.text || '{}');
      (data.documents || []).forEach((doc) => items.push(fromDoc(doc)));
      pageToken = data.nextPageToken || '';
    } while (pageToken);
    return items;
  }

  // הודעה אישית מהמנהל לקוסם מסוים (מופיעה אצלו באפליקציה כשהוא נכנס להגדרות)
  async function adminSendMessage(uid, text, { log = true } = {}) {
    const url =
      `${DB_BASE}/users/${encodeURIComponent(uid)}` +
      '?updateMask.fieldPaths=adminMessage&updateMask.fieldPaths=adminMessageAt&currentDocument.exists=true';
    const res = await authedRequest(adminAuth, url, {
      method: 'PATCH',
      body: JSON.stringify({ fields: toFields({ adminMessage: String(text || '').trim().slice(0, 2000), adminMessageAt: new Date() }) })
    });
    if (!res.ok) throw makeError(res, 'Message failed');
    // שמירה בהיסטוריה (לא מפילה את השליחה אם נכשלה)
    if (log) await adminLogMessage(uid, text, 'app').catch(() => {});
    return true;
  }

  // תשובה למשוב: נשלחת לקוסם כהודעה, ונשמרת על המשוב כדי שתראה שכבר ענית
  async function adminReplyFeedback(feedbackId, uid, text, { inApp = true } = {}) {
    // התשובה נשמרת על המשוב עצמו, אז לא צריך גם היסטוריה נפרדת
    if (inApp) await adminSendMessage(uid, text, { log: false });
    const url =
      `${DB_BASE}/feedback/${encodeURIComponent(feedbackId)}` +
      '?updateMask.fieldPaths=reply&updateMask.fieldPaths=repliedAt&currentDocument.exists=true';
    const res = await authedRequest(adminAuth, url, {
      method: 'PATCH',
      body: JSON.stringify({ fields: toFields({ reply: String(text || '').trim().slice(0, 2000), repliedAt: new Date() }) })
    });
    if (!res.ok) throw makeError(res, 'Reply save failed');
    return true;
  }

  // הערות פרטיות של המנהל על לקוח (אוסף נפרד - הלקוח עצמו לא יכול לקרוא אותן)
  async function adminListNotes() {
    const res = await authedRequest(adminAuth, `${DB_BASE}/admin_notes?pageSize=300`);
    if (!res.ok) throw makeError(res, 'Notes list failed');
    const data = JSON.parse(res.text || '{}');
    const map = {};
    (data.documents || []).map(fromDoc).forEach((n) => (map[n.id] = n.note || ''));
    return map;
  }

  async function adminSaveNote(uid, text) {
    const clean = String(text || '').trim().slice(0, 2000);
    const url = `${DB_BASE}/admin_notes/${encodeURIComponent(uid)}`;
    const res = clean
      ? await authedRequest(adminAuth, url, { method: 'PATCH', body: JSON.stringify({ fields: toFields({ note: clean, updatedAt: new Date() }) }) })
      : await authedRequest(adminAuth, url, { method: 'DELETE' });
    if (!res.ok && !(res.status === 404 && !clean)) throw makeError(res, 'Note save failed');
    return true;
  }

  async function adminListErrors() {
    const res = await authedRequest(adminAuth, `${DB_BASE}/errors?pageSize=300`);
    if (!res.ok) throw makeError(res, 'Errors list failed');
    const data = JSON.parse(res.text || '{}');
    const items = (data.documents || []).map(fromDoc);
    items.sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')));
    return items;
  }

  async function adminDeleteError(id) {
    const res = await authedRequest(adminAuth, `${DB_BASE}/errors/${encodeURIComponent(id)}`, { method: 'DELETE' });
    if (!res.ok && res.status !== 404) throw makeError(res, 'Delete failed');
    return true;
  }

  // סימון ששילם: הקוסם מקבל גישה קבועה
  // עדכון חלקי של רשומת קוסם (רק השדות שנשלחים)
  async function adminPatchUser(uid, data) {
    const mask = Object.keys(data).map((f) => `updateMask.fieldPaths=${f}`).join('&');
    const res = await authedRequest(adminAuth, `${DB_BASE}/users/${encodeURIComponent(uid)}?${mask}&currentDocument.exists=true`, {
      method: 'PATCH',
      body: JSON.stringify({ fields: toFields(data) })
    });
    if (!res.ok) throw makeError(res, 'Update failed');
    return true;
  }

  async function adminSetPaid(uid, { amount = 0, method = 'bit', receipt = '' } = {}) {
    return adminPatchUser(uid, {
      paid: true,
      paidAt: new Date(),
      paidAmount: Number(amount) || 0,
      payMethod: String(method || '').slice(0, 30),
      receiptNo: String(receipt || '').trim().slice(0, 40),
      status: 'approved',
      updatedAt: new Date()
    });
  }

  // מספר קבלה אחרי שהוצאת אותה (אפשר גם אחרי הסימון כמשלם)
  async function adminSetReceipt(uid, receipt) {
    return adminPatchUser(uid, { receiptNo: String(receipt || '').trim().slice(0, 40), updatedAt: new Date() });
  }

  // החזר כספי: מבטל את התשלום ונועל את האפליקציה
  async function adminRefund(uid) {
    return adminPatchUser(uid, { paid: false, paidAmount: 0, refundedAt: new Date(), status: 'blocked', updatedAt: new Date() });
  }

  // העברת רישיון לטלפון חדש: החדש מקבל את פרטי התשלום, הישן ננעל (וכך לא נספר פעמיים בהכנסות)
  async function adminTransferLicense(fromUser, toUid) {
    await adminPatchUser(toUid, {
      paid: true,
      paidAt: fromUser.paidAt ? new Date(fromUser.paidAt) : new Date(),
      paidAmount: Number(fromUser.paidAmount) || 0,
      payMethod: String(fromUser.payMethod || 'bit').slice(0, 30),
      receiptNo: String(fromUser.receiptNo || '').slice(0, 40),
      transferredFrom: fromUser.id,
      status: 'approved',
      updatedAt: new Date()
    });
    await adminPatchUser(fromUser.id, { paid: false, paidAmount: 0, transferredTo: toUid, status: 'blocked', updatedAt: new Date() });
    return true;
  }

  // הגדרות מכירה (ציבוריות - האפליקציה מציגה אותן לקוסמים): מחיר, מספר לתשלום, הערה וימי ניסיון
  async function adminSaveSaleSettings({ price, price_was, pay_phone, pay_link, pay_note, trial_days }) {
    const link = String(pay_link || '').trim();
    if (link && !/^https:\/\/[^\s]+$/i.test(link)) throw new Error('קישור התשלום חייב להתחיל ב-https://');
    const data = {
      price: Math.max(0, Number(price) || 0),
      price_was: Math.max(0, Number(price_was) || 0),
      pay_phone: String(pay_phone || '').trim().slice(0, 20),
      pay_link: link.slice(0, 300),
      pay_note: String(pay_note || '').trim().slice(0, 300),
      trial_days: Math.max(0, Math.min(30, parseInt(trial_days, 10) || 0))
    };
    const mask = Object.keys(data).map((f) => `updateMask.fieldPaths=${f}`).join('&');
    const res = await authedRequest(adminAuth, `${DB_BASE}/app_config/main?${mask}`, {
      method: 'PATCH',
      body: JSON.stringify({ fields: toFields(data) })
    });
    if (!res.ok) throw makeError(res, 'Save failed');
    return true;
  }

  async function adminPublishUpdate({ latest_version, apk_url, message }) {
    // updateMask: מעדכנים רק את שדות העדכון, בלי למחוק את הגדרות המכירה (מחיר וכו')
    const mask = ['latest_version', 'apk_url', 'message', 'published_at'].map((f) => `updateMask.fieldPaths=${f}`).join('&');
    const res = await authedRequest(adminAuth, `${DB_BASE}/app_config/main?${mask}`, {
      method: 'PATCH',
      body: JSON.stringify({
        fields: toFields({
          latest_version: String(latest_version || '').trim(),
          apk_url: String(apk_url || '').trim(),
          message: String(message || '').trim(),
          published_at: new Date()
        })
      })
    });
    if (!res.ok) throw makeError(res, 'Publish failed');
    return true;
  }

  return {
    isConfigured,
    getAppConfig,
    notifyAdmin,
    adminNotifyTopic: () => String(cfg.adminNotifyTopic || ''),
    device: {
      ensureSession: ensureDeviceSession,
      getMyStatus,
      getMyMessage,
      getMyRecord,
      isTester,
      submitRequest,
      reportUsage,
      sendFeedback,
      reportError,
      pushLiveCode,
      pushLiveState,
      hasLive: () => Boolean(RTDB_URL),
      liveUrl: () => RTDB_URL,
      saveBackup,
      loadBackup
    },
    admin: {
      signIn: adminSignIn,
      signOut: () => adminAuth.clear(),
      hasSession: () => adminAuth.hasSession(),
      email: () => adminAuth.email,
      isAdmin: adminIsAdmin,
      listUsers: adminListUsers,
      setStatus: adminSetStatus,
      setTester: adminSetTester,
      setPaid: adminSetPaid,
      setReceipt: adminSetReceipt,
      refund: adminRefund,
      transferLicense: adminTransferLicense,
      saveSaleSettings: adminSaveSaleSettings,
      deleteUser: adminDeleteUser,
      listFeedback: adminListFeedback,
      deleteFeedback: adminDeleteFeedback,
      sendMessage: adminSendMessage,
      logMessage: adminLogMessage,
      listMessages: adminListMessages,
      listErrors: adminListErrors,
      listNotes: adminListNotes,
      saveNote: adminSaveNote,
      deleteError: adminDeleteError,
      replyFeedback: adminReplyFeedback,
      publishUpdate: adminPublishUpdate
    }
  };
})();

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
  projectId: 'magic-lock-99194'
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
        // טוקן שבוטל / משתמש שנמחק -> מתחילים מחדש
        if (!res.networkError && res.status >= 400 && res.status < 500) save(null);
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

  // מחזיר: 'none' (לא נשלחה בקשה) | 'pending' | 'approved' | 'blocked'
  async function getMyStatus() {
    const uid = await ensureDeviceSession();
    const res = await authedRequest(deviceAuth, `${DB_BASE}/users/${uid}`);
    if (res.status === 404) return 'none';
    if (!res.ok) throw makeError(res, 'Status check failed');
    const rec = fromDoc(JSON.parse(res.text));
    return ['pending', 'approved', 'blocked'].includes(rec.status) ? rec.status : 'pending';
  }

  async function submitRequest({ name, phone, deviceId }) {
    const uid = await ensureDeviceSession();
    const res = await authedRequest(deviceAuth, `${DB_BASE}/users?documentId=${encodeURIComponent(uid)}`, {
      method: 'POST',
      body: JSON.stringify({
        fields: toFields({
          name: String(name || '').trim(),
          phone: String(phone || '').trim(),
          deviceId: String(deviceId || '').trim(),
          status: 'pending',
          createdAt: new Date()
        })
      })
    });
    if (res.status === 409) return getMyStatus(); // כבר נשלחה בקשה מהמכשיר הזה
    if (!res.ok) throw makeError(res, 'Request failed');
    return 'pending';
  }

  // רישום שימוש: מתי נפתחה האפליקציה לאחרונה, כמה פעמים ובאיזו גרסה.
  // הזמן והספירה מחושבים בשרת (לא ניתן לזייף מהטלפון).
  async function reportUsage(appVersion) {
    const uid = await ensureDeviceSession();
    const res = await authedRequest(deviceAuth, `${DB_BASE}:commit`, {
      method: 'POST',
      body: JSON.stringify({
        writes: [
          {
            update: {
              name: `projects/${PROJECT_ID}/databases/(default)/documents/users/${uid}`,
              fields: toFields({ appVersion: String(appVersion || '').slice(0, 20) })
            },
            updateMask: { fieldPaths: ['appVersion'] },
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
  async function sendFeedback({ text, appVersion, os, model }) {
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

  async function adminPublishUpdate({ latest_version, apk_url, message }) {
    const res = await authedRequest(adminAuth, `${DB_BASE}/app_config/main`, {
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
    device: {
      ensureSession: ensureDeviceSession,
      getMyStatus,
      submitRequest,
      reportUsage,
      sendFeedback,
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
      deleteUser: adminDeleteUser,
      listFeedback: adminListFeedback,
      deleteFeedback: adminDeleteFeedback,
      publishUpdate: adminPublishUpdate
    }
  };
})();

// ============================================================================
// קסם "🧮 המחשבון היודע": מחשבון בסגנון סמסונג (One UI, מצב כהה)
// ----------------------------------------------------------------------------
// כמה צופים מקלידים מספרים ומחברים. אחרי N מספרים ו-"+" הקוסם "מוסיף מספר משלו":
// כל מקש ספרה שהוא לוחץ מקליד בפועל את הספרה הבאה של (המטרה - הסכום עד עכשיו).
// לוחצים "=" -> התוצאה היא המטרה (למשל התאריך והשעה שעל המסך: 26111437).
// יציאה סודית: לחיצה ארוכה (2.5 שניות) בפינה הימנית העליונה.
// ============================================================================
(function () {
  let root = null;
  let opts = {};
  let tokens = []; // מספרים (מחרוזות) ואופרטורים לסירוגין
  let cur = ''; // המספר שמוקלד עכשיו
  let shownResult = null; // אחרי "=": התוצאה שמוצגת
  let shownForced = false; // התוצאה שמוצגת היא תוצאת הקסם
  let force = null; // { digits: '1234', i: 0 } בזמן שהקוסם "מקליד"
  let forceUsed = false;
  let clock = null;
  const listeners = { secret: [], forced: [] };

  const OPS = { '+': '+', '-': '−', '*': '×', '/': '÷' };

  function vibrate(ms) {
    try {
      if (navigator.vibrate) navigator.vibrate(ms);
    } catch (e) {}
  }

  function pad2(n) {
    return String(n).padStart(2, '0');
  }

  // המטרה: 'datetime' = DDMMHHmm, 'time' = HHmm, 'custom' = מספר קבוע
  function targetDigits() {
    if (opts.target === 'custom') return String(opts.custom || '').replace(/\D/g, '').replace(/^0+/, '') || '0';
    const d = new Date(Date.now() + (Number(opts.aheadMin) || 0) * 60000);
    const hm = pad2(d.getHours()) + pad2(d.getMinutes());
    if (opts.target === 'time') return hm.replace(/^0+/, '') || '0';
    return (pad2(d.getDate()) + pad2(d.getMonth() + 1) + hm).replace(/^0+/, '');
  }

  // חישוב עם סדר פעולות (× ÷ לפני + −)
  function evaluate(list) {
    const t = list.slice();
    if (t.length && OPS[t[t.length - 1]]) t.pop();
    if (!t.length) return 0;
    const terms = [Number(t[0])];
    const ops = [];
    for (let i = 1; i < t.length; i += 2) {
      const op = t[i];
      const v = Number(t[i + 1]);
      if (op === '*') terms[terms.length - 1] *= v;
      else if (op === '/') terms[terms.length - 1] /= v;
      else {
        ops.push(op);
        terms.push(v);
      }
    }
    let r = terms[0];
    ops.forEach((op, i) => (r = op === '+' ? r + terms[i + 1] : r - terms[i + 1]));
    return r;
  }

  function fmt(n) {
    if (typeof n === 'string') n = Number(n);
    if (!isFinite(n)) return 'שגיאה';
    const rounded = Math.round(n * 1e10) / 1e10;
    const [int, dec] = String(rounded).split('.');
    const neg = int.startsWith('-');
    const body = (neg ? int.slice(1) : int).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return (neg ? '-' : '') + body + (dec ? '.' + dec : '');
  }

  function fmtTyped(s) {
    if (s === '' || s === '-') return s;
    const [int, dec] = s.split('.');
    return int.replace(/\B(?=(\d{3})+(?!\d))/g, ',') + (s.includes('.') ? '.' + (dec || '') : '');
  }

  function numbersCount() {
    return tokens.filter((t) => !OPS[t]).length;
  }

  function render() {
    const exprEl = root.querySelector('[data-ct-expr]');
    const prevEl = root.querySelector('[data-ct-preview]');
    if (shownResult !== null) {
      // תוצאת הקסם בלי פסיקים, כדי שהתאריך והשעה ייקראו ישר (26111437)
      exprEl.textContent = shownForced ? String(shownResult) : fmt(shownResult);
      exprEl.classList.add('ct-result');
      prevEl.textContent = '';
      fitExpr(exprEl);
      return;
    }
    exprEl.classList.remove('ct-result');
    const parts = tokens.map((t) => (OPS[t] ? OPS[t] : fmtTyped(t)));
    if (cur !== '') parts.push(fmtTyped(cur));
    exprEl.textContent = parts.join('');
    const full = cur !== '' ? tokens.concat([cur]) : tokens;
    const hasOp = full.some((t) => OPS[t]);
    // בזמן שהקוסם "מקליד" לא מראים תוצאה ביניים (שלא תגלה את הסוף מוקדם)
    prevEl.textContent = hasOp && cur !== '' && !force ? fmt(evaluate(full)) : '';
    fitExpr(exprEl);
  }

  function fitExpr(el) {
    const len = el.textContent.length;
    el.style.fontSize = len > 18 ? '30px' : len > 13 ? '38px' : len > 9 ? '46px' : '54px';
  }

  function startForceIfDue() {
    if (forceUsed || force) return;
    const n = Math.max(1, Number(opts.spectators) || 3);
    if (numbersCount() < n || !tokens.length || tokens[tokens.length - 1] !== '+') return;
    const diff = Number(targetDigits()) - evaluate(tokens);
    if (!(diff > 0) || !Number.isInteger(diff)) return; // לא אפשרי - נמשיך כרגיל, וב"=" מציגים את המטרה
    force = { digits: String(diff), i: 0, target: targetDigits() };
  }

  function press(k) {
    vibrate(6);
    if (k === 'C') {
      tokens = [];
      cur = '';
      shownResult = null;
      shownForced = false;
      force = null;
      forceUsed = false;
      return render();
    }
    if (shownResult !== null) {
      // אחרי "=": מספר חדש מתחיל מחדש, אופרטור ממשיך מהתוצאה
      if (OPS[k]) {
        tokens = [String(shownResult)];
        cur = '';
      } else if (k !== 'del') {
        tokens = [];
        cur = '';
      }
      shownResult = null;
      shownForced = false;
    }
    if (/^\d$/.test(k) || k === '.') {
      if (force) {
        // הקוסם "מקליד": כל לחיצה מוסיפה את הספרה הבאה של ההפרש
        if (force.i < force.digits.length) cur += force.digits[force.i++];
        return render();
      }
      if (k === '.' && cur.includes('.')) return;
      if (cur.replace(/\D/g, '').length >= 15) return;
      cur = cur === '0' && k !== '.' ? k : (cur === '' && k === '.' ? '0.' : cur + k);
      return render();
    }
    if (k === 'del') {
      if (force) return; // בזמן הכפייה לא מוחקים
      if (cur !== '') cur = cur.slice(0, -1);
      else if (tokens.length) {
        const last = tokens.pop();
        if (!OPS[last]) cur = last.slice(0, -1);
      }
      return render();
    }
    if (k === 'neg') {
      if (force) return;
      if (cur !== '') cur = cur.startsWith('-') ? cur.slice(1) : '-' + cur;
      return render();
    }
    if (k === '%') {
      if (force || cur === '') return;
      cur = String(Number(cur) / 100);
      return render();
    }
    if (OPS[k]) {
      if (cur === '' || cur === '-') {
        if (tokens.length && OPS[tokens[tokens.length - 1]]) tokens[tokens.length - 1] = k;
        return render();
      }
      if (force) finishForce();
      tokens.push(cur, k);
      cur = '';
      startForceIfDue();
      return render();
    }
    if (k === '=') {
      const full = cur !== '' ? tokens.concat([cur]) : tokens.slice();
      if (!full.some((t) => OPS[t])) return;
      let result;
      let forcedTarget = null;
      if (force) {
        result = Number(force.target);
        forcedTarget = force.target;
        finishForce();
      } else if (!forceUsed && numbersCount() + (cur !== '' ? 1 : 0) > Math.max(1, Number(opts.spectators) || 3)) {
        // ההפרש יצא שלילי (הצופים חיברו יותר מדי) - בכל זאת מציגים את המטרה
        result = Number(targetDigits());
        forcedTarget = String(result);
        forceUsed = true;
        listeners.forced.forEach((fn) => { try { fn(String(result)); } catch (e) {} });
      } else {
        result = evaluate(full);
      }
      shownForced = result === Number(forcedTarget);
      shownResult = result;
      tokens = [];
      cur = '';
      return render();
    }
  }

  function finishForce() {
    if (!force) return;
    // אם הקוסם לחץ פחות ספרות מההפרש - משלימים בשקט
    cur = force.digits;
    opts.lastTarget = force.target;
    const t = force.target;
    force = null;
    forceUsed = true;
    listeners.forced.forEach((fn) => { try { fn(t); } catch (e) {} });
  }

  function tick() {
    if (!root) return;
    const d = new Date();
    root.querySelector('[data-ct-time]').textContent = pad2(d.getHours()) + ':' + pad2(d.getMinutes());
  }

  const KEYS = [
    ['C', 'C', 'ct-red'], ['()', '()', 'ct-op'], ['%', '%', 'ct-op'], ['/', '÷', 'ct-op'],
    ['7', '7'], ['8', '8'], ['9', '9'], ['*', '×', 'ct-op'],
    ['4', '4'], ['5', '5'], ['6', '6'], ['-', '−', 'ct-op'],
    ['1', '1'], ['2', '2'], ['3', '3'], ['+', '+', 'ct-op'],
    ['neg', '+/−'], ['0', '0'], ['.', '.'], ['=', '=', 'ct-eq']
  ];

  function build() {
    root = document.createElement('div');
    root.id = 'fakeCalc';
    root.innerHTML = `
      <div class="ct-status"><span class="ct-time" data-ct-time>12:00</span>
        <span class="ct-st-right"><svg viewBox="0 0 24 24"><path d="M2 20h3v-4H2zm5 0h3v-8H7zm5 0h3V8h-3zm5 0h3V4h-3z"/></svg><span class="ct-bat" data-ct-bat>80</span></span></div>
      <div class="ct-secret" data-ct-secret></div>
      <div class="ct-display">
        <div class="ct-expr" data-ct-expr></div>
        <div class="ct-preview" data-ct-preview></div>
      </div>
      <div class="ct-tools">
        <span class="ct-tool"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8.5" fill="none" stroke="currentColor" stroke-width="1.7"/><path d="M12 7.5V12l3 2" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg></span>
        <span class="ct-tool"><svg viewBox="0 0 24 24"><path d="M4 6h7M4 12h7M4 18h7M15 5l5 5M20 5l-5 5M15 16h5" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg></span>
        <span class="ct-tool"><svg viewBox="0 0 24 24"><rect x="4" y="3" width="16" height="18" rx="3" fill="none" stroke="currentColor" stroke-width="1.7"/><path d="M8 7h8M8 12h2M14 12h2M8 16h2M14 16h2" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg></span>
        <span class="ct-spacer"></span>
        <span class="ct-tool ct-del" data-k="del"><svg viewBox="0 0 24 24"><path d="M9 5h11a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H9l-6-7z" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/><path d="M12 9l5 6M17 9l-5 6" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg></span>
      </div>
      <div class="ct-keys">${KEYS.map(([k, label, cls]) => `<button type="button" class="ct-k ${cls || ''}" data-k="${k}">${label}</button>`).join('')}</div>`;
    document.body.appendChild(root);

    root.addEventListener('click', (e) => {
      const b = e.target.closest('[data-k]');
      if (!b) return;
      if (b.dataset.k === '()') return vibrate(6); // לא נחוץ לקסם
      press(b.dataset.k);
    });
    const secret = root.querySelector('[data-ct-secret]');
    let timer = null;
    const cancel = () => clearTimeout(timer);
    secret.addEventListener('pointerdown', () => {
      cancel();
      timer = setTimeout(() => {
        vibrate(50);
        listeners.secret.forEach((fn) => { try { fn(); } catch (e) {} });
      }, 2500);
    });
    ['pointerup', 'pointerleave', 'pointercancel'].forEach((ev) => secret.addEventListener(ev, cancel));
  }

  window.FakeCalc = {
    open(o) {
      if (!root) build();
      opts = Object.assign({}, o || {});
      tokens = [];
      cur = '';
      shownResult = null;
      shownForced = false;
      force = null;
      forceUsed = false;
      root.querySelector('[data-ct-bat]').textContent = String(opts.battery || 80).replace(/\D/g, '') || '80';
      tick();
      clearInterval(clock);
      clock = setInterval(tick, 5000);
      render();
      root.classList.add('ct-open');
    },
    close() {
      if (root) root.classList.remove('ct-open');
      clearInterval(clock);
    },
    isOpen() {
      return Boolean(root && root.classList.contains('ct-open'));
    },
    preview() {
      opts = opts || {};
      return targetDigits();
    },
    onSecret(fn) {
      listeners.secret.push(fn);
    },
    onForced(fn) {
      listeners.forced.push(fn);
    },
    _press: press
  };
})();

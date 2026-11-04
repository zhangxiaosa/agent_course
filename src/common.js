/* ============================================================
   Agent 原理教程 · 公共组件
   AgentFlow  跑道式循环图
   StatePanel checkpoint 面板
   LogPanel   对话记录面板
   Player     步骤播放器
   ============================================================ */

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/* ---------- 跑道式循环图 ---------- */

const NS = 'http://www.w3.org/2000/svg';

class AgentFlow {
  constructor(root, { nodes, edges }) {
    this.root = root;
    this.nodeEls = {};
    this.edgeEls = {};
    this._build(nodes, edges);
  }

  _build(nodes, edges) {
    const svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('viewBox', '0 0 100 100');
    svg.setAttribute('preserveAspectRatio', 'none');
    svg.setAttribute('class', 'flow-svg');
    edges.forEach((e) => {
      const p = document.createElementNS(NS, 'path');
      p.setAttribute('d', e.d);
      p.setAttribute('class', 'edge' + (e.up ? ' up' : '') + (e.loop ? ' loop' : ''));
      svg.appendChild(p);
      this.edgeEls[e.id] = p;
    });
    this.root.appendChild(svg);

    nodes.forEach((n) => {
      const el = document.createElement('div');
      el.className = 'fnode';
      el.dataset.k = n.k || 'io';
      el.style.left = n.x + '%';
      el.style.top = n.y + '%';
      el.textContent = n.label;
      if (n.tip) el.title = n.tip;
      this.root.appendChild(el);
      this.nodeEls[n.id] = el;
    });
  }

  highlight(nodeIds = [], edgeIds = []) {
    Object.entries(this.nodeEls).forEach(([id, el]) => {
      if (el.classList.contains('on')) {
        el.classList.remove('on');
        el.classList.add('visited');
      }
    });
    Object.values(this.edgeEls).forEach((el) => el.classList.remove('on', 'flow'));

    nodeIds.forEach((id) => {
      const el = this.nodeEls[id];
      if (!el) return;
      el.classList.remove('visited', 'skip');
      el.classList.add('on');
      this.root.dataset.cur = id;
    });
    edgeIds.forEach((id) => {
      const el = this.edgeEls[id];
      if (!el) return;
      el.classList.add('on', 'flow');
    });
  }

  skip(ids = []) {
    ids.forEach((id) => {
      const el = this.nodeEls[id];
      if (!el) return;
      el.classList.remove('on', 'visited');
      el.classList.add('skip');
    });
  }

  meta(txt) {
    let m = $('.flow-meta', this.root);
    if (!m) {
      m = document.createElement('div');
      m.className = 'flow-meta';
      this.root.appendChild(m);
    }
    m.innerHTML = txt;
  }

  reset() {
    Object.values(this.nodeEls).forEach((el) => el.classList.remove('on', 'visited', 'skip'));
    Object.values(this.edgeEls).forEach((el) => el.classList.remove('on', 'flow'));
    this.root.dataset.cur = '';
    const m = $('.flow-meta', this.root);
    if (m) m.innerHTML = '';
  }
}

/* 标准 8 节点跑道：上排模型链向右，下排工具链向左，左竖线回环 */
const STD_NODES = [
  { id: 'start',     label: 'agent_start',  x: 50, y: 7,  k: 'io' },
  { id: 'b_model',   label: 'before_model', x: 11, y: 30, k: 'hook' },
  { id: 'model',     label: 'model_call',   x: 50, y: 30, k: 'model' },
  { id: 'a_model',   label: 'after_model',  x: 89, y: 30, k: 'hook' },
  { id: 'b_tool',    label: 'before_tool',  x: 89, y: 66, k: 'hook' },
  { id: 'tool',      label: 'tool_call',    x: 50, y: 66, k: 'tool' },
  { id: 'a_tool',    label: 'after_tool',   x: 11, y: 66, k: 'hook' },
  { id: 'end',       label: 'agent_end',    x: 50, y: 93, k: 'done' },
];

const STD_EDGES = [
  { id: 'e_start',  d: 'M50 7 L11 30' },
  { id: 'e_bm',     d: 'M11 30 L50 30' },
  { id: 'e_m',      d: 'M50 30 L89 30' },
  { id: 'e_am_bt',  d: 'M89 30 L89 66' },
  { id: 'e_bt',     d: 'M89 66 L50 66' },
  { id: 'e_t',      d: 'M50 66 L11 66' },
  { id: 'e_loop',   d: 'M11 66 L11 30', loop: true },
  { id: 'e_exit',   d: 'M11 66 C11 93, 34 93, 50 93' },
  { id: 'e_finish', d: 'M89 30 C89 78, 78 93, 50 93' },
];

/* ---------- checkpoint 面板 ---------- */

class StatePanel {
  constructor(el) {
    this.el = el;
    this.prev = {};
    this.rows = {};
    this.render({});
  }

  render(obj) {
    const keys = Object.keys(obj);
    this.el.innerHTML = '';
    this.rows = {};
    if (!keys.length) {
      this.el.innerHTML = '<div class="st-empty">— 尚未初始化 —</div>';
      this.prev = {};
      return;
    }
    const box = document.createElement('div');
    box.className = 'st-body';
    keys.forEach((k) => {
      const row = document.createElement('div');
      row.className = 'st-row';
      const changed = JSON.stringify(obj[k]) !== JSON.stringify(this.prev[k]);
      if (changed && this.prev[k] !== undefined) row.classList.add('flash');
      row.innerHTML = `<span class="st-k">${esc(k)}</span><span class="st-v">${obj[k]}</span>`;
      box.appendChild(row);
      this.rows[k] = row;
    });
    this.el.appendChild(box);
    this.prev = JSON.parse(JSON.stringify(obj));
  }

  reset() {
    this.prev = {};
    this.el.innerHTML = '<div class="st-empty">— 尚未初始化 —</div>';
  }
}

/* ---------- 对话记录面板 ---------- */

class LogPanel {
  constructor(el) {
    this.el = el;
    this.n = 0;
  }

  push(role, html) {
    const d = document.createElement('div');
    d.className = 'msg';
    d.dataset.r = role;
    d.innerHTML = `<span class="msg-r">${esc(role)}</span><span class="msg-b">${html}</span>`;
    this.el.appendChild(d);
    this.el.scrollTop = this.el.scrollHeight;
    this.n++;
    return d;
  }

  clear() {
    this.el.innerHTML = '';
    this.n = 0;
  }
}

/* ---------- 步骤播放器 ---------- */

class Player {
  constructor({ steps, apply, resetAll, box, autoMs = 1500, min = -1 }) {
    this.steps = steps;
    this.apply = apply;
    this.resetAll = resetAll;
    this.box = box;
    this.min = min;
    this.cur = min - 1;
    this.timer = null;
    this.autoMs = autoMs;
    this._wire();
    this._sync();
  }

  _wire() {
    const b = this.box;
    if (b.next) b.next.addEventListener('click', () => this.next());
    if (b.prev) b.prev.addEventListener('click', () => this.go(this.cur - 1));
    if (b.reset) b.reset.addEventListener('click', () => this.go(-1));
    if (b.auto) {
      b.auto.addEventListener('click', () => (this.timer ? this.stop() : this.play()));
    }
    document.addEventListener('keydown', (e) => {
      if (e.target && /INPUT|TEXTAREA/.test(e.target.tagName)) return;
      if (e.key === 'ArrowRight') { e.preventDefault(); this.next(); }
      if (e.key === 'ArrowLeft') { e.preventDefault(); this.go(this.cur - 1); }
      if (e.key === 'r' && !e.metaKey && !e.ctrlKey) { e.preventDefault(); this.go(-1); }
    });
  }

  stop() {
    if (this.timer) { clearTimeout(this.timer); this.timer = null; }
    if (this.box.auto) this.box.auto.textContent = '自动';
    this._sync();
  }

  play() {
    if (this.cur >= this.steps.length - 1) this.go(-1);
    this.box.auto.textContent = '暂停';
    const tick = () => {
      if (this.cur >= this.steps.length - 1) { this.stop(); return; }
      this.next();
      this.timer = setTimeout(tick, this.autoMs);
    };
    this.timer = setTimeout(tick, 120);
  }

  next() {
    if (this.cur < this.steps.length - 1) this.go(this.cur + 1);
    else this.stop();
  }

  go(i) {
    i = Math.max(this.min, Math.min(i, this.steps.length - 1));
    if (i === this.cur) return;
    if (i <= this.cur || this.cur < this.min) {
      this.resetAll();
      this.cur = this.min - 1;
    }
    for (let j = this.cur + 1; j <= i; j++) this.apply(this.steps[j], j);
    this.cur = i;
    if (i < this.steps.length - 1 && this.timer) return; // 自动播放继续
    this._sync();
  }

  _sync() {
    const b = this.box;
    const last = this.steps.length - 1;
    if (b.next) b.next.disabled = this.cur >= last;
    if (b.prev) b.prev.disabled = this.cur <= this.min;
    if (b.total) b.total.innerHTML = `<b>${Math.max(0, this.cur + 1)}</b> / ${this.steps.length}`;
  }
}

/* ---------- 打字机 ---------- */

function typeInto(el, text, msPerChar, onDone) {
  let i = 0;
  el.textContent = '';
  const step = () => {
    if (i >= text.length) { if (onDone) onDone(); return; }
    el.textContent += text[i++];
    setTimeout(step, msPerChar);
  };
  step();
}

/* ---------- 折叠面板 ---------- */

function bindTimeline(selector = '.tl-item') {
  $$(selector).forEach((item) => {
    item.addEventListener('click', () => {
      const open = item.hasAttribute('data-open');
      $$(selector).forEach((o) => { o.removeAttribute('data-open'); const p = $('.tl-panel', o); if (p) p.hidden = true; });
      if (!open) {
        item.setAttribute('data-open', '');
        const p = $('.tl-panel', item);
        if (p) p.hidden = false;
      }
    });
  });
}

function bindSeg(selector, onChange) {
  $$(selector).forEach((btn) => {
    btn.addEventListener('click', () => {
      $$(selector).forEach((b) => b.setAttribute('aria-selected', 'false'));
      btn.setAttribute('aria-selected', 'true');
      onChange(btn.dataset.v);
    });
  });
}

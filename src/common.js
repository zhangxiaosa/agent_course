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
    if (edges.some((e) => e.from && e.to)) {
      snapFlowEdges(root, nodes, edges);
      window.addEventListener('resize', () => snapFlowEdges(root, nodes, edges));
    }
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

    const narrow = this.root.clientWidth > 0 && this.root.clientWidth < 720;
    if (narrow) this.root.classList.add('narrow');
    nodes.forEach((n) => {
      const el = document.createElement('div');
      el.className = 'fnode';
      el.dataset.k = n.k || 'io';
      el.style.left = n.x + '%';
      el.style.top = (narrow ? ({ start: 6, end: 6, model: 23, a_model: 23 }[n.id] || n.y) : n.y) + '%';
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

/* ---------- 给 flow 的边画箭头（viewBox 非等比缩放，按屏幕像素反算用户单位） ---------- */

function addFlowArrows(svgEl, edgeEls, opts) {
  const size = (opts && opts.size) || 9;
  const map = {};
  function draw() {
    Array.from(svgEl.querySelectorAll('.arw-poly')).forEach((el) => el.remove());
    const box = svgEl.getBoundingClientRect();
    if (!box.width || !box.height) return;
    const sx = box.width / 100, sy = box.height / 100;
    Object.entries(edgeEls).forEach(([id, pathEl]) => {
      const nums = (pathEl.getAttribute('d') || '').match(/-?\d+(?:\.\d+)?/g);
      if (!nums || nums.length < 4) return;
      const n = nums.map(Number);
      const ex = n[n.length - 2], ey = n[n.length - 1];
      const cx = n[n.length - 4], cy = n[n.length - 3];
      const ang = Math.atan2((ey - cy) * sy, (ex - cx) * sx);
      const L = size, HW = size * 0.36;
      const bx = ex - Math.cos(ang) * L / sx, by = ey - Math.sin(ang) * L / sy;
      const ox = -Math.sin(ang) * HW / sx, oy = Math.cos(ang) * HW / sy;
      const poly = document.createElementNS(NS, 'polygon');
      poly.setAttribute('points', `${ex},${ey} ${bx + ox},${by + oy} ${bx - ox},${by - oy}`);
      poly.setAttribute('class', 'arw-poly');
      svgEl.appendChild(poly);
      map[id] = poly;
    });
  }
  draw();
  window.addEventListener('resize', draw);
  return map;
}

/* 标准 8 节点闭环：与「中间件全景」同一张图，6 个节点围一圈，两个 agent 钩子在两侧上方 */
const STD_NODES = [
  { id: 'start',   label: 'before_agent', x: 10, y: 12, k: 'hook' },
  { id: 'b_model', label: 'before_model', x: 15, y: 46, k: 'hook' },
  { id: 'model',   label: 'model_call',   x: 30, y: 18, k: 'model' },
  { id: 'a_model', label: 'after_model',  x: 70, y: 18, k: 'hook' },
  { id: 'b_tool',  label: 'before_tool',  x: 85, y: 46, k: 'hook' },
  { id: 'tool',    label: 'tool_call',    x: 70, y: 78, k: 'tool' },
  { id: 'a_tool',  label: 'after_tool',   x: 30, y: 78, k: 'hook' },
  { id: 'end',     label: 'after_agent',  x: 88, y: 12, k: 'done' },
];

const STD_EDGES = [
  { id: 'e_start',  from: 'start',   to: 'b_model', d: 'M10 15 C11 26, 12 35, 13 42' },
  { id: 'e_bm',     from: 'b_model', to: 'model',   d: 'M17 43 C22 35, 24.5 28, 27 22.5' },
  { id: 'e_m',      from: 'model',   to: 'a_model', d: 'M34 18 L65.6 18' },
  { id: 'e_am_bt',  from: 'a_model', to: 'b_tool',  d: 'M70.5 22.5 C74 30, 78 36, 81.5 41.5' },
  { id: 'e_bt',     from: 'b_tool',  to: 'tool',    d: 'M85 50 C82 60, 76 68, 71.5 73.5' },
  { id: 'e_t',      from: 'tool',    to: 'a_tool',  d: 'M66.5 78 L34.5 78' },
  { id: 'e_loop',   from: 'a_tool',  to: 'b_model', d: 'M29 73.5 C25 66, 21 58, 18 50.5', loop: true },
  { id: 'e_exit',   from: 'a_model', to: 'end',     d: 'M73.5 15 C77 12.5, 81 11.5, 83.5 12' },
];

/* 端点吸附：按节点框的实际像素把边的首尾拉到框边，字号变了也不会缩进框里 */
function snapFlowEdges(root, nodes, edges) {
  const fr = root.getBoundingClientRect();
  if (!fr.width) return;
  const box = {};
  const els = root.querySelectorAll('.fnode');
  nodes.forEach((n, i) => {
    const el = els[i];
    if (!el) return;
    const r = el.getBoundingClientRect();
    box[n.id] = {
      cx: (r.left + r.width / 2 - fr.left) / fr.width * 100,
      cy: (r.top + r.height / 2 - fr.top) / fr.height * 100,
      hw: r.width / 2 / fr.width * 100,
      hh: r.height / 2 / fr.height * 100,
    };
  });
  function hit(c, tx, ty) {
    const dx = tx - c.cx, dy = ty - c.cy;
    if (!dx && !dy) return [c.cx, c.cy];
    const t = Math.min(Math.abs(dx) ? c.hw / Math.abs(dx) : 1e9, Math.abs(dy) ? c.hh / Math.abs(dy) : 1e9);
    return [c.cx + dx * t, c.cy + dy * t];
  }
  edges.forEach((e, i) => {
    if (!e.from || !e.to) return;
    const path = root.querySelectorAll('svg .edge')[i];
    const a = box[e.from], b = box[e.to];
    if (!path || !a || !b) return;
    const nums = (path.getAttribute('d') || '').match(/-?\d+(?:\.\d+)?/g);
    if (!nums || nums.length < 4) return;
    const n = nums.map(Number);
    const ctrl = n.slice(2, n.length - 2);
    const sPt = hit(a, ctrl.length ? ctrl[0] : b.cx, ctrl.length ? ctrl[1] : b.cy);
    const q = n.length >= 6 ? [n[n.length - 4], n[n.length - 3]] : [a.cx, a.cy];
    const tPt = hit(b, q[0], q[1]);
    path.setAttribute('d', ctrl.length
      ? 'M ' + sPt[0].toFixed(2) + ' ' + sPt[1].toFixed(2) + ' C ' + ctrl.join(' ') + ', ' + tPt[0].toFixed(2) + ' ' + tPt[1].toFixed(2)
      : 'M ' + sPt[0].toFixed(2) + ' ' + sPt[1].toFixed(2) + ' L ' + tPt[0].toFixed(2) + ' ' + tPt[1].toFixed(2));
  });
}

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

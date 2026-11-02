// 克苏鲁的右脑 —— 五子棋 AI。
// 整个函数会被 toString() 后塞进 Web Worker 运行，因此内部不能引用任何外部变量。
function CthulhuBrain() {
  const N = 15;
  const DIRS = [[1, 0], [0, 1], [1, 1], [1, -1]];

  // 棋形（以落子点为中心、长度 9 的线段，'1' 己方，'0' 空，'2' 对方或棋盘外）
  const FIVE = '11111';
  const L4 = '011110';
  const R4 = ['11110', '01111', '10111', '11011', '11101'];
  const L3 = ['011100', '001110', '011010', '010110'];
  const S3 = ['11100', '00111', '11010', '01011', '10110', '01101', '10011', '11001', '10101'];
  const L2 = ['001100', '011000', '000110', '001010', '010100', '010010'];
  const S2 = ['11000', '00011', '10100', '00101', '10010', '01001', '10001'];
  // 下标：0 单子 1 眠二 2 活二 3 眠三 4 活三 5 冲四 6 活四 7 成五
  const SCORE = [1, 20, 120, 300, 1500, 2500, 20000, 100000];
  const WIN = 100000;

  function lineStr(b, x, y, dx, dy, p) {
    let s = '';
    for (let k = -4; k <= 4; k++) {
      if (k === 0) { s += '1'; continue; }
      const nx = x + dx * k, ny = y + dy * k;
      if (nx < 0 || ny < 0 || nx >= N || ny >= N) { s += '2'; continue; }
      const v = b[ny * N + nx];
      s += v === 0 ? '0' : (v === p ? '1' : '2');
    }
    return s;
  }

  function has(s, list) {
    for (let i = 0; i < list.length; i++) if (s.indexOf(list[i]) >= 0) return true;
    return false;
  }

  function classify(s) {
    if (s.indexOf(FIVE) >= 0) return 7;
    if (s.indexOf(L4) >= 0) return 6;
    if (has(s, R4)) return 5;
    if (has(s, L3)) return 4;
    if (has(s, S3)) return 3;
    if (has(s, L2)) return 2;
    if (has(s, S2)) return 1;
    return 0;
  }

  function shapes(b, i, p) {
    const x = i % N, y = (i / N) | 0;
    const c = [0, 0, 0, 0, 0, 0, 0, 0];
    for (const [dx, dy] of DIRS) c[classify(lineStr(b, x, y, dx, dy, p))]++;
    return c;
  }

  function scoreShapes(c) {
    if (c[7]) return WIN;
    let s = 0;
    for (let k = 0; k < 8; k++) s += c[k] * SCORE[k];
    if (c[5] >= 2 || (c[5] >= 1 && c[4] >= 1)) s += 15000; // 四四 / 四三
    else if (c[4] >= 2) s += 6000;                         // 三三
    return s;
  }

  function makesFive(b, i, p) {
    const x = i % N, y = (i / N) | 0;
    for (const [dx, dy] of DIRS) {
      let n = 1;
      for (let k = 1; k < 5; k++) {
        const nx = x + dx * k, ny = y + dy * k;
        if (nx < 0 || ny < 0 || nx >= N || ny >= N || b[ny * N + nx] !== p) break;
        n++;
      }
      for (let k = 1; k < 5; k++) {
        const nx = x - dx * k, ny = y - dy * k;
        if (nx < 0 || ny < 0 || nx >= N || ny >= N || b[ny * N + nx] !== p) break;
        n++;
      }
      if (n >= 5) return true;
    }
    return false;
  }

  function candidates(b, range) {
    const res = [];
    let any = false;
    for (let i = 0; i < N * N; i++) {
      if (b[i] !== 0) { any = true; continue; }
      const x = i % N, y = (i / N) | 0;
      let near = false;
      for (let dy = -range; dy <= range && !near; dy++) {
        for (let dx = -range; dx <= range; dx++) {
          const nx = x + dx, ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= N || ny >= N) continue;
          if (b[ny * N + nx] !== 0) { near = true; break; }
        }
      }
      if (near) res.push(i);
    }
    if (!any) res.push(7 * N + 7);
    return res;
  }

  function fivePoints(b, p) {
    const out = [];
    for (const i of candidates(b, 1)) if (makesFive(b, i, p)) out.push(i);
    return out;
  }

  // 对每个候选点同时评估进攻（a）与防守（d）
  function rank(b, p) {
    const o = 3 - p;
    const list = [];
    for (const i of candidates(b, 2)) {
      const a = scoreShapes(shapes(b, i, p));
      const d = scoreShapes(shapes(b, i, o));
      list.push({ i, a, d, v: a * 1.05 + d * 0.9 });
    }
    list.sort((m, n) => n.v - m.v);
    return list;
  }

  // 连续冲四取胜（VCF）。返回第一手，失败返回 -1。
  function vcf(b, p, depth, budget) {
    const o = 3 - p;
    const cands = candidates(b, 2);
    for (const c of cands) if (makesFive(b, c, p)) return c;
    if (depth <= 0 || budget.n-- <= 0) return -1;
    for (const c of cands) {
      const sh = shapes(b, c, p);
      if (!(sh[5] || sh[6])) continue;
      b[c] = p;
      const fp = fivePoints(b, p);
      let win = -1;
      if (fp.length >= 2) win = c;
      else if (fp.length === 1) {
        b[fp[0]] = o;
        if (fivePoints(b, o).length === 0 && vcf(b, p, depth - 1, budget) >= 0) win = c;
        b[fp[0]] = 0;
      }
      b[c] = 0;
      if (win >= 0) return win;
      if (budget.n <= 0) return -1;
    }
    return -1;
  }

  function leafEval(list) {
    let ma = 0, md = 0;
    for (const m of list) { if (m.a > ma) ma = m.a; if (m.d > md) md = m.d; }
    return ma - md * 0.8;
  }

  function search(b, p, depth, alpha, beta, ctx, width) {
    if (performance.now() > ctx.deadline) { ctx.timeout = true; return 0; }
    const list = rank(b, p);
    if (!list.length) return 0;
    for (const m of list) if (m.a >= WIN) return 1e7 + depth;
    if (depth === 0) return leafEval(list);
    let moves = list.filter(m => m.d >= WIN);
    if (moves.length) moves = moves.slice(0, 1);
    else moves = list.slice(0, width);
    let best = -Infinity;
    for (const m of moves) {
      b[m.i] = p;
      const v = -search(b, 3 - p, depth - 1, -beta, -alpha, ctx, width);
      b[m.i] = 0;
      if (ctx.timeout) return best === -Infinity ? 0 : best;
      if (v > best) best = v;
      if (v > alpha) alpha = v;
      if (alpha >= beta) break;
    }
    return best;
  }

  function searchRoot(b, p, rootList, maxDepth, width, timeMs) {
    const ctx = { deadline: performance.now() + timeMs, timeout: false };
    let moves = rootList.slice(0, width);
    let bestMove = moves[0].i;
    for (let d = 1; d <= maxDepth; d++) {
      let alpha = -Infinity, best = -Infinity, bm = -1;
      const scored = [];
      for (const m of moves) {
        b[m.i] = p;
        const v = -search(b, 3 - p, d - 1, -Infinity, -alpha, ctx, width);
        b[m.i] = 0;
        if (ctx.timeout) break;
        scored.push([m, v]);
        if (v > best) { best = v; bm = m.i; }
        if (v > alpha) alpha = v;
      }
      if (ctx.timeout) break;
      bestMove = bm;
      scored.sort((x, y) => y[1] - x[1]);
      moves = scored.map(x => x[0]);
      if (best >= 1e6 || best <= -1e6) break;
    }
    return bestMove;
  }

  function pickWeighted(list, k) {
    const top = list.slice(0, k);
    const w = top.map((m, j) => Math.max(1, m.v) / (j + 1));
    let r = Math.random() * w.reduce((s, x) => s + x, 0);
    for (let j = 0; j < top.length; j++) { r -= w[j]; if (r <= 0) return top[j].i; }
    return top[0].i;
  }

  // level 1..6
  function chooseMove(board, p, level) {
    const b = Int8Array.from(board);
    const o = 3 - p;
    let stones = 0;
    for (let i = 0; i < N * N; i++) if (b[i]) stones++;
    if (stones === N * N) return -1;
    if (stones === 0) {
      if (level <= 2) return (7 + ((Math.random() * 3) | 0) - 1) * N + 7 + ((Math.random() * 3) | 0) - 1;
      return 7 * N + 7;
    }
    const list = rank(b, p);
    const win = list.find(m => m.a >= WIN);
    const block = list.find(m => m.d >= WIN);

    if (level === 1) {
      if (win && Math.random() < 0.8) return win.i;
      if (block && Math.random() < 0.6) return block.i;
      const sloppy = list.map(m => ({ i: m.i, v: m.a + m.d * 0.3 + Math.random() * 400 }))
        .sort((m, n) => n.v - m.v);
      return pickWeighted(sloppy, 6);
    }
    if (win) return win.i;
    if (block) return block.i;
    if (level === 2) {
      if (list[0].v >= 15000) return list[0].i;
      return pickWeighted(list, 3);
    }
    if (level === 3) return list[0].i;

    if (level >= 5) {
      const v = vcf(b, p, level >= 6 ? 14 : 10, { n: level >= 6 ? 6000 : 2500 });
      if (v >= 0) return v;
    }
    if (level >= 6 && list[0].a < 20000) {
      // 对手若有连续冲四的杀棋，优先找能化解的点
      if (vcf(b, o, 12, { n: 3000 }) >= 0) {
        const safe = [];
        for (const m of list.slice(0, 16)) {
          b[m.i] = p;
          if (vcf(b, o, 12, { n: 1500 }) < 0) safe.push(m);
          b[m.i] = 0;
        }
        if (safe.length) return searchRoot(b, p, safe, 4, 10, 1200);
      }
    }
    if (level === 4) return searchRoot(b, p, list, 2, 9, 600);
    if (level === 5) return searchRoot(b, p, list, 3, 10, 1000);
    return searchRoot(b, p, list, 4, 10, 1600);
  }

  return { chooseMove, makesFive };
}

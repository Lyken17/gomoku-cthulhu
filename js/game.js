'use strict';
(() => {
  const N = 15;
  const LETTERS = 'ABCDEFGHIJKLMNO';
  const canvas = document.getElementById('scene');
  const ctx = canvas.getContext('2d');
  const $ = id => document.getElementById(id);

  // ================================================================
  // 小工具
  // ================================================================
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const lerp = (a, b, t) => a + (b - a) * t;
  const easeOutBack = t => { const c1 = 1.9, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); };
  const pick = arr => arr[(Math.random() * arr.length) | 0];
  const now = () => performance.now();
  function mulberry(seed) {
    return function () {
      seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  const coordName = i => LETTERS[i % N] + (N - ((i / N) | 0));
  const P = s => (N - parseInt(s.slice(1), 10)) * N + LETTERS.indexOf(s[0]);

  // ================================================================
  // 存档
  // ================================================================
  const SAVE_KEY = 'cthulhu-gomoku-v1';
  function loadSave() { try { return JSON.parse(localStorage.getItem(SAVE_KEY)) || {}; } catch (e) { return {}; } }
  const save = Object.assign({
    stones: 0, owned: { r_lullaby: 1 }, stocking: null, record: 'r_lullaby',
    lessons: [], wins: {}, games: 0, sfx: true, music: false, greeted: false,
  }, loadSave());
  function persist() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (e) { /* 隐私模式下忽略 */ } }

  // ================================================================
  // 数据
  // ================================================================
  const LEVELS = [
    { name: '深海幼体', sub: '刚孵化，经常走神' },
    { name: '印斯茅斯渔夫', sub: '会挡，但不太会攻' },
    { name: '深潜者', sub: '认真盯着每一步' },
    { name: '星之眷族', sub: '会往后多看两步' },
    { name: '拉莱耶祭司', sub: '精通连续冲四' },
    { name: '旧日支配者', sub: '全力以赴的本尊' },
  ];

  const TERMS = [
    { id: 't_five', name: '连珠', desc: '五颗同色棋子在横、竖、斜任一方向连成一线，立即获胜。', b: [[1, 3], [2, 3], [3, 3], [4, 3], [5, 3]] },
    { id: 't_live4', name: '活四', desc: '两端都空着的四连。对手只能堵一头，下一手必成五。', b: [[2, 3], [3, 3], [4, 3], [5, 3]], m: [[1, 3], [6, 3]] },
    { id: 't_rush4', name: '冲四', desc: '只剩一个点能成五的四连。对手必须立刻去挡。', b: [[2, 3], [3, 3], [4, 3], [5, 3]], w: [[1, 3]], m: [[6, 3]] },
    { id: 't_live3', name: '活三', desc: '两端开放的三连，再加一子就是活四，必须提防。', b: [[2, 3], [3, 3], [4, 3]], m: [[1, 3], [5, 3]] },
    { id: 't_sleep3', name: '眠三', desc: '一端被堵住的三连，最多只能变成冲四。', b: [[2, 3], [3, 3], [4, 3]], w: [[1, 3]] },
    { id: 't_jump3', name: '跳三', desc: '中间隔着一个空位的活三，隐蔽又危险。', b: [[1, 3], [2, 3], [4, 3]], m: [[3, 3]] },
    { id: 't_43', name: '四三', desc: '一手同时形成冲四与活三，对手顾此失彼，是最常见的必胜手段。', b: [[1, 3], [2, 3], [3, 3], [4, 1], [4, 2]], w: [[0, 3]], m: [[4, 3]] },
    { id: 't_33', name: '三三', desc: '一手做出两个活三。连珠规则中，黑棋三三属于禁手。', b: [[2, 3], [3, 3], [4, 1], [4, 2]], m: [[4, 3]] },
    { id: 't_long', name: '长连', desc: '六子以上连成一线。自由规则算胜；连珠规则中黑棋长连是禁手。', b: [[0, 3], [1, 3], [2, 3], [3, 3], [4, 3], [5, 3]] },
    { id: 't_direct', name: '直指', desc: '开局时白棋第一手紧贴黑棋、横竖相邻，称为直指。', b: [[3, 3]], w: [[3, 2]] },
    { id: 't_diag', name: '斜指', desc: '白棋第一手落在黑棋斜向相邻的点，称为斜指。', b: [[3, 3]], w: [[4, 2]] },
    { id: 't_vcf', name: 'VCF', desc: '连续冲四取胜：每一手都是冲四，逼对手只能应着，直到成五。', b: [[1, 5], [2, 4], [3, 3], [3, 1], [3, 2], [5, 3]], w: [[0, 6], [3, 0]], m: [[4, 2], [3, 4]] },
  ];
  const RECORDS = [
    { id: 'r_lullaby', name: '拉莱耶摇篮曲', desc: '沉睡之城里慢悠悠的琶音，克苏鲁做梦时会跟着哼。', color: '#8a5bff' },
    { id: 'r_waltz', name: '深潜者华尔兹', desc: '三拍子的海底舞会，鱼人们踩着潮水转圈。', color: '#2fb8a8' },
    { id: 'r_rain', name: '印斯茅斯雨夜', desc: '雨点敲打渔村屋顶，远处传来低沉的钟声。', color: '#4a6fd8' },
    { id: 'r_stars', name: '星之彩', desc: '从天外坠落的颜色，在耳边叮叮作响。', color: '#e05bb0' },
  ];
  const STOCKINGS = [
    { id: 's_fishnet', name: '渔网袜', desc: '印斯茅斯渔夫亲手编织，网眼大小刚好卡住吸盘。', band: '#111' },
    { id: 's_stripe', name: '粉白条纹袜', desc: '据说是星之眷族从地球带回的纪念品。', band: '#ff6fb1' },
    { id: 's_stars', name: '星空袜', desc: '布料里封着一小片外宇宙，盯久了会头晕。', band: '#ffd86b' },
    { id: 's_lace', name: '白蕾丝袜', desc: '祭司仪式上才会穿的正装，克苏鲁坚称“完全不喜欢”。', band: '#fff' },
    { id: 's_dots', name: '紫波点袜', desc: '每个波点都是一只闭着的眼睛。大概吧。', band: '#c9a6ff' },
  ];
  const ITEM = {};
  TERMS.forEach(t => ITEM[t.id] = { ...t, kind: 'term' });
  RECORDS.forEach(t => ITEM[t.id] = { ...t, kind: 'record' });
  STOCKINGS.forEach(t => ITEM[t.id] = { ...t, kind: 'stocking' });

  const LESSONS = [
    { name: '五子连珠', text: '五子棋只有一条规则：横、竖、斜任意方向连成五颗就赢。<br>把棋子落在<b>幽灵棋子</b>上，完成你的第一条连珠吧。',
      b: ['E8', 'F8', 'G8', 'H8'], w: ['E9', 'G7', 'H9'], ghosts: ['D8', 'I8'],
      ok: '看，五颗棋子黏成一条了！这就是“连珠”。' },
    { name: '斜线也算', text: '斜着连成五颗同样算赢。<br>注意棋子之间的细细连线——那是斜向相邻的意思。',
      b: ['E5', 'F6', 'G7', 'H8'], w: ['D4', 'F7', 'G6'], ghosts: ['I9'],
      ok: '斜线连珠！别小看斜向，很多人类都栽在这里。' },
    { name: '冲四必挡', text: '白棋已经四连，只剩一个空位能成五——这叫<b>冲四</b>。<br>看到黑棋们紧张得冒汗了吗？快堵住它！',
      b: ['D10', 'F9', 'G8'], w: ['E10', 'F10', 'G10', 'H10'], ghosts: ['I10'],
      ok: '挡住了。冲四不挡，下一手就输——这是铁律。' },
    { name: '活四', text: '三颗连在一起、两端都空着。再加一颗就是<b>活四</b>：<br>两头都能成五，对手只能挡一边，必胜！',
      b: ['F8', 'G8', 'H8'], w: ['G9', 'H7'], ghosts: ['E8', 'I8'],
      ok: '活四完成！对手已经回天乏术了。' },
    { name: '挡活三', text: '白棋摆出了<b>活三</b>，放着不管下一步就会变成活四。<br>在任意一端挡住它。',
      b: ['G7', 'H5'], w: ['F6', 'G6', 'H6'], ghosts: ['E6', 'I6'],
      ok: '漂亮。活三一定要提前挡，否则就来不及了。' },
    { name: '跳三', text: '活三不一定要连在一起。隔一个空位的“<b>跳三</b>”同样致命，<br>而且更不容易被发现。',
      b: ['F8', 'G8'], w: ['G9', 'F7'], ghosts: ['I8', 'D8'],
      ok: '跳三成形。中间那个空位，就是你下一手的活四点。' },
    { name: '四三取胜', text: '一手同时做出<b>冲四</b>和<b>活三</b>：<br>对手挡了冲四，就挡不住活三。这是最常用的杀招。',
      b: ['E8', 'F8', 'G8', 'H9', 'H10'], w: ['D8', 'J10', 'F10'], ghosts: ['H8'],
      ok: '四三！对手只能二选一，胜负已分。' },
    { name: '三三', text: '一手做出两个活三，对手同样只能挡一个。<br>正式的连珠规则里黑棋三三是禁手……不过在我的房间里，允许。',
      b: ['F8', 'G8', 'H9', 'H10'], w: ['E10', 'J6'], ghosts: ['H8'],
      ok: '基础课程全部完成！去和“深海幼体”实战一局吧，我、我会手下留情的。' },
  ];

  const LINES = {
    greet: ['哼，又是你。拉莱耶的大门可不是天天为人类开的……陪你下一局也不是不行。',
      '旧日支配者今天心情不错，勉强陪你玩五子棋。别误会，只是闲得发慌而已！',
      '欢迎来到沉没之城。坐吧，棋盘已经替你擦干净了……才不是特意擦的。'],
    gift: '这二十颗棋子先给你……才、才不是礼物，是怕你一颗都没有太寒酸！<br>把棋子攒进右边的火锅里，二十颗就能抽一次盲盒。',
    poke: ['戳什么戳！我是伟大的克苏鲁，不是减压玩具！', '……再戳一次试试？', '我把右脑换成了五子棋引擎。左脑？左脑用来想你什么时候才能赢我。',
      '梦中的拉莱耶城里，连珠才是唯一的真理。', '火锅里的汤是我亲手熬的。别问是什么做的。'],
    aiStart: ['来吧，人类。五子连珠，先到先得。', '我会让你三招……骗你的，我从不让子。', '深渊正在凝视你的棋盘。', '把手洗干净再落子，别把棋子弄脏了。'],
    humanFour: ['冲、冲四？！……我看到了，不用你提醒！', '哼，这种小把戏也想骗过旧日支配者？', '触手已经伸过来了，别得意。'],
    humanThree: ['活三啊……有点意思。', '嗯？你在偷偷布局对吧。', '这步棋……还、还算可以吧。'],
    humanBlock: ['你居然看出来了？！', '切，被你挡住了。', '算你运气好。'],
    aiFour: ['冲四！快挡呀，不挡你就输了哦～', '这一手，叫做深渊的凝视。', '看好了，这才叫进攻。'],
    aiThree: ['活三，送给你的小礼物。', '你的棋子在发抖哦，感觉到了吗？', '嘻嘻，再不挡就来不及了。'],
    aiIdle: ['……', '哼。', '嗯——就下这里吧。', '我的触手比你的手快多了。', '你在发呆吗？', '这步棋你看得懂吗？看不懂也正常。'],
    aiWin: ['五子连珠！伟大的克苏鲁再次胜利！……要不要再来一局？我、我可没有很期待。',
      '哼哼，人类果然还差得远。安慰奖一颗棋子，拿去吧。', '这就是旧日支配者的实力！不过你今天也……也还行吧。'],
    humanWin: ['怎、怎么可能？！我的右脑可是……哼，这次是我让着你的！棋子拿去，别得意忘形！',
      '呜……输了。棋子都飞进火锅里了，你满意了吧？！', '可恶……下次绝对不会输给你！奖励拿去！'],
    draw: ['棋盘都摆满了？……平局。哼，算你厉害。'],
    undo: ['悔棋？……这次就原谅你。', '又悔棋！人类真是没有毅力。', '好啦好啦，给你重下的机会。'],
    hint: ['我只说一次：看那颗幽灵棋子。', '你欠我两颗棋子。答案就在幽灵棋子那里。', '真拿你没办法……'],
    petNo: ['别、别乱摸！', '呀！……触手是很敏感的！', '哼，摸够了没有……', '再摸就把你拖进海里！……开玩笑的。'],
    petSock: ['丝袜不是这么拉的啦！……算了，随你。', '往上一点……不对，我什么都没说！', '这种奇怪的爱好是谁教你的？！'],
    local: '自己和自己下？……好吧，我在旁边看着。<br>黑棋先行，谁先连成五子谁赢。',
    tutWrong: ['不对不对，看清幽灵棋子在哪！下错的棋子会消失哦。', '那里不行。仔细看看提示……', '笨蛋，是那颗半透明的位置！'],
    tutRight: ['对啦！……还算有点天赋。', '做得好……我才没有夸你。', '嗯，这样就对了。'],
    gachaNew: ['新的收藏！好好珍惜。', '哦？运气不错嘛。', '咕嘟咕嘟……捞到好东西了！'],
    gachaDup: ['重复了，退你 5 颗棋子。别哭。', '这个你已经有了……汤里就这么点东西嘛。'],
  };

  // ================================================================
  // 声音（全部用 WebAudio 现场合成，不需要素材文件）
  // ================================================================
  const mf = m => 440 * Math.pow(2, (m - 69) / 12);
  const Snd = {
    ctx: null, sfx: null, mus: null, timer: null, track: null, nextT: 0, step: 0, bed: null, mel: 3,
    ensure() {
      if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return true; }
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      const c = this.ctx = new AC();
      const out = c.createGain(); out.gain.value = 0.9; out.connect(c.destination);
      this.sfx = c.createGain(); this.sfx.connect(out);
      this.mus = c.createGain(); this.mus.gain.value = 0.55;
      const dl = c.createDelay(1); dl.delayTime.value = 0.33;
      const fb = c.createGain(); fb.gain.value = 0.33;
      const wet = c.createGain(); wet.gain.value = 0.4;
      this.mus.connect(out); this.mus.connect(dl); dl.connect(fb); fb.connect(dl); dl.connect(wet); wet.connect(out);
      return true;
    },
    tone(f, dur, o = {}) {
      const c = this.ctx; if (!c) return;
      const t = o.at ?? c.currentTime;
      const osc = c.createOscillator(), g = c.createGain();
      osc.type = o.type || 'sine';
      osc.frequency.setValueAtTime(f, t);
      if (o.to) osc.frequency.exponentialRampToValueAtTime(o.to, t + dur * 0.9);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(o.vol ?? 0.2, t + (o.atk ?? 0.005));
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      osc.connect(g); g.connect(o.dest || this.sfx);
      osc.start(t); osc.stop(t + dur + 0.05);
    },
    noiseBuf() {
      if (this._nb) return this._nb;
      const c = this.ctx, b = c.createBuffer(1, c.sampleRate * 2, c.sampleRate), d = b.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      return (this._nb = b);
    },
    noise(dur, o = {}) {
      const c = this.ctx; if (!c) return;
      const t = o.at ?? c.currentTime;
      const src = c.createBufferSource(); src.buffer = this.noiseBuf();
      const f = c.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = o.freq || 1000; f.Q.value = o.q || 1;
      const g = c.createGain();
      g.gain.setValueAtTime(o.vol ?? 0.1, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      src.connect(f); f.connect(g); g.connect(o.dest || this.sfx);
      src.start(t); src.stop(t + dur + 0.05);
    },
    play(name, arg) {
      if (!save.sfx || !this.ensure()) return;
      const t = this.ctx.currentTime;
      switch (name) {
        case 'plop': {
          const base = arg === 1 ? 230 : 320;
          this.tone(base * 1.7, 0.16, { to: base * 0.65, vol: 0.38 });
          this.tone(base * 3.4, 0.06, { to: base * 2, vol: 0.06, type: 'triangle' });
          this.noise(0.035, { freq: 2200, vol: 0.06 });
          break;
        }
        case 'vanish': this.tone(520, 0.45, { to: 110, vol: 0.13, type: 'triangle' }); break;
        case 'win': [523, 659, 784, 1047, 1319].forEach((f, i) => this.tone(f, 0.6, { at: t + i * 0.1, vol: 0.14, type: 'triangle' })); break;
        case 'lose': [392, 349, 311, 262].forEach((f, i) => this.tone(f, 0.5, { at: t + i * 0.16, vol: 0.13, type: 'sine' })); break;
        case 'bubble': this.tone(260 + Math.random() * 380, 0.09, { to: 700 + Math.random() * 300, vol: 0.09 }); break;
        case 'splash': this.noise(0.35, { freq: 900, vol: 0.12 }); this.tone(300, 0.12, { to: 900, vol: 0.08 }); break;
        case 'gacha': for (let i = 0; i < 9; i++) this.tone(mf(84 + [0, 3, 7, 10, 12, 15, 19, 22, 24][i]), 0.4, { at: t + i * 0.06, vol: 0.06, type: 'triangle' }); break;
        case 'squish': this.tone(180 + Math.random() * 60, 0.18, { to: 420, vol: 0.1, type: 'triangle' }); break;
        case 'click': this.tone(760, 0.05, { vol: 0.06, type: 'triangle' }); break;
        case 'think': this.tone(110, 0.4, { to: 90, vol: 0.05 }); break;
      }
    },
    bell(f, at, vol, dur) {
      this.tone(f, dur, { at, vol, dest: this.mus, atk: 0.003 });
      this.tone(f * 2.76, dur * 0.5, { at, vol: vol * 0.3, dest: this.mus, atk: 0.003 });
    },
    tracks: {
      r_lullaby: {
        dur: 60 / 70 / 2,
        play(t, s) {
          const chords = [[50, 53, 57, 62], [46, 50, 53, 58], [43, 46, 50, 55], [45, 49, 52, 57]];
          const ch = chords[Math.floor(s / 8) % 4];
          const pat = [0, 1, 2, 3, 2, 1, 2, 1];
          Snd.tone(mf(ch[pat[s % 8]] + 12), this.dur * 2.6, { at: t, vol: 0.05, type: 'triangle', dest: Snd.mus, atk: 0.02 });
          if (s % 8 === 0) Snd.tone(mf(ch[0] - 12), this.dur * 8, { at: t, vol: 0.08, dest: Snd.mus, atk: 0.15 });
          if (s % 16 === 4 && Math.random() < 0.6) Snd.bell(mf(ch[2] + 24), t, 0.02, 2);
        },
      },
      r_waltz: {
        dur: 60 / 112,
        play(t, s) {
          const ch = [[57, 60, 64], [50, 53, 57], [52, 56, 59], [57, 60, 64]][Math.floor(s / 3) % 4];
          const beat = s % 3;
          if (beat === 0) Snd.tone(mf(ch[0] - 12), 0.5, { at: t, vol: 0.1, dest: Snd.mus });
          else ch.forEach(m => Snd.tone(mf(m), 0.18, { at: t, vol: 0.028, type: 'triangle', dest: Snd.mus }));
          if (beat !== 2 || Math.random() < 0.4) {
            const scale = [69, 71, 72, 74, 76, 77, 80, 81];
            Snd.mel = clamp(Snd.mel + pick([-2, -1, -1, 1, 1, 2]), 0, scale.length - 1);
            Snd.tone(mf(scale[Snd.mel]), 0.38, { at: t, vol: 0.045, dest: Snd.mus, atk: 0.01 });
          }
        },
      },
      r_rain: {
        dur: 0.5,
        start() {
          const c = Snd.ctx, src = c.createBufferSource(); src.buffer = Snd.noiseBuf(); src.loop = true;
          const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 1400;
          const g = c.createGain(); g.gain.value = 0.05;
          src.connect(f); f.connect(g); g.connect(Snd.mus); src.start();
          Snd.bed = src;
        },
        play(t, s) {
          const pent = [45, 48, 50, 52, 55, 57, 60, 62, 64];
          if (Math.random() < 0.3) Snd.bell(mf(pick(pent) + 12), t, 0.035, 2.6);
          if (s % 16 === 0) Snd.tone(mf(33), 7, { at: t, vol: 0.06, dest: Snd.mus, atk: 1.2 });
          if (s % 32 === 8) Snd.bell(mf(57), t, 0.04, 5);
        },
      },
      r_stars: {
        dur: 0.22,
        play(t, s) {
          const pent = [72, 74, 76, 79, 81, 84, 86, 88, 91];
          if (Math.random() < 0.38) Snd.bell(mf(pick(pent)), t, 0.025, 1.6);
          if (s % 32 === 0) [60, 64, 67, 71].forEach(m => Snd.tone(mf(m), 6.5, { at: t, vol: 0.02, dest: Snd.mus, atk: 1.5, type: 'triangle' }));
        },
      },
    },
    startMusic() {
      if (!this.ensure()) return;
      this.stopMusic();
      this.track = this.tracks[save.record] || this.tracks.r_lullaby;
      if (this.track.start) this.track.start();
      this.nextT = this.ctx.currentTime + 0.1; this.step = 0;
      this.timer = setInterval(() => {
        while (this.nextT < this.ctx.currentTime + 0.3) {
          this.track.play(this.nextT, this.step++);
          this.nextT += this.track.dur;
        }
      }, 60);
    },
    stopMusic() {
      clearInterval(this.timer); this.timer = null;
      if (this.bed) { try { this.bed.stop(); } catch (e) { /* 已停止 */ } this.bed = null; }
    },
  };

  // ================================================================
  // AI：优先放进 Web Worker，失败则在主线程运行
  // ================================================================
  const Brain = (() => {
    const local = CthulhuBrain();
    let worker = null, seq = 0;
    const pending = {};
    function runLocal(job) { setTimeout(() => job.cb(local.chooseMove(job.board, job.p, job.level)), 20); }
    try {
      const src = CthulhuBrain.toString() +
        '\nconst B = CthulhuBrain();\nonmessage = e => { const d = e.data; postMessage({ id: d.id, move: B.chooseMove(d.board, d.p, d.level) }); };';
      worker = new Worker(URL.createObjectURL(new Blob([src], { type: 'text/javascript' })));
      worker.onmessage = e => { const job = pending[e.data.id]; delete pending[e.data.id]; if (job) job.cb(e.data.move); };
      worker.onerror = e => {
        if (e.preventDefault) e.preventDefault();
        worker = null;
        for (const id in pending) { runLocal(pending[id]); delete pending[id]; }
      };
    } catch (e) { worker = null; }
    return {
      ask(board, p, level, cb) {
        const job = { board: Array.from(board), p, level, cb };
        if (worker) { const id = ++seq; pending[id] = job; worker.postMessage({ id, board: job.board, p, level }); }
        else runLocal(job);
      },
    };
  })();

  // ================================================================
  // 游戏状态
  // ================================================================
  const S = {
    mode: 'menu', board: new Int8Array(N * N), moves: [], turn: 1, human: 1, level: 3,
    over: false, winner: 0, winLine: null, aiBusy: false, gameId: 0,
    vis: {}, mood: new Array(N * N).fill(null), threat: null,
    fading: [], particles: [], hover: -1, ghosts: [], hint: null,
    lesson: 0, lessonDone: false,
    mouse: { x: -999, y: -999, inside: false }, drag: null,
    mascotMood: 'idle', mascotUntil: 0, potShown: save.stones, potFlash: 0,
    setupLevel: 3, setupSide: 1,
  };

  // ================================================================
  // 布局
  // ================================================================
  const L = {};
  let floorC = null, boardC = null;

  function layout() {
    const W = innerWidth, H = innerHeight, dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    Object.assign(L, { W, H, dpr, portrait: W / H < 1.0 });
    if (!L.portrait) {
      const top = clamp(H * 0.12, 84, 124);
      const rightW = clamp(W * 0.25, 220, 380);
      const avail = W - rightW;
      const S0 = Math.min(H - top - 14, avail * 0.9);
      L.S = S0; L.bx = avail / 2 + Math.min(30, avail * 0.03); L.by = top + S0 / 2;
      const R = clamp(Math.min(rightW * 0.26, H * 0.12), 38, 92);
      L.pot = { cx: avail + rightW * 0.56, cy: Math.max(R * 1.6, H * 0.27), R };
      const bw = Math.min(rightW * 0.95, 340), bh = clamp(bw * 0.72, 150, H * 0.38);
      L.book = { x: W - bw - 14, y: H - bh - 24, w: bw, h: bh };
      L.dialog = { x: L.bx, y: 8, w: Math.min(S0 * 0.98, 720) };
      L.mascot = { x: L.pot.cx - R * 1.45, y: L.pot.cy - R * 0.9, s: R * 0.72 };
    } else {
      const top = 92;
      const S0 = Math.min(W * 0.97, H - top - 170);
      L.S = S0; L.bx = W / 2; L.by = top + S0 / 2;
      const y0 = top + S0 + 6, rest = H - y0;
      const R = clamp(Math.min(W * 0.11, rest * 0.28), 26, 70);
      L.pot = { cx: W - R * 1.45, cy: y0 + rest * 0.55, R };
      const bw = Math.min(W - R * 4.2 - 12, 380), bh = clamp(rest - 16, 120, bw * 0.72);
      L.book = { x: 10, y: y0 + (rest - bh) / 2, w: bw, h: bh };
      L.dialog = { x: W / 2, y: 6, w: W - 14 };
      L.mascot = { x: L.pot.cx - R * 1.75, y: L.pot.cy - R * 0.35, s: R * 0.62 };
    }
    const S0 = L.S;
    L.margin = S0 * 0.075;
    L.G = S0 - L.margin * 2;
    L.cell = L.G / (N - 1);
    L.gx = L.bx - L.G / 2; L.gy = L.by - L.G / 2;

    // 蜡烛
    const rnd = mulberry(7);
    const spots = L.portrait
      ? [[-0.42, -0.58], [0.1, -0.6], [-0.46, 0.58], [0.2, 0.6]]
      : [[-0.62, -0.44], [-0.68, 0.02], [-0.6, 0.44], [-0.28, -0.6], [0.22, -0.6], [0.62, 0.16], [0.02, 0.6], [-0.85, -0.2], [-0.84, 0.3]];
    L.candles = [];
    for (const [ux, uy] of spots) {
      const x = L.bx + ux * S0, y = L.by + uy * S0;
      if (x < 12 || x > W - 12 || y < 30 || y > H - 4) continue;
      if (Math.hypot(x - L.pot.cx, y - L.pot.cy) < L.pot.R * 2) continue;
      const b = L.book;
      if (x > b.x - 30 && x < b.x + b.w + 30 && y > b.y - 30 && y < b.y + b.h + 30) continue;
      const n = 1 + ((rnd() * 3) | 0), list = [];
      for (let k = 0; k < n; k++) list.push({ dx: (rnd() - 0.5) * S0 * 0.09, dy: (rnd() - 0.5) * S0 * 0.06, h: S0 * (0.045 + rnd() * 0.04), seed: rnd() * 100 });
      list.sort((a, c) => a.dy - c.dy);
      L.candles.push({ x, y, list });
    }

    // 触手
    const tw = S0 * (L.portrait ? 0.07 : 0.085);
    if (!L.portrait) {
      tentacles[0].setup({ x: -S0 * 0.14, y: L.by - S0 * 0.66 }, { x: L.bx - S0 * 0.57, y: L.by - S0 * 0.1 }, tw, 0.2);
      tentacles[1].setup({ x: L.bx + S0 * 0.28, y: -S0 * 0.16 }, { x: L.bx + S0 * 0.55, y: L.by - S0 * 0.34 }, tw * 0.95, 0.22);
      tentacles[2].setup({ x: L.bx - S0 * 0.62, y: H + S0 * 0.18 }, { x: L.bx - S0 * 0.5, y: L.by + S0 * 0.42 }, tw * 0.9, -0.2);
    } else {
      tentacles[0].setup({ x: -S0 * 0.16, y: L.by - S0 * 0.62 }, { x: L.bx - S0 * 0.5, y: L.by - S0 * 0.2 }, tw, 0.18);
      tentacles[1].setup({ x: W + S0 * 0.16, y: L.by - S0 * 0.7 }, { x: L.bx + S0 * 0.5, y: L.by - S0 * 0.36 }, tw * 0.95, -0.18);
      tentacles[2].setup({ x: -S0 * 0.18, y: H + S0 * 0.12 }, { x: L.bx - S0 * 0.44, y: L.by + S0 * 0.55 }, tw * 0.9, -0.18);
    }

    renderFloor();
    renderBoard();
    positionDOM();
  }

  function positionDOM() {
    const d = $('dialog');
    d.style.left = L.dialog.x + 'px'; d.style.top = L.dialog.y + 'px';
    d.style.width = L.dialog.w + 'px'; d.style.transform = 'translateX(-50%)';
    for (const id of ['menu', 'setup']) {
      const m = $(id);
      m.style.left = L.bx + 'px'; m.style.top = L.by + 'px'; m.style.transform = 'translate(-50%,-50%)';
    }
    const b = $('book');
    Object.assign(b.style, { left: L.book.x + 'px', top: L.book.y + 'px', width: L.book.w + 'px', height: L.book.h + 'px' });
  }

  // ================================================================
  // 预渲染：石砖地面
  // ================================================================
  function renderFloor() {
    const { W, H, dpr, S: S0 } = L;
    floorC = document.createElement('canvas');
    floorC.width = canvas.width; floorC.height = canvas.height;
    const g = floorC.getContext('2d');
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.fillStyle = '#0d0f16'; g.fillRect(0, 0, W, H);
    const rnd = mulberry(42);
    const bh = clamp(S0 * 0.13, 46, 120);
    for (let row = -1, y = -bh * 0.4; y < H + bh; row++, y += bh) {
      let x = -(row % 2 ? bh * 0.8 : bh * 0.2) - rnd() * bh * 0.3;
      while (x < W + bh) {
        const w = bh * (1.2 + rnd() * 0.9);
        const l = 15 + rnd() * 9, hue = 215 + rnd() * 20;
        const pad = bh * 0.05, rr = bh * 0.14;
        g.beginPath(); g.roundRect(x + pad, y + pad, w - pad * 2, bh - pad * 2, rr);
        const gr = g.createLinearGradient(x, y, x + w, y + bh);
        gr.addColorStop(0, `hsl(${hue},12%,${l + 5}%)`);
        gr.addColorStop(1, `hsl(${hue},14%,${l - 4}%)`);
        g.fillStyle = gr; g.fill();
        g.strokeStyle = 'rgba(255,255,255,.06)'; g.lineWidth = 2; g.stroke();
        // 裂缝与苔藓
        if (rnd() < 0.3) {
          g.beginPath(); let cx = x + w * (0.2 + rnd() * 0.6), cy = y + pad * 2;
          g.moveTo(cx, cy);
          for (let k = 0; k < 4; k++) { cx += (rnd() - 0.5) * bh * 0.3; cy += bh * 0.2; g.lineTo(cx, cy); }
          g.strokeStyle = 'rgba(0,0,0,.35)'; g.lineWidth = 1.2; g.stroke();
        }
        if (rnd() < 0.25) {
          g.fillStyle = `rgba(${60 + rnd() * 40},${110 + rnd() * 50},${60},.12)`;
          for (let k = 0; k < 8; k++) { g.beginPath(); g.arc(x + rnd() * w, y + bh - pad - rnd() * bh * 0.2, 2 + rnd() * 6, 0, 7); g.fill(); }
        }
        x += w;
      }
    }
    // 中心暖光 + 四周暗角
    let gr = g.createRadialGradient(L.bx, L.by, S0 * 0.2, L.bx, L.by, Math.max(W, H) * 0.85);
    gr.addColorStop(0, 'rgba(255,170,80,.18)');
    gr.addColorStop(0.35, 'rgba(60,40,30,.1)');
    gr.addColorStop(1, 'rgba(2,3,10,.88)');
    g.fillStyle = gr; g.fillRect(0, 0, W, H);
    gr = g.createRadialGradient(L.pot.cx, L.pot.cy, 0, L.pot.cx, L.pot.cy, L.pot.R * 4);
    gr.addColorStop(0, 'rgba(60,220,230,.16)'); gr.addColorStop(1, 'rgba(60,220,230,0)');
    g.fillStyle = gr; g.fillRect(0, 0, W, H);
  }

  // ================================================================
  // 预渲染：羊皮纸棋盘
  // ================================================================
  function renderBoard() {
    const { dpr, S: S0 } = L;
    const pad = S0 * 0.1, size = S0 + pad * 2;
    boardC = document.createElement('canvas');
    boardC.width = Math.round(size * dpr); boardC.height = Math.round(size * dpr);
    const g = boardC.getContext('2d');
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    const o = pad, rnd = mulberry(1234);

    // 木板底座
    g.save();
    g.shadowColor = 'rgba(0,0,0,.7)'; g.shadowBlur = S0 * 0.06; g.shadowOffsetY = S0 * 0.025;
    g.beginPath(); g.roundRect(o - S0 * 0.025, o - S0 * 0.015, S0 * 1.05, S0 * 1.045, S0 * 0.02);
    const wood = g.createLinearGradient(0, o, 0, o + S0);
    wood.addColorStop(0, '#6b4524'); wood.addColorStop(1, '#3d2611');
    g.fillStyle = wood; g.fill();
    g.restore();
    g.strokeStyle = 'rgba(0,0,0,.25)'; g.lineWidth = 1;
    for (let k = 0; k < 40; k++) {
      const y = o + rnd() * S0;
      g.beginPath(); g.moveTo(o - S0 * 0.02, y); g.bezierCurveTo(o + S0 * 0.3, y + rnd() * 6 - 3, o + S0 * 0.7, y + rnd() * 6 - 3, o + S0 * 1.02, y); g.stroke();
    }

    // 羊皮纸（不规则边缘）
    const pts = [];
    const jag = S0 * 0.008;
    const sides = [[o, o, o + S0, o], [o + S0, o, o + S0, o + S0], [o + S0, o + S0, o, o + S0], [o, o + S0, o, o]];
    for (const [x1, y1, x2, y2] of sides) {
      for (let k = 0; k < 28; k++) {
        const t = k / 28;
        const nx = -(y2 - y1), ny = x2 - x1, nl = Math.hypot(nx, ny);
        const j = (rnd() - 0.5) * jag * 2 + (rnd() < 0.08 ? -jag * 2.5 : 0);
        pts.push([lerp(x1, x2, t) + nx / nl * j, lerp(y1, y2, t) + ny / nl * j]);
      }
    }
    const paperPath = () => { g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.closePath(); };
    paperPath();
    let gr = g.createRadialGradient(o + S0 * 0.48, o + S0 * 0.42, S0 * 0.05, o + S0 / 2, o + S0 / 2, S0 * 0.75);
    gr.addColorStop(0, '#fbe2a6'); gr.addColorStop(0.55, '#e9b86c'); gr.addColorStop(1, '#a96f33');
    g.fillStyle = gr; g.fill();
    g.save(); paperPath(); g.clip();
    // 污渍
    for (let k = 0; k < 16; k++) {
      const x = o + rnd() * S0, y = o + rnd() * S0, r = S0 * (0.03 + rnd() * 0.12);
      const sg = g.createRadialGradient(x, y, 0, x, y, r);
      sg.addColorStop(0, `rgba(120,60,15,${0.05 + rnd() * 0.1})`); sg.addColorStop(1, 'rgba(120,60,15,0)');
      g.fillStyle = sg; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill();
    }
    // 折痕
    g.strokeStyle = 'rgba(110,60,20,.18)'; g.lineWidth = 1.5;
    g.beginPath(); g.moveTo(o + S0 * 0.5 + 3, o); g.lineTo(o + S0 * 0.5 - 4, o + S0); g.stroke();
    g.beginPath(); g.moveTo(o, o + S0 * 0.5 - 2); g.lineTo(o + S0, o + S0 * 0.5 + 5); g.stroke();
    // 边缘烧焦
    g.lineWidth = S0 * 0.03; g.strokeStyle = 'rgba(90,45,10,.45)'; g.filter = `blur(${S0 * 0.012}px)`;
    paperPath(); g.stroke();
    g.filter = 'none';
    g.restore();

    // 网格
    const gx = o + L.margin, gy = o + L.margin, c = L.cell;
    g.strokeStyle = 'rgba(48,26,8,.85)';
    for (let i = 0; i < N; i++) {
      g.lineWidth = i === 0 || i === N - 1 ? 2.2 : 1.1;
      g.beginPath(); g.moveTo(gx + i * c, gy); g.lineTo(gx + i * c, gy + L.G); g.stroke();
      g.beginPath(); g.moveTo(gx, gy + i * c); g.lineTo(gx + L.G, gy + i * c); g.stroke();
    }
    g.fillStyle = 'rgba(40,20,5,.9)';
    for (const [i, j] of [[3, 3], [11, 3], [7, 7], [3, 11], [11, 11]]) { g.beginPath(); g.arc(gx + i * c, gy + j * c, Math.max(2.5, c * 0.11), 0, 7); g.fill(); }
    // 坐标
    g.fillStyle = 'rgba(70,38,12,.8)';
    g.font = `${Math.max(9, c * 0.36)}px Georgia, "Times New Roman", serif`;
    g.textAlign = 'center'; g.textBaseline = 'middle';
    for (let i = 0; i < N; i++) {
      g.fillText(LETTERS[i], gx + i * c, gy + L.G + L.margin * 0.55);
      g.fillText(String(N - i), gx - L.margin * 0.55, gy + i * c);
    }
    L.boardPad = pad;
  }

  // ================================================================
  // 触手
  // ================================================================
  const SOCK_PATTERNS = {};
  function sockPattern(id) {
    if (SOCK_PATTERNS[id]) return SOCK_PATTERNS[id];
    const c = document.createElement('canvas'); c.width = c.height = 24;
    const g = c.getContext('2d');
    if (id === 's_fishnet') {
      g.strokeStyle = 'rgba(10,10,20,.95)'; g.lineWidth = 1.6;
      for (let k = -24; k < 48; k += 8) {
        g.beginPath(); g.moveTo(k, 0); g.lineTo(k + 24, 24); g.stroke();
        g.beginPath(); g.moveTo(k + 24, 0); g.lineTo(k, 24); g.stroke();
      }
    } else if (id === 's_stripe') {
      for (let y = 0; y < 24; y += 12) { g.fillStyle = '#ff94c8'; g.fillRect(0, y, 24, 6); g.fillStyle = '#fff4fa'; g.fillRect(0, y + 6, 24, 6); }
    } else if (id === 's_stars') {
      g.fillStyle = '#1c1f52'; g.fillRect(0, 0, 24, 24);
      g.fillStyle = '#ffe68a'; g.fillRect(4, 5, 2, 2); g.fillRect(16, 14, 2, 2);
      g.fillStyle = '#d7a6ff'; g.fillRect(12, 3, 1, 1); g.fillRect(6, 18, 1, 1); g.fillRect(20, 8, 1, 1);
      g.strokeStyle = '#ffe68a'; g.lineWidth = 1; g.beginPath(); g.moveTo(17, 2); g.lineTo(17, 8); g.moveTo(14, 5); g.lineTo(20, 5); g.stroke();
    } else if (id === 's_lace') {
      g.fillStyle = 'rgba(255,255,255,.82)'; g.fillRect(0, 0, 24, 24);
      g.globalCompositeOperation = 'destination-out';
      for (const [x, y, r] of [[6, 6, 3], [18, 18, 3], [18, 6, 1.6], [6, 18, 1.6], [12, 12, 1.2], [0, 12, 1.2], [12, 0, 1.2]]) { g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); }
      g.globalCompositeOperation = 'source-over';
      g.strokeStyle = 'rgba(255,255,255,.9)'; g.beginPath(); g.arc(6, 6, 4.5, 0, 7); g.stroke(); g.beginPath(); g.arc(18, 18, 4.5, 0, 7); g.stroke();
    } else if (id === 's_dots') {
      g.fillStyle = '#7650d0'; g.fillRect(0, 0, 24, 24);
      g.fillStyle = '#f2e6ff';
      for (const [x, y] of [[6, 6], [18, 18], [18, 6], [6, 18]]) { g.beginPath(); g.ellipse(x, y, 3, 1.6, 0, 0, 7); g.fill(); }
      g.fillStyle = '#2a1650';
      for (const [x, y] of [[6, 6], [18, 18], [18, 6], [6, 18]]) { g.beginPath(); g.arc(x, y, 1, 0, 7); g.fill(); }
    }
    return (SOCK_PATTERNS[id] = ctx.createPattern(c, 'repeat'));
  }

  class Tentacle {
    constructor(id) {
      this.id = id; this.phase = Math.random() * 10; this.mode = 'idle';
      this.tip = null; this.target = null; this.onArrive = null; this.carry = 0;
      this.blush = 0; this.sock = 0.5 + Math.random() * 0.2; this.pts = []; this.wig = 0;
    }
    setup(base, rest, width, bend) {
      this.base = base; this.rest = rest; this.width = width; this.bend = bend;
      if (!this.tip) this.tip = { ...rest };
      if (this.mode === 'idle') this.tip = { ...rest };
    }
    reach(target, color, cb) { this.mode = 'reach'; this.target = target; this.carry = color; this.onArrive = cb; }
    think() { this.mode = 'think'; }
    update(dt, t) {
      const W0 = this.width;
      let goal, k;
      if (this.mode === 'reach') { goal = this.target; k = 6.5; }
      else if (this.mode === 'think') {
        const cx = lerp(this.rest.x, L.bx, 0.42), cy = lerp(this.rest.y, L.by, 0.42);
        goal = { x: cx + Math.sin(t * 0.9 + this.phase) * L.S * 0.1, y: cy + Math.cos(t * 1.3 + this.phase) * L.S * 0.07 };
        k = 2;
      } else {
        goal = { x: this.rest.x + Math.sin(t * 0.7 + this.phase) * W0 * 0.7, y: this.rest.y + Math.cos(t * 0.9 + this.phase) * W0 * 0.6 };
        k = 2.6;
      }
      const a = Math.min(1, dt * k);
      this.tip.x += (goal.x - this.tip.x) * a; this.tip.y += (goal.y - this.tip.y) * a;
      if (this.mode === 'reach' && Math.hypot(goal.x - this.tip.x, goal.y - this.tip.y) < 3) {
        this.mode = 'retract'; this.carry = 0;
        const cb = this.onArrive; this.onArrive = null; if (cb) cb();
      } else if (this.mode === 'retract' && Math.hypot(this.rest.x - this.tip.x, this.rest.y - this.tip.y) < W0) this.mode = 'idle';
      this.blush = Math.max(0, this.blush - dt * 0.5);
      this.wig = Math.max(0, this.wig - dt * 1.5);

      // 二次贝塞尔中线 + 波动
      const n = 46, b = this.base, tp = this.tip;
      const dx = tp.x - b.x, dy = tp.y - b.y, len = Math.hypot(dx, dy) || 1;
      const nx = -dy / len, ny = dx / len;
      const bend = this.bend * len * (1 + 0.15 * Math.sin(t * 0.6 + this.phase));
      const cx = (b.x + tp.x) / 2 + nx * bend, cy = (b.y + tp.y) / 2 + ny * bend;
      const amp = W0 * (0.35 + this.wig * 0.8);
      this.pts.length = 0;
      for (let i = 0; i < n; i++) {
        const s = i / (n - 1), u = 1 - s;
        const wave = Math.sin(t * (1.7 + this.wig * 6) + s * 7 + this.phase) * amp * Math.sin(Math.PI * s);
        this.pts.push({
          x: u * u * b.x + 2 * u * s * cx + s * s * tp.x + nx * wave,
          y: u * u * b.y + 2 * u * s * cy + s * s * tp.y + ny * wave,
          w: W0 * (1 - 0.8 * s) * (1 + 0.05 * Math.sin(s * 18 - t * 3)),
        });
      }
      const P0 = this.pts;
      for (let i = 0; i < n; i++) {
        const a0 = P0[Math.max(0, i - 1)], a1 = P0[Math.min(n - 1, i + 1)];
        const tx = a1.x - a0.x, ty = a1.y - a0.y, tl = Math.hypot(tx, ty) || 1;
        P0[i].nx = -ty / tl; P0[i].ny = tx / tl;
      }
    }
    outline(g, i0) {
      const P0 = this.pts, n = P0.length;
      g.beginPath();
      for (let i = i0; i < n; i++) { const p = P0[i]; g.lineTo(p.x + p.nx * p.w / 2, p.y + p.ny * p.w / 2); }
      const tp = P0[n - 1];
      g.arc(tp.x, tp.y, tp.w / 2, Math.atan2(tp.ny, tp.nx), Math.atan2(tp.ny, tp.nx) + Math.PI, true);
      for (let i = n - 1; i >= i0; i--) { const p = P0[i]; g.lineTo(p.x - p.nx * p.w / 2, p.y - p.ny * p.w / 2); }
      g.closePath();
    }
    draw(g, t) {
      const P0 = this.pts, n = P0.length;
      if (!n) return;
      // 投影
      g.save(); g.translate(L.S * 0.02, L.S * 0.03);
      this.outline(g, 0); g.fillStyle = 'rgba(0,0,0,.32)'; g.fill();
      g.restore();
      // 本体
      this.outline(g, 0);
      const gr = g.createLinearGradient(this.base.x, this.base.y, this.tip.x, this.tip.y);
      gr.addColorStop(0, '#16205e'); gr.addColorStop(0.6, '#2a3fa8'); gr.addColorStop(1, '#4a62d8');
      g.fillStyle = gr; g.fill();
      // 高光
      g.lineCap = 'round';
      for (let i = 1; i < n - 2; i++) {
        const p = P0[i], q = P0[i + 1];
        g.beginPath();
        g.moveTo(p.x + p.nx * p.w * 0.22, p.y + p.ny * p.w * 0.22);
        g.lineTo(q.x + q.nx * q.w * 0.22, q.y + q.ny * q.w * 0.22);
        g.lineWidth = p.w * 0.22; g.strokeStyle = 'rgba(130,160,255,.35)'; g.stroke();
      }
      // 吸盘
      for (let i = 3; i < n - 2; i += 2) {
        const p = P0[i], r = p.w * 0.2;
        const x = p.x - p.nx * p.w * 0.47, y = p.y - p.ny * p.w * 0.47;
        g.beginPath(); g.arc(x, y, r, 0, 7); g.fillStyle = '#4fd8cf'; g.fill();
        g.lineWidth = 1; g.strokeStyle = '#0b3d4a'; g.stroke();
        g.beginPath(); g.arc(x, y, r * 0.45, 0, 7); g.fillStyle = '#1d7f8c'; g.fill();
      }
      // 丝袜
      if (save.stocking) {
        const i0 = Math.round((1 - this.sock) * (n - 1));
        g.save();
        this.outline(g, i0);
        g.globalAlpha = 0.9; g.fillStyle = sockPattern(save.stocking); g.fill();
        g.globalAlpha = 0.25; g.fillStyle = gr; g.fill();
        g.restore();
        const p = P0[i0];
        g.beginPath();
        g.moveTo(p.x + p.nx * p.w * 0.52, p.y + p.ny * p.w * 0.52);
        g.lineTo(p.x - p.nx * p.w * 0.52, p.y - p.ny * p.w * 0.52);
        g.lineWidth = p.w * 0.16; g.strokeStyle = ITEM[save.stocking].band; g.stroke();
      }
      // 害羞
      if (this.blush > 0.01) {
        this.outline(g, 0); g.fillStyle = `rgba(255,110,170,${this.blush * 0.35})`; g.fill();
      }
      this.outline(g, 0); g.lineWidth = 2; g.strokeStyle = 'rgba(6,8,30,.9)'; g.stroke();
      if (this.carry) drawStoneFull(g, this.tip.x, this.tip.y + L.cell * 0.1, L.cell * 0.43, this.carry, 'smug', t, 1);
    }
    hit(x, y) {
      for (let i = this.pts.length - 1; i >= 0; i--) {
        const p = this.pts[i];
        if (Math.hypot(x - p.x, y - p.y) < p.w * 0.55 + 3) return i / (this.pts.length - 1);
      }
      return -1;
    }
  }
  const tentacles = [new Tentacle(0), new Tentacle(1), new Tentacle(2)];

  // ================================================================
  // 棋子绘制
  // ================================================================
  const STONE = {
    1: { fill: '#1d1a24', face: '#f3eee4', hi: 'rgba(170,160,220,.45)' },
    2: { fill: '#f6f2e9', face: '#2b2433', hi: 'rgba(255,255,255,.9)', shade: 'rgba(170,150,120,.45)' },
  };

  function drawFace(g, x, y, r, color, mood, t, phase) {
    const fc = STONE[color].face;
    g.save(); g.translate(x, y);
    if (mood === 'nervous') g.translate(Math.sin(t * 50 + phase) * r * 0.04, 0);
    const mx = S.mouse.x - x, my = S.mouse.y - y, ml = Math.hypot(mx, my) || 1;
    const lx = S.mouse.inside ? mx / ml * r * 0.07 : 0, ly = S.mouse.inside ? my / ml * r * 0.05 : 0;
    const ex = r * 0.3, ey = -r * 0.04, es = r * 0.085;
    g.fillStyle = fc; g.strokeStyle = fc; g.lineWidth = Math.max(1, r * 0.075); g.lineCap = 'round'; g.lineJoin = 'round';
    const blink = ((t + phase * 3.7) % 4.6) < 0.13;
    const blushy = () => {
      g.fillStyle = 'rgba(255,120,150,.45)';
      for (const s of [-1, 1]) { g.beginPath(); g.ellipse(s * r * 0.5, r * 0.16, r * 0.14, r * 0.08, 0, 0, 7); g.fill(); }
      g.fillStyle = fc;
    };
    switch (mood) {
      case 'win':
        for (const s of [-1, 1]) {
          g.beginPath(); g.moveTo(s * ex - es * 1.3, ey + es * 0.6); g.lineTo(s * ex, ey - es * 0.8); g.lineTo(s * ex + es * 1.3, ey + es * 0.6); g.stroke();
        }
        g.beginPath(); g.arc(0, r * 0.14, r * 0.15, 0, Math.PI); g.closePath(); g.fill();
        blushy();
        break;
      case 'lose':
        for (const s of [-1, 1]) {
          g.beginPath();
          g.moveTo(s * ex - es, ey - es); g.lineTo(s * ex + es, ey + es);
          g.moveTo(s * ex + es, ey - es); g.lineTo(s * ex - es, ey + es); g.stroke();
        }
        g.beginPath(); g.moveTo(-r * 0.16, r * 0.24);
        for (let k = 1; k <= 4; k++) g.lineTo(-r * 0.16 + k * r * 0.08, r * 0.24 + (k % 2 ? -1 : 1) * r * 0.04);
        g.stroke();
        g.fillStyle = 'rgba(120,200,255,.85)';
        g.beginPath(); g.ellipse(ex + es * 0.4, ey + r * 0.22 + ((t * 0.6 + phase) % 1) * r * 0.25, r * 0.05, r * 0.08, 0, 0, 7); g.fill();
        break;
      case 'smug':
        for (const s of [-1, 1]) {
          g.beginPath(); g.moveTo(s * ex - es * 1.2, ey - es * 0.2); g.lineTo(s * ex + es * 1.2, ey - es * 0.2); g.stroke();
          g.beginPath(); g.arc(s * ex + lx, ey + es * 0.45, es * 0.7, 0, Math.PI); g.fill();
        }
        g.beginPath(); g.moveTo(-r * 0.12, r * 0.17); g.quadraticCurveTo(r * 0.05, r * 0.27, r * 0.17, r * 0.1); g.stroke();
        blushy();
        break;
      case 'nervous':
        for (const s of [-1, 1]) {
          g.beginPath(); g.arc(s * ex, ey, es * 1.45, 0, 7); g.stroke();
          g.beginPath(); g.arc(s * ex + lx * 0.5, ey + ly * 0.5, es * 0.5, 0, 7); g.fill();
        }
        g.beginPath(); g.moveTo(-r * 0.14, r * 0.24);
        for (let k = 1; k <= 4; k++) g.lineTo(-r * 0.14 + k * r * 0.07, r * 0.24 + (k % 2 ? -1 : 1) * r * 0.035);
        g.stroke();
        g.fillStyle = 'rgba(130,210,255,.9)';
        g.beginPath(); g.moveTo(r * 0.58, -r * 0.5); g.quadraticCurveTo(r * 0.72, -r * 0.24, r * 0.58, -r * 0.2); g.quadraticCurveTo(r * 0.44, -r * 0.24, r * 0.58, -r * 0.5); g.fill();
        break;
      case 'ghost':
        for (const s of [-1, 1]) { g.beginPath(); g.arc(s * ex, ey, es, 0, 7); g.fill(); }
        g.beginPath(); g.arc(0, r * 0.15, r * 0.07, 0, 7); g.stroke();
        break;
      default:
        for (const s of [-1, 1]) {
          if (blink) { g.beginPath(); g.moveTo(s * ex - es, ey); g.lineTo(s * ex + es, ey); g.stroke(); }
          else { g.beginPath(); g.arc(s * ex + lx, ey + ly, es, 0, 7); g.fill(); }
        }
        g.beginPath(); g.arc(lx * 0.5, r * 0.08 + ly * 0.5, r * 0.085, 0.15 * Math.PI, 0.85 * Math.PI); g.stroke();
    }
    g.restore();
  }

  function drawStoneFull(g, x, y, r, color, mood, t, alpha) {
    g.save(); g.globalAlpha = alpha;
    g.fillStyle = 'rgba(40,20,0,.3)'; g.beginPath(); g.arc(x + r * 0.15, y + r * 0.25, r, 0, 7); g.fill();
    g.fillStyle = STONE[color].fill; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill();
    shadeStone(g, x, y, r, color);
    drawFace(g, x, y, r, color, mood, t, x * 0.13 + y * 0.07);
    g.restore();
  }

  function shadeStone(g, x, y, r, color) {
    if (color === 2) {
      const sg = g.createRadialGradient(x - r * 0.3, y - r * 0.35, r * 0.2, x, y, r * 1.05);
      sg.addColorStop(0, 'rgba(255,255,255,0)'); sg.addColorStop(1, STONE[2].shade);
      g.fillStyle = sg; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill();
    }
    const hg = g.createRadialGradient(x - r * 0.38, y - r * 0.42, 0, x - r * 0.38, y - r * 0.42, r * 0.55);
    hg.addColorStop(0, STONE[color].hi); hg.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = hg; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill();
  }

  function cellPos(i) { return { x: L.gx + (i % N) * L.cell, y: L.gy + ((i / N) | 0) * L.cell }; }
  function cellAt(x, y) {
    const i = Math.round((x - L.gx) / L.cell), j = Math.round((y - L.gy) / L.cell);
    if (i < 0 || j < 0 || i >= N || j >= N) return -1;
    if (Math.hypot(x - (L.gx + i * L.cell), y - (L.gy + j * L.cell)) > L.cell * 0.55) return -1;
    return j * N + i;
  }

  function drawStones(g, t) {
    const r0 = L.cell * 0.43;
    const tn = now();
    const scaleOf = i => {
      const v = S.vis[i]; if (!v) return 1;
      const age = (tn - v.born) / 1000;
      if (age < 0) return 0;
      return (age < 0.45 ? easeOutBack(age / 0.45) : 1) * (1 + 0.025 * Math.sin(t * 2.2 + v.phase));
    };
    const stones = { 1: [], 2: [] };
    for (let i = 0; i < N * N; i++) if (S.board[i]) stones[S.board[i]].push(i);

    const links = color => {
      const segs = [];
      for (const i of stones[color]) {
        const x = i % N, y = (i / N) | 0;
        for (const [dx, dy, diag] of [[1, 0, 0], [0, 1, 0], [1, 1, 1], [-1, 1, 1]]) {
          const nx = x + dx, ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= N || ny >= N) continue;
          const j = ny * N + nx;
          if (S.board[j] !== color) continue;
          const s = Math.min(scaleOf(i), scaleOf(j));
          if (s < 0.4) continue;
          segs.push([i, j, diag, s]);
        }
      }
      return segs;
    };
    const paint = (color, offX, offY, style) => {
      g.fillStyle = style; g.strokeStyle = style; g.lineCap = 'round';
      for (const [i, j, diag, s] of links(color)) {
        const a = cellPos(i), b = cellPos(j);
        g.lineWidth = L.cell * (diag ? 0.17 : 0.66) * Math.min(1, s);
        g.beginPath(); g.moveTo(a.x + offX, a.y + offY); g.lineTo(b.x + offX, b.y + offY); g.stroke();
      }
      for (const i of stones[color]) {
        const p = cellPos(i), r = r0 * scaleOf(i);
        if (r <= 0) continue;
        g.beginPath(); g.arc(p.x + offX, p.y + offY, r, 0, 7); g.fill();
      }
    };
    // 影子
    paint(1, r0 * 0.15, r0 * 0.25, 'rgba(50,25,5,.32)');
    paint(2, r0 * 0.15, r0 * 0.25, 'rgba(50,25,5,.32)');
    for (const color of [2, 1]) {
      paint(color, 0, 0, STONE[color].fill);
      for (const i of stones[color]) {
        const p = cellPos(i), r = r0 * scaleOf(i);
        if (r > 0) shadeStone(g, p.x, p.y, r, color);
      }
    }
    // 连珠光带
    if (S.winLine) {
      const a = cellPos(S.winLine[0]), b = cellPos(S.winLine[S.winLine.length - 1]);
      g.save();
      g.globalCompositeOperation = 'lighter';
      g.shadowColor = '#ffd86b'; g.shadowBlur = 20;
      g.strokeStyle = `rgba(255,216,107,${0.45 + 0.25 * Math.sin(t * 5)})`;
      g.lineWidth = L.cell * 0.18; g.lineCap = 'round';
      g.beginPath(); g.moveTo(a.x, a.y); g.lineTo(b.x, b.y); g.stroke();
      g.restore();
    }
    // 表情
    for (const color of [1, 2]) {
      for (const i of stones[color]) {
        const p = cellPos(i), s = scaleOf(i), r = r0 * s;
        if (s < 0.5) continue;
        drawFace(g, p.x, p.y, r, color, S.mood[i] || 'normal', t, S.vis[i] ? S.vis[i].phase : i);
      }
    }
    // 最后一手标记
    const last = S.moves[S.moves.length - 1];
    if (last && !S.over) {
      const p = cellPos(last.i);
      g.strokeStyle = `rgba(90,255,230,${0.5 + 0.3 * Math.sin(t * 4)})`; g.lineWidth = 2;
      g.beginPath(); g.arc(p.x, p.y, r0 * 1.18, 0, 7); g.stroke();
    }
  }

  function drawGhost(g, i, color, t, alpha, ring) {
    const p = cellPos(i), r = L.cell * 0.43;
    g.save();
    g.globalAlpha = alpha;
    g.fillStyle = color === 1 ? 'rgba(40,30,70,.85)' : 'rgba(240,250,255,.85)';
    g.beginPath(); g.arc(p.x, p.y, r, 0, 7); g.fill();
    drawFace(g, p.x, p.y, r, color, 'ghost', t, i);
    g.restore();
    if (ring) {
      g.save();
      g.setLineDash([4, 4]); g.lineDashOffset = -t * 20;
      g.strokeStyle = ring; g.lineWidth = 2; g.shadowColor = ring; g.shadowBlur = 10;
      g.beginPath(); g.arc(p.x, p.y, r * (1.25 + 0.08 * Math.sin(t * 4)), 0, 7); g.stroke();
      g.restore();
    }
  }

  // ================================================================
  // 场景道具
  // ================================================================
  function drawCandle(g, x, y, h, t, seed) {
    const w = h * 0.3;
    g.fillStyle = 'rgba(0,0,0,.35)'; g.beginPath(); g.ellipse(x + w * 0.4, y + w * 0.25, w * 1.5, w * 0.55, 0, 0, 7); g.fill();
    const hg = g.createLinearGradient(x - w * 1.3, 0, x + w * 1.3, 0);
    hg.addColorStop(0, '#5a3a14'); hg.addColorStop(0.5, '#c08a3a'); hg.addColorStop(1, '#4a2e10');
    g.fillStyle = hg; g.beginPath(); g.ellipse(x, y, w * 1.3, w * 0.45, 0, 0, 7); g.fill();
    const bg = g.createLinearGradient(x - w / 2, 0, x + w / 2, 0);
    bg.addColorStop(0, '#c9a46c'); bg.addColorStop(0.4, '#f7e6bd'); bg.addColorStop(1, '#a8824c');
    g.fillStyle = bg; g.fillRect(x - w / 2, y - h, w, h);
    g.fillStyle = '#fff1cc'; g.beginPath(); g.ellipse(x, y - h, w / 2, w * 0.18, 0, 0, 7); g.fill();
    g.fillStyle = '#efdcae'; g.beginPath(); g.ellipse(x - w * 0.35, y - h + w * 0.6, w * 0.12, w * 0.5, 0, 0, 7); g.fill();
    g.strokeStyle = '#2a1a0a'; g.lineWidth = 1.2; g.beginPath(); g.moveTo(x, y - h); g.lineTo(x, y - h - w * 0.35); g.stroke();
    const fl = 1 + 0.12 * Math.sin(t * 13 + seed) + 0.07 * Math.sin(t * 23 + seed * 2);
    const fh = w * 1.9 * fl, fw = w * 0.55, fx = x + Math.sin(t * 7 + seed) * w * 0.08, fy = y - h - w * 0.3;
    const fg = g.createRadialGradient(fx, fy - fh * 0.25, 0, fx, fy - fh * 0.3, fh * 0.7);
    fg.addColorStop(0, '#fffbe6'); fg.addColorStop(0.35, '#ffd65a'); fg.addColorStop(1, 'rgba(255,110,20,.2)');
    g.fillStyle = fg;
    g.beginPath(); g.moveTo(fx, fy - fh);
    g.bezierCurveTo(fx + fw, fy - fh * 0.45, fx + fw * 0.7, fy, fx, fy);
    g.bezierCurveTo(fx - fw * 0.7, fy, fx - fw, fy - fh * 0.45, fx, fy - fh);
    g.fill();
    return { x: fx, y: fy - fh * 0.4, fl };
  }

  function drawCandles(g, t) {
    const glows = [];
    for (const c of L.candles) for (const k of c.list) glows.push(drawCandle(g, c.x + k.dx, c.y + k.dy, k.h, t, k.seed));
    g.save(); g.globalCompositeOperation = 'lighter';
    for (const f of glows) {
      const r = L.S * 0.13 * f.fl;
      const gg = g.createRadialGradient(f.x, f.y, 0, f.x, f.y, r);
      gg.addColorStop(0, 'rgba(255,170,70,.32)'); gg.addColorStop(1, 'rgba(255,120,40,0)');
      g.fillStyle = gg; g.fillRect(f.x - r, f.y - r, r * 2, r * 2);
    }
    g.restore();
  }

  function drawCauldron(g, t) {
    const { cx, cy, R } = L.pot;
    const hover = S.potHover ? 1 : 0;
    const flash = S.potFlash;
    g.fillStyle = 'rgba(0,0,0,.45)'; g.beginPath(); g.ellipse(cx + R * 0.1, cy + R * 1.05, R * 1.15, R * 0.3, 0, 0, 7); g.fill();
    g.fillStyle = '#151a2a';
    for (const s of [-0.6, 0, 0.6]) { g.beginPath(); g.roundRect(cx + s * R - R * 0.09, cy + R * 0.6, R * 0.18, R * 0.42, R * 0.05); g.fill(); }
    g.lineWidth = R * 0.11; g.strokeStyle = '#2a3350';
    for (const s of [-1, 1]) { g.beginPath(); g.ellipse(cx + s * R * 1.02, cy - R * 0.05, R * 0.2, R * 0.26, 0, 0, 7); g.stroke(); }
    let gr = g.createRadialGradient(cx - R * 0.35, cy - R * 0.1, R * 0.1, cx, cy + R * 0.2, R * 1.1);
    gr.addColorStop(0, '#4c5880'); gr.addColorStop(0.6, '#232a45'); gr.addColorStop(1, '#0e1222');
    g.fillStyle = gr; g.beginPath(); g.ellipse(cx, cy + R * 0.18, R, R * 0.82, 0, 0, 7); g.fill();
    g.fillStyle = '#56628a'; g.beginPath(); g.ellipse(cx, cy - R * 0.28, R * 1.04, R * 0.36, 0, 0, 7); g.fill();
    g.strokeStyle = '#141a30'; g.lineWidth = 2; g.stroke();
    // 汤
    g.save();
    g.shadowColor = '#5ff6ff'; g.shadowBlur = R * (0.4 + 0.15 * Math.sin(t * 2) + hover * 0.3 + flash * 0.8);
    gr = g.createRadialGradient(cx - R * 0.2, cy - R * 0.35, R * 0.05, cx, cy - R * 0.28, R * 0.95);
    gr.addColorStop(0, '#e8fffd'); gr.addColorStop(0.45, `rgb(${110 + flash * 120},${235},${240})`); gr.addColorStop(1, '#1d8fb2');
    g.fillStyle = gr; g.beginPath(); g.ellipse(cx, cy - R * 0.28, R * 0.88, R * 0.27, 0, 0, 7); g.fill();
    g.restore();
    // 气泡
    g.save();
    g.beginPath(); g.ellipse(cx, cy - R * 0.28, R * 0.86, R * 0.26, 0, 0, 7); g.clip();
    for (let k = 0; k < 9; k++) {
      const life = (t * (0.5 + (k % 3) * 0.2) + k * 0.37) % 1;
      const ang = k * 2.4, rad = 0.2 + (k * 0.13) % 0.6;
      const bx = cx + Math.cos(ang) * R * 0.75 * rad, by = cy - R * 0.28 + Math.sin(ang) * R * 0.22 * rad;
      g.strokeStyle = `rgba(255,255,255,${0.7 * (1 - life)})`; g.lineWidth = 1.2;
      g.beginPath(); g.arc(bx, by, R * 0.03 + life * R * 0.07, 0, 7); g.stroke();
    }
    g.restore();
    // 蒸汽
    g.save(); g.globalCompositeOperation = 'lighter';
    for (let k = 0; k < 3; k++) {
      const life = (t * 0.25 + k / 3) % 1;
      const sx = cx + Math.sin(t + k * 2) * R * 0.3, sy = cy - R * 0.4 - life * R * 1.4;
      const sg = g.createRadialGradient(sx, sy, 0, sx, sy, R * (0.3 + life * 0.4));
      sg.addColorStop(0, `rgba(140,255,240,${0.12 * (1 - life)})`); sg.addColorStop(1, 'rgba(140,255,240,0)');
      g.fillStyle = sg; g.beginPath(); g.arc(sx, sy, R * (0.3 + life * 0.4), 0, 7); g.fill();
    }
    g.restore();
    // 铭牌与计数
    const py = cy + R * 0.32;
    g.fillStyle = '#231a40'; g.beginPath(); g.ellipse(cx, py, R * 0.36, R * 0.25, 0, 0, 7); g.fill();
    g.lineWidth = 2; g.strokeStyle = '#8a6bd6'; g.stroke();
    g.save();
    g.fillStyle = '#e7a6ff'; g.shadowColor = '#c44dff'; g.shadowBlur = 12;
    g.font = `800 ${R * 0.3}px Menlo, Consolas, monospace`; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(String(S.potShown), cx, py + 1);
    g.restore();
    S.potFlash = Math.max(0, S.potFlash - 0.03);
  }

  function drawMascot(g, t) {
    const { x, s } = L.mascot;
    const y = L.mascot.y + Math.sin(t * 2) * s * 0.04;
    let mood = S.mascotMood;
    if (now() > S.mascotUntil) mood = S.aiBusy ? 'think' : 'idle';
    g.fillStyle = 'rgba(0,0,0,.4)'; g.beginPath(); g.ellipse(x + s * 0.08, L.mascot.y + s * 0.62, s * 0.5, s * 0.14, 0, 0, 7); g.fill();
    // 翅膀
    g.fillStyle = '#2b5e33';
    for (const d of [-1, 1]) {
      const fl = Math.sin(t * 3) * 0.1;
      g.beginPath(); g.moveTo(x + d * s * 0.2, y + s * 0.1);
      g.quadraticCurveTo(x + d * s * 0.85, y - s * (0.55 + fl), x + d * s * 0.95, y - s * 0.1);
      g.quadraticCurveTo(x + d * s * 0.75, y - s * 0.05, x + d * s * 0.7, y + s * 0.1);
      g.quadraticCurveTo(x + d * s * 0.55, y + 0, x + d * s * 0.45, y + s * 0.2);
      g.closePath(); g.fill();
    }
    // 身体
    g.fillStyle = '#3f8f35'; g.beginPath(); g.ellipse(x, y + s * 0.38, s * 0.3, s * 0.22, 0, 0, 7); g.fill();
    // 头
    const hg = g.createRadialGradient(x - s * 0.15, y - s * 0.2, s * 0.05, x, y, s * 0.55);
    hg.addColorStop(0, '#b6f080'); hg.addColorStop(1, '#3d8a32');
    g.fillStyle = hg; g.beginPath(); g.ellipse(x, y - s * 0.05, s * 0.45, s * 0.42, 0, 0, 7); g.fill();
    // 脸部触须
    g.strokeStyle = '#4b9c3b'; g.lineCap = 'round'; g.lineWidth = s * 0.09;
    for (let k = 0; k < 4; k++) {
      const bx = x + (k - 1.5) * s * 0.14, by = y + s * 0.15;
      const sw = Math.sin(t * 2.5 + k) * s * 0.08;
      g.beginPath(); g.moveTo(bx, by); g.quadraticCurveTo(bx + sw, by + s * 0.2, bx + sw * 1.6 + (k - 1.5) * s * 0.05, by + s * 0.34); g.stroke();
    }
    if (mood === 'blush' || mood === 'sad') {
      g.fillStyle = 'rgba(255,110,150,.6)';
      for (const d of [-1, 1]) { g.beginPath(); g.ellipse(x + d * s * 0.28, y + s * 0.02, s * 0.09, s * 0.05, 0, 0, 7); g.fill(); }
    }
    // 眼睛
    const ey = y - s * 0.12, ex = s * 0.17;
    g.fillStyle = '#10140c'; g.strokeStyle = '#10140c'; g.lineWidth = s * 0.06;
    const blink = (t % 5.3) < 0.14;
    for (const d of [-1, 1]) {
      const X = x + d * ex;
      if (mood === 'happy') { g.beginPath(); g.arc(X, ey + s * 0.04, s * 0.08, Math.PI * 1.1, Math.PI * 1.9); g.stroke(); }
      else if (mood === 'sad') {
        g.beginPath(); g.moveTo(X - s * 0.08, ey); g.lineTo(X + s * 0.08, ey); g.stroke();
        g.fillStyle = 'rgba(120,200,255,.9)'; g.beginPath(); g.ellipse(X, ey + s * 0.08 + (t % 1) * s * 0.12, s * 0.03, s * 0.05, 0, 0, 7); g.fill(); g.fillStyle = '#10140c';
      } else if (blink) { g.beginPath(); g.moveTo(X - s * 0.08, ey); g.lineTo(X + s * 0.08, ey); g.stroke(); }
      else {
        g.beginPath(); g.ellipse(X, ey, s * 0.085, s * 0.11, 0, 0, 7); g.fill();
        g.fillStyle = mood === 'angry' ? '#ff5050' : '#fff';
        g.beginPath(); g.arc(X - s * 0.025, ey - s * 0.04, s * 0.03, 0, 7); g.fill(); g.fillStyle = '#10140c';
        if (mood === 'smug' || mood === 'think') { g.fillStyle = '#5aa846'; g.fillRect(X - s * 0.1, ey - s * 0.13, s * 0.2, s * 0.08); g.fillStyle = '#10140c'; }
        if (mood === 'angry') { g.beginPath(); g.moveTo(X - d * s * 0.1, ey - s * 0.2); g.lineTo(X + d * s * 0.08, ey - s * 0.12); g.stroke(); }
      }
    }
    // 思考泡泡
    if (mood === 'think') {
      g.fillStyle = 'rgba(230,250,255,.85)';
      g.beginPath(); g.arc(x + s * 0.5, y - s * 0.5, s * 0.06, 0, 7); g.fill();
      g.beginPath(); g.arc(x + s * 0.65, y - s * 0.68, s * 0.09, 0, 7); g.fill();
      g.beginPath(); g.ellipse(x + s * 0.9, y - s * 0.95, s * 0.3, s * 0.18, 0, 0, 7); g.fill();
      g.fillStyle = '#334';
      for (let k = 0; k < 3; k++) {
        const a = (Math.sin(t * 6 - k) + 1) / 2;
        g.globalAlpha = 0.4 + a * 0.6;
        g.beginPath(); g.arc(x + s * (0.78 + k * 0.12), y - s * 0.95, s * 0.035, 0, 7); g.fill();
      }
      g.globalAlpha = 1;
    }
  }

  // ================================================================
  // 粒子：飞向火锅的棋子、星星
  // ================================================================
  function flyStones(from, count, color, delay = 0) {
    const { cx, cy, R } = L.pot;
    for (let k = 0; k < count; k++) {
      const f = from[k % from.length];
      S.particles.push({
        kind: 'stone', sx: f.x, sy: f.y, ex: cx + (Math.random() - 0.5) * R * 0.6, ey: cy - R * 0.28,
        t0: now() + delay + k * 90, dur: 900 + Math.random() * 250, color: f.color || color,
      });
    }
  }
  // 棋子入账：计数先停在旧值，等棋子飞进锅里再一颗颗加上去
  function gainStones(n, from, delay) {
    S.potShown = Math.min(S.potShown, save.stones);
    save.stones += n; persist();
    flyStones(from, n, 1, delay);
  }
  function sparkle(x, y, n, col) {
    for (let k = 0; k < n; k++) {
      const a = Math.random() * Math.PI * 2, v = 40 + Math.random() * 120;
      S.particles.push({ kind: 'spark', x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 40, t0: now(), dur: 600 + Math.random() * 500, col: col || '#8ff7e8' });
    }
  }
  function drawParticles(g, t, dt) {
    const tn = now();
    let stonesFlying = 0;
    S.particles = S.particles.filter(p => {
      const k = (tn - p.t0) / p.dur;
      if (p.kind === 'stone') {
        stonesFlying++;
        if (k < 0) return true;
        if (k >= 1) {
          S.potShown = Math.min(save.stones, S.potShown + 1); S.potFlash = 1;
          sparkle(p.ex, p.ey, 4, '#9ff8ec');
          Snd.play('bubble');
          return false;
        }
        const e = easeInOutQuad(k);
        const x = lerp(p.sx, p.ex, e), y = lerp(p.sy, p.ey, e) - Math.sin(Math.PI * k) * L.S * 0.3;
        drawStoneFull(g, x, y, L.cell * 0.36 * (1 - k * 0.4), p.color, 'win', t, 1);
        return true;
      }
      if (k >= 1) return false;
      p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 220 * dt;
      g.fillStyle = p.col; g.globalAlpha = 1 - k;
      g.beginPath(); g.arc(p.x, p.y, 2.5 * (1 - k) + 0.8, 0, 7); g.fill();
      g.globalAlpha = 1;
      return true;
    });
    if (!stonesFlying) S.potShown = save.stones;
    // 消失中的棋子
    S.fading = S.fading.filter(f => {
      const k = (tn - f.t0) / 650;
      if (k < 0) return true;
      if (k >= 1) return false;
      const p = cellPos(f.i);
      drawStoneFull(g, p.x, p.y - k * L.cell * 0.4, L.cell * 0.43 * (1 - k * 0.8), f.color, 'lose', t, 1 - k);
      return true;
    });
  }
  const easeInOutQuad = t => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);

  // ================================================================
  // 规则与局面分析
  // ================================================================
  const DIRS = [[1, 0], [0, 1], [1, 1], [1, -1]];
  function findFive(b, i) {
    const c = b[i], x = i % N, y = (i / N) | 0;
    for (const [dx, dy] of DIRS) {
      const line = [i];
      for (let k = 1; k < N; k++) { const nx = x + dx * k, ny = y + dy * k; if (nx < 0 || ny < 0 || nx >= N || ny >= N || b[ny * N + nx] !== c) break; line.push(ny * N + nx); }
      for (let k = 1; k < N; k++) { const nx = x - dx * k, ny = y - dy * k; if (nx < 0 || ny < 0 || nx >= N || ny >= N || b[ny * N + nx] !== c) break; line.unshift(ny * N + nx); }
      if (line.length >= 5) return line;
    }
    return null;
  }

  // 给每颗棋子算表情：成形（三、四）得意；被对手威胁时紧张
  function analyze() {
    const b = S.board, mood = new Array(N * N).fill(null);
    const threat = { 1: { four: new Set(), three: new Set() }, 2: { four: new Set(), three: new Set() } };
    const inB = (x, y) => x >= 0 && y >= 0 && x < N && y < N;
    for (const p of [1, 2]) {
      for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) for (const [dx, dy] of DIRS) {
        const ex = x + dx * 4, ey = y + dy * 4;
        if (!inB(ex, ey)) continue;
        let mine = 0, opp = 0; const cells = [];
        for (let k = 0; k < 5; k++) { const v = b[(y + dy * k) * N + x + dx * k]; cells.push((y + dy * k) * N + x + dx * k); if (v === p) mine++; else if (v) opp++; }
        if (opp) continue;
        if (mine === 4) {
          cells.forEach(c => { if (b[c] === p) mood[c] = 'smug'; else threat[p].four.add(c); });
        } else if (mine === 3) {
          const bx = x - dx, by = y - dy, ax = ex + dx, ay = ey + dy;
          if (inB(bx, by) && inB(ax, ay) && !b[by * N + bx] && !b[ay * N + ax] && !b[cells[0]] + !b[cells[4]] >= 1) {
            cells.forEach(c => { if (b[c] === p) { if (!mood[c]) mood[c] = 'smug'; } else threat[p].three.add(c); });
          }
        }
      }
    }
    if (!S.over && S.mode !== 'menu') {
      const q = S.turn, o = 3 - q;
      const pts = threat[o].four.size ? threat[o].four : threat[o].three;
      if (pts.size) {
        for (let i = 0; i < N * N; i++) {
          if (b[i] !== q) continue;
          const x = i % N, y = (i / N) | 0;
          for (const c of pts) {
            if (Math.max(Math.abs(c % N - x), Math.abs(((c / N) | 0) - y)) <= 2) { mood[i] = 'nervous'; break; }
          }
        }
      }
    }
    if (S.over && S.winner) {
      for (let i = 0; i < N * N; i++) if (b[i]) mood[i] = b[i] === S.winner ? 'win' : 'lose';
    }
    S.mood = mood; S.threat = threat;
    return threat;
  }

  // ================================================================
  // 对话
  // ================================================================
  let typeTimer = null;
  function say(html, title = '克苏鲁·楚楚楚') {
    $('dialogTitle').textContent = title;
    const el = $('dialogText');
    clearInterval(typeTimer);
    const parts = html.split(/(<[^>]+>)/).filter(Boolean);
    let pi = 0, ci = 0, out = '';
    el.innerHTML = '<span class="cursor"></span>';
    typeTimer = setInterval(() => {
      if (pi >= parts.length) { clearInterval(typeTimer); el.innerHTML = out; return; }
      const part = parts[pi];
      if (part[0] === '<') { out += part; pi++; }
      else { out += part[ci++]; if (ci >= part.length) { pi++; ci = 0; } }
      el.innerHTML = out + '<span class="cursor"></span>';
    }, 26);
  }
  function mascot(mood, ms = 2500) { S.mascotMood = mood; S.mascotUntil = now() + ms; }
  let toastTimer = null;
  function toast(msg) {
    const t = $('toast'); t.textContent = msg; t.classList.add('show');
    clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('show'), 2200);
  }

  // ================================================================
  // 对局流程
  // ================================================================
  function resetBoard() {
    S.board = new Int8Array(N * N); S.moves = []; S.vis = {}; S.turn = 1;
    S.over = false; S.winner = 0; S.winLine = null; S.ghosts = []; S.hint = null;
    S.aiBusy = false; S.gameId++;
    for (const tt of tentacles) if (tt.mode !== 'idle') { tt.mode = 'retract'; tt.carry = 0; tt.onArrive = null; }
    analyze();
  }

  function putStone(i, color, delay = 0) {
    S.board[i] = color;
    S.vis[i] = { born: now() + delay, phase: Math.random() * 10 };
  }

  function showMenu() {
    S.mode = 'menu';
    resetBoard();
    $('menu').classList.remove('hidden');
    $('setup').classList.add('hidden');
    updateBook();
  }

  function showSetup() {
    $('menu').classList.add('hidden');
    $('setup').classList.remove('hidden');
    const lv = $('levels'); lv.innerHTML = '';
    LEVELS.forEach((l, k) => {
      const b = document.createElement('button');
      b.className = 'tag' + (S.setupLevel === k + 1 ? ' active' : '');
      const w = save.wins[k + 1] ? ` · 胜${save.wins[k + 1]}` : '';
      b.innerHTML = `${'★'.repeat(k + 1)}<br>${l.name}<small>${l.sub}${w}</small>`;
      b.onclick = () => { S.setupLevel = k + 1; Snd.play('click'); showSetup(); };
      lv.appendChild(b);
    });
    document.querySelectorAll('.side').forEach(b => b.classList.toggle('active', +b.dataset.side === S.setupSide));
    say(`选一个难度吧。<b>${LEVELS[S.setupLevel - 1].name}</b>——${LEVELS[S.setupLevel - 1].sub}。`);
  }

  function startAI() {
    $('setup').classList.add('hidden'); $('menu').classList.add('hidden');
    resetBoard();
    S.mode = 'ai'; S.level = S.setupLevel; S.human = S.setupSide;
    save.games++; persist();
    say(pick(LINES.aiStart) + `<br><span style="color:#d7b8ff">你执${S.human === 1 ? '黑先行' : '白后行'}，对手：${LEVELS[S.level - 1].name}</span>`);
    mascot('smug');
    updateBook();
    if (S.human === 2) setTimeout(aiMove, 500);
  }

  function startLocal() {
    $('setup').classList.add('hidden'); $('menu').classList.add('hidden');
    resetBoard();
    S.mode = 'local';
    say(LINES.local);
    updateBook();
  }

  function aiColor() { return 3 - S.human; }

  function aiMove() {
    if (S.over || S.mode !== 'ai') return;
    S.aiBusy = true;
    const gid = S.gameId, color = aiColor(), t0 = now();
    // 选离棋盘中心最近的那根触手先“犹豫”一下
    const th = tentacles[(Math.random() * 3) | 0];
    th.think();
    Snd.play('think');
    updateBook();
    Brain.ask(S.board, color, S.level, move => {
      if (gid !== S.gameId) return;
      if (move < 0 || S.board[move]) { S.aiBusy = false; updateBook(); return; }
      const wait = Math.max(0, 450 - (now() - t0));
      setTimeout(() => {
        if (gid !== S.gameId) return;
        const target = cellPos(move);
        let best = th, bd = Infinity;
        for (const tt of tentacles) {
          const d = Math.hypot(tt.rest.x - target.x, tt.rest.y - target.y) + (tt === th ? -L.S * 0.15 : 0);
          if (d < bd) { bd = d; best = tt; }
        }
        if (best !== th) th.mode = 'retract';
        best.reach(target, color, () => {
          if (gid !== S.gameId) return;
          S.aiBusy = false;
          play(move, color);
        });
      }, wait);
    });
  }

  function play(i, color) {
    const before = S.threat;
    putStone(i, color);
    S.moves.push({ i, c: color });
    Snd.play('plop', color);
    S.hint = null;
    const line = findFive(S.board, i);
    if (line) { endGame(color, line); return; }
    if (S.moves.length >= N * N) { endGame(0, null); return; }
    S.turn = 3 - color;
    const th = analyze();
    react(color, before, th);
    updateBook();
    if (S.mode === 'ai' && S.turn === aiColor()) setTimeout(aiMove, 200);
  }

  function react(color, before, th) {
    if (S.mode !== 'ai') return;
    const o = 3 - color;
    if (color === S.human) {
      if (th[color].four.size) { say(pick(LINES.humanFour)); mascot('angry'); }
      else if (th[color].three.size > (before ? before[color].three.size : 0) && Math.random() < 0.6) { say(pick(LINES.humanThree)); mascot('angry', 1500); }
      else if (before && (before[o].four.size || before[o].three.size) && !th[o].four.size && !th[o].three.size) { say(pick(LINES.humanBlock)); mascot('sad', 1500); }
    } else {
      if (th[color].four.size) { say(pick(LINES.aiFour)); mascot('smug'); }
      else if (th[color].three.size && Math.random() < 0.5) { say(pick(LINES.aiThree)); mascot('smug'); }
      else if (Math.random() < 0.18) say(pick(LINES.aiIdle));
    }
  }

  function endGame(winner, line) {
    S.over = true; S.winner = winner; S.winLine = line;
    analyze();
    updateBook();
    const from = (line || []).map(i => ({ ...cellPos(i), color: winner }));
    if (S.mode === 'ai') {
      if (winner === S.human) {
        const reward = 5 + S.level * 3;
        save.wins[S.level] = (save.wins[S.level] || 0) + 1;
        gainStones(reward, from, 700);
        Snd.play('win'); mascot('sad', 6000);
        say(pick(LINES.humanWin) + `<br><span style="color:#e7a6ff">+${reward} 颗棋子飞进了火锅</span>`);
      } else if (winner) {
        gainStones(1, from.slice(0, 1), 900);
        Snd.play('lose'); mascot('happy', 6000);
        say(pick(LINES.aiWin));
      } else {
        gainStones(2, [{ x: L.bx, y: L.by }], 300);
        say(LINES.draw[0]);
      }
    } else if (S.mode === 'local') {
      if (winner) {
        gainStones(2, from, 700);
        Snd.play('win'); mascot('happy', 4000);
        say(`${winner === 1 ? '黑' : '白'}棋胜！连珠完成——哼，看得我都手痒了。<br><span style="color:#e7a6ff">观战费 +2 颗棋子</span>`);
      } else say(LINES.draw[0]);
    }
  }

  function undo() {
    if (S.aiBusy || !S.moves.length) return;
    if (S.mode === 'ai') {
      if (!S.moves.some(m => m.c === S.human)) return;
      while (S.moves.length) {
        const m = S.moves.pop();
        S.board[m.i] = 0; delete S.vis[m.i];
        S.fading.push({ i: m.i, color: m.c, t0: now() });
        if (m.c === S.human) break;
      }
      S.turn = S.human;
      say(pick(LINES.undo)); mascot('smug', 1500);
    } else if (S.mode === 'local') {
      const m = S.moves.pop();
      S.board[m.i] = 0; delete S.vis[m.i];
      S.fading.push({ i: m.i, color: m.c, t0: now() });
      S.turn = m.c;
    } else return;
    Snd.play('vanish');
    S.over = false; S.winner = 0; S.winLine = null; S.hint = null;
    analyze(); updateBook();
  }

  function hint() {
    if (S.mode !== 'ai' && S.mode !== 'local') return;
    if (S.over || S.aiBusy) return;
    if (S.mode === 'ai' && S.turn !== S.human) return;
    if (save.stones < 2) { say('火锅里的棋子不够啦！先去赢几局再来求我。'); mascot('smug'); return; }
    save.stones -= 2; persist(); S.potShown = save.stones;
    const gid = S.gameId, color = S.turn;
    mascot('think', 1200);
    Brain.ask(S.board, color, 5, move => {
      if (gid !== S.gameId || move < 0) return;
      S.hint = { i: move, color, until: now() + 5000 };
      say(pick(LINES.hint) + `<br><span style="color:#d7b8ff">建议落点：${coordName(move)}</span>`);
    });
  }

  function restart() {
    if (S.mode === 'ai') startAI();
    else if (S.mode === 'local') startLocal();
    else if (S.mode === 'tutorial') loadLesson(S.lesson);
  }

  // ================================================================
  // 教学
  // ================================================================
  function loadLesson(k) {
    k = clamp(k, 0, LESSONS.length - 1);
    $('menu').classList.add('hidden'); $('setup').classList.add('hidden');
    resetBoard();
    S.mode = 'tutorial'; S.lesson = k; S.lessonDone = false;
    const les = LESSONS[k];
    let d = 0;
    for (const c of les.b) putStone(P(c), 1, (d += 70));
    for (const c of les.w) putStone(P(c), 2, (d += 70));
    S.turn = 1;
    S.ghosts = les.ghosts.map(P);
    analyze();
    say(les.text, `基础 · 第 ${k + 1} 课 · ${les.name}`);
    updateBook();
  }

  function lessonClick(i) {
    if (S.lessonDone) { if (S.lesson < LESSONS.length - 1) loadLesson(S.lesson + 1); return; }
    if (S.board[i]) return;
    if (S.ghosts.includes(i)) {
      putStone(i, 1);
      S.moves.push({ i, c: 1 });
      Snd.play('plop', 1);
      S.lessonDone = true; S.ghosts = [];
      const line = findFive(S.board, i);
      if (line) { S.winLine = line; S.over = true; S.winner = 1; }
      S.turn = 2;
      analyze();
      const les = LESSONS[S.lesson];
      let msg = `${pick(LINES.tutRight)}<br>${les.ok}`;
      if (!save.lessons.includes(S.lesson)) {
        save.lessons.push(S.lesson);
        msg += '<br><span style="color:#e7a6ff">首次通关 +3 颗棋子</span>';
        gainStones(3, [{ ...cellPos(i), color: 1 }], 500);
      }
      if (S.lesson < LESSONS.length - 1) msg += '<br><span style="color:#d7b8ff">按 D 或点击棋盘进入下一题</span>';
      say(msg, `基础 · 第 ${S.lesson + 1} 课 · 完成`);
      mascot('happy');
      sparkle(cellPos(i).x, cellPos(i).y, 18, '#ffd86b');
      updateBook();
    } else {
      // 下错的棋子会消失
      S.fading.push({ i, color: 1, t0: now() + 250 });
      putStone(i, 1);
      setTimeout(() => { if (S.board[i] === 1 && S.mode === 'tutorial' && !S.lessonDone) { S.board[i] = 0; delete S.vis[i]; analyze(); } }, 250);
      Snd.play('vanish');
      say(pick(LINES.tutWrong), `基础 · 第 ${S.lesson + 1} 课 · ${LESSONS[S.lesson].name}`);
      mascot('angry', 1500);
    }
  }

  // ================================================================
  // 书（右下角）
  // ================================================================
  function keyBtn(k, label, fn, disabled) {
    const b = document.createElement('button');
    b.className = 'key'; b.innerHTML = `<b>[${k}]</b>${label}`;
    b.disabled = !!disabled;
    b.onclick = () => { Snd.play('click'); fn(); };
    return b;
  }
  function updateBook() {
    const title = $('bookTitle'), sub = $('bookSub'), prog = $('bookProgress'), keys = $('bookKeys');
    keys.innerHTML = '';
    const turnHTML = c => `<span class="turn"><span class="dot ${c === 1 ? 'b' : 'w'}"></span>${c === 1 ? '黑' : '白'}方落子</span>`;
    if (S.mode === 'menu') {
      title.textContent = '克苏鲁五子棋';
      sub.textContent = 'Cthulhu Gomoku';
      prog.innerHTML = `火锅里有 ${save.stones} 颗棋子`;
      keys.append(keyBtn('1', '跟我下', showSetup), keyBtn('2', '自己玩', startLocal), keyBtn('3', '教学', () => loadLesson(firstUnfinished())),
        keyBtn('4', '典藏', () => openCollection('term')), keyBtn('5', '火锅', openGacha));
    } else if (S.mode === 'ai') {
      title.textContent = LEVELS[S.level - 1].name;
      sub.textContent = `${'★'.repeat(S.level)} · 你执${S.human === 1 ? '黑' : '白'}`;
      prog.innerHTML = S.over ? (S.winner === S.human ? '你赢了！' : S.winner ? '克苏鲁胜' : '平局')
        : (S.aiBusy ? '触手思考中……' : turnHTML(S.turn)) + `<br>第 ${S.moves.length + 1} 手`;
      keys.append(keyBtn('Z', '悔棋', undo, S.aiBusy || !S.moves.some(m => m.c === S.human)),
        keyBtn('H', '提示（2子）', hint, S.over || S.aiBusy),
        keyBtn('R', S.over ? '再来一局' : '重开', restart),
        keyBtn('Esc', '返回', showMenu));
    } else if (S.mode === 'local') {
      title.textContent = '自己玩';
      sub.textContent = '同屏对弈 · 黑先';
      prog.innerHTML = S.over ? (S.winner ? `${S.winner === 1 ? '黑' : '白'}棋胜` : '平局') : turnHTML(S.turn) + `<br>第 ${S.moves.length + 1} 手`;
      keys.append(keyBtn('Z', '悔棋', undo, !S.moves.length), keyBtn('H', '提示（2子）', hint, S.over),
        keyBtn('R', S.over ? '再来一局' : '重开', restart), keyBtn('Esc', '返回', showMenu));
    } else if (S.mode === 'tutorial') {
      title.textContent = '基础';
      sub.textContent = LESSONS[S.lesson].name + (save.lessons.includes(S.lesson) ? ' ✓' : '');
      prog.textContent = `${S.lesson + 1}/${LESSONS.length}`;
      keys.append(keyBtn('Esc', '返回', showMenu), keyBtn('A', '上一题', () => loadLesson(S.lesson - 1), S.lesson === 0),
        keyBtn('D', '下一题', () => loadLesson(S.lesson + 1), S.lesson === LESSONS.length - 1),
        keyBtn('Q', '到最前', () => loadLesson(0)), keyBtn('E', '到最后', () => loadLesson(LESSONS.length - 1)));
      if (S.lessonDone && S.lesson === LESSONS.length - 1) keys.append(keyBtn('↵', '开始实战', () => { S.setupLevel = 1; showSetup(); }));
    }
  }
  function firstUnfinished() { for (let k = 0; k < LESSONS.length; k++) if (!save.lessons.includes(k)) return k; return 0; }

  // ================================================================
  // 卡片 / 弹窗
  // ================================================================
  function showModal(html) { $('modalBody').innerHTML = html; $('modal').classList.remove('hidden'); }
  function closeModal() { $('modal').classList.add('hidden'); }

  function drawCardArt(cv, item) {
    const w = cv.width = 150, h = cv.height = 116, g = cv.getContext('2d');
    if (item.kind === 'term') {
      const n = 7, c = 15, ox = (w - c * (n - 1)) / 2, oy = (h - c * (n - 1)) / 2;
      g.strokeStyle = 'rgba(60,30,10,.8)'; g.lineWidth = 1;
      for (let k = 0; k < n; k++) {
        g.beginPath(); g.moveTo(ox + k * c, oy); g.lineTo(ox + k * c, oy + c * (n - 1)); g.stroke();
        g.beginPath(); g.moveTo(ox, oy + k * c); g.lineTo(ox + c * (n - 1), oy + k * c); g.stroke();
      }
      const mark = (list, color) => (list || []).forEach(([x, y]) => {
        g.fillStyle = STONE[color].fill; g.beginPath(); g.arc(ox + x * c, oy + y * c, c * 0.43, 0, 7); g.fill();
        g.strokeStyle = 'rgba(0,0,0,.4)'; g.stroke();
        g.fillStyle = STONE[color].face;
        g.beginPath(); g.arc(ox + x * c - 2, oy + y * c - 0.5, 0.9, 0, 7); g.arc(ox + x * c + 2, oy + y * c - 0.5, 0.9, 0, 7); g.fill();
      });
      mark(item.b, 1); mark(item.w, 2);
      (item.m || []).forEach(([x, y]) => {
        g.strokeStyle = '#d23a5a'; g.lineWidth = 2;
        g.beginPath(); g.arc(ox + x * c, oy + y * c, c * 0.36, 0, 7); g.stroke();
      });
    } else if (item.kind === 'record') {
      const cx = w / 2, cy = h / 2, r = 50;
      const gr = g.createRadialGradient(cx - 15, cy - 15, 5, cx, cy, r);
      gr.addColorStop(0, '#3a3a44'); gr.addColorStop(1, '#0c0c10');
      g.fillStyle = gr; g.beginPath(); g.arc(cx, cy, r, 0, 7); g.fill();
      g.strokeStyle = 'rgba(255,255,255,.07)';
      for (let k = 22; k < r; k += 3) { g.beginPath(); g.arc(cx, cy, k, 0, 7); g.stroke(); }
      g.fillStyle = item.color; g.beginPath(); g.arc(cx, cy, 18, 0, 7); g.fill();
      g.fillStyle = '#f2e6c8'; g.font = '14px serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('🐙', cx, cy);
    } else {
      g.fillStyle = '#2b3fa8';
      g.beginPath(); g.moveTo(20, 10); g.quadraticCurveTo(110, 20, 128, 100); g.lineTo(104, 106); g.quadraticCurveTo(90, 44, 16, 40); g.closePath(); g.fill();
      g.save(); g.clip();
      g.fillStyle = sockPattern(item.id); g.fillRect(0, 0, w, h);
      g.restore();
      g.strokeStyle = item.band; g.lineWidth = 5;
      g.beginPath(); g.moveTo(20, 10); g.lineTo(16, 40); g.stroke();
      g.fillStyle = '#4fd8cf';
      for (let k = 0; k < 4; k++) { g.beginPath(); g.arc(30 + k * 20, 44 + k * 13, 4, 0, 7); g.fill(); }
    }
  }

  function makeCard(item, count) {
    const el = document.createElement('div');
    const owned = count > 0;
    el.className = 'card' + (owned ? '' : ' locked');
    const crest = { term: 'TERM · 术语', record: 'RECORD · 唱片', stocking: 'STOCKING · 丝袜' }[item.kind];
    el.innerHTML = `<div class="crest">${crest}</div><div class="art">${owned ? '<canvas></canvas>' : '<span>🐙</span>'}</div>
      <div class="name">${owned ? item.name : '？？？'}</div>
      <div class="desc">${owned ? item.desc : '还没有从火锅里捞到。'}</div>
      ${count > 1 ? `<div class="count">×${count}</div>` : ''}`;
    if (owned) drawCardArt(el.querySelector('canvas'), item);
    if (owned && item.kind === 'stocking') {
      const b = document.createElement('button');
      const on = save.stocking === item.id;
      b.className = 'equip' + (on ? ' on' : '');
      b.textContent = on ? '脱下' : '给触手穿上';
      b.onclick = () => {
        save.stocking = on ? null : item.id; persist();
        if (!on) { say(pick(LINES.petSock) + '<br><span style="color:#d7b8ff">按住触手上下拖动可以调整丝袜长度</span>'); mascot('blush', 3000); }
        openCollection('stocking');
      };
      el.appendChild(b);
    }
    if (owned && item.kind === 'record') {
      const b = document.createElement('button');
      const on = save.record === item.id && save.music;
      b.className = 'equip' + (on ? ' on' : '');
      b.textContent = on ? '播放中' : '放到留声机上';
      b.onclick = () => { save.record = item.id; save.music = true; persist(); Snd.startMusic(); syncTokens(); openCollection('record'); };
      el.appendChild(b);
    }
    return el;
  }

  function openCollection(tab) {
    const list = { term: TERMS, record: RECORDS, stocking: STOCKINGS }[tab];
    const total = TERMS.length + RECORDS.length + STOCKINGS.length;
    const got = Object.keys(save.owned).filter(k => save.owned[k] > 0).length;
    showModal(`<h2>典藏</h2><div class="sub">已收集 ${got} / ${total} · 火锅里有 ${save.stones} 颗棋子</div>
      <div class="tabs">
        <button data-tab="term" class="${tab === 'term' ? 'active' : ''}">术语卡</button>
        <button data-tab="record" class="${tab === 'record' ? 'active' : ''}">黑胶唱片</button>
        <button data-tab="stocking" class="${tab === 'stocking' ? 'active' : ''}">触手丝袜</button>
        <button data-tab="gacha">去火锅抽盲盒 →</button>
      </div><div class="cards" id="cardGrid"></div>`);
    const grid = $('cardGrid');
    list.forEach(it => grid.appendChild(makeCard(ITEM[it.id], save.owned[it.id] || 0)));
    document.querySelectorAll('.tabs button').forEach(b => b.onclick = () => {
      Snd.play('click');
      if (b.dataset.tab === 'gacha') openGacha(); else openCollection(b.dataset.tab);
    });
  }

  function rollItem() {
    const r = Math.random();
    if (r < 0.62) return pick(TERMS).id;
    if (r < 0.86) return pick(STOCKINGS).id;
    return pick(RECORDS.slice(1)).id;
  }

  function openGacha() {
    showModal(`<h2>深渊火锅</h2><div class="sub">投入 20 颗棋子，从咕嘟冒泡的汤里捞一个盲盒</div>
      <div class="gacha">
        <div class="pot-count" id="potCount">${save.stones}<small>锅里的棋子</small></div>
        <div class="reveal" id="reveal"><div style="color:#7c7aa0">……汤面平静，等待投喂……</div></div>
        <button class="big-btn" id="pullBtn" ${save.stones < 20 ? 'disabled' : ''}>投入 20 颗 · 抽盲盒</button>
        <div class="tabs"><button id="toColl">查看典藏</button></div>
      </div>`);
    $('toColl').onclick = () => openCollection('term');
    $('pullBtn').onclick = () => {
      if (save.stones < 20) return;
      save.stones -= 20; S.potShown = save.stones; S.potFlash = 1;
      Snd.play('splash');
      const id = rollItem(), item = ITEM[id];
      const dup = (save.owned[id] || 0) > 0;
      save.owned[id] = (save.owned[id] || 0) + 1;
      if (dup) save.stones += 5;
      persist();
      $('reveal').innerHTML = '<div style="font-size:42px;animation:fadein .3s">🫧</div>';
      $('pullBtn').disabled = true;
      setTimeout(() => {
        Snd.play('gacha');
        const box = $('reveal'); if (!box) return;
        box.innerHTML = '';
        const wrap = document.createElement('div');
        wrap.appendChild(makeCard(item, save.owned[id]));
        const rar = document.createElement('div'); rar.className = 'rarity';
        rar.textContent = (item.kind === 'term' ? '★ 术语卡' : item.kind === 'stocking' ? '★★ 触手丝袜' : '★★★ 黑胶唱片') + (dup ? ' · 重复，退还 5 颗' : ' · NEW!');
        wrap.appendChild(rar);
        box.appendChild(wrap);
        $('potCount').innerHTML = `${save.stones}<small>锅里的棋子</small>`;
        $('pullBtn').disabled = save.stones < 20;
        S.potShown = save.stones;
        say(dup ? pick(LINES.gachaDup) : pick(LINES.gachaNew) + `<br>获得了「${item.name}」`);
        mascot(dup ? 'smug' : 'happy');
        updateBook();
      }, 700);
    };
  }

  function openHelp() {
    showModal(`<h2>规则与操作</h2><div class="rules">
      <h3>五子棋规则</h3>
      黑棋先行，双方轮流在 15×15 棋盘的交叉点上落子。任意一方在横、竖或斜线上连成<b>五子或以上</b>即获胜（自由规则，无禁手）。棋盘下满仍未分胜负则为平局。
      <h3>软萌棋子</h3>
      同色棋子横竖相邻会黏成一条，斜向相邻会拉出细线。棋子摆出三连、四连时会<b>得意</b>；当对手有冲四或活三而轮到你应对时，附近的棋子会<b>紧张冒汗</b>——这是在提醒你该防守了。
      <h3>火锅与盲盒</h3>
      赢下克苏鲁会把棋子投入火锅（难度越高越多），输了也有一颗安慰奖；首次通过教学关卡 +3。点击右侧发光的火锅，每 20 颗棋子抽一次盲盒：术语卡、黑胶唱片、触手丝袜。重复的物品退还 5 颗。
      <h3>触手</h3>
      鼠标摸摸触手它会害羞。给触手穿上丝袜后，<b>按住触手上下拖动</b>可以调整丝袜长度。点小克苏鲁雕像可以戳它。
      <h3>快捷键</h3>
      <kbd>Z</kbd> 悔棋　<kbd>H</kbd> 提示（花 2 颗棋子）　<kbd>R</kbd> 重开　<kbd>Esc</kbd> 返回 / 关闭<br>
      教学中：<kbd>A</kbd>/<kbd>D</kbd> 上一题 / 下一题，<kbd>Q</kbd>/<kbd>E</kbd> 到最前 / 最后<br>
      <kbd>M</kbd> 音乐开关
    </div>`);
  }

  function syncTokens() {
    $('btnSound').classList.toggle('off', !save.sfx);
    $('btnMusic').classList.toggle('off', !save.music);
  }

  // ================================================================
  // 输入
  // ================================================================
  function localXY(e) { const r = canvas.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; }
  function canPlaceNow() {
    if (S.mode === 'tutorial') return !S.lessonDone;
    if (S.mode === 'local') return !S.over;
    if (S.mode === 'ai') return !S.over && !S.aiBusy && S.turn === S.human;
    return false;
  }

  canvas.addEventListener('pointermove', e => {
    const { x, y } = localXY(e);
    S.mouse.x = x; S.mouse.y = y; S.mouse.inside = true;
    if (S.drag) {
      const tt = S.drag.t, s = tt.hit(x, y);
      if (save.stocking && s >= 0) tt.sock = clamp(1 - s, 0.12, 0.98);
      tt.blush = Math.min(1, tt.blush + 0.03);
      if (Math.hypot(x - S.drag.lx, y - S.drag.ly) > 30) { S.drag.lx = x; S.drag.ly = y; Snd.play('squish'); tt.wig = Math.min(1, tt.wig + 0.3); }
      return;
    }
    let cur = 'default';
    S.potHover = Math.hypot(x - L.pot.cx, y - L.pot.cy) < L.pot.R * 1.1;
    const tip = $('cauldronTip');
    if (S.potHover) { cur = 'pointer'; tip.classList.remove('hidden'); tip.style.left = L.pot.cx + 'px'; tip.style.top = (L.pot.cy - L.pot.R * 0.9) + 'px'; }
    else tip.classList.add('hidden');
    if (Math.hypot(x - L.mascot.x, y - L.mascot.y) < L.mascot.s * 0.55) cur = 'pointer';
    S.hover = -1;
    const onTent = tentacles.some(tt => tt.hit(x, y) >= 0);
    if (onTent) { cur = 'grab'; for (const tt of tentacles) if (tt.hit(x, y) >= 0) tt.blush = Math.min(1, tt.blush + 0.01); }
    else if (canPlaceNow()) {
      const i = cellAt(x, y);
      if (i >= 0 && !S.board[i]) { S.hover = i; cur = 'pointer'; }
    }
    canvas.style.cursor = cur;
  });
  canvas.addEventListener('pointerleave', () => { S.mouse.inside = false; S.hover = -1; S.potHover = false; $('cauldronTip').classList.add('hidden'); });

  canvas.addEventListener('pointerdown', e => {
    Snd.ensure();
    const { x, y } = localXY(e);
    S.mouse.x = x; S.mouse.y = y;
    for (const tt of tentacles) {
      if (tt.hit(x, y) >= 0) {
        S.drag = { t: tt, lx: x, ly: y };
        canvas.setPointerCapture(e.pointerId);
        canvas.style.cursor = 'grabbing';
        tt.wig = 1; tt.blush = Math.min(1, tt.blush + 0.3);
        Snd.play('squish');
        if (now() > (S.petSaid || 0)) { say(pick(save.stocking ? LINES.petSock : LINES.petNo)); S.petSaid = now() + 4000; }
        mascot('blush', 2000);
        return;
      }
    }
    if (Math.hypot(x - L.pot.cx, y - L.pot.cy) < L.pot.R * 1.1) { Snd.play('splash'); openGacha(); return; }
    if (Math.hypot(x - L.mascot.x, y - L.mascot.y) < L.mascot.s * 0.55) {
      Snd.play('squish'); say(pick(LINES.poke)); mascot(pick(['angry', 'blush', 'smug']), 2000);
      sparkle(L.mascot.x, L.mascot.y, 10, '#9be06a');
      return;
    }
    const i = cellAt(x, y);
    if (i < 0) return;
    if (S.mode === 'tutorial') { lessonClick(i); return; }
    if (!canPlaceNow() || S.board[i]) return;
    play(i, S.turn);
    S.hover = -1;
  });
  canvas.addEventListener('pointerup', () => { if (S.drag) { S.drag = null; canvas.style.cursor = 'grab'; } });

  document.addEventListener('keydown', e => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    const k = e.key.toLowerCase();
    const modalOpen = !$('modal').classList.contains('hidden');
    if (k === 'escape') {
      if (modalOpen) closeModal();
      else if (!$('setup').classList.contains('hidden')) showMenu();
      else if (S.mode !== 'menu') showMenu();
      return;
    }
    if (modalOpen) return;
    if (k === 'm') { $('btnMusic').click(); return; }
    if (S.mode === 'menu' && $('setup').classList.contains('hidden')) {
      if (k === '1' || k === 'enter') showSetup();
      else if (k === '2') startLocal();
      else if (k === '3') loadLesson(firstUnfinished());
      else if (k === '4') openCollection('term');
      else if (k === '5') openGacha();
      return;
    }
    if (!$('setup').classList.contains('hidden')) { if (k === 'enter') startAI(); return; }
    if (k === 'z') undo();
    else if (k === 'h') hint();
    else if (k === 'r') restart();
    else if (S.mode === 'tutorial') {
      if (k === 'a') loadLesson(S.lesson - 1);
      else if (k === 'd') loadLesson(S.lesson + 1);
      else if (k === 'q') loadLesson(0);
      else if (k === 'e') loadLesson(LESSONS.length - 1);
      else if (k === 'enter' && S.lessonDone && S.lesson === LESSONS.length - 1) { S.setupLevel = 1; showSetup(); }
    }
  });

  // DOM 按钮
  document.querySelectorAll('[data-act]').forEach(b => b.addEventListener('click', () => {
    Snd.ensure(); Snd.play('click');
    const a = b.dataset.act;
    if (a === 'ai') showSetup();
    else if (a === 'local') startLocal();
    else if (a === 'tutorial') loadLesson(firstUnfinished());
    else if (a === 'collection') openCollection('term');
    else if (a === 'start') startAI();
    else if (a === 'back') { showMenu(); say(pick(LINES.poke)); }
  }));
  document.querySelectorAll('.side').forEach(b => b.addEventListener('click', () => {
    Snd.play('click'); S.setupSide = +b.dataset.side;
    document.querySelectorAll('.side').forEach(x => x.classList.toggle('active', x === b));
  }));
  $('modalClose').onclick = closeModal;
  $('modal').addEventListener('pointerdown', e => { if (e.target.id === 'modal') closeModal(); });
  $('btnSound').onclick = () => { save.sfx = !save.sfx; persist(); syncTokens(); Snd.play('click'); };
  $('btnMusic').onclick = () => {
    save.music = !save.music; persist(); syncTokens();
    if (save.music) { Snd.startMusic(); toast(`🎵 ${ITEM[save.record].name}`); } else Snd.stopMusic();
  };
  $('btnHelp').onclick = () => { Snd.ensure(); openHelp(); };
  window.addEventListener('resize', layout);

  // ================================================================
  // 主循环
  // ================================================================
  let lastT = now();
  function frame() {
    const tn = now(), dt = Math.min(0.05, (tn - lastT) / 1000); lastT = tn;
    const t = tn / 1000;
    const g = ctx;
    g.setTransform(L.dpr, 0, 0, L.dpr, 0, 0);
    g.drawImage(floorC, 0, 0, L.W, L.H);
    const pad = L.boardPad;
    g.drawImage(boardC, L.bx - L.S / 2 - pad, L.by - L.S / 2 - pad, L.S + pad * 2, L.S + pad * 2);
    // 棋盘上随烛光轻微起伏的暖光
    g.save(); g.globalCompositeOperation = 'soft-light';
    const wl = g.createRadialGradient(L.bx, L.by - L.S * 0.1, 0, L.bx, L.by, L.S * 0.7);
    wl.addColorStop(0, `rgba(255,200,120,${0.35 + 0.05 * Math.sin(t * 3.1) + 0.03 * Math.sin(t * 7.3)})`); wl.addColorStop(1, 'rgba(255,200,120,0)');
    g.fillStyle = wl; g.fillRect(L.bx - L.S * 0.7, L.by - L.S * 0.7, L.S * 1.4, L.S * 1.4);
    g.restore();

    drawCandles(g, t);
    drawCauldron(g, t);
    drawMascot(g, t);

    // 幽灵棋子
    for (const i of S.ghosts) drawGhost(g, i, 1, t, 0.4 + 0.15 * Math.sin(t * 3), '#8ff7e8');
    if (S.hint && now() < S.hint.until && !S.board[S.hint.i]) drawGhost(g, S.hint.i, S.hint.color, t, 0.45, '#ffd86b');
    drawStones(g, t);
    if (S.hover >= 0 && !S.board[S.hover]) drawGhost(g, S.hover, S.mode === 'tutorial' ? 1 : S.turn, t, 0.45, null);

    for (const tt of tentacles) tt.update(dt, t);
    // 正在伸出的触手画在最上层
    const order = tentacles.slice().sort((a, b) => (a.mode === 'idle' ? 0 : 1) - (b.mode === 'idle' ? 0 : 1));
    for (const tt of order) tt.draw(g, t);

    drawParticles(g, t, dt);
    requestAnimationFrame(frame);
  }

  // ================================================================
  // 启动
  // ================================================================
  layout();
  syncTokens();
  showMenu();
  if (!save.greeted) {
    save.greeted = true;
    S.potShown = save.stones;
    gainStones(20, [{ x: L.mascot.x, y: L.mascot.y, color: 1 }, { x: L.mascot.x, y: L.mascot.y, color: 2 }], 1500);
    say(pick(LINES.greet) + '<br>' + LINES.gift);
  } else {
    say(pick(LINES.greet));
  }
  // 浏览器要求先有用户手势才能出声
  const unlock = () => { if (save.music) Snd.startMusic(); window.removeEventListener('pointerdown', unlock); window.removeEventListener('keydown', unlock); };
  window.addEventListener('pointerdown', unlock); window.addEventListener('keydown', unlock);
  requestAnimationFrame(frame);
})();

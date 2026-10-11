const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, '..', 'js', 'app.js'), 'utf8');

function createApp(storedState = null) {
  const elements = new Map();
  const documentListeners = {};
  const documentCaptureListeners = {};
  const documentListenerOptions = {};
  let drawCount = 0;
  let scrollY = 1000;

  class Element {
    constructor(id) {
      this.id = id;
      this.dataset = {};
      this.listeners = {};
      this.classes = new Set();
      this.classList = {
        toggle: (name, enabled) => enabled ? this.classes.add(name) : this.classes.delete(name)
      };
      this.clientWidth = id === 'sc' ? 600 : 0;
      this.textContent = '';
      this._innerHTML = '';
      this.selectedOptions = [];
    }

    addEventListener(name, callback) {
      (this.listeners[name] ||= []).push(callback);
    }

    dispatch(name, event) {
      if (this.id === 'sc' && name.startsWith('pointer')) documentCaptureListeners[name]?.(event);
      for (const callback of this.listeners[name] || []) callback(event);
      if (this.id === 'sc' && name.startsWith('pointer')) documentListeners[name]?.(event);
    }

    setPointerCapture() {}

    set innerHTML(value) {
      this._innerHTML = value;
      if (this.id === 'sc') drawCount++;
    }

    get innerHTML() {
      return this._innerHTML;
    }
  }

  for (const id of ['html', 'tabs', 'pal', 'tl', 'g', 'sc', 'h', 'ti', 'au', 'f', 'pageWidth', 'measuresPerLine', 'patterns', 'patternSelect', 'patternName', 'measureEarlier', 'measureLater', 'measureLabel']) {
    elements.set(id, new Element(id));
  }

  const document = {
    querySelector(selector) {
      if (selector === '#sc svg') {
        if (!elements.get('sc').innerHTML.includes('<svg')) return null;
        const width = Number(elements.get('sc').innerHTML.match(/<svg[^>]+width="([\d.]+)px"/)?.[1] || 600);
        const height = Number(elements.get('sc').innerHTML.match(/<svg[^>]+height="([\d.]+)px"/)?.[1] || 400);
        return {
          getBoundingClientRect: () => ({left: 0, top: 0, width, height}),
          appendChild() {}
        };
      }
      if (selector === '#score-content' || selector.startsWith('#pattern-content-')) return {appendChild() {}};
      return elements.get(selector.slice(1)) || null;
    },
    addEventListener(name, callback, options) {
      const listeners = options === true || options?.capture ? documentCaptureListeners : documentListeners;
      listeners[name] = callback;
      documentListenerOptions[name] = options;
    },
    documentElement: elements.get('html'),
    createElementNS: () => ({setAttribute() {}})
  };

  const window = {
    get scrollY() { return scrollY; },
    scrollBy(_x, deltaY) { scrollY = Math.max(0, Math.min(1000, scrollY + deltaY)); },
    confirm() { return true; }
  };
  const sandbox = {
    document,
    window,
    localStorage: {
      getItem: () => storedState,
      setItem() {}
    },
    addEventListener() {}
  };
  vm.createContext(sandbox);
  vm.runInContext(source, sandbox);

  return {
    elements,
    get drawCount() { return drawCount; },
    get scrollY() { return window.scrollY; },
    evaluate(expression) { return vm.runInContext(expression, sandbox); },
    dispatchDocument(name, event) {
      documentCaptureListeners[name]?.(event);
      documentListeners[name]?.(event);
    },
    documentListenerOptions(name) { return documentListenerOptions[name]; },
    clickAction(action) {
      documentListeners.click({target: {closest: () => ({dataset: {x: action}})}});
    },
    clickGrid(lane, step) {
      documentListeners.click({target: {closest: () => ({dataset: {g: `${lane},${step}`}})}});
    }
  };
}

test('score swipes do not redraw or place notes, while stationary taps still work', () => {
  const app = createApp();
  const score = app.elements.get('sc');
  const originalDrawCount = app.drawCount;

  score.dispatch('pointerdown', {pointerId: 1, clientX: 150, clientY: 80});
  score.dispatch('pointermove', {pointerId: 1, clientX: 150, clientY: 120});
  score.dispatch('pointerup', {pointerId: 1, clientX: 150, clientY: 80});
  assert.equal(app.evaluate('S.D.mel[0][0].length'), 0);
  assert.equal(app.drawCount, originalDrawCount);

  score.dispatch('pointerdown', {pointerId: 2, clientX: 150, clientY: 150});
  score.dispatch('pointerup', {pointerId: 2, clientX: 151, clientY: 151});
  assert.equal(app.evaluate('S.D.mel[0].reduce((count, measure) => count + measure.length, 0)'), 1);
});

test('canceled score gestures are ignored', () => {
  const app = createApp();
  const score = app.elements.get('sc');

  score.dispatch('pointerdown', {pointerId: 1, clientX: 150, clientY: 80});
  score.dispatch('pointercancel', {pointerId: 1});
  score.dispatch('pointerup', {pointerId: 1, clientX: 150, clientY: 80});
  assert.equal(app.evaluate('S.D.mel[0][0].length'), 0);
});

test('page width defaults to 8 inches and supports 5–15 inch overrides', () => {
  const app = createApp();
  const control = app.elements.get('pageWidth');
  app.evaluate('S.D.mel[0][0].push([0, 4, 0, 0])');

  assert.equal(app.evaluate('S.pageWidth'), 8);
  const defaultPage = app.evaluate('build(false).s');
  assert.match(defaultPage, /viewBox="0 0 1170 /);
  assert.match(defaultPage, /<text x="12" y="50" font-size="13" text-anchor="start"/);
  app.evaluate('S.pageWidth = null; normalizePageWidth(S)');
  assert.equal(app.evaluate('S.pageWidth'), 8);

  control.value = '5';
  control.onchange({target: control});
  assert.equal(app.evaluate('S.pageWidth'), 5);
  assert.equal(app.evaluate('G.patterns[0].count'), 2);
  const narrowPage = app.evaluate('build(true).s');
  assert.match(narrowPage, /viewBox="0 0 731 /);
  assert.doesNotMatch(narrowPage, /transform="scale\(/);
  assert.match(narrowPage, /<ellipse cx="94" cy="188" rx="6" ry="4\.5"/);

  control.value = '16';
  control.onchange({target: control});
  assert.equal(app.evaluate('S.pageWidth'), 15);
  const widePage = app.evaluate('build(true).s');
  assert.match(widePage, /viewBox="0 0 2194 /);
  assert.doesNotMatch(widePage, /transform="scale\(/);
  assert.match(widePage, /<ellipse cx="94" cy="188" rx="6" ry="4\.5"/);
});

test('measure line limit defaults to four and wraps overflow without narrowing measures', () => {
  const app = createApp();
  const control = app.elements.get('measuresPerLine');
  assert.equal(app.evaluate('S.measuresPerLine'), 4);
  for (let i = 0; i < 3; i++) app.clickAction('add');
  const defaultLayout = app.evaluate('build(false).s');
  assert.match(defaultLayout, /data-first-measure="1" data-measure-count="4"/);
  assert.match(defaultLayout, /data-first-measure="5" data-measure-count="1"/);

  control.value = '2';
  control.onchange({target: control});
  assert.equal(app.evaluate('S.measuresPerLine'), 2);
  assert.equal(control.value, 2);
  const wrapped = app.evaluate('build(false).s');
  assert.match(wrapped, /data-first-measure="1" data-measure-count="2"/);
  assert.match(wrapped, /data-first-measure="3" data-measure-count="2"/);
  assert.match(wrapped, /data-first-measure="5" data-measure-count="1"/);
  assert.match(wrapped, /<path d="M20 316L1160 316" stroke="#111"/);
  assert.match(wrapped, /<path d="M620 316L620 356" stroke="#111"/);
  assert.equal(app.evaluate('LOC(100, 330).mi'), 2);

  control.value = '0';
  control.onchange({target: control});
  assert.equal(app.evaluate('S.measuresPerLine'), 4);
  control.value = '20';
  control.onchange({target: control});
  assert.equal(app.evaluate('S.measuresPerLine'), 8);
});

test('pitched eighth notes beam in pairs within beats', () => {
  const app = createApp();
  app.evaluate('S.D.mel[0][0].push([0, 2, 2, 0], [2, 2, 3, 0], [4, 2, 4, 0], [6, 2, 5, 0])');
  const svg = app.evaluate('build(true).s');

  assert.match(svg, /M99\.6 145L163\.35 140/);
  assert.match(svg, /M227\.1 135L290\.85 130/);
  assert.doesNotMatch(svg, /c0 8 9 10 7 20/);
});

test('pitched eighth notes do not beam across beat boundaries', () => {
  const app = createApp();
  app.evaluate('S.D.mel[0][0].push([2, 2, 2, 0], [4, 2, 3, 0])');
  const svg = app.evaluate('build(true).s');

  assert.doesNotMatch(svg, /M163\.35 145L227\.1 140/);
  assert.equal((svg.match(/c0 8 9 10 7 20/g) || []).length, 2);
});

test('pitched eighth and sixteenth notes beam together within a beat', () => {
  const app = createApp();
  app.evaluate('S.D.mel[0][0].push([8, 2, -1, 0], [10, 1, 2, 0], [11, 1, 3, 0])');
  const svg = app.evaluate('build(true).s');

  assert.match(svg, /M354\.6 160L450\.225 140/);
  assert.match(svg, /M418\.35 150L450\.225 145/);
  assert.doesNotMatch(svg, /c0 8 9 10 7 20/);
});

test('a sixteenth followed by an eighth in the same beat does not add a second beam to the eighth', () => {
  const app = createApp();
  app.evaluate("S.mode='drm'; S.tool='n'; S.patterns[0].D.drm[0][0] = [[1, 1, 4], [2, 1, 4]];");
  const svg = app.evaluate('build(true).s');

  assert.match(svg, /M120\.375 206L152\.25 206/);
  assert.doesNotMatch(svg, /M120\.375 201L152\.25 201/);
});

test('legacy scores migrate into one named pattern without losing score data', () => {
  const legacy = {
    title: 'Old score',
    mode: 'mel',
    cur: 1,
    n: 3,
    D: {mel: [[[[0, 4, 2, 1]], [[4, 2, 3, 0]], []]], pia: [[], []], drm: [[]]},
    ch: {mel: {'1:0': 'Am'}},
    ink: {mel: [{m: 1, p: [[10, 20], [12, 22]]}]}
  };
  const app = createApp(JSON.stringify(legacy));

  assert.equal(app.evaluate('S.patterns.length'), 1);
  assert.equal(app.evaluate('P().name'), 'Pattern 1');
  assert.equal(app.evaluate('P().n'), 3);
  assert.equal(app.evaluate('P().cur'), 1);
  assert.equal(app.evaluate('S.measuresPerLine'), 4);
  assert.deepEqual(JSON.parse(JSON.stringify(app.evaluate('P().D.mel[0][0]'))), [[0, 4, 2, 1]]);
  assert.equal(app.evaluate("P().ch.mel['1:0']"), 'Am');
  assert.equal(app.evaluate('P().ink.mel.length'), 1);
});

test('patterns isolate measures and support naming, duplication, ordering, and deletion', async () => {
  const app = createApp();
  app.clickAction('pat-add');
  assert.equal(app.evaluate('S.patterns.length'), 2);
  assert.equal(app.evaluate('P().n'), 2);

  app.elements.get('patternName').value = 'Verse';
  app.elements.get('patternName').oninput({target: app.elements.get('patternName')});
  app.evaluate('P().D.mel[0][0].push([0, 4, 2, 0])');
  app.evaluate("(P().ch.mel ||= {})['0:0'] = 'Am'");
  app.clickAction('add');
  assert.equal(app.evaluate('P().n'), 3);
  assert.equal(app.evaluate('P().D.mel[0].length'), 3);
  assert.equal(app.evaluate('S.patterns[0].n'), 2);

  const svg = app.evaluate('build(false).s');
  assert.match(svg, /id="pattern-content-1"/);
  assert.match(svg, /id="pattern-content-2"/);
  assert.match(svg, />Pattern 1</);
  assert.match(svg, />Verse</);
  assert.match(svg, /<text x="12" y="84" font-size="22" font-weight="700" fill="#2563eb">Pattern 1<\/text>/);
  assert.match(svg, /<path d="M20 138L\d+ 138" stroke="#111"/);
  assert.match(svg, /<path d="M12 215H\d+" stroke="#d7dce3"/);
  assert.match(svg, /y="296" font-size="24" font-weight="700" font-family=.*>Am<\/text>/);
  assert.match(app.evaluate('build(true).s'), /font-size="22" font-weight="700" fill="#2563eb">Verse<\/text>/);
  assert.ok(app.evaluate('G.patterns[1].top > G.patterns[0].top'));

  app.clickAction('pat-duplicate');
  assert.equal(app.evaluate('S.patterns.length'), 3);
  assert.equal(app.evaluate('P().name'), 'Verse copy');
  assert.deepEqual(JSON.parse(JSON.stringify(app.evaluate('P().D.mel[0][0]'))), [[0, 4, 2, 0]]);
  app.clickAction('pat-up');
  assert.equal(app.evaluate('S.patterns[1].id'), app.evaluate('P().id'));
  const savedPatterns = app.evaluate('JSON.stringify(S)');
  const fileTarget = {files: [{text: async () => savedPatterns}], value: 'patterns.json'};
  await app.elements.get('f').onchange({target: fileTarget});
  assert.equal(app.evaluate('S.patterns.length'), 3);
  assert.equal(app.evaluate('S.patterns[1].id'), app.evaluate('P().id'));
  app.clickAction('pat-delete');
  assert.equal(app.evaluate('S.patterns.length'), 2);
  assert.equal(app.evaluate('P().name'), 'Pattern 1');
});

test('measures duplicate after the selection and move with all modes, chords, and annotations', () => {
  const app = createApp();
  app.evaluate(`
    P().D.mel[0][0].push([0, 4, 2, 0]);
    P().D.pia[1][0].push([4, 2, 3, 0]);
    P().D.drm[0][0].push([8, 1, 4]);
    P().D.mel[0][1].push([2, 4, 4, 1]);
    P().ch.mel = {'0:0': 'Am', '1:4': 'G'};
    P().ch.pia = {'0:4': 'C'};
    P().ink.mel = [{m: 0, p: [[10, 20], [12, 22]]}, {m: 1, p: [[30, 40], [32, 42]]}];
    P().ink.drm = [{m: 0, p: [[50, 60], [52, 62]]}];
    go()
  `);
  app.clickAction('add');
  app.clickAction('prev');

  assert.equal(app.elements.get('measureLabel').textContent, 'Measure 1 of 3');
  assert.equal(app.elements.get('measureEarlier').disabled, true);
  assert.equal(app.elements.get('measureLater').disabled, false);
  app.clickAction('duplicate-measure');

  assert.equal(app.evaluate('P().n'), 4);
  assert.equal(app.evaluate('P().cur'), 1);
  assert.deepEqual(JSON.parse(JSON.stringify(app.evaluate('P().D.mel[0][0]'))), [[0, 4, 2, 0]]);
  assert.deepEqual(JSON.parse(JSON.stringify(app.evaluate('P().D.mel[0][1]'))), [[0, 4, 2, 0]]);
  assert.deepEqual(JSON.parse(JSON.stringify(app.evaluate('P().D.mel[0][2]'))), [[2, 4, 4, 1]]);
  assert.deepEqual(JSON.parse(JSON.stringify(app.evaluate('P().D.pia[1][1]'))), [[4, 2, 3, 0]]);
  assert.deepEqual(JSON.parse(JSON.stringify(app.evaluate('P().D.drm[0][1]'))), [[8, 1, 4]]);
  assert.deepEqual(JSON.parse(JSON.stringify(app.evaluate("[P().ch.mel['0:0'], P().ch.mel['1:0'], P().ch.mel['2:4'], P().ch.pia['1:4']]"))), ['Am', 'Am', 'G', 'C']);
  assert.deepEqual(JSON.parse(JSON.stringify(app.evaluate('P().ink.mel.map(stroke => stroke.m)'))), [0, 2, 1]);
  assert.deepEqual(JSON.parse(JSON.stringify(app.evaluate('P().ink.drm.map(stroke => stroke.m)'))), [0, 1]);
  assert.equal(app.elements.get('measureLabel').textContent, 'Measure 2 of 4');

  app.clickAction('measure-later');
  assert.equal(app.evaluate('P().cur'), 2);
  assert.deepEqual(JSON.parse(JSON.stringify(app.evaluate('P().D.mel[0][2]'))), [[0, 4, 2, 0]]);
  assert.equal(app.evaluate("P().ch.mel['2:0']"), 'Am');
  assert.deepEqual(JSON.parse(JSON.stringify(app.evaluate('P().ink.mel.map(stroke => stroke.m)'))), [0, 1, 2]);
  app.clickAction('measure-earlier');
  assert.equal(app.evaluate('P().cur'), 1);
  app.clickAction('undo');
  assert.equal(app.evaluate('P().cur'), 2);
  assert.equal(app.elements.get('measureLabel').textContent, 'Measure 3 of 4');

  app.evaluate('P().cur = 0; go()');
  app.clickAction('measure-earlier');
  assert.equal(app.evaluate('P().cur'), 0);
  assert.equal(app.elements.get('measureEarlier').disabled, true);
});

test('pen mode records stylus strokes and disables browser panning on the score', () => {
  const app = createApp();
  app.evaluate("S.tool = 'd'; go()");
  const score = app.elements.get('sc');

  assert.equal(app.elements.get('html').classes.has('draw-mode'), true);
  score.dispatch('pointerdown', {pointerId: 1, pointerType: 'pen', clientX: 150, clientY: 150, preventDefault() {}});
  score.dispatch('pointermove', {pointerId: 1, pointerType: 'pen', clientX: 170, clientY: 165});
  score.dispatch('pointerup', {pointerId: 1, pointerType: 'pen', clientX: 170, clientY: 165});

  assert.equal(app.evaluate('INK().length'), 1);
  assert.match(fs.readFileSync(path.join(__dirname, '..', 'css', 'app.css'), 'utf8'), /html\.draw-mode\{touch-action:none\}/);
});

test('drum Pen mode records stylus strokes on the active pattern line', () => {
  const app = createApp();
  app.evaluate("S.mode = 'drm'; go()");
  app.clickAction('pat-add');
  app.clickAction('dinput-pen');
  const score = app.elements.get('sc');
  let prevented = false;

  assert.equal(app.elements.get('html').classes.has('draw-mode'), true);
  score.dispatch('pointerdown', {pointerId: 1, pointerType: 'pen', clientX: 40, clientY: 230, preventDefault() {prevented = true}});
  score.dispatch('pointermove', {pointerId: 1, pointerType: 'pen', clientX: 60, clientY: 232});
  score.dispatch('pointerup', {pointerId: 1, pointerType: 'pen', clientX: 60, clientY: 232});

  assert.equal(prevented, true);
  assert.equal(app.evaluate('P().id'), 1);
  assert.equal(app.evaluate('INK().length'), 1);
  assert.equal(app.evaluate('INK()[0].m'), 0);
});

test('drum Pen mode captures touch-reported Pencil strokes instead of scrolling', () => {
  const app = createApp();
  app.evaluate("S.mode = 'drm'; go()");
  app.clickAction('dinput-pen');
  const score = app.elements.get('sc');
  let prevented = false;

  score.dispatch('pointerdown', {pointerId: 1, pointerType: 'touch', clientX: 150, clientY: 150, preventDefault() {prevented = true}});
  score.dispatch('pointermove', {pointerId: 1, pointerType: 'touch', clientX: 170, clientY: 165});
  score.dispatch('pointerup', {pointerId: 1, pointerType: 'touch', clientX: 170, clientY: 165});

  assert.equal(prevented, true);
  assert.equal(app.evaluate('INK().length'), 1);
  assert.equal(app.scrollY, 1000);
  assert.match(fs.readFileSync(path.join(__dirname, '..', 'css', 'app.css'), 'utf8'), /html\.draw-mode\{touch-action:none\}/);
});

test('Pen mode prevents native touch scrolling when touch-action is ignored', () => {
  const app = createApp();
  app.evaluate("S.tool = 'd'; go()");
  let prevented = false;

  assert.equal(app.documentListenerOptions('touchmove')?.capture, true);
  assert.equal(app.documentListenerOptions('touchmove')?.passive, false);
  app.dispatchDocument('touchmove', {cancelable: true, preventDefault() {prevented = true}});

  assert.equal(prevented, true);
});

test('two-finger pan scrolls away from the page bottom in pen mode', () => {
  const app = createApp();
  app.evaluate("S.tool = 'd'; go()");

  app.dispatchDocument('pointerdown', {pointerId: 1, pointerType: 'touch', clientY: 600});
  app.dispatchDocument('pointerdown', {pointerId: 2, pointerType: 'touch', clientY: 600});
  app.dispatchDocument('pointermove', {pointerId: 1, pointerType: 'touch', clientY: 640});
  app.dispatchDocument('pointermove', {pointerId: 2, pointerType: 'touch', clientY: 640});
  assert.equal(app.scrollY, 960);

  app.dispatchDocument('pointerup', {pointerId: 2, pointerType: 'touch'});
  app.dispatchDocument('pointermove', {pointerId: 1, pointerType: 'touch', clientY: 680});
  assert.equal(app.scrollY, 960);
});

test('two-finger pan cancels an in-progress touch stroke in Pen mode', () => {
  const app = createApp();
  app.evaluate("S.mode = 'drm'; go()");
  app.clickAction('dinput-pen');
  const score = app.elements.get('sc');

  score.dispatch('pointerdown', {pointerId: 1, pointerType: 'touch', clientX: 150, clientY: 150, preventDefault() {}});
  score.dispatch('pointerdown', {pointerId: 2, pointerType: 'touch', clientX: 170, clientY: 150, preventDefault() {}});
  score.dispatch('pointermove', {pointerId: 1, pointerType: 'touch', clientX: 160, clientY: 170});
  score.dispatch('pointermove', {pointerId: 2, pointerType: 'touch', clientX: 180, clientY: 170});

  assert.equal(app.scrollY, 980);
  score.dispatch('pointerup', {pointerId: 1, pointerType: 'touch'});
  score.dispatch('pointerup', {pointerId: 2, pointerType: 'touch'});
  assert.equal(app.evaluate('INK().length'), 0);
});

test('pen strokes may start in the space above the staff', () => {
  const app = createApp();
  app.evaluate("S.tool = 'd'; go()");
  const score = app.elements.get('sc');

  score.dispatch('pointerdown', {pointerId: 1, pointerType: 'pen', clientX: 150, clientY: 30, preventDefault() {}});
  score.dispatch('pointermove', {pointerId: 1, pointerType: 'pen', clientX: 170, clientY: 45});
  score.dispatch('pointerup', {pointerId: 1, pointerType: 'pen', clientX: 170, clientY: 45});

  assert.equal(app.evaluate('INK().length'), 1);
  assert.ok(app.evaluate('INK()[0].p[0][1] < 0'));
});

test('on-screen keyboard input renders note keys and octave controls', () => {
  const app = createApp();

  assert.equal(app.evaluate('S.tool'), 'k');
  assert.match(app.elements.get('tl').innerHTML, /data-t="k" class="on">Keyboard/);
  assert.match(app.elements.get('g').innerHTML, /data-note="C4"/);
  assert.match(app.elements.get('g').innerHTML, />C4<\/button>/);
  assert.match(app.elements.get('g').innerHTML, />D4<\/button>/);
  assert.match(app.elements.get('g').innerHTML, />E4<\/button>/);
  assert.match(app.elements.get('g').innerHTML, />E3<\/button>/);
  assert.match(app.elements.get('g').innerHTML, />G5<\/button>/);
  assert.equal((app.elements.get('g').innerHTML.match(/class="keyboard-key keyboard-white"/g) || []).length, 17);
  assert.match(app.elements.get('g').innerHTML, /Octave 4/);
});

test('changing note duration preserves keyboard and pen tools', () => {
  const app = createApp();
  for (const tool of ['k', 'd']) {
    app.evaluate(`S.tool='${tool}'; go();`);
    app.dispatchDocument('click', {
      target: {closest: () => ({dataset: {d: '2'}})}
    });
    assert.equal(app.evaluate('S.tool'), tool);
    assert.equal(app.evaluate('S.d'), 2);
  }
});

test('drum positions 1 and 4 render a dotted eighth followed by a sixteenth', () => {
  const app = createApp();
  const svg = app.evaluate('drums([[0, 1, 0], [3, 1, 0]], 0, 40, 15)');
  assert.match(svg, /<circle[^>]+r="1\.8"/);
  assert.equal((svg.match(/stroke-width="3"/g) || []).length, 2);
});

test('drum sixteenths receive secondary beams while eighths remain single-beamed', () => {
  const app = createApp();
  const sixteenths = app.evaluate('drums([[0, 1, 0], [1, 1, 0], [2, 1, 0], [3, 1, 0]], 0, 40, 15)');
  const eighths = app.evaluate('drums([[0, 1, 0], [2, 1, 0]], 0, 40, 15)');
  assert.equal((sixteenths.match(/stroke-width="3"/g) || []).length, 4);
  assert.equal((eighths.match(/stroke-width="3"/g) || []).length, 1);
});

test('single-voice drum notation shares durations and beams across parts', () => {
  const app = createApp();
  const svg = app.evaluate('drums([[0, 1, 0], [3, 1, 6]], 0, 40, 15, true)');

  assert.match(svg, /<circle[^>]+r="1\.8"/);
  assert.match(svg, /M8\.5 108L53\.5 108/);
});

test('single-voice drum notation can place stems and beams above the notes', () => {
  const app = createApp();
  const svg = app.evaluate('drums([[0, 1, 0], [3, 1, 6]], 0, 40, 15, true, true)');

  assert.match(svg, /<circle[^>]+r="1\.8"/);
  assert.match(svg, /M19\.5 6L64\.5 6/);
});

test('drum grid cycles hi-hat and snare articulations per hit', () => {
  const app = createApp();
  app.evaluate("S.mode = 'drm'; go()");

  app.clickGrid(0, 0);
  assert.equal(app.evaluate('S.D.drm[0][0][0].length'), 3);
  app.clickGrid(0, 0);
  assert.equal(app.evaluate('S.D.drm[0][0][0][3]'), 'open');
  assert.match(app.evaluate('build(true).s'), /<ellipse cx="94" cy="133" rx="7" ry="6\.5" fill="none" stroke="#111" stroke-width="1\.2"\/>/);
  assert.match(app.elements.get('g').innerHTML, /data-g="0,0" aria-label="Hi-hat step 1: Open hi-hat" title="Hi-hat step 1: Open hi-hat \(tap to cycle\)">o<\/button>/);
  app.clickGrid(0, 0);
  assert.equal(app.evaluate('S.D.drm[0][0][0][3]'), 'pedal');
  assert.match(app.evaluate('build(true).s'), /M89\.5 188\.5L98\.5 197\.5/);
  assert.match(app.evaluate('build(true).s'), /M99\.5 193L99\.5 160/);
  assert.match(app.elements.get('g').innerHTML, /data-g="0,0" aria-label="Hi-hat step 1: Pedal hi-hat" title="Hi-hat step 1: Pedal hi-hat \(tap to cycle\)">x<\/button>/);
  app.clickGrid(0, 0);
  assert.equal(app.evaluate('S.D.drm[0][0].length'), 0);

  app.clickGrid(4, 1);
  app.clickGrid(4, 1);
  assert.equal(app.evaluate('S.D.drm[0][0][0][3]'), 'ghost');
  assert.match(app.evaluate('build(true).s'), /font-size="14">\(<\/text>/);
  app.clickGrid(4, 1);
  assert.equal(app.evaluate('S.D.drm[0][0].length'), 0);
});

test('drum input selector sits above the grid and switches between grid and pen', () => {
  const app = createApp();
  app.evaluate("S.mode = 'drm'; go()");
  app.evaluate('S.D.drm[0][0].push([0, 1, 0], [3, 1, 6]); go()');
  assert.doesNotMatch(app.elements.get('tabs').innerHTML, /dinput-/);
  assert.match(app.elements.get('g').innerHTML, /^<div class="r drum-input-toggle">.*data-x="dinput-grid"[^>]*>Grid<\/button>.*data-x="dinput-pen"[^>]*>Pen<\/button>.*data-x="drum-voice"[^>]*aria-pressed="false">Single voice<\/button>/);
  assert.doesNotMatch(app.evaluate('build(true).s'), /r="1\.8"/);

  app.clickAction('drum-voice');
  assert.equal(app.evaluate('S.drumSingleVoice'), true);
  assert.match(app.elements.get('g').innerHTML, /data-x="drum-voice"[^>]*aria-pressed="true">Single voice<\/button>/);
  assert.match(app.elements.get('g').innerHTML, /data-x="drum-beam"[^>]*aria-pressed="false">Beam above<\/button>/);
  assert.match(app.evaluate('build(true).s'), /r="1\.8"/);

  app.clickAction('drum-beam');
  assert.equal(app.evaluate('S.drumSingleVoiceUp'), true);
  assert.match(app.elements.get('g').innerHTML, /data-x="drum-beam"[^>]*aria-pressed="true">Beam above<\/button>/);
  assert.match(app.evaluate('build(true).s'), /L195\.125 104/);

  app.clickAction('dinput-pen');
  assert.equal(app.evaluate('S.dinput'), 'pen');
  assert.equal(app.evaluate('S.tool'), 'd');
  assert.match(app.elements.get('g').innerHTML, /drum-input-toggle/);
  assert.doesNotMatch(app.elements.get('g').innerHTML, /data-g=/);

  app.clickAction('dinput-grid');
  assert.equal(app.evaluate('S.dinput'), 'grid');
  assert.equal(app.evaluate('S.tool'), 'n');
  assert.match(app.elements.get('g').innerHTML, /data-g=/);
});

test('annotation visibility can be toggled without deleting stored strokes', () => {
  const app = createApp();
  app.evaluate("INK().push({m: 0, p: [[100, 20], [110, 25]]}); go()");
  assert.match(app.evaluate('build(false).s'), /stroke="#c0392b"/);

  app.clickAction('ink');
  assert.equal(app.evaluate('S.showInk'), false);
  assert.equal(app.evaluate('INK().length'), 1);
  assert.doesNotMatch(app.evaluate('build(false).s'), /stroke="#c0392b"/);

  app.clickAction('ink');
  assert.equal(app.evaluate('S.showInk'), true);
  assert.match(app.evaluate('build(false).s'), /stroke="#c0392b"/);
});

test('about page links to the editor and presents screenshots in order', () => {
  const about = fs.readFileSync(path.join(__dirname, '..', 'about', 'index.html'), 'utf8');
  const appShell = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  const captureScript = fs.readFileSync(path.join(__dirname, '..', 'scripts', 'capture-about-screenshots.js'), 'utf8');
  const packageJson = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'package.json'), 'utf8'));
  const screenshots = [
    '../assets/screenshots/01-melody.png',
    '../assets/screenshots/02-drums-grid.png',
    '../assets/screenshots/04-patterns.png',
    '../assets/screenshots/03-melody-annotations.png'
  ];

  assert.match(appShell, /href="about\/"/);
  assert.match(about, /href="\.\.\/">Open the editor/);
  const positions = screenshots.map(image => about.indexOf(image));
  assert.ok(positions.every(position => position >= 0));
  assert.deepEqual(positions, [...positions].sort((a, b) => a - b));
  assert.ok(screenshots.every(image => captureScript.includes(path.basename(image))));
  assert.match(captureScript, /Riff 1 - Verse/);
  assert.match(captureScript, /Riff 2 - Chorus/);
  assert.match(captureScript, /pattern\.n !== 2/);
  assert.match(about, /quick, touch-friendly music notation sketchpad/);
  assert.match(about, /not for writing or engraving big, finished pieces/);
  assert.ok(about.indexOf('idea-callout') > about.indexOf('01-melody.png'));
  assert.ok(about.indexOf('patterns-title') < about.indexOf('pen-title'));
  assert.match(captureScript, /width: 768, height: 1024/);
  assert.match(captureScript, /deviceScaleFactor: 2/);
  assert.match(captureScript, /height: viewport\.height \* \.75/);
  assert.equal(packageJson.scripts['screenshots:about'], 'node scripts/capture-about-screenshots.js');
  for (const image of screenshots) {
    const png = fs.readFileSync(path.join(__dirname, '..', 'about', image));
    const dimensions = about.match(new RegExp(`<img src="${image.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"[^>]*width="(\\d+)" height="(\\d+)"`));
    assert.ok(dimensions, `${image} must declare intrinsic dimensions`);
    assert.equal(Number(dimensions[1]), png.readUInt32BE(16));
    assert.equal(Number(dimensions[2]), png.readUInt32BE(20));
    assert.equal(png.readUInt32BE(16), 1536);
    assert.equal(png.readUInt32BE(20), image.includes('03-melody-annotations') || image.includes('04-patterns') ? 1536 : 2048);
  }
});

test('main title uses the About wordmark in a full-width contrasting stripe', () => {
  const appShell = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  const styles = fs.readFileSync(path.join(__dirname, '..', 'css', 'app.css'), 'utf8');
  assert.match(appShell, /<div class="r app-header"><div class="app-brand"><b><span>GROOVE<\/span> <span class="app-brand-accent">QUIP<\/span><\/b>/);
  assert.match(styles, /\.app-header\{[^}]*background:#252a31/);
  assert.match(styles, /\.app-brand-accent\{color:#70cf70\}/);
});
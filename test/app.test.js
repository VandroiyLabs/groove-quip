const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, '..', 'js', 'app.js'), 'utf8');

function createApp() {
  const elements = new Map();
  const documentListeners = {};
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
    }

    addEventListener(name, callback) {
      (this.listeners[name] ||= []).push(callback);
    }

    dispatch(name, event) {
      for (const callback of this.listeners[name] || []) callback(event);
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

  for (const id of ['html', 'tabs', 'pal', 'tl', 'g', 'sc', 'h', 'ti', 'au', 'f']) {
    elements.set(id, new Element(id));
  }

  const document = {
    querySelector(selector) {
      if (selector === '#sc svg') {
        if (!elements.get('sc').innerHTML.includes('<svg')) return null;
        return {
          getBoundingClientRect: () => ({left: 0, top: 0, width: 600, height: 400}),
          appendChild() {}
        };
      }
      return elements.get(selector.slice(1)) || null;
    },
    addEventListener(name, callback) {
      documentListeners[name] = callback;
    },
    documentElement: elements.get('html'),
    createElementNS: () => ({setAttribute() {}})
  };

  const window = {
    get scrollY() { return scrollY; },
    scrollBy(_x, deltaY) { scrollY = Math.max(0, Math.min(1000, scrollY + deltaY)); }
  };
  const sandbox = {
    document,
    window,
    localStorage: {
      getItem: () => null,
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
    dispatchDocument(name, event) { documentListeners[name](event); },
    clickAction(action) {
      documentListeners.click({target: {closest: () => ({dataset: {x: action}})}});
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

test('drum input selector sits above the grid and switches between grid and pen', () => {
  const app = createApp();
  app.evaluate("S.mode = 'drm'; go()");
  assert.doesNotMatch(app.elements.get('tabs').innerHTML, /dinput-/);
  assert.match(app.elements.get('g').innerHTML, /^<div class="r drum-input-toggle">.*data-x="dinput-grid"[^>]*>Grid<\/button>.*data-x="dinput-pen"[^>]*>Pen<\/button>/);

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
  const screenshots = [
    '../assets/screenshots/01-melody.png',
    '../assets/screenshots/02-drums-grid.png',
    '../assets/screenshots/03-melody-annotations.png'
  ];

  assert.match(appShell, /href="about\/"/);
  assert.match(about, /href="\.\.\/">Open the editor/);
  const positions = screenshots.map(image => about.indexOf(image));
  assert.ok(positions.every(position => position >= 0));
  assert.deepEqual(positions, [...positions].sort((a, b) => a - b));
});

test('main title uses the About wordmark in a full-width contrasting stripe', () => {
  const appShell = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  const styles = fs.readFileSync(path.join(__dirname, '..', 'css', 'app.css'), 'utf8');
  assert.match(appShell, /<div class="r app-header"><div class="app-brand"><b><span>GROOVE<\/span> <span class="app-brand-accent">QUIP<\/span><\/b>/);
  assert.match(styles, /\.app-header\{[^}]*background:#252a31/);
  assert.match(styles, /\.app-brand-accent\{color:#70cf70\}/);
});
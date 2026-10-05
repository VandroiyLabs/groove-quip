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

  class Element {
    constructor(id) {
      this.id = id;
      this.dataset = {};
      this.listeners = {};
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

    set innerHTML(value) {
      this._innerHTML = value;
      if (this.id === 'sc') drawCount++;
    }

    get innerHTML() {
      return this._innerHTML;
    }
  }

  for (const id of ['tabs', 'pal', 'tl', 'g', 'sc', 'h', 'ti', 'au', 'f']) {
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
    }
  };

  const sandbox = {
    document,
    window: {},
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
    evaluate(expression) { return vm.runInContext(expression, sandbox); },
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
  score.dispatch('pointerup', {pointerId: 1, clientX: 150, clientY: 120});
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

test('drum input switches between the grid and pen tools', () => {
  const app = createApp();
  app.evaluate("S.mode = 'drm'; go()");

  app.clickAction('dinput-pen');
  assert.equal(app.evaluate('S.dinput'), 'pen');
  assert.equal(app.evaluate('S.tool'), 'd');
  assert.equal(app.elements.get('g').innerHTML, '');

  app.clickAction('dinput-grid');
  assert.equal(app.evaluate('S.dinput'), 'grid');
  assert.equal(app.evaluate('S.tool'), 'n');
  assert.match(app.elements.get('g').innerHTML, /data-g=/);
});
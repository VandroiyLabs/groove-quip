const fs = require('node:fs/promises');
const path = require('node:path');
const { chromium } = require('playwright');

const root = path.resolve(__dirname, '..');
const baseUrl = process.env.APP_URL || 'http://127.0.0.1:8000/';
const outputDir = path.resolve(process.env.SCREENSHOT_DIR || path.join(root, 'assets/screenshots'));
const viewport = {width: 768, height: 1024};

async function openEditor(browser) {
  const context = await browser.newContext({viewport, deviceScaleFactor: 2});
  await context.addInitScript(() => localStorage.clear());
  const page = await context.newPage();
  const response = await page.goto(baseUrl, {waitUntil: 'networkidle'});
  if (!response?.ok()) throw new Error(`Could not open ${baseUrl}: HTTP ${response?.status()}`);
  await page.locator('#sc svg').waitFor();
  return {context, page};
}

async function prepareScore(page, title, author = 'Original example') {
  await page.locator('#ti').fill(title);
  await page.locator('#au').fill(author);
  await setPageWidth(page, '5');
  await page.locator('#pageWidth').waitFor();
  await page.locator('[data-x="add"]').click();
  await page.locator('[data-x="add"]').click();
  await page.locator('#sc svg').waitFor();
}

async function setPageWidth(page, width) {
  const input = page.locator('#pageWidth');
  await input.fill(width);
  await input.press('Enter');
  await page.waitForFunction(expected => JSON.parse(localStorage.getItem('ns1')).pageWidth === expected, Number(width));
}

async function verifyShowcaseState(page, mode, kind) {
  const score = await page.evaluate(() => JSON.parse(localStorage.getItem('ns1')));
  if (score.mode !== mode) throw new Error(`Expected ${mode} mode but captured ${score.mode}`);
  const pattern = score.patterns.find(item => item.id === score.activePatternId);
  const notes = Object.values(pattern.D[mode]).flat(2).length;
  const chords = Object.keys(pattern.ch[mode] || {}).length;
  const annotations = (pattern.ink[mode] || []).length;
  if (kind === 'melody' && (!notes || !chords)) throw new Error('Melody screenshot is missing notes or chords');
  if (kind === 'annotations' && annotations < 7) throw new Error(`Annotation screenshot needs at least 7 pen marks; found ${annotations}`);
  if (kind === 'drums' && !notes) throw new Error('Drum screenshot is missing hits');
}

async function scoreMetrics(page) {
  const svg = page.locator('#sc svg');
  const box = await svg.boundingBox();
  const dimensions = await svg.evaluate(element => {
    const viewBox = element.viewBox.baseVal;
    return {width: viewBox.width, height: viewBox.height};
  });
  return {box, dimensions};
}

async function saveShowcaseScreenshot(page, fileName, trimBottomQuarter = false) {
  await page.addStyleTag({content: '.footer-actions,.site-footer{display:none!important}'});
  const clip = trimBottomQuarter
    ? {x: 0, y: 0, width: viewport.width, height: viewport.height * .75}
    : undefined;
  await page.screenshot({path: path.join(outputDir, fileName), clip});
}

async function scorePoint(page, x, y) {
  const {box, dimensions} = await scoreMetrics(page);
  return {
    x: box.x + x * box.width / dimensions.width,
    y: box.y + y * box.height / dimensions.height
  };
}

async function addMelody(page) {
  await addPatternMelody(page);
}

async function addPatternMelody(page, row = 0, chords = ['Am', 'F']) {
  const {dimensions} = await scoreMetrics(page);
  const measureWidth = (dimensions.width - 90) / chords.length;
  const yOffset = row * 178;
  await page.locator('[data-t="c"]').click();
  for (const [measure, chord] of chords.entries()) {
    await page.locator('#chord').fill(chord);
    const point = await scorePoint(page, 80 + measure * measureWidth + measureWidth * .18, 112 + yOffset);
    await page.mouse.click(point.x, point.y);
  }

  await page.locator('[data-t="n"]').click();
  for (let measure = 0; measure < chords.length; measure++) {
    for (const [position, y] of [[.12, 158], [.34, 148], [.58, 138], [.82, 148]]) {
      const point = await scorePoint(page, 80 + measure * measureWidth + measureWidth * position, y + yOffset);
      await page.mouse.click(point.x, point.y);
    }
  }
}

async function renameActivePattern(page, name) {
  await page.locator('#patternName').fill(name);
  await page.locator('#patternName').dispatchEvent('input');
}

async function capturePatterns(browser) {
  const {context, page} = await openEditor(browser);
  try {
    await page.locator('#ti').fill('Riffbook');
    await page.locator('#au').fill('Verse and chorus');
    await setPageWidth(page, '5');
    await page.locator('#sc svg').waitFor();
    await renameActivePattern(page, 'Riff 1 - Verse');
    await addPatternMelody(page, 0, ['Am', 'F']);
    await page.locator('[data-x="pat-add"]').click();
    await renameActivePattern(page, 'Riff 2 - Chorus');
    await addPatternMelody(page, 1, ['F', 'C']);
    const score = await page.evaluate(() => JSON.parse(localStorage.getItem('ns1')));
    const names = score.patterns.map(pattern => pattern.name);
    if (score.mode !== 'mel' || names.join('|') !== 'Riff 1 - Verse|Riff 2 - Chorus') {
      throw new Error(`Unexpected patterns screenshot state: ${score.mode}, ${names.join(', ')}`);
    }
    for (const pattern of score.patterns) {
      if (pattern.n !== 2) throw new Error(`Pattern "${pattern.name}" must have two measures`);
      const notes = Object.values(pattern.D.mel).flat(2).length;
      const chords = Object.keys(pattern.ch.mel || {}).length;
      if (!notes || !chords) throw new Error(`Pattern "${pattern.name}" is missing melody content`);
    }
    await page.locator('[data-t="n"]').click();
    await saveShowcaseScreenshot(page, '04-patterns.png', true);
  } finally {
    await context.close();
  }
}

async function captureMelody(browser, fileName, annotate) {
  const {context, page} = await openEditor(browser);
  try {
    await prepareScore(page, 'Evening Sketch');
    await addMelody(page);
    if (annotate) {
      await page.locator('[data-t="d"]').click();
      const paths = [
        [[190, 137], [196, 126], [207, 124], [217, 130], [219, 141], [211, 151], [199, 151], [190, 137]],
        [[230, 127], [246, 116], [260, 116], [252, 126], [238, 137], [260, 137]],
        [[550, 137], [557, 126], [569, 125], [580, 132], [581, 143], [572, 150], [559, 149], [550, 137]],
        [[590, 126], [606, 116], [621, 116], [612, 127], [599, 136], [621, 136]],
        [[545, 160], [573, 165], [604, 165], [634, 158]],
        [[1032, 137], [1041, 126], [1054, 126], [1063, 134], [1060, 145], [1048, 151], [1037, 146], [1032, 137]],
        [[1090, 161], [1118, 167], [1148, 166], [1174, 157]],
        [[1320, 117], [1299, 116], [1278, 121], [1258, 130], [1239, 139]],
        [[1239, 139], [1247, 128]],
        [[1239, 139], [1252, 139]],
        [[1490, 137], [1498, 126], [1510, 124], [1521, 131], [1521, 142], [1511, 150], [1498, 148], [1490, 137]],
        [[1635, 160], [1662, 166], [1690, 164], [1718, 154]]
      ];
      const {dimensions} = await scoreMetrics(page);
      const xScale = dimensions.width / 1930;
      for (const pathPoints of paths) {
        const first = await scorePoint(page, pathPoints[0][0] * xScale, pathPoints[0][1]);
        await page.mouse.move(first.x, first.y);
        await page.mouse.down();
        for (const [x, y] of pathPoints.slice(1)) {
          const point = await scorePoint(page, x * xScale, y);
          await page.mouse.move(point.x, point.y, {steps: 2});
        }
        await page.mouse.up();
      }
    }
    await verifyShowcaseState(page, 'mel', annotate ? 'annotations' : 'melody');
    await saveShowcaseScreenshot(page, fileName, annotate);
  } finally {
    await context.close();
  }
}

async function captureDrums(browser) {
  const {context, page} = await openEditor(browser);
  try {
    await page.locator('[data-m="drm"]').click();
    await page.locator('#ti').fill('Pocket Groove');
    await page.locator('#au').fill('Original example');
    await setPageWidth(page, '5');
    await page.locator('[data-x="add"]').click();
    const hits = [[0, 0], [0, 4], [0, 8], [0, 12], [4, 4], [4, 12], [6, 0], [6, 6], [6, 10]];
    for (const [lane, step] of hits) await page.locator(`[data-g="${lane},${step}"]`).click();
    await verifyShowcaseState(page, 'drm', 'drums');
    await saveShowcaseScreenshot(page, '02-drums-grid.png');
  } finally {
    await context.close();
  }
}

async function main() {
  await fs.mkdir(outputDir, {recursive: true});
  const browser = await chromium.launch({headless: true});
  try {
    await captureMelody(browser, '01-melody.png', false);
    await captureDrums(browser);
    await captureMelody(browser, '03-melody-annotations.png', true);
    await capturePatterns(browser);
  } finally {
    await browser.close();
  }
  console.log(`Updated About page screenshots in ${outputDir}`);
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});

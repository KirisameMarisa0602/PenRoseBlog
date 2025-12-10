/*
 * @Description: 抓取 bilibili 首页 banner 动效资源，保存到 public/banner 并维护 manifest.json
 * 运行：npm run banner:grab -- --name "主题名称" --id 2025-11-12
 */
// CommonJS，避免受 package.json type:module 影响
const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const argv = (() => {
  const o = {};
  for (let i = 2; i < process.argv.length; i++) {
    const a = process.argv[i];
    const b = process.argv[i + 1];
    if (a.startsWith('--')) { o[a.slice(2)] = b && !b.startsWith('--') ? (i++, b) : true; }
  }
  return o;
})();

console.log('正在下载资源中...');

let saveFolder = '';
const today = new Date();
const year = today.getFullYear();
const month = ('0' + (today.getMonth() + 1)).slice(-2);
const day = ('0' + today.getDate()).slice(-2);
const date = year + '-' + month + '-' + day;

// 输出目录：public/banner
const bannerRoot = path.resolve(__dirname, '../../../public/banner');
const assetsRoot = path.join(bannerRoot, 'assets');
const id = (argv.id && String(argv.id)) || date;
const themeName = (argv.name && String(argv.name)) || id;

const folderPath = path.join(assetsRoot, id);
if (fs.existsSync(folderPath)) {
  fs.readdirSync(folderPath).forEach((file) => {
    const filePath = path.join(folderPath, file);
    fs.unlinkSync(filePath);
  });
} else {
  fs.mkdirSync(folderPath, { recursive: true });
}
saveFolder = folderPath;

const data = [];

(async () => {
  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  const page = await browser.newPage();
  page.setViewport({ width: 1650, height: 800 });

  try {
    await page.goto('https://www.bilibili.com/', { waitUntil: 'domcontentloaded' });
    await sleep(1000);
    await page.goto('https://www.bilibili.com/', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('.animated-banner');
    await sleep(2000);

    let layerElements = await page.$$('.animated-banner .layer');
    for (let i = 0; i < layerElements.length; i++) {
      const layerFirstChild = await page.evaluate(async (el) => {
        const pattern = /translate\(([-.\d]+px), ([-.\d]+px)\)/;
        const { width, height, src, style, tagName } = el.firstElementChild;
        const matches = style.transform.match(pattern);
        const transform = [1, 0, 0, 1, ...matches.slice(1).map((x) => +x.replace('px', ''))];
        return { tagName: tagName.toLowerCase(), opacity: [style.opacity, style.opacity], transform, width, height, src, a: 0.01 };
      }, layerElements[i]);
      await download(layerFirstChild);
    }

  
    const element = await page.$('.animated-banner');
    const box = await element.boundingBox();
    await page.mouse.move(box.x + 0, box.y + 50);
    await page.mouse.move(box.x + 1000, box.y, { steps: 1 });
    await sleep(1200);

    layerElements = await page.$$('.animated-banner .layer');
    for (let i = 0; i < layerElements.length; i++) {
      const skew = await page.evaluate(async (el) => {
        const pattern = /translate\(([-.\d]+px), ([-.\d]+px)\)/;
        const matches = el.firstElementChild.style.transform.match(pattern);
        return matches.slice(1).map((x) => +x.replace('px', ''))[0];
      }, layerElements[i]);
      data[i].a = (skew - data[i].transform[4]) / 1000;
    }
  } catch (error) {
    console.error('Error:', error);
  }

  async function download(item) {
    const fileArr = item.src.split('/');
    const fileName = fileArr[fileArr.length - 1];
    const filePath = path.join(saveFolder, fileName);

    const content = await page.evaluate(async (url) => {
      const response = await fetch(url);
      const buffer = await response.arrayBuffer();
      return { buffer: Array.from(new Uint8Array(buffer)) };
    }, item.src);
    const fileData = Buffer.from(content.buffer);
    fs.writeFileSync(filePath, fileData);
  
    data.push({ ...item, src: `./assets/${id}/${fileName}` });
  }

  fs.writeFileSync(path.join(saveFolder, `data.json`), JSON.stringify(data, null, 2));

  console.log('正在写入本地文件...');

  await sleep(300);

  
  const manifestPath = path.join(bannerRoot, 'manifest.json');
  let manifest = [];
  try { manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8')); } catch { manifest = []; }
  if (!Array.isArray(manifest)) manifest = [];
  const idx = manifest.findIndex((m) => m.id === id);
  const entry = { id, name: themeName, createdAt: date };
  if (idx >= 0) manifest[idx] = entry; else manifest.unshift(entry);
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));

  await sleep(300);
  await browser.close();
  console.log(`完成，主题: ${themeName} (id: ${id})，可刷新页面查看。`);
})();

function sleep(timeout) {
  return new Promise((resolve) => setTimeout(resolve, timeout));
}

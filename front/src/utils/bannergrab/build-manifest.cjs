const fs = require('fs');
const path = require('path');

const bannerRoot = path.resolve(__dirname, '../../../public/banner');
const assetsRoot = path.join(bannerRoot, 'assets');
const manifestPath = path.join(bannerRoot, 'manifest.json');

function isDir(p) { try { return fs.statSync(p).isDirectory(); } catch { return false; } }
function guessCreatedAtFromId(id) {
 
  const m = /^([0-9]{4})-([0-9]{2})-([0-9]{2})$/.exec(id);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  return null;
}

function main() {
  if (!isDir(assetsRoot)) {
    console.error('目录不存在：', assetsRoot);
    process.exit(1);
  }
  const ids = fs.readdirSync(assetsRoot).filter((name) => isDir(path.join(assetsRoot, name)));
  const items = ids.map((id) => {
    const dir = path.join(assetsRoot, id);
    let createdAt = guessCreatedAtFromId(id);
    if (!createdAt) {
      try {
        const stat = fs.statSync(dir);
        const d = new Date(stat.mtime);
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        createdAt = `${d.getFullYear()}-${mm}-${dd}`;
      } catch {
        createdAt = id;
      }
    }
    return { id, name: id, createdAt };
  });
  items.sort((a, b) => (a.createdAt < b.createdAt ? 1 : a.createdAt > b.createdAt ? -1 : 0));
  fs.mkdirSync(bannerRoot, { recursive: true });
  fs.writeFileSync(manifestPath, JSON.stringify(items, null, 2));
  console.log(`已生成 ${manifestPath}，共 ${items.length} 个主题。`);
}

main();

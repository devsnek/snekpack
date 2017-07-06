const fs = require('fs');
const hbs = require('handlebars');
const outputTemplate = hbs.compile(open('./templates/output.hbs'), { noEscape: true });

const REQUIRE_RE = /require\(['"](.+?)['"]\)/g;

const polyfills = require('node-libs-browser');

function snekpack(name) {
  const modules = [];
  modules.get = (id) => modules.find(m => m.id === id);
  const base = path.dirname(path.resolve(name));

  (function pack(file, callee) {
    let { src, resolved } = resolve(file, base, callee);
    let match;
    while ((match = REQUIRE_RE.exec(src))) {
      const dep = match[1].startsWith('.') ? path.join(path.dirname(file), match[1]) : match[1];
      if (modules.get(dep)) continue;
      const r = new RegExp(`require\\(['"]${match[1].replace('.', '\\.')}['"]\\)`, 'g');
      src = src.replace(r, `__snekpack_require__(${modules.length})`);
      pack(dep, resolved);
    }
    modules.push({
      id: resolved,
      src,
    });
  }(path.basename(name)));

  modules.entry = modules.indexOf(modules.get(name));

  return outputTemplate({
    modules: modules
      .map(m => `function(module, exports, __snekpack_require__) {\n  ${m.src.trim().replace(/\n/g, '\n  ')}\n}`)
      .join(',\n'),
    entry: modules.entry,
    __snekpack_require__: open('./templates/__snekpack_require__.js').replace(/\n/g, '\n  '),
  });
}

function open(filename) {
  return fs.readFileSync(require.resolve(filename)).toString().trim();
}

function resolve(filename, base, callee) {
  if (polyfills[filename]) {
    const main = polyfills[filename];
    return {
      src: fs.readFileSync(main).toString(),
      resolved: filename,
    };
  }

  let file = path.join(base, filename);
  try {
    if (fs.lstatSync(file).isDirectory()) file = path.join(file, 'index.js');
  } catch (err) {}

  try {
    return { src: fs.readFileSync(file).toString(), resolved: file };
  } catch (err) {}
  try {
    const resolved = `${file}.js`;
    return { src: fs.readFileSync(resolved).toString(), resolved };
  } catch (err) {}
  try {
    const resolved = `${file}.json`;
    return { src: fs.readFileSync(resolved).toString(), resolved };
  } catch (err) {}

  for (let i = 3; i >= 0; i--) {
    try {
      const dir = path.join(path.dirname(callee), '../'.repeat(i), 'node_modules', filename);
      const package = JSON.parse(fs.readFileSync(path.join(dir, 'package.json')));
      const resolved = path.join(dir, package.main);
      return { src: fs.readFileSync(resolved).toString(), resolved };
    } catch (err) {}
  }

  return { src: 'module.exports = {};', resolved: file };
}

module.exports = snekpack;

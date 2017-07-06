const fs = require('fs');
const hbs = require('handlebars');
const outputTemplate = hbs.compile(open('./templates/output.hbs'), { noEscape: true });

const REQUIRE_RE = /require\(['"](.+?)['"]\)/g;

function snekpack(name) {
  const modules = [];
  modules.get = (id) => modules.find(m => m.id === id);
  (function pack(file) {
    let src = fs.readFileSync(file).toString();
    let match;
    while ((match = REQUIRE_RE.exec(src))) {
      const dep = path.join(path.dirname(file), match[1]);
      if (modules.get(dep)) continue;
      const r = new RegExp(`require\\(['"]${match[1].replace('.', '\\.')}['"]\\)`, 'g');
      src = src.replace(r, `__snekpack_require__(${modules.length})`);
      pack(dep);
    }
    modules.push({
      id: file,
      src,
    });
  }(name));
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

module.exports = snekpack;

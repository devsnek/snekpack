const hbs = require('handlebars');
const outputTemplate = hbs.compile(
  fs.readFileSync(require.resolve('./templates/output.hbs')).toString(),
  { noEscape: true }
);

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
      .map(m => `function(module, exports, __snekpack_require__) {\n  ${m.src.trim().split('\n').join('\n  ')}\n}`)
      .join(',\n'),
    entry: modules.entry,
  });
}

module.exports = snekpack;

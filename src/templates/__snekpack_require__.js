const installed = {};

function __snekpack_require__(id) {
  if (installed[id]) return installed[id].exports;

  const module = installed[id] = {
    id,
    loaded: false,
    exports: {},
  };

  modules[id].call(module.exports, module, module.exports, __snekpack_require__);

  module.loaded = true;

  return module.exports.__esModule ? module.exports.default : module.exports;
}

__snekpack_require__(__snekpack_require__.entry = {{entry}});

// Generic Pyodide worker: runs a bot (load/move) and also serves referee queries.
const PYODIDE = "https://cdn.jsdelivr.net/pyodide/v0.27.7/full/";
importScripts(PYODIDE + "pyodide.js");

let py = null;
let api = null;

async function init(files) {
  py = await loadPyodide({ indexURL: PYODIDE });
  await py.loadPackage("micropip");
  await py.runPythonAsync(`import micropip; await micropip.install("chess")`);
  for (const [name, url] of Object.entries(files)) {
    py.FS.writeFile("/home/pyodide/" + name, await (await fetch(url)).text());
  }
  py.runPython(`import sys; sys.path.insert(0, "/home/pyodide")`);
  api = py.pyimport("bot_api");
}

const handlers = {
  async init({ files }) { await init(files); return true; },
  load({ src, name }) { return api.load_bot(src, name) ?? null; },
  move({ fen, timeLeft }) {
    const r = api.get_move(fen, timeLeft);
    const [uci, err, out] = r.toJs(); r.destroy();
    return { uci, err, out };
  },
  status({ start, ucis }) {
    const r = api.history_status(start, py.toPy(ucis));
    const o = r.toJs({ dict_converter: Object.fromEntries }); r.destroy();
    return o;
  },
  san({ start, ucis, uci }) {
    const r = api.push("", py.toPy(ucis), start, uci);
    const [san, fen] = r.toJs(); r.destroy();
    return { san, fen };
  },
  pgn({ start, ucis, white, black, result }) {
    return api.make_pgn(start, py.toPy(ucis), white, black, result);
  },
};

self.onmessage = async (e) => {
  const { id, cmd, ...args } = e.data;
  try {
    self.postMessage({ id, ok: true, value: await handlers[cmd](args) });
  } catch (err) {
    self.postMessage({ id, ok: false, error: String(err) });
  }
};

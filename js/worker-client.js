// Promise wrapper around a bot-worker. A runaway bot is killed by terminating its worker.
const abs = (p) => new URL(p, document.baseURI).href; // workers resolve relative to js/
const FILES = { "bot_api.py": abs("py/bot_api.py"), "pybot.py": abs("py/engines/pybot.py") };

export class PyWorker {
  constructor() { this.start(); }
  start() {
    this.w = new Worker("js/bot-worker.js");
    this.n = 0; this.pending = new Map();
    this.w.onmessage = (e) => {
      const p = this.pending.get(e.data.id);
      if (!p) return;
      this.pending.delete(e.data.id);
      e.data.ok ? p.res(e.data.value) : p.rej(new Error(e.data.error));
    };
    this.ready = this.call("init", { files: FILES });
  }
  call(cmd, args = {}) {
    return new Promise((res, rej) => {
      const id = ++this.n;
      this.pending.set(id, { res, rej });
      this.w.postMessage({ id, cmd, ...args });
    });
  }
  // Wall-clock limit; on timeout the worker is killed and restarted. Returns {timeout:true}.
  async callTimed(cmd, args, ms) {
    let timer;
    const timeout = new Promise((r) => { timer = setTimeout(() => r({ timeout: true }), ms); });
    const result = await Promise.race([this.call(cmd, args), timeout]);
    clearTimeout(timer);
    if (result && result.timeout) await this.restart();
    return result;
  }
  kill() {
    this.w.terminate();
    const stale = [...this.pending.values()];
    this.pending.clear();
    stale.forEach((p) => p.res({ aborted: true }));
  }
  async restart() { this.kill(); this.start(); await this.ready; }
}

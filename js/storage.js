const KEY = "chessbots.v1";
const read = () => JSON.parse(localStorage.getItem(KEY) || "{}");
export const listBots = () => Object.keys(read()).sort();
export const getBot = (n) => read()[n];
export function saveBot(name, src) { const d = read(); d[name] = src; localStorage.setItem(KEY, JSON.stringify(d)); }
export function deleteBot(name) { const d = read(); delete d[name]; localStorage.setItem(KEY, JSON.stringify(d)); }
export const loadDraft = () => localStorage.getItem("chessbots.draft");
export const saveDraft = (s) => localStorage.setItem("chessbots.draft", s);
export function download(filename, text) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([text], { type: "text/plain" }));
  a.download = filename; a.click(); URL.revokeObjectURL(a.href);
}

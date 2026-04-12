const fs = require("fs");
const path = require("path");

function walk(dir) {
  const out = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name === "node_modules" || e.name === ".git") continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...walk(p));
    else if (/\.(tsx|ts|jsx|js)$/.test(e.name)) out.push(p);
  }
  return out;
}

const root = path.join(__dirname, "..");
// Navigation / screen-ish keys that must be boolean in native
const boolKeys =
  /(headerShown|gestureEnabled|fullScreenGestureEnabled|freezeOnBlur|detachPreviousScreen|statusBarAnimated|homeIndicatorHidden|navigationBarHidden|replaceAnimation|popToTop|swipeEnabled|keyboardHandlingEnabled|automaticallyAdjustKeyboardInsets)\s*:\s*["'](true|false)["']/;

for (const f of walk(root)) {
  const c = fs.readFileSync(f, "utf8");
  const lines = c.split("\n");
  lines.forEach((line, i) => {
    if (boolKeys.test(line)) {
      console.log(`${path.relative(root, f)}:${i + 1}: ${line.trim()}`);
    }
    // JSX attr = "true"
    if (/=\s*["'](true|false)["']/.test(line) && !line.includes("//")) {
      console.log(`JSX? ${path.relative(root, f)}:${i + 1}: ${line.trim()}`);
    }
  });
}

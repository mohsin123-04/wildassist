// Accessibility audit: run axe-core against every page (incl. logged-in) and
// report WCAG violations. Dev-only utility.  node scripts/a11y-audit.mjs
import puppeteer from "puppeteer-core";
import { readFileSync } from "node:fs";

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const B = process.env.BASE || "https://wildassist.vercel.app";
const axeSource = readFileSync("./node_modules/axe-core/axe.min.js", "utf8");

const br = await puppeteer.launch({
  executablePath: CHROME,
  headless: "new",
  args: ["--no-sandbox"],
});
const page = await br.newPage();
await page.setViewport({ width: 1280, height: 900 });

async function audit(name) {
  await new Promise((r) => setTimeout(r, 700));
  await page.evaluate(axeSource);
  const results = await page.evaluate(async () => {
    // Only serious/critical WCAG 2 A/AA rules, to cut noise.
    const r = await window.axe.run(document, {
      runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"] },
    });
    return r.violations.map((v) => ({
      id: v.id,
      impact: v.impact,
      help: v.help,
      count: v.nodes.length,
      sample: v.nodes[0]?.target?.join(" ") ?? "",
    }));
  });
  const serious = results.filter((v) => v.impact === "serious" || v.impact === "critical");
  console.log(`\n===== ${name} =====`);
  if (serious.length === 0) console.log("  no serious/critical violations ✅");
  for (const v of serious) {
    console.log(`  [${v.impact}] ${v.id} ×${v.count} — ${v.help}\n     e.g. ${v.sample}`);
  }
}

for (const [name, path] of [
  ["home", "/"],
  ["triage", "/triage"],
  ["emergency", "/emergency"],
  ["login", "/login"],
]) {
  await page.goto(B + path, { waitUntil: "networkidle2" });
  await audit(name);
}

// Logged in
await page.goto(B + "/login", { waitUntil: "networkidle2" });
await page.type('input[type="email"]', "staff@wildassist.ca");
await page.type('input[type="password"]', "wildlife2026");
await page.click('button[type="submit"]');
await page.waitForNavigation({ waitUntil: "networkidle2" }).catch(() => {});
await new Promise((r) => setTimeout(r, 1500));
for (const [name, path] of [
  ["dashboard", "/dashboard"],
  ["analytics", "/analytics"],
  ["messages", "/messages"],
  ["profile", "/profile"],
]) {
  await page.goto(B + path, { waitUntil: "networkidle2" });
  await audit(name);
}
await br.close();

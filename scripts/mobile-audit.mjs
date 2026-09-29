// Mobile audit: emulate an iPhone, measure horizontal overflow, and screenshot
// each page (including logged-in pages via demo creds). Dev-only utility.
//   node scripts/mobile-audit.mjs
import puppeteer from "puppeteer-core";

const CHROME =
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const BASE = process.env.BASE || "https://wildassist.vercel.app";
const OUT = "/tmp";
const IPHONE = {
  width: 390,
  height: 844,
  deviceScaleFactor: 3,
  isMobile: true,
  hasTouch: true,
};

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: "new",
  args: ["--no-sandbox", "--hide-scrollbars"],
});

async function audit(page, name) {
  // Give lazy content a beat.
  await new Promise((r) => setTimeout(r, 800));
  const m = await page.evaluate(() => ({
    docW: document.documentElement.scrollWidth,
    winW: window.innerWidth,
    // Elements that stick out past the viewport's right edge.
    offenders: [...document.querySelectorAll("*")]
      .filter((el) => el.getBoundingClientRect().right > window.innerWidth + 1)
      .slice(0, 8)
      .map((el) => {
        const r = el.getBoundingClientRect();
        return `${el.tagName.toLowerCase()}${
          el.className && typeof el.className === "string"
            ? "." + el.className.split(" ").slice(0, 3).join(".")
            : ""
        } (right=${Math.round(r.right)})`;
      }),
  }));
  const overflow = m.docW > m.winW + 1;
  console.log(
    `${overflow ? "❌ OVERFLOW" : "✅ ok      "} ${name.padEnd(14)} docW=${m.docW} winW=${m.winW}` +
      (overflow ? `\n     offenders: ${m.offenders.join(" | ")}` : "")
  );
  await page.screenshot({ path: `${OUT}/wa-mob-${name}.png`, fullPage: true });
}

const page = await browser.newPage();
await page.emulate({ viewport: IPHONE, userAgent:
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1" });

// Public pages
for (const [name, path] of [
  ["home", "/"],
  ["triage", "/triage"],
  ["emergency", "/emergency"],
  ["login", "/login"],
]) {
  await page.goto(BASE + path, { waitUntil: "networkidle2", timeout: 30000 });
  await audit(page, name);
}

// Log in with demo staff creds, then audit the app pages.
try {
  await page.goto(BASE + "/login", { waitUntil: "networkidle2" });
  await page.type('input[type="email"]', "staff@wildassist.ca");
  await page.type('input[type="password"]', "wildlife2026");
  await page.click('button[type="submit"]');
  await page.waitForNavigation({ waitUntil: "networkidle2", timeout: 20000 }).catch(() => {});
  await new Promise((r) => setTimeout(r, 1500));
  for (const [name, path] of [
    ["dashboard", "/dashboard"],
    ["analytics", "/analytics"],
    ["messages", "/messages"],
    ["profile", "/profile"],
  ]) {
    await page.goto(BASE + path, { waitUntil: "networkidle2", timeout: 30000 });
    await audit(page, name);
  }
} catch (e) {
  console.log("auth pages skipped:", e.message);
}

await browser.close();

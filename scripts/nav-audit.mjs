// Navigation audit: verify every page has a way out, footer nav works, and the
// tracking page is no longer a dead-end. Real clicks on desktop + mobile.
//   node scripts/nav-audit.mjs <trackToken>
import puppeteer from "puppeteer-core";

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const BASE = process.env.BASE || "https://wildassist.vercel.app";
const TOKEN = process.argv[2];

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: "new",
  args: ["--no-sandbox"],
});

async function hrefs(page) {
  return page.$$eval("a", (as) => as.map((a) => a.getAttribute("href")));
}

async function run(label, viewport) {
  const page = await browser.newPage();
  await page.setViewport(viewport);
  console.log(`\n===== ${label} =====`);

  // Footer nav present on a content page?
  await page.goto(BASE + "/triage", { waitUntil: "networkidle2" });
  const triageLinks = await hrefs(page);
  const footerOk = ["/", "/triage", "/emergency", "/login"].every((h) =>
    triageLinks.includes(h)
  );
  console.log(`footer nav on /triage: ${footerOk ? "✅" : "❌ " + triageLinks.join(",")}`);

  // Header logo → home (click it).
  await page.goto(BASE + "/emergency", { waitUntil: "networkidle2" });
  await page.click('header a[href="/"]');
  await page.waitForNavigation({ waitUntil: "networkidle2" }).catch(() => {});
  console.log(`header logo → home: ${new URL(page.url()).pathname === "/" ? "✅" : "❌ " + page.url()}`);

  // Footer "Report an animal" click → /triage.
  await page.goto(BASE + "/emergency", { waitUntil: "networkidle2" });
  await page.evaluate(() => {
    const a = [...document.querySelectorAll("footer a")].find(
      (x) => x.textContent.trim() === "Report an animal"
    );
    a && a.click();
  });
  await page.waitForNavigation({ waitUntil: "networkidle2" }).catch(() => {});
  console.log(`footer "Report an animal" → triage: ${new URL(page.url()).pathname === "/triage" ? "✅" : "❌ " + page.url()}`);

  // Tracking page: no longer a dead-end.
  if (TOKEN) {
    await page.goto(`${BASE}/track/${TOKEN}`, { waitUntil: "networkidle2" });
    const trackLinks = await hrefs(page);
    const hasForward = trackLinks.includes("/triage") && trackLinks.includes("/emergency");
    const hasHome = trackLinks.includes("/");
    console.log(`track page CTAs (report/emergency): ${hasForward ? "✅" : "❌"}`);
    console.log(`track page home reachable: ${hasHome ? "✅" : "❌"}`);
    await page.screenshot({ path: `/tmp/wa-track-${label}.png`, fullPage: true });
  }
  await page.close();
}

await run("desktop", { width: 1280, height: 900 });
await run("mobile", { width: 390, height: 844, isMobile: true, hasTouch: true });
await browser.close();

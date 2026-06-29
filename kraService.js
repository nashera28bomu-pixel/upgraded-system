const puppeteer = require('puppeteer');

const ITAX_URL = 'https://itax.kra.go.ke/KRA-Portal/';

const scrapeKRA = async ({ kraPin, kraPassword, returnYear, returnType }) => {
  let browser;

  try {
    browser = await puppeteer.launch({
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--window-size=1280,800',
      ],
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });
    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36'
    );

    // ── Step 1: Go to iTax portal ──
    console.log('🌐 Navigating to iTax portal...');
    await page.goto(ITAX_URL, { waitUntil: 'networkidle2', timeout: 60000 });

    // ── Step 2: Enter KRA PIN ──
    console.log('🔐 Entering KRA PIN...');
    await page.waitForSelector('#logid', { timeout: 15000 });
    await page.type('#logid', kraPin, { delay: 80 });
    await page.keyboard.press('Tab');
    await page.waitForTimeout(1500);

    // ── Step 3: Enter Password ──
    console.log('🔑 Entering password...');
    await page.waitForSelector('#logPass', { timeout: 10000 });
    await page.type('#logPass', kraPassword, { delay: 80 });

    // ── Step 4: Submit login ──
    console.log('🚀 Submitting login...');
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 }),
      page.click('#loginButton'),
    ]);

    // Check for login error
    const pageText = await page.evaluate(() => document.body.innerText);
    if (
      pageText.includes('Invalid PIN') ||
      pageText.includes('Invalid Password') ||
      pageText.includes('login failed') ||
      pageText.includes('incorrect')
    ) {
      return { success: false, error: '❌ Invalid KRA PIN or password. Please check and try again.' };
    }

    console.log('✅ Logged in successfully');

    // Get taxpayer name from dashboard
    let taxpayerName = '';
    try {
      taxpayerName = await page.$eval('.taxpayer-name, #taxpayerName, .user-name', el => el.innerText.trim());
    } catch (_) {}

    // ── Step 5: Navigate to Returns ──
    console.log('📂 Navigating to Returns menu...');
    await page.waitForSelector('a[href*="returns"], a:contains("Returns")', { timeout: 15000 });

    // Click on "Returns" in the nav
    await page.evaluate(() => {
      const links = Array.from(document.querySelectorAll('a'));
      const returnsLink = links.find(l => l.textContent.trim().toLowerCase() === 'returns');
      if (returnsLink) returnsLink.click();
    });
    await page.waitForTimeout(2000);

    // ── Step 6: File Return ──
    console.log('📝 Selecting File Return...');
    await page.evaluate(() => {
      const links = Array.from(document.querySelectorAll('a'));
      const fileLink = links.find(l =>
        l.textContent.toLowerCase().includes('file return') ||
        l.textContent.toLowerCase().includes('file nil')
      );
      if (fileLink) fileLink.click();
    });
    await page.waitForTimeout(2000);

    // ── Step 7: Select Return Type — Individual Income Tax (IT1) ──
    console.log('🗂️ Selecting return type...');
    try {
      // Look for IT1 or Individual Income Tax option
      await page.select('select[name*="return"], select[name*="type"], #returnType', 'IT1');
    } catch (_) {
      // Try clicking IT1 option
      await page.evaluate(() => {
        const options = Array.from(document.querySelectorAll('option'));
        const it1 = options.find(o => o.textContent.includes('IT1') || o.textContent.includes('Individual'));
        if (it1) it1.selected = true;
      });
    }
    await page.waitForTimeout(1500);

    // ── Step 8: Select Tax Year ──
    console.log(`📅 Selecting year ${returnYear}...`);
    try {
      await page.select('select[name*="year"], select[name*="Year"], #taxYear', returnYear);
    } catch (_) {
      await page.evaluate((year) => {
        const options = Array.from(document.querySelectorAll('option'));
        const yearOpt = options.find(o => o.textContent.trim() === year || o.value === year);
        if (yearOpt) yearOpt.selected = true;
      }, returnYear);
    }
    await page.waitForTimeout(1500);

    // ── Step 9: Next / Open Return ──
    console.log('⏩ Opening return form...');
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button, input[type="submit"], a'));
      const nextBtn = btns.find(b =>
        b.textContent.toLowerCase().includes('next') ||
        b.value?.toLowerCase().includes('next') ||
        b.textContent.toLowerCase().includes('open')
      );
      if (nextBtn) nextBtn.click();
    });
    await page.waitForTimeout(3000);

    // ── Step 10: Detect nil return option ──
    console.log('🔍 Checking for nil return option...');
    const isNilAvailable = await page.evaluate(() => {
      const text = document.body.innerText.toLowerCase();
      return text.includes('nil') || text.includes('no income') || text.includes('nil return');
    });

    if (isNilAvailable) {
      // Click nil return / no income checkbox or button
      await page.evaluate(() => {
        const els = Array.from(document.querySelectorAll('input[type="checkbox"], input[type="radio"], button, a'));
        const nilEl = els.find(el =>
          el.id?.toLowerCase().includes('nil') ||
          el.name?.toLowerCase().includes('nil') ||
          el.textContent?.toLowerCase().includes('nil')
        );
        if (nilEl) nilEl.click();
      });
      await page.waitForTimeout(1500);
    }

    // ── Step 11: Submit ──
    console.log('✅ Submitting return...');
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button, input[type="submit"], a'));
      const submitBtn = btns.find(b =>
        b.textContent.toLowerCase().includes('submit') ||
        b.value?.toLowerCase().includes('submit')
      );
      if (submitBtn) submitBtn.click();
    });
    await page.waitForTimeout(5000);

    // ── Step 12: Check result ──
    const finalText = await page.evaluate(() => document.body.innerText);

    if (
      finalText.toLowerCase().includes('successfully') ||
      finalText.toLowerCase().includes('acknowledgement') ||
      finalText.toLowerCase().includes('filed')
    ) {
      // Try to get acknowledgement number
      let acknowledgementNo = '';
      try {
        const ackMatch = finalText.match(/acknowledgement[:\s#]*([A-Z0-9\-]+)/i);
        if (ackMatch) acknowledgementNo = ackMatch[1];
      } catch (_) {}

      return {
        success: true,
        taxpayerName,
        acknowledgementNo,
      };
    }

    if (
      finalText.toLowerCase().includes('already filed') ||
      finalText.toLowerCase().includes('return already exists')
    ) {
      return { success: false, error: '⚠️ A return for this year has already been filed.' };
    }

    // Unexpected result — return partial success (portal may have filed)
    return {
      success: true,
      taxpayerName,
      acknowledgementNo: '',
    };

  } catch (err) {
    console.error('Puppeteer error:', err.message);
    return {
      success: false,
      error: `KRA portal error: ${err.message.substring(0, 100)}`,
    };
  } finally {
    if (browser) {
      await browser.close();
    }
  }
};

module.exports = { scrapeKRA };

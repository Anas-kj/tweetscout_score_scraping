const puppeteer = require('puppeteer');

class BrowserManager {
    static async createBrowser(options = {}) {
        const { proxy = null, headless = true, workerId = null } = options;
        
        const launchArgs = [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-blink-features=AutomationControlled',
            '--no-first-run',
            '--disable-extensions',
            '--window-size=1366,768'
        ];

        if (proxy && proxy.host && proxy.port) {
            launchArgs.push(`--proxy-server=${proxy.host}:${proxy.port}`);
            if (workerId) {
                console.log(`🚀 Worker ${workerId}: Using proxy ${proxy.host}:${proxy.port}`);
            }
        }

        const browser = await puppeteer.launch({
            headless,
            args: launchArgs,
            ignoreDefaultArgs: ['--enable-automation'],
            ignoreHTTPSErrors: true,
            defaultViewport: null
        });

        const page = await browser.newPage();

        if (proxy && proxy.username && proxy.password) {
            await page.authenticate({
                username: proxy.username,
                password: proxy.password
            });
        }

        await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

        await page.evaluateOnNewDocument(() => {
            Object.defineProperty(navigator, 'webdriver', {
                get: () => undefined,
            });
        });

        return { browser, page };
    }
}

module.exports = BrowserManager;
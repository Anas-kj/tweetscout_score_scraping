const fs = require('fs').promises;

class CookieManager {
    static async saveCookies(page, filename = 'tweetscout_cookies.json') {
        try {
            const cookies = await page.cookies();
            const cookieData = {
                cookies: cookies,
                timestamp: Date.now(),
                userAgent: await page.evaluate(() => navigator.userAgent)
            };

            await fs.writeFile(filename, JSON.stringify(cookieData, null, 2));
            console.log(`✅ Saved ${cookies.length} cookies to ${filename}`);
            return true;
        } catch (error) {
            console.error(`❌ Failed to save cookies to ${filename}:`, error.message);
            return false;
        }
    }

    static async loadCookies(page, filename = 'tweetscout_cookies.json') {
        try {
            const data = await fs.readFile(filename, 'utf8');
            const cookieData = JSON.parse(data);

            if (Date.now() - cookieData.timestamp > 86400000) {
                console.log(`⚠️  Cookies in ${filename} are too old`);
                return false;
            }

            await page.setCookie(...cookieData.cookies);
            console.log(`✅ Loaded ${cookieData.cookies.length} cookies from ${filename}`);
            return true;
        } catch (error) {
            console.log(`No saved cookies found at ${filename}`);
            return false;
        }
    }
}

module.exports = CookieManager;
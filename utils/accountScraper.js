
class AccountScraper {
    static async scrapeAccountScore(page, accountName, workerId = null) {
        try {
            const logPrefix = workerId ? `Worker ${workerId}:` : '';
            console.log(`   ${logPrefix} Searching for account: @${accountName}`);
            
            const url = `https://app.tweetscout.io/search?q=${accountName}`;
            await page.goto(url, { waitUntil: 'networkidle0', timeout: 15000 });

            const scoreSelector = '.AccountPage_score_box__hL7Hk .AccountPage_score_val__S6GJ7 p';
            await page.waitForSelector(scoreSelector, { timeout: 10000 });

            const scoreText = await page.$eval(scoreSelector, el => el.textContent.trim());

            console.log(`✅ ${logPrefix} Found score for @${accountName}: ${scoreText}`);
            return {
                account: accountName,
                score: scoreText,
                workerId: workerId,
                timestamp: new Date().toISOString(),
                success: true
            };
        } catch (error) {
            const logPrefix = workerId ? `Worker ${workerId}:` : '';
            console.error(`❌ ${logPrefix} Failed to scrape score for @${accountName}: ${error.message}`);
            return {
                account: accountName,
                score: 'N/A',
                error: error.message,
                workerId: workerId,
                timestamp: new Date().toISOString(),
                success: false
            };
        }
    }
}

module.exports = AccountScraper;
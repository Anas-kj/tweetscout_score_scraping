const BrowserManager = require('../utils/browserManager');
const CookieManager = require('../utils/cookieManager');
const CloudflareHandler = require('../utils/cloudflareHandler');
const AccountScraper = require('../utils/accountScraper');
const ResultManager = require('../utils/resultManager');

class ManualScraper {
    constructor(options = {}) {
        this.headless = options.headless || false;
        this.baseUrl = options.baseUrl || 'https://app.tweetscout.io/';
        this.cookieFile = options.cookieFile || 'tweetscout_cookies.json';
        this.delayRange = options.delayRange || [5000, 20000]; // 5-20 seconds delay
    }

    async setup() {
        console.log('🔧 MANUAL SETUP MODE - CLOUDFLARE BYPASS');
        console.log('='.repeat(50));
        console.log('1. Browser will open and navigate to TweetScout');
        console.log('2. Solve the Cloudflare challenge manually');
        console.log('3. Press Enter when Cloudflare is solved');
        console.log('4. Cookies will be saved automatically');
        console.log('='.repeat(50));
    
        const readline = require('readline').createInterface({
            input: process.stdin,
            output: process.stdout
        });
    
        await new Promise(resolve => {
            readline.question('Press Enter to open browser...', () => {
                readline.close();
                resolve();
            });
        });
    
        let browser, page;
    
        try {
            // Setup browser (force non-headless for setup)
            const browserSetup = await BrowserManager.createBrowser({ 
                headless: false 
            });
            browser = browserSetup.browser;
            page = browserSetup.page;
    
            console.log(`🌐 Navigating to ${this.baseUrl}`);
            await page.goto(this.baseUrl, { 
                waitUntil: 'networkidle2',
                timeout: 30000 
            });
    
            // Check for Cloudflare
            if (await CloudflareHandler.isCloudflareChallenge(page)) {
                console.log('☁️  Cloudflare challenge detected in browser');
                console.log('👆 Please solve the Cloudflare challenge in the browser');
                
                await new Promise(resolve => {
                    const rl = require('readline').createInterface({
                        input: process.stdin,
                        output: process.stdout
                    });
                    rl.question('✅ Press Enter after solving Cloudflare challenge...', () => {
                        rl.close();
                        resolve();
                    });
                });
            } else {
                console.log('✅ No Cloudflare challenge detected');
                await new Promise(resolve => {
                    const rl = require('readline').createInterface({
                        input: process.stdin,
                        output: process.stdout
                    });
                    rl.question('✅ Press Enter to save cookies and continue...', () => {
                        rl.close();
                        resolve();
                    });
                });
            }
    
            // Save cookies immediately after Cloudflare is solved
            await CookieManager.saveCookies(page, this.cookieFile);
            
            console.log('🎉 Setup complete! Cookies saved for scraping.');
            
            return true;
    
        } catch (error) {
            console.error('❌ Setup failed:', error.message);
            return false;
        } finally {
            if (browser) {
                await browser.close();
                console.log('✅ Browser closed');
            }
        }
    }
    async scrapeAccounts(accounts) {
        console.log('🤖 MANUAL SCRAPING MODE');
        console.log('='.repeat(40));
        console.log(`📊 Total accounts: ${accounts.length}`);
        console.log('='.repeat(40));
    
        const fs = require('fs').promises;
        let cookiesExist = false;
    
        // Check if cookies exist
        try {
            await fs.access(this.cookieFile);
            cookiesExist = true;
            console.log('✅ Found saved cookies');
        } catch (error) {
            console.log('⚠️  No saved cookies found. Will setup first...');
        }
    
        let browser, page;
        const results = [];
        const startTime = Date.now();
    
        try {
            // Setup browser
            const browserSetup = await BrowserManager.createBrowser({ 
                headless: cookiesExist ? this.headless : false // Force visible if no cookies
            });
            browser = browserSetup.browser;
            page = browserSetup.page;
    
            if (cookiesExist) {
                // Load existing cookies
                await CookieManager.loadCookies(page, this.cookieFile);
                console.log(`🌐 Navigating to ${this.baseUrl}`);
                await page.goto(this.baseUrl, { waitUntil: 'networkidle0', timeout: 30000 });
            } else {
                // First time setup - handle Cloudflare
                console.log('🔧 FIRST TIME SETUP');
                console.log('='.repeat(30));
                console.log('1. Browser will navigate to TweetScout');
                console.log('2. Solve any Cloudflare challenges');
                console.log('3. Then scraping will start automatically');
                console.log('='.repeat(30));
    
                console.log(`🌐 Navigating to ${this.baseUrl}`);
                await page.goto(this.baseUrl, { waitUntil: 'networkidle2', timeout: 30000 });
    
                // Check for Cloudflare
                if (await CloudflareHandler.isCloudflareChallenge(page)) {
                    console.log('☁️  Cloudflare challenge detected in browser');
                    console.log('👆 Please solve the Cloudflare challenge in the browser');
                    
                    const readline = require('readline').createInterface({
                        input: process.stdin,
                        output: process.stdout
                    });
    
                    await new Promise(resolve => {
                        readline.question('✅ Press Enter after solving Cloudflare challenge...', () => {
                            readline.close();
                            resolve();
                        });
                    });
                } else {
                    console.log('✅ No Cloudflare challenge detected');
                }
    
                // Save cookies for next time
                await CookieManager.saveCookies(page, this.cookieFile);
                console.log('🎉 Setup complete! Starting scraping...\n');
            }
    
            // Check for Cloudflare again (in case cookies are stale)
            if (await CloudflareHandler.isCloudflareChallenge(page)) {
                console.log('☁️  Cloudflare challenge detected - cookies may be stale');
                console.log('❌ Please delete cookie file and run again');
                return null;
            }
    
            console.log('✅ Successfully accessed TweetScout - Starting account scraping...');
    
            // Scrape each account
            for (let i = 0; i < accounts.length; i++) {
                const account = accounts[i];
                console.log(`\n📋 Processing ${i + 1}/${accounts.length}: @${account}`);
    
                const result = await AccountScraper.scrapeAccountScore(page, account);
                results.push(result);
    
                // Random delay between requests
                if (i < accounts.length - 1) {
                    const delay = Math.random() * (this.delayRange[1] - this.delayRange[0]) + this.delayRange[0];
                    console.log(`   ⏳ Waiting ${Math.round(delay)}ms before next account...`);
                    await new Promise(resolve => setTimeout(resolve, delay));
                }
            }
    
        } catch (error) {
            console.error('❌ Scraping failed:', error.message);
            return null;
        } finally {
            if (browser) {
                await browser.close();
                console.log('✅ Browser closed');
            }
        }
    
        const endTime = Date.now();
        const totalTime = Math.round((endTime - startTime) / 1000);
    
        // Save and display results
        await ResultManager.saveResults(results, {
            metadata: { 
                mode: 'manual',
                totalTime: `${totalTime} seconds`
            }
        });
    
        ResultManager.printSummary(results, { 
            title: '📋 MANUAL SCRAPING SUMMARY',
            showDetails: true 
        });
    
        return results;
    }
}

module.exports = ManualScraper;
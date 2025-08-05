// main.js (or your current main script file)

const puppeteer = require('puppeteer');
const fs = require('fs').promises;

const accountsToScrape = require('./accountsConfig');

class SimpleTweetScoutScraper {
    constructor() {
        this.browser = null;
        this.page = null;
        this.cookiesFile = 'tweetscout_cookies.json';
    }

    async setupBrowser() {
        console.log('🚀 Setting up browser...');
        
        this.browser = await puppeteer.launch({
            headless: false, // Set to true to hide browser
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-blink-features=AutomationControlled',
                '--no-first-run',
                '--disable-extensions',
                '--window-size=1366,768'
            ],
            ignoreDefaultArgs: ['--enable-automation'],
            ignoreHTTPSErrors: true,
            defaultViewport: null
        });

        this.page = await this.browser.newPage();

        // Set realistic user agent
        await this.page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

        // Remove webdriver property
        await this.page.evaluateOnNewDocument(() => {
            Object.defineProperty(navigator, 'webdriver', {
                get: () => undefined,
            });
        });

        console.log('✅ Browser setup complete');
        return this.page;
    }

    async saveCookies() {
        try {
            const cookies = await this.page.cookies();
            const cookieData = {
                cookies: cookies,
                timestamp: Date.now(),
                userAgent: await this.page.evaluate(() => navigator.userAgent)
            };

            await fs.writeFile(this.cookiesFile, JSON.stringify(cookieData, null, 2));
            console.log(`✅ Saved ${cookies.length} cookies`);
            return true;
        } catch (error) {
            console.error('❌ Failed to save cookies:', error);
            return false;
        }
    }

    async loadCookies() {
        try {
            const data = await fs.readFile(this.cookiesFile, 'utf8');
            const cookieData = JSON.parse(data);

            // Check if cookies are not too old (24 hours)
            if (Date.now() - cookieData.timestamp > 86400000) {
                console.log('⚠️  Cookies are too old');
                return false;
            }

            await this.page.setCookie(...cookieData.cookies);
            console.log(`✅ Loaded ${cookieData.cookies.length} cookies`);
            return true;
        } catch (error) {
            console.log('No saved cookies found');
            return false;
        }
    }

    async isCloudflareChallenge() {
        try {
            const title = await this.page.title();
            const content = await this.page.content();
            
            const cfIndicators = [
                'Just a moment',
                'Verifying you are human',
                'Cloudflare',
                'cf-chl-opt'
            ];

            return cfIndicators.some(indicator => 
                title.includes(indicator) || content.includes(indicator)
            );
        } catch (error) {
            return false;
        }
    }

    async waitForCloudflareBypass(maxWait = 30000) {
        console.log('⏳ Waiting for Cloudflare challenge to resolve...');
        
        const startTime = Date.now();
        while (Date.now() - startTime < maxWait) {
            if (!(await this.isCloudflareChallenge())) {
                console.log('✅ Cloudflare challenge bypassed!');
                return true;
            }
            await new Promise(resolve => setTimeout(resolve, 2000));
            console.log(`   Still waiting... (${Math.floor((Date.now() - startTime) / 1000)}s)`);
        }

        console.log('⚠️  Cloudflare challenge did not resolve automatically');
        return false;
    }

    async manualSetup(url = 'https://app.tweetscout.io/') {
        console.log('🔧 MANUAL SETUP MODE');
        console.log('='.repeat(50));
        console.log('1. Browser will open');
        console.log('2. Complete any Cloudflare challenges');
        console.log('3. Log into TweetScout');
        console.log('4. Navigate to your data page');
        console.log('5. Press Enter in terminal when ready');
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

        try {
            await this.setupBrowser();
            
            await this.loadCookies();
            
            console.log(`🌐 Navigating to ${url}`);
            await this.page.goto(url, { 
                waitUntil: 'networkidle2',
                timeout: 30000 
            });

            if (await this.isCloudflareChallenge()) {
                console.log('☁️  Cloudflare challenge detected');
                
                if (!(await this.waitForCloudflareBypass())) {
                    console.log('🖱️  Manual intervention needed');
                    await new Promise(resolve => {
                        const rl = require('readline').createInterface({
                            input: process.stdin,
                            output: process.stdout
                        });
                        rl.question('Solve challenges and press Enter when on TweetScout...', () => {
                            rl.close();
                            resolve();
                        });
                    });
                }
            }

            console.log('\n' + '='.repeat(50));
            console.log('NOW IN THE BROWSER:');
            console.log('1. Log into TweetScout if needed');
            console.log('2. Navigate to your dashboard/data page');  
            console.log('3. Make sure you can see your data');
            console.log('4. Come back and press Enter');
            console.log('='.repeat(50));

            await new Promise(resolve => {
                const rl = require('readline').createInterface({
                    input: process.stdin,
                    output: process.stdout
                });
                rl.question('✅ Press Enter when logged in and ready...', () => {
                    rl.close();
                    resolve();
                });
            });

            await this.saveCookies();
            
            console.log('🎉 Setup complete! Session saved for automated scraping.');
            
            return true;

        } catch (error) {
            console.error('❌ Manual setup failed:', error.message);
            return false;
        }
    }

    async automatedScrape(url = 'https://app.tweetscout.io/') {
        console.log('🤖 AUTOMATED SCRAPING MODE');
        console.log('='.repeat(40));

        try {
            await this.setupBrowser();
            
            const cookiesLoaded = await this.loadCookies();
            
            if (cookiesLoaded) {
                console.log('✅ Using saved session');
            } else {
                console.log('⚠️  No saved session, going fresh');
            }

            console.log(`🌐 Navigating to ${url}`);
            await this.page.goto(url, { 
                waitUntil: 'networkidle0',
                timeout: 30000 
            });

            if (await this.isCloudflareChallenge()) {
                console.log(`☁️  Cloudflare detected`);
                console.log('❌ Run manual setup first to get past Cloudflare');
                return null;
            }

            console.log('✅ Successfully accessed TweetScout!');

            const title = await this.page.title();
            const currentUrl = this.page.url();
            console.log(`📄 Page: ${title}`);
            console.log(`🔗 URL: ${currentUrl}`);

            const content = await this.page.content();
            await fs.writeFile('tweetscout_scraped_page.html', content);
            console.log('✅ Page saved to tweetscout_scraped_page.html');

            return content;

        } catch (error) {
            console.error('❌ Automated scraping failed:', error.message);
            return null;
        }
    }

    async scrapeAccountScore(accountName) {
        try {
            console.log(`   - Searching for account: @${accountName}`);
            const url = `https://app.tweetscout.io/search?q=${accountName}`;
            await this.page.goto(url, { waitUntil: 'networkidle0' });

            const scoreSelector = '.AccountPage_score_box__hL7Hk .AccountPage_score_val__S6GJ7 p';
            await this.page.waitForSelector(scoreSelector, { timeout: 10000 });

            const scoreText = await this.page.$eval(scoreSelector, el => el.textContent.trim());

            console.log(`✅ Found score for @${accountName}: ${scoreText}`);
            return {
                account: accountName,
                score: scoreText
            };
        } catch (error) {
            console.error(`❌ Failed to scrape score for @${accountName}: ${error.message}`);
            return {
                account: accountName,
                score: 'N/A'
            };
        }
    }

    async scrapeAccountList(accounts) {
        console.log('⚙️  Starting multi-account scrape...');
        const results = [];

        try {
            await this.setupBrowser();
            const cookiesLoaded = await this.loadCookies();
            if (!cookiesLoaded) {
                 console.log('❌ No saved session. Please run manual setup (option 1) first.');
                 return null;
            }
            
            const homeUrl = 'https://app.tweetscout.io/';
            await this.page.goto(homeUrl, { waitUntil: 'networkidle0' });
            if (await this.isCloudflareChallenge()) {
                console.log('❌ Cloudflare challenge detected. Run manual setup first.');
                return null;
            }

            for (const account of accounts) {
                const accountData = await this.scrapeAccountScore(account);
                results.push(accountData);
                await new Promise(resolve => setTimeout(resolve, 2000));
            }

            const outputFilename = 'tweetscout_scores.json';
            await fs.writeFile(outputFilename, JSON.stringify(results, null, 2));
            console.log(`\n🎉 Scraped scores saved to ${outputFilename}`);

            return results;
        } catch (error) {
            console.error('❌ Multi-account scraping failed:', error.message);
            return null;
        }
    }

    async close() {
        if (this.browser) {
            await this.browser.close();
            console.log('✅ Browser closed');
        }
    }
}

// Main execution
async function main() {
    console.log('🚀 Simple TweetScout Scraper');
    console.log('='.repeat(40));

    const scraper = new SimpleTweetScoutScraper();
    const args = process.argv.slice(2);
    const accountsToScrape = require('./accountsConfig');

    try {
        if (args.includes('--auto')) {
            console.log('🤖 AUTOMATED SEQUENCE SELECTED');
            console.log('1. Attempting manual setup (login & save session)...');
            const setupSuccess = await scraper.manualSetup();

            if (setupSuccess) {
                console.log('\n✅ Setup completed. Now starting scraping...');
                const results = await scraper.scrapeAccountList(accountsToScrape);
                if (results) {
                    console.log('All done! Final results:', results);
                } else {
                    console.log('❌ Automated scraping failed after setup.');
                }
            } else {
                console.log('\n❌ Manual setup failed. Please check for errors above.');
            }

        } else {
            const readline = require('readline').createInterface({
                input: process.stdin,
                output: process.stdout
            });

            console.log('Choose mode:');
            console.log('1. Manual setup (login and save session)');
            console.log('2. Automated scraping (use saved session)');
            console.log('3. Scrape a list of accounts (requires saved session)');

            const choice = await new Promise(resolve => {
                readline.question('Enter 1, 2, or 3: ', answer => {
                    readline.close();
                    resolve(answer);
                });
            });

            if (choice === '1') {
                const success = await scraper.manualSetup();
                if (success) {
                    console.log('\n✅ Setup completed! Now try option 3.');
                }
            } else if (choice === '2') {
                const result = await scraper.automatedScrape();
                if (result) {
                    console.log('\n✅ Scraping completed successfully!');
                } else {
                    console.log('\n❌ Scraping failed. Try manual setup first.');
                }
            } else if (choice === '3') {
                console.log(`\nStarting scrape for ${accountsToScrape.length} accounts...`);
                const results = await scraper.scrapeAccountList(accountsToScrape);

                if (results) {
                    console.log('All done! Final results:', results);
                }
            } else {
                console.log('Invalid choice');
            }
        }
    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await scraper.close();
    }
}

if (require.main === module) {
    main().catch(console.error);
}

module.exports = SimpleTweetScoutScraper;
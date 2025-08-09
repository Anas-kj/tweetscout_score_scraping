const BrowserManager = require('../utils/browserManager');
const CookieManager = require('../utils/cookieManager');
const CloudflareHandler = require('../utils/cloudflareHandler');
const AccountScraper = require('../utils/accountScraper');
const ResultManager = require('../utils/resultManager');

class ProxyScraper {
    constructor(proxies, options = {}) {
        this.proxies = proxies;
        this.headless = options.headless || true;
        this.baseUrl = options.baseUrl || 'https://app.tweetscout.io/';
        this.delayRange = options.delayRange || [1000, 4000]; // min, max delay in ms
    }

    // Utility: Distribute accounts across proxies
    distributeAccounts(accounts, numProxies) {
        const chunks = [];
        const chunkSize = Math.floor(accounts.length / numProxies);
        const remainder = accounts.length % numProxies;

        let start = 0;
        for (let i = 0; i < numProxies; i++) {
            const currentChunkSize = chunkSize + (i < remainder ? 1 : 0);
            if (currentChunkSize > 0) {
                chunks.push(accounts.slice(start, start + currentChunkSize));
                start += currentChunkSize;
            }
        }

        return chunks;
    }

    // Worker function for each proxy
    async scrapeWithProxy(proxy, accounts, workerId) {
        let browser, page;
        const results = [];
        
        try {
            console.log(`👷 Worker ${workerId}: Starting with ${accounts.length} accounts`);
            
            // Setup browser with proxy
            const browserSetup = await BrowserManager.createBrowser({
                proxy,
                headless: this.headless,
                workerId
            });
            browser = browserSetup.browser;
            page = browserSetup.page;

            // Load cookies for this worker
            const cookieFile = `tweetscout_cookies_worker_${workerId}.json`;
            await CookieManager.loadCookies(page, cookieFile);

            // Navigate to base URL
            await page.goto(this.baseUrl, { waitUntil: 'networkidle0', timeout: 30000 });

            // Check for Cloudflare
            if (await CloudflareHandler.isCloudflareChallenge(page)) {
                console.log(`☁️  Worker ${workerId}: Cloudflare detected - skipping this proxy`);
                return { 
                    workerId, 
                    results: [], 
                    error: 'Cloudflare challenge detected',
                    proxy: `${proxy.host}:${proxy.port}`
                };
            }

            console.log(`✅ Worker ${workerId}: Successfully accessed TweetScout`);

            // Save cookies after successful access
            await CookieManager.saveCookies(page, cookieFile);

            // Scrape each account
            for (let i = 0; i < accounts.length; i++) {
                const account = accounts[i];
                const result = await AccountScraper.scrapeAccountScore(page, account, workerId);
                results.push(result);

                // Random delay between requests
                if (i < accounts.length - 1) {
                    const delay = Math.random() * (this.delayRange[1] - this.delayRange[0]) + this.delayRange[0];
                    await new Promise(resolve => setTimeout(resolve, delay));
                }

                // Progress update
                console.log(`📊 Worker ${workerId}: Progress ${i + 1}/${accounts.length}`);
            }

        } catch (error) {
            console.error(`❌ Worker ${workerId}: Fatal error: ${error.message}`);
            return { 
                workerId, 
                results: [], 
                error: error.message,
                proxy: `${proxy.host}:${proxy.port}`
            };
        } finally {
            if (browser) {
                await browser.close();
                console.log(`✅ Worker ${workerId}: Browser closed`);
            }
        }

        console.log(`🎉 Worker ${workerId}: Completed ${results.length} accounts`);
        return { 
            workerId, 
            results, 
            error: null,
            proxy: `${proxy.host}:${proxy.port}`
        };
    }

    async scrapeAccounts(accounts) {
        console.log('🚀 PROXY SCRAPING MODE');
        console.log('='.repeat(50));
        console.log(`📊 Total accounts: ${accounts.length}`);
        console.log(`🔄 Available proxies: ${this.proxies.length}`);
        console.log('='.repeat(50));

        const fs = require('fs').promises;
        let needsSetup = false;
        const missingCookies = [];

        // Check if worker cookie files exist
        for (let i = 1; i <= this.proxies.length; i++) {
            const cookieFile = `tweetscout_cookies_worker_${i}.json`;
            try {
                await fs.access(cookieFile);
            } catch (error) {
                missingCookies.push(cookieFile);
            }
        }

        if (missingCookies.length > 0) {
            needsSetup = true;
            console.log('⚠️  Missing cookie files. Will setup first...');
        } else {
            console.log('✅ All worker cookie files found');
        }

        // If setup needed, do it first
        if (needsSetup) {
            console.log('🔧 FIRST TIME SETUP FOR PROXIES');
            console.log('='.repeat(40));
            console.log('1. Setup browser will open');
            console.log('2. Solve Cloudflare challenge');
            console.log('3. Cookies will be saved to all workers');
            console.log('4. Parallel scraping will start automatically');
            console.log('='.repeat(40));

            let setupBrowser, setupPage;
            const masterCookieFile = 'tweetscout_cookies_master.json';

            try {
                // Setup browser without proxy for initial Cloudflare bypass
                const browserSetup = await BrowserManager.createBrowser({ 
                    headless: false 
                });
                setupBrowser = browserSetup.browser;
                setupPage = browserSetup.page;

                console.log(`🌐 Navigating to ${this.baseUrl}`);
                await setupPage.goto(this.baseUrl, { waitUntil: 'networkidle2', timeout: 30000 });

                // Check for Cloudflare
                if (await CloudflareHandler.isCloudflareChallenge(setupPage)) {
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

                // Save master cookies
                await CookieManager.saveCookies(setupPage, masterCookieFile);

                // Copy cookies to all worker files
                console.log('📋 Copying cookies to all workers...');
                const masterCookieData = await fs.readFile(masterCookieFile, 'utf8');

                for (let i = 1; i <= this.proxies.length; i++) {
                    const workerCookieFile = `tweetscout_cookies_worker_${i}.json`;
                    await fs.writeFile(workerCookieFile, masterCookieData);
                    console.log(`✅ Copied cookies to ${workerCookieFile}`);
                }
                
                console.log('🎉 Setup complete! Starting parallel scraping...\n');

            } catch (error) {
                console.error('❌ Setup failed:', error.message);
                return null;
            } finally {
                if (setupBrowser) {
                    await setupBrowser.close();
                    console.log('✅ Setup browser closed');
                }
            }
        }

        // Now start parallel scraping
        // Distribute accounts across proxies
        const accountChunks = this.distributeAccounts(accounts, this.proxies.length);
        
        console.log('\n📋 WORK DISTRIBUTION:');
        accountChunks.forEach((chunk, index) => {
            if (chunk.length > 0) {
                const proxy = this.proxies[index];
                console.log(`   Worker ${index + 1}: ${chunk.length} accounts (${proxy.host}:${proxy.port})`);
            }
        });

        // Create worker promises
        const workerPromises = this.proxies.map((proxy, index) => {
            if (accountChunks[index] && accountChunks[index].length > 0) {
                return this.scrapeWithProxy(proxy, accountChunks[index], index + 1);
            }
            return null;
        }).filter(Boolean);

        console.log(`\n👷 Starting ${workerPromises.length} workers in parallel...\n`);

        // Start timing
        const startTime = Date.now();

        // Run all workers in parallel
        const workerResults = await Promise.allSettled(workerPromises);
        
        const endTime = Date.now();
        const totalTime = Math.round((endTime - startTime) / 1000);

        // Process results
        const allResults = [];
        const errors = [];
        const workerSummary = [];

        workerResults.forEach((result, index) => {
            if (result.status === 'fulfilled') {
                const { workerId, results, error, proxy } = result.value;
                
                workerSummary.push({
                    workerId,
                    proxy,
                    successful: results.filter(r => r.success).length,
                    failed: results.filter(r => !r.success).length,
                    total: results.length,
                    error: error
                });

                if (error) {
                    errors.push({ workerId, proxy, error });
                } else {
                    allResults.push(...results);
                }
            } else {
                const workerId = index + 1;
                const proxy = this.proxies[index];
                errors.push({ 
                    workerId, 
                    proxy: `${proxy.host}:${proxy.port}`, 
                    error: result.reason.message 
                });
            }
        });

        // Save results
        await ResultManager.saveResults(allResults, {
            filename: `tweetscout_proxy_results_${new Date().toISOString().replace(/[:.]/g, '-')}.json`,
            metadata: {
                mode: 'proxy',
                totalTime: `${totalTime} seconds`,
                workersUsed: workerPromises.length,
                proxiesUsed: this.proxies.length,
                workerSummary: workerSummary,
                errors: errors
            }
        });

        // Print detailed summary
        console.log('\n' + '='.repeat(60));
        console.log('📋 PROXY SCRAPING SUMMARY');
        console.log('='.repeat(60));
        console.log(`⏱️  Total time: ${totalTime} seconds`);
        console.log(`✅ Successful: ${allResults.filter(r => r.success).length}/${accounts.length}`);
        console.log(`❌ Failed: ${allResults.filter(r => !r.success).length + errors.length}/${accounts.length}`);
        console.log(`👷 Workers used: ${workerPromises.length}`);
        
        console.log('\n📊 WORKER PERFORMANCE:');
        workerSummary.forEach(worker => {
            const status = worker.error ? '❌' : '✅';
            console.log(`   ${status} Worker ${worker.workerId} (${worker.proxy}): ${worker.successful}/${worker.total} successful`);
        });

        if (errors.length > 0) {
            console.log('\n⚠️  WORKER ERRORS:');
            errors.forEach(error => {
                console.log(`   Worker ${error.workerId} (${error.proxy}): ${error.error}`);
            });
        }

        console.log('='.repeat(60));

        return allResults;
    }
}

module.exports = ProxyScraper;
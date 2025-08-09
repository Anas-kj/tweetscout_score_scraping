const ManualScraper = require('./scrapers/manualScraper');
const ProxyScraper = require('./scrapers/proxyScraper');

async function main() {

    const accounts = require('./config/accountsConfig');
    const proxies = require('./config/proxiesConfig');


    const args = process.argv.slice(2);

    if (args.includes('--proxy')) {
        console.log('🔄 Using PROXY mode');
        const scraper = new ProxyScraper(proxies, { headless: true });
        await scraper.scrapeAccounts(accounts);
        
    } else {
        console.log('🤖 Using MANUAL mode');
        const scraper = new ManualScraper({ headless: false });
        await scraper.scrapeAccounts(accounts);
    }
}

if (require.main === module) {
    main().catch(console.error);
}
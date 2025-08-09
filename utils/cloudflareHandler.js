class CloudflareHandler {
    static async isCloudflareChallenge(page) {
        try {
            const title = await page.title();
            const content = await page.content();
            
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

    static async waitForCloudflareBypass(page, maxWait = 30000) {
        console.log('⏳ Waiting for Cloudflare challenge to resolve...');
        
        const startTime = Date.now();
        while (Date.now() - startTime < maxWait) {
            if (!(await this.isCloudflareChallenge(page))) {
                console.log('✅ Cloudflare challenge bypassed!');
                return true;
            }
            await new Promise(resolve => setTimeout(resolve, 2000));
            console.log(`   Still waiting... (${Math.floor((Date.now() - startTime) / 1000)}s)`);
        }

        console.log('⚠️  Cloudflare challenge did not resolve automatically');
        return false;
    }
}

module.exports = CloudflareHandler;
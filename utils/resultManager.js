const fs = require('fs').promises;

class ResultManager {
    static async saveResults(results, options = {}) {
        const {
            filename = null,
            includeTimestamp = true,
            metadata = {}
        } = options;

        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const outputFile = filename || `tweetscout_results_${timestamp}.json`;

        const output = {
            scrapeInfo: {
                timestamp: new Date().toISOString(),
                totalAccounts: results.length,
                successful: results.filter(r => r.success).length,
                failed: results.filter(r => !r.success).length,
                ...metadata
            },
            results: results
        };

        await fs.writeFile(outputFile, JSON.stringify(output, null, 2));
        console.log(`💾 Results saved to: ${outputFile}`);
        
        return outputFile;
    }

    static printSummary(results, options = {}) {
        const { title = 'SCRAPING SUMMARY', showDetails = false } = options;
        
        const successful = results.filter(r => r.success).length;
        const failed = results.filter(r => !r.success).length;
        const total = results.length;

        console.log('\n' + '='.repeat(50));
        console.log(title);
        console.log('='.repeat(50));
        console.log(`✅ Successful: ${successful}/${total}`);
        console.log(`❌ Failed: ${failed}/${total}`);
        
        if (showDetails && failed > 0) {
            console.log('\n❌ Failed accounts:');
            results.filter(r => !r.success).forEach(result => {
                console.log(`   @${result.account}: ${result.error}`);
            });
        }

        if (showDetails && successful > 0) {
            console.log('\n✅ Sample successful results:');
            results.filter(r => r.success).slice(0, 3).forEach(result => {
                const workerInfo = result.workerId ? ` (Worker ${result.workerId})` : '';
                console.log(`   @${result.account}: ${result.score}${workerInfo}`);
            });
        }
        
        console.log('='.repeat(50));
    }
}

module.exports = ResultManager;
# TweetScout Parallel Scraper

A high-performance, modular web scraper built with Node.js and Puppeteer for extracting Twitter account analytics from TweetScout. Features parallel processing with proxy support, intelligent Cloudflare bypass, and human-like interaction patterns.

## 🚀 Features

- **Parallel Processing**: Distribute scraping across multiple proxies simultaneously
- **Proxy Support**: Built-in proxy rotation with authentication
- **Cloudflare Bypass**: Manual challenge solving with session persistence
- **Modular Architecture**: Clean, reusable components for easy maintenance
- **Smart Cookie Management**: Automatic session handling and persistence
- **Rate Limiting**: Configurable delays to avoid detection
- **Comprehensive Logging**: Detailed progress tracking and error reporting
- **Dual Modes**: Manual single-browser mode or parallel proxy mode

## 🛠️ Installation

### Prerequisites

- Node.js 16.0 or higher
- npm or yarn package manager

### Setup

```bash
# Clone the repository
git clone https://github.com/YOUR_USERNAME/tweetscout-parallel-scraper.git
cd tweetscout-parallel-scraper

# Install dependencies
npm install

# Create configuration files
mkdir config
touch config/accountConfig.js
touch config/proxies.js

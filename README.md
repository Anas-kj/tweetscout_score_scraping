# tweetscout_score_scraping
1.  [Prerequisites](#1-prerequisites)

2.  [Installation](#2-installation)

3.  [Configuration](#3-configuration)

4.  [How to Run](#4-how-to-run)

    * [Manual Setup (First Time / When Cookies Expire)](#manual-setup-first-time--when-cookies-expire)

    * [Automated Scraping](#automated-scraping)

---

## 1. Prerequisites

Before you begin, ensure you have Node.js and npm (Node Package Manager) installed on your system.

* **Node.js and npm:**

    * **How to Install:**

        * **Windows & macOS:** The easiest way is to download the official installer from the [Node.js website](https://nodejs.org/en/download/). The installer includes npm.

        * **Linux:** You can use your system's package manager or a Node Version Manager (like `nvm`) for more flexibility. Refer to the [Node.js installation guide](https://nodejs.org/en/download/package-manager/) for detailed instructions for your specific distribution.

    * **Verify Installation:** Open your terminal or command prompt and run:

        ```bash
        node -v
        npm -v
        ```

        You should see version numbers for both Node.js and npm.

## 2. Installation

Follow these steps to set up the project:

1.  **Clone the Repository:**

    ```bash
    git clone <your-repo-url>
    cd <your-repo-name>
    ```

    (Replace `<your-repo-url>` and `<your-repo-name>` with your actual repository URL and name.)

2.  **Install Dependencies:**
    Navigate into the cloned directory and install the required Node.js packages (Puppeteer and `readline` for user input):

    ```bash
    npm install
    ```

## 3. Configuration

The script uses a separate file to manage the list of accounts you want to scrape.

* **`accountsConfig.js`:**
    This file contains the array of Twitter account usernames you wish to scrape.
    Open `accountsConfig.js` in your code editor:

    ```javascript
    // accountsConfig.js

    const accountsToScrape = [
        'elonmusk',
        'jack',
        'naval',
        'paulg',
        // Add more accounts here, ensuring they are strings within single quotes
        // Example: 'newaccount', 'anotheruser'
    ];

    module.exports = accountsToScrape;
    ```

    **To add or remove accounts**, simply edit this array. Make sure each account name is a string (enclosed in single or double quotes) and separated by commas.

## 4. How to Run

There are two primary ways to run the scraper:

### Manual Setup (First Time / When Cookies Expire)

The first time you run the scraper, or if your saved session cookies expire, you'll need to go through a manual setup process. This involves opening a browser window, completing any Cloudflare challenges, and logging into TweetScout.

1.  **Run the script:**

    ```bash
    node main.js
    ```

2.  **Choose option `1`** from the menu for "Manual setup (login and save session)".

3.  Follow the prompts in your terminal:

    * A browser window will open.

    * **Manually solve any Cloudflare challenges** (e.g., CAPTCHAs, "Verifying you are human").

    * **Log into your TweetScout account.**

    * Navigate to your dashboard or any page where you can see your data.

    * Once you are successfully logged in and on a data-displaying page, return to your terminal and **press Enter**.

4.  The script will save your session cookies. You will see a confirmation message.

### Automated Scraping

Once you have successfully completed the manual setup and saved your cookies, you can use the automated mode for subsequent runs. This mode will attempt to load your saved session and then directly proceed to scrape the accounts listed in `accountsConfig.js`.

1.  **Run the script with the `--auto` flag:**

    ```bash
    node main.js --auto
    ```

2.  The script will attempt to load your saved cookies. If successful, it will navigate to TweetScout and begin scraping the accounts listed in `accountsConfig.js`.

3.  The scraped data (account name and score) will be saved to a JSON file named `tweetscout_scores.json` in the project directory.

This automated command is designed for convenience, allowing you to quickly re-run the scraping process without repeated manual intervention after the initial setup.

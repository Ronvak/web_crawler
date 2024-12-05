const axios = require("axios");
const cheerio = require("cheerio");
const fs = require("fs");

const visitedUrls = new Set();
const results = [];

// Function to fetch HTML content
async function fetchHtml(url) {
  try {
    const response = await axios.get(url);
    return response.data;
  } catch (error) {
    console.error(`Failed to fetch ${url}:`, error.message);
    return null;
  }
}

// Function to parse HTML and extract images and links
function parseHtml(html, baseUrl) {
  const $ = cheerio.load(html);

  const images = [];
  $("img").each((_, element) => {
    const src = $(element).attr("src");
    if (src) images.push(new URL(src, baseUrl).href);
  });

  const links = [];
  $("a").each((_, element) => {
    const href = $(element).attr("href");
    if (href) links.push(new URL(href, baseUrl).href);
  });

  return { images, links };
}

async function crawl(startUrl, maxDepth) {
  const queue = [{ url: startUrl, depth: 0 }];

  while (queue.length > 0) {
    try {
      const { url, depth } = queue.shift();

      // Skip if already visited or depth exceeds maxDepth
      if (visitedUrls.has(url) || depth > maxDepth || !isValidUrl(url)) {
        continue;
      }

      visitedUrls.add(url);
      console.log(`Crawling ${url} at depth ${depth}`);

      const html = await fetchHtml(url);
      if (!html) continue;

      const { images, links } = parseHtml(html, url);

      // Save images to results
      for (const image of images) {
        results.push({
          imageUrl: image,
          sourceUrl: url,
          depth,
        });
      }

      // Add links to the queue for further crawling
      for (const link of links) {
        if (!visitedUrls.has(link)) {
          queue.push({ url: link, depth: depth + 1 });
        }
      }
    } catch (error) {
      console.error(`Failed to crawl ${url}:`, error);
    }
  }
}

async function main() {
  const [, , inputUrl, inputDepth] = process.argv;

  if (!inputUrl || isNaN(inputDepth)) {
    console.error("Usage: node crawler.js <url> <depth>");
    process.exit(1);
  }

  if (!isValidUrl(inputUrl)) {
    console.error("Invalid URL");
    process.exit(1);
  }

  const depth = parseInt(inputDepth, 10);
  console.log(`Starting crawl for URL: ${inputUrl} with depth: ${depth}`);

  await crawl(inputUrl, depth);
  try {
    // Write results to JSON file
    fs.writeFileSync("results.json", JSON.stringify({ results }, null, 2));
    console.log(`Crawling completed. Results saved to results.json`);
  } catch (error) {
    console.error(`Failed to write results to file:`, error);
  }
}

// Validate URLs
function isValidUrl(url) {
  try {
    const parsedUrl = new URL(url);
    return ["http:", "https:"].includes(parsedUrl.protocol); // Allow only HTTP(S)
  } catch (error) {
    return false;
  }
}

main();

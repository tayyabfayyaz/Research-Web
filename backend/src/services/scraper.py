from playwright.async_api import async_playwright
import logging
import socket
from urllib.parse import urlparse

logger = logging.getLogger("scraper")

def is_reachable(url: str):
    try:
        domain = urlparse(url).netloc
        socket.gethostbyname(domain)
        return True
    except socket.gaierror:
        return False

async def scrape_url(url: str):
    if not is_reachable(url):
        raise ValueError(f"Domain {urlparse(url).netloc} is not reachable")

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()
        
        try:
            logger.info(f"Scraping URL: {url}")
            await page.goto(url, wait_until="networkidle", timeout=30000)
            
            # Metadata extraction
            title = await page.title()
            meta_description = await page.evaluate("""() => {
                const meta = document.querySelector('meta[name="description"]');
                return meta ? meta.getAttribute('content') : '';
            }""")
            
            # Content cleaning: Remove non-content elements
            await page.evaluate("""() => {
                const selectors = [
                    'nav', 'footer', 'header', 'aside', '.ads', '.advertisement', 
                    'script', 'style', 'iframe', 'noscript', 'svg'
                ];
                selectors.forEach(selector => {
                    document.querySelectorAll(selector).forEach(el => el.remove());
                });
            }""")
            
            content = await page.evaluate("() => document.body.innerText")
            
            if not content or len(content.strip()) < 100:
                raise ValueError("Website has insufficient text content for analysis")

            return {
                "title": title,
                "description": meta_description,
                "content": content[:50000]
            }
        except Exception as e:
            logger.error(f"Error scraping {url}: {e}")
            raise e
        finally:
            await browser.close()

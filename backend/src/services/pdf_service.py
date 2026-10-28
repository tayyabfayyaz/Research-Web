from playwright.async_api import async_playwright
import os
import logging

logger = logging.getLogger("pdf_service")

async def generate_pdf_from_template(task_id: str, frontend_url: str):
    async with async_playwright() as p:
        # Use chromium just like in the scraper
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()
        
        # Point to the frontend's PDF template route
        template_url = f"{frontend_url}/export-pdf-template?task_id={task_id}"
        
        try:
            logger.info(f"Generating PDF for task {task_id} at {template_url}")
            # Wait for content to load - wait until network is idle to ensure fetch is done
            await page.goto(template_url, wait_until="networkidle", timeout=30000)
            
            # The template sets data-ready once the report and its charts have rendered
            await page.wait_for_selector("[data-ready='true']", timeout=15000)
            await page.wait_for_timeout(500)
            
            # Generate PDF
            pdf_bytes = await page.pdf(
                format="A4",
                print_background=True,
                margin={"top": "2cm", "right": "2cm", "bottom": "2cm", "left": "2cm"}
            )
            return pdf_bytes
        except Exception as e:
            logger.error(f"Error generating PDF for {task_id}: {e}")
            raise e
        finally:
            await browser.close()

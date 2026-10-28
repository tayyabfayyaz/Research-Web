import pytest
from src.services.scraper import is_reachable
from unittest.mock import patch, MagicMock, AsyncMock

def test_is_reachable_valid():
    # This might fail if there's no internet, but google.com is usually safe
    assert is_reachable("https://www.google.com") == True

def test_is_reachable_invalid():
    assert is_reachable("https://this-is-not-a-real-domain-12345.com") == False

@pytest.mark.asyncio
@patch('src.services.scraper.async_playwright')
async def test_scrape_url_mock(mock_playwright):
    from src.services.scraper import scrape_url
    
    # Setup mocks
    mock_browser = AsyncMock()
    mock_page = AsyncMock()
    
    # Configure the mock chain
    # async with async_playwright() as p:
    mock_p = MagicMock()
    mock_playwright.return_value.__aenter__.return_value = mock_p
    
    # browser = await p.chromium.launch(...)
    mock_p.chromium.launch = AsyncMock(return_value=mock_browser)
    
    # page = await browser.new_page()
    mock_browser.new_page = AsyncMock(return_value=mock_page)
    
    # await page.goto(...)
    mock_page.goto = AsyncMock()
    
    # await page.title()
    mock_page.title = AsyncMock(return_value="Test Title")
    
    # await page.evaluate(...)
    mock_page.evaluate = AsyncMock()
    mock_page.evaluate.side_effect = [
        "Test Description", # Meta description
        None, # Content cleaning
        "This is a test content that is long enough to pass the 100 character check. " * 5 # Inner text
    ]
    
    result = await scrape_url("https://www.google.com")
    
    assert result["title"] == "Test Title"
    assert "test content" in result["content"]
    
    # Verify closing
    mock_browser.close.assert_awaited_once()

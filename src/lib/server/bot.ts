/**
 * Anti-scraping / anti-bot heuristics.
 *
 * We never block normal browsers, only clearly automated or abusive clients
 * hitting the JSON API. Search engine crawlers are allowed for the public HTML
 * pages (good for SEO) but are not allowed to hammer the raw data API.
 */

const SCRAPER_UA =
	/(python-requests|python-urllib|scrapy|curl\/|wget\/|httpclient|go-http-client|java\/|libwww|okhttp|axios\/|node-fetch|phantomjs|headlesschrome|puppeteer|playwright|bot\b|spider|crawl|scrape|httrack|masscan|nikto|sqlmap|nmap)/i;

const ALLOWED_CRAWLER = /(googlebot|bingbot|yandex|duckduckbot|baiduspider|applebot|slurp)/i;

export function isLikelyBot(request: Request): boolean {
	const ua = request.headers.get('User-Agent') || '';
	if (!ua) return true; // no UA at all is almost always a script
	if (SCRAPER_UA.test(ua) && !ALLOWED_CRAWLER.test(ua)) return true;
	return false;
}

/** Crawlers may read HTML but not the bulk JSON API. */
export function isSearchCrawler(request: Request): boolean {
	const ua = request.headers.get('User-Agent') || '';
	return ALLOWED_CRAWLER.test(ua);
}

/** Basic same-origin enforcement for state-changing API calls. */
export function isSameOrigin(request: Request, url: URL): boolean {
	const origin = request.headers.get('Origin');
	if (!origin) {
		// Same-origin form posts may omit Origin; fall back to Sec-Fetch-Site.
		const sfs = request.headers.get('Sec-Fetch-Site');
		return sfs === 'same-origin' || sfs === 'none' || sfs === null;
	}
	try {
		return new URL(origin).host === url.host;
	} catch {
		return false;
	}
}

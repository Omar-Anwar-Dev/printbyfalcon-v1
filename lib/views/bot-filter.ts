/**
 * Bot/crawler heuristic for the view-tracking layer.
 *
 * Score-driving signals (orders + page views) need to come from real
 * humans browsing the storefront — letting Googlebot, link-preview
 * fetchers, uptime monitors, etc. count as views would let crawl
 * frequency dominate the popularity sort.
 *
 * The pattern is deliberately conservative: it covers all major search
 * crawlers, common social-card preview agents (Facebook, Twitter,
 * LinkedIn, WhatsApp, Telegram, Discord, Slack), monitoring services
 * (UptimeRobot, Pingdom, GTmetrix), and headless / scripted clients
 * (curl, wget, python-requests, axios). False positives are cheap (a
 * real user labelled as a bot just doesn't get their page-view counted
 * for popularity — they still see the page); false negatives mean a
 * crawler inflates a product's score, which is the harm we're guarding
 * against.
 *
 * `null` / empty UA is treated as a bot — only scripted clients omit it.
 */
const BOT_PATTERN =
  /bot|crawl|spider|slurp|fetch|preview|monitor|check|probe|scan|googlebot|bingbot|yandex|baiduspider|duckduckbot|facebookexternalhit|twitterbot|linkedinbot|whatsapp|telegram|discordbot|slackbot|applebot|petalbot|semrushbot|ahrefsbot|mj12bot|dotbot|uptimerobot|pingdom|gtmetrix|lighthouse|chrome-lighthouse|headlesschrome|phantomjs|playwright|puppeteer|wget|curl|python-requests|axios|got\/|node-fetch|libwww-perl|java\/|okhttp/i;

export function isLikelyBot(userAgent: string | null | undefined): boolean {
  if (!userAgent || userAgent.trim().length === 0) return true;
  return BOT_PATTERN.test(userAgent);
}

import { describe, expect, it } from 'vitest';
import { isLikelyBot } from './bot-filter';

describe('isLikelyBot', () => {
  describe('treats non-human signals as bots', () => {
    it.each([
      null,
      undefined,
      '',
      '   ',
      // search engines
      'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
      'Mozilla/5.0 (compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm)',
      'Mozilla/5.0 (compatible; YandexBot/3.0; +http://yandex.com/bots)',
      'Mozilla/5.0 (compatible; DuckDuckBot/1.1; +http://duckduckgo.com/duckduckbot.html)',
      // social-card preview agents
      'facebookexternalhit/1.1',
      'Twitterbot/1.0',
      'LinkedInBot/1.0',
      'WhatsApp/2.0',
      'TelegramBot (like TwitterBot)',
      'Mozilla/5.0 (compatible; Discordbot/2.0)',
      'Slackbot-LinkExpanding 1.0',
      // monitoring + perf
      'UptimeRobot/2.0',
      'Pingdom.com_bot_version_1.4',
      'Mozilla/5.0 (compatible; GTmetrix)',
      'Lighthouse',
      // SEO crawlers
      'Mozilla/5.0 (compatible; AhrefsBot/7.0; +http://ahrefs.com/robot/)',
      'Mozilla/5.0 (compatible; SemrushBot/7~bl)',
      // headless / scripted
      'curl/8.0.1',
      'Wget/1.21.3',
      'python-requests/2.31',
      'axios/1.6.0',
      'okhttp/4.12.0',
      'HeadlessChrome/120.0.6099.71',
      'Mozilla/5.0 ... Safari/537.36 PhantomJS/2.1.1',
    ])('flags %p', (ua) => {
      expect(isLikelyBot(ua)).toBe(true);
    });
  });

  describe('passes real browsers', () => {
    it.each([
      // Chrome on Windows
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      // Safari on iPhone
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
      // Firefox on Linux
      'Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:121.0) Gecko/20100101 Firefox/121.0',
      // Edge
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.2210.61',
      // Samsung browser (popular in EG)
      'Mozilla/5.0 (Linux; Android 13; SAMSUNG SM-G998B) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/23.0 Chrome/115.0.0.0 Mobile Safari/537.36',
      // Brave
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    ])('lets through %p', (ua) => {
      expect(isLikelyBot(ua)).toBe(false);
    });
  });
});

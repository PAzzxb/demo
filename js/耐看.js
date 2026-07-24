import req from '../../util/req.js';
import { load } from 'cheerio';
import CryptoJS from 'crypto-js';
import { getHomeCache, setHomeCache, buildHomeCacheKey, HOME_CACHE_TTL } from '../../util/home-cache.js';

const UA = 'Mozilla/5.0 (Linux; Android 12; ALN-AL00 Build/HUAWEIALN-AL00; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/114.0.5735.196 Mobile Safari/537.36';
const DEFAULT_HOSTS = [
  process.env.NKVOD_HOST,
  'http://nkdvd.me',
  'http://www.nkdvd.me',
  'https://www.nkvod.com',
  'https://nkvod.com',
  'https://nkvod.org',
  'https://www.nkvod.me',
  'https://nkvod.me',
  'http://www.nkvod.cc',
  'http://nkvod.cc',
].filter(Boolean);

const SITE = {
  key: 'nkvod',
  name: '耐看点播[cat]',
  logo: 'https://www.nkvod.com/upload/site/20241223-1/7c00a9d60fffa62f46be199e52d6cc85.png',
  headers: {
    'User-Agent': UA,
    Referer: 'https://www.nkvod.com/',
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  },
  classes: [
    { type_id: '1', type_name: '电影' },
    { type_id: '2', type_name: '剧集' },
    { type_id: '4', type_name: '动漫' },
    { type_id: '3', type_name: '综艺' },
  ],
  cateMap: {
    1: '1',
    2: '2',
    3: '3',
    4: '4',
  },
  typeMap: {
    1: {
      动作片: '6', 喜剧片: '7', 爱情片: '8', 科幻片: '9',
      恐怖片: '10', 剧情片: '11', 战争片: '12', 电影解说: '1',
    },
    2: { 国产剧: '13', 港台剧: '14', 日韩剧: '15', 欧美剧: '16' },
    3: { 大陆综艺: '3', 日韩综艺: '3', 港台综艺: '3', 欧美综艺: '3' },
    4: { 国产动漫: '4', 日韩动漫: '4', 欧美动漫: '4', 港台动漫: '4', 海外动漫: '4' },
  },
};

const FILTERS = {
  1: [
    { key: 'class', name: '类型', value: ['全部', '动作片', '喜剧片', '爱情片', '科幻片', '恐怖片', '剧情片', '战争片', '电影解说'].map(n => ({ n, v: n === '全部' ? '' : n })) },
    { key: 'by', name: '排序', value: [{ n: '最新', v: 'time' }, { n: '最热', v: 'hits' }] },
  ],
  2: [
    { key: 'class', name: '类型', value: ['全部', '国产剧', '港台剧', '日韩剧', '欧美剧'].map(n => ({ n, v: n === '全部' ? '' : n })) },
    { key: 'by', name: '排序', value: [{ n: '最新', v: 'time' }, { n: '最热', v: 'hits' }] },
  ],
  3: [
    { key: 'class', name: '类型', value: ['全部', '大陆综艺', '日韩综艺', '港台综艺', '欧美综艺'].map(n => ({ n, v: n === '全部' ? '' : n })) },
    { key: 'by', name: '排序', value: [{ n: '最新', v: 'time' }, { n: '最热', v: 'hits' }] },
  ],
  4: [
    { key: 'class', name: '类型', value: ['全部', '国产动漫', '日韩动漫', '欧美动漫', '港台动漫', '海外动漫'].map(n => ({ n, v: n === '全部' ? '' : n })) },
    { key: 'by', name: '排序', value: [{ n: '最新', v: 'time' }, { n: '最热', v: 'hits' }] },
  ],
};

const state = { host: '', cookies: '' };

function normalizePage(value) {
  const page = Number.parseInt(value, 10);
  return Number.isFinite(page) && page > 0 ? page : 1;
}

function parseExtend(raw) {
  if (!raw) return {};
  if (typeof raw === 'object') return raw;
  try { return JSON.parse(raw); } catch {}
  try { return JSON.parse(Buffer.from(String(raw), 'base64').toString('utf8')); } catch {}
  return {};
}

function mergeCookies(setCookie) {
  if (!setCookie) return;
  const current = {};
  String(state.cookies || '').split(';').forEach(pair => {
    const idx = pair.indexOf('=');
    if (idx > 0) current[pair.slice(0, idx).trim()] = pair.slice(idx + 1).trim();
  });
  const list = Array.isArray(setCookie) ? setCookie : [setCookie];
  for (const item of list) {
    const kv = String(item || '').split(';')[0].trim();
    const idx = kv.indexOf('=');
    if (idx > 0) current[kv.slice(0, idx).trim()] = kv.slice(idx + 1).trim();
  }
  state.cookies = Object.entries(current).map(([k, v]) => `${k}=${v}`).join('; ');
}

function fullUrl(path, base = state.host) {
  const value = String(path || '').trim();
  if (!value) return '';
  if (/^https?:\/\//i.test(value)) return value;
  if (value.startsWith('//')) return `https:${value}`;
  if (!base) return value;
  return new URL(value, base).toString();
}

async function requestHtml(url, options = {}) {
  const headers = {
    ...SITE.headers,
    Referer: options.referer || state.host || SITE.headers.Referer,
    ...(state.cookies ? { Cookie: state.cookies } : {}),
    ...(options.headers || {}),
  };
  const response = await req({
    url,
    method: options.method || 'GET',
    headers,
    data: options.data,
    timeout: options.timeout || 15000,
    maxRedirects: options.maxRedirects ?? 5,
    validateStatus: status => status >= 200 && status < 500,
  });
  mergeCookies(response.headers?.['set-cookie']);
  return typeof response.data === 'string' ? response.data : String(response.data || '');
}

function isUsableVodHtml(html) {
  return /module-(?:poster|card|play|info|item)|player_aaaa|module-tab-items-box/i.test(String(html || ''))
    && !/APP下载永久地址发布页|收藏我回家不迷路/i.test(String(html || ''));
}

async function resolveHost() {
  if (state.host) return state.host;
  for (const rawHost of DEFAULT_HOSTS) {
    const host = String(rawHost || '').replace(/\/+$/, '');
    if (!host) continue;
    try {
      const probePath = /nkdvd\.me/i.test(host) ? '/vodshow/by/time/id/20/page/1.html' : '/show/1--------1---.html';
      const html = await requestHtml(`${host}${probePath}`, { referer: `${host}/`, timeout: 10000, maxRedirects: 2 });
      if (isUsableVodHtml(html)) {
        state.host = host;
        SITE.headers.Referer = `${host}/`;
        return state.host;
      }
    } catch {}
  }
  state.host = String(DEFAULT_HOSTS[0] || 'https://www.nkvod.com').replace(/\/+$/, '');
  SITE.headers.Referer = `${state.host}/`;
  return state.host;
}

function buildCategoryUrl(host, tid, page, extend = {}) {
  const typeId = String(tid || '1');
  const extBy = String(extend.by || '').trim();
  const year = String(extend.year || '').trim();
  const klass = String(extend.class || '').trim();
  const area = String(extend.area || '').trim();
  const cate = String(extend.cateId || SITE.typeMap[typeId]?.[extend.class] || SITE.cateMap[typeId] || '1').trim();
  if (/nkdvd\.me/i.test(host)) {
    const nkdvdCateMap = { 1: '20', 2: '21', 4: '22', 3: '23' };
    const nkdvdTypeMap = {
      1: { 动作片: '28', 喜剧片: '29', 爱情片: '30', 科幻片: '31', 恐怖片: '32', 剧情片: '33', 战争片: '34', 电影解说: '35' },
      2: { 国产剧: '36', 港台剧: '37', 日韩剧: '38', 欧美剧: '39' },
      3: { 大陆综艺: '23', 日韩综艺: '23', 港台综艺: '23', 欧美综艺: '23' },
      4: { 国产动漫: '22', 日韩动漫: '22', 欧美动漫: '22', 港台动漫: '22', 海外动漫: '22' },
    };
    const id = String(extend.cateId || nkdvdTypeMap[typeId]?.[extend.class] || nkdvdCateMap[typeId] || '20');
    const parts = ['/vodshow'];
    if (area) parts.push('area', encodeURIComponent(area));
    if (extBy) parts.push('by', encodeURIComponent(extBy));
    if (klass && !extend.cateId && !nkdvdTypeMap[typeId]?.[extend.class]) parts.push('class', encodeURIComponent(klass));
    parts.push('id', encodeURIComponent(id));
    if (year) parts.push('year', encodeURIComponent(year));
    parts.push('page', page);
    return `${host}${parts.join('/')}.html`;
  }
  // 耐看点播旧版 MacCMS 路径：/show/{cateId}--{by}------{page}---{year}.html
  return `${host}/show/${encodeURIComponent(cate)}--${encodeURIComponent(extBy)}------${page}---${encodeURIComponent(year)}.html`;
}

function textOf($, node, selector) {
  return $(node).find(selector).first().text().replace(/\s+/g, ' ').trim();
}

function attrOf($, node, selector, attr) {
  return String($(node).find(selector).first().attr(attr) || '').trim();
}

function parseVodList(html, host = state.host) {
  const $ = load(html || '');
  const list = [];
  const seen = new Set();
  $('.module-item, .module-poster-item, .module-card-item').each((_, el) => {
    const self = $(el).is('a[href]') ? $(el) : null;
    const a = self || $(el).find('a[href]').first();
    const title = textOf($, el, '.module-poster-item-title')
      || textOf($, el, '.module-card-item-title')
      || textOf($, el, '.module-item-title')
      || a.attr('title')
      || a.attr('alt')
      || '';
    const pic = attrOf($, el, 'img.lazyload', 'data-original')
      || attrOf($, el, 'img', 'data-original')
      || attrOf($, el, 'img', 'data-src')
      || attrOf($, el, 'img', 'src');
    const href = a.attr('href') || '';
    if (!href || /^(?:javascript:|#)/i.test(href)) return;
    const vodId = fullUrl(href, host);
    if (!vodId || !title || seen.has(vodId)) return;
    seen.add(vodId);
    list.push({
      vod_id: vodId,
      vod_name: title.trim(),
      vod_pic: fullUrl(pic, host),
      vod_remarks: textOf($, el, '.module-item-note') || textOf($, el, '.module-card-item-note'),
    });
  });
  return list;
}

function pageCountFromHtml(html, page, listLength) {
  const $ = load(html || '');
  let max = page;
  $('.page a, .module-page a, .pagination a, a[href*="page/"]').each((_, el) => {
    const href = $(el).attr('href') || '';
    const inPager = $(el).parents('.page,.module-page,.pagination').length > 0 || /page\/\d+\.html/i.test(href);
    if (!inPager) return;
    const t = Number.parseInt($(el).text().trim(), 10);
    if (Number.isFinite(t) && t > 0 && t < 10000) max = Math.max(max, t);
    const m = href.match(/(?:_|page\/)(\d+)(?:\/|---|\.html)/) || href.match(/show\/[^/]+.*?------(\d+)---/);
    if (m) {
      const n = Number.parseInt(m[1], 10);
      if (Number.isFinite(n) && n > 0 && n < 10000) max = Math.max(max, n);
    }
  });
  return Math.max(max, listLength ? page + (listLength >= 20 ? 1 : 0) : page);
}

function parsePlayerJson(html) {
  const m = String(html || '').match(/var\s+player_aaaa\s*=\s*(\{[\s\S]*?\})\s*;?\s*<\/script>/i)
    || String(html || '').match(/var\s+player_aaaa\s*=\s*(\{[\s\S]*?\})\s*;?\s*$/i);
  if (!m) return null;
  try {
    const json = JSON.parse(m[1].trim().replace(/;$/, ''));
    let playUrl = String(json.url || '').trim();
    if (json.encrypt === '1' || json.encrypt === 1) playUrl = decodeURIComponent(playUrl);
    if (json.encrypt === '2' || json.encrypt === 2) playUrl = Buffer.from(playUrl, 'base64').toString('utf8');
    return { ...json, url: playUrl };
  } catch {
    return null;
  }
}

function b64DecodeUtf8(str) {
  return Buffer.from(String(str || ''), 'base64').toString('utf8');
}

function b64EncodeUtf8(str) {
  return Buffer.from(String(str || ''), 'utf8').toString('base64');
}

function nkdvdCustomStrDecode(value) {
  const key = CryptoJS.MD5('test').toString();
  const bytes = Buffer.from(String(value || ''), 'base64');
  let mixed = '';
  for (let i = 0; i < bytes.length; i += 1) {
    mixed += String.fromCharCode(bytes[i] ^ key.charCodeAt(i % key.length));
  }
  return b64DecodeUtf8(mixed);
}

function nkdvdMapString(srcMap, dstMap, str) {
  let out = '';
  for (const ch of String(str || '')) {
    if (/^[a-zA-Z]$/.test(ch) && srcMap.includes(ch)) out += dstMap[srcMap.indexOf(ch)];
    else out += ch;
  }
  return out;
}

function nkdvdDecodeApiUrl(encoded) {
  try {
    const decoded = nkdvdCustomStrDecode(encoded);
    const parts = decoded.split('/');
    if (parts.length < 3) return '';
    const obfMap = JSON.parse(b64DecodeUtf8(parts[0]));
    const realMap = JSON.parse(b64DecodeUtf8(parts[1]));
    const payload = b64DecodeUtf8(parts.slice(2).join('/'));
    // 站方 sign(): deString(JSON.parse(base64(secondMap)), JSON.parse(base64(firstMap)), base64(payload))
    // 等价到明文 payload 时，是把 secondMap 中的字母反查替换为 firstMap。
    const url = nkdvdMapString(realMap, obfMap, payload).trim();
    return /^https?:\/\//i.test(url) ? url : '';
  } catch {
    return '';
  }
}

async function resolveNkdvdDirectUrl(player, playPageUrl) {
  if (!player?.url) return '';
  const apiUrl = new URL('/player/api.php', playPageUrl).toString().replace(/^http:\/\//i, 'https://');
  const embedUrl = new URL('/player/', playPageUrl);
  embedUrl.searchParams.set('vid', player.url);
  const resp = await req({
    url: apiUrl,
    method: 'POST',
    headers: {
      ...SITE.headers,
      Referer: embedUrl.toString(),
      Origin: new URL(apiUrl).origin,
      'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
      'X-Requested-With': 'XMLHttpRequest',
      Accept: 'application/json,text/javascript,*/*;q=0.01',
    },
    data: new URLSearchParams({ vid: player.url }).toString(),
    timeout: 20000,
  });
  const data = typeof resp.data === 'string' ? JSON.parse(resp.data) : resp.data;
  const direct = nkdvdDecodeApiUrl(data?.data?.url || '');
  return direct;
}

function arr2hex(arr) {
  return arr.map(b => (`0${(b & 0xff).toString(16)}`).slice(-2)).join('');
}

function decryptData(hex, keyArr, ivArr) {
  try {
    const key = CryptoJS.enc.Hex.parse(arr2hex(keyArr));
    const iv = CryptoJS.enc.Hex.parse(arr2hex(ivArr));
    const src = CryptoJS.enc.Hex.parse(String(hex || '').replace(/[^0-9a-f]/gi, ''));
    const modes = [CryptoJS.mode.CBC, CryptoJS.mode.ECB, CryptoJS.mode.OFB, CryptoJS.mode.CFB, CryptoJS.mode.CTR];
    for (const mode of modes) {
      try {
        const params = { mode, padding: CryptoJS.pad.Pkcs7 };
        if (mode !== CryptoJS.mode.ECB) params.iv = iv;
        const dec = CryptoJS.AES.decrypt({ ciphertext: src }, key, params).toString(CryptoJS.enc.Utf8);
        if (dec) return dec;
      } catch {}
    }
  } catch {}
  return '';
}

function hexDecodeAndFilter(hexStr) {
  const pureHex = String(hexStr || '').replace(/[^0-9a-f]/gi, '');
  let decoded = '';
  for (let i = 0; i + 1 < pureHex.length; i += 2) {
    const ch = String.fromCharCode(Number.parseInt(pureHex.slice(i, i + 2), 16));
    if (/[a-zA-Z0-9:/\.\-?&=%_~#]/.test(ch)) decoded += ch;
  }
  return decoded.match(/https?:\/\/[^\s"'<>]+/)?.[0] || decoded.trim();
}

function getRandomPayload(value) {
  try {
    const raw = Buffer.from(String(value || '').slice(10), 'base64').toString('latin1');
    const data = raw.slice(10).replace('_nanke', '');
    const fixed = data.slice(0, 20) + data.slice(21);
    return hexDecodeAndFilter(fixed);
  } catch {
    return '';
  }
}

async function init() {
  await resolveHost();
  return {};
}

async function home(inReq) {
  const cacheKey = buildHomeCacheKey(SITE.key, inReq?.body || {});
  const cached = getHomeCache(cacheKey);
  if (cached) return cached;
  const result = { class: SITE.classes, filters: FILTERS };
  setHomeCache(cacheKey, result, HOME_CACHE_TTL.static);
  return result;
}

async function homeVod(inReq) {
  return category({ ...inReq, body: { ...(inReq?.body || {}), id: '1', page: 1 } });
}

async function category(inReq) {
  const body = inReq?.body || {};
  const tid = String(body.id || body.tid || '1');
  const page = normalizePage(body.page || body.pg);
  const extend = parseExtend(body.extend || body.filters || body.ext);
  const host = await resolveHost();
  const url = buildCategoryUrl(host, tid, page, extend);
  const html = await requestHtml(url, { referer: `${host}/` });
  const list = parseVodList(html, host);
  return { list, page, pagecount: pageCountFromHtml(html, page, list.length), limit: 20, total: list.length ? 9999 : 0 };
}

async function detail(inReq) {
  const rawId = Array.isArray(inReq?.body?.id) ? inReq.body.id[0] : inReq?.body?.id;
  const host = await resolveHost();
  const detailUrl = fullUrl(rawId, host);
  if (!detailUrl) return { list: [] };
  const html = await requestHtml(detailUrl, { referer: `${host}/` });
  const $ = load(html || '');
  const vod = {
    vod_id: detailUrl,
    vod_name: $('.module-info-heading h1').first().text().trim() || $('h1').first().text().trim(),
    vod_pic: fullUrl($('.module-info-poster img').first().attr('data-original') || $('.module-info-poster img').first().attr('data-src') || $('.module-info-poster img').first().attr('src') || '', host),
    vod_content: $('.video-info-content span').first().text().trim() || $('.module-info-introduction-content p').first().text().trim() || '',
    vod_play_from: '',
    vod_play_url: '',
  };
  $('.module-info-item').each((_, el) => {
    const title = textOf($, el, '.module-info-item-title');
    const value = (textOf($, el, '.module-info-item-content') || $(el).text()).replace(title, '').replace(/\/+$/g, '').trim();
    if (/导演/.test(title)) vod.vod_director = value;
    else if (/演员/.test(title)) vod.vod_actor = value;
    else if (/上映|年份/.test(title)) vod.vod_year = value;
    else if (/状态/.test(title)) vod.vod_remarks = value;
  });
  const tagTexts = $('.module-info-tag-link a').map((_, el) => $(el).text().trim()).get().filter(Boolean);
  if (tagTexts[1]) vod.vod_area = tagTexts[1];

  const playFrom = [];
  const playUrl = [];
  let tabs = $('.episode-tab').toArray();
  let panels = $('.episode-panel').toArray();
  if (!panels.length) {
    tabs = $('.module-tab-item.tab-item, .module-tab-item[data-dropdown-value]').toArray();
    panels = $('.module-play-list').toArray();
  }
  if (!tabs.length && panels.length) tabs = panels.map(() => null);
  panels.forEach((panel, idx) => {
    let line = `线路${idx + 1}`;
    if (tabs[idx]) {
      const name = ($(tabs[idx]).attr('data-dropdown-value') || $(tabs[idx]).find('span').first().text() || $(tabs[idx]).text())
        .replace(/\(.*?\)/g, '').replace(/\d+\s*$/g, '').replace(/\s+/g, ' ').trim();
      if (name) line = name;
    }
    const items = [];
    const nodes = $(panel).find('.episode-item, .module-play-list-link, a[href]').toArray();
    nodes.forEach((item) => {
      const a = $(item).is('a[href]') ? $(item) : $(item).find('a[href]').first();
      const href = a.attr('href') || '';
      if (!href || href === '#' || /^javascript/i.test(href)) return;
      const name = (a.find('span').first().text() || a.text() || $(item).text() || `第${items.length + 1}集`).replace(/\s+/g, ' ').trim();
      items.push(`${name}$${fullUrl(href, host)}@${line}`);
    });
    if (items.length) {
      playFrom.push(line);
      playUrl.push(items.join('#'));
    }
  });
  if (/nkdvd\.me/i.test(host) && playFrom.length > 1) {
    const priority = ['FF', 'YZ', 'LZ', 'RY', 'QS蓝光', 'WJ蓝光', 'BF'];
    const rows = playFrom.map((from, idx) => ({ from, url: playUrl[idx] || '' }));
    rows.sort((a, b) => {
      const ai = priority.indexOf(a.from);
      const bi = priority.indexOf(b.from);
      return (ai < 0 ? 99 : ai) - (bi < 0 ? 99 : bi);
    });
    vod.vod_play_from = rows.map(r => r.from).join('$$$');
    vod.vod_play_url = rows.map(r => r.url).join('$$$');
  } else {
    vod.vod_play_from = playFrom.join('$$$');
    vod.vod_play_url = playUrl.join('$$$');
  }
  return { list: [vod] };
}

async function search(inReq) {
  const body = inReq?.body || {};
  const wd = String(body.wd || body.key || body.keyword || '').trim();
  if (!wd) return { list: [] };
  const page = normalizePage(body.page || body.pg);
  const host = await resolveHost();
  const pageSuffix = page > 1 ? `&page=${page}` : '';
  const url = /nkdvd\.me/i.test(host)
    ? `${host}/vodsearch/${encodeURIComponent(wd)}----------${page}---.html`
    : `${host}/nk/-------------.html?wd=${encodeURIComponent(wd)}${pageSuffix}`;
  const html = await requestHtml(url, { referer: `${host}/` });
  const list = parseVodList(html, host);
  return { list, page, pagecount: pageCountFromHtml(html, page, list.length), limit: 20, total: list.length ? 9999 : 0 };
}

async function play(inReq) {
  const rawId = String(inReq?.body?.id || '').trim();
  if (!rawId) return { parse: 0, jx: 0, url: '' };
  const playPageUrl = rawId.split('@')[0];
  if (/\.(m3u8|mp4)(\?|$)/i.test(playPageUrl)) return { parse: 0, jx: 0, url: playPageUrl, header: { 'User-Agent': UA } };
  try {
    const html = await requestHtml(playPageUrl, { referer: playPageUrl });
    const player = parsePlayerJson(html);
    if (!player?.url) return { parse: 1, jx: 1, url: playPageUrl };
    if (/\.(m3u8|mp4)(\?|$)|m3u8|mp4/i.test(player.url) && /^https?:\/\//i.test(player.url)) {
      return { parse: 0, jx: 0, url: player.url, header: { 'User-Agent': UA } };
    }
    if (/nkdvd\.me/i.test(playPageUrl)) {
      const direct = await resolveNkdvdDirectUrl(player, playPageUrl);
      if (direct) return { parse: 0, jx: 0, url: direct, header: { 'User-Agent': UA, Referer: new URL(direct).origin + '/' } };
    }

    const parseDomain = process.env.NKVOD_PARSE_URL || 'https://gg.xn--it-if7c19g5s4bps5c.com/nkvod3.php';
    const parseUrl = `${parseDomain}${parseDomain.includes('?') ? '&' : '?'}url=${encodeURIComponent(player.url)}&next=${encodeURIComponent(player.link_next || '')}&title=${encodeURIComponent(player.vod_data?.vod_name || '')}`;
    const jxHtml = await requestHtml(parseUrl, { referer: playPageUrl, headers: { Accept: '*/*' }, timeout: 20000 });
    const key = jxHtml.match(/var\s+raw_key\s*=\s*\[(.*?)\]/)?.[1]?.split(',').map(Number).filter(Number.isFinite) || [];
    const iv = jxHtml.match(/var\s+iv\s*=\s*\[(.*?)\]/)?.[1]?.split(',').map(Number).filter(Number.isFinite) || [];
    const encrypted = jxHtml.match(/var\s+encrypted\s*=\s*["'](.*?)["']/)?.[1] || '';
    if (!key.length || !encrypted) return { parse: 1, jx: 1, url: playPageUrl };
    const dec = decryptData(encrypted, key, iv);
    let finalUrl = dec.match(/getrandom\(["'](.*?)["']\)/)?.[1];
    finalUrl = finalUrl ? getRandomPayload(finalUrl) : (dec.match(/https?:\/\/[^\s"'<>]+/)?.[0] || '');
    if (!finalUrl) return { parse: 1, jx: 1, url: playPageUrl };
    return { parse: 0, jx: 0, url: finalUrl, header: { 'User-Agent': UA } };
  } catch {
    return { parse: 1, jx: 1, url: playPageUrl };
  }
}

export default {
  meta: { key: SITE.key, name: SITE.name, type: 3, searchable: 2, quickSearch: 0, filterable: 1, logo: SITE.logo },
  api: async fastify => {
    fastify.post('/init', init);
    fastify.post('/home', home);
    fastify.post('/homeVod', homeVod);
    fastify.post('/category', category);
    fastify.post('/detail', detail);
    fastify.post('/play', play);
    fastify.post('/search', search);
  },
};

export const __test = { buildCategoryUrl, parseVodList, parsePlayerJson, decryptData, getRandomPayload, resolveHost };

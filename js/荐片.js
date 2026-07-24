let host = 'https://api.ztcgi.com';
let UA = 'Mozilla/5.0 (Linux; Android 9; TVBox) AppleWebKit/537.36 Chrome/110 Mobile Safari/537.36';

let imghost = host;

// =========================
// 🔥 自动安全请求
// =========================
async function reqSafe(url, opt = {}) {
  try {
    let res = await req(url, opt);
    if (!res || !res.content) return null;
    return JSON.parse(res.content);
  } catch (e) {
    return null;
  }
}

// =========================
// 🔥 全自动字段识别（核心）
// =========================
function pick(obj, keys) {
  for (let k of keys) {
    if (obj && obj[k] != null && obj[k] !== '') return obj[k];
  }
  return '';
}

// =========================
// 🔥 图片自动识别（重点修复你问题）
// =========================
function getPic(item) {
  let pic = pick(item, [
    'vod_pic', 'pic', 'img', 'image', 'cover',
    'thumbnail', 'poster', 'path', 'logo'
  ]);

  if (!pic) return '';

  if (pic.startsWith('http')) return pic;

  return `${imghost}${pic}`;
}

// =========================
// init（自动修复域名）
// =========================
async function init(cfg) {
  cfg.skey = '';
  cfg.stype = '3';

  let res = await reqSafe(`${host}/api/appAuthConfig`);
  let domain = res?.data?.imgDomain;

  if (domain) imghost = `https://${domain}`;
}

// =========================
// home
// =========================
async function home() {
  return JSON.stringify({
    class: [
      { type_id: '1', type_name: '电影' },
      { type_id: '2', type_name: '电视剧' },
      { type_id: '3', type_name: '动漫' },
      { type_id: '4', type_name: '综艺' },
      { type_id: '67', type_name: '短剧' }
    ]
  });
}

// =========================
// 首页推荐（自动兼容字段）
// =========================
async function homeVod() {
  let res = await reqSafe(`${host}/api/slide/list?pos_id=88`, {
    headers: { 'User-Agent': UA, 'Referer': host }
  });

  let list = res?.data || [];

  let videos = [];

  for (let item of list) {
    let id = pick(item, ['vod_id', 'jump_id', 'id', 'aid']);
    let name = pick(item, ['title', 'name', 'vod_name']);
    let pic = getPic(item);

    if (!id || !pic) continue;

    videos.push({
      vod_id: id,
      vod_name: name || '未知',
      vod_pic: pic,
      vod_remarks: pick(item, ['mask', 'episode', 'remark', 'score']),
      style: { type: "rect", ratio: 1.33 }
    });
  }

  return JSON.stringify({ list: videos });
}

// =========================
// 分类（全字段自动兼容）
// =========================
async function category(tid, pg = 1, filter, extend = {}) {
  let url = `${host}/api/crumb/list?fcate_pid=${tid}` +
    `&area=${extend.area || ''}` +
    `&year=${extend.year || ''}` +
    `&type=${extend.cateId || ''}` +
    `&sort=${extend.sort || ''}` +
    `&page=${pg}`;

  let res = await reqSafe(url, {
    headers: { 'User-Agent': UA, 'Referer': host }
  });

  let list = res?.data || [];

  let videos = list.map(item => ({
    vod_id: pick(item, ['id', 'vod_id', 'aid']),
    vod_name: pick(item, ['title', 'name', 'vod_name']),
    vod_pic: getPic(item),
    vod_remarks: pick(item, ['mask', 'remark', 'update']),
    vod_year: pick(item, ['year', 'vod_year'])
  })).filter(v => v.vod_id);

  return JSON.stringify({
    page: pg,
    pagecount: 999,
    limit: 20,
    total: 99999,
    list: videos
  });
}

// =========================
// 详情（全兼容线路结构）
// =========================
async function detail(id) {
  let res = await reqSafe(`${host}/api/video/detailv2?id=${id}`, {
    headers: { 'User-Agent': UA, 'Referer': host }
  });

  let data = res?.data;
  if (!data) return JSON.stringify({ list: [] });

  let sources = data.source_list_source || [];

  let from = sources.map(i => i.name).join('$$$');
  let urls = sources.map(s =>
    (s.source_list || [])
      .map(v => `${v.source_name}$${v.url}`)
      .join('#')
  ).join('$$$');

  return JSON.stringify({
    list: [{
      vod_year: data.year,
      vod_area: data.area,
      vod_remarks: data.mask,
      vod_content: data.description,
      vod_play_from: from,
      vod_play_url: urls
    }]
  });
}

// =========================
// 播放
// =========================
async function play(flag, id) {
  if (!id) return JSON.stringify({ url: '' });

  if (id.includes('.m3u8')) {
    return JSON.stringify({ parse: 0, url: id });
  }

  return JSON.stringify({
    parse: 0,
    url: `tvbox-xg:${id}`
  });
}

// =========================
// 搜索（全字段自动识别）
// =========================
async function search(wd) {
  let res = await reqSafe(
    `${host}/api/v2/search/videoV2?key=${wd}&category_id=88&page=1&pageSize=20`,
    { headers: { 'User-Agent': UA, 'Referer': host } }
  );

  let list = res?.data || [];

  let videos = list.map(item => ({
    vod_id: pick(item, ['id', 'vod_id']),
    vod_name: pick(item, ['title', 'name']),
    vod_pic: getPic(item),
    vod_remarks: pick(item, ['mask', 'remark']),
    vod_year: pick(item, ['year'])
  })).filter(v => v.vod_id);

  return JSON.stringify({
    limit: 20,
    list: videos
  });
}

// =========================
// 导出
// =========================
export function __jsEvalReturn() {
  return {
    init,
    home,
    homeVod,
    category,
    detail,
    play,
    search
  };
}
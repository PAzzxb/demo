/**
 * @config
 * timeout: 30
 * blockImages: true
 */

const BASE_URL = 'https://fly.daoran.tv';

// ========== 请求头（与 Node.js 源保持一致） ==========
var REQ_HEADERS = {
    "User-Agent": "okhttp/3.12.10",
    "md5": "SkvyrWqK9QHTdCT12Rhxunjx+WwMTe9y4KwgeASFDhbYabRSPskR0Q==",
    "Cookie": "JSESSIONID=41ABA76E6D45A44D6419B3F26A0851ED",
    "Content-Type": "application/json; charset=UTF-8",
    "Connection": "Keep-Alive",
    "Accept-Encoding": "gzip"
};

// ========== 分类映射（62个，硬编码） ==========
var CLASS_MAP = [
    { id: "yuju", name: "豫剧" },
    { id: "hmx", name: "黄梅戏" },
    { id: "yueju", name: "越剧" },
    { id: "jingju", name: "京剧" },
    { id: "pingju", name: "评剧" },
    { id: "quju", name: "曲剧" },
    { id: "hnzz", name: "坠子" },
    { id: "qinq", name: "秦腔" },
    { id: "hbbz", name: "河北梆子" },
    { id: "chaoju", name: "潮剧" },
    { id: "gddx", name: "粤剧" },
    { id: "huju", name: "沪剧" },
    { id: "ejx", name: "二夹弦" },
    { id: "kunqu", name: "昆曲" },
    { id: "hnqs", name: "河南琴书" },
    { id: "huaiju", name: "淮剧" },
    { id: "danxian", name: "单弦" },
    { id: "xqx", name: "西秦戏" },
    { id: "wuju", name: "婺剧" },
    { id: "bzx", name: "白字戏" },
    { id: "hndgs", name: "河南大鼓书" },
    { id: "yued", name: "越调" },
    { id: "dianju", name: "滇剧" },
    { id: "tkdq", name: "太康道情" },
    { id: "MZYY", name: "民族音乐" },
    { id: "yangju", name: "扬剧" },
    { id: "other", name: "其他" },
    { id: "else", name: "曲艺晚会" },
    { id: "ERT", name: "二人台" },
    { id: "blbz", name: "北路梆子" },
    { id: "caidiao", name: "彩调" },
    { id: "lq", name: "乐腔" },
    { id: "WK", name: "老年大学" },
    { id: "lvjv", name: "吕剧" },
    { id: "tjsd", name: "天津时调" },
    { id: "liuqx", name: "柳琴戏" },
    { id: "jydg", name: "京韵大鼓" },
    { id: "pyx", name: "皮影戏" },
    { id: "xj", name: "湘剧" },
    { id: "spd", name: "四平调" },
    { id: "qiongju", name: "琼剧" },
    { id: "xiju", name: "锡剧" },
    { id: "pingshu", name: "评书" },
    { id: "shaojv", name: "绍剧" },
    { id: "jddg", name: "京东大鼓" },
    { id: "luju", name: "庐剧" },
    { id: "huaju", name: "话剧" },
    { id: "xhdg", name: "西河大鼓" },
    { id: "huagx", name: "莆仙戏" },
    { id: "chuanju", name: "川剧" },
    { id: "xiang", name: "相声" },
    { id: "wb", name: "宛梆" },
    { id: "jzyg", name: "晋中秧歌" },
    { id: "caichaxi", name: "采茶戏" },
    { id: "pujv", name: "蒲剧" },
    { id: "hj", name: "汉剧" },
    { id: "minju", name: "闽剧" },
    { id: "jinju", name: "晋剧" },
    { id: "jiju", name: "吉剧" },
    { id: "zzx", name: "正字戏" },
    { id: "gj", name: "赣剧" },
    { id: "chuju", name: "楚剧" },
    { id: "dpd", name: "大平调" },
    { id: "bdld", name: "保定老调" }
];

var DEFAULT_COVER = "https://img0.baidu.com/it/u=4079405848,3806507810&fm=253&fmt=auto&app=138&f=JPEG?w=500&h=750";

// 公共参数
var COMMON_PARAMS = {
    userId: "d4b29595b6fe764e09078a0dad7352ff",
    channel: "oppo",
    nodeCode: "001000",
    project: "lyhxcx"
};

// ========== Routes（fetch 模式） ==========
var routes = {
    homeContent: function () { return false; },
    homeVideoContent: function () { return false; },
    categoryContent: function (tid, pg, filter, extend) { return false; },
    detailContent: function (ids) { return false; },
    searchContent: function (key, quick, pg) { return false; },
    playerContent: function (flag, id, vipFlags) { return false; }
};

// ========== 工具函数 ==========
function makeVodId(code, title) {
    if (!code) return '';
    var t = String(title || '').trim();
    if (!t) return code;
    return code + '@@' + encodeURIComponent(t);
}

function parseVodId(id) {
    var raw = String(id || '');
    var idx = raw.lastIndexOf('@@');
    if (idx === -1) return { code: raw, title: '' };
    var code = raw.slice(0, idx);
    var encTitle = raw.slice(idx + 2);
    var title = '';
    try { title = decodeURIComponent(encTitle); } catch (e) { title = encTitle; }
    return { code: code, title: String(title || '').trim() };
}

// ========== 爬虫方法 ==========

async function homeContent() {
    var classes = CLASS_MAP.map(function (item) {
        return { type_id: item.id, type_name: item.name };
    });
    return { class: classes, list: [], page: 1, pagecount: 1 };
}

async function homeVideoContent() {
    return { list: [], page: 1, pagecount: 1 };
}

async function categoryContent(tid, pg, filter, extend) {
    try {
        var page = parseInt(pg) || 1;
        var result = await fetchCategoryByScreen(tid, page);
        if (!result) result = await fetchCategoryByList(tid, page);
        if (!result) result = await fetchCategoryByScreen(tid, page, 0);
        return result || { list: [], page: page, pagecount: 1 };
    } catch (e) {
        console.error('categoryContent error:', e.message);
        return { list: [], page: parseInt(pg) || 1, pagecount: 1 };
    }
}

async function fetchCategoryByScreen(tid, page, resType) {
    if (resType === undefined) resType = 1;
    var data = Object.assign({}, COMMON_PARAMS, {
        cur: page,
        free: 0,
        orderby: "hot",
        pageSize: 3000,
        resType: resType,
        sect: tid,
        tagId: 0,
        item: "y9"
    });
    var res = await fetch(BASE_URL + '/API_ROP/search/album/screen', {
        method: 'POST',
        headers: REQ_HEADERS,
        body: JSON.stringify(data)
    });
    var json = await res.json();
    return buildCategoryResult(json, page, 3000);
}

async function fetchCategoryByList(tid, page) {
    var data = Object.assign({}, COMMON_PARAMS, {
        cur: page,
        free: 0,
        orderby: "hot",
        pageSize: 300,
        resType: 1,
        sect: tid,
        tagId: 0,
        item: "y9"
    });
    var res = await fetch(BASE_URL + '/API_ROP/search/album/list', {
        method: 'POST',
        headers: REQ_HEADERS,
        body: JSON.stringify(data)
    });
    var json = await res.json();
    return buildCategoryResult(json, page, 300);
}

function buildCategoryResult(json, page, pageSize) {
    var items = (json && json.pb && json.pb.dataList) ? json.pb.dataList : [];
    var total = (json && json.pb && json.pb.total) ? json.pb.total : 0;
    if (items.length === 0) return null;

    var list = [];
    items.forEach(function (it) {
        var title = it.name || '';
        var code = it.code || '';
        var desc = it.des || '';
        if (title && code) {
            list.push({
                vod_id: makeVodId(code, title),
                vod_name: title,
                vod_pic: DEFAULT_COVER,
                vod_remarks: desc
            });
        }
    });
    var pageCount = Math.ceil(total / pageSize) || 1;
    return { list: list, page: page, pagecount: pageCount };
}

async function searchContent(key, quick, pg) {
    try {
        var page = parseInt(pg) || 1;
        var data = Object.assign({}, COMMON_PARAMS, {
            cur: page,
            free: 0,
            keyword: key,
            orderby: "hot",
            pageSize: 200,
            px: 2,
            sect: []
        });
        var res = await fetch(BASE_URL + '/API_ROP/search/album/list', {
            method: 'POST',
            headers: REQ_HEADERS,
            body: JSON.stringify(data)
        });
        var json = await res.json();
        var items = (json && json.pb && json.pb.dataList) ? json.pb.dataList : [];
        var total = (json && json.pb && json.pb.total) ? json.pb.total : 0;

        var list = [];
        items.forEach(function (it) {
            var title = it.name || '';
            var code = it.code || '';
            var desc = it.des || '';
            if (title && code) {
                list.push({
                    vod_id: makeVodId(code, title),
                    vod_name: title,
                    vod_pic: DEFAULT_COVER,
                    vod_remarks: desc
                });
            }
        });
        var pageCount = Math.ceil(total / 200) || 1;
        return { list: list, page: page, pagecount: pageCount };
    } catch (e) {
        console.error('searchContent error:', e.message);
        return { list: [], page: parseInt(pg) || 1, pagecount: 1 };
    }
}

async function detailContent(ids) {
    try {
        var parsed = parseVodId(ids);
        var code = parsed.code;
        var sourceTitle = parsed.title;
        if (!code) return { list: [], page: 1, pagecount: 1 };

        var data = Object.assign({}, COMMON_PARAMS, {
            albumCode: code,
            cur: 1,
            pageSize: 100,
            item: "y9"
        });
        var res = await fetch(BASE_URL + '/API_ROP/album/res/list', {
            method: 'POST',
            headers: REQ_HEADERS,
            body: JSON.stringify(data)
        });
        var json = await res.json();
        var items = (json && json.pb && json.pb.dataList) ? json.pb.dataList : [];

        var playList = [];
        items.forEach(function (it) {
            var title = it.name || '';
            var itemCode = it.code || '';
            if (title && itemCode) {
                playList.push(title + '$' + 'https://zheshiyitaiojialianjie.com?' + itemCode);
            }
        });
        if (playList.length === 0) {
            playList.push('正片$' + 'https://zheshiyitaiojialianjie.com?' + code);
        }

        var detail = {
            vod_id: code,
            vod_name: sourceTitle || '未知剧名',
            vod_pic: DEFAULT_COVER,
            vod_content: '',
            type_name: '',
            vod_remarks: '',
            vod_year: '',
            vod_area: '',
            vod_director: '未知',
            vod_actor: '未知',
            vod_play_from: '球球啦',
            vod_play_url: playList.join('#')
        };
        return { list: [detail], page: 1, pagecount: 1 };
    } catch (e) {
        console.error('detailContent error:', e.message);
        return { list: [], page: 1, pagecount: 1 };
    }
}

async function playerContent(flag, id, vipFlags) {
    try {
        var code = '';
        if (id.indexOf('?') !== -1) {
            code = id.split('?')[1] || '';
        }
        if (!code) code = id;
        if (!code) return { parse: 1, url: id };

        var data = Object.assign({}, COMMON_PARAMS, {
            item: "o3",
            mask: 0,
            px: 2,
            resCode: code
        });
        var res = await fetch(BASE_URL + '/API_ROP/play/get/playurl', {
            method: 'POST',
            headers: REQ_HEADERS,
            body: JSON.stringify(data)
        });
        var json = await res.json();
        var realUrl = (json && json.playUrls && json.playUrls.hd) ? json.playUrls.hd : '';

        if (realUrl) {
            return {
                parse: 0,
                url: realUrl,
                header: {
                    "User-Agent": "okhttp/3.12.10",
                    "Referer": BASE_URL + "/",
                    "Origin": BASE_URL
                }
            };
        }
        return { parse: 1, url: id };
    } catch (e) {
        console.error('playerContent error:', e.message);
        return { parse: 1, url: id };
    }
}
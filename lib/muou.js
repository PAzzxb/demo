
import { Crypto, _ } from 'assets://js/lib/cat.js';

let siteUrl = '';
let key = '';
let iv = '';
let playerUrl = '';
let siteKey = '';
let siteType = 0;
let headers = {
    'sys-version': '12',
    'os': 'Android',
    'User-Agent': 'Mozilla/5.0 (Linux; Android 12) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/92.0.4515.105 MUOUAPP/10.8.4506.400',
    'app-device': 'nodata',
    'brand-model': 'SM-E5658',
    'app-version': '4.2.0',
    'Connection': 'Keep-Alive'
};

let name = '';
let Host = '';
let version = '';
let jxApi = '';
let configRes;

async function request(reqUrl, data, header, method) {
    let res = await req(reqUrl, {
        method: method || 'get',
        data: data || '',
        headers: header || headers,
        postType: method === 'post' ? 'form' : '',
        timeout: 5000,
    });
    return res.content;
}

async function init(cfg) {
    siteKey = cfg.skey;
    siteType = cfg.stype;
    if (cfg.ext) {
        try {
            let words = Crypto.enc.Base64.parse(cfg.ext);
            let decodedExt = words.toString(Crypto.enc.Utf8);
            [Host, name, version] = decodedExt.split('|');
        } catch (e) {
            [Host, name, version] = cfg.ext.split('|');
        }

        if (!Host) {
            throw new Error('-1 解析ext失败');
        }

        if(!name){
            name = 'muou';
        }

        if(version){
            headers['app-version'] = version;
        }

        playerUrl = Host;

        let time = Math.floor(Date.now() / 1000);
        let innerSha1 = sha1(`${time}${name}`);
        let outerSha1 = sha1(`${time}${innerSha1}muouapp`);

        let postData = {
            t: time,
            m: outerSha1,
            n: innerSha1
        };

        let dat = await request(`${Host}/app_info.php`, postData, {
            ...headers,
            'Content-Type': 'application/x-www-form-urlencoded'
        }, 'post');


        if (!dat) {
            throw new Error('-2 数据获取失败');
        }

        let dat2 = JSON.parse(dat);

        let {data = '', a = '', e = '', s = ''} = dat2;

        if (!a || !e || !s) {
            throw new Error('-3 参数获取失败');
        }

        let data2 = t(data, s, e);

        let configKey = md5(a).substring(0, 16);
        let configIv = md5(outerSha1).substring(0, 16);

        let result = aesDecode(data2, configKey, configIv);

        if (!result) {
            throw new Error('-4 解密失败');
        }

        let dat3 = JSON.parse(result);
        let {key: key2 = '', iv: iv2 = '', HBrjjg: jx = '', HBqq: cmsHost = ''} = dat3;
        // let { key: key2 = '', iv: iv2 = '', HBqq: cmsHost = '' } = dat3;
        siteUrl = cmsHost;

        if (/^https?:\/\/./.test(jx)) {
            jxApi = jx;
        }

        key = md5(key2).substring(0, 16);
        iv = md5(iv2).substring(0, 16);


        if (siteUrl && !siteUrl.endsWith('/api.php')) {
            siteUrl = siteUrl.replace(/\/+$/, '') + '/api.php';
        }
        if (playerUrl && !playerUrl.endsWith('/api.php')) {
            playerUrl = playerUrl.replace(/\/+$/, '') + '/api.php';
        }
    }
}

async function home(filter) {
    let response = await request(`${siteUrl}/v1.vod/types`, headers);
    let configclass;
    try {
        configclass = JSON.parse(response);
    } catch (e) {
        let decrypted = aesDecode(response, key, iv);
        if (decrypted) {
            configclass = JSON.parse(decrypted);
        } else {
            return JSON.stringify({class: [], filters: {}});
        }
    }
    let classes = [];
    let filters = {};
    _.forEach(configclass.data.typelist, item => {
        classes.push({
            type_id: item.type_id,
            type_name: item.type_name,
        });
        let filterList = [];
        const filterConfig = {
            'class': '分类',
            'area': '区域',
            'lang': '语言',
            'year': '年份',
            'state': '状态',
            'version': '版本',
            'sort': '排序'
        };
        _.forEach(filterConfig, (name, key) => {
            let filterValues = [];
            if (key === 'sort') {
                filterValues = [
                    {v: 'time', n: '时间排序'},
                    {v: 'hits', n: '热度排序'},
                    {v: 'score', n: '评分排序'}
                ];
            } else if (item.type_extend[key]) {
                filterValues = _.map(item.type_extend[key].split(','), i => {
                    return {v: i.trim(), n: i.trim()};
                });
            }
            if (filterValues.length > 0) {
                filterList.push({
                    name: name,
                    key: key,
                    value: filterValues
                });
            }
        });
        filters[item.type_id] = filterList;
    });
    return JSON.stringify({
        'class': classes,
        'filters': filters,
    });
}

async function homeVod() {
    let response = await request(`${siteUrl}/v1.vod?type=1&class=&area=&year=&by=time&page=0&limit=9`, headers);
    let kjson;
    try {
        kjson = JSON.parse(response);
    } catch (e) {
        let decrypted = aesDecode(response, key, iv);
        if (decrypted) {
            kjson = JSON.parse(decrypted);
        } else {
            return JSON.stringify({list: []});
        }
    }
    let videos = [];
    let klists = kjson.data.list || [];
    _.forEach(klists, it => {
        videos.push({
            vod_id: it.vod_id,
            vod_name: it.vod_name,
            vod_pic: it.vod_pic,
            vod_remarks: it.vod_sub || '',
            vod_year: it.vod_year,
            vod_content: it.vod_blurb || '',
        });
    });
    return JSON.stringify({
        list: videos,
    });
}

async function category(tid, pg, filter, extend) {
    if (pg <= 0) pg = 1;
    let url = `${siteUrl}/v1.vod?type=${tid}&class=${extend.class || ''}&area=${extend.area || ''}&year=${extend.year || ''}&by=${extend.by || 'time'}&page=${pg}&limit=20`;
    let response = await request(url, null, headers, 'get');
    let kjson;
    try {
        kjson = JSON.parse(response);
    } catch (e) {
        let decrypted = aesDecode(response, key, iv);
        if (decrypted) {
            kjson = JSON.parse(decrypted);
        } else {
            return JSON.stringify({page: pg, pagecount: 9999, list: []});
        }
    }
    let videos = [];
    let klists = kjson.data.list || [];
    _.forEach(klists, it => {
        videos.push({
            vod_id: it.vod_id,
            vod_name: it.vod_name,
            vod_pic: it.vod_pic,
            vod_remarks: it.vod_sub || '',
            vod_year: it.vod_year,
            vod_content: it.vod_blurb || '',
        });
    });
    return JSON.stringify({
        page: pg,
        pagecount: 9999,
        list: videos,
    });
}

async function detail(id) {
    let url = `${siteUrl}/v1.vod/detail?vod_id=${id}`;
    let response = await request(url, null, headers, 'get');
    let kjson;
    try {
        kjson = JSON.parse(response);
    } catch (e) {
        let decrypted = aesDecode(response, key, iv);
        if (decrypted) {
            kjson = JSON.parse(decrypted);
            console.log(kjson);
        } else {
            return JSON.stringify({list: []});
        }
    }
    let v = kjson.data;
    let video = {
        vod_id: v.vod_id,
        vod_name: v.vod_name || '',
        type_name: v.type?.type_name || '',
        vod_year: v.vod_year || '',
        vod_area: v.vod_area || '',
        vod_remarks: v.vod_remarks || '',
        vod_actor: v.vod_actor || '',
        vod_director: v.vod_director || '',
        vod_content: v.vod_content || '无',
        vod_pic: v.vod_pic || '',
    };
    let playSources = _.map(v.vod_play_list || {}, (item, key) => {
        const show = item.player_info?.show || item.from || '';
        const nameUrls = _.map(item.urls || {}, j => {
            return `${j.name || ''}$${j.url}@${item.from}`;
        }).join('#');
        return {
            show,
            urls: nameUrls
        };
    });
    const getPriority = (show) => {
        const s = show.toLowerCase();
        if (s.includes('4k')) return 0;
        if (s.includes('自建')) return 1;
        if (s.includes('蓝光')) return 2;
        if (s.includes('独家')) return 3;
        if (s.includes('秒播')) return 4;
        if (s.includes('专线')) return 5;
        return 6;
    };
    playSources.sort((a, b) => getPriority(a.show) - getPriority(b.show));
    let froms = _.map(playSources, s => s.show);
    let urls = _.map(playSources, s => s.urls);
    video.vod_play_from = froms.join('$$$');
    video.vod_play_url = urls.join('$$$');
    return JSON.stringify({
        list: [video],
    });
}

async function play(flag, id, flags) {
    let [url, from] = id.split('@');

    // if (from.includes('BX')) {
    //     let apiUrl = `http://114.66.60.101:901/api/?key=tAbjpIdBcurV75JxY0&url=${encodeURIComponent(url)}`;
    //     let apiResponse = await request(apiUrl);
    //     try {
    //         let apiRes = JSON.parse(apiResponse);
    //         if (apiRes.url) {
    //             return JSON.stringify({
    //                 parse: 0,
    //                 url: apiRes.url,
    //             });
    //         }
    //     } catch (e) {}
    //     return JSON.stringify({
    //         parse: 0,
    //         jx: 1,
    //         url: url,
    //     });
    // }

    if(/https?:\/\/.*\.(?:avi|wmv|wmp|wm|asf|mpg|mpeg|mpe|m1v|m2v|mpv2|mp2v|ts|tp|tpr|trp|vob|ifo|ogm|ogv|mp4|m4v|m4p|m4b|3gp|3gpp|3g2|3gp2|mkv|rm|ram|rmvb|rpm|flv|mov|qt|nsv|dpg|m2ts|m2t|mts|dvr-ms|k3g|skm|evo|nsr|amv|divx|webm|wtv|f4v|mxf|m3u8|m3u|mpd)/i.test(url)){
        return JSON.stringify({
            parse: 0,
            jx: 0,
            url: url,
        });
    }

    if (!configRes) {
        let response = await request(`${playerUrl}?action=playerinfo`, headers);
        try {
            configRes = JSON.parse(response);
        } catch (e) {
            let decrypted = aesDecode(response, key, iv);
            if (decrypted) {
                try {
                    configRes = JSON.parse(decrypted);
                } catch (e) {
                    return JSON.stringify({
                        parse: 0,
                        jx: 1,
                        url: url,
                    });
                }
            } else {
                return JSON.stringify({
                    parse: 0,
                    jx: 1,
                    url: url,
                });
            }
        }
    }

    if (configRes.code === 200 && configRes.data && Array.isArray(configRes.data.playerinfo)) {
        let playerinfo = configRes.data.playerinfo;
        let playerua = configRes.data.playerua;
        let match = _.find(playerinfo, p => p.playername === from);
        if (match) {
            let jiekou = match.playerjiekou;
            let targetUrl = jiekou + url;
            let playHeaders = {
                'User-Agent': playerua && playerua.length > 0 ? playerua[0] : 'okhttp/3.14.9',
            };
            let playResponse = await request(targetUrl, null, playHeaders);
            let playRes;
            try {
                playRes = JSON.parse(playResponse);
            } catch (e) {
                let decrypted = aesDecode(playResponse, key, iv);
                if (decrypted) {
                    try {
                        playRes = JSON.parse(decrypted);
                    } catch (e) {
                        return JSON.stringify({
                            parse: 0,
                            jx: 1,
                            url: url,
                        });
                    }
                } else {
                    return JSON.stringify({
                        parse: 0,
                        jx: 1,
                        url: url,
                    });
                }
            }
            if (Number(playRes.code) === 200) {
                return JSON.stringify({
                    parse: 0,
                    url: playRes.url,
                });
            }
        }
    }

    if (jxApi && url && !(/^https?:\/\/./.test(url))) {
        try {
            let parseDat = await request(jxApi + url, null, headers, 'get');
            let parsedData;
            try {
                parsedData = JSON.parse(parseDat);
            } catch (error) {
                let parseDat2 = aesDecode(parseDat, key, iv);
                parsedData = JSON.parse(parseDat2);
            }

            if (parsedData?.url) {
                return JSON.stringify({
                    parse: 0,
                    url: parsedData.url,
                });
            }
        } catch (error) {
            console.error('解析URL出错 -1:', error);
        }
    }

    return JSON.stringify({
        parse: 0,
        jx: 0,
        url: url,
    });
}

async function search(wd, quick, pg) {
    let params = {
        page: pg || '1',
        type_id: '0',
        keywords: wd,
    };
    let url = `${siteUrl}/v1.vod?limit=18&page=${pg || 1}&wd=${encodeURIComponent(wd)}`;
    let response = await request(url, null, headers, 'get');
    let kjson;
    try {
        kjson = JSON.parse(response);
    } catch (e) {
        let decrypted = aesDecode(response, key, iv);
        if (decrypted) {
            kjson = JSON.parse(decrypted);
        } else {
            return JSON.stringify({list: []});
        }
    }
    let videos = [];
    let klists = kjson.data.list || [];
    _.forEach(klists, it => {
        videos.push({
            vod_id: it.vod_id,
            vod_name: it.vod_name,
            vod_pic: it.vod_pic,
            vod_remarks: it.vod_sub || '',
            vod_year: it.vod_year,
            vod_content: it.vod_blurb || '',
        });
    });
    return JSON.stringify({
        list: videos,
    });
}

function aesDecode(str, keyStr, ivStr, type) {
    const key = Crypto.enc.Utf8.parse(keyStr);
    str = str.replace(/^\uFEFF/, '');
    if (type === 'hex') {
        try {
            str = Crypto.enc.Hex.parse(str);
            const decrypted = Crypto.AES.decrypt({ciphertext: str}, key, {
                iv: Crypto.enc.Utf8.parse(ivStr),
                mode: Crypto.mode.CBC,
                padding: Crypto.pad.Pkcs7,
            });
            return decrypted.toString(Crypto.enc.Utf8);
        } catch (e) {
            return null;
        }
    }
    try {
        const decrypted = Crypto.AES.decrypt(str, key, {
            iv: Crypto.enc.Utf8.parse(ivStr),
            mode: Crypto.mode.CBC,
            padding: Crypto.pad.Pkcs7,
        });
        return decrypted.toString(Crypto.enc.Utf8);
    } catch (e) {
        return null;
    }
}

function t(s, v, v1) {
    if (s !== null && s !== '') {
        const len = s.length;
        if (v < 0 || v1 < 0) {
            throw new Error("参数不能为负数");
        }
        if (v + v1 <= len) {
            return s.substring(v, len - v1);
        } else {
            return '';
        }
    }
    return s;
}

function aesEncode(str, keyStr, ivStr, type) {
    const key = Crypto.enc.Utf8.parse(keyStr);
    let encData = Crypto.AES.encrypt(str, key, {
        iv: Crypto.enc.Utf8.parse(ivStr),
        mode: Crypto.mode.CBC,
        padding: Crypto.pad.Pkcs7,
    });
    if (type === 'hex') {
        return encData.ciphertext.toString(Crypto.enc.Hex);
    }
    return encData.toString();
}

function md5(text) {
    return Crypto.MD5(text).toString();
}

function sha1(str) {
    return Crypto.SHA1(str).toString();
}

export function __jsEvalReturn() {
    return {
        init: init,
        home: home,
        homeVod: homeVod,
        category: category,
        detail: detail,
        play: play,
        search: search,
    };
}

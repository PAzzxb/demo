// Douban.js - 豆瓣爬虫 (CatVodSpider JS版)
class Douban {
    constructor() {
        this.apikey = "?apikey=0ac44ae016490db2204ce0a042db2916";
        this._searchCache = null; // 用于猜你喜欢缓存
    }

    // ---------- 私有方法 ----------
    _getHeaders() {
        return {
            "Host": "frodo.douban.com",
            "Connection": "Keep-Alive",
            "Referer": "https://servicewechat.com/wx2f9b06c1de1ccfca/84/page-frame.html",
            "User-Agent": "Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/53.0.2785.143 Safari/537.36 MicroMessenger/7.0.9.501 NetType/WIFI MiniProgramEnv/Windows WindowsWechat"
        };
    }

    _sign(params) {
        // 原 b() 方法：将参数值拼接并做 hash（疑似 MD5），此处简化用 SHA-256 或 MD5
        try {
            let keys = Object.keys(params).filter(k => k !== 'sort');
            let str = keys.map(k => params[k]).join(',');
            // 这里使用 catvod 的 utils.md5 或 crypto
            // 假设有全局函数 md5(str)
            return md5(str); // 需引入 md5 实现
        } catch (e) {
            return "";
        }
    }

    _parseItems(jsonArray) {
        // 原 c() 方法，解析 items 并转为列表对象
        let list = [];
        for (let i = 0; i < jsonArray.length; i++) {
            let item = jsonArray[i];
            let id = item.id || "";
            let title = item.title || "";
            let pic = "";
            let remarks = "";
            try {
                let picObj = item.pic;
                if (picObj) {
                    pic = picObj.normal || "";
                    pic += "@Referer=https://api.douban.com/@User-Agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/117.0.0.0 Safari/537.36";
                }
            } catch (e) {}
            try {
                let rating = item.rating;
                if (rating) {
                    remarks = "评分：" + (rating.value || "");
                }
            } catch (e) {}
            list.push({
                vod_id: "msearch:" + id,
                vod_name: title,
                vod_pic: pic,
                vod_remarks: remarks
            });
        }
        return list;
    }

    static filterItemsWithoutPic(jsonStr) {
        // 去掉无图片的项
        try {
            let obj = JSON.parse(jsonStr);
            let list = obj.list || [];
            let filtered = list.filter(item => item.vod_pic && item.vod_pic.length > 0);
            obj.list = filtered;
            return JSON.stringify(obj);
        } catch (e) {
            return jsonStr;
        }
    }

    _processAnimeContent(page, filters) {
        // 处理动漫分类
        let url = "https://frodo.douban.com/rexxar/api/v2/tv/recommend?apikey=0ac44ae016490db2204ce0a042db2916&sort=T&tags=动画&start=0&count=20";
        let start = 0;
        if (page && parseInt(page) > 1) {
            start = (parseInt(page) - 1) * 20;
        }
        url = url.replace("start=0", "start=" + start);
        if (filters) {
            let sort = filters.sort || '';
            if (sort) {
                url = url.replace("sort=T", "sort=" + sort);
            }
            // 构建 tags
            let tags = "动画";
            let type = filters["类型"] || '';
            let area = filters["地区"] || '';
            let year = filters["年代"] || '';
            if (type) tags += "," + type;
            if (area) tags += "," + area;
            if (year) tags += "," + year;
            url = url.replace("tags=动画", "tags=" + tags);
        }
        let response = http.get(url, this._getHeaders());
        let data = JSON.parse(response);
        let items = data.items || [];
        let result = { list: [] };
        for (let i = 0; i < items.length; i++) {
            let it = items[i];
            let id = it.id || '';
            let title = it.title || '';
            let pic = '';
            try {
                if (it.pic) pic = it.pic.normal || '';
                pic += "@Referer=https://api.douban.com/@User-Agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/117.0.0.0 Safari/537.36";
            } catch (e) {}
            let remarks = '';
            try {
                if (it.rating) remarks = "评分：" + (it.rating.value || '');
            } catch (e) {}
            result.list.push({
                vod_id: "msearch:" + id,
                vod_name: title,
                vod_pic: pic,
                vod_remarks: remarks
            });
        }
        result.page = parseInt(page) || 1;
        result.pagecount = 999;
        result.limit = 20;
        result.total = result.list.length;
        return JSON.stringify(result);
    }

    _processGuessyoulike(page) {
        // 猜你喜欢
        let pageNum = parseInt(page) || 1;
        let history = catvod.getShared("historyvodname") || "[]";
        let historyArr = JSON.parse(history);
        let index = pageNum - 1;
        if (index >= historyArr.length) {
            return JSON.stringify({ list: [] });
        }
        let keyword = historyArr[index];
        let searchUrl = "https://frodo.douban.com/rexxar/api/v2/search/weixin?q=" + encodeURIComponent(keyword) + "&start=0&count=20&apikey=0ac44ae016490db2204ce0a042db2916";
        let searchResp = http.get(searchUrl, this._getHeaders());
        this._searchCache = searchResp;
        let searchData = JSON.parse(searchResp);
        let targetItem = null;
        if (searchData.items) {
            for (let item of searchData.items) {
                let target = item.target;
                if (!target) continue;
                if (!target.has_linewatch) continue;
                if (target.title === keyword) {
                    targetItem = item;
                    break;
                }
                if (!targetItem) targetItem = item;
            }
        }
        let list = [];
        if (targetItem) {
            let targetType = targetItem.target_type || '';
            let target = targetItem.target || {};
            let id = target.id;
            if (id && targetType) {
                let recUrl = "https://frodo.douban.com/rexxar/api/v2/" + targetType + "/" + id + "/recommendations?apiKey=0ac44ae016490db2204ce0a042db2916";
                let recResp = http.get(recUrl, this._getHeaders());
                if (!recResp.includes('"code":404')) {
                    let recData = JSON.parse(recResp);
                    if (Array.isArray(recData)) {
                        for (let rec of recData) {
                            let recId = rec.id || '';
                            let recTitle = rec.title || '';
                            let pic = '';
                            try {
                                if (rec.pic) pic = rec.pic.normal || '';
                                pic += "@Referer=https://api.douban.com/@User-Agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/117.0.0.0 Safari/537.36";
                            } catch (e) {}
                            let remarks = '';
                            try {
                                if (rec.rating) remarks = "评分：" + (rec.rating.value || '');
                            } catch (e) {}
                            list.push({
                                vod_id: "msearch:" + recId,
                                vod_name: recTitle,
                                vod_pic: pic,
                                vod_remarks: remarks
                            });
                        }
                    }
                }
            }
        }
        if (list.length === 0 && this._searchCache) {
            // 从搜索缓存中取 tv/movie 类型
            let cacheData = JSON.parse(this._searchCache);
            if (cacheData.items) {
                for (let item of cacheData.items) {
                    let t = item.target_type;
                    if (t !== 'tv' && t !== 'movie') continue;
                    let target = item.target;
                    if (!target) continue;
                    let id = target.id || '';
                    let title = target.title || '';
                    let pic = target.cover_url || '';
                    if (pic) pic += "@Referer=https://api.douban.com/@User-Agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/117.0.0.0 Safari/537.36";
                    let remarks = '';
                    try {
                        if (target.rating) remarks = "评分：" + (target.rating.value || '');
                    } catch (e) {}
                    list.push({
                        vod_id: "msearch:" + id,
                        vod_name: title,
                        vod_pic: pic,
                        vod_remarks: remarks
                    });
                }
            }
        }
        return JSON.stringify({ list: list });
    }

    // ---------- 公开方法 ----------
    init(ctx, ext) {
        // 初始化，无需操作
    }

    homeContent(flag) {
        // 首页分类
        let configFile = "/config.json";
        let configStr = catvod.readFile(configFile) || '{}';
        let config = JSON.parse(configStr);
        let homeKeys = (config.homePage || '').split(',').filter(s => s);

        // 定义所有分类
        const allCategories = [
            { id: "guess_you_like", name: "猜你喜欢" },
            { id: "hot_gaia", name: "热门电影" },
            { id: "tv_hot", name: "热播剧集" },
            { id: "anime_hot", name: "热门动漫" },
            { id: "show_hot", name: "热播综艺" },
            { id: "movie", name: "电影筛选" },
            { id: "tv", name: "电视筛选" },
            { id: "rank_list_movie", name: "电影榜单" },
            { id: "rank_list_tv", name: "电视剧榜单" }
        ];

        let classes = [];
        for (let cat of allCategories) {
            if (homeKeys.length > 0 && !homeKeys.includes(cat.id)) continue;
            classes.push({ type_id: cat.id, type_name: cat.name });
        }

        // 获取热门推荐（实时热门电影）
        let hotUrl = "https://frodo.douban.com/rexxar/api/v2/subject_collection/subject_real_time_hotest/items?apikey=0ac44ae016490db2204ce0a042db2916";
        let hotResp = http.get(hotUrl, this._getHeaders());
        let hotData = JSON.parse(hotResp);
        let items = hotData.subject_collection_items || [];
        let videos = this._parseItems(items);

        // 构造过滤器（来自硬编码的 JSON）
        const filtersJson = {
            "hot_gaia": [{ key: "sort", name: "排序", value: [{ n: "热度", v: "recommend" }, { n: "最新", v: "time" }, { n: "评分", v: "rank" }] }, { key: "area", name: "地区", value: [{ n: "全部", v: "全部" }, { n: "华语", v: "华语" }, { n: "欧美", v: "欧美" }, { n: "韩国", v: "韩国" }, { n: "日本", v: "日本" }] }],
            "tv_hot": [{ key: "type", name: "分类", value: [{ n: "综合", v: "tv_hot" }, { n: "国产剧", v: "tv_domestic" }, { n: "欧美剧", v: "tv_american" }, { n: "日剧", v: "tv_japanese" }, { n: "韩剧", v: "tv_korean" }, { n: "动画", v: "tv_animation" }] }],
            "anime_hot": [{ key: "类型", name: "类型", value: [{ n: "全部", v: "" }, { n: "热血", v: "热血" }, { n: "搞笑", v: "搞笑" }, { n: "恋爱", v: "恋爱" }, { n: "校园", v: "校园" }, { n: "科幻", v: "科幻" }, { n: "奇幻", v: "奇幻" }, { n: "悬疑", v: "悬疑" }, { n: "治愈", v: "治愈" }, { n: "运动", v: "运动" }, { n: "机甲", v: "机甲" }, { n: "少女", v: "少女" }, { n: "少年", v: "少年" }] }, { key: "地区", name: "地区", value: [{ n: "全部", v: "" }, { n: "日本", v: "日本" }, { n: "中国大陆", v: "中国大陆" }, { n: "美国", v: "美国" }, { n: "韩国", v: "韩国" }, { n: "英国", v: "英国" }, { n: "法国", v: "法国" }] }, { key: "sort", name: "排序", value: [{ n: "近期热度", v: "T" }, { n: "首播时间", v: "R" }, { n: "高分优先", v: "S" }] }, { key: "年代", name: "年代", value: [{ n: "全部", v: "" }, { n: "2026", v: "2026" }, { n: "2025", v: "2025" }, { n: "2024", v: "2024" }, { n: "2023", v: "2023" }, { n: "2022", v: "2022" }, { n: "2021", v: "2021" }, { n: "2020", v: "2020" }, { n: "2019", v: "2019" }, { n: "2010年代", v: "2010年代" }, { n: "2000年代", v: "2000年代" }, { n: "90年代", v: "90年代" }, { n: "更早", v: "更早" }] }],
            "show_hot": [{ key: "type", name: "分类", value: [{ n: "综合", v: "show_hot" }, { n: "国内", v: "show_domestic" }, { n: "国外", v: "show_foreign" }] }],
            "movie": [{ key: "类型", name: "类型", value: [{ n: "全部类型", v: "" }, { n: "喜剧", v: "喜剧" }, { n: "爱情", v: "爱情" }, { n: "动作", v: "动作" }, { n: "科幻", v: "科幻" }, { n: "动画", v: "动画" }, { n: "悬疑", v: "悬疑" }, { n: "犯罪", v: "犯罪" }, { n: "惊悚", v: "惊悚" }, { n: "冒险", v: "冒险" }, { n: "音乐", v: "音乐" }, { n: "历史", v: "历史" }, { n: "奇幻", v: "奇幻" }, { n: "恐怖", v: "恐怖" }, { n: "战争", v: "战争" }, { n: "传记", v: "传记" }, { n: "歌舞", v: "歌舞" }, { n: "武侠", v: "武侠" }, { n: "情色", v: "情色" }, { n: "灾难", v: "灾难" }, { n: "西部", v: "西部" }, { n: "纪录片", v: "纪录片" }, { n: "短片", v: "短片" }] }, { key: "地区", name: "地区", value: [{ n: "全部地区", v: "" }, { n: "华语", v: "华语" }, { n: "欧美", v: "欧美" }, { n: "中国", v: "中国" }, { n: "美国", v: "美国" }, { n: "中国香港", v: "中国香港" }, { n: "中国台湾", v: "中国台湾" }, { n: "韩国", v: "韩国" }, { n: "日本", v: "日本" }, { n: "英国", v: "英国" }, { n: "法国", v: "法国" }, { n: "菲律宾", v: "菲律宾" }, { n: "德国", v: "德国" }, { n: "意大利", v: "意大利" }, { n: "西班牙", v: "西班牙" }, { n: "印度", v: "印度" }, { n: "泰国", v: "泰国" }, { n: "俄罗斯", v: "俄罗斯" }, { n: "加拿大", v: "加拿大" }, { n: "澳大利亚", v: "澳大利亚" }, { n: "爱尔兰", v: "爱尔兰" }, { n: "瑞典", v: "瑞典" }, { n: "巴西", v: "巴西" }, { n: "丹麦", v: "丹麦" }] }, { key: "sort", name: "排序", value: [{ n: "近期热度", v: "T" }, { n: "首映时间", v: "R" }, { n: "高分优先", v: "S" }] }, { key: "年代", name: "年代", value: [{ n: "全部年代", v: "" }, { n: "2026", v: "2026" }, { n: "2025", v: "2025" }, { n: "2024", v: "2024" }, { n: "2023", v: "2023" }, { n: "2022", v: "2022" }, { n: "2021", v: "2021" }, { n: "2020", v: "2020" }, { n: "2019", v: "2019" }, { n: "2010年代", v: "2010年代" }, { n: "2000年代", v: "2000年代" }, { n: "90年代", v: "90年代" }, { n: "80年代", v: "80年代" }, { n: "70年代", v: "70年代" }, { n: "60年代", v: "60年代" }, { n: "更早", v: "更早" }] }],
            "tv": [{ key: "类型", name: "类型", value: [{ n: "不限", v: "" }, { n: "电视剧", v: "电视剧" }, { n: "综艺", v: "综艺" }] }, { key: "电视剧形式", name: "电视剧形式", value: [{ n: "不限", v: "" }, { n: "喜剧", v: "喜剧" }, { n: "爱情", v: "爱情" }, { n: "悬疑", v: "悬疑" }, { n: "动画", v: "动画" }, { n: "武侠", v: "武侠" }, { n: "古装", v: "古装" }, { n: "家庭", v: "家庭" }, { n: "犯罪", v: "犯罪" }, { n: "科幻", v: "科幻" }, { n: "恐怖", v: "恐怖" }, { n: "历史", v: "历史" }, { n: "战争", v: "战争" }, { n: "动作", v: "动作" }, { n: "冒险", v: "冒险" }, { n: "传记", v: "传记" }, { n: "剧情", v: "剧情" }, { n: "奇幻", v: "奇幻" }, { n: "惊悚", v: "惊悚" }, { n: "灾难", v: "灾难" }, { n: "歌舞", v: "歌舞" }, { n: "音乐", v: "音乐" }] }, { key: "综艺形式", name: "综艺形式", value: [{ n: "不限", v: "" }, { n: "真人秀", v: "真人秀" }, { n: "脱口秀", v: "脱口秀" }, { n: "音乐", v: "音乐" }, { n: "歌舞", v: "歌舞" }] }, { key: "地区", name: "地区", value: [{ n: "全部地区", v: "" }, { n: "华语", v: "华语" }, { n: "欧美", v: "欧美" }, { n: "中国", v: "中国" }, { n: "美国", v: "美国" }, { n: "中国香港", v: "中国香港" }, { n: "韩国", v: "韩国" }, { n: "日本", v: "日本" }, { n: "英国", v: "英国" }, { n: "泰国", v: "泰国" }, { n: "中国台湾", v: "中国台湾" }, { n: "意大利", v: "意大利" }, { n: "法国", v: "法国" }, { n: "德国", v: "德国" }, { n: "西班牙", v: "西班牙" }, { n: "俄罗斯", v: "俄罗斯" }, { n: "瑞典", v: "瑞典" }, { n: "巴西", v: "巴西" }, { n: "丹麦", v: "丹麦" }, { n: "印度", v: "印度" }, { n: "加拿大", v: "加拿大" }, { n: "爱尔兰", v: "爱尔兰" }, { n: "澳大利亚", v: "澳大利亚" }] }, { key: "sort", name: "排序", value: [{ n: "近期热度", v: "T" }, { n: "首播时间", v: "R" }, { n: "高分优先", v: "S" }] }, { key: "年代", name: "年代", value: [{ n: "全部", v: "" }, { n: "2026", v: "2026" }, { n: "2025", v: "2025" }, { n: "2024", v: "2024" }, { n: "2023", v: "2023" }, { n: "2022", v: "2022" }, { n: "2021", v: "2021" }, { n: "2020", v: "2020" }, { n: "2019", v: "2019" }, { n: "2010年代", v: "2010年代" }, { n: "2000年代", v: "2000年代" }, { n: "90年代", v: "90年代" }, { n: "80年代", v: "80年代" }, { n: "70年代", v: "70年代" }, { n: "60年代", v: "60年代" }, { n: "更早", v: "更早" }] }, { key: "平台", name: "平台", value: [{ n: "全部", v: "" }, { n: "腾讯视频", v: "腾讯视频" }, { n: "爱奇艺", v: "爱奇艺" }, { n: "优酷", v: "优酷" }, { n: "湖南卫视", v: "湖南卫视" }, { n: "Netflix", v: "Netflix" }, { n: "HBO", v: "HBO" }, { n: "BBC", v: "BBC" }, { n: "NHK", v: "NHK" }, { n: "CBS", v: "CBS" }, { n: "NBC", v: "NBC" }, { n: "tvN", v: "tvN" }] }],
            "rank_list_movie": [{ key: "榜单", name: "榜单", value: [{ n: "实时热门电影", v: "movie_real_time_hotest" }, { n: "一周口碑电影榜", v: "movie_weekly_best" }, { n: "豆瓣电影Top250", v: "movie_top250" }] }],
            "rank_list_tv": [{ key: "榜单", name: "榜单", value: [{ n: "实时热门电视", v: "tv_real_time_hotest" }, { n: "华语口碑剧集榜", v: "tv_chinese_best_weekly" }, { n: "全球口碑剧集榜", v: "tv_global_best_weekly" }, { n: "国内口碑综艺榜", v: "show_chinese_best_weekly" }, { n: "国外口碑综艺榜", v: "show_global_best_weekly" }] }]
        };

        let result = {
            class: classes,
            list: videos,
            filters: filtersJson
        };
        return JSON.stringify(result);
    }

    categoryContent(tid, pg, flag, filter) {
        // 分类内容
        if (tid === "anime_hot") {
            return this._processAnimeContent(pg, filter);
        }
        if (tid === "guess_you_like") {
            return this._processGuessyoulike(pg);
        }

        let sort = (filter && filter.sort) || 'T';
        // 构建 tags 签名（原 b 方法）
        let tagStr = '';
        if (filter) {
            let keys = Object.keys(filter).filter(k => k !== 'sort');
            tagStr = keys.map(k => filter[k]).join(',');
        }
        let tags = encodeURIComponent(tagStr);
        let start = (parseInt(pg) - 1) * 20;

        let url = '';
        let itemsKey = 'items';

        switch (tid) {
            case "hot_gaia": {
                let area = (filter && filter.area) || '全部';
                let sortVal = (filter && filter.sort) || 'recommend';
                url = `https://frodo.douban.com/rexxar/api/v2/movie/hot_gaia?apikey=0ac44ae016490db2204ce0a042db2916&sort=${sortVal}&area=${encodeURIComponent(area)}&start=${start}&count=20`;
                itemsKey = 'items';
                break;
            }
            case "tv_hot": {
                let type = (filter && filter.type) || 'tv_hot';
                url = `https://frodo.douban.com/rexxar/api/v2/subject_collection/${type}/items${this.apikey}&start=${start}&count=20`;
                itemsKey = 'subject_collection_items';
                break;
            }
            case "show_hot": {
                let type = (filter && filter.type) || 'show_hot';
                url = `https://frodo.douban.com/rexxar/api/v2/subject_collection/${type}/items${this.apikey}&start=${start}&count=20`;
                itemsKey = 'subject_collection_items';
                break;
            }
            case "movie": {
                url = `https://frodo.douban.com/rexxar/api/v2/movie/recommend?apikey=0ac44ae016490db2204ce0a042db2916&sort=${sort}&tags=${tags}&start=${start}&count=20`;
                itemsKey = 'items';
                break;
            }
            case "tv": {
                url = `https://frodo.douban.com/rexxar/api/v2/tv/recommend?apikey=0ac44ae016490db2204ce0a042db2916&sort=${sort}&tags=${tags}&start=${start}&count=20`;
                itemsKey = 'items';
                break;
            }
            case "rank_list_movie": {
                let rank = (filter && filter['榜单']) || 'movie_real_time_hotest';
                url = `https://frodo.douban.com/rexxar/api/v2/subject_collection/${rank}/items${this.apikey}&start=${start}&count=20`;
                itemsKey = 'subject_collection_items';
                break;
            }
            case "rank_list_tv": {
                let rank = (filter && filter['榜单']) || 'tv_real_time_hotest';
                url = `https://frodo.douban.com/rexxar/api/v2/subject_collection/${rank}/items${this.apikey}&start=${start}&count=20`;
                itemsKey = 'subject_collection_items';
                break;
            }
            default: {
                // fallback to movie recommend
                url = `https://frodo.douban.com/rexxar/api/v2/movie/recommend?apikey=0ac44ae016490db2204ce0a042db2916&sort=${sort}&tags=${tags}&start=${start}&count=20`;
                itemsKey = 'items';
            }
        }

        let resp = http.get(url, this._getHeaders());
        let data = JSON.parse(resp);
        let items = data[itemsKey] || [];
        let videoList = this._parseItems(items);

        let result = {
            list: videoList,
            page: parseInt(pg),
            pagecount: 999,
            limit: 20,
            total: videoList.length
        };
        // 过滤无图
        return Douban.filterItemsWithoutPic(JSON.stringify(result));
    }

    // 详情（未在原有代码中，但可扩展）
    detailContent(ids) {
        // 简单实现，获取剧集信息
        let id = ids[0];
        if (!id) return JSON.stringify({ list: [] });
        // 如果是 msearch:xxx 则去掉前缀
        let realId = id.replace('msearch:', '');
        let url = `https://frodo.douban.com/rexxar/api/v2/tv/${realId}?apikey=0ac44ae016490db2204ce0a042db2916`;
        // 根据类型可能不同，这里简化
        let resp = http.get(url, this._getHeaders());
        let data = JSON.parse(resp);
        // 构造 vod 详情
        let vod = {
            vod_id: id,
            vod_name: data.title || '',
            vod_pic: data.pic ? data.pic.normal + "@Referer=https://api.douban.com/@User-Agent=..." : '',
            vod_actor: data.actors ? data.actors.map(a => a.name).join('/') : '',
            vod_director: data.directors ? data.directors.map(d => d.name).join('/') : '',
            vod_content: data.intro || '',
            vod_year: data.year || '',
            vod_area: data.region || '',
            vod_remarks: data.rating ? '评分：' + data.rating.value : '',
            vod_play_from: '豆瓣',
            // 播放源，根据剧集生成占位
            vod_play_url: '正片$https://movie.douban.com/subject/' + realId
        };
        return JSON.stringify({ list: [vod] });
    }

    // 搜索
    searchContent(key, quick) {
        if (!key) return JSON.stringify({ list: [] });
        let url = `https://frodo.douban.com/rexxar/api/v2/search/weixin?q=${encodeURIComponent(key)}&start=0&count=20&apikey=0ac44ae016490db2204ce0a042db2916`;
        let resp = http.get(url, this._getHeaders());
        let data = JSON.parse(resp);
        let items = data.items || [];
        let list = [];
        for (let item of items) {
            let target = item.target;
            if (!target) continue;
            let id = target.id || '';
            let title = target.title || '';
            let pic = target.cover_url || '';
            if (pic) pic += "@Referer=https://api.douban.com/@User-Agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/117.0.0.0 Safari/537.36";
            let remarks = '';
            try { if (target.rating) remarks = "评分：" + target.rating.value; } catch(e) {}
            list.push({
                vod_id: "msearch:" + id,
                vod_name: title,
                vod_pic: pic,
                vod_remarks: remarks
            });
        }
        return JSON.stringify({ list: list });
    }
}

// 导出类（CatVodSpider 会自动实例化）
module.exports = Douban;
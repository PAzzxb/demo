js:
var rule = {
    title: '哔嘀影视',
    host: 'https://www.bdtv.org',

    homeUrl: '/',
    url: '/vodtype/fyclass-fypage.html',

    class_name: '电影&电视剧&综艺&动漫',
    class_url: '1&2&3&4',

    searchable: 2,
    quickSearch: 1,

    searchUrl: '/vodsearch/**----------fypage---.html',

    play_parse: true,

    一级: '.module-item;a&&title;img&&data-original;.module-item-note&&Text;a&&href',

    二级: {
        title: 'h1&&Text',
        img: '.lazyload&&data-original',
        desc: '.video-info-items:eq(0)&&Text',
        content: '.vod_content&&Text',
        tabs: '.module-tab-item',
        lists: '.module-play-list:eq(#id) a'
    },

    搜索: '.module-card-item;.module-card-item-title&&Text;img&&data-original;.module-item-note&&Text;a&&href'
}
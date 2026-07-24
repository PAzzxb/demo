#!/usr/bin/python
# -*- coding: utf-8 -*-
import re
import urllib.parse
import json
import base64
import time
from bs4 import BeautifulSoup
from base.spider import Spider

try:
    import cloudscraper
    HAS_CLOUDSCRAPER = True
except ImportError:
    HAS_CLOUDSCRAPER = False
    import requests


class Spider(Spider):
    def init(self, extend=""):
        self.site_url = "https://wbbb1.com"
        self.limit = 24
        self.headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
            'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
            'Referer': self.site_url,
            'DNT': '1',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1'
        }
        if HAS_CLOUDSCRAPER:
            self.session = cloudscraper.create_scraper(
                browser={'browser': 'chrome', 'platform': 'windows', 'mobile': False}
            )
            self.session.headers.update(self.headers)
        else:
            self.session = requests.Session()
            self.session.headers.update(self.headers)

        self.categories = [
            {"type_id": "1", "type_name": "电影"},
            {"type_id": "2", "type_name": "剧集"},
            {"type_id": "3", "type_name": "动漫"},
            {"type_id": "4", "type_name": "综艺"}
        ]

    def _fetch(self, url, retry=2):
        for attempt in range(retry):
            try:
                resp = self.session.get(url, timeout=20)
                if resp.status_code == 200 and len(resp.text) > 1000:
                    resp.encoding = resp.apparent_encoding or 'utf-8'
                    return resp
                else:
                    print(f"Fetch {url} status={resp.status_code}, len={len(resp.text)}")
            except Exception as e:
                print(f"Attempt {attempt+1} error: {str(e)}")
            if attempt < retry-1:
                time.sleep(2)
        return None

    def _parse_video_card(self, card_or_link):
        """通用解析：支持传入 a 标签或卡片 div"""
        # 如果传入的是 a 标签，直接取 href
        if card_or_link.name == 'a':
            link = card_or_link
            card = card_or_link.find_parent('div', class_=re.compile(r'item'))
        else:
            link = card_or_link.select_one('a[href*="/detail/"]')
            card = card_or_link
        if not link:
            return None
        href = link.get('href')
        match = re.search(r'/detail/(\d+)\.html', href)
        if not match:
            return None
        vod_id = match.group(1)

        # 标题
        title_ele = card.select_one('.title, .module-item-title, .video-title, .name')
        if not title_ele and link:
            title_ele = link
        vod_name = title_ele.get_text(strip=True) if title_ele else ''
        # 图片
        img_ele = card.select_one('img')
        vod_pic = ''
        if img_ele:
            vod_pic = img_ele.get('data-original') or img_ele.get('data-src') or img_ele.get('src', '')
            if vod_pic and not vod_pic.startswith('http'):
                vod_pic = urllib.parse.urljoin(self.site_url, vod_pic)
        # 备注
        remark_ele = card.select_one('.note, .tag, .module-item-note, .episode')
        vod_remarks = remark_ele.get_text(strip=True) if remark_ele else ''
        return {"vod_id": vod_id, "vod_name": vod_name, "vod_pic": vod_pic, "vod_remarks": vod_remarks}

    def homeContent(self, filter):
        url = self.site_url + "/"
        resp = self._fetch(url)
        video_list = []
        if resp:
            soup = BeautifulSoup(resp.text, 'html.parser')
            # 尝试多种卡片选择器
            cards = soup.select('.module-item, .video-item, .movie-item, [class*="movie"]')
            if not cards:
                cards = soup.select('a[href*="/detail/"]')  # 直接取链接
            for card in cards[:self.limit]:
                item = self._parse_video_card(card)
                if item and item['vod_name']:
                    video_list.append(item)
        return {"class": self.categories, "list": video_list, "filters": {}}

    def categoryContent(self, tid, pg, filter, extend):
        page = int(pg) if pg else 1
        url = f"{self.site_url}/type/{tid}.html" if page == 1 else f"{self.site_url}/type/{tid}/{page}.html"
        resp = self._fetch(url)
        if not resp:
            return {"list": [], "page": page, "pagecount": 1, "limit": self.limit, "total": 0}
        soup = BeautifulSoup(resp.text, 'html.parser')
        video_list = []
        cards = soup.select('.module-item, .video-item, .movie-item')
        if not cards:
            cards = soup.select('a[href*="/detail/"]')
        for card in cards:
            item = self._parse_video_card(card)
            if item and item['vod_name']:
                video_list.append(item)
        # 总页数
        pagecount = 1
        pagination = soup.select('.page, .pagination, .page-list')
        if pagination:
            for a in pagination[0].select('a'):
                if a.get_text(strip=True).isdigit():
                    pagecount = max(pagecount, int(a.get_text(strip=True)))
        return {"list": video_list, "page": page, "pagecount": pagecount, "limit": self.limit, "total": 0}

    def detailContent(self, ids):
        if not ids:
            return {"list": []}
        vod_id = ids[0]
        url = f"{self.site_url}/detail/{vod_id}.html"
        resp = self._fetch(url)
        if not resp:
            return {"list": []}
        soup = BeautifulSoup(resp.text, 'html.parser')
        vod_name = soup.select_one('h1, .title, .video-title')
        vod_name = vod_name.get_text(strip=True) if vod_name else ''
        img_ele = soup.select_one('.poster img, .cover img, .module-poster img')
        vod_pic = img_ele.get('src') or '' if img_ele else ''
        desc_ele = soup.select_one('.desc, .introduction, .module-info-introduction')
        vod_content = desc_ele.get_text(strip=True) if desc_ele else ''
        vod_director = vod_actor = ''
        for item in soup.select('.info-item, .module-info-item'):
            label_ele = item.select_one('.label, .module-info-item-title')
            value_ele = item.select_one('.value, .module-info-item-content')
            if not label_ele or not value_ele:
                continue
            label = label_ele.get_text(strip=True)
            if '导演' in label:
                vod_director = value_ele.get_text(strip=True)
            if '主演' in label:
                vod_actor = value_ele.get_text(strip=True)
        # 播放列表
        play_from_list = []
        play_url_list = []
        play_blocks = soup.select('.playlist, .module-play-list, .play-tab')
        for block in play_blocks:
            source_name = block.get('data-source') or block.select_one('.source, .tab-title')
            source_name = source_name.get_text(strip=True) if source_name else '默认线路'
            episodes = []
            for a in block.select('a'):
                href = a.get('href')
                if href and (href.startswith('/vplay/') or href.startswith('/play/')):
                    ep_name = a.get_text(strip=True) or '第1集'
                    episodes.append(f"{ep_name}${href}")
            if episodes:
                play_from_list.append(source_name)
                play_url_list.append('#'.join(episodes))
        if not play_from_list:
            # 降级：直接找所有播放链接
            all_links = soup.select('a[href*="/vplay/"]')
            if all_links:
                episodes = [f"{a.get_text(strip=True)}${a.get('href')}" for a in all_links if a.get('href')]
                if episodes:
                    play_from_list.append('默认线路')
                    play_url_list.append('#'.join(episodes))
        return {"list": [{
            "vod_id": vod_id,
            "vod_name": vod_name,
            "vod_pic": vod_pic,
            "vod_content": vod_content,
            "vod_director": vod_director,
            "vod_actor": vod_actor,
            "vod_play_from": '$$$'.join(play_from_list),
            "vod_play_url": '$$$'.join(play_url_list)
        }]}

    def searchContent(self, key, quick, pg="1"):
        page = int(pg) if pg else 1
        encoded = urllib.parse.quote(key)
        if page == 1:
            url = f"{self.site_url}/search/{encoded}-------------.html"
        else:
            url = f"{self.site_url}/search/{encoded}----------{page}---.html"
        resp = self._fetch(url)
        if not resp:
            return {"list": [], "page": page, "pagecount": 1}
        soup = BeautifulSoup(resp.text, 'html.parser')
        video_list = []
        cards = soup.select('.module-item, .video-item, a[href*="/detail/"]')
        for card in cards:
            item = self._parse_video_card(card)
            if item and item['vod_name']:
                video_list.append(item)
        return {"list": video_list, "page": page, "pagecount": 1}

    # 以下是播放器解析部分（与之前给出的完整版一致，此处略去细节，实际使用时保留）
    def _extract_m3u8_recursive(self, html, base_url, depth=0):
        # 和之前一样，为节省篇幅这里不再重复，但请确保已包含完整逻辑
        pass

    def playerContent(self, flag, id, vipFlags):
        # 与之前相同，确保调用 _extract_m3u8_recursive
        pass

    def getName(self):
        return "歪比巴卜"
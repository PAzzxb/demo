# coding=utf-8
# !/usr/bin/python


from Crypto.Util.Padding import unpad
from Crypto.Util.Padding import pad
from urllib.parse import unquote
from Crypto.Cipher import ARC4
from urllib.parse import quote
from base.spider import Spider
from Crypto.Cipher import AES
from datetime import datetime
from bs4 import BeautifulSoup
from base64 import b64decode
import urllib.request
import urllib.parse
import datetime
import binascii
import requests
import base64
import json
import time
import sys
import re
import os

sys.path.append('..')

xurl1 = "https://list.le.com/listn/c69_t-1_d1_y-1_s1_o4"

xurl = "https://mov.cenguigui.cn"

headerx = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/50.0.2661.87 Safari/537.36'
}


class Spider(Spider):
    global xurl
    global xurl1
    global headerx

    def getName(self):
        return "首页"

    def init(self, extend):
        pass

    def isVideoFormat(self, url):
        pass

    def manualVideoCheck(self):
        pass

    def fetch_and_parse_videos(self, url):
        videos = []

        detail = requests.get(url=url, headers=headerx)
        detail.encoding = "utf-8"
        data = detail.json()

        for vod in data['data']:
            name = vod['title']

            id = vod['book_id']

            pic = vod['cover']

            remark = vod['type']

            video = {
                "vod_id": id,
                "vod_name": name,
                "vod_pic": pic,
                "vod_remarks": remark
            }
            videos.append(video)

        return videos

    def homeContent(self, filter):
        result = {"class": []}

        detail = requests.get(url=xurl1, headers=headerx)
        detail.encoding = "utf-8"
        res = detail.text
        doc = BeautifulSoup(res, "lxml")

        soups = doc.find_all('ul', class_="valueList")[2]

        vods = soups.find_all('li')

        for vod in vods:

            name = vod.text.strip()

            skip_names = ["全部"]
            if name in skip_names:
                continue

            result["class"].append({"type_id": name, "type_name": name})

        return result

    def homeVideoContent(self):
        videos = []

        url = f'{xurl}/duanju/api.php?name=全部&page=1'

        videos = self.fetch_and_parse_videos(url)

        result = {'list': videos}
        return result

    def categoryContent(self, cid, pg, filter, ext):
        result = {}
        videos = []

        if pg:
            page = int(pg)
        else:
            page = 1

        url = f'{xurl}/duanju/api.php?name={cid}&page={str(page)}'

        videos = self.fetch_and_parse_videos(url)

        result = {'list': videos}
        result['page'] = pg
        result['pagecount'] = 9999
        result['limit'] = 90
        result['total'] = 999999
        return result

    def detailContent(self, ids):
        did = ids[0]
        result = {}
        videos = []
        xianlu = ''
        bofang = ''

        url = f'{xurl}/duanju/api.php?book_id={did}'
        detail = requests.get(url=url, headers=headerx)
        detail.encoding = "utf-8"
        data = detail.json()

        content = f'' + data.get('desc', '未知') or '未知'

        actor = data.get('author', '未知') or '未知'

        remarks = data.get('category', '未知') or '未知'

        year = data.get('duration', '未知') or '未知'

        for vod in data['data']:
            name = vod['title']

            id = vod['video_id']

            bofang = bofang + name + '$' + id + '#'

        bofang = bofang[:-1]

        xianlu = '聚合短剧'

        videos.append({
            "vod_id": did,
            "vod_actor": actor,
            "vod_remarks": remarks,
            "vod_year": year,
            "vod_content": content,
            "vod_play_from": xianlu,
            "vod_play_url": bofang
        })

        result['list'] = videos
        return result

    def playerContent(self, flag, id, vipFlags):

        url = f'{xurl}/duanju/api.php?video_id={id}'
        detail = requests.get(url=url, headers=headerx)
        detail.encoding = "utf-8"
        data = detail.json()
        url = data['data']['url']

        result = {}
        result["parse"] = 0
        result["playUrl"] = ''
        result["url"] = url
        result["header"] = headerx
        return result

    def searchContentPage(self, key, quick, pg):
        result = {}
        videos = []
        time.sleep(2)

        if pg:
            page = int(pg)
        else:
            page = 1

        url = f'{xurl}/duanju/api.php?name={key}&page={str(page)}'

        videos = self.fetch_and_parse_videos(url)

        result['list'] = videos
        result['page'] = pg
        result['pagecount'] = 9999
        result['limit'] = 90
        result['total'] = 999999
        return result

    def searchContent(self, key, quick, pg="1"):
        return self.searchContentPage(key, quick, '1')

    def localProxy(self, params):
        if params['type'] == "m3u8":
            return self.proxyM3u8(params)
        elif params['type'] == "media":
            return self.proxyMedia(params)
        elif params['type'] == "ts":
            return self.proxyTs(params)
        return None












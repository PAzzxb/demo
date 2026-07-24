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

xurl = "https://live.douyin.com"

xurl1 = "https://www.douyin.com"

headerx = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/50.0.2661.87 Safari/537.36'
}

headers = {
    "Host": "live.douyin.com",
    "Connection": "keep-alive",
    "sec-ch-ua": '"Microsoft Edge";v="129", "Not=A?Brand";v="8", "Chromium";v="129"',
    "sec-ch-ua-mobile": "?0",
    "sec-ch-ua-platform": '"Windows"',
    "Upgrade-Insecure-Requests": "1",
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36 Edg/129.0.0.0",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
    "Sec-Fetch-Site": "none",
    "Sec-Fetch-Mode": "navigate",
    "Sec-Fetch-User": "?1",
    "Sec-Fetch-Dest": "document",
    "Accept-Language": "zh-CN,zh;q=0.9",
    "Accept-Encoding": "gzip, deflate"
}

cookie_container = []


class Spider(Spider):
    global xurl
    global xurl1
    global headerx
    global headers
    global cookie_container

    def getName(self):
        return "首页"

    def __init__(self):
        self.cookie_container = []
        self.cookie2_container = []

    def init(self, extend):
        pass

    def isVideoFormat(self, url):
        pass

    def manualVideoCheck(self):
        pass

    def extract_middle_text(self, text, start_str, end_str, pl, start_index1: str = '', end_index2: str = ''):
        if pl == 3:
            plx = []
            while True:
                start_index = text.find(start_str)
                if start_index == -1:
                    break
                end_index = text.find(end_str, start_index + len(start_str))
                if end_index == -1:
                    break
                middle_text = text[start_index + len(start_str):end_index]
                plx.append(middle_text)
                text = text.replace(start_str + middle_text + end_str, '')
            if len(plx) > 0:
                purl = ''
                for i in range(len(plx)):
                    matches = re.findall(start_index1, plx[i])
                    output = ""
                    for match in matches:
                        match3 = re.search(r'(?:^|[^0-9])(\d+)(?:[^0-9]|$)', match[1])
                        if match3:
                            number = match3.group(1)
                        else:
                            number = 0
                        if 'http' not in match[0]:
                            output += f"#{match[1]}${number}{xurl}{match[0]}"
                        else:
                            output += f"#{match[1]}${number}{match[0]}"
                    output = output[1:]
                    purl = purl + output + "$$$"
                purl = purl[:-3]
                return purl
            else:
                return ""
        else:
            start_index = text.find(start_str)
            if start_index == -1:
                return ""
            end_index = text.find(end_str, start_index + len(start_str))
            if end_index == -1:
                return ""

        if pl == 0:
            middle_text = text[start_index + len(start_str):end_index]
            return middle_text.replace("\\", "")

        if pl == 1:
            middle_text = text[start_index + len(start_str):end_index]
            matches = re.findall(start_index1, middle_text)
            if matches:
                jg = ' '.join(matches)
                return jg

        if pl == 2:
            middle_text = text[start_index + len(start_str):end_index]
            matches = re.findall(start_index1, middle_text)
            if matches:
                new_list = [f'{item}' for item in matches]
                jg = '$$$'.join(new_list)
                return jg

    def homeContent(self, filter):
        result = {}
        result = {"class": [{"type_id": "101", "type_name": "聊天"},
                            {"type_id": "102", "type_name": "音乐"},
                            {"type_id": "103", "type_name": "游戏"},
                            {"type_id": "104", "type_name": "二次元"},
                            {"type_id": "105", "type_name": "舞蹈"},
                            {"type_id": "106", "type_name": "文化"},
                            {"type_id": "107", "type_name": "生活"},
                            {"type_id": "108", "type_name": "运动"}],
                  }

        return result

    def homeVideoContent(self):
        pass

    def categoryContent(self, cid, pg, filter, ext):
        result = {}
        videos = []

        if not self.cookie_container:
            response = requests.get(url=xurl, headers=headers)
            set_cookie1 = response.headers.get('Set-Cookie')
            if set_cookie1:
                self.cookie_container.append(set_cookie1)
            else:
                self.categoryContent(cid, pg, filter, ext)
                return
        else:
            set_cookie1 = self.cookie_container[0]

        headerz = {
            "Host": "live.douyin.com",
            "User-Agent": "Mozilla/5.0 (Linux; U; Android 8.0.0; zh-cn; Mi Note 2 Build/OPR1.170623.032) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/61.0.3163.128 Mobile Safari/537.36 XiaoMi/MiuiBrowser/10.1.1",
            "Cookie": set_cookie1
        }

        page = (int(pg) - 1) * 15
        url = f'{xurl}/webcast/web/partition/detail/room/v2/?aid=6383&app_name=douyin_web&live_id=1&device_platform=web&language=zh-CN&enter_from=link_share&cookie_enabled=true&screen_width=1536&screen_height=960&browser_language=zh-CN&browser_platform=Win32&browser_name=Edge&browser_version=129.0.0.0&count=15&offset={str(page)}&partition={cid}&partition_type=4&req_from=2&a_bogus='

        response = requests.get(url=url, headers=headerz)
        set_cookie2 = response.headers.get('Set-Cookie')

        if not set_cookie2 or 'odin_tt' not in set_cookie2:
            self.cookie_container.clear()
            self.cookie2_container.clear()
            self.categoryContent(cid, pg, filter, ext)
            return
        else:
            if not self.cookie2_container:
                self.cookie2_container.append(set_cookie2)
            else:
                set_cookie2 = self.cookie2_container[0]

            headery = {
                "Host": "live.douyin.com",
                "User-Agent": "Mozilla/5.0 ...",
                "Cookie": set_cookie2
            }

            response = requests.get(url=url, headers=headery)
            response.encoding = "utf-8"
            data = response.json()

            setup = data['data']['data']

            for vod in setup:

                name = vod['room']['title']

                stream = vod['room']['stream_url']['flv_pull_url']
                id = stream.get('FULL_HD1')
                if not id:
                    id = stream.get('HD1')
                if not id:
                    id = stream.get('SD1')
                if not id:
                    id = stream.get('SD2')

                pic = vod['room']['owner']['avatar_large']['url_list'][0]

                tag_name = vod['room']['owner']['nickname']

                display_long = vod['room']['room_view_stats']['display_long']

                remark = tag_name + ' ' + display_long

                video = {
                    "vod_id": id,
                    "vod_name": name,
                    "vod_pic": pic,
                    "vod_remarks": remark
                }
                videos.append(video)

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
        content = ''

        bofang = did
        xianlu = '抖音线路'

        videos.append({
            "vod_id": did,
            "vod_content": content,
            "vod_play_from": xianlu,
            "vod_play_url": bofang
        })

        result['list'] = videos
        return result

    def playerContent(self, flag, id, vipFlags):

        result = {}
        result["parse"] = 0
        result["playUrl"] = ''
        result["url"] = id
        result["header"] = headerx
        return result

    def searchContentPage(self, key, quick, pg):
        result = {}
        videos = []

        page = (int(pg) - 1) * 10

        encoded_key = urllib.parse.quote(key)

        response = requests.get(url=xurl, headers=headers)
        set_cookie1 = response.headers.get('Set-Cookie')

        head = {
            "authority": "www.douyin.com",
            "accept": "application/json, text/plain, */*",
            "accept-encoding": "gzip",
            "accept-language": "zh-CN,zh;q=0.9,en;q=0.8",
            "cookie": set_cookie1,
            "referer": f"https://www.douyin.com/search/{encoded_key}?type=live",
            "sec-ch-ua": '"Microsoft Edge";v="125", "Chromium";v="125", "Not.A/Brand";v="24"',
            "sec-ch-ua-mobile": "?0",
            "sec-ch-ua-platform": '"Windows"',
            "sec-fetch-dest": "empty",
            "sec-fetch-mode": "cors",
            "sec-fetch-site": "same-origin",
            "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36 Edg/125.0.0.0"
                }

        url = f'{xurl1}/aweme/v1/web/live/search/?device_platform=webapp&aid=6383&channel=channel_pc_web&search_channel=aweme_live&keyword={encoded_key}&search_source=switch_tab&query_correct_type=1&is_filter_search=0&from_group_id&offset={str(page)}&count=10&pc_client_type=1&version_code=170400&version_name=17.4.0&cookie_enabled=true&screen_width=1980&screen_height=1080&browser_language=zh-CN&browser_platform=Win32&browser_name=Edge&browser_version=125.0.0.0&browser_online=true&engine_name=Blink&engine_version=125.0.0.0&os_name=Windows&os_version=10&cpu_core_num=12&device_memory=8&platform=PC&downlink=10&effective_type=4g&round_trip_time=100&webid=7382872326016435738'

        response = requests.get(url=url, headers=head)
        response.encoding = "utf-8"
        data = response.json()

        setup = data['data']

        for vod in setup:

            nam = vod['lives']['rawdata']
            rawdata = json.loads(nam)

            name = rawdata.get('title')

            flv_pull_url = (rawdata.get('stream_url', {}).get('flv_pull_url', {}))

            id = flv_pull_url.get('FULL_HD1') or flv_pull_url.get('HD1') or flv_pull_url.get('SD1') or flv_pull_url.get('SD2')

            pic = rawdata.get('owner', {}).get('avatar_large', {}).get('url_list')[0]

            remark = rawdata.get('video_feed_tag')

            video = {
                "vod_id": id,
                "vod_name": name,
                "vod_pic": pic,
                "vod_remarks": remark
                    }
            videos.append(video)

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




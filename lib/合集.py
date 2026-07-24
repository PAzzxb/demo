# coding = utf-8
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

xurl = "https://api.bilibili.com"

headerx = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36 Edg/134.0.0.0',
    'Referer':  'https://www.bilibili.com',
          }

pm = ''

class Spider(Spider):
    global xurl
    global headerx
    global headers

    def getName(self):
        return "首页"

    def init(self, extend):
        pass

    def isVideoFormat(self, url):
        pass

    def manualVideoCheck(self):
        pass
    def homeContent(self, filter):
        result = {}
        result = {"class": [{"type_id": "1001", "type_name": "影视"},
                            {"type_id": "1002", "type_name": "娱乐"},
                            {"type_id": "1003", "type_name": "音乐"},
                            {"type_id": "1004", "type_name": "舞蹈"},
                            {"type_id": "1005", "type_name": "动画"},
                            {"type_id": "1006", "type_name": "绘画"},
                            {"type_id": "1007", "type_name": "鬼畜"},
                            {"type_id": "1008", "type_name": "游戏"},
                            {"type_id": "1009", "type_name": "资讯"},
                            {"type_id": "1010", "type_name": "知识"},
                            {"type_id": "1011", "type_name": "人工智能"},
                            {"type_id": "1012", "type_name": "科技数码"},
                            {"type_id": "1013", "type_name": "汽车"},
                            {"type_id": "1014", "type_name": "时尚美妆"},
                            {"type_id": "1015", "type_name": "家装房产"},
                            {"type_id": "1016", "type_name": "户外潮流"},
                            {"type_id": "1017", "type_name": "健身"},
                            {"type_id": "1018", "type_name": "体育运动"},
                            {"type_id": "1019", "type_name": "手工"},
                            {"type_id": "1020", "type_name": "美食"},
                            {"type_id": "1021", "type_name": "小剧场"},
                            {"type_id": "1022", "type_name": "旅游出行"},
                            {"type_id": "1023", "type_name": "三农"},
                            {"type_id": "1024", "type_name": "动物"},
                            {"type_id": "1025", "type_name": "亲子"},
                            {"type_id": "1026", "type_name": "健康"},
                            {"type_id": "1027", "type_name": "情感"},
                            {"type_id": "1028", "type_name": "神秘学"},
                            {"type_id": "1029", "type_name": "VLOG"},
                            {"type_id": "1030", "type_name": "生活兴趣"},
                            {"type_id": "1031", "type_name": "生活经验"}
                            ],
                  }

        return result

    def homeVideoContent(self):
        pass

    def format_views(self, num):
        if num >= 10000:
            return f"{num / 10000:.1f}万"
        else:
            return str(num)

    def categoryContent(self, cid, pg, filter, ext):
        result = {}
        videos = []
        url = f'{xurl}/x/web-interface/region/feed/rcmd?display_id={pg}&request_cnt=15&from_region={cid}'
        res = requests.get(url=url, headers=headerx)
        res.encoding = "utf-8"
        res = res.text
        kjson = json.loads(res)
        for i in kjson['data']['archives']:
            id = i['bvid']
            name = i['title']
            pic = i['cover']
            remarks = self.format_views(i['stat']['view'])

            video = {
                "vod_id": id,
                "vod_name": name,
                "vod_pic": pic,
                "vod_remarks": '播放量:'+ remarks
            }
            videos.append(video)
        result = {'list': videos}
        result['page'] = pg
        result['pagecount'] = 9999
        result['limit'] = 90
        result['total'] = 999999
        return result

    def detailContent(self, ids):
        result = {}
        videos = []
        did = ids[0]
        url = f'https://www.bilibili.com/video/{did}'
        res = requests.get(url=url, headers=headerx)
        res.encoding = "utf-8"
        res_text = res.text

        start_str, end_str = 'window.__INITIAL_STATE__=', '}};'
        s_idx = res_text.find(start_str)
        if s_idx > -1:
            s_idx += len(start_str)
            e_idx = res_text.find(end_str, s_idx)
            if e_idx > -1:
                kjson_text = res_text[s_idx:e_idx] + '}}'
        kjson = json.loads(kjson_text)

        video_data = kjson.get('videoData', {})
        name = video_data.get('title', '未知标题')
        remarks = video_data.get('tname', '')
        director = video_data.get('owner', {}).get('name', '未知作者')
        content = video_data.get('desc', '')

        play_url = ""
        # available_list = kjson.get('availableVideoList', {}).get('list', [])
        for i in kjson['availableVideoList'][0]['list']:
            # title = i.get('title', '未知')
            # if 'https://www.bilibili.com/video/' not in did:
            play_url += i['title'] + '$' + f'https://www.bilibili.com/video/{did}?p=' + str(i['p']) + '#'
            # play_url += i['title]) + '$' + f'https://www.miguvideo.com/p/detail/' + i['pID'] + '#'
        play_url = play_url[:-1]

        video = {
            "vod_id": did,
            "vod_name": name,
            "vod_actor": '',
            "vod_director": director,
            "vod_content": content,
            "vod_remarks": remarks,
            "vod_year": '',
            "vod_area": '',
            "vod_play_from": '小哩影视',
            "vod_play_url": play_url
        }
        videos.append(video)

        result['list'] = videos
        return result

    def playerContent(self, flag, id, vipFlags):
        did = id.split('/?p=')[0]
        aid = id.split('/?p=')[-1]
        url1 = 'https://www.bilibili.com/'+ 'video/'+ did + '?p=' + aid

        return  {'jx':1,'parse': 1, 'url': url1, 'header': headerx}
    def searchContentPage(self, key, quick, page):
        result={}
        videos=[]
        if not page:
            page = 1
        url=f'https://search.bilibili.com/all?vt=64846139&keyword={key}&page={page}'
        res=requests.get(url=url,headers=headerx)
        res.encoding = "utf-8"
        res=res.text
        doc=BeautifulSoup(res, 'lxml')
        soups=doc.find_all('div', class_='bili-video-card__wrap')
        for i in soups:
            if 'www.bilibili.com/video' in i.find('a')['href']:
                if 'http' not in i.find('a')['href']:
                    id = 'https:' + i.find('a')['href']
                    id = id.replace('https://www.bilibili.com/video/', '').replace('/', '')
                else:
                    id = i.find('a')['href']
                    id = id.replace('https://www.bilibili.com/video/', '').replace('/', '')

                name = i.find('img')['alt']
                remark = i.find('div', class_='bili-video-card__stats--left')
                num_str = remark.text.strip().split('万')[0]

                try:
                    num = float(num_str)
                    if num >= 10000:
                        remarks = f"{num / 10000:.1f}亿播放量"
                    else:
                        remarks = f"{num:.1f}万播放量"
                except ValueError:
                    remarks = text

                if 'http' not in i.find('source')['srcset']:
                    pic='https:' + i.find('source')['srcset']
                else:
                    pic = i.find('source')['srcset']
            else:
                continue
            video = {
                "vod_id": id,
                "vod_name": name,
                "vod_pic": pic,
                "vod_remarks": remarks
            }
            videos.append(video)

        result['list'] = videos
        result['page'] = page
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
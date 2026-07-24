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
import hashlib
import base64
import time
import json
import time
import sys
import re
import os

sys.path.append('..')

xurl = "https://www.douyu.com"

dy_did = "69d94974edf0f8f819ccac6200051701"

headerx = {
    'Accept': '*/*',
    'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8,en-GB;q=0.7,en-US;q=0.6',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Origin': 'https://www.douyu.com',
    'Pragma': 'no-cache',
    'Referer': 'https://www.douyu.com/',
    'Sec-Fetch-Dest': 'empty',
    'Sec-Fetch-Mode': 'cors',
    'Sec-Fetch-Site': 'cross-site',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0',
    'sec-ch-ua': '"Microsoft Edge";v="143", "Chromium";v="143", "Not A(Brand";v="24"',
    'sec-ch-ua-mobile': '?0',
    'sec-ch-ua-platform': '"Windows"',
          }

cookies = {
    'dy_did': dy_did,
    'dy_did': dy_did,
    'acf_ssid': '1729749493802605600',
    'acf_web_id': '7595915624530838537',
    'acf_did': dy_did,
    '_ga': 'GA1.1.1131678254.1768561930',
    'game_did': '3uMubbpD9aYEHCGYXhddHtThaJ1zkfQw4DZ',
    'Hm_lvt_e99aee90ec1b2106afe7ec3b199020a7': '1768571795',
    'Hm_lpvt_e99aee90ec1b2106afe7ec3b199020a7': '1768571795',
    'HMACCOUNT': '03B8205B6ED79FE8',
    'acf_ab_pmt': '20100212%23webnewhome%23B%2C20100254%23WebTool0703%23new%2C20100249%23webTagRank%23B%2C20100248%23webTagHover%23B%2C20100272%23all_lists_sort%23c',
    'acf_ab_ver_all': '20100212%2C20100254%2C20100249%2C20100248%2C20100272',
    'acf_ab_vs': 'webnewhome%3DB%2CWebTool0703%3Dnew%2CwebTagRank%3DB%2CwebTagHover%3DB%2Call_lists_sort%3Dc',
    'acf_ccn': '356cb4c06fa8fc49cdac37a44a998e6d',
    '_ga_5JKQ7DTEXC': 'GS2.1.s1768571795$o4$g1$t1768572949$j60$l0$h1465423886',
          }

headers = {
    'accept': 'application/json, text/plain, */*',
    'accept-language': 'zh-CN,zh;q=0.9,en;q=0.8,en-GB;q=0.7,en-US;q=0.6',
    'cache-control': 'no-cache',
    'pragma': 'no-cache',
    'priority': 'u=1, i',
    'referer': 'https://www.douyu.com/',
    'sec-ch-ua': '"Microsoft Edge";v="143", "Chromium";v="143", "Not A(Brand";v="24"',
    'sec-ch-ua-mobile': '?0',
    'sec-ch-ua-platform': '"Windows"',
    'sec-fetch-dest': 'empty',
    'sec-fetch-mode': 'cors',
    'sec-fetch-site': 'same-origin',
    'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0',
    'x-requested-with': 'XMLHttpRequest',
          }

class Spider(Spider):

    def getName(self):
        return "丢丢喵"

    def init(self, extend):
        pass

    def isVideoFormat(self, url):
        pass

    def manualVideoCheck(self):
        pass

    def homeContent(self, filter):
        result = {"class": []}

        url = f'{xurl}/japi/weblist/apinc/newDirectory'
        detail = requests.get(url=url, headers=headers)
        detail.encoding = "utf-8"
        data = detail.json()

        for vod in data['data']['leftNavV2']['cateList']:

            name = vod['cn1']

            id = f"{vod['id']}@{vod['cn1']}"

            result["class"].append({"type_id": id, "type_name": name})

        return result

    def homeVideoContent(self):
        pass

    def categoryContent(self, cid, pg, filter, ext):
        result = {}
        videos = []

        if '&' in cid:

            page = int(pg) if pg else 1

            fenge = cid.split("&")

            url = f'{xurl}/gapi/rknc/directory/mixListV1/2_{fenge[0]}/{str(page)}'
            detail = requests.get(url= url, cookies=cookies, headers=headers)
            detail.encoding = "utf-8"
            data = detail.json()

            for vod in data['data']['rl']:

                name = vod['rn']

                id = vod['rid']

                pic = vod['rs16_avif']

                remark = f"在线人数{vod.get('ol', '暂无备注')}"

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

        else:
            fenge = cid.split("@")

            params = {
                'shortName': fenge[1],
                'customClassId': fenge[0],
                'offset': '0',
                'limit': '200',
                     }

            url = f'{xurl}/japi/weblist/apinc/getC2List'
            detail = requests.get(url=url, params=params, cookies=cookies, headers=headers)
            detail.encoding = "utf-8"
            data = detail.json()

            for vod in data['data']['list']:

                name = vod['cname2']

                id = vod['cid2']

                pic = vod['squareIconUrlW']

                remark = f"在线人数{vod.get('hn', '暂无备注')}"

                video = {
                    "vod_id": f"{id}&{id}",
                    "vod_name": name,
                    "vod_pic": pic,
                    "vod_tag": "folder",
                    "vod_remarks": remark
                        }
                videos.append(video)

            result = {'list': videos}
            result['page'] = pg
            result['pagecount'] = 1
            result['limit'] = 90
            result['total'] = 999999
            return result

    def detailContent(self, ids):
        did = ids[0]
        result = {}
        videos = []

        videos.append({
            "vod_id": did,
            "vod_play_from": "斗鱼线路",
            "vod_play_url": did
                     })

        result['list'] = videos
        return result

    def get_douyu_url(self, room_id):
        room_id = str(room_id)
        enc_url = f'{xurl}/wgapi/livenc/liveweb/websec/getEncryption?did={dy_did}'
        resp_enc = requests.get(enc_url, headers=headers, cookies=cookies)
        json_data = resp_enc.json()
        enc_data_res = json_data['data']
        key = enc_data_res['key']
        rand_str = enc_data_res['rand_str']
        server_enc_data = enc_data_res['enc_data']
        enc_time = enc_data_res.get('enc_time', 1)
        tt = str(int(time.time()))
        hash_val = rand_str
        for _ in range(enc_time):
            hash_val = hashlib.md5((hash_val + key).encode('utf-8')).hexdigest()
        suffix = room_id + tt
        auth = hashlib.md5((hash_val + key + suffix).encode('utf-8')).hexdigest()
        play_url = f'{xurl}/lapi/live/getH5PlayV1/{room_id}'
        payload = {
            'enc_data': server_enc_data,
            'tt': tt,
            'did': dy_did,
            'auth': auth,
            'ver': 'Douyu_new',
            'rate': '-1',
            'hevc': '0',
            'fa': '0',
            'ive': '0'
                   }
        resp_play = requests.post(play_url, cookies=cookies, headers=headers, data=payload)
        result = resp_play.json()
        data = result['data']
        return f"{data['rtmp_url']}/{data['rtmp_live']}"

    def playerContent(self, flag, id, vipFlags):

        final_url = self.get_douyu_url(id)

        result = {}
        result["parse"] = 0
        result["playUrl"] = ''
        result["url"] = final_url
        result["header"] = headerx
        return result

    def searchContentPage(self, key, quick, pg):
        videos = []

        page = int(pg) if pg else 1

        params = {
            'page': page,
            'pageSize': '28',
            'kw': key,
                 }

        url = f'{xurl}/japi/search/api/searchShow'
        detail = requests.get(url=url, params=params, cookies=cookies, headers=headers)
        detail.encoding = "utf-8"
        data = detail.json()

        for vod in data['data']['relateShow']:

            name = vod['roomName']

            id = vod['rid']

            pic = vod['roomSrc']

            remark = vod.get('hot', '暂无备注')

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













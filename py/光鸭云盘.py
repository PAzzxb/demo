#!/usr/bin/python
# -*- coding: utf-8 -*-
import re,json,base64,requests
from urllib.parse import quote,urljoin,urlparse,parse_qs
from base.spider import Spider

class Spider(Spider):
    def getName(self): return "光鸭"
    def init(self,extend=""):
        self.host="https://guangya.qsxy.top"
        self.pan_host="https://www.guangyapan.com"
        self.pan_api="https://api.guangyapan.com"
        self.cookie=""
        self.pan_auth=""
        self.comment="感谢分享资源"
        self.ua="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/147.0 Safari/537.36"
        self.classes={"film":"电影","show":"电视剧","animation":"动漫","reality":"综艺","documentary":"纪录片","music":"音乐"}
        self.session=requests.Session()
        self.session.verify=False
        if extend:
            try:
                c=json.loads(extend)
                self.cookie=c.get("cookie","") or c.get("site_cookie","")
                self.pan_auth=c.get("pan_auth","") or c.get("auth","")
                self.comment=c.get("comment",self.comment) or self.comment
            except Exception:
                self.cookie=extend
        self.headers={"User-Agent":self.ua,"Referer":self.host+"/","Accept-Language":"zh-CN,zh;q=0.9"}
        if self.cookie: self.headers["Cookie"]=self.cookie
        requests.packages.urllib3.disable_warnings(requests.packages.urllib3.exceptions.InsecureRequestWarning)
    def _get(self,u,ref=""):
        try:
            h=dict(self.headers); h["Referer"]=ref or self.host+"/"
            r=self.session.get(u if u.startswith("http") else self.host+u,headers=h,timeout=20,allow_redirects=True)
            r.encoding=r.apparent_encoding or "utf-8"
            return r.text
        except Exception:
            return ""
    def _post_json(self,u,data,auth=False,ref=""):
        try:
            h={"User-Agent":self.ua,"Accept":"application/json, text/plain, */*","Content-Type":"application/json;charset=UTF-8","Origin":self.pan_host,"Referer":ref or self.pan_host+"/","dt":"4"}
            if auth and self.pan_auth: h["Authorization"]=self.pan_auth if self.pan_auth.lower().startswith("bearer ") else "Bearer "+self.pan_auth
            return self.session.post(u if u.startswith("http") else self.pan_api+u,headers=h,data=json.dumps(data,ensure_ascii=False),timeout=20,verify=False).json()
        except Exception:
            return {}
    def _b64e(self,o):
        s=o if isinstance(o,str) else json.dumps(o,ensure_ascii=False,separators=(",",":"))
        return base64.urlsafe_b64encode(s.encode()).decode().rstrip("=")
    def _b64d(self,s):
        try: return json.loads(base64.urlsafe_b64decode((s+"="*(-len(s)%4)).encode()).decode())
        except Exception:
            try: return base64.urlsafe_b64decode((s+"="*(-len(s)%4)).encode()).decode()
            except Exception: return s
    def _clean(self,s):
        return re.sub(r"\s+"," ",re.sub(r"<[^>]+>"," ",str(s or "").replace("&amp;","&").replace("&quot;",'"').replace("&#39;","'").replace("&nbsp;"," "))).strip()
    def _abs(self,u,base=None): return urljoin(base or self.host+"/",str(u or "")) if u else ""
    def _pic(self,b):
        m=re.search(r'<img[^>]+(?:data-src|data-original|src)=["\']([^"\']+)',b,re.S|re.I)
        return self._abs(m.group(1)) if m else ""
    def _cards(self,html):
        arr=[]; seen=set()
        blocks=re.findall(r'(<[^>]+class=["\'][^"\']*(?:posts-item|hover-zoom-img|term-title)[^"\']*["\'][\s\S]*?)(?=<[^>]+class=["\'][^"\']*(?:posts-item|hover-zoom-img|term-title)|</main>|<footer)',html,re.I) or re.findall(r'(<a[^>]+href=["\'][^"\']+\.html["\'][\s\S]*?</a>)',html,re.I)
        for b in blocks:
            mh=re.search(r'href=["\']([^"\']+\.html)["\']',b,re.I)
            if not mh: continue
            href=self._abs(mh.group(1))
            mt=re.search(r'<h2[^>]*>[\s\S]*?<a[^>]*>([\s\S]*?)</a>',b,re.I) or re.search(r'<a[^>]+title=["\']([^"\']+)',b,re.I) or re.search(r'<img[^>]+alt=["\']([^"\']+)',b,re.I) or re.search(r'<a[^>]*>([\s\S]*?)</a>',b,re.I)
            name=self._clean(mt.group(1) if mt else "").replace("- 光鸭","").strip()
            if href and name and href not in seen:
                seen.add(href)
                arr.append({"vod_id":href,"vod_name":name,"vod_pic":self._pic(b),"vod_remarks":""})
        return arr
    def _hidden(self,h):
        return "此处内容已隐藏" in h or "reply-show" in h or "hidden-box" in h or "评论后" in h or "回复后" in h
    def _form_value(self,h,name):
        m=re.search(r'name=["\']'+re.escape(name)+r'["\'][^>]*value=["\']([^"\']*)',h,re.I) or re.search(r'value=["\']([^"\']*)["\'][^>]*name=["\']'+re.escape(name)+r'["\']',h,re.I)
        return m.group(1) if m else ""
    def _unlock(self,url,h):
        if not self.cookie or not self._hidden(h): return h
        pid=self._form_value(h,"comment_post_ID") or self._form_value(h,"postid") or self._form_value(h,"post_id")
        parent=self._form_value(h,"comment_parent") or "0"
        nonce=self._form_value(h,"_wpnonce") or self._form_value(h,"post_action_nonce")
        ajax=re.search(r'(?:ajax-href|data-ajax|action)=["\']([^"\']+)["\']',h,re.I)
        target=self._abs(ajax.group(1),self.host+"/") if ajax else self.host+"/wp-admin/admin-ajax.php"
        data={"comment":self.comment,"comment_post_ID":pid,"comment_parent":parent,"action":"submit_comment"}
        if nonce:
            data["_wpnonce"]=nonce
            data["post_action_nonce"]=nonce
        for target_url in [target,self.host+"/wp-comments-post.php"]:
            try:
                hd=dict(self.headers)
                hd.update({"Referer":url,"Origin":self.host,"X-Requested-With":"XMLHttpRequest","Content-Type":"application/x-www-form-urlencoded; charset=UTF-8","Accept":"application/json, text/javascript, */*; q=0.01"})
                self.session.post(target_url,headers=hd,data=data,timeout=20,verify=False,allow_redirects=False)
                h2=self._get(url,url)
                if h2 and not self._hidden(h2): return h2
            except Exception:
                continue
        return h
    def _share_url(self,u):
        u=str(u or "").replace("&amp;","&")
        if "guangyapan.com/s/" in u: return self._abs(u,self.pan_host+"/")
        if "golink=" in u:
            try:
                q=parse_qs(urlparse(u).query).get("golink",[""])[0].replace("-","+").replace("_","/")
                q+="="*(-len(q)%4)
                x=base64.b64decode(q.encode()).decode().strip()
                return x if x.startswith("http") else ""
            except Exception:
                return ""
        return ""
    def _shares(self,html):
        out=[]; seen=set()
        pats=[r"https?://[^\s\"'<>]+guangyapan\.com/s/[^\s\"'<>]+",r"https?://[^\s\"'<>]+\?golink=[A-Za-z0-9_\-=%]+",r"(?:href|data-clipboard-text|data-url|data-link|data-href)=[\"']([^\"']+)[\"']"]
        for p in pats:
            for u in re.findall(p,html,re.I):
                su=self._share_url(u)
                if su and su not in seen:
                    seen.add(su); out.append(su)
        return out
    def _sid(self,u):
        m=re.search(r"/s/([^/?#]+)",u)
        return m.group(1) if m else ""
    def _code(self,u):
        try:
            q=parse_qs(urlparse(u).query)
            return (q.get("code") or q.get("pwd") or [""])[0]
        except Exception:
            return ""
    def _pan_files(self,su):
        sid=self._sid(su); code=self._code(su)
        if not sid: return []
        tok=self._post_json("/userres/v1/get_share_access_token",{"shareId":sid,**({"code":code} if code else {})},False,self.pan_host+"/s/"+sid).get("data",{}).get("accessToken","")
        if not tok: return []
        res=[]; stack=[""]; seen=set()
        for _ in range(4):
            if not stack: break
            pid=stack.pop(0)
            data=self._post_json("/userres/v1/get_share_page_files_list",{"accessToken":tok,"pageSize":200,"orderBy":0,"sortType":0,"parentId":pid},False,self.pan_host+"/s/"+sid).get("data",{})
            lst=data.get("list",[]) if isinstance(data.get("list",[]),list) else []
            for it in lst:
                fid=str(it.get("fileId","")).strip()
                name=str(it.get("fileName","")).strip()
                rt=int(it.get("resType",0) or 0)
                if not fid or fid in seen: continue
                seen.add(fid)
                if rt==2:
                    stack.append(fid)
                elif rt==1 and re.search(r"\.(mp4|mkv|avi|mov|wmv|flv|m4v|ts|m2ts|webm|m3u8)$",name,re.I):
                    g=re.search(r"screenshot-thumbnails/([A-Fa-f0-9]{20,})/",str(it.get("thumbnail","")+str(it.get("gcid",""))))
                    res.append({"shareId":sid,"shareURL":su,"code":code,"fileId":fid,"fileName":name,"gcid":g.group(1) if g else "","size":it.get("fileSize",0)})
        return res
    def homeContent(self,filter):
        return {"class":[{"type_id":k,"type_name":v} for k,v in self.classes.items()],"filters":{},"list":self._cards(self._get("/"))[:30]}
    def homeVideoContent(self):
        return {"list":self._cards(self._get("/"))[:30]}
    def categoryContent(self,tid,pg,filter,extend):
        page=int(pg) if str(pg).isdigit() else 1
        html=self._get(f"/category/{tid}"+(f"/page/{page}" if page>1 else ""))
        m=[int(x) for x in re.findall(rf"/category/{re.escape(str(tid))}/page/(\d+)",html)]
        return {"page":page,"pagecount":max(m+[page]),"limit":20,"total":0,"list":self._cards(html)}
    def searchContent(self,key,quick,pg="1"):
        page=int(pg) if str(pg).isdigit() else 1
        html=self._get(f"/?s={quote(key)}&type=post") if key else ""
        return {"page":page,"pagecount":1,"limit":20,"total":0,"list":self._cards(html)}
    def detailContent(self,ids):
        vid=ids[0]
        html=self._unlock(vid,self._get(vid))
        name=self._clean((re.search(r"<h1[^>]*>([\s\S]*?)</h1>",html,re.I) or re.search(r"<title[^>]*>([\s\S]*?)</title>",html,re.I) or ["","光鸭资源"])[1]).replace("- 光鸭","").strip()
        pic=self._pic(html)
        content=self._clean((re.search(r'<div[^>]+class=["\'][^"\']*wp-posts-content[^"\']*["\'][^>]*>([\s\S]*?)</div>',html,re.I) or ["",""])[1])
        pf=[]; pu=[]
        for idx,su in enumerate(self._shares(html)):
            files=self._pan_files(su)
            eps=["点击选择$noop"]
            if files:
                for i,f in enumerate(files):
                    eps.append((f.get("fileName") or f"资源{i+1}").replace("#","＃").replace("$","￥")+"$"+self._b64e(f))
            else:
                eps.append("打开分享页$"+self._b64e({"shareURL":su}))
            pf.append(f"光鸭云盘{idx+1}")
            pu.append("#".join(eps))
        if not pf:
            pf=["详情页"]; pu=["打开详情页$"+self._b64e({"page":vid})]
        return {"list":[{"vod_id":vid,"vod_name":name or "光鸭资源","vod_pic":pic,"vod_content":content,"vod_play_from":"$$$".join(pf),"vod_play_url":"$$$".join(pu)}]}
    def playerContent(self,flag,id,vipFlags):
        if not id or id=="noop": return {"parse":1,"jx":0,"url":""}
        o=self._b64d(id)
        if isinstance(o,dict) and o.get("page"): return {"parse":1,"jx":0,"url":o.get("page","")}
        if isinstance(o,dict) and o.get("shareURL") and not o.get("fileId"): return {"parse":0,"jx":0,"url":"push://"+o.get("shareURL","")}
        if isinstance(o,dict) and o.get("shareId") and o.get("fileId"):
            tok=self._post_json("/userres/v1/get_share_access_token",{"shareId":o.get("shareId"),**({"code":o.get("code")} if o.get("code") else {})},False,o.get("shareURL","")).get("data",{}).get("accessToken","")
            if tok:
                u=self._post_json("/userres/v1/get_share_download_url",{"accessToken":tok,"fileId":o.get("fileId")},False,o.get("shareURL","")).get("data",{}).get("downloadUrl","")
                if u: return {"parse":0,"jx":0,"url":u}
            if self.pan_auth and o.get("gcid"):
                u=self._post_json("/userres/v1/file/get_vod_download_url",{"fileId":o.get("fileId"),"gcid":o.get("gcid")},True,o.get("shareURL","")).get("data",{}).get("signedURL","")
                if u: return {"parse":0,"jx":0,"url":u}
            return {"parse":0,"jx":0,"url":"push://"+o.get("shareURL","")}
        return {"parse":0,"jx":0,"url":""}
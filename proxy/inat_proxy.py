"""
İnat TV HLS Proxy Sunucusu
Samsung TV → bu proxy → inat CDN

Çalıştır: python proxy/inat_proxy.py
Port: 8080
"""
import re
import time
import threading
import urllib.parse
from http.server import HTTPServer, BaseHTTPRequestHandler
from pathlib import Path
import requests

PORT = 8080
GATEWAY = "https://inattvgiris.one/"

# Kanal ID → inat channel id
CHANNELS = {
    "beinsports1": "zirve",
    "beinsports2": "b2",
    "beinsports3": "b3",
    "beinsports4": "b4",
    "beinsports5": "b5",
    "beinsportsmax1": "bm1",
    "beinsportsmax2": "bm2",
    "ssport": "ss",
    "ssport2": "ss2",
    "tivibuspor": "t1",
    "tivibuspor2": "t2",
    "tivibuspor3": "t3",
    "tivibuspor4": "t4",
    "smartspor": "smarts",
    "smartspor2": "sms2",
    "trtspor": "trtspor",
    "trtsporyildiz": "trtspor2",
    "trt1": "trt1",
    "tv8": "tv8",
    "tv85": "tv85",
    "nbatv": "nbatv",
    "eurosport1": "eu1",
    "eurosport2": "eu2",
}

# Durum
_state = {
    "domain": None,
    "session": requests.Session(),
    "last_refresh": 0,
}

_state["session"].headers.update({
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
})


def get_current_domain():
    """inattvgiris.one'dan güncel domain'i al."""
    try:
        from playwright.sync_api import sync_playwright
        with sync_playwright() as pw:
            browser = pw.chromium.launch(headless=True, args=["--no-sandbox"])
            ctx = browser.new_context(user_agent=_state["session"].headers["User-Agent"])
            ctx.add_init_script('Object.defineProperty(navigator,"webdriver",{get:()=>undefined})')
            page = ctx.new_page()
            page.goto(GATEWAY, wait_until="domcontentloaded", timeout=15000)
            page.wait_for_timeout(2000)
            content = page.content()
            # Cookie'leri al
            for cookie in ctx.cookies():
                _state["session"].cookies.set(cookie["name"], cookie["value"], domain=cookie.get("domain",""))
            browser.close()
        m = re.search(r'href=["\']+(https://inattvv?\d+\.[a-z]+/)', content)
        if m:
            return m.group(1).rstrip("/")
    except Exception as e:
        print(f"[proxy] domain hatasi: {e}")
    return None


def get_stream_url(domain, ch_id):
    """Kanal sayfasından m3u8 URL yakala."""
    try:
        from playwright.sync_api import sync_playwright
        found = []
        with sync_playwright() as pw:
            browser = pw.chromium.launch(headless=True, args=["--no-sandbox"])
            ctx = browser.new_context(user_agent=_state["session"].headers["User-Agent"])
            ctx.add_init_script('Object.defineProperty(navigator,"webdriver",{get:()=>undefined})')
            # Mevcut cookie'leri aktar
            page = ctx.new_page()
            page.on("request", lambda r: found.append(r.url) if ".m3u8" in r.url and "chunk" not in r.url else None)
            page.goto(f"{domain}/channel.html?id={ch_id}", wait_until="domcontentloaded", timeout=15000)
            page.wait_for_timeout(5000)
            # Cookie'leri güncelle
            for cookie in ctx.cookies():
                _state["session"].cookies.set(cookie["name"], cookie["value"])
            browser.close()
        return found[0] if found else None
    except Exception as e:
        print(f"[proxy] stream hatasi {ch_id}: {e}")
        return None


def refresh_state():
    """Domain ve stream URL'leri yenile."""
    print("[proxy] Yenileniyor...")
    domain = get_current_domain()
    if domain:
        _state["domain"] = domain
        print(f"[proxy] Domain: {domain}")
    _state["last_refresh"] = time.time()


# Kanal → gerçek stream URL cache
_stream_cache = {}


def get_cached_stream(ch_name):
    """Cache'den veya taze olarak stream URL al."""
    cached = _stream_cache.get(ch_name)
    if cached and time.time() - cached["ts"] < 3600:  # 1 saat geçerliliği
        return cached["url"]

    if not _state["domain"]:
        refresh_state()

    ch_id = CHANNELS.get(ch_name)
    if not ch_id or not _state["domain"]:
        return None

    url = get_stream_url(_state["domain"], ch_id)
    if url:
        _stream_cache[ch_name] = {"url": url, "ts": time.time()}
    return url


class ProxyHandler(BaseHTTPRequestHandler):
    def log_message(self, fmt, *args):
        print(f"[proxy] {self.address_string()} - {fmt % args}")

    def do_GET(self):
        path = self.path.lstrip("/")

        # /ch/{kanal} → m3u8 proxy
        if path.startswith("ch/"):
            ch_name = path[3:].split("?")[0].split(".")[0]
            self._proxy_channel(ch_name)
        # /seg/{url} → segment proxy
        elif path.startswith("seg/"):
            real_url = urllib.parse.unquote(path[4:])
            self._proxy_segment(real_url)
        # /status → durum
        elif path == "status":
            self._send_status()
        else:
            self.send_error(404)

    def _proxy_channel(self, ch_name):
        stream_url = get_cached_stream(ch_name)
        if not stream_url:
            self.send_error(503, f"Stream bulunamadi: {ch_name}")
            return

        try:
            r = _state["session"].get(stream_url, timeout=10,
                                      headers={"Referer": _state["domain"] + "/"})
            if r.status_code != 200:
                self.send_error(r.status_code)
                return

            content = r.text
            # Segment URL'lerini proxy üzerinden yönlendir
            base = stream_url.rsplit("/", 1)[0]
            def rewrite(m):
                seg = m.group(1)
                if seg.startswith("http"):
                    full = seg
                else:
                    full = base + "/" + seg
                return f"/seg/{urllib.parse.quote(full, safe='')}"

            content = re.sub(r'^(?!#)([^\s]+\.ts[^\s]*)$', rewrite, content, flags=re.MULTILINE)
            content = re.sub(r'^(?!#)([^\s]+\.m3u8[^\s]*)$',
                           lambda m: f"/ch/{ch_name}", content, flags=re.MULTILINE)

            body = content.encode("utf-8")
            self.send_response(200)
            self.send_header("Content-Type", "application/vnd.apple.mpegurl")
            self.send_header("Content-Length", str(len(body)))
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()
            self.wfile.write(body)
        except Exception as e:
            self.send_error(500, str(e))

    def _proxy_segment(self, real_url):
        try:
            r = _state["session"].get(real_url, timeout=15, stream=True,
                                      headers={"Referer": _state["domain"] + "/"})
            self.send_response(r.status_code)
            ct = r.headers.get("Content-Type", "video/MP2T")
            self.send_header("Content-Type", ct)
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()
            for chunk in r.iter_content(65536):
                self.wfile.write(chunk)
        except Exception as e:
            self.send_error(500, str(e))

    def _send_status(self):
        lines = [f"Domain: {_state['domain']}", f"Kanallar: {len(CHANNELS)}"]
        for ch, data in _stream_cache.items():
            lines.append(f"  {ch}: {data['url'][:60]}")
        body = "\n".join(lines).encode()
        self.send_response(200)
        self.send_header("Content-Type", "text/plain; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)


def main():
    print(f"[proxy] Başlatılıyor... Port: {PORT}")
    print(f"[proxy] Test: http://localhost:{PORT}/status")

    # İlk yükleme
    refresh_state()

    # Periyodik yenileme (her saat)
    def auto_refresh():
        while True:
            time.sleep(3600)
            refresh_state()

    t = threading.Thread(target=auto_refresh, daemon=True)
    t.start()

    server = HTTPServer(("0.0.0.0", PORT), ProxyHandler)
    print(f"[proxy] Çalışıyor. Ctrl+C ile dur.")

    # Playlist URL'leri
    import socket
    ip = socket.gethostbyname(socket.gethostname())
    print(f"\n--- PLAYLIST URL'LERİ ---")
    for ch_name in CHANNELS:
        print(f"http://{ip}:{PORT}/ch/{ch_name}")
    print("------------------------\n")

    server.serve_forever()


if __name__ == "__main__":
    main()

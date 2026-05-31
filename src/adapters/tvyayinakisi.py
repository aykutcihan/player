"""
tvyayinakisi.com — Tek istekte tüm kanallar.

URL: https://www.tvyayinakisi.com/tvde-bugun-rehberi/
Yapı: div.channels-today__program[data-channel-slug] kapsayıcısı içinde
      div.channels-today__program__item elementleri (başlık + saat aralığı).

Avantajlar (eski adaptöre göre):
- Tek HTTP isteği → 50 kanal
- Başlangıç VE bitiş saati mevcut
- Temiz class-based selector, fragile regex yok
"""
from __future__ import annotations
import re
from datetime import datetime, timedelta
from typing import List, Dict

from bs4 import BeautifulSoup

from adapters.base import BaseAdapter
from models import Programme
from normalize import ist

TIME_RE = re.compile(r"(\d{1,2}):(\d{2})\s*-\s*(\d{1,2}):(\d{2})")


class TvYayinAkisiAdapter(BaseAdapter):
    prefix = "tvyayinakisi"
    base_url = "https://www.tvyayinakisi.com"

    def __init__(self, session=None, delay: float = 0.2):
        super().__init__(session, delay)
        self._cache: Dict[str, List[Programme]] = {}
        self._loaded = False

    def fetch(self, source_id: str, channel_id: str) -> List[Programme]:
        if not self._loaded:
            self._fill_cache()
        raw = self._cache.get(source_id, [])
        # Önbellekte channel_id placeholder — doğrusu burada set edilir
        return [Programme(
            channel_id=channel_id,
            start=p.start, stop=p.stop,
            title=p.title, category=p.category,
            source=self.prefix,
        ) for p in raw]

    def _fill_cache(self):
        self._loaded = True
        try:
            html = self._get(f"{self.base_url}/tvde-bugun-rehberi/").text
        except Exception as e:
            print(f"  [tvyayinakisi] istek hatasi: {e}")
            return
        self._parse_page(html)
        total = sum(len(v) for v in self._cache.values())
        print(f"  [tvyayinakisi] {len(self._cache)} kanal, {total} program önbelleğe alındı.")

    def _parse_page(self, html: str):
        soup = BeautifulSoup(html, "lxml")
        today = ist(datetime.now())

        for ch_div in soup.select("div.channels-today__program[data-channel-slug]"):
            slug_full = ch_div.get("data-channel-slug", "")
            slug = slug_full.replace("-yayin-akisi", "")

            progs: List[Programme] = []
            for item in ch_div.select("div.channels-today__program__item"):
                title_el = item.select_one(".channels-today__program__title")
                time_el = item.select_one(".channels-today__program__time")

                title = title_el.get_text(strip=True) if title_el else ""
                time_txt = time_el.get_text("").replace(" ", "") if time_el else ""

                m = TIME_RE.search(time_txt)
                if not m or not title:
                    continue

                sh, sm, eh, em = int(m.group(1)), int(m.group(2)), int(m.group(3)), int(m.group(4))
                # 24:XX → ertesi günün 0:XX
                start_dt = ist(datetime(today.year, today.month, today.day, sh % 24, sm))
                stop_dt = ist(datetime(today.year, today.month, today.day, eh % 24, em))
                if sh >= 24:
                    start_dt += timedelta(days=1)
                if eh >= 24 or stop_dt <= start_dt:
                    stop_dt += timedelta(days=1)

                progs.append(Programme(
                    channel_id="",  # fetch() içinde doğru id ile üretilir
                    start=start_dt,
                    stop=stop_dt,
                    title=title,
                    source=self.prefix,
                ))

            if progs:
                self._cache[slug] = progs

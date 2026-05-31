"""
digiturkburada (digiturkburada.com.tr) — beIN YEDEĞİ.

URL: https://www.digiturkburada.com.tr/{slug-id}.html
     örn: bein-sports-1-hd-yayin-akisi-60
Tablo: ad + başlangıç (BİTİŞ/AÇIKLAMA YOK). Aynı link günlük yenilenir; 3 gün ayrı linklerde.

>>> CANLI HTML'E GÖRE AYAR GEREKEBİLİR <<<
Tablo satır selector'ını (saat hücresi + ad hücresi) PC'de doğrula.
3 günlük link yapısı (göreli mi tarih damgalı mı) netleşince çoklu-gün eklenir.
"""
from __future__ import annotations
import re
from datetime import datetime
from typing import List

from bs4 import BeautifulSoup

from adapters.base import BaseAdapter
from models import Programme
from normalize import parse_hhmm_on, simplify, ist

TIME_RE = re.compile(r"\b(\d{1,2}:\d{2})\b")


class DigiturkBuradaAdapter(BaseAdapter):
    prefix = "digiturkburada"
    base_url = "https://www.digiturkburada.com.tr"

    def fetch(self, source_id: str, channel_id: str) -> List[Programme]:
        url = f"{self.base_url}/{source_id}.html"
        html = self._get(url).text
        return self._parse(html, channel_id)

    def _parse(self, html: str, channel_id: str) -> List[Programme]:
        soup = BeautifulSoup(html, "lxml")
        today = ist(datetime.now())
        out: List[Programme] = []
        # >>> TODO: gerçek tablo selector'ı. Şimdilik tr/li üzerinden saat+ad ayıkla.
        for row in soup.select("tr, li"):
            txt = " ".join(row.get_text(" ").split())
            mt = TIME_RE.search(txt)
            if not mt:
                continue
            name = txt[mt.end():].strip(" -–—")
            if not name:
                continue
            s = simplify(name)  # beIN spor: maç adı çıkar
            out.append(Programme(
                channel_id=channel_id,
                start=parse_hhmm_on(today, mt.group(1)),
                title=s["title"], desc=s["desc"], category="Spor",
                source=self.prefix,
            ))
        return out

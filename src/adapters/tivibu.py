"""
Tivibu (tivibu.com.tr) — YEDEK + en geniş tarih (~2 hafta) + Tivibu Spor beşlisi (özel).

Kanal akışı satır biçimi (kategori sayfalarında görülen):
    'Program Adı  Kategori - 20:00 → 21:30 Canlı'
yani: ad + tür(Yaşam/Film/Dizi/Diğer) + başlangıç → bitiş (BİTİŞ VAR).

Kanal id'si: ch00000000000000001170 gibi.
Detay/akış uç noktası:  /rv?i=2|ch{id}&datatype=2
(üyelik duvarı sadece VİDEO için; akış metni görünür.)

>>> CANLI HTML'E GÖRE AYAR GEREKEBİLİR <<<
- /rv çıktısının HTML mi JSON mu olduğunu PC'de doğrula.
- Çok günlük veri için tarih parametresi gerekebilir (tab'lar 24.05→07.06 idi).
- Açıklama (özet) listede yoktu; detay panelinde olabilir -> istersen ayrı çek.
"""
from __future__ import annotations
import re
from datetime import datetime, timedelta
from typing import List
from urllib.parse import quote

from bs4 import BeautifulSoup

from adapters.base import BaseAdapter
from models import Programme
from normalize import ist

# 'Program Adı  Kategori - 20:00 → 21:30'
ROW_RE = re.compile(
    r"^(?P<title>.+?)\s+(?P<cat>Yaşam|Film|Dizi|Diğer|Spor|Haber|Çocuk|Müzik)\s*-\s*"
    r"(?P<start>\d{1,2}:\d{2})\s*(?:→|->)\s*(?P<stop>\d{1,2}:\d{2})",
    re.IGNORECASE,
)


class TivibuAdapter(BaseAdapter):
    prefix = "tivibu"
    base_url = "https://www.tivibu.com.tr"

    def fetch(self, source_id: str, channel_id: str) -> List[Programme]:
        # source_id örn: ch00000000000000001170
        ident = quote(f"2|{source_id}", safe="")
        url = f"{self.base_url}/rv?i={ident}&datatype=2"
        text = self._get(url).text
        return self._parse(text, channel_id)

    def _parse(self, text: str, channel_id: str) -> List[Programme]:
        soup = BeautifulSoup(text, "lxml")
        lines = [ln.strip() for ln in soup.get_text("\n").splitlines() if ln.strip()]
        base = datetime.now(tz=ist(datetime.now()).tzinfo)
        out: List[Programme] = []
        prev_start = None
        day_offset = 0
        for ln in lines:
            m = ROW_RE.match(ln)
            if not m:
                continue
            sh, sm = map(int, m.group("start").split(":"))
            eh, em = map(int, m.group("stop").split(":"))
            start = (base + timedelta(days=day_offset)).replace(
                hour=sh, minute=sm, second=0, microsecond=0)
            # gece yarısı geçişi: start önceki start'tan küçükse ertesi güne sar
            if prev_start and start < prev_start:
                day_offset += 1
                start += timedelta(days=1)
            prev_start = start
            stop = start.replace(hour=eh, minute=em)
            if stop <= start:
                stop += timedelta(days=1)
            out.append(Programme(
                channel_id=channel_id, start=start, stop=stop,
                title=m.group("title").strip(),
                category=m.group("cat").strip(),
                source=self.prefix,
            ))
        return out

"""
tvyayinakisi (tvyayinakisi.com) — beIN ailesi + uzun kuyruk + 3. yedek.

URL:  https://www.tvyayinakisi.com/{slug}-yayin-akisi/
Satır: başlangıç saati + ad + tür (Spor/Dizi/...). BİTİŞ YOK, AÇIKLAMA YOK.
Statik HTML'de yalnız BUGÜN dolu (ileri günler boştu).

- bitiş normalize'da sonraki başlangıçtan türetilir.
- spor/maç isimleri simplify() ile sadeleştirilir.
- 'Az Sonra...' filler satırları elenir.

>>> CANLI HTML'E GÖRE AYAR GEREKEBİLİR <<<
Saat + ad + kategoriyi taşıyan <li>/<div> selector'ını PC'de doğrula.
Aşağıdaki parser, gördüğümüz render düzenine (kalın saat + ad + [tür]) göre
metin tabanlı bir yaklaşım kullanıyor.
"""
from __future__ import annotations
import re
from datetime import datetime
from typing import List

from bs4 import BeautifulSoup

from adapters.base import BaseAdapter
from models import Programme
from normalize import parse_hhmm_on, simplify, ist

FILLER = ("az sonra", "yayın akışı bulunamadı", "bu gün için")
TIME_RE = re.compile(r"\b(\d{1,2}:\d{2})\b")


class TvYayinAkisiAdapter(BaseAdapter):
    prefix = "tvyayinakisi"
    base_url = "https://www.tvyayinakisi.com"

    SPORTS = {"spor"}  # bu türde simplify uygula

    def fetch(self, source_id: str, channel_id: str) -> List[Programme]:
        url = f"{self.base_url}/{source_id}-yayin-akisi/"
        html = self._get(url).text
        return self._parse(html, channel_id)

    def _parse(self, html: str, channel_id: str) -> List[Programme]:
        soup = BeautifulSoup(html, "lxml")
        today = ist(datetime.now())
        out: List[Programme] = []
        # >>> TODO: doğru kapsayıcıyı seç. Şimdilik tüm <li>'leri tara.
        for li in soup.select("li"):
            txt = " ".join(li.get_text(" ").split())
            if not txt:
                continue
            low = txt.lower()
            if any(f in low for f in FILLER):
                continue
            mt = TIME_RE.search(txt)
            if not mt:
                continue
            hhmm = mt.group(1)
            rest = txt[mt.end():].strip(" -–—")
            if not rest:
                continue
            # kategori (sonda köşeli/parantez ya da bilinen kelime) — kaba
            category = None
            cm = re.search(r"\b(Spor|Dizi|Film|Belgesel|Haber|Çocuk|Müzik)\b$", rest)
            if cm:
                category = cm.group(1)
                rest = rest[: cm.start()].strip(" -–—")
            prog = Programme(
                channel_id=channel_id,
                start=parse_hhmm_on(today, hhmm),
                title=rest, category=category, source=self.prefix,
            )
            if category and category.lower() in self.SPORTS:
                s = simplify(rest)
                prog.title, prog.desc = s["title"], s["desc"]
            out.append(prog)
        # bitişler normalize.derive_stops ile sonradan doldurulacak
        return out

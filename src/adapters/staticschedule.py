"""
staticschedule — Sabit haftalık yayın akışı döngüsü.

Her hafta aynı programı tekrar eden kanallar için kullanılır.
Veri: WEEKDAY_SCHEDULE dict — gün numarası (0=Pzt) → [(saat, dakika, başlık), ...]

source_id = channel_id (channels.yaml'da kanalın tvg-id'si ile eşleşir)
"""
from __future__ import annotations
from datetime import datetime, timedelta
from typing import List, Dict, Tuple

from adapters.base import BaseAdapter
from models import Programme
from normalize import ist

# Gün numarası: 0=Pazartesi, 1=Salı, ..., 6=Pazar
SCHEDULES: Dict[str, List[Tuple]] = {

    "tr.kanalavrupatv": {
        0: [  # PAZARTESİ
            ( 6,  0, "Klip Saati"),
            ( 6, 45, "Yaşayan Tarih"),
            ( 7, 30, "Anahaber"),
            ( 8, 45, "Bakış Açısı"),
            (10,  0, "Ege Gündemİ"),
            (11, 45, "Estetik ve Sağlık"),
            (13,  0, "Anahaber"),
            (13, 45, "Türk Dünyası"),
            (15,  0, "Kadınca"),
            (16, 45, "Avrupa Klip Magazin"),
            (17, 30, "Anahaber"),
            (18, 15, "Bildung & Beruf"),
            (19, 45, "100 Yıllık Türküler"),
            (21,  0, "Anahaber"),
            (22, 15, "Spor Avrupa"),
            (23, 30, "Anahaber"),
            ( 0, 30, "Bakış Açısı"),
            ( 2, 15, "Bizsiz Olmaz 1"),
            ( 3, 45, "Namekan Türküler"),
            ( 5,  0, "Türkülerimiz"),
        ],
        1: [  # SALI
            ( 6,  0, "Klip Saati"),
            ( 6, 45, "Belgesel"),
            ( 7, 30, "Anahaber"),
            ( 8, 45, "Sivil İnsiyatif"),
            (10,  0, "Berlin Gündemi"),
            (11, 45, "Spor Avrupa"),
            (13,  0, "Anahaber"),
            (13, 45, "Türk Dünyası"),
            (15,  0, "100 Yıllık Türküler"),
            (16, 45, "Avrupa Klip Magazin"),
            (17, 30, "Anahaber"),
            (18, 15, "Sağlık Saati"),
            (19, 45, "Karadeniz Show"),
            (21,  0, "Anahaber"),
            (22, 15, "Ersoy Show"),
            (23, 30, "Anahaber"),
            ( 0, 30, "Sivil İnsiyatif"),
            ( 2, 15, "Bizsiz Olmaz 2"),
            ( 3, 45, "Asrın Türküleri"),
            ( 5,  0, "Türkülerimiz"),
        ],
        2: [  # ÇARŞAMBA
            ( 6,  0, "Klip Saati"),
            ( 7, 30, "Anahaber"),
            ( 8, 45, "Avrupa Baskısı"),
            (10,  0, "Sağlıklı Yaşamın Sırları"),
            (11, 45, "Karadeniz Show"),
            (13,  0, "Anahaber"),
            (13, 45, "Türk Dünyası"),
            (15,  0, "Ersoy Show"),
            (16, 45, "Avrupa Klip Magazin"),
            (17, 30, "Anahaber"),
            (18, 15, "Rota"),
            (19, 45, "Her Türkü Bir Hikaye"),
            (21,  0, "Anahaber"),
            (22, 15, "İş Dünyası"),
            (23, 30, "Anahaber"),
            ( 0, 30, "Avrupa Baskısı"),
            ( 2, 15, "Avrupalı Türkler"),
            ( 3, 45, "Yolcu Türküsü"),
            ( 5,  0, "Türkülerimiz"),
        ],
        3: [  # PERŞEMBE
            ( 6,  0, "Klip Saati"),
            ( 7, 30, "Anahaber"),
            ( 8, 45, "Avrupa Arenası"),
            (10,  0, "Rota"),
            (11, 45, "Suskun Türküler"),
            (13,  0, "Anahaber"),
            (13, 45, "Türk Dünyası"),
            (15,  0, "İş Dünyası"),
            (16, 45, "Avrupa Klip Magazin"),
            (17, 30, "Anahaber"),
            (18, 15, "Sağlıklı Yaşamın Sırları"),
            (19, 45, "Anadolu Diyarı"),
            (21,  0, "Anahaber"),
            (22, 15, "Rahmet Vakti"),
            (23, 30, "Anahaber"),
            ( 0, 30, "Avrupa Arenası"),
            ( 2, 15, "Bizsiz Olmaz 1"),
            ( 3, 45, "Ay Dost"),
            ( 5,  0, "Türkülerimiz"),
        ],
        4: [  # CUMA
            ( 6,  0, "Klip Saati"),
            ( 7, 30, "Anahaber"),
            ( 8, 45, "Ateş Çemberi"),
            (10,  0, "Sağlıklı Yaşamın Sırları"),
            (11, 45, "Anadolu Diyarı"),
            (13,  0, "Anahaber"),
            (13, 45, "Türk Dünyası"),
            (15,  0, "Rahmet Vakti"),
            (16, 45, "Avrupa Klip Magazin"),
            (17, 30, "Anahaber"),
            (18, 15, "Ege Gündemi"),
            (19, 45, "Anadolu Rock"),
            (21,  0, "Anahaber"),
            (22, 15, "Hukuk Masası"),
            (23, 30, "Anahaber"),
            ( 0, 30, "Ateş Çemberi"),
            ( 2, 15, "Bizsiz Olmaz 2"),
            ( 3, 45, "Şarkılardan Fal Tutum"),
            ( 5,  0, "Türkülerimiz"),
        ],
        5: [  # CUMARTESİ
            ( 6,  0, "Klip Saati"),
            ( 6, 30, "Bizsiz Olmaz 1"),
            ( 6, 45, "Bizsiz Olmaz 1"),
            ( 7, 30, "Anahaber"),
            ( 8, 30, "İş Dünyası"),
            ( 9, 45, "Avrupa Masası"),
            (10,  0, "Yaşayan Tarih"),
            (10, 15, "Emin Adımlar"),
            (11, 45, "Hukuk Masası"),
            (13,  0, "Sağlık Saati"),
            (13, 30, "Kadınca"),
            (14, 45, "Brüksel Gündemi"),
            (15, 15, "Sağlıklı Yaşamın Sırları"),
            (16, 30, "Türk Dünyası"),
            (16, 45, "Sivil İnsiyatif"),
            (17, 45, "Suskun Türküler"),
            (18, 15, "Berlin Gündemi"),
            (19, 45, "Bakış Açısı"),
            (21,  0, "Anahaber"),
            (22, 15, "Avrupa Baskısı"),
            (23, 30, "Anahaber"),
            ( 0, 30, "Asrın Türküleri"),
            ( 2, 15, "Avrupalı Türkler"),
            ( 2, 30, "Bizsiz Olmaz 1"),
            ( 3, 45, "Tümence"),
            ( 5,  0, "Türkülerimiz"),
        ],
        6: [  # PAZAR
            ( 6,  0, "Klip Saati"),
            ( 6, 30, "Bizsiz Olmaz 2"),
            ( 6, 45, "Bizsiz Olmaz 2"),
            ( 7, 30, "Anahaber"),
            ( 8, 45, "Avrupa Masası"),
            (10, 15, "Emin Adımlar"),
            (11, 45, "Estetik ve Sağlık"),
            (13, 30, "Kadınca"),
            (15, 15, "Sağlıklı Yaşamın Sırları"),
            (16, 30, "Türk Dünyası"),
            (17, 45, "Suskun Türküler"),
            (19, 45, "Avrupa Arenası"),
            (21,  0, "Anahaber"),
            (21, 45, "Ateş Çemberi"),
            (23,  0, "Ekmek Teknesi"),
            (23, 30, "Anahaber"),
            ( 0, 45, "Asrın Türküleri"),
            ( 2, 30, "Bizsiz Olmaz 1"),
            ( 3, 45, "Bir Demet Türkü"),
            ( 5,  0, "Türkülerimiz"),
        ],
    }
}


class StaticScheduleAdapter(BaseAdapter):
    prefix = "staticschedule"

    def fetch(self, source_id: str, channel_id: str) -> List[Programme]:
        schedule = SCHEDULES.get(source_id)
        if not schedule:
            return []
        return self._generate(schedule, channel_id)

    def _generate(self, schedule: dict, channel_id: str) -> List[Programme]:
        now = ist(datetime.now())
        out: List[Programme] = []

        # Bu haftanın Pazartesi'ni bul (gün başı)
        monday = (now - timedelta(days=now.weekday())).replace(
            hour=0, minute=0, second=0, microsecond=0)

        # 2 hafta üret (geçen hafta + bu hafta + gelecek hafta)
        for week_offset in range(-1, 3):
            week_start = monday + timedelta(weeks=week_offset)
            for weekday, programs in schedule.items():
                day_base = week_start + timedelta(days=weekday)
                for h, m, title in programs:
                    # 00-05 arası saatler ertesi güne aittir
                    if h < 6:
                        start_dt = ist(datetime(
                            day_base.year, day_base.month, day_base.day,
                            h, m)) + timedelta(days=1)
                    else:
                        start_dt = ist(datetime(
                            day_base.year, day_base.month, day_base.day,
                            h, m))
                    out.append(Programme(
                        channel_id=channel_id,
                        start=start_dt,
                        title=title,
                        source=self.prefix,
                    ))
        return out

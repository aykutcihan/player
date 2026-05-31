"""
staticschedule — Sabit haftalık/günlük yayın akışı döngüsü.

Her hafta/gün aynı programı tekrar eden kanallar için kullanılır.

Format iki türlü olabilir:
  - Haftalık (farklı günler): "tr.kanal": {"tz": TZ, "days": {0: [...], 1: [...], ...}}
  - Günlük (her gün aynı): "tr.kanal": {"tz": TZ, "daily": [...]}

Tuple: (saat, dakika, başlık) veya (saat, dakika, başlık, açıklama)

source_id = channel_id (channels.yaml'da kanalın tvg-id'si ile eşleşir)
"""
from __future__ import annotations
from datetime import datetime, timedelta
from typing import List, Dict, Tuple

from dateutil import tz

from adapters.base import BaseAdapter
from models import Programme
from normalize import ist

DE_TZ = tz.gettz("Europe/Berlin")    # Almanya saati (yaz/kış otomatik)
IST_TZ = tz.gettz("Europe/Istanbul")

# Gün numarası: 0=Pazartesi, 1=Salı, ..., 6=Pazar
SCHEDULES: Dict[str, Dict] = {

    # ── NEO HABER — her gün aynı, Türkiye saati ──────────────────
    "tr.neohabertv": {
        "tz": IST_TZ,
        "daily": [
            ( 8,  0, "Uyanma Servisi",        "Kutluhan Nesil ile"),
            (11,  0, "Ekonomi Ajansı",         "Hanzade Avcıoğlu ile"),
            (12,  0, "Gün Ortası",             "Senem Gökdağ ile"),
            (14,  0, "Aramızda Kalsın",        "Esra Kavrukkoca ile"),
            (15,  0, "Dokun Hayata",           "Elif Akar ile"),
            (17,  0, "Beyaz Masa",             "Ertuğrut Turan ile"),
            (18, 30, "Ana Haber",              "Alper Esin Baran ile"),
            (19, 30, "Neo Haber Akşam Kuşağı", "Neo Haber akşam yayını"),
            (23,  0, "Gece Kuşağı Yayını",    "Neo Haber gece yayını"),
        ],
    },

    # ── KANAL AVRUPA — haftalık, Almanya saati ───────────────────
    "tr.kanalavrupatv": {
        "tz": DE_TZ,
        "days": {
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
        },
    },
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
        sched_tz = schedule.get("tz", DE_TZ)

        now_local = now.astimezone(sched_tz)
        monday = (now_local - timedelta(days=now_local.weekday())).replace(
            hour=0, minute=0, second=0, microsecond=0)

        if "daily" in schedule:
            # Günlük döngü: her gün aynı, 4 hafta üret
            programs = schedule["daily"]
            for day_offset in range(-7, 22):
                day_base = monday + timedelta(days=day_offset)
                self._add_programs(programs, day_base, sched_tz, channel_id, out)
        else:
            # Haftalık döngü
            days = schedule.get("days", {})
            for week_offset in range(-1, 3):
                week_start = monday + timedelta(weeks=week_offset)
                for weekday, programs in days.items():
                    day_base = week_start + timedelta(days=weekday)
                    self._add_programs(programs, day_base, sched_tz, channel_id, out)

        return out

    def _add_programs(self, programs, day_base, sched_tz, channel_id, out):
        for entry in programs:
            h, m, title = entry[0], entry[1], entry[2]
            desc = entry[3] if len(entry) > 3 else None
            day = day_base + timedelta(days=1) if h < 6 else day_base
            start_dt = datetime(day.year, day.month, day.day, h, m,
                                tzinfo=sched_tz).astimezone(IST_TZ)
            out.append(Programme(
                channel_id=channel_id,
                start=start_dt,
                title=title,
                desc=desc,
                source=self.prefix,
            ))

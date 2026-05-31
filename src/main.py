"""
Ana orkestratör:
  config yükle -> her kanal için kaynakları öncelik sırasıyla çek
  -> merge -> bitiş türet -> TMDb film zenginleştir -> kaynaksızsa placeholder
  -> deterministik epg.xml yaz.

Çalıştır:  python src/main.py
"""
from __future__ import annotations
import sys
from pathlib import Path

import requests
import yaml

sys.path.insert(0, str(Path(__file__).resolve().parent))

from models import Channel
from adapters import build_registry, split_source
from merge import merge_sources
from normalize import derive_stops
from enrich_tmdb import TMDbEnricher
from placeholder import placeholder_programmes
from xmltv import write_xmltv

ROOT = Path(__file__).resolve().parent.parent


def load_yaml(p):
    return yaml.safe_load(Path(p).read_text("utf-8"))


def main():
    settings = load_yaml(ROOT / "config/settings.yaml")
    chans_cfg = load_yaml(ROOT / "config/channels.yaml")["channels"]

    session = requests.Session()
    registry = build_registry(session)
    tmdb = TMDbEnricher(settings.get("tmdb", {}))

    channels, all_progs = [], []

    for tvg_id, c in chans_cfg.items():
        ch = Channel(id=tvg_id, name=c.get("name", tvg_id),
                     sources=c.get("sources", []))
        channels.append(ch)

        per_source = []
        for src in ch.sources:
            prefix, sid = split_source(src)
            adapter = registry.get(prefix)
            if not adapter:
                print(f"[uyarı] bilinmeyen kaynak: {prefix}")
                continue
            try:
                progs = adapter.fetch(sid, tvg_id)
                progs = derive_stops(progs)  # tvyayinakisi/digiturk bitişini doldur
                if progs:
                    per_source.append(progs)
                    print(f"  {tvg_id} <- {src}: {len(progs)} program")
                else:
                    print(f"  [boş] {tvg_id} <- {src}: 0 program")
            except Exception as e:
                print(f"  [hata] {tvg_id} <- {src}: {e}")

        if per_source:
            merged = merge_sources(
                per_source,
                settings.get("min_gap_minutes", 2),
                settings.get("overlap_tolerance_minutes", 5))
            merged = derive_stops(merged)
        else:
            merged = placeholder_programmes(
                tvg_id, settings.get("window_days", 7))
            print(f"  {tvg_id}: kaynak yok -> placeholder")

        all_progs.extend(merged)

    # film zenginleştirme
    tmdb.enrich(all_progs)
    tmdb.save()

    xml = write_xmltv(
        channels, all_progs,
        tz_offset=settings.get("tz_offset", "+0300"),
        generator=settings.get("generator_name", "kisisel-epg"))

    out = ROOT / settings.get("output_path", "epg.xml")
    out.write_text(xml, "utf-8")
    print(f"\nYazıldı: {out}  ({len(channels)} kanal, {len(all_progs)} program)")


if __name__ == "__main__":
    main()

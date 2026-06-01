"""Adaptör kayıt defteri: 'tvplus:star-tv-hd--89' -> doğru adaptör."""
from adapters.tvplus import TVPlusAdapter
from adapters.tivibu import TivibuAdapter
from adapters.tvyayinakisi import TvYayinAkisiAdapter
from adapters.digiturkburada import DigiturkBuradaAdapter
from adapters.canlitv import CanliTvAdapter
from adapters.kanaltvtr import KanalTvTrAdapter
from adapters.staticschedule import StaticScheduleAdapter
from adapters.turksatkablo import TurksatKabloAdapter
from adapters.gurbet24 import Gurbet24Adapter
from adapters.dosttv import DostTvAdapter


def build_registry(session=None):
    insts = [
        TVPlusAdapter(session),
        TivibuAdapter(session),
        TvYayinAkisiAdapter(session),
        DigiturkBuradaAdapter(session),
        CanliTvAdapter(session),
        KanalTvTrAdapter(session),
        StaticScheduleAdapter(session),
        TurksatKabloAdapter(session),
        Gurbet24Adapter(session),
        DostTvAdapter(session),
    ]
    return {a.prefix: a for a in insts}


def split_source(source: str):
    """'tvplus:star-tv-hd--89' -> ('tvplus', 'star-tv-hd--89')."""
    prefix, _, sid = source.partition(":")
    return prefix, sid

"""Adaptör kayıt defteri: 'tvplus:star-tv-hd--89' -> doğru adaptör."""
from adapters.tvplus import TVPlusAdapter
from adapters.tivibu import TivibuAdapter
from adapters.tvyayinakisi import TvYayinAkisiAdapter
from adapters.digiturkburada import DigiturkBuradaAdapter


def build_registry(session=None):
    insts = [
        TVPlusAdapter(session),
        TivibuAdapter(session),
        TvYayinAkisiAdapter(session),
        DigiturkBuradaAdapter(session),
    ]
    return {a.prefix: a for a in insts}


def split_source(source: str):
    """'tvplus:star-tv-hd--89' -> ('tvplus', 'star-tv-hd--89')."""
    prefix, _, sid = source.partition(":")
    return prefix, sid

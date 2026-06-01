import sys, io, re
from collections import Counter

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

CATEGORIES = {
    'Ulusal': [
        'tr.startv','tr.showtv','tr.trt1','tr.trt2','tr.trt3','tr.kanald','tr.atv',
        'tr.teve2','tr.tv8','tr.tv85','tr.tv100','tr.kanal7','tr.tele1','tr.kanalb',
        'tr.kanalt','tr.kanalv','tr.now','tr.tivi6','tr.on6','tr.tv4','tr.tv1',
        'tr.ulusalkanal','tr.beyaztv','tr.halktv','tr.tytturk','tr.tv',
        'tr.flashhaber','tr.ekoturk','tr.sozcutv','tr.gzttv','tr.tvnet',
        'tr.kanal26','tr.kanal23','tr.kanal33','tr.bizimevtv','tr.fmtv',
        'tr.bikanal','tr.vavtv','tr.sportstv','tr.htspor','tr.showmax',
        'tr.dreamturk','tr.tv2020','tr.tv42','tr.tv5','tr.tv5monde',
        'tr.showturk',
    ],
    'Haber': [
        'tr.cnnturk','tr.ntv','tr.ahaber','tr.haberturk','tr.bloomberght',
        'tr.cnbce','tr.tgrthaber','tr.trthaber','tr.haberglobal','tr.benguturk',
        'tr.neohabertv','tr.anews','tr.bloomberg','tr.turkhaber','tr.turkmenelitv',
        'EuroStar.tr','tr.brt1','tr.brt2','tr.brt3','tr.liderhabertv',
        'tr.medyahabertv','tr.trtworld','tr.cgtn','tr.bbcnews','tr.360',
        'tr.olayturk','tr.birtv','tr.kanal26',
    ],
    'Spor': [
        'tr.beinsports1','tr.beinsports2','tr.beinsports3','tr.beinsports4','tr.beinsports5',
        'tr.beinsportshaber','tr.beinsportsmax1','tr.beinsportsmax2',
        'tr.ssport','tr.ssport2','tr.trtspor','tr.trtsporyildiz',
        'tr.aspor','tr.tabiispor','tr.tivibuspor','tr.tivibuspor1',
        'tr.tivibuspor2','tr.tivibuspor3','tr.tivibuspor4',
        'tr.fbtv','tr.gstv','tr.eurosport1','tr.eurosport2',
        'tr.nbatv','tr.cosmosports','tr.tracesportstars','tr.wsport',
        'tr.tvekstraufc','tr.ekolsports','SSport.tr','SSport2.tr',
        'tr.smartspor','tr.smartspor2',
    ],
    'Muzik': [
        'tr.powertv','tr.powerturk','tr.powerdance','tr.powerlove',
        'tr.powerturkslow','tr.powerturkakustik','tr.powerturkeniyiler',
        'tr.powerturktaptaze','tr.powerplus',
        'tr.kraltv','tr.kralpoptv','tr.tempotv','tr.chilltv',
        'tr.nr1rap','tr.number1tv','tr.number1turk',
        'tr.nr1ask','tr.nr1dance','tr.nr1damar',
        'tr.trtmuzik','tr.turkhalkmuzigi','tr.turkcepop','tr.turkceslow',
        'tr.medmuziktv','tr.slowkaradeniz',
        'tr.mezzo','tr.classicalharmony','tr.mcmtop','tr.traceurban',
        'tr.mtvhits','tr.mtvlive','tr.mtv00s','tr.radyoviva',
        'KralTV.tr','KralPopTV.tr','PowerTurkTV.tr','PowerDance.tr',
        'PowerLove.tr','PowerTurkSlow.tr','PowerTurkAkustik.tr',
        'PowerTurkEnIyiler.tr','PowerTurkTaptaze.tr','PowerPlus.tr',
        'Number1Turk.tr','Number1TV.tr','TempoTV.tr',
        'tr.finest','tr.toppop','tr.guclutv','tr.dostmuzik',
        'tr.gencsms','tr.armatv','tr.silatv','tr.damartv','tr.ezotv','tr.ezgitv',
    ],
    'Sinema': [
        'tr.sinematv','tr.sinematv2','tr.sinemayerli','tr.sinemayerli2',
        'tr.sinemaaksiyon','tr.sinemaaksiyon2','tr.sinemakomedi','tr.sinemakomedi2',
        'tr.sinemaaile','tr.sinemaaile2','tr.sinema1001','tr.sinema1002',
        'tr.sinematv1001','tr.sinematvaksiyon','SinemaAksiyon.tr',
        'tr.beinseries1','tr.beinseries2',
        'tr.beinhomeentertainment','tr.beinmoviesturk',
        'tr.beinmoviespremiere','tr.beinmoviesstars','tr.beinmoviesaction2',
        'tr.beiniz','tr.beingurme',
        'tr.fx','tr.epicdrama','tr.bbcfirst','tr.filmscreen','tr.docuscreen',
        'tr.tabiitv','tr.dizismartmax','tr.dizismartpremium',
        'tr.moviesmartclassic','tr.moviesmartturk',
        'Sinema1001.tr','Sinema2.tr','SinemaAile.tr',
        'SinemaKomedi.tr','SinemaYerli.tr','SinemaAile2.tr',
        'SinemaKomedi2.tr','SinemaYerli2.tr','DiziSmartMax.tr',
    ],
    'Cocuk': [
        'tr.trtcocuk','tr.minikacocuk','tr.minikago','tr.trtdiyanetcocuk',
        'tr.cartoonnetwork','tr.cartoonito','tr.disneyjunior','tr.nickelodeon',
        'tr.nickjr','tr.nicktoons','tr.babytv','tr.babyfirst',
        'tr.ducktv','tr.cbeebies','tr.azoomee','tr.spacetoon',
        'tr.lingotoonstv','tr.moonbugkidstv','tr.tinyteentv','tr.davinci',
        'tr.myzentv','tr.langlab','tr.englishclubtv',
        'TRTCocuk.tr','MinikaCocuk.tr','MinikaGo.tr','CartoonNetwork.tr',
        'DisneyJr.tr','Nickelodeon.tr','NickJr.tr','SpacetoonTurkey.tr',
        'CBeebies.tr','BabyTV.tr',
    ],
    'Belgesel': [
        'tr.discoverychannel','tr.nationalgeographic','tr.nationalgeographicwild',
        'tr.trtbelgesel','tr.tarihtv','tr.tlc','tr.dmax','tr.bbcearth',
        'tr.lovenature','tr.viasatexplore','tr.viasathistory',
        'tr.habitattv','tr.tarimtv','tr.yabanttv','tr.cctv4',
        'tr.nhkworld','tr.arirangtv','tr.kbsworld',
        'DiscoveryChannel.tr','NationalGeographic.tr','NationalGeographicWild.tr',
        'TarihTV.tr','DMAX.tr','TLC.tr','ViasatExplore.tr','ViasatHistory.tr',
    ],
    'Dini': [
        'tr.diyanettv','tr.trtdiyanet','tr.trtdiyanetcocuk',
        'tr.alquranalkareem','tr.alsunnah','tr.saudiquran',
        'tr.semerkand','tr.semerkandtv','tr.lalegultv',
        'tr.dosttv','tr.rtarabic','tr.kadirgatv','tr.akittv',
        'DiyanetTV.tr','LalegulTV.tr','SemerkandTV.tr',
    ],
    'Avrupa': [
        'tr.atvavrupa','tr.kanal7avrupa','tr.kanalavrupatv',
        'tr.trtavaz','tr.trtturk','tr.trtkurdi','tr.trtarabi',
        'tr.dw','tr.france24','tr.france24arabic','tr.france24english',
        'tr.mceutv','tr.gurbet24tv','tr.slowkaradeniz',
        'Kanal7Avrupa.tr','KanalAvrupa.tr','EuroStar.tr',
    ],
}

CAT_ORDER = ['Ulusal','Haber','Spor','Muzik','Sinema','Cocuk','Belgesel','Dini','Avrupa','Yerel']

content = open('playlist.m3u', encoding='utf-8').read()
lines = content.splitlines()
header = lines[0]

channels = []
i = 1
while i < len(lines):
    if lines[i].startswith('#EXTINF:'):
        extinf = lines[i]
        url = lines[i+1] if i+1 < len(lines) else ''
        tvg_id_m = re.search(r'tvg-id="([^"]+)"', extinf)
        tvg_id = tvg_id_m.group(1) if tvg_id_m else ''
        name_m = re.search(r',([^,]+)$', extinf)
        name = name_m.group(1).strip() if name_m else ''
        channels.append({'extinf': extinf, 'url': url, 'tvg_id': tvg_id, 'name': name, 'cat': None})
        i += 2
    else:
        i += 1

def assign_cat(ch):
    tvg_id = ch['tvg_id']
    name = ch['name'].lower()
    for cat, ids in CATEGORIES.items():
        if tvg_id in ids:
            return cat
    if any(x in name for x in ['haber','news','bloomberg','cnbc','brt ']):
        return 'Haber'
    if any(x in name for x in [' spor','sports','bein sport','tivibu spor','eurosport','nba tv']):
        return 'Spor'
    if any(x in name for x in ['muzik','müzik','power tv','power turk','kral tv','kral pop','nr1','number1','tempo tv','chill','slow','rap','damar','arabesk']):
        return 'Muzik'
    if any(x in name for x in ['sinema','film','movie','dizi','series','bein series','bein movie','bein iz']):
        return 'Sinema'
    if any(x in name for x in ['cocuk','çocuk','kids','baby','minika','nickelodeon','cartoon','disney junior','spacetoon']):
        return 'Cocuk'
    if any(x in name for x in ['belgesel','documentary','national geo','discovery','tarih tv','yaban tv']):
        return 'Belgesel'
    if any(x in name for x in ['diyanet','dini','quran','kuran','lalegul','semerkand','akit tv']):
        return 'Dini'
    if any(x in name for x in ['avrupa','trt turk','trt avaz','kanal avrupa','gurbet','mceu']):
        return 'Avrupa'
    return 'Yerel'

for ch in channels:
    ch['cat'] = assign_cat(ch)

# group-title ekleyerek yeniden yaz
def add_group(extinf, cat):
    if 'group-title=' in extinf:
        extinf = re.sub(r'\s*group-title="[^"]*"', '', extinf)
    # Virgulden once ekle
    extinf = re.sub(r'(#EXTINF:[^,]*)(,)', rf'\1 group-title="{cat}"\2', extinf, count=1)
    return extinf

out_lines = [header, '']
for cat in CAT_ORDER:
    cat_channels = [ch for ch in channels if ch['cat'] == cat]
    if not cat_channels:
        continue
    out_lines.append(f'# ── {cat.upper()} ({len(cat_channels)} kanal) ────────────────────────────')
    for ch in cat_channels:
        out_lines.append(add_group(ch['extinf'], cat))
        out_lines.append(ch['url'])
    out_lines.append('')

with open('playlist.m3u', 'w', encoding='utf-8') as f:
    f.write('\n'.join(out_lines))

cats = Counter(ch['cat'] for ch in channels)
for cat in CAT_ORDER:
    print(f'  {cat}: {cats.get(cat,0)}')
print(f'  Toplam: {len(channels)}')
print('Tamamlandi!')

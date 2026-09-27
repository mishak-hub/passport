import urllib.request,json,tarfile,io,hashlib,sys
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor
base=Path(__file__).parent/'dictionaries';base.mkdir(exist_ok=True)
db=json.load(urllib.request.urlopen('https://freedict.org/freedict-database.json',timeout=45))
def get(name):
    entry=next(x for x in db if x.get('name')==name)
    release=next(x for x in entry['releases'] if x['platform']=='src')
    dest=base/name;dest.mkdir(exist_ok=True)
    data=urllib.request.urlopen(release['URL'],timeout=90).read()
    assert hashlib.sha512(data).hexdigest()==release['checksum']
    (dest/'metadata.json').write_text(json.dumps(entry,indent=2),encoding='utf8')
    with tarfile.open(fileobj=io.BytesIO(data),mode='r:xz') as archive:
        for item in archive.getmembers():
            if item.isfile() and (item.name.endswith('.tei') or Path(item.name).name in ['COPYING','LICENSE','README']):
                (dest/Path(item.name).name).write_bytes(archive.extractfile(item).read())
    print(name,[(p.name,p.stat().st_size) for p in dest.iterdir()],flush=True)
with ThreadPoolExecutor(max_workers=4) as pool:list(pool.map(get,sys.argv[1:] or ['eng-fra','eng-spa','eng-jpn','eng-zho','fra-eng']))
if not sys.argv[1:]:
    for url,name in [('https://www.edrdg.org/pub/Nihongo/JMdict_e.gz','JMdict_e.gz'),('https://www.mdbg.net/chinese/export/cedict/cedict_1_0_ts_utf-8_mdbg.txt.gz','cedict.gz')]:
        (base/name).write_bytes(urllib.request.urlopen(url,timeout=90).read())

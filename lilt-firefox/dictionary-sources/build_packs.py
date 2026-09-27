"""Rebuild offline packs from the versioned sources downloaded by get_packs.py.
Keep the upstream sources and licenses with the source distribution.
"""
from pathlib import Path
import xml.etree.ElementTree as ET,json,re,gzip,shutil,sys
base=Path(sys.argv[1]) if len(sys.argv)>1 else Path(__file__).parent/'dictionaries'
out=Path(sys.argv[2]) if len(sys.argv)>2 else Path(__file__).parent.parent/'outputs/lilt-firefox/data'
out.mkdir(exist_ok=True)
ns={'t':'http://www.tei-c.org/ns/1.0'}
def txt(el):return '' if el is None else ''.join(el.itertext()).strip()
def romanize(kana):
    kana=''.join(chr(ord(c)-96) if 'ァ'<=c<='ヶ' else c for c in kana)
    hira='あいうえおかきくけこさしすせそたちつてとなにぬねのはひふへほまみむめもやゆよらりるれろわをんがぎぐげござじずぜぞだぢづでどばびぶべぼぱぴぷぺぽゔぁぃぅぇぉゃゅょ'
    roma='a i u e o ka ki ku ke ko sa shi su se so ta chi tsu te to na ni nu ne no ha hi fu he ho ma mi mu me mo ya yu yo ra ri ru re ro wa wo n ga gi gu ge go za ji zu ze zo da ji zu de do ba bi bu be bo pa pi pu pe po vu a i u e o ya yu yo'.split()
    table=dict(zip(hira,roma));result='';i=0
    while i<len(kana):
        c=kana[i];r=table.get(c,c)
        if c=='っ':result+=table.get(kana[i+1:i+2],'')[:1];i+=1;continue
        if c=='ー':result+=result[-1:] if result[-1:] in 'aiueo' else '';i+=1;continue
        if i+1<len(kana) and kana[i+1] in 'ゃゅょ' and r.endswith('i'):
            r=r[:-1]+('' if r in ['shi','chi','ji'] else 'y')+{'ゃ':'a','ゅ':'u','ょ':'o'}[kana[i+1]];i+=1
        result+=r;i+=1
    return result
ja_read={};ja_extra=[]
root=ET.fromstring(gzip.decompress((base/'JMdict_e.gz').read_bytes()))
for e in root.findall('entry'):
    forms=[x.text for x in e.findall('k_ele/keb')];readings=e.findall('r_ele');glosses=[g.text for g in e.findall('sense/gloss') if g.text]
    if not glosses:continue
    for r in readings:
        reading=r.findtext('reb') or '';roma=romanize(reading);restr=[x.text for x in r.findall('re_restr')]
        valid=restr or forms or [reading]
        for form in valid:
            ja_read.setdefault(form,roma)
            common=r.find('re_pri') is not None or e.find('k_ele/ke_pri') is not None
            if common and len(form)<=12:
                gloss=next((g for g in glosses if len(g)<45),glosses[0]);ja_extra.append([gloss,form,roma,'; '.join(glosses[:3])[:220],'',2])
zh_read={};zh_simplify={};zh_extra=[]
for line in gzip.decompress((base/'cedict.gz').read_bytes()).decode('utf8').splitlines():
    m=re.match(r'^(\S+) (\S+) \[(.*?)\] /(.*)/$',line)
    if not m:continue
    trad,simp,pinyin,defs=m.groups();zh_simplify[trad]=simp;zh_read.setdefault(simp,pinyin);zh_read.setdefault(trad,pinyin)
    glosses=[g for g in defs.split('/') if len(g)<=45 and not re.search(r'[\[\]|]|^(CL:|variant of|surname|see )',g)]
    if glosses and len(simp)<=6:zh_extra.append([glosses[0],simp,pinyin,'; '.join(glosses[:3])[:220],'',0])
summary={}
for lang,name in [('fr','eng-fra'),('es','eng-spa'),('ja','eng-jpn'),('zh','eng-zho')]:
    tree=ET.parse(base/name/(name+'.tei'));rows=[];readings={}
    rev={'fr':'fra-eng','es':'spa-eng'}.get(lang)
    if rev and (base/rev/(rev+'.tei')).exists():
        for e in ET.parse(base/rev/(rev+'.tei')).findall('.//t:entry',ns):
            word=txt(e.find('t:form/t:orth',ns));pron=txt(e.find('t:form/t:pron',ns));readings[word]=pron
    for e in tree.findall('.//t:entry',ns):
        en=txt(e.find('t:form/t:orth',ns));en_read=txt(e.find('t:form/t:pron',ns))
        if not en or len(en)>60 or en[0].isupper():continue
        for sense in e.findall('t:sense',ns):
            definition=txt(sense.find('.//t:def',ns))[:220]
            for quote in sense.findall('t:cit/t:quote',ns):
                word=txt(quote)
                if not word or len(word)>80:continue
                if lang=='zh':word=zh_simplify.get(word,word)
                read=ja_read.get(word,'') if lang=='ja' else zh_read.get(word,'') if lang=='zh' else readings.get(word,'')
                rows.append([en,word,read,definition,en_read,0])
    if lang=='ja':rows=ja_extra+rows
    if lang=='zh':rows=zh_extra+rows
    seen=set();rows=[r for r in rows if not ((key:=tuple(r[:4])) in seen or seen.add(key))]
    files=[]
    for i,start in enumerate(range(0,len(rows),20000)):
        namepart=f'{lang}-{i}.json';(out/namepart).write_text(json.dumps(rows[start:start+20000],ensure_ascii=False,separators=(',',':')),encoding='utf8');files.append(namepart)
    old=out/(lang+'.json')
    if old.exists():old.unlink()
    summary[lang]={'entries':len(rows),'readings':sum(bool(r[2]) for r in rows),'bytes':sum((out/f).stat().st_size for f in files),'files':files}
    shutil.copyfile(base/name/'COPYING',out/(name+'-LICENSE.txt'))
    (out/(name+'-header.xml')).write_text(ET.tostring(tree.getroot().find('t:teiHeader',ns),encoding='unicode'),encoding='utf8')
(out/'catalog.json').write_text(json.dumps(summary,indent=2),encoding='utf8')
print(json.dumps(summary,indent=2))

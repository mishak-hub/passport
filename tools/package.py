"""Package the runtime only; no credentials, tests or original data snapshots."""
from pathlib import Path
import hashlib
import json
import re
import zipfile

root = Path(__file__).resolve().parent.parent
extension = root / 'lilt-firefox'
manifest = json.loads((extension / 'manifest.json').read_text(encoding='utf-8'))
for script in manifest['background']['scripts'] + manifest['content_scripts'][0]['js']:
    if not (extension / script).is_file():
        raise RuntimeError('Missing manifest script: ' + script)
for path in extension.rglob('*'):
    if path.is_file() and path.suffix in {'.js', '.json', '.html', '.css', '.md', '.py'}:
        text = path.read_text(encoding='utf-8')
        if re.search(r'AQ\.[A-Za-z0-9_-]{25,}|AIza[A-Za-z0-9_-]{25,}|apikey_[A-Za-z0-9_-]{25,}', text):
            raise RuntimeError('Potential credential found; packaging stopped')
dist = root / 'dist'
dist.mkdir(exist_ok=True)
target = dist / f"passport-firefox-{manifest['version']}.xpi"
with zipfile.ZipFile(target, 'w', zipfile.ZIP_DEFLATED) as archive:
    for path in sorted(extension.rglob('*')):
        if not path.is_file():
            continue
        rel = path.relative_to(extension)
        if rel.parts[0] in {'tests', 'dictionary-sources'}:
            continue
        if path.suffix in {'.js', '.json', '.html', '.css', '.svg', '.txt', '.xml'}:
            archive.write(path, rel.as_posix())
with zipfile.ZipFile(target) as archive:
    if archive.testzip() is not None:
        raise RuntimeError('Archive integrity check failed')
checksum = hashlib.sha256(target.read_bytes()).hexdigest()
(dist / 'SHA256SUMS.txt').write_text(f'{checksum}  {target.name}\n', encoding='utf-8')
print(target)
print(checksum)

"""Snapshot only the pure geometry helpers; the reference project stays untouched."""
from pathlib import Path
import hashlib,json
source=Path('E:/fabotanic')
dest=Path(__file__).resolve().parents[1]/'src/pasture/vendor/fabotanic'
dest.mkdir(parents=True,exist_ok=True)
records=[]
for name in ['math','geometry']:
    file=source/f'src/modules/{name}.js'
    raw=file.read_text(encoding='utf-8')
    body=raw.split('(()=>{',1)[1].rsplit('})();',1)[0]
    if name=='geometry':body=body.replace('const {V,clamp,lerp,bezier,tangent}=__bfModules["math"];',"import {V,clamp,lerp,bezier,tangent} from './math.js';")
    index=body.rfind('return {');body=body[:index]+body[index:].replace('return {','export {',1)
    body=body.replace('legal/third-party/MULBERRY32-NOTICE.txt','MULBERRY32-NOTICE.txt')
    (dest/f'{name}.js').write_text('// Adapted module wrapper from E:/fabotanic/src/modules/'+name+'.js; pure geometry logic retained.\n'+body,encoding='utf-8')
    records.append({'source':str(file),'sha256':hashlib.sha256(file.read_bytes()).hexdigest(),'adaptation':'Only module wrapper/import/export changed.'})
notice=source/'legal/third-party/MULBERRY32-NOTICE.txt'
if notice.exists():(dest/notice.name).write_bytes(notice.read_bytes())
(dest/'provenance.json').write_text(json.dumps(records,indent=2),encoding='utf-8')
print('Imported deterministic math and curved leaf / tapered tube helpers.')

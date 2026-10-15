"""Read original assets without changing them; produce video sampling evidence."""
from pathlib import Path
import json, struct, subprocess
from PIL import Image, ImageDraw

ROOT=Path(__file__).resolve().parents[1]
DEST=ROOT/'artifacts'/'audit'
DEST.mkdir(parents=True,exist_ok=True)
models=[]
for p in sorted((ROOT/'design/pasture').glob('*.glb')):
    with p.open('rb') as f:
        f.read(12);n,t=struct.unpack('<II',f.read(8));d=json.loads(f.read(n))
    count=sum(d['accessors'][pr['indices']]['count']//3 for m in d.get('meshes',[]) for pr in m['primitives'])
    models.append({'source':p.relative_to(ROOT).as_posix(),'bytes':p.stat().st_size,'triangles':count,
                   'skins':len(d.get('skins',[])),'animations':[a.get('name','') for a in d.get('animations',[])],
                   'node_transforms':[{k:v for k,v in n.items() if k in ['name','rotation','translation','scale','matrix']} for n in d.get('nodes',[])]})
videos=[]
for i,p in enumerate(sorted((ROOT/'design/pasture').rglob('*.mp4'))):
    probe=json.loads(subprocess.check_output(['ffprobe','-v','error','-show_format','-show_streams','-of','json',str(p)]))
    s=next(s for s in probe['streams'] if s['codec_type']=='video');duration=float(probe['format']['duration'])
    v={'id':f'V{i+1:02}','clip_key':p.stem,'source':p.relative_to(ROOT).as_posix(),'duration_s':duration,'width':s['width'],'height':s['height'],'frames':[]}
    sheet=Image.new('RGB',(1200,310),'#eeeae0');draw=ImageDraw.Draw(sheet)
    draw.text((12,8),f"{v['id']} / {p.name} / {duration:.2f}s",fill='#333333')
    for j,t in enumerate([.15,duration*.33,duration*.66,max(.15,duration-.2)]):
        out=DEST/f"{v['id']}-{j}.jpg"
        subprocess.run(['ffmpeg','-loglevel','error','-y','-ss',str(t),'-i',str(p),'-frames:v','1','-vf','scale=480:-1',str(out)],check=True)
        with Image.open(out) as im:
            im.thumbnail((292,250));sheet.paste(im,(j*300+(300-im.width)//2,38))
        draw.text((j*300+12,285),f'{t:.2f}s',fill='#333333');v['frames'].append(out.relative_to(ROOT).as_posix())
    sheet.save(DEST/f"{v['id']}-contact.jpg");videos.append(v)
(DEST/'source-audit.json').write_text(json.dumps({'models':models,'videos':videos},ensure_ascii=False,indent=2),encoding='utf-8')
print(f'Audited {len(models)} models and {len(videos)} videos')

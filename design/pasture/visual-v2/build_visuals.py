"""Build the riverside design reader and editable world-layout draft."""
from pathlib import Path
from copy import deepcopy
import html
import json
import math
from PIL import Image

ROOT = Path(__file__).resolve().parent
OLD = ROOT.parent / 'visual-v1'

def save_json(name, value):
    (ROOT / name).write_text(json.dumps(value, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')

layout = deepcopy(json.loads((OLD / 'layout.json').read_text(encoding='utf-8')))
near = [[-14,-4.0],[-10,-4.6],[-6,-5.1],[-2,-4.6],[2,-3.8],[6,-3.0],[10,-2.8],[14,-3.1]]
far = [[x,z-4.2] for x,z in near]
layout.update(title='沿水岸牧马 · 缓弯河道布局', version='riverside-v2',
              footprint_m={'x':[-12,12], 'z':[-12,6]})
layout['terrain'] = {'range_y_m':[.25,.8], 'bank_top_y_m':[.25,.5],
                     'note':'Design starting elevations; blend banks and calibrate each hoof contact.'}
layout['river'] = {'id':'W01', 'interpretation':'user_approved_design_inference_not_historical_measurement',
                   'near_bank_xz_m':near, 'far_bank_xz_m':far,
                   'curve':'Catmull-Rom, endpoint duplication, 16 samples per segment',
                   'width_along_z_m':4.2, 'surface_y_m':0,
                   'extension':'continue beyond both sides of the camera frustum',
                   'flow_direction':'unspecified; adjustable visual parameter',
                   'appearance':'muted gray-green; fine horizontal ripples and fragmented reflection'}
layout['banks'] = {'id':'G02', 'body_boundary_navigation_margin_m':.8,
                   'contact_validation':'Check all hooves, grazing muzzle and full animated body envelope against shore; do not use torso point alone.',
                   'left_rocks':'overlap near-bank silhouette and conceal the left channel entry',
                   'far_bank':'low sparse vegetation; no dense forest wall'}
layout['behavior']['shore_rule'] = 'All horses and herder remain on near-bank dry land; no drinking or wading added.'
layout['acceptance'] = 'Match original projected figures and occlusion; verify two legible banks, continuous open channel, dry hooves and root collar across permitted cameras.'
save_json('layout.json', layout)

def pos(x,z): return 80+(x+12)*40,160+(z+12)*40
def text(x,y,s,size=18,color='#3e453d',anchor='start',weight=400):
    return f'<text x="{x}" y="{y}" font-size="{size}" fill="{color}" text-anchor="{anchor}" font-weight="{weight}">{html.escape(s)}</text>'
def samples(points):
    out=[]
    for i in range(len(points)-1):
        a,b,c,d=points[max(0,i-1)],points[i],points[i+1],points[min(len(points)-1,i+2)]
        for step in range(16):
            t=step/16
            out.append([.5*((2*b[k])+(-a[k]+c[k])*t+(2*a[k]-5*b[k]+4*c[k]-d[k])*t*t+(-a[k]+3*b[k]-3*c[k]+d[k])*t*t*t) for k in (0,1)])
    return out+[points[-1]]
def path(points): return ' '.join(f'{"M" if i==0 else "L"}{pos(x,z)[0]:.2f},{pos(x,z)[1]:.2f}' for i,(x,z) in enumerate(points))
ns,fs=samples(near),samples(far)
parts=['''<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="1140" viewBox="0 0 1600 1140" role="img" aria-labelledby="title desc">
<title id="title">沿水岸牧马场景俯视布局</title><desc id="desc">八马与牧者位于近岸，缓弯河道穿过后方，左右延伸出画幅。米制坐标是灰盒制作起点。</desc>
<defs><clipPath id="plot"><rect x="80" y="160" width="960" height="720"/></clipPath><marker id="arrow" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto"><path d="M0,0 L7,3.5 L0,7" fill="#796b50"/></marker></defs>
<rect width="1600" height="1140" fill="#f6f2e8"/><g font-family="Microsoft YaHei,Arial,sans-serif">''',
text(64,61,'沿水岸牧马',34,weight=600),text(64,98,'V2 / 俯视布局 · 24 × 18 m · 尺寸及纵深为待校准的设计值',18,'#777967'),
'<rect x="80" y="160" width="960" height="720" fill="#e5dfc7"/>',
'<g clip-path="url(#plot)">',
f'<path d="{path(fs)} L1120,160 L0,160 Z" fill="#d4d6bb"/>',
f'<path d="{path(ns)} {path(list(reversed(fs))).replace("M","L",1)} Z" fill="#9ab8b6"/>']
for x in range(-12,13,2):
    px,_=pos(x,0);parts.append(f'<line x1="{px}" y1="160" x2="{px}" y2="880" stroke="#737c69" opacity=".14"/>')
for z in range(-12,7,2):
    _,pz=pos(0,z);parts.append(f'<line x1="80" y1="{pz}" x2="1040" y2="{pz}" stroke="#737c69" opacity=".14"/>')
parts += [f'<path d="{path(ns)}" fill="none" stroke="#716f51" stroke-width="5"/>',
          f'<path d="{path(fs)}" fill="none" stroke="#8b9270" stroke-width="4"/>',
          f'<path d="{path([[x,z+.8] for x,z in ns])}" fill="none" stroke="#ad8560" stroke-width="2" stroke-dasharray="6 6"/>']
for x,z in [(-8,-7),(0,-6.2),(6,-5.4),(10,-5.2)]:
    px,py=pos(x,z);parts.append(f'<path d="M{px-30},{py} q30,-4 60,0 m-40,10 h45" fill="none" stroke="#d6e6df" stroke-width="2"/>')
parts += [text(480,244,'对岸 · 低坡与稀疏植被',19,'#657154','middle'),
          text(430,392,'W01 缓弯河道',23,'#315958','middle',600),
          text(430,420,'向画幅两侧继续延伸',16,'#426c67','middle'),
          text(862,565,'G02 近岸',17,'#535e46'),
          '<path d="M78,462 L143,453 L182,483 L169,533 L205,571 L161,650 L83,667 Z" fill="#b09b7d" stroke="#857156" stroke-width="2"/>',
          text(109,529,'左岩',17,'#544d3d'),
          '<path d="M120,847 l60,-25 41,27 0,31 -100,0 Z M452,855 l45,-30 76,29 7,26 -128,0 Z M799,855 l60,-27 71,32 8,20 -139,0 Z" fill="#baa788" stroke="#8f7e61"/>']
tx,tz=pos(3.4,.8)
parts += [f'<circle cx="{tx}" cy="{tz}" r="220" fill="#7e946b" fill-opacity=".08" stroke="#8c9e78" stroke-dasharray="9 8"/>',
          f'<circle cx="{tx}" cy="{tz}" r="52" fill="#ac926d" fill-opacity=".2" stroke="#906f4b" stroke-dasharray="4 4"/>',
          f'<circle cx="{tx}" cy="{tz}" r="20" fill="#80654b"/>',text(tx,tz+6,'T01',14,'#fff9e8','middle'),
          text(tx+65,tz+7,'柳根避让区',15,'#735f43')]
sx,sz=pos(-10.3,-1)
parts += [f'<circle cx="{sx}" cy="{sz}" r="33" fill="#a4aa80" stroke="#6c795a"/>',text(sx,sz+5,'T02',15,anchor='middle')]
for a in layout['anchors']:
    i,x,z,angle=a['id'],a['x_m'],a['z_m'],a['heading_deg']
    px,py=pos(x,z)
    if i=='P01':
        parts += [f'<circle cx="{px}" cy="{py}" r="13" fill="#617f88"/>',text(px,py+39,i,16,anchor='middle')]
        continue
    fill={'H01':'#eee9d7','H02':'#51483d','H03':'#805742','H04':'#b2925f','H05':'#eee9d7','H06':'#d9d8ca','H07':'#c1a676','H08':'#98704d'}[i]
    parts.append(f'<g transform="translate({px},{py}) rotate({angle})"><ellipse rx="43" ry="15" fill="{fill}" stroke="#6b6252"/><path d="M28,-8 L57,-6 L61,4 L32,9 Z" fill="{fill}" stroke="#6b6252"/><path d="M-40,0 l-16,4" stroke="#6b6252" stroke-width="3"/></g>')
    dx,dy={'H03':(-53,-20),'H05':(0,38),'H07':(42,0)}.get(i,(0,-30))
    parts.append(text(px+dx,py+dy,i,16,anchor='middle',weight=600))
    if i in ['H04','H06']:
        parts.append(f'<ellipse cx="{px}" cy="{py}" rx="83" ry="45" fill="none" stroke="#a28a5c" stroke-dasharray="4 5"/>')
parts += [text(560,818,'近岸草地 · 八马与牧者保持干地活动',20,'#6b7156','middle'),'</g>',
          '<rect x="80" y="160" width="960" height="720" fill="none" stroke="#999d85"/>']
for x in range(-12,13,2):parts.append(text(pos(x,0)[0],146,str(x),14,'#777967','middle'))
for z in range(-12,7,2):parts.append(text(66,pos(0,z)[1]+5,str(z),14,'#777967','end'))
parts += [text(1040,124,'X / m',14,anchor='end'),text(30,520,'Z',18),
          '<path d="M220,980 L954,980" stroke="#8e8166" stroke-width="2" marker-end="url(#arrow)"/>',
          text(565,947,'前方观画轨道 / +Z 朝向观察者',17,'#736b58','middle')]
for c in layout['camera']['presets']:
    px,py=pos(c['position_m'][0],c['position_m'][2]);parts += [f'<circle cx="{px}" cy="{py}" r="10" fill="#77765e"/>',text(px,py+33,c['id']+' '+c['name'],16,anchor='middle')]
legend=[('01  水形','两条岸线共同界定开放河道。','左岩遮住入口，右端延出画幅。'),
        ('02  水岸层次','草地 → 土岸暗线 → 灰绿水面。','细水纹与碎反射强调水平延伸。'),
        ('03  角色约束','保留八马、一牧者及原有分组。','活动边界距岸线初值约 0.8 m。'),
        ('04  接触与避让','岸距从完整身体边界计算。','蹄底、口鼻、柳根逐项验证。'),
        ('05  制作次序','先校准地形、河带与主镜头。','再接入单件、绑定和微动作。')]
for n,(title,l1,l2) in enumerate(legend):
    y=191+n*139
    parts += [text(1110,y,title,22,weight=600),text(1110,y+37,l1,17,'#6d715f'),text(1110,y+66,l2,17,'#6d715f')]
parts += [text(1110,930,'图例',20,weight=600),text(1110,966,'虚线大圆：树冠参考范围',17),text(1110,996,'虚线小圈：慢走 / 柳根避让',17),
          text(80,1090,'河宽沿 Z 暂取 4.2 m；水位 Y=0。图中轮廓为占位，最终以相机投影与完整动画包络校准。',17,'#777967'),'</g></svg>']
(ROOT/'layout.svg').write_text('\n'.join(parts),encoding='utf-8')

old_assets=json.loads((OLD/'assets.json').read_text(encoding='utf-8'))['selected_assets']
reused=[dict(a,file='../visual-v1/'+a['file'],reused_from='visual-v1') for a in old_assets if a['id']!='C00']
hero=ROOT/'images/00-riverside-atmosphere.png'
with Image.open(hero) as im:
    current={'id':'C00','name':'沿水岸牧马气氛图','file':'images/00-riverside-atmosphere.png',
             'pixels':list(im.size),'mode':im.mode,'bytes':hero.stat().st_size,
             'status':'visual_reference_only','method':'built-in image_gen; reference-guided edit',
             'note':'用户确认的河道解释；非历史测绘或实时渲染截图。'}
a_pose={'id':'P01-A','name':'牧马人正面 A-pose','file':'images/P01-herder-a-pose.png',
        'status':'visual_reference_only','method':'正面 A-pose → 静态建模 → 拓扑整理与绑定',
        'note':'保留原服装与人物特征；双臂向外下方展开，双手离开衣袍，双脚分开。原站姿参考继续保留。'}
with Image.open(ROOT/a_pose['file']) as im:
    a_pose.update(pixels=list(im.size),mode=im.mode,bytes=(ROOT/a_pose['file']).stat().st_size)
bare_tree={'id':'T02-BARE','name':'T02 无花叶枝干','file':'images/T02-bare-tree.png',
           'status':'visual_reference_only','method':'独立枝干建模 → 整理分叉与根部 → 分开补叶',
           'note':'移除全部花叶，保留原 T02 的扭曲主干、右倾分枝和根部。原叶丛遮挡的细枝为设计补全。'}
with Image.open(ROOT/bare_tree['file']) as im:
    bare_tree.update(pixels=list(im.size),mode=im.mode,bytes=(ROOT/bare_tree['file']).stat().st_size)
save_json('assets.json',{'date':'2026-10-13','generator':'built-in image_gen',
                        'status':'visual_reference_catalogue_runtime_tracked_in_parent_asset_registry','selected_assets':[current]+reused+[a_pose,bare_tree],
                        'procedural_planned_assets':['W01 river ribbon','G02 near and far banks'],
                        'source_prompts':['prompts.json','../visual-v1/prompts.json','P01-a-pose-prompt.json','T02-bare-tree-prompt.json']})
cards=''.join(f'''<article class="asset"><a href="{a['file']}"><img loading="lazy" src="{a['file']}" alt="{html.escape(a['name'])}"></a><div><span class="id">{a['id']}</span><h3>{html.escape(a['name'])}</h3><p>{html.escape(a['note'])}</p><small>{html.escape(a['method'])}</small></div></article>''' for a in reused)
page='''<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>沿水岸牧马 · 视觉设计 V2</title>
<style>
:root{color-scheme:light;--ink:#303e39;--muted:#697269;--line:#d9d9c9;--paper:#f4f1e7;--green:#325e57}*{box-sizing:border-box}body{margin:0;background:var(--paper);color:var(--ink);font:16px/1.8 "Microsoft YaHei",system-ui,sans-serif}a{color:var(--green);text-underline-offset:4px}header,main,footer{max-width:1440px;margin:auto;padding:26px 40px}nav{display:flex;gap:22px;flex-wrap:wrap;font-size:14px}.kicker{letter-spacing:3px;font-size:12px;color:var(--muted);margin-top:40px}h1{font:500 clamp(32px,4vw,58px)/1.25 "Songti SC","SimSun",serif;margin:16px 0}h2{font:500 30px/1.4 "Songti SC","SimSun",serif;margin:0 0 16px}h3{margin:4px 0;font-size:18px}p{margin:8px 0 14px}.intro{max-width:830px;color:var(--muted)}.hero{margin:10px 0 0}img{max-width:100%;display:block}.hero img{width:100%;aspect-ratio:3/1;object-fit:contain;background:#deded0}.toolbar{display:flex;align-items:center;gap:10px;flex-wrap:wrap;padding:15px 0}button{font:inherit;padding:8px 18px;border:1px solid var(--line);border-radius:24px;background:transparent;color:var(--ink);cursor:pointer}button[aria-pressed=true]{background:var(--green);border-color:var(--green);color:white}figcaption,.note,small{font-size:13px;color:var(--muted)}section{margin:68px 0}.points{display:grid;grid-template-columns:repeat(3,1fr);gap:28px;margin-top:30px}.point{border-top:1px solid var(--line);padding-top:18px}.point b{color:var(--green)}.layout{background:#f6f2e8;border:1px solid var(--line);margin:24px 0 12px}.layout img{width:100%}.links{display:flex;flex-wrap:wrap;gap:20px}.grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:24px}.asset{border:1px solid var(--line);background:#faf8f0;overflow:hidden}.asset img{width:100%;aspect-ratio:1.125;object-fit:contain;background:#eae7dc}.asset>div{padding:18px 22px}.asset p{font-size:14px;color:var(--muted)}.id{font:12px ui-monospace,monospace;letter-spacing:2px;color:var(--green)}.handoff{background:#e8ecdf;padding:28px 32px;display:grid;grid-template-columns:1fr 1fr;gap:32px}.handoff p{font-size:14px}.fine{border-top:1px solid var(--line);padding-top:25px}footer{padding-bottom:48px;color:var(--muted);font-size:13px} @media(max-width:760px){header,main,footer{padding:20px}.kicker{margin-top:28px}.points,.handoff{grid-template-columns:1fr;gap:20px}.grid{grid-template-columns:repeat(2,minmax(0,1fr));gap:14px}.asset>div{padding:12px}.asset h3{font-size:16px}section{margin:45px 0}.handoff{padding:22px}}@media(max-width:460px){.grid{grid-template-columns:1fr}nav{gap:15px}.hero img{aspect-ratio:3/1}h2{font-size:25px}}
</style><header><nav><a href="../index.html">场景策划</a><a href="#layout">空间布局</a><a href="#assets">单件参考</a><a href="../visual-v1/index.html">保留的第一版</a></nav><div class="kicker">郊原牧马图 / VISUAL DIRECTION 02 / 2026.10.13</div><h1>沿水岸牧马</h1><p class="intro">缓弯的水带从左侧岩石后方显现，在柳树与马群背后延伸，继续走出画幅。近岸是安静的牧马草地，对岸低而疏朗；水面以灰绿、细纹与断续倒影显出距离。</p></header><main>
<figure class="hero"><img id="atmosphere" src="images/00-riverside-atmosphere.png" alt="沿水岸牧马新版气氛图"><div class="toolbar" role="group" aria-label="气氛图版本对照"><button data-version="v2" aria-pressed="true">新版 · 沿水岸牧马</button><button data-version="v1" aria-pressed="false">旧版 · 草地中景</button><a id="full-image" href="images/00-riverside-atmosphere.png">打开完整图片 ↗</a></div><figcaption id="caption">V2 · 八马与一位牧者留在近岸干地，河道连续延出左右画幅。AI 生成的设计气氛参考。</figcaption></figure>
<div class="points"><div class="point"><b>01 / 水道连续</b><p>以两条可辨识的岸线表现缓弯河道；左端受岩石遮挡，右端保持开放延续。</p></div><div class="point"><b>02 / 水岸分层</b><p>柳根落在稍高的草土岸上。近岸暗线、细水纹和碎倒影共同加强中景的可读性。</p></div><div class="point"><b>03 / 保留马群状态</b><p>保留八马、牧者和主要遮挡关系。低首仍按采食或画中定姿处理，未追加饮水、涉水动作。</p></div></div>
<section id="layout"><span class="id">WORLD LAYOUT</span><h2>岸线决定纵深，马群保留原位</h2><p class="intro">将场地纵深扩展到约 18 m，给独立河带和对岸留出空间。下图是灰盒搭建的起点；先验证主机位的投影，再校准河宽、岸高和蹄底接触。</p><a class="layout" style="display:block" href="layout.svg"><img src="layout.svg" alt="河道、岸坡、八马与柳树的俯视布局"></a><div class="links"><a href="layout.svg">矢量布局 SVG</a><a href="layout.png">布局 PNG</a><a href="layout.json">坐标与约束 JSON</a></div></section>
<section class="handoff"><div><span class="id">W01 + G02</span><h2>河道与岸坡的制作约束</h2><p>水面带独立建网格，初始河宽沿世界 Z 取 4.2 m、水位 Y=0；近岸草地高约 0.25–0.8 m。岸线曲线连接左岩、柳根台地与右侧开口，湿土暗线保持细窄。</p><p>WebGPU 使用同一渲染器与深度空间，以 TSL 细法线水纹、克制的天空反射和岸边深浅变化建立水感。初期无需海浪模拟。</p></div><div><span class="id">CONTACT + MOTION</span><h2>活动范围仍在干地</h2><p>完整身体边界距近岸初值约 0.8 m，逐项校验蹄底、低头口鼻、尾部和动画包络。主柳根区避让半径暂取 1.3 m。</p><p>H04、H06 保留短程慢走；同时移动不超过两匹。H01/H02、H08/P01 保持成组，先验收构图与接触再接入微动作。</p></div></section>
<section id="assets"><span class="id">14 REFERENCES / REUSED FROM V1</span><h2>单件参考延续原有身份</h2><p class="intro">八马、牧者、树干、柳枝、杂木、岩石和草簇沿用已选参考。动物继续采用“中性参考 → 静态模型 → 拓扑整理 → 专用绑定 → 离线动画 → 运行时接地”的制作顺序。T02 的小叶树与红色阔叶需拆为不同植物。</p><div class="grid">__CARDS__</div></section>
<section class="fine"><h2>设计依据与交接</h2><p class="intro">河道是依据原画蓝灰横带、柳树和岸缘遮挡关系，经用户确认的场景解释；河宽、水深、流向没有被原画确定。故宫作品说明提到马匹的立、卧、食、戏，不能单凭低头姿态认定饮水。</p><p class="note">当前交付为气氛图、布局和单件参考；尚未生成 GLB、绑定资产或 WebGPU 运行场景。所有尺寸与性能预算均待样片验证。</p><div class="links"><a href="prompts.json">新版完整提示词</a><a href="../visual-v1/prompts.json">单件提示词集</a><a href="assets.json">资产清单</a><a href="../plan.md">完整策划文档</a><a href="https://www.dpm.org.cn/collection/paint/230375.html">故宫作品资料</a></div></section>
</main><footer>气氛图与单件参考：built-in image_gen · 布局：可编辑坐标与 SVG · V1 原件保留供对照</footer>
<script>const versions={v2:{src:'images/00-riverside-atmosphere.png',alt:'沿水岸牧马新版气氛图',caption:'V2 · 八马与一位牧者留在近岸干地，河道连续延出左右画幅。AI 生成的设计气氛参考。'},v1:{src:'../visual-v1/images/00-atmosphere.png',alt:'旧版草地中景气氛图',caption:'V1 · 原有草地中景，保留作为修订对照。'}};document.querySelectorAll('[data-version]').forEach(button=>button.addEventListener('click',()=>{const v=versions[button.dataset.version];document.querySelector('#atmosphere').src=v.src;document.querySelector('#atmosphere').alt=v.alt;document.querySelector('#full-image').href=v.src;document.querySelector('#caption').textContent=v.caption;document.querySelectorAll('[data-version]').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));}));</script></html>'''
a_pose_section='''<section id="herder-a-pose"><span class="id">P01-A / MODELING POSE</span><h2>牧马人 · 正面 A-pose</h2><p class="intro">建模与绑定用姿态补充：头身正对前方，双臂向外下方展开，双手离开衣袍，双脚分开。服装与配色延续原单件，场景中的站姿仍参考原画。</p><a href="images/P01-herder-a-pose.png"><img style="max-height:780px;width:auto;margin:24px auto" loading="lazy" src="images/P01-herder-a-pose.png" alt="牧马人正面全身 A-pose 建模参考"></a><div class="links"><a href="images/P01-herder-a-pose.png">完整 A-pose 图片</a><a href="P01-a-pose-prompt.json">生成提示词</a></div></section>'''
page=page.replace('<section id="assets">',a_pose_section+'<section id="assets">')
bare_section='''<section id="t02-bare"><span class="id">T02-BARE / BRANCH STRUCTURE</span><h2>T02 · 无花叶枝干参考</h2><p class="intro">保留扭曲主干、根部与向右舒展的非对称分枝。花叶全部移除，枝干可独立建模，叶片后续分开制作。</p><a href="images/T02-bare-tree.png"><img style="max-height:780px;width:auto;margin:24px auto" loading="lazy" src="images/T02-bare-tree.png" alt="T02 无花叶，仅有主干、分枝、细枝与根部的完整单树参考"></a><div class="links"><a href="images/T02-bare-tree.png">完整枝干参考图</a><a href="T02-bare-tree-prompt.json">生成提示词</a></div></section>'''
page=page.replace('<section id="assets">',bare_section+'<section id="assets">')
page=page.replace('当前交付为气氛图、布局和单件参考；尚未生成 GLB、绑定资产或 WebGPU 运行场景。所有尺寸与性能预算均待样片验证。', '本页保存视觉设计阶段参考。现已接入用户提供的 11 件静态模型并建立 WebGPU 首轮装配；骨骼、角色动画、原画定姿及性能目标尚待验收。')
page=page.replace('<nav><a href="../index.html">', '<nav><a href="../../../index.html">进入 WebGPU 场景</a><a href="../video-prompts/index.html">动作提示词</a><a href="../index.html">')
(ROOT/'index.html').write_text(page.replace('__CARDS__',cards),encoding='utf-8')
print('Built riverside layout, reader and asset manifest; 14 single references reused.')

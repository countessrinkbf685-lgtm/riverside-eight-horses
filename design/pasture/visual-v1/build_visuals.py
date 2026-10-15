"""Build the local visual-design catalogue and editable layout diagrams."""
from pathlib import Path
import json
import html
from PIL import Image

ROOT = Path(__file__).resolve().parent
PARENT = ROOT.parent
plan = json.loads((PARENT / 'scene-plan.json').read_text(encoding='utf-8'))
prompts = json.loads((ROOT / 'prompts.json').read_text(encoding='utf-8'))
selected = {r['id']: r for r in prompts['records']}
names = {h['id']: h['name'] for h in plan['horses']}
names.update(C00='全卷气氛图', P01='蓝衣牧者', T01='主柳树干', V01='下垂柳枝',
             R01='低矮坡石', T02='左侧杂木', V02='疏草丛')
notes = {
 'C00':'原画布局与柔和体积的气氛目标。远处林带、地表细节为设计补全；不是实时渲染截图。',
 'H01':'暖白体色、浅色鬃尾。已修正第一稿背景边缘；绑定后恢复原画低首复杂姿态。',
 'H02':'黑褐躯体与浅色长尾。下肢浅色细节需对照原图逐项校准；后续恢复屈肢姿态。',
 'H03':'深栗体色与偏后侧视角。背面结构优先；另一侧花纹和体态属于补全。',
 'H04':'黄褐色长侧面轮廓。低头、慢走由骨架完成，不在生成网格中固定。',
 'H05':'较修长的浅白马。与 H01 分开保存，作为独立毛色和体态参考。',
 'H06':'首个样片主角。保留灰斑臀部、深色下肢和灰白长尾；先验证 Idle 与 Walk。',
 'H07':'偏正面视角，检查胸部与前肢间距。浅褐毛色，原画被遮挡部位为设计补全。',
 'H08':'棕白大块花斑，保持可见侧的主要斑纹关系。纹理制作时仍须逐块校准边界。',
 'P01':'牧者与花马分开建模。服装、腰间附件依据原图补全；头部和手部需二次检查。',
 'T01':'主干、根系、大枝独立模型。细枝与叶片不焊成实体团块；导入后校准根颈高度。',
 'V01':'柳枝构造参考，建议用曲线枝条与窄叶面重建，保留稀疏间隙和风动层级。',
 'R01':'横向低坡石单件。拼接时旋转和局部改形，避免连续复制形成规则石墙。',
 'T02':'杂木轮廓与配色参考。图中的小叶与红色阔叶应拆为两个植被对象，不当作同一树种。',
 'V02':'草簇轮廓参考。用少量弯曲叶面与实例化重建，避免直接生成密实高面数草团。',
}
methods = {k: '图生静态模型 → 拓扑整理 → 绑定' for k in names if k.startswith('H')}
methods.update(C00='构图、灯光与材质气氛参考',P01='人物模型 → 服装与手部整理 → 轻动作',
               T01='图生底稿 / 雕建主干 → 单独补枝叶',R01='图生模型 → 减面 → 多变体装配',
               T02='拆分两类植被 → 主干与叶簇重建',V01='程序枝条 / 叶面构造参考',V02='程序草叶 / 实例化参考')

# Coordinates are designed world-space anchors, not inferred measurements.
placements = [
 ('H01',-7.4, 2.4,180),('H02',-6.3,4.6,180),('H03',-5.1,-2.4,270),
 ('H04',-4.3, .2,180),('H05',-2.9,-2.4,0),('H06',.4,3.4,0),
 ('H07',2.2,-1.6,90),('H08',8.4,2.0,180),('P01',10.2,2.2,180)]
layout = {
 'title':'郊原牧马图场景布局草案', 'date':'2026-10-13',
 'status':'designed_graybox_starting_values_not_projection_calibrated',
 'coordinates':{'unit':'meter','up':'+Y','right':'+X','toward_viewer':'+Z',
                'heading_degrees':'0=+X, 90=+Z, 180=-X, 270=-Z; not engine Euler angles'},
 'footprint_m':{'x':[-12,12],'z':[-6,6]},
 'anchors':[{'id':i,'x_m':x,'z_m':z,'y_m':None,'y_rule':'terrain_height_at_xz',
             'heading_deg':a,'reference_uv':next((h['reference_uv'] for h in plan['horses'] if h['id']==i),[.917,.705])}
            for i,x,z,a in placements],
 'trees':[{'id':'T01','x_m':3.4,'z_m':.8,'root_avoidance_radius_m':1.3,
           'canopy_reference_radius_m':5.5},
          {'id':'T02','x_m':-10.3,'z_m':-1.0,'note':'split red-leaf undergrowth from small-leaf tree'}],
 'terrain':{'range_y_m':[0,.8],'note':'low relief target; local slopes and hoof anchors require calibration'},
 'behavior':{'walking_ids':['H04','H06'],'max_simultaneous_walking':2,
             'excursion_m':[.5,1.5],'fixed_composition_groups':[['H01','H02'],['H08','P01']]},
 'camera':{'home':{'position_m':[0,6.5,24],'target_m':[0,2.3,0],
                   'projection':'orthographic first; calibrate camera height and window to painting'},
           'rail':'front observation rail; presets are illustrative starting positions',
           'presets':[{'id':'C1','name':'左侧马群','position_m':[-6,3.8,8.5],'target_m':[-5.3,1.1,.5]},
                      {'id':'C2','name':'柳下灰马','position_m':[.7,3.6,9],'target_m':[.4,1.1,3.4]},
                      {'id':'C3','name':'牧者花马','position_m':[9,3.6,8.5],'target_m':[9,1.1,2]}]},
 'acceptance':'Compare projected hoof contacts, silhouettes and occlusion with original before locking layout.'}
(ROOT/'layout.json').write_text(json.dumps(layout,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')

def txt(x,y,s,size=18,color='#393a30',anchor='start',weight=400):
    return f'<text x="{x}" y="{y}" font-size="{size}" fill="{color}" text-anchor="{anchor}" font-weight="{weight}">{html.escape(s)}</text>'
def pos(x,z): return 80+(x+12)*44,150+(z+6)*44
parts=['''<svg xmlns="http://www.w3.org/2000/svg" width="1536" height="960" viewBox="0 0 1536 960" role="img" aria-labelledby="title desc">
<title id="title">郊原牧马图 WebGPU 场景俯视布局</title><desc id="desc">24 米乘 12 米场地，标记八马、牧者、主柳、坡石与前方游卷镜头。尺寸和位置为待校准的设计值。</desc>
<defs><marker id="arrow" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto"><path d="M0 0 L8 4 L0 8" fill="#766043"/></marker></defs>
<rect width="1536" height="960" fill="#f6f2e8"/><g font-family="Microsoft YaHei,Arial,sans-serif">''',
txt(60,55,'郊原牧马图 · 场景俯视布局',30,weight=500),
txt(60,86,'灰盒设计起点 / 非测绘复原 / X 向右 · Z 向观众 · Y 为地形高度',16,'#6b6a5b'),
'<rect x="80" y="150" width="1056" height="528" fill="#eae3d0" stroke="#aaa28c"/>',
'<rect x="80" y="150" width="1056" height="118" fill="#ced5c8"/>',
txt(600,185,'B01 远景色带与低细节背景',16,'#626f62','middle')]
for x in range(-12,13,2):
    px,_=pos(x,0);parts.append(f'<line x1="{px}" y1="150" x2="{px}" y2="678" stroke="#b8b5a4" opacity=".5"/>')
    parts.append(txt(px,136,str(x),14,'#767465','middle'))
for z in range(-6,7,2):
    _,pz=pos(0,z);parts.append(f'<line x1="80" y1="{pz}" x2="1136" y2="{pz}" stroke="#b8b5a4" opacity=".5"/>')
    parts.append(txt(66,pz+5,str(z),14,'#767465','end'))
parts += [txt(1116,115,'X / m',15),txt(21,420,'Z',18),
 '<path d="M94 270 L211 266 L240 333 L218 405 L154 458 L88 450 Z" fill="#b6a080" stroke="#8b775b"/>',
 txt(128,314,'左坡石',17),
 '<path d="M132 647 L206 616 L231 638 L231 677 L131 677 Z M499 636 L541 606 L618 635 L630 677 L497 677 Z M748 634 L814 603 L870 633 L891 677 L740 677 Z" fill="#b6a080" stroke="#8b775b"/>',
 txt(520,663,'R01 坡石',15),
 '<ellipse cx="753" cy="416" rx="242" ry="144" fill="#8a9b6b" opacity=".12"/>',
 '<ellipse cx="753" cy="416" rx="242" ry="144" fill="none" stroke="#7a8b60" stroke-dasharray="8 7"/>']
tx,tz=pos(3.4,.8)
parts += [f'<circle cx="{tx}" cy="{tz}" r="57.2" fill="#a08966" fill-opacity=".15" stroke="#8c6a47" stroke-dasharray="5 4"/>',
          f'<circle cx="{tx}" cy="{tz}" r="23" fill="#856448"/>',txt(tx,tz+6,'T01',16,'#fff8e9','middle'),
          txt(tx+65,tz+8,'根区避让',15,'#735638')]
sx,sz=pos(-10.3,-1)
parts += [f'<circle cx="{sx}" cy="{sz}" r="39" fill="#899270" fill-opacity=".6" stroke="#677353"/>',txt(sx,sz+5,'T02',16,'#344132','middle')]
for identifier,x,z,heading in placements:
    px,pz=pos(x,z)
    fill='#e7e2d4' if identifier in ['H01','H05','H06'] else '#aa8153' if identifier in ['H04','H07'] else '#6d5240'
    if identifier=='P01':
        parts += [f'<circle cx="{px}" cy="{pz}" r="14" fill="#728c92" stroke="#425e64"/>',txt(px,pz+41,'P01',17,anchor='middle')]
    else:
        parts += [f'<g transform="translate({px},{pz}) rotate({heading})"><ellipse rx="45" ry="17" fill="{fill}" stroke="#574c3d" stroke-width="1.5"/><path d="M33 -9 L60 -6 L67 2 L55 12 L38 10" fill="{fill}" stroke="#574c3d" stroke-width="1.5"/><path d="M-43 0 Q-64 -12 -68 -2" fill="none" stroke="#574c3d" stroke-width="4"/></g>',txt(px+48 if identifier == 'H07' else px,pz-85 if identifier == 'H03' else pz+7 if identifier == 'H07' else pz+42,identifier,18,anchor='start' if identifier == 'H07' else 'middle',weight=500)]
    if identifier in ['H04','H06']:
        parts.append(f'<path d="M{px-57} {pz+58} Q{px} {pz+76} {px+57} {pz+58}" fill="none" stroke="#718858" stroke-width="2" stroke-dasharray="5 4"/>')
parts += ['<path d="M256 804 Q520 832 639 826 Q908 809 1055 804" fill="none" stroke="#8c6a47" stroke-width="3"/>',
          txt(592,862,'前方游卷轨道 · 镜头始终朝场景内部',17,'#735638','middle')]
for cid,x,z,txx,tzz in [('C1',-6,8.5,-5.3,.5),('C2',.7,9,.4,3.4),('C3',9,8.5,9,2)]:
    px,pz=pos(x,z);qx,qz=pos(txx,tzz)
    parts += [f'<line x1="{px}" y1="{pz-20}" x2="{qx}" y2="{qz+60}" stroke="#8c6a47" stroke-dasharray="5 5" marker-end="url(#arrow)"/>',
              f'<rect x="{px-22}" y="{pz-14}" width="44" height="28" rx="4" fill="#795d43"/>',txt(px,pz+6,cid,15,'#fff8e9','middle')]
legend=[('构图层次',''),('后景','低对比色带与稀疏远树'),('中景','H03 · H05 · H07'),('前景','H01 · H02 · H04 · H06'),('右侧组合','H08 ＋ P01'),('主支点','T01 巨柳 / 根区避让'),('观察镜头',''),('C0 全卷','(0, 6.5, 24) m'),('C1 左侧马群','沿前方轨道局部观察'),('C2 柳下灰马','首个样片机位'),('C3 牧者花马','保持人马组合关系'),('制作约束',''),('一次最多两匹慢走','优先 H04 与 H06'),('先定姿再补动作','H01 / H02 暂不大幅移动'),('背面为设计补全','原画机位投影仍须校准')]
y=164
for head,sub in legend:
    parts.append(txt(1182,y,head,19 if not sub else 16, '#3c4136',weight=500 if not sub else 400));y+=25
    if sub: parts.append(txt(1182,y,sub,14,'#737263'));y+=30
    else: y+=10
parts += [txt(80,717,'场地宽 24 m × 深 12 m · 每格 2 m · 马匹符号表示近似占地与朝向',16,'#6b6a5b'),
txt(60,913,'布局原则：左群紧凑、柳下留白、右侧人马成组；纵深由灰盒投影匹配后锁定。',17),
txt(60,941,'layout.json 保存世界坐标与镜头草案；地面高度、马蹄锚点和遮挡关系尚待实际场景验证。',15,'#777265'),'</g></svg>']
(ROOT/'layout.svg').write_text(''.join(parts),encoding='utf-8')

assets=[]
for key in ['C00']+[f'H{i:02d}' for i in range(1,9)]+['P01','T01','V01','T02','R01','V02']:
    r=selected[key]; p=ROOT/'images'/r['file']
    with Image.open(p) as im: size=list(im.size); mode=im.mode
    assets.append({'id':key,'name':names[key],'file':'images/'+r['file'],'pixels':size,'mode':mode,
                   'bytes':p.stat().st_size,'status':'visual_reference_only','method':methods[key],'note':notes[key]})
(ROOT/'assets.json').write_text(json.dumps({'date':'2026-10-13','generator':'built-in image_gen',
 'selected_assets':assets,'superseded':['images/H01-white-horse.png'],'layout':'layout.json'},ensure_ascii=False,indent=2)+'\n',encoding='utf-8')

cards=[]
for a in assets[1:]:
    cards.append(f'''<figure class="asset" id="{a['id']}"><a href="{a['file']}" target="_blank"><img src="{a['file']}" width="{a['pixels'][0]}" height="{a['pixels'][1]}" loading="lazy" alt="{a['id']} {a['name']} 独立建模参考"></a><figcaption><span class="code">{a['id']}</span><h3>{a['name']}</h3><p>{a['note']}</p><p class="method">{a['method']}</p><a href="{a['file']}" download>下载原图 · {a['pixels'][0]} × {a['pixels'][1]}</a></figcaption></figure>''')
markers=''.join(f'<g transform="translate({h["reference_uv"][0]*1600:.1f},{h["reference_uv"][1]*502.18:.1f})"><circle r="17"/><text y="5">{h["id"][1:]}</text></g>' for h in plan['horses'])
rows=''.join(f'<tr><td><a href="#{i}">{i}</a></td><td>{names[i]}</td><td>{x:.1f}</td><td>{z:.1f}</td><td>{a}°</td></tr>' for i,x,z,a in placements)
page='''<!doctype html><html lang="zh-Hans"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>郊原牧马图 气氛与资产设计</title>
<style>
:root{color-scheme:light;--paper:#f5f1e6;--ink:#32362d;--muted:#696c60;--line:#d7d3c3;--accent:#78533b}*{box-sizing:border-box}html{scroll-behavior:smooth}body{margin:0;background:var(--paper);color:var(--ink);font:16px/1.8 system-ui,"Microsoft YaHei",sans-serif}header,main,footer{max-width:1504px;margin:auto;padding:40px 48px}header{padding-top:52px;padding-bottom:25px}.eyebrow{color:var(--accent);font-size:13px;letter-spacing:.17em}h1{font-family:"SimSun",Georgia,serif;font-size:clamp(32px,4.4vw,62px);font-weight:500;line-height:1.25;margin:20px 0}header p{max-width:940px;color:var(--muted)}nav{display:flex;flex-wrap:wrap;gap:24px;border-top:1px solid var(--line);padding-top:20px;margin-top:26px}a{color:var(--accent);text-underline-offset:4px}a:focus-visible{outline:3px solid #9c7843;outline-offset:4px}.hero{margin:0}.hero img{display:block;width:100%;height:auto}.hero figcaption{max-width:1408px;margin:auto;padding:16px 48px;color:var(--muted);font-size:14px}section{margin-bottom:64px}h2{font-size:28px;font-weight:500;padding-top:24px;border-top:1px solid var(--line);margin:0 0 18px}h3{font-size:20px;font-weight:500;margin:8px 0}.intro{max-width:930px}.note{color:var(--muted);font-size:14px}.composition{position:relative}.composition img{display:block;width:100%;height:auto}.composition svg{position:absolute;inset:0;width:100%;height:100%;pointer-events:none}.composition circle{fill:#faf4e7;stroke:#77543d;stroke-width:2}.composition text{fill:#5e3f2e;font:500 14px Arial,sans-serif;text-anchor:middle}.layout{width:100%;height:auto;display:block;border:1px solid var(--line)}.grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:32px 24px}.asset{margin:0;scroll-margin-top:24px}.asset>a{display:block;background:#d2d2d2}.asset img{display:block;width:100%;height:330px;object-fit:contain}.asset figcaption{padding-top:16px}.asset p{margin:8px 0;font-size:14px}.code{font-size:13px;letter-spacing:.12em;color:var(--accent)}.method{color:var(--muted)}.asset figcaption>a{font-size:13px}.palette{display:flex;gap:24px;flex-wrap:wrap;margin:24px 0}.swatch{display:flex;gap:10px;align-items:center;font-size:14px}.swatch i{display:block;width:30px;height:30px;border-radius:50%}.table-wrap{overflow:auto}table{border-collapse:collapse;width:100%;font-size:14px}td,th{text-align:left;padding:10px 14px;border-bottom:1px solid var(--line)}th{background:#e9e3d4;font-weight:500}details{margin:20px 0}summary{cursor:pointer;color:var(--accent)}.handoff{max-width:1000px}.handoff li{margin:12px 0}footer{border-top:1px solid var(--line);font-size:14px;color:var(--muted)}
@media(max-width:1000px){.grid{grid-template-columns:repeat(2,minmax(0,1fr))}.asset img{height:300px}}@media(max-width:600px){header,main,footer{padding:26px 18px}.hero figcaption{padding:12px 18px}.grid{grid-template-columns:1fr;gap:36px}.asset img{height:340px}h2{font-size:23px}nav{gap:12px 20px}.layout-wrap{overflow:auto}.layout{min-width:950px}.composition-wrap{overflow:auto}.composition{min-width:900px}}@media(prefers-reduced-motion:reduce){html{scroll-behavior:auto}}@media print{header,main,footer{padding:20px}.grid{grid-template-columns:repeat(2,1fr)}.asset{break-inside:avoid}nav{display:none}.layout{min-width:0}}
</style></head><body><header><div class="eyebrow">VISUAL DESIGN / 2026.10.13</div><h1>郊原牧马图<br>气氛、布局与单件参考</h1><p>以横卷构图为中心，把八匹马、牧者与树石拆成可独立制作的资产。气氛图定义场景的颜色与体积；单件图采用中性光照；布局图明确三维装配的起点。</p><nav><a href="#mood">气氛图</a><a href="#layout">场景布局</a><a href="#horses">八马参考</a><a href="#environment">牧者与环境</a><a href="#handoff">制作交接</a><a href="../index.html">策划正文</a></nav></header>
<figure class="hero" id="mood"><a href="images/00-atmosphere.png" target="_blank"><img src="images/00-atmosphere.png" width="2172" height="724" alt="郊原牧马图三维场景气氛图，八匹马与牧者分布在巨柳和坡石之间"></a><figcaption>全卷气氛目标 · 保留左侧马群、中央巨柳、右侧人马组合。背景纵深与细节为设计补全；此图不是实时 WebGPU 渲染结果。</figcaption></figure>
<main><section><div class="palette"><span class="swatch"><i style="background:#a48b60"></i>赭黄土石</span><span class="swatch"><i style="background:#747b5d"></i>灰绿枝叶</span><span class="swatch"><i style="background:#4a3a2d"></i>墨褐树皮</span><span class="swatch"><i style="background:#8e9d9d"></i>浅蓝灰空气</span><span class="swatch"><i style="background:#e5decb"></i>柔和浅色马体</span></div><p class="note">以上为建议调色板，非原作颜料测量值。整体采用漫射日光、克制反差和柔和接触阴影，避免把绢纹烘进角色材质。</p></section>
<section id="layout"><h2>原画定位与三维布局</h2><p class="intro">上图定位以原画为准；下图的米制坐标、纵深和镜头是人工设计的灰盒起点。实际装配先匹配马蹄、头部与遮挡关系，再锁定参数。</p><div class="composition-wrap"><div class="composition"><img src="../../../郎世宁_郊原牧马图卷_6882x2160.jpg" width="6882" height="2160" alt="原画八马身份编号定位"><svg viewBox="0 0 1600 502.18" aria-hidden="true">__MARKERS__</svg></div></div><p class="note">01–08 对应 H01–H08。原画低首和屈肢姿态通过绑定后重建，下面的单件图统一采用便于建模的站姿。</p><div class="layout-wrap"><a href="layout.svg" target="_blank"><img class="layout" src="layout.svg" width="1536" height="960" alt="24米乘12米场景布局，包含八匹马、牧者、巨柳、坡石与镜头轨道"></a></div><p><a href="layout.svg" download>下载矢量布局图</a> · <a href="layout.json" download>下载坐标与镜头配置</a></p><details><summary>展开三维初始站位表</summary><p class="note">X 向右，Z 向观众；Y 从地形采样。朝向 0° 为 +X，90° 为 +Z，非引擎欧拉角约定。</p><div class="table-wrap"><table><thead><tr><th>编号</th><th>对象</th><th>X 米</th><th>Z 米</th><th>朝向</th></tr></thead><tbody>__ROWS__</tbody></table></div></details></section>
<section id="horses"><h2>八匹马的独立参考</h2><p class="intro">每张仅有一个角色、一个视角。优先上传单张主参考生成模型；不要把八马拼图作为一次模型输入。参考图的四肢可辨不等于生成网格已通过绑定检查。</p><div class="grid">__HORSES__</div></section>
<section id="environment"><h2>牧者与环境单件</h2><p class="intro">主柳采用树干与枝叶分离；坡石单独装配。细柳条与草叶以程序几何重建更便于控制形状、面数和风动。</p><div class="grid">__ENV__</div></section>
<section class="handoff" id="handoff"><h2>从参考图到场景</h2><ol><li>先做 H06＋T01 柳根＋R01 坡石样片。以 H06 的站姿生成静态模型，检查四肢、腹部和尾根，再整理拓扑与绑定。</li><li>马匹统一米制，先验证待机与慢走，再恢复原画姿态。H01、H02 复杂屈肢单独精修；八马保留独立身份与动作相位。</li><li>主树、坡石与人物可作为单件图生模型输入；V01 柳枝、V02 草簇是形态参考，建议重建为轻量可变形网格。</li><li>T02 是杂木构图参考，红色阔叶与小叶在制作时拆为独立植物；未见面、服装构造及花纹补全不当作原画确定事实。</li><li>所有参考图都不是校准正交图。真正的背面、多视图一致性、纹理边界和遮挡关系仍需模型检查。</li></ol><p><a href="prompts.json" download>完整生成提示词与来源记录</a> · <a href="assets.json" download>资产清单与用途</a></p><p class="note">使用内置 image_gen 生成，未调用外部图生 3D 服务。当前交付 1 张气氛图、14 张选定单件参考、1 份矢量布局及装配配置；H01 第一稿保留为历史版本，正式使用 v2。</p></section></main><footer>文件保存在 design/pasture/visual-v1。图像为设计参考；尚未生成 GLB、绑定或实现运行时场景。</footer></body></html>'''
page=page.replace('__MARKERS__',markers).replace('__ROWS__',rows).replace('__HORSES__',''.join(cards[:8])).replace('__ENV__',''.join(cards[8:]))
(ROOT/'index.html').write_text(page,encoding='utf-8')
print(json.dumps({'selected_images':len(assets),'horses':8,'environment':6,'bytes':sum(a['bytes'] for a in assets)},ensure_ascii=False))

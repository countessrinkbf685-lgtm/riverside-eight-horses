"""Write complete, per-identity motion prompts and a copyable review page."""
from pathlib import Path
import json,html,shutil
ROOT=Path(__file__).resolve().parents[1]
DEST=ROOT/'design/pasture/video-prompts'
DEST.mkdir(parents=True,exist_ok=True)
assets=json.loads((ROOT/'design/pasture/visual-v1/assets.json').read_text(encoding='utf-8'))['selected_assets']
horses={a['id']:a for a in assets if a['id'].startswith('H')}
identity={
'H01':'ONE warm-white adult horse, pale mane and tail, preserve the exact head and body proportions of the supplied H01 image. Do not substitute the slimmer H05 horse.',
'H02':'ONE black-brown adult horse with the pale long tail and lower-leg details exactly as in the supplied H02 image. Keep coat and limb markings constant.',
'H03':'ONE deep chestnut adult horse, preserve the rich brown coat, dark mane and tail and compact hindquarter silhouette of the supplied H03 image.',
'H04':'ONE ochre-brown adult horse, preserve the long side silhouette, brown mane and tail and exact visible leg markings of the supplied H04 image.',
'H05':'ONE slender pale-white adult horse, preserve the slim build, light mane and tail and exact facial proportions of the supplied H05 image. Do not substitute H01.',
'H06':'ONE gray-white adult horse with mottled gray hindquarters, darker lower legs and long gray-white tail; preserve the exact gray patches and head shape of the supplied H06 image.',
'H07':'ONE pale dun adult horse, preserve the warm light-brown coat, darker mane, chest width and front-leg spacing of the supplied H07 image.',
'H08':'ONE brown-and-white pinto adult horse; keep every large visible coat patch fixed in shape and location, preserving the face pattern and dark mane of the supplied H08 image.'}
base='Use the attached approved single-horse image as the exact identity reference. {identity} One uninterrupted 8-second silent animal-motion reference, one horse only. Fixed camera, no pan, orbit, zoom, crop or cuts. Plain light-gray studio floor and backdrop, soft constant diffuse light, faint ground contact shadow. Full ears, mane, tail and all four hooves inside the frame with generous margins at all times. Physically plausible equine anatomy, constant limb lengths and body volume, stable coat markings. No saddle, rider, tack, other animal, human, grass props, water, river, text or watermark. No morphing, extra limbs, fused legs, floating hooves or sliding planted hooves. '
motions={
'Idle':('安静待机','0–1 s: settle in the same neutral standing pose. 1–7 s: extremely subtle breathing, one small independent ear swivel, and a single gentle tail swish; feet remain on the same four ground contacts. 7–8 s: settle back to the initial head and tail position for a possible loop. No stepping, nodding rhythmically, spinning or exaggerated body sway. Preserve a three-quarter side view close to the source image; legs must remain separately readable.', '四蹄固定；首尾姿态接近；保留身份与花纹。'),
'Walk':('四拍慢走','Use a fixed wide nearly side-profile camera with only a slight front angle to distinguish far legs. Leave sufficient floor space for the entire short translation. 0–1 s: stand quietly. 1–7 s: walk slowly forward through at least two complete natural four-beat cycles; sequential left hind, left fore, right hind, right fore contacts, realistic alternating support, shoulder and pelvis weight transfer. Each planted hoof stays fixed on the floor during support. 7–8 s: decelerate gently and stand. Natural small head oscillation, no high stepping. No trot, pace, canter, backward skating or treadmill-style motion. This reference has real forward travel; root translation will be removed during offline animation authoring, not during video generation.', '侧面至少两轮完整四拍；先检查落蹄，离线去根位移后才用于原地 Walk。'),
'Graze':('低头—采食—抬头','Use a fixed three-quarter side camera showing neck, back and all four hooves. 0–1 s: neutral standing. 1–3 s: lower head naturally toward floor height, coordinated neck and slight upper-back movement; keep balance with tiny anatomically plausible posture adjustment but no forward travel. 3–5.5 s: quiet grazing-like jaw motion at floor height; muzzle remains just above the ground and never penetrates it. 5.5–7.5 s: raise head gently to the original neutral height. 7.5–8 s: hold neutral pose. No drinking, kneeling, lying down, mouth stretching or repeated rapid head bobbing.', '从单段拆出 GrazeDown / Loop / Up；口鼻不能穿地；片段接口需离线校准。'),
'Look':('轻转头','0–1 s: neutral stand. 1–3 s: slowly turn the head about 15 degrees toward camera, with a small anatomically plausible neck bend. 3–5 s: hold calmly with one ear responding. 5–7 s: return to original head orientation. 7–8 s: still neutral stand. Torso, pelvis and all four hoof contacts remain fixed; no whole-body turn or neck twisting. Preserve the source viewing direction so the chest and leg spacing or hindquarter shape remains recognizable.', '躯干和蹄点不动，颈部转角克制；H03 背向轮廓、H07 正面胸部可辨。')}
records=[]
for hid in horses:
    tasks=['Idle']
    if hid in ['H04','H06']:tasks+=['Walk']
    if hid in ['H04','H05','H06','H08']:tasks+=['Graze']
    if hid in ['H03','H07']:tasks+=['Look']
    for action in tasks:
        title,action_prompt,check=motions[action]
        records.append({'id':hid+'-'+action,'horse_id':hid,'title':horses[hid]['name']+' · '+title,
        'priority':'P1' if hid=='H06' else 'P2','duration_s':8,
        'reference':'../visual-v1/'+horses[hid]['file'],
        'output_name':hid+'-'+action+'-v1.mp4',
        'prompt':base.format(identity=identity[hid])+action_prompt,
        'acceptance':check,'status':'prompt_ready_not_generated'})
for hid in ['H01','H02']:
    records.append({'id':hid+'-PaintingPose','horse_id':hid,'title':horses[hid]['name']+' · 画中定姿微动（后续）',
    'priority':'deferred_after_pose_approval','duration_s':8,
    'reference':'approved isolated '+hid+' painting-pose render required; do not use neutral standing source',
    'output_name':hid+'-PaintingPose-v1.mp4',
    'prompt':base.format(identity=identity[hid])+'The attached reference must be an already approved isolated reconstruction of this horse in its original painting pose. Preserve that exact low-head and flexed-limb pose throughout all 8 seconds; do not invent entering or exiting this complex pose. Only faint breathing and one small ear swivel, with no changes to supporting limb contacts or joint configuration. No falling, collapsing, rolling, standing-up transition or interaction with another horse. Keep the original camera view.',
    'acceptance':'先完成原画定姿静帧；当前中性站姿图不能用来自动猜测屈肢过程。','status':'needs_approved_painting_pose_reference'})
videos=json.loads((ROOT/'artifacts/audit/source-audit.json').read_text(encoding='utf-8'))['videos']
reviews=json.loads((ROOT/'design/pasture/video-reviews.json').read_text(encoding='utf-8'))
for v in videos:
    key=Path(v['source']).stem
    v.update(reviews.get(key,{'subject':'待核对','observed_action':'待审','review':'尚未完成检查'}))
    v['clip_key']=key
    if 'review_method' not in v:
        v['review_method']='20_sampled_frames_not_full_motion_validation' if key in ['gemini_generated_video_37037a6e','gemini_generated_video_3ea4540b'] else '4_sampled_frames_not_full_motion_validation'
    (DEST/'review-stills').mkdir(exist_ok=True)
    shutil.copyfile(ROOT/v['frames'][0],DEST/'review-stills'/f'{key}.jpg')
    v['poster']=f'review-stills/{key}.jpg'

for r in records:
    received=[v['clip_key'] for v in videos if r['id'] in v.get('prompt_ids',[])]
    r['received_references']=received
    if received and r['status']=='prompt_ready_not_generated':r['status']='prompt_ready_reference_received'

data={'tool_target':'image-to-video (e.g. Veo); no generation executed','duration_note':'8 s default; if tool supports 10 s, extend final idle hold by 2 s, do not speed up gait',
      'workflow':'One identity and one action per generation. Video is reference only; author and bake skeletal motion offline after topology cleanup.',
      'existing_videos':videos,'records':records}
(DEST/'prompts.json').write_text(json.dumps(data,ensure_ascii=False,indent=2),encoding='utf-8')
(DEST/'prompts.txt').write_text('\n\n'.join(r['id']+' | '+r['title']+'\n输入：'+r['reference']+'\n输出：'+r['output_name']+'\n'+r['prompt']+'\n验收：'+r['acceptance'] for r in records),encoding='utf-8')
cards=[]
for r in records:
    a=horses[r['horse_id']]
    receipt='；'.join(f'<a href="#{key}">已收到参考 · {key[-8:]}</a>' for key in r['received_references']) or '此提示词尚未关联明确身份的视频参考。'
    cards.append(f'''<article id="{r['id']}"><img loading="lazy" src="../visual-v1/{a['file']}" alt="{html.escape(a['name'])}"><div><small>{r['id']} / {r['priority']} / 8 s</small><h2>{r['title']}</h2><p>{receipt}</p><p>{r['acceptance']}</p><p>文件名：{r['output_name']}</p><details><summary>查看英文提示词</summary><pre>{html.escape(r['prompt'])}</pre></details><button data-copy="{r['id']}">复制完整提示词</button><span class="feedback" role="status"></span></div></article>''')
existing=''.join(f'<li id="{v["clip_key"]}"><a href="../../../{v["source"]}">{v["id"]} · {v["subject"]} · {v["observed_action"]}</a>（{v["duration_s"]:.1f}s）<p>{v["review"]}</p><details><summary>播放参考视频</summary><video style="display:block;width:100%;max-width:720px;margin:12px 0" controls playsinline preload="none" poster="{v["poster"]}" src="../../../{v["source"]}"></video></details></li>' for v in videos)
page='''<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>八马动作 · 视频提示词</title><style>*{box-sizing:border-box}body{margin:0;background:#f4f1e7;color:#33413c;font:16px/1.75 system-ui,"Microsoft YaHei",sans-serif}main{max-width:1150px;margin:auto;padding:36px 24px}a{color:#34685e}h1{font-size:36px}h2{font-size:23px;margin:6px 0}article{display:grid;grid-template-columns:230px 1fr;gap:26px;background:#fffdf7;border:1px solid #d5d9c9;padding:22px;margin:22px 0}img{width:100%;align-self:start}pre{white-space:pre-wrap;overflow-wrap:anywhere;font:14px/1.7 ui-monospace,monospace}button{border:0;border-radius:6px;padding:10px 18px;background:#34685e;color:white;font:inherit;cursor:pointer}small{color:#6c786b}.feedback{font-size:13px;margin-left:10px}li{margin:14px 0}li p{margin:0;color:#647065}.callout{padding:22px;background:#e4e9dc}nav{display:flex;gap:22px;flex-wrap:wrap}@media(max-width:600px){article{grid-template-columns:1fr}article img{max-height:220px;object-fit:contain}}</style><main><nav><a href="../../../index.html">进入场景</a><a href="../index.html">策划</a><a href="prompts.txt">全部提示词 TXT</a><a href="prompts.json">结构化 JSON</a></nav><h1>八马动作 · 视频提示词</h1><p>16 条可立即使用的单马动作提示词，另有 2 条等待画中定姿参考的后续提示词。优先完成 H06 的 Idle / Walk 验证，再扩展其他马。</p><div class="callout">每次上传对应马的单件图，只生成一个动作。默认 8 秒；若工具支持 10 秒，在结尾多停留 2 秒。镜头固定、四蹄完整、花纹恒定。视频用于离线动作参考，不能直接替代 GLB 骨骼动画。</div><h2 style="margin-top:36px">现有视频检查</h2><p>共 __VIDEO_COUNT__ 段视频。本次新增 8 段；重点片段补充 20 点抽帧，其余为 4 点抽帧。完整步态、裁切和循环仍需逐帧验收。</p><ul>__EXISTING__</ul><h2>可复制的动作提示词</h2>__CARDS__</main><script>const records=__DATA__;document.querySelectorAll('[data-copy]').forEach(b=>b.addEventListener('click',async()=>{const t=records.find(r=>r.id===b.dataset.copy).prompt;try{await navigator.clipboard.writeText(t);b.nextElementSibling.textContent='已复制';}catch{b.parentElement.querySelector('details').open=true;const range=document.createRange();range.selectNodeContents(b.parentElement.querySelector('pre'));const s=getSelection();s.removeAllRanges();s.addRange(range);b.nextElementSibling.textContent='已选中，请按 Ctrl+C';}}));</script></html>'''
page=page.replace('__VIDEO_COUNT__',str(len(videos))).replace('__CARDS__',''.join(cards)).replace('__EXISTING__',existing).replace('__DATA__',json.dumps(records,ensure_ascii=False).replace('</','<\\/'))
(DEST/'index.html').write_text(page,encoding='utf-8')
print(f'Wrote {len(records)} prompts and {len(videos)} video reviews')

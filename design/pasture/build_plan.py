"""Rebuild the local planning reader and draft scene manifest; no scene assets generated."""
from pathlib import Path
import json
import html
import markdown

HERE = Path(__file__).resolve().parent
horses = [
    ("H01", "左前白马", [0.192, 0.646], "低首贴地的复杂姿态；先定姿，再考虑过渡", "P2", "画中定姿、呼吸、耳动"),
    ("H02", "左前黑马", [0.222, 0.758], "曲颈屈肢，与 H01 成组；保留浅色鬃尾", "P2", "画中定姿、呼吸、耳尾微动"),
    ("H03", "后排深栗马", [0.286, 0.504], "背向观察者，优先验证背视轮廓", "P2", "待机、转头、尾动"),
    ("H04", "中左黄褐马", [0.306, 0.610], "侧面长轮廓，活动范围留在左侧马群", "P2", "待机、采食、短程慢走"),
    ("H05", "中左白马", [0.373, 0.574], "低垂头颈，核对口鼻与地面关系", "P2", "采食、抬头"),
    ("H06", "柳左灰白马", [0.516, 0.724], "首个样片主角；灰斑臀部、深色下肢", "P1", "待机、慢走、逐蹄接地、耳动、甩尾"),
    ("H07", "柳旁浅褐马", [0.591, 0.611], "接近正面，检查胸部和前肢间距", "P2", "待机、轻转头"),
    ("H08", "牧者旁棕白花马", [0.849, 0.683], "大块花斑按可见侧匹配，与牧者整体约束", "P2", "低头采食、抬头、尾动"),
]
manifest = {
    "title": "郊原牧马图 WebGPU 场景策划",
    "version": "planning-v2-riverside", "date": "2026-10-13",
    "status": "environment_v4_t02_imported_h06_idle_live_walk_study",
    "runtime_entry": "../../index.html",
    "asset_registry": "asset-registry.json",
    "video_prompts": "video-prompts/prompts.json",
    "visual_design": "visual-v2/index.html",
    "previous_visual_design": "visual-v1/index.html",
    "setting": "沿水岸牧马；用户确认的缓弯河道设计解释",
    "river_layout": "visual-v2/layout.json",
    "reference_image": "../../郎世宁_郊原牧马图卷_6882x2160.png",
    "reference_size_px": [6882, 2160],
    "reference_project": "E:/DelaunayVoronoiFokkerPlanck/design/balcony",
    "annotation": {"origin": "top_left", "u": "right", "v": "down",
                   "meaning": "approximate_visible_torso_point_not_hoof_contact",
                   "world_positions": "pending_graybox_calibration"},
    "experience": {"default": "painting_composition_with_subtle_motion",
                   "camera_states": ["SCROLL", "ENTER_DETAIL", "DETAIL", "RETURN"],
                   "views": ["全卷", "左侧马群", "柳下灰马", "牧者花马"],
                   "detail_yaw_limit_deg_initial": 15,
                   "motion_modes": ["静观", "微动"], "max_walking_horses": 2},
    "world_draft": {"unit": "meter", "up": "+Y", "scroll_right": "+X", "toward_viewer": "+Z",
                    "footprint_m": [24, 18], "horse_withers_height_m": [1.35, 1.55],
                    "willow_height_m": [8, 10], "all_dimensions": "design_assumptions"},
    "horses": [dict(id=i, name=n, reference_uv=uv, silhouette_note=note,
                    first_stage=stage, behavior_note=motion, world_position_m=None,
                    asset_status="planned", asset_url=None)
               for i, n, uv, note, stage, motion in horses],
    "environment": [
        {"id": "P01", "name": "牧者", "reference_uv": [.917, .705], "method": "independent_character"},
        {"id": "T01", "name": "主柳", "reference_uv": [.638, .50], "method": "trunk_branches_leaf_clusters_separate"},
        {"id": "G01", "name": "主地形", "method": "editable_terrain_with_cpu_heightfield"},
        {"id": "W01", "name": "缓弯河道", "method": "continuous_ribbon_mesh_with_TSL_water"},
        {"id": "G02", "name": "近岸与对岸", "method": "bank_curves_terrain_blending_and_navigation_margin"},
        {"id": "T02", "name": "左侧杂木", "method": "two_tree_shapes_and_instanced_leaves"},
        {"id": "R01-R03", "name": "坡石", "method": "three_rock_variants_and_long_ledge"},
        {"id": "V01-V03", "name": "草丛", "method": "three_instanced_cluster_types"},
        {"id": "B01", "name": "远景", "method": "two_or_three_depth_layers_cleaned_of_foreground_ghosts"}
    ],
    "horse_pipeline": {"order": ["identity_card", "neutral_reference", "static_mesh", "cleanup_retopology_lods",
                                    "bake_textures", "equine_rig", "offline_animation", "web_pack", "runtime_contacts"],
                       "deform_bone_count_target": [45, 65],
                       "clip_stage_one": ["Idle", "Walk"],
                       "clip_stage_two": ["GrazeDown", "GrazeLoop", "GrazeUp", "Look"],
                       "micro_actions": ["EarFlick", "TailSwish", "Breath"],
                       "complex_painting_poses": ["PoseH01", "PoseH02"],
                       "runtime": "in_place_walk_with_speed_sync_and_contact_markers",
                       "ai_video": "reference_only_not_automatic_mocap"},
    "rendering": {"backend": "WebGPU", "framework": "Three.js WebGPU + TSL",
                  "version": "lock_after_feature_spike", "canvas_count": 1,
                  "fallback_v1": "original_painting_viewer_with_explanation",
                  "foliage_v1": "instanced_vertex_wind", "compute": "only_after_profiling",
                  "cpu": ["herd_behavior", "IK", "height_sampling"],
                  "style": "restrained_color_soft_volume_object_space_brush_detail"},
    "budgets_unverified_targets": {
        "desktop": {"resolution_px": [1920, 1080], "dpr": 1, "frame_p95_ms": 16.7,
                    "visible_triangles": [250000, 450000], "draw_calls_including_shadow_post_max": 180,
                    "cold_transfer_mb_max": 20, "gpu_memory_mb_target_max": 512},
        "low": {"resolution_px": [1280, 720], "dpr": 1, "frame_p95_ms": 33.3,
                "visible_triangles": [100000, 200000], "draw_calls_including_shadow_post_max": 100,
                "cold_transfer_mb_max": 12, "gpu_memory_mb_target_max": 256},
        "full_transfer_mb_max": 60,
        "horse_lod_triangles": [[35000, 50000], [12000, 20000], [3000, 6000]]},
    "milestones": [
        {"id": "P0", "name": "原画标注与 WebGPU 灰盒", "person_days": [2, 3]},
        {"id": "P1", "name": "H06 与柳根样片", "person_days": [4, 7]},
        {"id": "P2", "name": "全卷静态成形", "person_days": [6, 10]},
        {"id": "P3", "name": "微动与游卷", "person_days": [4, 7]},
        {"id": "P4", "name": "优化与美术验收", "person_days": [3, 5]}],
    "acceptance_targets": {"anchor_projection_error_canvas_width_max": .02,
                           "flat_test_stance_hoof_vertical_abs_error_m_max": .01,
                           "flat_test_stance_horizontal_drift_m_max": .02,
                           "behavior_soak_minutes": 10,
                           "performance_sample_seconds_per_route_after_warmup_min": 60},
    "implemented": ["actual_webgpu_backend", "12_asset_imports", "H06_46_bone_study", "H06_Idle_Walk_Graze", "H06_measured_contacts", "H07_36_bone_study", "H07_Idle_Look_Neutral", "H07_measured_contacts", "all_nine_actor_rigs", "H01_H02_painting_pose_and_transitions", "H04_H06_bounded_terrain_walk", "P01_sleeve_cuff_refinement", "H04_flat_stage_Walk", "P01_APose_Neutral_Idle_Look", "river_and_banks", "procedural_willow_and_grass", "five_camera_presets", "original_comparison", "no_gpu_fallback", "per_horse_video_prompts"],
    "pending": ["retopology", "unrestricted_navigation", "performance_acceptance"]
}
registry_path = HERE / 'asset-registry.json'
if registry_path.exists():
    registry = {a['id']: a for a in json.loads(registry_path.read_text(encoding='utf-8'))['assets']}
    for horse in manifest['horses']:
        asset = registry[horse['id']]
        horse.update(asset_status=asset['assetStage'], asset_url=asset['url'])
registry=json.loads((HERE/'asset-registry.json').read_text(encoding='utf-8'))
env=json.loads((HERE/'environment-v14.json').read_text(encoding='utf-8'))
manifest['status']='environment_v14_twelve_time_periods'
manifest['culture_report']='culture-v12.json'
manifest['experience']['views']=['全卷','清流近看','左侧马群','柳下灰马','柳冠近看','牧者花马']
manifest['implemented']=[v for v in manifest['implemented'] if v!='five_camera_presets']+['six_camera_presets','physical_clear_water','three_mountain_ridges','seasonal_lighting','four_season_cycle','cultural_reading_tour','coat_color_interpretation','palmate_autumn_foliage','continuous_peripheral_meadow','rocky_taihang_inspired_ridges','advected_whitewater','twelve_time_periods','moonlight_shadows','independent_day_night_cycle']
manifest['environment_preview']='environment-v11.html'
manifest['motion_review']='../../motion-review.html'
manifest['implementation']='iteration-v14.txt'
manifest['environment_report']='environment-v14.json'
manifest['latest_intake']='asset-intake-02.txt'
manifest['motion_intake']='motion-intake.json'
for e in manifest['environment']:
    asset=next((a for a in registry['assets'] if a['id']==e['id']),None)
    if asset:e.update(asset_status=asset['assetStage'],asset_url=asset['url'])
manifest['annotation']['world_positions']='runtime anchors available; painting projection calibration pending'
for h in manifest['horses']:
    asset=next(a for a in registry['assets'] if a['id']==h['id'])
    anchor=next(a for a in env['figureAnchors'] if a['id']==h['id'])
    h.update(asset_status=asset['assetStage'],asset_url=asset['url'],world_position_m=[anchor['x'],anchor['y'],anchor['z']])
(HERE / "scene-plan.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
body = markdown.markdown((HERE / "plan.md").read_text(encoding="utf-8"), extensions=["tables", "fenced_code", "toc"])
buttons = "".join(f'<button type="button" data-horse="{i}" aria-pressed="{str(i == "H06").lower()}">{i} {html.escape(n)}</button>' for i, n, *_ in horses)
markers = "".join(f'<g class="marker {"selected" if i == "H06" else ""}" data-mark="{i}" transform="translate({uv[0]*1600:.1f},{uv[1]*502.18:.1f})"><circle r="15"/><text y="5">{i[1:]}</text></g>' for i, n, uv, *_ in horses)
page = '''<!doctype html>
<html lang="zh-Hans"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>郊原牧马图 WebGPU 场景策划</title>
<style>
:root{color-scheme:light;--paper:#f6f2e8;--ink:#302e26;--muted:#686355;--line:#d7cfbb;--accent:#785139}
*{box-sizing:border-box}body{margin:0;background:var(--paper);color:var(--ink);font:16px/1.85 system-ui,"Microsoft YaHei",sans-serif}
header{padding:48px max(24px,calc((100vw - 1280px)/2));background:#eae2cf;border-bottom:1px solid var(--line)}
.eyebrow{font-size:13px;letter-spacing:.15em;color:var(--accent)}header h1{font-family:Georgia,"SimSun",serif;font-weight:500;font-size:clamp(30px,4vw,54px);line-height:1.3;margin:12px 0}header p{max-width:850px;margin:16px 0 0}
main{max-width:1344px;margin:auto;padding:32px}.map{position:relative;margin-top:16px}.map img{width:100%;height:auto;display:block}.map svg{position:absolute;inset:0;width:100%;height:100%}
.marker circle{fill:#eee6d2;stroke:#5e4935;stroke-width:2}.marker text{font:500 13px system-ui;fill:#302e26;text-anchor:middle;pointer-events:none}.marker.selected circle{fill:#724931;stroke:#fff1d7;stroke-width:3}.marker.selected text{fill:#fff1d7}
.choices{display:flex;flex-wrap:wrap;gap:8px;margin:20px 0}button{font:inherit;font-size:14px;padding:8px 12px;background:transparent;color:var(--ink);border:1px solid var(--line);border-radius:3px;cursor:pointer}button[aria-pressed="true"]{background:var(--accent);color:#fff8ec;border-color:var(--accent)}button:focus-visible,a:focus-visible{outline:3px solid #926c2e;outline-offset:3px}
.detail{background:#eae2cf;padding:20px 24px;border-left:3px solid var(--accent)}.detail h3{margin:0 0 6px}.detail p{margin:4px 0}.note{font-size:14px;color:var(--muted)}
nav{display:flex;gap:20px;flex-wrap:wrap;padding:22px 0;border-bottom:1px solid var(--line)}a{color:#745030;text-underline-offset:4px}
article{max-width:1040px;margin:40px auto}article>h1{font-size:29px;font-weight:500}h2{font-size:24px;font-weight:500;margin:48px 0 20px;padding-top:16px;border-top:1px solid var(--line)}h3{font-size:19px;font-weight:500;margin-top:28px}p{margin:14px 0}li{margin:9px 0}table{border-collapse:collapse;width:100%;font-size:14px;line-height:1.7;margin:20px 0}th,td{text-align:left;vertical-align:top;padding:12px;border-bottom:1px solid var(--line)}th{background:#eae2cf;font-weight:600}pre{white-space:pre-wrap;overflow-wrap:anywhere;background:#ebe5d7;padding:20px;font-size:14px}code{overflow-wrap:anywhere}footer{padding:24px 0;border-top:1px solid var(--line);color:var(--muted);font-size:14px}
@media(max-width:700px){main{padding:16px}header{padding:30px 18px}table{display:block;overflow:auto}th,td{min-width:140px}.map{overflow-x:auto}.map-inner{min-width:950px;position:relative}.detail{padding:16px}button{min-height:44px}article{margin-top:24px}}
@media print{header{padding:20px}main{padding:0}.choices,nav{display:none}body{background:white}h2{break-after:avoid}tr{break-inside:avoid}.map-inner{min-width:0}article{max-width:none}}
</style></head><body>
<header><div class="eyebrow">制作策划 · 2026.10.14 · 十二时辰 · 四季光照</div><h1>郊原牧马图<br>WebGPU 场景策划</h1><p>本轮新增十二时辰光照，可手选晨、午、暮、夜，或开启四分钟昼夜流转；太阳、月光、天色、雾与水面亮度共同变化，并与四季独立组合。<a href="iteration-v14.txt">本轮记录</a>。</p><p>此前新增“画中有意”五段文化导览、八马毛色说明与牧者阅读卡。左坡、柳根已补入随季节变化的掌裂红叶；<a href="iteration-v14.txt">本轮制作记录</a>与<a href="culture-v12.json">考据对应</a>可查。</p><p>此前已接入清澈透射河水、三层薄雾远山、季节光线与四季轮换。<a href="environment-v11.html">查看四季预览</a>，或进入场景选择“清流近看”。</p><p>左侧杂木已替换为新 T02 枝干模型，累计接入 12 件模型、审查 26 段视频。草层、柳冠与远岸已按设定加密；H06 已播放待机与采食序列；H07 新增独立绑定、待机与回望回正。柳冠改为错落下垂枝组，H06 尾根重做贴合表面的连续毛束。新增柳冠近看。H01–H05、H08 与牧马人已完成独立骨骼动作样片；动作检查页可切换全部九个角色，H04 平地慢走可独立检查。H01/H02 已加入屈肢定姿与起身过渡；H04/H06 可点击“沿岸慢行”沿短路径行走并停步。牧马人增加独立袖口控制和衣袖近景视角。</p></header>
<main><section aria-labelledby="map-heading"><h2 id="map-heading">八匹马的原画定位</h2><p class="note">数字对应制作编号 H01–H08；标记为目视躯干定位，不是分割或落蹄坐标。选择下方马匹查看首版安排。</p>
<div class="map"><div class="map-inner"><img src="../../郎世宁_郊原牧马图卷_6882x2160.jpg" width="6882" height="2160" alt="郊原牧马图原画，八匹马从左侧坡石之间分布到右侧牧者身旁"><svg viewBox="0 0 1600 502.18" role="img" aria-label="八匹马在原画上的位置编号">__MARKERS__</svg></div></div>
<div class="choices" aria-label="选择马匹">__BUTTONS__</div><div class="detail" aria-live="polite"><h3 id="horse-title">H06 柳左灰白马</h3><p id="horse-note">首个样片主角；灰斑臀部、深色下肢</p><p id="horse-motion">动作：待机、慢走、逐蹄接地、耳动、甩尾</p><p class="note" id="horse-stage">首批制作阶段：P1 · 原画定位：0.516 / 0.724</p></div></section>
<nav aria-label="文件"><a href="../../index.html">进入 WebGPU 场景</a><a href="video-prompts/index.html">马匹视频提示词</a><a href="visual-v2/index.html">沿水岸牧马 · 最新设计</a><a href="visual-v1/index.html">第一版与单件参考</a><a href="plan.md">策划 Markdown</a><a href="scene-plan.json">制作配置 JSON</a><a href="asset-registry.json">素材映射</a></nav>
<article>__BODY__</article><footer>当前为静态搭建阶段。预算、工时、接地阈值和帧率均为制作目标；浏览器功能检查不等于美术、动画或目标硬件性能验收。</footer></main>
<script>
const horses=__DATA__;
document.querySelectorAll('[data-horse]').forEach(button=>button.addEventListener('click',()=>{
 const horse=horses.find(h=>h.id===button.dataset.horse);
 document.querySelectorAll('[data-horse]').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));
 document.querySelectorAll('[data-mark]').forEach(m=>m.classList.toggle('selected',m.dataset.mark===horse.id));
 document.getElementById('horse-title').textContent=horse.id+' '+horse.name;
 document.getElementById('horse-note').textContent=horse.silhouette_note;
 document.getElementById('horse-motion').textContent='动作：'+horse.behavior_note;
 document.getElementById('horse-stage').textContent='首批制作阶段：'+horse.first_stage+' · 原画定位：'+horse.reference_uv.map(n=>n.toFixed(3)).join(' / ');
}));
</script></body></html>'''
page = page.replace("__MARKERS__", markers).replace("__BUTTONS__", buttons).replace("__BODY__", body).replace("__DATA__", json.dumps(manifest["horses"], ensure_ascii=False))
(HERE / "index.html").write_text(page, encoding="utf-8")
print("Written scene-plan.json and index.html; horses:", len(horses))

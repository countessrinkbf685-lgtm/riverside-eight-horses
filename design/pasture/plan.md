# 郊原牧马图 WebGPU 场景策划方案

2026 年 10 月 13 日 · 沿水岸牧马修订版

晚间素材更新：T02 新枝干模型已替换左侧两棵占位树，独立叶簇按树枝表面生成；新增 8 段马视频已审查并关联动作提示词。累计 12 件模型、26 段视频。[本次接入记录](asset-intake-02.txt)、[T02 裸枝检查](../../asset-review.html?asset=T02)、[动作制作队列](motion-intake.json)。

实施进度：场景已完成第三轮河岸、柳冠、草斑与远岸迭代；H06 已制作 46 骨骼、Idle 与 Walk 样片，主场景播放 Idle。[动作检查页](../../motion-review.html) 可查看平地慢走、骨架和蹄底状态。平地数值验证通过，正式关节重拓扑、H01/H02 画中定姿、地形行走和性能目标尚未验收。[本轮记录](iteration-v3.txt)、[视频素材审查](video-prompts/index.html) 与 [资产映射](asset-registry.json) 已同步。

地貌与植物第二轮：依据概念图增加左侧岩坡、柳根缓丘、前景低脊、不规则岸缘、草土分区和碎石；参考 FABOTANIC 的弯曲叶片与枝干构造，引入六类草本/灌木、左侧程序杂木与低矮远岸植被。T02 暂用程序结构，等待正式枝干模型。细节与统计见 [迭代说明](environment-v2.txt) 和 [配置与几何统计](environment-v2.json)。

将《郊原牧马图卷》做成“沿水岸牧马”的三维画卷：八匹马、一位牧者和巨柳位于近岸草地，一条缓弯河道从左侧岩石后方经过马群背后，向画幅右侧延伸。以有限视差、轻微动物动作和枝叶风动赋予画面生命。首版采用完整三维近景与角色、独立河道及岸坡、绘画式远景；先做中央灰白马与柳根的局部样片，再扩展全卷。场景从第一阶段使用统一 WebGPU 渲染器。

本方案覆盖构图、资产制作、马匹绑定与动画、场景装配、WebGPU 架构、性能预算和阶段验收。尺寸、坐标、面数及工时均为制作起点，需经灰盒和样片校准。原画未表现的背面和纵深属于创作补全。

## 原画构图与观看方式

实际参考文件为项目根目录的 `郎世宁_郊原牧马图卷_6882x2160.png`，画幅约 3.186∶1。保留完整 PNG 作为取色与局部研究母版，网页参考展示使用现有 JPG；运行时不默认加载 23.6 MB 的原始 PNG。

画面主要由四部分构成：左侧坡石及密集马群，中央偏左的马群过渡，中央偏右的巨柳与两匹浅色马，右侧花马和牧者。上部大面积低对比背景、柳枝的垂线、下方横向坡石共同维持安静的节奏。

建议设置三个观看状态：

| 状态 | 用户体验 | 构图约束 |
| --- | --- | --- |
| 全卷观画 | 入场先呈现完整横卷；可切换原画对照 | 在 16∶9 屏幕保留上下留白，不拉伸、不裁掉右侧牧者 |
| 局部游卷 | 拖动横向移动，选择左侧马群、柳下灰马、牧者花马三个停驻点 | 固定轨道与小角度观察，保持地平线稳定；用预设镜头匹配原画各段 |
| 近看一马 | 点击马进入有限范围近景，观察花纹、呼吸及轻动作 | 初始允许约 ±15° 方位变化；完成背面检查后才能扩大范围 |

移动端默认进入可横向游览的局部视图，保留“全卷”入口。提供“静观”“微动”两档；静观恢复原画锚点与姿态并停住枝叶，微动允许呼吸、转耳、低头和少量短步。镜头进入近景、返回和用户打断都有明确状态，返回保存的游卷位置。

首版把“忠于构图”放在自由漫游之前。完整 360° 游园需要补足树冠背面、远处地形与全部角色背面，列入后续扩展。依据原图蓝灰横带的连续性、岸缘遮挡和左侧岩石关系，采用用户确认的缓弯河道设计；这是场景解释，河宽、水深、流速与流向并非原画能够确定的测绘事实。最新气氛图与布局见 [沿水岸牧马设计](visual-v2/index.html)，[第一版](visual-v1/index.html) 保留对照。

## 八匹马的身份与动作安排

以下名称仅为制作编号，毛色描述依据当前扫描图，不是历史马名或品种鉴定。坐标以原图左上角为原点，u 向右、v 向下，范围均为 0–1；定位点是目视标注的躯干附近参考点，不是蹄底或精确分割。

| 编号 | 原画位置 u v | 身份与轮廓重点 | 原画姿态及首版处理 |
| --- | --- | --- | --- |
| H01 | 0.192 / 0.646 | 左前白马，低头，躯体与黑马交叠 | 低首贴近地面的复杂姿态；先完成静态关键姿态，核对四肢与遮挡后再做过渡 |
| H02 | 0.222 / 0.758 | 左前黑马，浅色鬃尾及腿部细节 | 曲颈屈肢，与 H01 构成动态组合；先保留画中姿态，微动限呼吸、耳尾 |
| H03 | 0.286 / 0.504 | 后排深栗色马，背向观察者 | 转头、尾动；必须补足背视轮廓，不能只验证侧面 |
| H04 | 0.306 / 0.610 | 中左黄褐马，长侧面轮廓 | 待机、低头和一小段慢走；限制在本组附近活动 |
| H05 | 0.373 / 0.574 | 中左白马，头颈低垂 | 低头采食、抬头；口鼻与草地保持可信关系 |
| H06 | 0.516 / 0.724 | 柳左灰白马，臀部斑驳，朝右 | 首个样片主角；待机、慢走、耳动、甩尾，重点检查肩髋和蹄部 |
| H07 | 0.591 / 0.611 | 柳旁浅褐马，接近正面 | 待机、轻转头；检查胸部、前肢间距及被树遮挡的关系 |
| H08 | 0.849 / 0.683 | 右侧棕白花马，大块不规则白斑 | 低头采食，与牧者成组；花斑位置逐块匹配可见侧，不随机换色 |

八匹马应具有独立身份和动画相位。以两种基础体型和一套可重定向的骨架规范起步，每匹保留独立体态、花纹、鬃尾和画中姿态；H01、H02 若共享拓扑无法承受复杂屈肢，应制作专门修形或独立拓扑。不要通过非等比拉伸把一匹马直接变成八匹。

牧者 P01 位于约 (0.917, 0.705)。服装轮廓、头部和与花马的距离必须保留；第一版以站姿和轻微呼吸为主，手部动作需核对原图，不预设缰绳、刷具或骑乘剧情。人物和花马分别建模，避免生成一个粘连整体。

## 从 balcony 继承的方法

`design/balcony` 的资料包含早期策划与多轮实施记录。制作依据应优先采用最新实施结果，再用源代码核对方法。

| balcony 中的方法或结果 | 本项目的使用方式 |
| --- | --- |
| 气氛图、布局、单件参考图、提示词、资产清单分别保存 | 保留同样的资产追踪结构，每匹马和主树都有独立条目 |
| 一张单品图生成一个静态资产，保留原始 GLB，再做网页版 | 八马、牧者、树干、岩石分开制作，整体画卷只用于构图和风格 |
| GLB 已带坐标转换，重复旋转曾导致模型侧倒 | 导入时先检查世界包围盒及坐标轴，不统一补一个 90° 旋转 |
| 家具用等比缩放与真实表面接触校准，包围盒底部不一定是承载面 | 马以肩高、蹄底标记和地形高度校准；树以根颈、石块以实际接触面校准 |
| prepare-cat → Blender rig → pack-cat | 重建为 prepare-horse → rig-horse → pack-horse，沿用报告与原件保留方式 |
| 绑定前按法线和 UV 误差减面；绑定后压贴图，避免随意改网格 | 动画拓扑和各档 LOD 提前规划，绑定后改变拓扑必须重新转移和验证权重 |
| 离线视频参考重建骨骼动作，网页播放 GLB | 视频用于判断马的重心、落蹄和节奏；不当作自动动捕或完整三维真值 |
| 运行时高度缓存、逐脚落点锁定、位移与步频同步 | 制作 horseContacts，加入马蹄方向、坡面、球节限制和步态接触标记 |
| 固定安全路线、有限注视和过渡混合 | 八马采用小范围行为区域、通行预约与分离约束；无需先做通用导航 |
| 模型检查页、实际画面截图、动画关键帧与浏览器报告 | 建立单马检查、全卷构图对照和目标硬件性能报告，分开验收 |

阳台猫第三轮记录为 66,996 三角面、23 根骨骼、5 个动画片段、11,904,308 字节。它证明了制作链路可行，也说明大量修形会增加资源体积。这些数据不能作为八马场景的现成绩或马骨架规格。

`src/balcony/main.js` 当前实例化 `WebGLRenderer`，海面和后处理仍有 `ShaderMaterial`。新项目继承场景组织和动物制作经验，自第一天建立 WebGPU 管线；旧 GLSL 材质及合成逻辑需重写为适配 WebGPU 的节点材质/TSL，不能只替换渲染器名称。阳台记录中的 1080p 60 FPS 目标也尚未通过验收。

## 空间搭建与资产拆分

统一米制，Y 向上；世界 X 沿画卷从左向右，Z 正向朝观众，远景沿负 Z 展开。每个资产声明自身前向轴，导入后通过根节点做一次确定转换。马以站姿肩高约 1.35–1.55 m 为校准起点，牧者约 1.65–1.75 m；这些是场景比例假设。

灰盒中的近岸角色区域沿用原有站位，整体范围扩展为约 24 m 宽、18 m 深，以容纳后方河道与对岸；河道继续向左右画幅外延伸。初始河宽约 4.2 m，是沿世界 Z 方向量取的设计宽度，投影后需校准。巨柳约 8–10 m 高，树冠允许超过画面上沿。主视角先使用正交相机匹配原图，再比较长焦透视版本；根据马匹屏幕尺寸调节正交窗口或焦距，不把整张原图直接摊成水平地面。

从原画到空间分三步：标记每匹马的蹄底、头部、遮挡边界和树根；人工分配浅层纵深；再沿相机射线求取地形上的锚点并微调。单张绘画没有唯一三维解，应以主机位投影吻合、局部游览不穿帮作为约束。当前躯干定位点只用于资产索引，不能直接换算为世界坐标。

| 资产组 | 制作方式 | 首版数量与预算起点 |
| --- | --- | --- |
| 地形 G01 | 可编辑低起伏网格，草土混合材质；独立碰撞高度场 | 1 主块加边缘块；总 20k–40k 三角面 |
| 河道 W01 | 独立低细分水面带，沿近远岸曲线构造；TSL 水纹与灰绿反射 | 初始 2k–5k 三角面，纳入整场总预算 |
| 岸坡 G02 | 近岸连续草土坡、局部湿土暗线和对岸低坡；左岩与岸坡衔接 | 初始 5k–10k 三角面，纳入地形预算 |
| 主柳 T01 | 主干与关键分枝按原画轮廓雕建，可用单件生成作底稿；细枝曲线重建 | 主干、枝叶合计约 35k–60k；根部必须完整 |
| 左侧杂木 T02 | 两种树形，保留红叶和稀疏枝条；叶簇实例化 | 2–3 组，总 15k–30k |
| 坡石 R01–R03 | 3 个不同轮廓的独立石块与一段长坡石，拼接后消除重复感 | 可见 20k–35k；小凹凸烘焙法线 |
| 草丛 V01–V03 | 3 类疏密草簇，结合地面笔触；由区域遮罩控制密度 | 实例化，近景保轮廓，远景融合进地表 |
| 八马 H01–H08 | 独立蒙皮实例，共享可复用网格/骨架规范，独立毛色与相位 | LOD0 每匹 35k–50k；LOD1 12k–20k；LOD2 3k–6k |
| 牧者 P01 | 单人模型，衣袖与衣摆局部骨骼或小幅修形 | 15k–25k；近看手部再增细节 |
| 远景 B01 | 2–3 层低起伏网格与专用绘画纹理 | 约 5k–15k；覆盖全部允许镜头 |

主柳不宜一次生成成“树干＋密叶＋土地”的封闭团块。树干、枝条、叶簇和地面分开，柳条依据长度与弯曲层级响应风。草和叶使用透明裁切而非大面积混合透明，减少排序错误与过度绘制。

远景使用单独绘制或清理后的背景图层。如果直接从原图提取，必须去除原有马、人、树的残影并补洞；移动机位时不能出现三维角色与背景中的同一角色重影。绢纹、裂纹等载体老化只作为可调展示层，不能投射到马的皮毛和树皮上。

河道在中景保持连续，但允许被左岩、马身、柳干与低枝遮挡；近岸与对岸均可辨，水面延出画幅两端。柳树根部、马蹄、低头马的口鼻和牧者脚底均在近岸陆地，原有吃草与嬉戏姿态保留。活动路径按岸线设置至少约 0.8 m 的身体边界缓冲，并检查实际蹄点；左侧岩石与柳根继续作为避让物。河岸边缘用草地到裸土到水面的渐变和小高差表达，避免整齐砌石岸线。

## 马匹建模与动画生产线

### 从画中身份到可绑定模型

1. 建立每匹马的身份卡：原图裁切、可见花纹、头身比例、鬃尾、画中姿态、遮挡位置。对不可见另一侧的毛色单独标记“补全”，不当作原画事实。
2. 先为 H06 制作中性站姿三分之四参考图，再制作同一身份侧视辅助图；背景统一浅灰、光照柔和，四肢相互分离，完整保留耳、蹄与尾。复杂画中姿态留到绑定后恢复。
3. 一次向实际可用的 Hunyuan/Tripo 类图生 3D 工具输入一个角色主图。侧视图用于身份检查，是否支持校准多视图以实际工具为准，不把多匹马或多视图拼成一张输入。
4. 原始高模进入 originals；清理腿间粘连、腹部空洞、悬空碎片、重复表面；独立整理眼、鬃、尾。保留 baseColor、normal、roughness，消除强光和地面阴影烘焙。
5. 先重拓扑/减面，再 UV 与贴图烘焙，再绑定。肩、肘、膝、髋、后膝、飞节、球节附近保留连续变形环；鬃尾采用少量带状网格或发片，首版不做逐根毛发。
6. 导出可编辑 Blender 文件、无损中间 GLB 和网页 GLB。每项记录真实三角面数、纹理规格、骨骼数、动画时长和包围盒，不能用减面比例替代实际统计。

### 马的骨架与接地

预计使用约 45–65 根变形骨骼，最终随鬃尾和面部需求调整。躯干包括 root、骨盆、分段脊柱、胸腔、颈链、头；四肢分别保留肩胛/髋、上下肢、腕或飞节、球节与蹄控制，耳、眼睑、下颌及尾链另设控制。控制骨骼可多于导出变形骨骼。

猫的两段腿求解只可借鉴落点方法。马的长肢比例、后膝与飞节方向、球节弹性和蹄滚动需重新设计；用分段约束或多段 IK 加限制角度，先验证解剖，再调求解器。不能把猫的 23 骨架等比拉长。

慢走为四拍落蹄，例如左后、左前、右后、右前依次落地；相位、支撑时长与步幅以选定马参考为准，不直接复制猫的 2 秒周期和 72% 支撑期。动画片段附接触标记，支撑期锁定世界蹄点，摆动期沿曲线抬蹄；地形同时提供高度与法线，身体高度和倾斜作低通平滑。

采用原地走动画，路径负责位移，播放速度由真实地面速度和标定步幅换算。起停时位移和 Walk 混合权重同步。IK 超过腿部可达范围时缩短步幅、放慢转弯或提前重新落蹄，不硬拉长腿。对坡石、树根设不可行走区域；草叶不作为蹄底碰撞面。

### 动作片段与行为

| 阶段 | 片段 | 使用方式 |
| --- | --- | --- |
| 单马样片 | Idle、Walk | 先证明轮廓、重心、四蹄接地、起停和循环正确 |
| 首版通用 | GrazeDown、GrazeLoop、GrazeUp、Look | 采食有入姿和出姿；颈、背、前肢协调，不能只旋转头部 |
| 首版微动作 | EarFlick、TailSwish、Breath | 局部叠加，随机间隔与相位，避免八马同步 |
| 画中定姿 | PoseH01、PoseH02、PoseH03 等 | 绑定后重建；复杂姿态先静态微动，独立验收再增加进入/退出 |
| 后续扩展 | 复杂屈肢过渡、卧下起身、较大范围行走 | 必须增加真实马参考与修形；不复用猫的伏卧和起身动作 |

行为可从 Idle → GrazeDown → GrazeLoop → GrazeUp → Idle，或 Idle → Walk → Idle 组成。一次性片段按真实 duration 和完成事件转移，首尾姿态逐对检查。八马全卷默认全部留在构图区域；可移动角色任一时刻最多两匹，短程约 0.5–1.5 m，区域边界随灰盒校准。H01/H02 和 H08/牧者作为构图组合整体约束。

只有八个角色，路线和相互距离可在 CPU 上计算。路径用胶囊近似身体范围，加局部通行预约；阻塞时停下或退出行走，防止交叉穿体。近景注视约束限制颈部转角，低头采食期间关闭互相冲突的注视层。

AI 视频或实拍视频都只作为动作参考：固定机位、完整四蹄、连续两轮步态，无切镜；按关键帧检查落蹄与重心，再由动画工具拟合、修正、烘焙。看不见的远侧肢体需要人工判断。首版只做慢走，避免把跑步、腾跃和复杂卧起同时塞进制作链。

## 绘画感与 WebGPU 渲染

目标是淡设色、柔和体积和有控制的细线，而不是现代牧场的高饱和写实外观。毛色与树石形体承担细节，画面统一调色保留原图赭黄、灰绿、墨褐和浅蓝灰关系。先匹配数字参考图的观看感受；不凭空声称还原绢本未老化时的真实颜色。

建立一盏低对比主光与环境补光，软化落地阴影；马眼保留很小高光，身体不做塑料式亮面。材质采用 PBR 参数约束，再用 TSL 控制漫反射层次、粗糙度和有限色域。白马仍需要体积，不能为“平面画感”把法线和阴影全部关闭。

细线优先来自纹理和几何轮廓，局部边缘效果采用深度/法线/材质遮罩控制，首版关闭全屏粗黑描边。材质笔触锚定在 UV 或物体空间，减少镜头移动时纹理游移。背景雾与物体风格使用同一色彩参数。后处理最多从轻调色和可选绢纹开始，效果可逐项关闭对照。

技术建议使用 Vite、TypeScript、Three.js 的 WebGPU 入口、节点材质/TSL、GLTFLoader、AnimationMixer。锁定具体依赖版本，先验证蒙皮、修形、阴影、KTX2 和后处理的组合再扩展。参考项目的 Three.js 版本范围为 `^0.186.0`，不直接认定它就是新项目最终锁定版本。

一套 canvas、一套相机体系、一套深度与色彩空间，统一渲染地形、动物、植物和远景。基础色使用 sRGB 解码，法线/粗糙度作为线性数据，最终显示只做一次色调映射与颜色转换。

W01 河道使用同一 WebGPU 渲染器、深度与色彩管线，首版以平静水面、低幅法线扰动和柔和天空反射为主；局部破碎柳影用于帮助识别水面。水体颜色保持低饱和灰绿和蓝灰，先通过两岸轮廓、长细水纹与岸边暗线表达水域。暂不需要 FFT 海洋、激烈波浪或实时全场平面反射；是否加入额外反射通道由样片效果与性能决定。水流方向为可调设计参数，不从原画武断指定。

| 模块 | 职责 |
| --- | --- |
| renderer | 初始化实际 WebGPU 后端、资源释放、设备丢失处理、质量档位 |
| scene / layout | 主机位、地形、原画锚点、资产加载及装配 |
| horseRig / horseContacts | 动画混合、接触相位、地面采样、骨骼约束与姿态修正 |
| herdDirector | 各马行为区域、通行预约、错峰微动作、恢复画中姿态 |
| foliage | 主干固定、柳枝分层形变、实例化草叶与距离裁剪 |
| river / banks | 河道曲线、水面材质、两岸衔接、岸缘碰撞与活动区缓冲 |
| materials / post | 统一色域、阴影、背景空气透视与可选绢纹 |
| cameraDirector / interaction | 全卷、游卷、近景、返回、点击遮挡与静观模式 |
| diagnostics | 资产统计、后端识别、帧耗时、接触误差与截图 |

GPU 优先负责渲染和大量草叶的实例变形。首版用 TSL 顶点动画即可；仅当实例数量和实测瓶颈需要时，才引入 compute 风场/裁剪。八匹马的行为、相位和 IK 放在 CPU，避免每帧从 GPU 回读数据；地形高度场由 CPU 与渲染共享同一来源。

动画角色用支持骨骼独立克隆的方式创建，每匹有独立骨骼姿态和 mixer；静态树石才常规实例化。不能把普通 InstancedMesh 当作自动支持八套独立蒙皮动画。LOD 切换保留姿态、时间和接触状态，用距离迟滞减少闪跳。

启动检查 `navigator.gpu` 和 adapter，验证实际 WebGPU 后端，不能把库自动回退 WebGL 当成 WebGPU 验收。首版在不可用设备提供原画浏览及明确说明；若后续建设 WebGL 兼容版，应单独维护和验收。正式部署使用 HTTPS，开发使用 localhost。

## 性能和加载预算

下列均为待实测目标。面数以主颜色通道可见三角面统计，阴影通道额外开销另计；下载体积与显存占用分别记录。

| 项目 | 桌面标准档目标 | 低档目标 |
| --- | --- | --- |
| 测试分辨率 | 1920×1080，DPR 1 | 1280×720，DPR 1 |
| 帧耗时 | 热身后 p95 ≤16.7 ms | 热身后 p95 ≤33.3 ms |
| 可见三角面 | 250k–450k；近景仅 1–2 马用 LOD0 | 100k–200k |
| 绘制调用 | 含阴影/后处理目标 ≤180 | 目标 ≤100 |
| 马匹纹理 | 主角 baseColor 2K，normal/roughness 1K–2K | 1K，远景 512 |
| 阴影 | 单主光 2K 阴影图，覆盖当前主要观看区 | 1K，减少远处投影者 |
| 冷启动资源 | 首次可交互总传输 ≤20 MB | ≤12 MB |
| 全部资产 | 逐步加载后压缩传输 ≤60 MB | 按需停留在低 LOD |
| 显存工作集 | 目标 ≤512 MB，记录纹理和渲染目标估算 | 目标 ≤256 MB |

采用 KTX2/Basis 纹理与经验证的 Meshopt 压缩；原始模型和可编辑文件不进首屏。相同体型尽量共享网格与动画数据，毛色按需加载；每匹独立贴图的内存应进入清单。只渲染当前可见区域的高精度叶簇，优先降低叶片透明过绘、阴影覆盖和后处理分辨率。

降档顺序为渲染分辨率、草叶密度、阴影精度、远景 LOD、次要微动作更新频率；近景主角的轮廓与接地优先保留。性能记录包括 GPU、浏览器版本、实际后端、窗口大小、DPR、质量档、加载状态及温度/供电条件。软件渲染、录屏限帧和无头浏览器结果不能直接代替目标设备体验。

## 分阶段制作与通过条件

| 阶段 | 具体交付 | 通过条件 | 初步工作量 |
| --- | --- | --- | --- |
| P0 原画标注和灰盒 | 蹄底及遮挡标注、主镜头、地形、八马代理、主柳代理；WebGPU 初始化 | 全卷无遗漏，主要锚点投影偏差目标 ≤画幅宽 2%；三个局部镜头可返回 | 2–3 人日 |
| P1 单马与柳根样片 | H06 正式资产、Idle/Walk、接地、柳根坡石和基础绘画材质 | 近看无明显粘腿/拉伸，四拍可辨，走停转弯不滑；画面风格成立 | 4–7 人日 |
| P2 全卷静态成形 | 八马独立身份、牧者、主柳杂木、坡石、草与远景 | 原画机位轮廓、层次、毛色和遮挡可对照；静观姿态完整 | 6–10 人日 |
| P3 微动与游卷 | 采食和局部动作、错峰行为、限定路径、三个镜头状态 | 连续 10 分钟无穿体与越界；八马不齐步，返回构图稳定 | 4–7 人日 |
| P4 优化与美术验收 | LOD、压缩、低档、性能记录、前后对照、异常处理 | 目标硬件达对应档位；美术与技术分别验收 | 3–5 人日 |

总计约 19–32 人日，假设有一位熟悉 Three.js/WebGPU 的开发者与可投入的动物资产制作能力。生成排队、复杂马体重拓扑返工、H01/H02 大动作过渡、完整自由漫游和正式公开发布另计。阶段通过后才扩大资产批量，P1 不成立时优先修单马，不同时生成剩余七匹。

验收应保留三类证据：原画与场景同机位对照；每匹马多视角和动作关键帧；实际目标设备的浏览器日志与性能轨迹。项目能构建、模型能加载、画面好看、动作自然、性能达标分别判断。

动画检查以实际变形后的蹄底为准，不只测骨骼原点。平整测试台上，支撑期蹄底离地或穿地绝对误差目标 ≤1 cm，单次支撑水平漂移 ≤2 cm；在设计坡地上另测并记录最大值。循环缝、转弯、采食入出姿、恢复画中定姿均录像抽查。数值通过后仍需近景目视检查。

场景检查包括主机位完整八马、牧者不被误裁切、柳根不漂浮、点击不穿透树石、窄屏全卷可达、静观真正暂停、页面失焦暂停重计算、窗口缩放与资源释放正常。性能跑全卷、H06 近景和最密左侧马群三条固定路线，各热身后采样至少 60 秒，分别报告中位数与 p95。

## 首批参考图与动作提示词

下列保留最初策划模板。已按现有素材补充 [逐马视频提示词](video-prompts/index.html)：16 条可生成动作与 2 条等待画中定姿参考的后续动作。每匹参考图必须搭配身份卡和原图裁切；生成出的解剖与花纹需要人工检查。现有 H06 视频仅作步态研究，首尾裁切和接地仍需检查。

**H06 主参考图**

Use the supplied painting crop as the visible coat and silhouette reference for ONE adult gray-white horse. Preserve the mottled gray hindquarters, darker lower legs, long gray mane and tail, compact natural build and calm expression. Reconstruct a neutral standing pose for rigging: all four hooves planted and individually readable, clear gaps between the legs, neck relaxed, head aligned with the body, tail separated from the hind legs. Full body three-quarter side view, long lens, minimal perspective distortion, complete ears and hooves and tail, generous margins. Soft neutral diffuse studio lighting and a plain light gray background, only a faint contact shadow. Plausible equine anatomy, fine short coat, no saddle, no rider, no added tack, no props, no text, no multiple views. Do not reproduce silk weave, cracks, yellowed paper, painted scenery or hard baked shadows on the animal. Unseen markings are a design completion and must remain consistent in later views.

**H06 辅助侧视图**

Use the approved primary horse image as the identity reference. Show the SAME horse in a nearly orthographic full-body side profile, neutral standing rest pose, four hooves distinguishable with slight far-leg staggering. Preserve body proportions, head shape, visible coat patches, mane and tail. Same neutral lighting and background, no pose action and no extra animal. This is an auxiliary modelling check, not a calibrated reconstruction.

**马匹慢走参考视频**

Use the approved horse reference as the exact character identity. One adult horse walks calmly at a constant slow speed through two complete four-beat walk cycles, full body and all four hooves visible throughout. Fixed side camera with a slight three-quarter angle, neutral level floor and soft diffuse lighting. Clear sequential hoof contacts, believable shoulder and pelvis motion, natural weight transfer, no hoof sliding during support, no exaggerated knee lift. No trot, no canter, no cuts, no camera movement, no extra limbs, no melting or changing coat markings. Include a brief still standing interval before and after walking. Keep the full mane and tail visible.

**主柳树干参考图**

Use the painting crop to preserve the leaning trunk silhouette, root spread, weathered bark rhythm and major fork directions of the dominant willow. One isolated complete tree trunk with main branches and readable roots, no ground slab, no grass, no horses, no people and no dense leaf canopy. Neutral diffuse lighting on a plain gray background, complete asset with generous margin. Preserve the asymmetry from the visible painted side; unseen structure is a coherent design completion. Fine drooping twigs and leaves will be built separately.

## 建议目录和交接内容

```text
design/pasture/
  plan.md                    策划正文
  index.html                 本地阅读版与原画定位
  scene-plan.json            八马身份和制作配置草案
  references/                后续原图局部、身份卡、参考视频
  prompts.json               后续每次生成的提示词与输入记录
  originals/                 后续原始生成资产
artifacts/horse/              后续 Blender、动作分解和检查报告
public/models/horses/         后续网页用模型与 LOD
public/models/environment/    后续树石和牧者
src/pasture/                  后续场景与运行时模块
scripts/                     后续资产处理与检查脚本
```

当前已建立 H06 的可编辑 Blender 绑定文件及 Idle/Walk 动作样片，并完成平地蹄底检查。下一阶段重点是关节拓扑与变形美术、自然步幅及起停、非平地落蹄，以及 H01/H02 原画定姿；当前样片不等于整卷动画或最终美术验收通过。

## 参考资料

- [原画 PNG](../../郎世宁_郊原牧马图卷_6882x2160.png) 与项目已有 `detail_horse.jpg`、`detail_herder.jpg`。
- [balcony 场景策划](../../../DelaunayVoronoiFokkerPlanck/design/balcony/scene-plan.json)：资产拆分、镜头、装配与预算框架。
- [balcony 实施记录](../../../DelaunayVoronoiFokkerPlanck/design/balcony/implementation.md)：多轮修正、第三轮猫动画、WebGPU 与性能未完成项。
- [猫制作交接](../../../DelaunayVoronoiFokkerPlanck/design/balcony/cat-v1/handoff.txt) 及同目录 `prompts.json`：中性站姿参考、静态网格到动画资产流程。
- `E:/DelaunayVoronoiFokkerPlanck/scripts/prepare-cat.mjs`、`rig-balcony-cat.py`、`pack-cat.mjs`：离线资产处理参考。
- `E:/DelaunayVoronoiFokkerPlanck/src/balcony/assets.js`、`cat.js`、`catFeet.js`、`main.js`、`postProcessing.js`：装配、行为、接地及实际渲染后端参考。

以上实现结果来自参考项目现有记录及源码检查，不代表本场景已经完成或通过测试。

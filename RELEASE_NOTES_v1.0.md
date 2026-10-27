# Release Notes: v1.0.0 — 初遇郊原 (Riverside Eight Horses Official Release)

> 🚀 **发布标签**：`v1.0.0`  
> 📅 **发布日期**：2026年10月  
> 🏷️ **里程碑**：郎世宁《郊原牧马图》（八骏图）三维数字化全景交互与学术考据系统首次正式发布

---

## 🌟 核心亮点 (Highlights)

我们非常荣幸地宣布 **「沿水岸牧马」v1.0.0 正式发布**！  
本项目以北京故宫博物院藏 清代宫廷画师**郎世宁（Giuseppe Castiglione）**的早期中西融汇标准器《郊原牧马图》（八骏图）为蓝本，依托现代 **Three.js WebGPU** 图形管线，将二维绢本长卷完整升维为兼具学术考据、动态季相、骨骼生物微动与自然光照的沉浸式三维世界。

---

## 📦 新增功能与工程特性 (What's New in v1.0.0)

### 1. 🌐 WebGPU 实时三维渲染管线
* **次世代图形架构**：采用 Three.js WebGPU / TSL 节点材质系统，支持物理微表面材质（PBR）、高保真各向异性毛发反射与柔和物理投影。
* **双层各向异性动态水体**：定制编写带有折射、菲涅尔效应与浅滩深度渐变的水面着色器。
* **优雅降级支持**：自动适配不支持 WebGPU 的设备，平滑提供轻量化与原画对照浏览体验。

### 2. 🐎 全角色动捕级独立骨架与生物运动系统
* **8 匹骏马（H01～H08）独立装配**：构建 46 骨骼与 36 骨骼独立动捕级骨架，支持呼吸微动、耳扇、甩尾与抬头警觉。
* **有机采食序列（Graze System）**：实现低头寻草、俯身咀嚼、抬头回正的平滑混合过渡。
* **沿岸慢步行进（Four-Beat Walk）**：H04 与 H06 具备完整的四拍非对称行进动画，并搭载基于高程场的逐蹄毫米级地形接触校准。
* **蓝衣牧马人（P01）装配**：标准人形骨架，支持袖口柔性解算与左右转头观察。

### 3. 🍂 动态四季演变系统 (Four Seasons System)
* **四季平滑流转**：春草初绿、盛夏浓郁、秋日原貌金黄、寒冬枯林覆霜。
* **程序化叶簇季相演化**：数千片掌状杂木叶与垂柳柔丝支持动态变色，并在冬季实现渐进式物理脱落。

### 4. ☀️ 十二时辰自然天体光照模型 (Twelve Shichen Solar Cycle)
* **全昼夜循环**：支持子、丑、寅、卯、辰、巳、午、未、申、酉、戌、亥完整流转。
* **天体力学高度角计算**：精准模拟破晓晨曦、正午强直射、薄暮熔金与深夜冷月光照，子夜时分跨夜自然闭环。

### 5. 📜 “画中有意” 深度学术考据叙事
* **随卷读画面板**：内置多章节学术鉴赏导览，涵盖八骏相马术品级、上驷院苏达喇齐马官服饰、解手刀考证与北京南苑皇家马厂地理渊源。
* **长篇学术考据文献**：随工程附赠 1.5 万字考证报告 [`郊原牧马图_考据研究.md`](郊原牧马图_考据研究.md)。

### 6. 🔍 6 大电影级镜头与 6882×2160 原画镜像对照
* **6 大电影级机位**：全卷相望、清流近看、左侧马群、柳下灰马、柳冠近看、牧者花马。
* **超高清原画对照**：一键叠加故宫藏本超高清扫描件，像素级验证三维还原与古画构图的契合度。

---

## ⚡ 性能指标与资产瘦身 (Performance & Asset Optimization)

* **资产体积革命**：通过 `@gltf-transform` 与 `meshoptimizer` 执行无损拓扑重构与顶点量化，将制作期 **1.2 GB+** 的庞大点云与模型文件成功精简至 **32.3 MB**（压缩率达 **97.3%**）。
* **免等待秒级加载**：优化后的全场景资源均符合现代 Web 传输规范，克隆与开发零门槛。
* **GitHub 友好**：全库无大于 10 MB 的单个文件，无任何大型视频或点云臃肿垃圾，完全规避 GitHub 100MB 限制。

---

## 🧪 自动化测试验证 (Verification & Quality Assurance)

项目已建立覆盖核心模块的 18 项自动化单元与集成测试：
```text
✔ 12 unique mapped models resolve to derived meshes while sources remain present
✔ per-horse prompts cover requested states without treating videos as skeletal clips
✔ study numbering maps by painting position without replacing production horse identities
✔ palmate foliage keeps connected leaf surfaces and the original woody structure
✔ six deterministic plant layers fit dry terrain, figure clearings and rock exclusions
✔ curved ground foliage and woody prototypes have finite, valid geometry
✔ contoured banks match CPU terrain and keep stable local standing areas
✔ extended meadow covers both flanks and deep foreground with no detached roots
✔ rocky ridges have distinct cliff faces and finite face normals
✔ water and bed share curved shorelines, remain separated, and point upwards
✔ all triangles of a leaf disappear together, without changing branch geometry
✔ season loop is continuous, pause freezes it, manual choice cancels auto
✔ river follows the approved controls continuously, including extensions
✔ all 8 horse torso anchors and the herder are on the near-bank plateau
✔ heading conversion preserves per-asset native axes without double axis conversion
✔ traditional periods use two-hour boundaries and wrap Zi across midnight
✔ time transitions cross midnight by the short route, and pause/manual selection stop
✔ night stays dark through season changes and seasonal light does not accumulate
----------------------------------------------------------------------------------
ℹ 18 passed, 0 failed, 100% success rate.
```

---

## 🚀 快速上手 (Quick Start)

```bash
# 1. 克隆代码库
git clone https://github.com/countessrinkbf685-lgtm/riverside-eight-horses.git
cd riverside-eight-horses

# 2. 安装依赖
npm install

# 3. 启动开发服务器
npm run dev

# 4. 构建与生产预览
npm run build
npm run preview
```

---

## 📄 许可证与鸣谢 (License & Acknowledgements)

* 代码开源协议：[MIT License](LICENSE)
* 文物数字化知识产权：北京故宫博物院藏品原画为公共领域（Public Domain）作品。

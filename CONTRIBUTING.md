# 贡献指南 (Contributing Guide)

欢迎参与《沿水岸牧马》（Riverside Eight Horses）开源项目的建设！我们非常期待来自三维图形开发者、美术设计师、历史考据学者以及开源爱好者的贡献。

---

## 🛠️ 本地开发流程

1. **Fork 本仓库** 并克隆到本地：
   ```bash
   git clone https://github.com/your-username/riverside-eight-horses.git
   cd riverside-eight-horses
   ```
2. **安装依赖**：
   ```bash
   npm install
   ```
3. **启动热重载开发环境**：
   ```bash
   npm run dev
   ```
4. **运行测试套件**：
   在提交任何修改前，必须确保所有 18 项自动化测试全部通过：
   ```bash
   npm test
   ```
5. **执行生产打包构建**：
   ```bash
   npm run build
   npm run preview
   ```

---

## 📐 代码与工程规范

### 1. 代码风格
* 遵循现代 ES 模块规范（`import / export`），禁止引入未声明的隐式全局变量。
* 3D 数学运算优先采用 Three.js 内建向量与变换矩阵复用，避免在逐帧 `requestAnimationFrame` 循环中大量创建一次性对象引起 GC 停顿。

### 2. 资产提交规范
* **严禁提交未压缩的高模文件**：单文件严禁超过 15 MB，严禁直接向主分支提交 GB 级的未处理原始点云或影视级 GLB。
* 所有三维模型应先经 `@gltf-transform` 与 `meshoptimizer` 执行量化与轻量化烘焙。

### 3. 学术与文化考据规范
* 新增或调整马匹相貌、马具、服饰或植物景观时，需提供故宫藏品档案、清宫内务府造办处活计档等文献依据，并在 [`郊原牧马图_考据研究.md`](郊原牧马图_考据研究.md) 中同步补充考据来源。

---

## 📮 提交 Pull Request

1. 从 `main` 分支拉出新的特性分支：`git checkout -b feature/your-feature-name`
2. 保持 Commit 信息清晰明确（推荐遵循 Conventional Commits 规范，如 `feat: add horse tail physics` 或 `fix: correct time-of-day solar angle`）。
3. 提交 PR 并简要说明修改内容、测试结果及参考来源。

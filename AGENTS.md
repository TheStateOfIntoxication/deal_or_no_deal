# AGENTS.md — 前端 Vue3 项目 L3

> 只写**本项目**约定。通用 M 见本机已安装的开发规范常驻摘要。
> 冲突：本文件 > skill `write-vue` 的 `references/00-vue3.md` > `rules/AGENTS.md`。
> 栈：Vue 3.5 + Element Plus 2.14 + TypeScript 5.9；栈条文 `00-vue3.md`。

## 项目信息（必填）

| 项 | 值 |
|---|---|
| 项目名 | deal-or-no-deal（《一掷千金》单机网页游戏） |
| Vue | 3.5（Composition API，`<script lang="ts" setup>`） |
| UI 库 | Element Plus 2.14（`el-*`，按需自动导入：`unplugin-vue-components` + `unplugin-auto-import`） |
| 语言 | TypeScript 5.9（`strict: true`） |
| 样式 | SCSS（`<style lang="scss" scoped>`） |
| 状态 | Vuex 4：`record`（战绩）+ `settings`（音效开关）；单局游戏状态在 `views/game` 组件内 |
| 路由 | Vue Router 4（hash 模式） |
| HTTP | 无后端、无 HTTP 调用（不引入 Axios / `utils/fetch`） |
| 构建 | Vite 7 |
| 别名 | `@/` → `src/` |
| 成功码 | 不适用（无接口） |
| 分页 | 不适用（无列表接口） |
| 规范 pin | dev-standards |

## 目录与代码

- 按 `00-vue3.md` §二 建树；游戏页为 `src/views/game/`（入口 `index.vue`）
- 规则权威：`.pi/docx/需求文档.md`（v1.4），表现层设计：`.pi/docx/交互优化方案.md`。实现与文档冲突时以文档为准并回报
- 规划中的玩法扩展（卡牌/观众/角色）见 `.pi/docx/玩法卡牌与角色设计.md`，银行家计划与 AI 见 `.pi/docx/银行家AI设计.md`，后端评估见 `.pi/docx/技术栈与后端评估.md`；均为设计稿，未实现前不得当作硬规则
- 逻辑层 `src/views/game/services/` 为纯类/纯函数，**禁止**引入 Vue API、DOM、i18n

## 本项目约定（按需）

- 金额：一律以**分**为整数存算（`R-8.1`）。仅报价乘数/均方根允许临时浮点，最终 `floor` 到分并在取整后复校边界（`R-8.5`）
- 表现层参数（分级阈值、揭示时长、概率里程碑、台词信心阈值）一律只放 `src/config/presentation.ts`，业务逻辑里禁止硬编码
- 有限状态优先用 enum（`00-vue3.md` §8.4）；`DecidedByType`（deal/case/certainty）按 §8.3 以字符串联合表达，登记为例外
- 提交：默认只 `git commit`，不执行 `git push`（由人手动推送）；作者邮箱沿用当前仓库配置
- 报价：9 次，第 9 轮报价即最终报价；终局不再出价（`R-5.3.5`、`R-7.1.1`）
- 国际化：`src/language/{zh,en}`，Key 扁平、字母序、中英严格一致；模板用 `$t`，脚本用 `t()`
- Element Plus 采用按需自动导入（`vite.config.ts` 内的 `ElementPlusResolver`），生成的 `src/types/components.d.ts`、`src/types/auto-imports.d.ts` 不得手改；`tsconfig.types` 保留 `element-plus/global`
- 单测：`src/**/*.spec.ts`（vitest；规则层为 node 环境，UI 冒烟用 `// @vitest-environment jsdom`；Element Plus 样式在 `vite.config.ts` 的 `test.alias` 中映射到 `test/styleStub.ts`，勿改为直接引用 CSS）
- 无后端 ⇒ 金额在浏览器内存可见，属已知并接受的风险（`R-9.7`）
- `vuex@4.1` 的 `package.json` 未在 `exports` 中声明 `types`，故在 `tsconfig.json` 的 `paths` 里做了 `vuex → node_modules/vuex/types/index.d.ts` 映射，**勿删**
- 报价交互：使用非遮挡的 `OfferPanel`（≥900px 内联在台面顶部，<900px 固定底部抽屉）；只有终局交换 `SwapDialog`、结算 `ResultDialog` 用 `el-dialog`。禁止给报价加全屏遮罩/模糊
- 结算节奏：`FINAL_REVEAL_MS` 悬念 → 翻牌（按 `PayoutGradeEnum` 播效果）→ `RESULT_PANEL_DELAY_MS` 后出结算面板；**结算后禁止自动开新局**：面板内「完成」只关闭面板、保留牌面，只有「再来一局」才重开
- 开局摇奖：先进入 `DrawPanel`（金球盲选），k 由玩家点选的球决定（`engine.start(k)`）；候选为配置区间 `kMin..kMax` 的等概率打乱排列（`engine.createKDraw()`），禁止跳过摇奖直接开局
- 报价公式：`报价 = 剩余最小值 + (锤点 − 最小值) × 乘数`（需求文档 R-6.1.5），禁止回退到 `均价 × 乘数`
- 银行家（R-6.4）：怒气每次 No Deal `+15`（上限 100，局内不衰减、新局归零）、满怒压价 ≤6%、顶奖概率加价 ≤8%，有效乘数钳制 `[0,1]`；两类修正必须在 `OfferPanel` 明示；台词只做情绪、不承载规则
- 银行家形象为纯 CSS/SVG 卡通剪影（四表情），禁止引入真人素材或针对真实群体的嘲讽
- 提前结算：剩余金额全等时引擎必须直接以 `decidedBy='certainty'` 结算并结束（R-5.2.7），不得再产出报价
- 项目文档统一放 `.pi/`，按类型分目录（当前 `docx/` 存需求、决策、设计）；新增类型先在 `.pi/README.md` 登记
- v1 范围：仅固定 26 箱模式（`R-4.2.7`）、k 默认区间 2–6（趣味优先，见需求文档 R-4.1.2）、随机顶奖为保留开关且开启即拒绝开局（`R-10.1`）、货币与精度固定为美元/分（`R-8.4` 多币种为后续扩展）

## Agent（勿删）

- 遵守栈条文（skill `write-vue` `references/00-vue3.md`）；不顺手改存量；提交按 `rules/AGENTS.md` §提交
- 写：skill `write-vue` · 审：agent `review-vue`

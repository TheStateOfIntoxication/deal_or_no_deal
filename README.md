# 一掷千金（Deal or No Deal）

单机网页版《一掷千金》。规则见 [需求文档.md](./.pi/docx/需求文档.md)（v1.3），决策记录见 [答复.md](./.pi/docx/答复.md)，交互设计见 [交互优化方案.md](./.pi/docx/交互优化方案.md)，银行家系统设计见 [银行家设计.md](./.pi/docx/银行家设计.md)。

## 运行

```bash
npm install
npm run dev        # 开发服务器
npm run build      # 类型检查 + 生产构建（dist/，需静态服务器托管）
npm run test       # 规则单测（vitest）
```

## 技术栈

Vue 3.5 + TypeScript 5.9 + Vite 7 + Element Plus 2.14 + Vuex 4 + Vue Router 4（hash）。

## 关键约定

- 金额全部以「分」整数存算，展示走 `src/utils/money.ts`
- 游戏规则逻辑集中在 `src/views/game/services/`（纯类/纯函数，不依赖 Vue，可单测）
- 配置项：规则参数在 `src/config/game.ts`（与需求文档 §10 一一对应），表现层参数在 `src/config/presentation.ts`
- 纯前端单机：金额存在于浏览器内存，DevTools 可见（需求文档 §9 R-9.7 已接受该风险）

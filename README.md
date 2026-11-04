# Agent 基本原理 · 交互式教程

一套可直接用浏览器打开的多页教程，讲 agent 在框架之下那套共同结构：一次模型调用、一次工具执行、一个把两者串起来的循环，以及围绕这个循环的一圈拦截层。

每章是一个自包含的 HTML，无外部依赖，可单独打开，也可用页脚的上下章链接顺序读。

## 章节

| 文件 | 主题 |
| --- | --- |
| `00-总览.html` | 五层因果链、怎么读 |
| `01-LLM的演进.html` | RLHF → function calling → 长思维链 → agentic RL |
| `02-工具调用的演进.html` | function calling / MCP / code-as-action 三档对照 |
| `03-Agent的形态谱系.html` | CoT、ToT、Plan-and-Execute、工作流 DAG、ReAct |
| `04-ReAct循环.html` | 两个节点、一个案例、11 个 step 逐步播放 |
| `05-中间件全景.html` | 7 个钩子 × 6 个中间件的矩阵 |
| `06-记忆中间件.html` | 上下文压缩、工具输出卸载、完整的记忆系统 |
| `07-可观测中间件.html` | span 瀑布、token 账本、trace 结构 |
| `08-人工审批中间件.html` | before_tool 闸门，同意 / 拒绝两条分支 |
| `09-控制流中间件.html` | 指数退避重试、evaluator 回跳 |
| `10-流式与前端.html` | 事件序列、逐字同步渲染、SSE |

## 目录结构

```
.
├── 00-总览.html ... 10-流式与前端.html   # 构建产物，直接打开
└── src/
    ├── base.css        # 全站设计系统
    ├── common.js       # AgentFlow / StatePanel / LogPanel / Player 等公共组件
    ├── build.py        # 组装脚本
    └── pages/00.html … 10.html            # 每章的 body 片段
```

成品不手写，由 `src/pages/*.html` 片段拼装而成：公共 CSS / JS 内联进每一页，保证单文件自包含。

## 构建

```bash
cd src
python3 build.py            # 构建全部章节
python3 build.py 06 07      # 只构建指定章节
```

输出到仓库根目录，文件名取自 `build.py` 里的 `CHAPTERS` 清单。

`pages/*.html` 里的占位符：

- `__PAGER__` — 上一章 / 下一章链接，由 `build.py` 生成
- `__TITLE__` — 页面标题，取自 `CHAPTERS`
- `__BODY__` / `__CSS__` / `__JS__` / `__NAV__` — 由模板填入

## 自检

截图与体检脚本（本地环境路径，按需替换）：

```bash
python3 <skill>/scripts/shot.py "04-ReAct循环.html" --only desktop
```

`_shots/` 是自检产物，已忽略，不参与版本控制。

## 约定

- 白底黑字，语义色：蓝=模型、青=工具、琥珀=钩子/中间件、红=危险、绿=完成
- 只用原生 JS，不引框架，不用 module
- 所有图形用 SVG / CSS 手绘，不用 emoji、不用外部图片
- 交互组件统一走 `common.js` 的 `Player` / `AgentFlow` / `StatePanel` / `LogPanel`

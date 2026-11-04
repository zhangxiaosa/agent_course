#!/usr/bin/env python3
"""把 src/pages/*.html 组装成自包含的成品 HTML。

每个成品文件独立可用：CSS / JS 全部内联，页面之间靠相对路径互链。
用法：python3 build.py [chapter_id ...]
"""
import pathlib
import sys

SRC = pathlib.Path(__file__).parent
OUT = pathlib.Path(__file__).resolve().parent.parent

CHAPTERS = [
    {"id": "00", "file": "00-总览.html",           "title": "Agent 基本原理 · 从 LLM 到可交互的循环", "nav": "总览"},
    {"id": "01", "file": "01-LLM的演进.html",      "title": "01 · LLM 的四次跃迁",     "nav": "LLM 的演进"},
    {"id": "02", "file": "02-工具调用的演进.html",  "title": "02 · 工具调用的演进",      "nav": "工具调用的演进"},
    {"id": "03", "file": "03-Agent的形态谱系.html", "title": "03 · Agent 的形态谱系",   "nav": "Agent 的形态谱系"},
    {"id": "04", "file": "04-ReAct循环.html",      "title": "04 · ReAct 循环",         "nav": "ReAct 循环"},
    {"id": "05", "file": "05-中间件全景.html",      "title": "05 · 中间件的全景",        "nav": "中间件全景"},
    {"id": "06", "file": "06-记忆中间件.html",      "title": "06 · 记忆：压缩与卸载",    "nav": "记忆中间件"},
    {"id": "07", "file": "07-可观测中间件.html",    "title": "07 · 可观测",             "nav": "可观测"},
    {"id": "08", "file": "08-人工审批中间件.html",  "title": "08 · 人工审批",           "nav": "人工审批"},
    {"id": "09", "file": "09-控制流中间件.html",    "title": "09 · 控制流：重试与评测",  "nav": "控制流"},
    {"id": "10", "file": "10-流式与前端.html",     "title": "10 · 流式与前端",         "nav": "流式与前端"},
]

FAVICON = (
    "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E"
    "%3Crect width='32' height='32' fill='%230a0e13'/%3E"
    "%3Crect x='7' y='9' width='18' height='2.5' fill='%235b93c9'/%3E"
    "%3Crect x='7' y='15' width='12' height='2.5' fill='%23dda15c'/%3E"
    "%3Crect x='7' y='21' width='18' height='2.5' fill='%234fb0bd'/%3E%3C/svg%3E"
)

PAGE = """<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>__TITLE__</title>
<meta name="description" content="Agent 基本原理交互教程：LLM 演进、工具调用、ReAct 循环、中间件、流式前端。">
<link rel="icon" href="__FAVICON__">
<style>
__CSS__
</style>
</head>
<body>
<script>
__JS__
</script>
<div class="shell">
<aside class="side">
  <div class="side-brand">
    <span class="t">Agent 基本原理</span>
    <span class="s">interactive field manual</span>
  </div>
  <nav class="side-list">
__NAV__
  </nav>
</aside>
<main>
<div class="wrap">
__BODY__
</div>
</main>
</div>
</body>
</html>
"""


def build_nav(current_id):
    out = []
    for c in CHAPTERS:
        cur = ' aria-current="page"' if c["id"] == current_id else ""
        out.append(
            f'    <a class="side-item" href="{c["file"]}"{cur}>'
            f'<span class="n">{c["id"]}</span>{c["nav"]}</a>'
        )
    return "\n".join(out)


def build_pager(cid):
    idx = next(i for i, c in enumerate(CHAPTERS) if c["id"] == cid)
    prev_c = CHAPTERS[idx - 1] if idx > 0 else None
    next_c = CHAPTERS[idx + 1] if idx + 1 < len(CHAPTERS) else None
    prev_html = (
        f'<a class="prev" href="{prev_c["file"]}"><span class="dir">← 上一章</span>{prev_c["title"]}</a>'
        if prev_c else "<span></span>"
    )
    next_html = (
        f'<a class="next" href="{next_c["file"]}"><span class="dir">下一章 →</span>{next_c["title"]}</a>'
        if next_c else "<span></span>"
    )
    return f'<footer class="pager">{prev_html}{next_html}</footer>'


def main(argv):
    css = (SRC / "base.css").read_text(encoding="utf-8")
    js = (SRC / "common.js").read_text(encoding="utf-8")
    only = set(argv)
    OUT.mkdir(parents=True, exist_ok=True)

    for c in CHAPTERS:
        if only and c["id"] not in only:
            continue
        page_file = SRC / "pages" / f'{c["id"]}.html'
        if not page_file.exists():
            print(f"skip {c['id']}: no page source")
            continue
        body = page_file.read_text(encoding="utf-8")
        body = body.replace("__PAGER__", build_pager(c["id"]))
        html = (
            PAGE.replace("__TITLE__", c["title"])
            .replace("__FAVICON__", FAVICON)
            .replace("__NAV__", build_nav(c["id"]))
            .replace("__CSS__", css)
            .replace("__BODY__", body)
            .replace("__JS__", js)
        )
        out_path = OUT / c["file"]
        out_path.write_text(html, encoding="utf-8")
        print(f"{out_path.name}  {len(html) // 1024} KB")


if __name__ == "__main__":
    main(sys.argv[1:])

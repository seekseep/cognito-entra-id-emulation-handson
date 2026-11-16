import os, sys
sys.path.insert(0, os.path.expanduser("~/.claude/skills/genfig"))
from genfig import Canvas
# 画面とコンテナの API（CONTAINER）
c = Canvas(760, 320)
c.text(380, 46, "画面とコンテナ", scale="title", align="middle")
c.sticky(260, 90, 470, 200, color="gray")
c.text(280, 122, "Podman", scale="label", align="start")
b = c.node(120, 200, "画面", emoji_cp="1f310", w=100, h=70)
api = c.node(390, 205, "API コンテナ", emoji_cp="1f4e6", w=100, h=70)
f = c.node(620, 205, "floci:4566", emoji_cp="2601", w=100, h=70)
c.link(b, api, label="fetch")
c.link(api, f)
c.save("00-thumbnail.svg")

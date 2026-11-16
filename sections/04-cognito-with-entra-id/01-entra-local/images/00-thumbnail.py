import os, sys
sys.path.insert(0, os.path.expanduser("~/.claude/skills/genfig"))
from genfig import Canvas
# entra-local にアプリとユーザーを登録する（CONTAINER）
c = Canvas(760, 320)
c.text(380, 46, "entra-local を用意する", scale="title", align="middle")
c.sticky(250, 85, 470, 210, color="blue")
c.text(270, 117, "テナント 1111…", scale="label", align="start")
el = c.node(120, 195, "entra-local", emoji_cp="1f3e2")
app = c.node(390, 205, "アプリの登録", emoji_cp="1f4dd", w=100, h=70)
u = c.node(600, 205, "tid / oid", emoji_cp="1f464", w=100, h=70)
c.link(el, app, primary=False)
c.save("00-thumbnail.svg")

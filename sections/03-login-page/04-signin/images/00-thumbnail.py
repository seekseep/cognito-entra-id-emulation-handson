import os, sys
sys.path.insert(0, os.path.expanduser("~/.claude/skills/genfig"))
from genfig import Canvas
# 静的サーバーが配る画面から、Cognito に直接サインアップ・ログインする（SOURCE-PATH-GOAL を左右に分ける）
c = Canvas(760, 300)
c.text(380, 52, "サインイン", scale="title", align="middle")
f = c.node(110, 175, "Floci", emoji_cp="2601", w=100, h=70)
b = c.node(380, 175, "画面", emoji_cp="1f310", w=100, h=70)
server = c.node(650, 175, "静的サーバー", emoji_cp="1f5a5", w=100, h=70)
c.link(b, f, label="サインイン")
c.link(server, b, label="HTML")
c.save("00-thumbnail.svg")

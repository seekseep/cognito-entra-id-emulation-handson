import os, sys
sys.path.insert(0, os.path.expanduser("~/.claude/skills/genfig"))
from genfig import Canvas
# アプリ → Cognito → Entra ID（SOURCE-PATH-GOAL）
c = Canvas(760, 300)
c.text(380, 52, "Cognito 経由で Entra ID へ", scale="title", align="middle")
a = c.node(110, 175, "アプリ", emoji_cp="1f310", w=100, h=70)
cg = c.node(380, 175, "Cognito（Floci）", emoji_cp="2601", w=100, h=70)
el = c.node(650, 175, "Entra ID", emoji_cp="1f3e2", w=100, h=70)
c.link(a, cg)
c.link(cg, el, label="OIDC")
c.save("00-thumbnail.svg")

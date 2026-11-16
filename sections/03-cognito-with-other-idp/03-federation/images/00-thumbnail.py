import os, sys
sys.path.insert(0, os.path.expanduser("~/.claude/skills/genfig"))
from genfig import Canvas
# アプリ → Cognito → Keycloak（SOURCE-PATH-GOAL）
c = Canvas(760, 300)
c.text(380, 52, "Cognito 経由で Keycloak へ", scale="title", align="middle")
a = c.node(110, 175, "アプリ", emoji_cp="1f310", w=100, h=70)
cg = c.node(380, 175, "Cognito（Floci）", emoji_cp="2601", w=100, h=70)
kc = c.node(650, 175, "Keycloak", emoji_cp="1f511", w=100, h=70)
c.link(a, cg)
c.link(cg, kc, label="任せる")
c.save("00-thumbnail.svg")

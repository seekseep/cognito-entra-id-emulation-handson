import os, sys
sys.path.insert(0, os.path.expanduser("~/.claude/skills/genfig"))
from genfig import Canvas
# 画面 → API → Cognito（SOURCE-PATH-GOAL）
c = Canvas(760, 300)
c.text(380, 52, "NestJS の認証 API", scale="title", align="middle")
b = c.node(110, 175, "クライアント", emoji_cp="1f310", w=100, h=70)
api = c.node(380, 175, "NestJS API", emoji_cp="1f5a5", w=100, h=70)
f = c.node(650, 175, "Floci", emoji_cp="2601", w=100, h=70)
c.link(b, api, label="/auth/login")
c.link(api, f, label="InitiateAuth")
c.save("00-thumbnail.svg")

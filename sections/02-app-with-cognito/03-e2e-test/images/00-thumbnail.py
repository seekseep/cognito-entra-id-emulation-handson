import os, sys
sys.path.insert(0, os.path.expanduser("~/.claude/skills/genfig"))
from genfig import Canvas
# テストが API を通して Floci を叩く（SOURCE-PATH-GOAL）
c = Canvas(760, 300)
c.text(380, 52, "Floci に向けた e2e テスト", scale="title", align="middle")
t = c.node(110, 175, "Vitest", emoji_cp="1f9ea", w=100, h=70)
api = c.node(380, 175, "NestJS API", emoji_cp="1f5a5", w=100, h=70)
f = c.node(650, 175, "Floci", emoji_cp="2601", w=100, h=70)
c.link(t, api, label="supertest")
c.link(api, f, label="SDK")
c.save("00-thumbnail.svg")

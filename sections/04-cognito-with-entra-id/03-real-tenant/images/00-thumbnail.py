import os, sys
sys.path.insert(0, os.path.expanduser("~/.claude/skills/genfig"))
from genfig import Canvas
# ローカルから本物へ置き換える（NEAR-FAR）
c = Canvas(760, 300)
c.text(380, 52, "本物の環境につなぐ", scale="title", align="middle")
local = c.node(160, 175, "ローカルで練習", emoji_cp="1f4bb")
real = c.node(600, 175, "本物の Cognito・Entra", emoji_cp="1f30f")
c.link(local, real, label="置き換える", dash="dashed")
c.save("00-thumbnail.svg")

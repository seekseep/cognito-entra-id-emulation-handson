import os, sys
sys.path.insert(0, os.path.expanduser("~/.claude/skills/genfig"))
from genfig import Canvas
# 公開鍵で署名を確かめる。書き換えたら弾かれる（BLOCKAGE）
c = Canvas(760, 320)
c.text(380, 46, "署名を確かめる", scale="title", align="middle")
jwks = c.node(380, 140, "JWKS（公開鍵）", emoji_cp="1f511", w=110, h=76)
good = c.node(140, 255, "本物のトークン", emoji_cp="1f3ab", w=100, h=66)
bad = c.node(620, 255, "書き換えたトークン", emoji_cp="270f", w=100, h=66)
c.link(jwks, good, label="OK")
c.link(jwks, bad, label="NG", primary=False, dash="dashed")
c.save("00-thumbnail.svg")

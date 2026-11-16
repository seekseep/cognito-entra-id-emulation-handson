import os, sys
sys.path.insert(0, os.path.expanduser("~/.claude/skills/genfig"))
from genfig import Canvas
# Guard がトークンを確かめて通す・止める（BLOCKAGE + SPLITTING）
c = Canvas(760, 330)
c.text(380, 46, "Guard で API を守る", scale="title", align="middle")
t = c.node(110, 190, "アクセストークン", emoji_cp="1f3ab", w=100, h=70)
g = c.node(370, 190, "Guard", emoji_cp="1f6e1", w=100, h=70)
ok = c.node(640, 120, "200 /me", emoji_cp="2705", w=90, h=60)
ng = c.node(640, 270, "401 / 403", emoji_cp="1f6ab", w=90, h=60)
c.link(t, g)
c.link(g, ok)
c.link(g, ng, primary=False, dash="dashed")
c.save("00-thumbnail.svg")

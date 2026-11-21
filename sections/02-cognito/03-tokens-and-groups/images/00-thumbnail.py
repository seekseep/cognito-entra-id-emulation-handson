import os, sys
sys.path.insert(0, os.path.expanduser("~/.claude/skills/genfig"))
from genfig import Canvas
# ログインすると 3 つのトークン（SPLITTING）
c = Canvas(760, 400)
c.text(380, 46, "3 つのトークンとグループ", scale="title", align="middle")
login = c.node(120, 225, "ログイン", emoji_cp="1f6aa", w=110, h=76)
idt = c.node(400, 115, "ID トークン", emoji_cp="1faaa", w=90, h=60)
at = c.node(400, 225, "アクセストークン", emoji_cp="1f3ab", w=90, h=60)
rt = c.node(400, 335, "リフレッシュトークン", emoji_cp="1f504", w=90, h=56)
grp = c.node(640, 225, "cognito:groups", emoji_cp="1f465", w=90, h=60)
c.link(login, idt)
c.link(login, at)
c.link(login, rt)
c.link(at, grp, primary=False, dash="dashed")
c.save("00-thumbnail.svg")

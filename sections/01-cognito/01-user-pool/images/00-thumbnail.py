import os, sys
sys.path.insert(0, os.path.expanduser("~/.claude/skills/genfig"))
from genfig import Canvas
# User Pool の中にユーザー、外からアプリ（CONTAINER）
c = Canvas(760, 300)
c.text(380, 52, "User Pool と App Client", scale="title", align="middle")
pool = c.node(250, 175, "User Pool", emoji_cp="1f5c2")
app = c.node(560, 175, "App Client", emoji_cp="1f4f1")
c.link(app, pool, label="ログインしにくる")
c.save("00-thumbnail.svg")

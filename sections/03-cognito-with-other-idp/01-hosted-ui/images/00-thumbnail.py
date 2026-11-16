import os, sys
sys.path.insert(0, os.path.expanduser("~/.claude/skills/genfig"))
from genfig import Canvas
# Hosted UI へ行って、認可コードで戻る（CYCLE）
c = Canvas(760, 300)
c.text(380, 52, "Hosted UI でログイン", scale="title", align="middle")
app = c.node(150, 175, "アプリ", emoji_cp="1f310")
h = c.node(610, 175, "Cognito のログイン画面", emoji_cp="1f6aa")
c.link(app, h, label="authorize", offset=22)
c.link(h, app, label="認可コード", offset=22, primary=False)
c.save("00-thumbnail.svg")

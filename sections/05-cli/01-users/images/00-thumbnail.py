import os, sys
sys.path.insert(0, os.path.expanduser("~/.claude/skills/genfig"))
from genfig import Canvas
# ユーザーの作り方は 2 通り（SPLITTING）
c = Canvas(760, 330)
c.text(380, 46, "ユーザーを作る 2 つの道", scale="title", align="middle")
admin = c.node(130, 125, "管理者が作る", emoji_cp="1f9d1-200d-1f4bc", w=110, h=76)
signup = c.node(130, 255, "自分で登録", emoji_cp="1f64b", w=110, h=76)
pw = c.node(400, 125, "新しいパスワード", emoji_cp="1f511", w=110, h=76)
mail = c.node(400, 255, "確認コード", emoji_cp="2709", w=110, h=76)
ok = c.node(640, 190, "ログインできる", emoji_cp="2705", w=110, h=76)
c.link(admin, pw)
c.link(signup, mail)
c.link(pw, ok)
c.link(mail, ok)
c.save("00-thumbnail.svg")

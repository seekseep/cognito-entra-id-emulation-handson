import os, sys
sys.path.insert(0, os.path.expanduser("~/.claude/skills/genfig"))
from genfig import Canvas
# Keycloak の realm の中にユーザーとクライアント（CONTAINER）
c = Canvas(760, 320)
c.text(380, 46, "Keycloak を用意する", scale="title", align="middle")
c.sticky(250, 85, 470, 210, color="purple")
c.text(270, 117, "realm: practice", scale="label", align="start")
kc = c.node(120, 195, "Keycloak", emoji_cp="1f511")
u = c.node(390, 205, "kate / ken", emoji_cp="1f465", w=100, h=70)
cl = c.node(600, 205, "cognito クライアント", emoji_cp="1f4f1", w=100, h=70)
c.link(kc, u, primary=False)
c.save("00-thumbnail.svg")

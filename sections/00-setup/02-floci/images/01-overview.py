import os, sys
sys.path.insert(0, os.path.expanduser("~/.claude/skills/genfig"))
from genfig import Canvas
# 全体の構成: Podman の中に Floci・Keycloak・entra-local（CONTAINER + LINK）
c = Canvas(900, 500)
c.sticky(330, 30, 550, 450, color="gray")
c.text(350, 66, "Podman（ローカル）", scale="heading", align="start")
browser = c.node(110, 130, "ブラウザ", emoji_cp="1f310")
api = c.node(110, 380, "NestJS API", emoji_cp="1f5a5")
floci = c.node(490, 255, "Floci", emoji_cp="2601")
kc = c.node(770, 140, "Keycloak", emoji_cp="1f511")
el = c.node(770, 380, "entra-local", emoji_cp="1f3e2")
c.link(browser, floci, label="ログイン")
c.link(api, floci, label="JWKS")
c.link(floci, kc, label="OIDC")
c.link(floci, el, label="OIDC")
c.save("01-overview.svg")

import os, sys
sys.path.insert(0, os.path.expanduser("~/.claude/skills/genfig"))
from genfig import Canvas
# 全体の構成: Podman の中に Floci・entra-local。静的サーバーが配る画面から、ブラウザが Floci を使う（CONTAINER + LINK）
c = Canvas(900, 500)
c.sticky(330, 30, 550, 450, color="gray")
c.text(350, 66, "Podman（ローカル）", scale="heading", align="start")
browser = c.node(110, 130, "ブラウザ", emoji_cp="1f310")
server = c.node(110, 380, "静的サーバー", emoji_cp="1f5a5")
floci = c.node(490, 255, "Floci", emoji_cp="2601")
el = c.node(770, 255, "entra-local", emoji_cp="1f3e2")
c.link(browser, floci, label="ログイン")
c.link(server, browser, label="HTML")
c.link(floci, el, label="OIDC")
c.save("01-overview.svg")

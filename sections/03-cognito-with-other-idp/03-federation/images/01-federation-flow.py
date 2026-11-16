import os, sys
sys.path.insert(0, os.path.expanduser("~/.claude/skills/genfig"))
from genfig import Canvas
# フェデレーションの流れ（CYCLE を 2 組つなぐ）
c = Canvas(960, 420)
b = c.node(120, 170, "アプリ", emoji_cp="1f310")
cg = c.node(480, 170, "Cognito（Floci）", emoji_cp="2601")
kc = c.node(840, 170, "Keycloak", emoji_cp="1f511")
c.link(b, cg, label="① authorize", offset=34)
c.link(cg, b, label="⑥ 認可コード", offset=34, primary=False)
c.link(cg, kc, label="② 転送", offset=34)
c.link(kc, cg, label="④ idpresponse", offset=34, primary=False)
c.link(cg, kc, label="⑤ トークン・userinfo", route="elbow", start="s", end="s", dash="dashed", primary=False)
c.text(840, 82, "③ ここでパスワード", scale="body", align="middle")
c.text(480, 395, "⑦ アプリは Cognito の /oauth2/token で、Cognito のトークンをもらう", scale="body", align="middle")
c.save("01-federation-flow.svg")

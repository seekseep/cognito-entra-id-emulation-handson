import os, sys
sys.path.insert(0, os.path.expanduser("~/.claude/skills/genfig"))
from genfig import Canvas
# フェデレーションの流れ。ブラウザが通る道（localhost）と、コンテナの中の道（サービス名）を描き分ける
c = Canvas(900, 470)
c.sticky(500, 24, 370, 380, color="gray")
c.text(520, 56, "Podman（compose のネットワーク）", scale="caption", align="start")
br = c.node(110, 220, "ブラウザ", emoji_cp="1f310")
cg = c.node(690, 110, "Cognito（Floci）", emoji_cp="2601")
kc = c.node(690, 330, "Keycloak", emoji_cp="1f511")
c.link(br, cg, label="①④⑥⑦\nlocalhost:4566", both=True)
c.link(br, kc, label="②③\nlocalhost:8080", both=True)
c.link(cg, kc, label="⑤ keycloak:8080", dash="dashed", primary=False)
c.text(450, 445, "実線: ブラウザが通る（localhost）　破線: Floci がコンテナの中から呼ぶ（サービス名）", scale="caption", align="middle")
c.save("01-federation-flow.svg")

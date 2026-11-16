import os, sys
sys.path.insert(0, os.path.expanduser("~/.claude/skills/genfig"))
from genfig import Canvas
# Floci を起動する: aws CLI の向き先を Floci に変える（SOURCE-PATH-GOAL）
c = Canvas(760, 300)
c.text(380, 52, "Floci を起動する", scale="title", align="middle")
cli = c.node(150, 170, "aws CLI", emoji_cp="2328")
floci = c.node(610, 170, "Floci :4566", emoji_cp="2601")
c.link(cli, floci, label="AWS_ENDPOINT_URL")
c.save("00-thumbnail.svg")

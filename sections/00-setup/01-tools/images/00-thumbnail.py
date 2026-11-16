import os, sys
sys.path.insert(0, os.path.expanduser("~/.claude/skills/genfig"))
from genfig import Canvas
# 道具をそろえる: 3 つの道具を横に並べる（PART-WHOLE）
c = Canvas(760, 300)
c.text(380, 52, "道具をそろえる", scale="title", align="middle")
c.node(150, 165, "Podman", emoji_cp="1f4e6")
c.node(380, 165, "aws CLI", emoji_cp="2328")
c.node(610, 165, "Node.js", emoji_cp="1f4bb")
c.save("00-thumbnail.svg")

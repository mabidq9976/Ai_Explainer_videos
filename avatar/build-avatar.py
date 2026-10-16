"""
Builds avatar/avatar.svg (the rigged narrator) from the five Illustrator exports in avatar/.

  README-02.svg  neutral   → base: `body` + `head` (rest gesture)
  README-01.svg  thinking  → pose-thinking
  README-03.svg  arms crossed → pose-arms-crossed
  README-04.svg  finger up → pose-count      (also used for thumbs-up via rig.json aliases)
  README-05.svg  presenting → pose-open-palm (also point-right / wave)

Adds what the drawings don't have: nine lip-sync mouths (A–H, X = your original smile), closed eyes for blinks,
raised / frown brows — inside every pose, so lip sync and blinks work in all of them. Each pose is scaled and
moved so its head lines up with the neutral head (no jump when the pose changes).

Re-run after editing the source drawings:  python3 avatar/build-avatar.py
"""
import copy
import re
import xml.etree.ElementTree as ET
from pathlib import Path

HERE = Path(__file__).parent
NS = "http://www.w3.org/2000/svg"
ET.register_namespace("", NS)
DRAWABLE = {"path", "ellipse", "circle", "line", "polyline", "polygon", "rect"}

# Element indices (document order of drawable shapes) and measured boxes, per source file.
# hair = (x, y, w); mouth = (cx, cy, w) of the original smile.
POSES = {
    "neutral":       dict(file="README-02.svg", eyes=[17, 18], brows=[19, 20], mustache=22, mouth=23, hair=(311, 155, 390), mouthbox=(519, 509, 54),
                          head=[10, 11, 12, 13, 14, 16, 17, 18, 19, 20, 21, 22, 23]),
    "thinking":      dict(file="README-01.svg", eyes=[0, 1], brows=[2, 3], mustache=5, mouth=6, head=[0, 1, 2, 3, 4, 5, 6, 23, 24, 25, 26, 27, 28], hair=(342, 155, 368), mouthbox=(496.5, 473, 45)),
    "arms-crossed":  dict(file="README-03.svg", eyes=[17, 18], brows=[19, 20], mustache=22, mouth=23, head=[10, 11, 12, 13, 14, 16, 17, 18, 19, 20, 21, 22, 23], hair=(309, 115, 357), mouthbox=(499.5, 439, 49)),
    "count":         dict(file="README-04.svg", eyes=[15, 16], brows=[17, 18], mustache=20, mouth=21, head=[8, 9, 10, 11, 12, 14, 15, 16, 17, 18, 19, 20, 21], hair=(341, 129, 410), mouthbox=(550, 499.5, 56)),
    "open-palm":     dict(file="README-05.svg", eyes=[19, 20], brows=[21, 22], mustache=24, mouth=25, head=[12, 13, 14, 15, 16, 18, 19, 20, 21, 22, 23, 24, 25], hair=(205, 127, 396), mouthbox=(430, 486, 54)),
}
REF = POSES["neutral"]["hair"]


def q(tag):
    return f"{{{NS}}}{tag}"


def load(file):
    """Parse an Illustrator SVG, inline its class styles as attributes, return drawable shapes in order."""
    root = ET.parse(HERE / file).getroot()
    styles = {}
    for st in root.iter(q("style")):
        for sel, body in re.findall(r"([^{}]+)\{([^}]*)\}", st.text or ""):
            decl = dict((k.strip(), v.strip()) for k, v in (d.split(":", 1) for d in body.split(";") if ":" in d))
            for name in sel.split(","):
                name = name.strip().lstrip(".")
                styles.setdefault(name, {}).update(decl)
    shapes = []
    for el in root.iter():
        tag = el.tag.split("}")[-1]
        if tag not in DRAWABLE:
            continue
        el = copy.deepcopy(el)
        for cls in (el.get("class") or "").split():
            for k, v in styles.get(cls, {}).items():
                el.set(k, v.replace("px", ""))
        el.attrib.pop("class", None)
        el.attrib.pop("id", None)
        shapes.append(el)
    return shapes


def group(gid, children=(), transform=None):
    g = ET.Element(q("g"), {"id": gid} if gid else {})
    if transform:
        g.set("transform", transform)
    for c in children:
        g.append(c)
    return g


def path(d, **attrs):
    a = {"d": d}
    a.update({k.replace("_", "-"): str(v) for k, v in attrs.items()})
    return ET.Element(q("path"), a)


def mouths(cx, cy, w, original_smile, suffix):
    """Nine mouth groups centred on the original smile. Units are scaled to the smile's width (54 = neutral)."""
    k = w / 54.0 * 1.2  # a touch bigger than the original smile so mouth shapes read on a phone
    sw = 8.0 * k

    def P(d):  # local "x y" pairs → source coords
        return re.sub(r"(-?\d+(?:\.\d+)?) (-?\d+(?:\.\d+)?)", lambda m: f"{cx + float(m[1]) * k:.2f},{cy + float(m[2]) * k:.2f}", d)

    ink = dict(fill="none", stroke="#000", stroke_width=f"{sw:.2f}", stroke_linecap="round", stroke_linejoin="round")
    solid = dict(fill="#000", stroke="#000", stroke_width=f"{sw * 0.6:.2f}", stroke_linejoin="round")
    white = dict(fill="none", stroke="#fff", stroke_width=f"{sw * 0.5:.2f}", stroke_linecap="round")
    shapes = {
        "A": [path(P("M-23 0 Q0 3 23 0"), **ink)],                                                   # closed: M B P
        "B": [path(P("M-21 -2 Q0 -5 21 -2 Q19 10 0 11 Q-19 10 -21 -2 Z"), **solid),                  # teeth together
              path(P("M-13 3 L13 3"), **white)],
        "C": [path(P("M-21 -3 Q0 -6 21 -3 Q17 17 0 19 Q-17 17 -21 -3 Z"), **solid)],                 # open: EH AE
        "D": [path(P("M-24 -4 Q0 -7 24 -4 Q21 27 0 30 Q-21 27 -24 -4 Z"), **solid),                  # wide: AA
              path(P("M-9 21 Q0 15 9 21"), **white)],
        "E": [ET.Element(q("ellipse"), {"cx": f"{cx:.2f}", "cy": f"{cy + 7 * k:.2f}", "rx": f"{14 * k:.2f}", "ry": f"{13 * k:.2f}", "fill": "#000"})],  # rounded: AO ER
        "F": [ET.Element(q("ellipse"), {"cx": f"{cx:.2f}", "cy": f"{cy + 5 * k:.2f}", "rx": f"{7 * k:.2f}", "ry": f"{8 * k:.2f}", "fill": "#fff", "stroke": "#000", "stroke-width": f"{sw:.2f}"})],  # pucker: OO W
        "G": [path(P("M-19 9 Q0 17 19 9"), **ink),                                                    # F V: teeth on lip
              ET.Element(q("rect"), {"x": f"{cx - 12 * k:.2f}", "y": f"{cy - 3 * k:.2f}", "width": f"{24 * k:.2f}", "height": f"{9 * k:.2f}", "rx": f"{2 * k:.2f}", "fill": "#fff", "stroke": "#000", "stroke-width": f"{sw * 0.55:.2f}"})],
        "H": [path(P("M-20 -3 Q0 -6 20 -3 Q16 16 0 18 Q-16 16 -20 -3 Z"), **solid),                  # long L: tongue up
              path(P("M-8 7 Q0 1 8 7"), **white)],
        "X": [original_smile],                                                                        # rest: your smile
    }
    return [group(f"mouth-{s}{suffix}", shapes[s]) for s in "ABCDEFGHX"]


def eyes(open_eyes, suffix):
    closed = []
    for e in open_eyes:
        cx, cy = float(e.get("cx")), float(e.get("cy"))
        rx, ry = float(e.get("rx")), float(e.get("ry"))
        closed.append(path(f"M{cx - rx * 1.2:.2f},{cy + ry * 0.1:.2f} Q{cx:.2f},{cy + ry * 0.75:.2f} {cx + rx * 1.2:.2f},{cy + ry * 0.1:.2f}",
                           fill="none", stroke="#000", stroke_width="7.5", stroke_linecap="round"))
    return [group(f"eyes-open{suffix}", open_eyes), group(f"eyes-closed{suffix}", closed)]


def brows(brow_shapes, boxes, suffix):
    """neutral = your brows; raised = lifted; frown = inner ends pulled down."""
    (l, lb), (r, rb) = sorted(zip(brow_shapes, boxes), key=lambda p: p[1][0])
    c = lambda b: (b[0] + b[2] / 2, b[1] + b[3] / 2)
    lc, rc = c(lb), c(rb)
    raised = [group(f"brow-l-up{suffix}", [copy.deepcopy(l)], f"translate(0,-15) rotate(-3 {lc[0]:.1f} {lc[1]:.1f})"),
              group(f"brow-r-up{suffix}", [copy.deepcopy(r)], f"translate(0,-15) rotate(3 {rc[0]:.1f} {rc[1]:.1f})")]
    frown = [group(f"brow-l-dn{suffix}", [copy.deepcopy(l)], f"translate(2,5) rotate(12 {lc[0]:.1f} {lc[1]:.1f})"),
             group(f"brow-r-dn{suffix}", [copy.deepcopy(r)], f"translate(-2,5) rotate(-12 {rc[0]:.1f} {rc[1]:.1f})")]
    return [group(f"brows-neutral{suffix}", [l, r]), group(f"brows-raised{suffix}", raised), group(f"brows-frown{suffix}", frown)]


# Measured brow boxes (x, y, w, h) per pose — from the browser measurement.
BROW_BOX = {
    "neutral": [(410, 358, 70, 34), (533, 348, 72, 27)],
    "thinking": [(427, 340, 60, 22), (531, 349, 58, 28)],
    "arms-crossed": [(400, 301, 64, 31), (512, 292, 66, 25)],
    "count": [(442, 339, 74, 33), (571, 333, 75, 28)],
    "open-palm": [(311, 338, 70, 38), (434, 320, 74, 30)],
}


def face_parts(name, cfg, shapes, suffix):
    """Replace eyes / brows / mouth in a shape list with rig groups; mouths go under the mustache."""
    idx_eyes, idx_brows, idx_mouth, idx_mus = cfg["eyes"], cfg["brows"], cfg["mouth"], cfg["mustache"]
    out = []
    for i, s in enumerate(shapes):
        if i == idx_mus:
            out.extend(mouths(*cfg["mouthbox"], shapes[idx_mouth], suffix))  # behind the mustache
            out.append(s)
        elif i == idx_eyes[0]:
            out.extend(eyes([shapes[j] for j in idx_eyes], suffix))
        elif i == idx_brows[0]:
            out.extend(brows([shapes[j] for j in idx_brows], BROW_BOX[name], suffix))
        elif i in idx_eyes or i in idx_brows or i == idx_mouth:
            continue
        else:
            out.append(s)
    return out


def split_head(cfg, shapes, face, head_id):
    """Group a pose's head shapes (plus its face rig) into one movable group at the first head shape's z-position."""
    head_idx = set(cfg["head"])
    body_ids = {id(shapes[i]) for i in range(len(shapes)) if i not in head_idx}
    out, head, placed = [], group(head_id), False
    for item in face:
        if id(item) in body_ids:
            out.append(item)
        else:
            head.append(item)
            if not placed:
                out.append(head)
                placed = True
    return out


def align(cfg):
    """Scale + move a pose so its hair box matches the neutral one."""
    x, y, w = cfg["hair"]
    s = REF[2] / w
    return f"translate({REF[0] + REF[2] / 2:.2f} {REF[1]:.2f}) scale({s:.4f}) translate({-(x + w / 2):.2f} {-y:.2f})"


svg = ET.Element(q("svg"), {"viewBox": "150 120 735 735", "width": "1000", "height": "1000"})
svg.append(ET.Comment(" Rigged narrator — generated by avatar/build-avatar.py from README-01…05.svg. Edit the sources, then re-run. "))

# Base (rest): neutral split into body + head.
n = POSES["neutral"]
ns = load(n["file"])
head_idx = set(n["head"])
face = face_parts("neutral", n, ns, "")
body_shapes = [s for s in ns if ns.index(s) not in head_idx]
head_shapes = [s for s in face if s not in body_shapes]
svg.append(group("body", body_shapes))
svg.append(group("arm-left", [group("arm-left-rest")]))
svg.append(group("arm-right", [group("arm-right-rest")]))
svg.append(group("head", head_shapes))

# Whole-body poses, each with its own face rig (ids get -2, -3… suffixes; the renderer strips them).
for k, name in enumerate(["thinking", "arms-crossed", "count", "open-palm"], start=2):
    cfg = POSES[name]
    shapes = load(cfg["file"])
    face = face_parts(name, cfg, shapes, f"-{k}")
    svg.append(group(f"pose-{name}", [group(None, split_head(cfg, shapes, face, f"head-pose-{k}"), align(cfg))]))

ET.indent(svg, space="  ")
(HERE / "avatar.svg").write_text('<?xml version="1.0" encoding="UTF-8"?>\n' + ET.tostring(svg, encoding="unicode") + "\n")
print("wrote avatar/avatar.svg")

"""Build the reviewable TDD and the assignment's exact two-file archive."""
from pathlib import Path
from html import escape
import re
import zipfile

from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, PageBreak, Table, TableStyle, Image
from reportlab.graphics.shapes import Drawing, Rect, String, Line, Polygon
from pypdf import PdfReader

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "output" / "pdf"
OUT.mkdir(parents=True, exist_ok=True)
PDF = OUT / "Technical-Design-Document.pdf"
INK, TEAL, MUTED, RULE, PAPER = [colors.HexColor(s) for s in ["#1c292c", "#115e59", "#5c6b6a", "#dce5e2", "#f3f7f6"]]
WIDTH = A4[0] - 84
body = ParagraphStyle("Body", fontName="Helvetica", fontSize=10.1, leading=14.6, textColor=INK, spaceAfter=9, alignment=TA_LEFT)
styles = {
    "body": body,
    "title": ParagraphStyle("Title", parent=body, fontName="Helvetica-Bold", fontSize=29, leading=33, spaceBefore=13, spaceAfter=9, textColor=TEAL),
    "section": ParagraphStyle("Section", parent=body, fontName="Helvetica-Bold", fontSize=15, leading=19, spaceBefore=13, spaceAfter=8, keepWithNext=True),
    "opening": ParagraphStyle("Opening", parent=body, fontName="Helvetica-Bold", fontSize=21, leading=26, spaceAfter=13, keepWithNext=True),
    "cell": ParagraphStyle("Cell", parent=body, fontSize=9.2, leading=12.5, spaceAfter=0),
    "cell_head": ParagraphStyle("CellHead", parent=body, fontName="Helvetica-Bold", fontSize=9.2, leading=12.5, spaceAfter=0, textColor=TEAL),
    "caption": ParagraphStyle("Caption", parent=body, fontSize=8.5, leading=12, textColor=MUTED, spaceAfter=10),
    "link": ParagraphStyle("Link", parent=body, fontSize=9, leading=13, spaceAfter=3),
}

def rich(text):
    text = escape(text)
    return re.sub(r"\[([^\]]+)\]\(([^)]+)\)", lambda m: f'<link href="{m[2]}" color="#115e59"><u>{m[1]}</u></link>', text)

def para(text, style="body"):
    return Paragraph(rich(text), styles[style])

def architecture():
    d = Drawing(WIDTH, 88)
    boxes = [(0, 103, ["Parent / accounts", "React + shadcn/ui"]), (153, 196, ["Next.js route handlers", "Access + enrollment + adapters"]), (399, 112, ["Neon PostgreSQL", "Transactions + journal"])]
    for x, w, lines in boxes:
        d.add(Rect(x, 32, w, 43, rx=6, ry=6, fillColor=PAPER, strokeColor=RULE, strokeWidth=0.7))
        for i, line in enumerate(lines):
            d.add(String(x+w/2, 58-i*13, line, fontName="Helvetica-Bold" if i == 0 else "Helvetica", fontSize=8.2, textAnchor="middle", fillColor=INK))
    for x1, x2 in [(104, 151), (350, 397)]:
        d.add(Line(x1, 53, x2, 53, strokeColor=TEAL, strokeWidth=1))
        d.add(Polygon([x2,53,x2-5,56,x2-5,50],fillColor=TEAL,strokeColor=TEAL))
    d.add(String(153, 13, "Risk adapter to OpenRouter   |   Daily cron to reminder worker", fontName="Helvetica", fontSize=9, fillColor=TEAL))
    return d

def phone():
    shot = Image(str(ROOT / "docs/images/parent-mobile-hi.jpg"), width=110, height=110*844/390)
    copy = [para("A fee statement on a phone", "section"), para("The amount, date and payment action remain together. Language and child selection are above the statement; fees, attendance, scores and receipts follow below."), para("English uses Manrope; Hindi uses Noto Sans Devanagari with natural tracking and more line height. Supporting text has a 12px floor, tables use 14px and prose uses 16px."), para("Captures show fictional production demo data. Monetary status and overdue days are calculated, not drawn into the page.", "caption")]
    t = Table([[shot, copy]], colWidths=[124, WIDTH-124])
    t.setStyle(TableStyle([("VALIGN", (0,0),(-1,-1),"TOP"), ("LEFTPADDING",(0,0),(-1,-1),0), ("RIGHTPADDING",(0,0),(0,0),14), ("TOPPADDING",(0,0),(-1,-1),4), ("BOTTOMPADDING",(0,0),(-1,-1),4)]))
    return t

def table(lines):
    rows = [[c.strip() for c in line.strip().strip("|").split("|")] for line in lines]
    rows = [row for row in rows if not all(re.fullmatch(r"[-: ]+", cell) for cell in row)]
    data = [[para(c, "cell_head" if i == 0 else "cell") for c in row] for i, row in enumerate(rows)]
    t = Table(data, colWidths=[115, WIDTH-115], repeatRows=1, hAlign="LEFT")
    t.setStyle(TableStyle([("BACKGROUND",(0,0),(-1,0),PAPER), ("LINEBELOW",(0,0),(-1,0),0.7,RULE), ("LINEBELOW",(0,1),(-1,-1),0.4,RULE), ("VALIGN",(0,0),(-1,-1),"TOP"), ("LEFTPADDING",(0,0),(-1,-1),9), ("RIGHTPADDING",(0,0),(-1,-1),9), ("TOPPADDING",(0,0),(-1,-1),7), ("BOTTOMPADDING",(0,0),(-1,-1),7)]))
    return [t, Spacer(1, 10)]

def chrome(canvas, doc):
    canvas.saveState()
    if doc.page > 1:
        canvas.setFont("Helvetica-Bold", 8)
        canvas.setFillColor(TEAL)
        canvas.drawString(42, A4[1]-25, "Setu coaching fees")
        canvas.setFont("Helvetica", 8)
        canvas.setFillColor(MUTED)
        canvas.drawRightString(A4[0]-42, A4[1]-25, "Task 5 · Technical Design Document")
    canvas.setStrokeColor(RULE)
    canvas.line(42, 31, A4[0]-42, 31)
    canvas.setFont("Helvetica", 8)
    canvas.setFillColor(MUTED)
    canvas.drawString(42, 19, "3 November 2026 · Synthetic assignment demo")
    canvas.drawRightString(A4[0]-42, 19, str(doc.page))
    canvas.restoreState()

text = (ROOT / "docs/technical-design.md").read_text(encoding="utf-8")
story = []
for page_index, section in enumerate(text.split("---PAGE---")):
    if page_index:
        story.append(PageBreak())
    lines = section.strip().splitlines()
    i, first_heading = 0, True
    while i < len(lines):
        line = lines[i].strip()
        if not line:
            i += 1
            continue
        if line.startswith("|"):
            batch = []
            while i < len(lines) and lines[i].strip().startswith("|"):
                batch.append(lines[i]); i += 1
            story.extend(table(batch)); continue
        if line.startswith("## "):
            story.append(para(line[3:], "opening" if first_heading and page_index else "section")); first_heading = False
        elif line.startswith("# "):
            story.append(para(line[2:], "title"))
        elif line == "{{architecture}}":
            story.append(architecture())
        elif line == "{{phone}}":
            story.append(phone())
        elif line.startswith("!["):
            path = re.search(r"\]\(([^)]+)\)", line)[1]
            story.append(Image(str(ROOT / "docs" / path), width=WIDTH, height=WIDTH*712/1265))
            story.append(Spacer(1, 8))
        else:
            paragraph = [line]
            while i+1 < len(lines) and lines[i+1].strip() and not lines[i+1].startswith(("#", "|", "{{", "![")):
                i += 1; paragraph.append(lines[i].strip())
            story.append(para(" ".join(paragraph), "link" if line.startswith(("Repository:", "Live demo:")) else "body"))
        i += 1

doc = SimpleDocTemplate(str(PDF), pagesize=A4, leftMargin=42, rightMargin=42, topMargin=44, bottomMargin=43, title="Setu coaching fees — Technical Design Document", author="Setu assignment", pageCompression=1)
doc.build(story, onFirstPage=chrome, onLaterPages=chrome)
reader = PdfReader(PDF)
assert "github.com/Het-Jethva/setu-coaching-fees-task5" in reader.pages[0].extract_text()
assert len(reader.pages[0].get("/Annots", [])) >= 2
target = ROOT / "submission" / "setu-task5-submission.zip"
target.parent.mkdir(exist_ok=True)
with zipfile.ZipFile(target, "w", zipfile.ZIP_DEFLATED) as archive:
    archive.write(PDF, PDF.name)
    archive.write(ROOT / "deployment.md", "deployment.md")
with zipfile.ZipFile(target) as archive:
    assert archive.namelist() == ["Technical-Design-Document.pdf", "deployment.md"]
    assert archive.testzip() is None
assert target.stat().st_size < 25_000_000
print(f"PDF: {len(reader.pages)} pages; ZIP: {target.stat().st_size:,} bytes; exactly two files; links and archive integrity checked.")

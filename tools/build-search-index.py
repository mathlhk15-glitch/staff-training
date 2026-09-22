#!/usr/bin/env python3
"""Rebuild data/search-index.json without third-party packages.
Run from repository root: python3 tools/build-search-index.py
"""
from pathlib import Path
from html.parser import HTMLParser
from html import unescape
import json, re

ROOT = Path(__file__).resolve().parents[1]
TRAININGS_JS = ROOT / "data" / "trainings.js"
OUT = ROOT / "data" / "search-index.json"


def parse_trainings_js(text):
    blocks = re.findall(r'\{\s*id:\s*"([^"]+)"(.*?)\n\s*\}', text, flags=re.S)
    items = []
    for ident, body in blocks:
        def field(name, default=""):
            m = re.search(rf'{name}:\s*"([^"]*)"', body)
            return m.group(1) if m else default
        km = re.search(r'keywords:\s*\[(.*?)\]', body, flags=re.S)
        keywords = re.findall(r'"([^"]+)"', km.group(1)) if km else []
        items.append({
            "id": ident,
            "title": field("title"),
            "category": field("category"),
            "audience": field("audience"),
            "file": field("file"),
            "keywords": keywords,
        })
    return items


def clean(parts):
    return " ".join(" ".join(parts).split())


class ContentParser(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.in_content = False
        self.content_depth = 0
        self.all_text = []
        self.section = None
        self.sections = []
        self.heading_depth = 0
        self.heading_parts = []

    @staticmethod
    def attrs_dict(attrs):
        return dict(attrs)

    def handle_starttag(self, tag, attrs):
        a = self.attrs_dict(attrs)
        classes = set(a.get("class", "").split())
        if tag == "article" and "doc-content" in classes and not self.in_content:
            self.in_content = True
            self.content_depth = 1
            return
        if not self.in_content:
            return
        self.content_depth += 1
        if tag == "section" and "tr-section" in classes and a.get("id"):
            self.section = {"id": a["id"], "title": "", "parts": []}
        if self.section and tag in ("h2", "h3") and not self.section["title"]:
            self.heading_depth = 1
            self.heading_parts = []

    def handle_endtag(self, tag):
        if not self.in_content:
            return
        if self.heading_depth:
            if tag in ("h2", "h3") and self.heading_depth == 1:
                self.section["title"] = clean(self.heading_parts)
                self.heading_depth = 0
                self.heading_parts = []
            elif self.heading_depth > 1:
                self.heading_depth -= 1
        if tag == "section" and self.section:
            self.sections.append({
                "id": self.section["id"],
                "title": self.section["title"] or self.section["id"],
                "text": clean(self.section["parts"]),
            })
            self.section = None
        self.content_depth -= 1
        if tag == "article" and self.content_depth == 0:
            self.in_content = False

    def handle_data(self, data):
        if not self.in_content:
            return
        t = unescape(data).strip()
        if not t:
            return
        self.all_text.append(t)
        if self.section:
            self.section["parts"].append(t)
        if self.heading_depth:
            self.heading_parts.append(t)


items = parse_trainings_js(TRAININGS_JS.read_text(encoding="utf-8"))
index = []
for item in items:
    html = ROOT / item["file"]
    if not html.exists():
        continue
    parser = ContentParser()
    parser.feed(html.read_text(encoding="utf-8"))
    index.append({**item, "text": clean(parser.all_text), "sections": parser.sections})

OUT.write_text(json.dumps(index, ensure_ascii=False, indent=2), encoding="utf-8")
print(f"Wrote {OUT} ({len(index)} documents)")

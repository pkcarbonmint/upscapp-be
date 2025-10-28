# from docxtpl import DocxTemplate, Subdoc
# import markdown
# from html2docx import html2docx
# import tempfile


# def md_string_to_subdoc(doc: DocxTemplate, md_text: str) -> Subdoc:
#     """Convert Markdown string to Subdoc for Word."""
#     if not md_text or not md_text.strip():
#         return doc.new_subdoc()

#     html = markdown.markdown(md_text)
#     print("html>>>>>>>>", html)
#     buf = html2docx(html, "title")

#     with tempfile.NamedTemporaryFile(suffix=".docx", delete=True) as tmp:
#         tmp.write(buf.getvalue())
#         tmp.flush()
#         return doc.new_subdoc(tmp.name)


# def markdown_to_subdoc(doc: DocxTemplate, content):
#     """Recursively convert all Markdown strings in dict/list to Subdocs, preserving structure."""
#     if isinstance(content, str):
#         return md_string_to_subdoc(doc, content)

#     elif isinstance(content, dict):
#         return {k: markdown_to_subdoc(doc, v) for k, v in content.items()}

#     elif isinstance(content, list):
#         return [markdown_to_subdoc(doc, item) for item in content]

#     return content  # Return as-is for unsupported types (int, None, etc.)


import io
import tempfile
import markdown
import requests    
from docxtpl import DocxTemplate, InlineImage, RichText, Subdoc
from docx import Document
from docx.shared import Cm
from bs4 import BeautifulSoup
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from PIL import Image
import pandas as pd
import asyncio
import re
from concurrent.futures import ThreadPoolExecutor

MAX_CONCURRENT_TASKS = 2  # Match number of CPU cores
semaphore = asyncio.Semaphore(MAX_CONCURRENT_TASKS)
executor = ThreadPoolExecutor(max_workers=2)
BATCH_SIZE = 100


def build_table_subdoc(doc, table_data):
    tmp_doc = Document()
    table = tmp_doc.add_table(rows=0, cols=len(table_data[0]))
    table.style = "Table Grid"

    for row in table_data:
        row_cells = table.add_row().cells
        for i, cell in enumerate(row):
            row_cells[i].text = cell

    tmp_path = tempfile.mktemp(suffix=".docx")
    tmp_doc.save(tmp_path)
    return Subdoc(doc, tmp_path)
MAX_CHAR_WIDTH = 180
def get_auto_font_size(col_widths, padding=3):
    total_chars = sum(col_widths) + padding * len(col_widths) + 1
    if total_chars > MAX_CHAR_WIDTH:
        return max(int(10 * MAX_CHAR_WIDTH / total_chars), 6)
    else:
        return min(int(10 * MAX_CHAR_WIDTH / total_chars), 12) 

def download_image(url: str):
    url = url.strip().replace('\n', '')  # Fixes malformed URLs
    response = requests.get(url)
    if response.status_code != 200:
        raise ValueError(f"Failed to download image from {url}")

    # Try to open with Pillow and convert to supported format
    try:
        img = Image.open(io.BytesIO(response.content))
        img = img.convert("RGB")  # Ensure compatibility (removes alpha/transparency)
        output = io.BytesIO()
        img.save(output, format="JPEG")  # Use JPEG or PNG
        output.seek(0)
        return output
    except Exception as e:
        raise ValueError(f"Downloaded image is not a valid format or is corrupted: {e}")

# def markdown_to_docx_parts(md_text, doc):
#     html = markdown.markdown(md_text)
#     print("html>>>>>>>>>>>>>>", html)
#     soup = BeautifulSoup(html, "html.parser")

#     parts = []
#     rt = RichText()

#     for element in soup.recursiveChildGenerator():
#         if element.name is None:
#             rt.add(str(element))
#         elif element.name == "p":
#             rt.add(element.text)
#             parts.append(rt)
#         elif element.name in ["strong", "b"]:
#             rt.add(element.text, bold=True)
#         elif element.name in ["em", "i"]:
#             rt.add(element.text, italic=True)
#         elif element.name == "u":
#             rt.add(element.text, underline=True)
#         elif element.name == "br":
#             rt.add("\n")
#         elif element.name == "h1":
#             rt.add(element.text.upper(), bold=True, size=28)
#         elif element.name == "h2":
#             rt.add(element.text, bold=True, size=24)
#         elif element.name == "li":
#             rt.add(f"• {element.text}\n")
#         elif element.name == "img":
#             img_url = element.get("src")
#             if img_url:
#                 try:
#                     img_data = download_image(img_url)
#                     parts.append(InlineImage(doc, img_data, width=Cm(6)))
#                 except Exception as e:
#                     rt.add(f"[Image could not be loaded: {e}]")

#     return parts

# def markdown_to_docx_parts(md_text, doc):
#     html = markdown.markdown(md_text)
#     print("html>>>>>>>>>>>", html)
#     soup = BeautifulSoup(html, "html.parser")
#     print("soup>>>>>", soup)
#     parts = []

#     # for element in soup.recursiveChildGenerator():
#     for element in (soup.body or soup).children:
#         # if element.name is None:
#         #     # Text node — wrap it in a paragraph
#         #     text = element.strip()
#         #     if text:
#         #         rt = RichText()
#         #         rt.add(text)
#         #         parts.append(rt)

#         # elif element.name == "p":
#         #     # We'll build a RichText for the paragraph
#         #     rt = RichText()
#         #     for sub in element.descendants:
#         #         if sub.name is None:
#         #             rt.add(sub)
#         #         elif sub.name in ["strong", "b"]:
#         #             rt.add(sub.get_text(), bold=True)
#         #         elif sub.name in ["em", "i"]:
#         #             rt.add(sub.get_text(), italic=True)
#         #         elif sub.name == "u":
#         #             rt.add(sub.get_text(), underline=True)
#         #         elif sub.name == "img":
#         #             img_url = element.get("src")
#         #             if img_url:
#         #                 try:
#         #                     img_data = download_image(img_url)
#         #                     parts.append(InlineImage(doc, img_data, width=Cm(6)))
#         #                 except Exception as e:
#         #                     rt = RichText()
#         #                     rt.add(f"[Image could not be loaded: {e}]")
#         #                     parts.append(rt)

#         #     parts.append(rt)
#         # if element.name == "p":
#         #     # New paragraph block
#         #     for sub in element.contents:
#         #         if isinstance(sub, str):
#         #             rt = RichText()
#         #             rt.add(sub)
#         #             parts.append(rt)

#         #         elif sub.name in ["strong", "b"]:
#         #             rt = RichText()
#         #             rt.add(sub.get_text(), bold=True)
#         #             parts.append(rt)

#         #         elif sub.name in ["em", "i"]:
#         #             rt = RichText()
#         #             rt.add(sub.get_text(), italic=True)
#         #             parts.append(rt)

#         #         elif sub.name == "u":
#         #             rt = RichText()
#         #             rt.add(sub.get_text(), underline=True)
#         #             parts.append(rt)

#         #         elif sub.name == "img":
#         #             img_url = sub.get("src")
#         #             if img_url:
#         #                 try:
#         #                     img_data = download_image(img_url)
#         #                     parts.append(InlineImage(doc, img_data, width=Cm(6)))
#         #                 except Exception as e:
#         #                     rt = RichText()
#         #                     rt.add(f"[Image could not be loaded: {e}]")
#         #                     parts.append(rt)

#         #         else:
#         #             # Any other inline content
#         #             rt = RichText()
#         #             rt.add(sub.get_text())
#         #             parts.append(rt)   
#         if element.name == "p":
#             rt = RichText()
#             for child in element.contents:
#                 if isinstance(child, str):
#                     rt.add(child)
#                 elif child.name in ["strong", "b"]:
#                     rt.add(child.get_text(), bold=True)
#                 elif child.name in ["em", "i"]:
#                     rt.add(child.get_text(), italic=True)
#                 elif child.name == "u":
#                     rt.add(child.get_text(), underline=True)
#                 elif child.name in ["h1", "h2", "h3"]:
#                     level = {"h1": 20, "h2": 16, "h3": 14}[child.name]
#                     rt.add(child.get_text(), bold=True, size=level)
#                 elif child.name in ["s", "strike", "del"]:
#                     rt.add(child.get_text(), strike=True)
#                 elif child.name == "sup":
#                     rt.add(child.get_text(), style="superscript")
#                 elif child.name == "sub":
#                     rt.add(child.get_text(), style="subscript")
#                 elif child.name == "code":
#                     rt.add(child.get_text(), font="Courier New")
#                 elif child.name == "li":
#                     rt.add(f"• {child.get_text()}")
#                 elif child.name == "img":
#                     img_url = child.get("src")
#                     if img_url:
#                         try:
#                             parts.append(rt)  # flush what we’ve built so far
#                             rt = RichText()
#                             img_data = download_image(img_url)
#                             parts.append(InlineImage(doc, img_data, width=Cm(6)))
#                         except Exception as e:
#                             rt.add(f"[Image could not be loaded: {e}]")
#                 elif child.name == "ul":
#                     for li in child.find_all("li"):
#                         rt.add(f"• {li.get_text()}\n")

#                 elif child.name == "ol":
#                     for idx, li in enumerate(child.find_all("li"), 1):
#                         rt.add(f"{idx}. {li.get_text()}\n")
#                 elif child.name == "br":
#                     rt.add("\n")

#             parts.append(rt)
#         elif element.name == "br":
#             rt = RichText()
#             rt.add("\n")
#             parts.append(rt)

#         elif element.name == "h1":
#             rt = RichText()
#             rt.add(element.get_text().upper(), bold=True, size=28)
#             parts.append(rt)

#         elif element.name == "h2":
#             rt = RichText()
#             rt.add(element.get_text(), bold=True, size=24)
#             parts.append(rt)

#         elif element.name == "li":
#             rt = RichText()
#             rt.add(f"• {element.get_text()}")
#             parts.append(rt)

#         elif element.name == "img":
#             img_url = element.get("src")
#             if img_url:
#                 try:
#                     img_data = download_image(img_url)
#                     parts.append(InlineImage(doc, img_data, width=Cm(6)))
#                 except Exception as e:
#                     rt = RichText()
#                     rt.add(f"[Image could not be loaded: {e}]")
#                     parts.append(rt)

#     print("parts>>>>>>>", parts)
#     return parts

DEFAULT_FONT_SIZE = 18
def markdown_to_docx_parts(md_text, doc):
    # Remove leading spaces before numbers
    md_text = re.sub(r"(?m)^\s+(\d+\.)", r"\1", md_text)
    
    # Remove blank lines before numbered points
    md_text = re.sub(r"(?m)^\n*(\d+\.)", r"\1", md_text)

    # Force Markdown not to treat them as lists by adding a non-breaking space before numbers
    # but only if they are at the start of a line
    md_text = re.sub(r"(?m)^(\d+)\.", r"&nbsp;\1.", md_text)
    html = markdown.markdown(md_text,extensions=["extra", "sane_lists"])
    soup = BeautifulSoup(html, "html.parser")
    # print("soupd>>>", soup)
    parts = []

    # for element in soup.body.children if soup.body else []:
    for element in (soup.body or soup).children:
        rt = RichText()

        if element.name in ["p", "li"]:
            # Inline content inside paragraph or list item
            for child in element.contents:
                if isinstance(child, str):
                    rt.add(child,size=DEFAULT_FONT_SIZE)
                elif child.name in ["strong", "b"]:
                    rt.add(child.get_text(), bold=True,size=DEFAULT_FONT_SIZE)
                elif child.name in ["em", "i"]:
                    rt.add(child.get_text(), italic=True,size=DEFAULT_FONT_SIZE)
                elif child.name == "u":
                    rt.add(child.get_text(), underline=True,size=DEFAULT_FONT_SIZE)
                elif child.name == "s":
                    rt.add(child.get_text(), strike=True,size=DEFAULT_FONT_SIZE)
                elif child.name == "a":
                    href = child.get("href")
                    if href:
                        rt.add(f"{child.get_text(strip=True)}", url_id=doc.build_url_id(href),size=DEFAULT_FONT_SIZE)
                    else:
                        rt.add(child.get_text(), underline=True,size=DEFAULT_FONT_SIZE)
                # elif child.name == "a":
                #     href = child.get("href")
                #     if href:
                #         rt.add(f"{child.get_text()} ({href})", underline=True)
                #     else:
                #         rt.add(child.get_text(), underline=True)
                elif child.name == "sup":
                    rt.add(child.get_text(),  bold=False, subscript=False, superscript=True,size=DEFAULT_FONT_SIZE)
                elif child.name == "sub":
                    rt.add(child.get_text(),bold=False, subscript=True, superscript=False,size=DEFAULT_FONT_SIZE)
                elif child.name == "code":
                    rt.add(child.get_text(), font="Courier New",size=DEFAULT_FONT_SIZE)
                elif child.name == "br":
                    rt.add("\n")
                # elif child.name == "a":
                #     rt.add(child.get_text() + f" ({child.get('href')})")
                elif child.name == "img":
                    img_url = child.get("src")
                    if img_url:
                        parts.append(rt)  # flush text before image
                        rt = RichText()
                        try:
                            img_data = download_image(img_url)
                            parts.append(InlineImage(doc, img_data, width=Cm(6)))
                        except Exception as e:
                            rt.add(f"[Image could not be loaded: {e}]")

            if element.name == "li":
                rt_text = rt.text if hasattr(rt, "text") else ""
                rt = RichText()
                rt.add(f"• {rt_text}",size=DEFAULT_FONT_SIZE)
            parts.append(rt)

        elif element.name == "br":
            rt.add("\n")
            parts.append(rt)
        elif element.name == "a":
            href = element.get("href")
            if href:
                rt.add(f"{element.get_text()} ({href})", underline=True,size=DEFAULT_FONT_SIZE)
            else:
                rt.add(element.get_text(), underline=True,size=DEFAULT_FONT_SIZE)
        elif element.name in ["h1", "h2", "h3"]:
            size_map = {"h1": 28, "h2": 24, "h3": 20}
            rt.add(element.get_text(), bold=True, size=size_map[element.name])
            parts.append(rt)

        # elif element.name == "ul":
        #     for li in element.find_all("li"):
        #         rt = RichText()
        #         rt.add(f"• {li.get_text()}")
        #         parts.append(rt)
        elif element.name == "ul":
            for li in element.find_all("li", recursive=False):
                rt = RichText()
                rt.add("• ")  # Add bullet manually before content

                for child in li.contents:
                    if isinstance(child, str):
                        rt.add(child,size=DEFAULT_FONT_SIZE)
                    elif child.name in ["strong", "b"]:
                        rt.add(child.get_text(), bold=True,size=DEFAULT_FONT_SIZE)
                    elif child.name in ["em", "i"]:
                        rt.add(child.get_text(), italic=True,size=DEFAULT_FONT_SIZE)
                    elif child.name == "u":
                        rt.add(child.get_text(), underline=True,size=DEFAULT_FONT_SIZE)
                    elif child.name == "s":
                        rt.add(child.get_text(), strike=True,size=DEFAULT_FONT_SIZE)
                    elif child.name == "a":
                        href = child.get("href")
                        if href:
                            rt.add(child.get_text(strip=True), url_id=doc.build_url_id(href),size=DEFAULT_FONT_SIZE)
                        else:
                            rt.add(child.get_text(), underline=True,size=DEFAULT_FONT_SIZE)
                    elif child.name == "sup":
                        rt.add(child.get_text(),  bold=False, subscript=False, superscript=True,size=DEFAULT_FONT_SIZE)
                    elif child.name == "sub":
                        rt.add(child.get_text(),bold=False, subscript=True, superscript=False,size=DEFAULT_FONT_SIZE)
                    elif child.name == "code":
                        rt.add(child.get_text(), font="Courier New",size=DEFAULT_FONT_SIZE)
                    elif child.name == "br":
                        rt.add("\n")
                    elif child.name == "img":
                        img_url = child.get("src")
                        if img_url:
                            parts.append(rt)  # flush text before image
                            rt = RichText()
                            try:
                                img_data = download_image(img_url)
                                parts.append(InlineImage(doc, img_data, width=Cm(6)))
                            except Exception as e:
                                rt.add(f"[Image could not be loaded: {e}]")
                    
                    elif child.name == "table":
                        # ─── Handle table inside <li> ──────────────────────
                        rows = child.find_all("tr")
                        data = []
                        for row in rows:
                            cells = row.find_all(["td", "th"])
                            data.append([cell.get_text(strip=True) for cell in cells])

                        num_cols = max(len(row) for row in data)
                        col_widths = [0] * num_cols
                        for row in data:
                            for i, cell in enumerate(row):
                                col_widths[i] = max(col_widths[i], len(cell))

                        def middle_line():
                            return "╠" + "╬".join("═" * (w + 2) for w in col_widths) + "╣"

                        font_size = get_auto_font_size(col_widths)
                        table_str = ""
                        # Top
                        table_str += "╔" + "╦".join("═" * (w + 2) for w in col_widths) + "╗\n"

                        for i, row in enumerate(data):
                            row_str = "║ " + " ║ ".join(cell.ljust(col_widths[j]) for j, cell in enumerate(row)) + " ║"
                            table_str += row_str + "\n"
                            if i == 0:
                                table_str += middle_line() + "\n"
                        # Bottom
                        table_str += "╚" + "╩".join("═" * (w + 2) for w in col_widths) + "╝\n"

                        rt.add("\n" + table_str, font="Courier New", size=font_size, bold=True)
                    ##
                    else:
                        rt.add(child.get_text(),size=DEFAULT_FONT_SIZE)  # fallback for unknown tags

                parts.append(rt)

        # elif element.name == "ol":
        #     for idx, li in enumerate(element.find_all("li"), 1):
        #         rt = RichText()
        #         rt.add(f"{idx}. {li.get_text()}")
        #         parts.append(rt)
        elif element.name == "ol":
            for li in element.find_all("li", recursive=False):
                rt = RichText()
                rt.add("• ")  # Add bullet manually before content

                for child in li.contents:
                    if isinstance(child, str):
                        rt.add(child,size=DEFAULT_FONT_SIZE)
                    elif child.name in ["strong", "b"]:
                        rt.add(child.get_text(), bold=True,size=DEFAULT_FONT_SIZE)
                    elif child.name in ["em", "i"]:
                        rt.add(child.get_text(), italic=True,size=DEFAULT_FONT_SIZE)
                    elif child.name == "u":
                        rt.add(child.get_text(), underline=True,size=DEFAULT_FONT_SIZE)
                    elif child.name == "s":
                        rt.add(child.get_text(), strike=True,size=DEFAULT_FONT_SIZE)
                    elif child.name == "sup":
                        rt.add(child.get_text(),  bold=False, subscript=False, superscript=True,size=DEFAULT_FONT_SIZE)
                    elif child.name == "sub":
                        rt.add(child.get_text(),bold=False, subscript=True, superscript=False,size=DEFAULT_FONT_SIZE)
                    elif child.name == "code":
                        rt.add(child.get_text(), font="Courier New",size=DEFAULT_FONT_SIZE)
                    elif child.name == "br":
                        rt.add("\n")
                    elif child.name == "table":
                        # ─── Handle table inside <li> ──────────────────────
                        rows = child.find_all("tr")
                        data = []
                        for row in rows:
                            cells = row.find_all(["td", "th"])
                            data.append([cell.get_text(strip=True) for cell in cells])

                        num_cols = max(len(row) for row in data)
                        col_widths = [0] * num_cols
                        for row in data:
                            for i, cell in enumerate(row):
                                col_widths[i] = max(col_widths[i], len(cell))

                        def middle_line():
                            return "╠" + "╬".join("═" * (w + 2) for w in col_widths) + "╣"

                        font_size = get_auto_font_size(col_widths)
                        table_str = ""
                        # Top
                        table_str += "╔" + "╦".join("═" * (w + 2) for w in col_widths) + "╗\n"

                        for i, row in enumerate(data):
                            row_str = "║ " + " ║ ".join(cell.ljust(col_widths[j]) for j, cell in enumerate(row)) + " ║"
                            table_str += row_str + "\n"
                            if i == 0:
                                table_str += middle_line() + "\n"
                        # Bottom
                        table_str += "╚" + "╩".join("═" * (w + 2) for w in col_widths) + "╝\n"

                        rt.add("\n" + table_str, font="Courier New", size=font_size, bold=True)
                    elif child.name == "a":
                        href = child.get("href")
                        if href:
                            rt.add(child.get_text(strip=True), url_id=doc.build_url_id(href),size=DEFAULT_FONT_SIZE)
                        else:
                            rt.add(child.get_text(), underline=True,size=DEFAULT_FONT_SIZE)
                    elif child.name == "img":
                        img_url = child.get("src")
                        if img_url:
                            parts.append(rt)  # flush text before image
                            rt = RichText()
                            try:
                                img_data = download_image(img_url)
                                parts.append(InlineImage(doc, img_data, width=Cm(6)))
                            except Exception as e:
                                rt.add(f"[Image could not be loaded: {e}]")
                    else:
                        rt.add(child.get_text(),size=DEFAULT_FONT_SIZE)  # fallback for unknown tags

                parts.append(rt)

        elif element.name == "img":
            img_url = element.get("src")
            if img_url:
                try:
                    img_data = download_image(img_url)
                    parts.append(InlineImage(doc, img_data, width=Cm(6)))
                except Exception as e:
                    rt = RichText()
                    rt.add(f"[Image could not be loaded: {e}]")
                    parts.append(rt)
        elif element.name == "hr":
            # Add a horizontal line (emulated as a row of underscores)
            rt.add("______________________________")
            parts.append(rt)

        # Blockquote
        elif element.name == "blockquote":
            rt = RichText()
            for child in element.descendants:
                if isinstance(child, str):
                    rt.add(child.strip(), italic=True)
                elif child.name == "br":
                    rt.add("\n")
                elif child.name in ["strong", "b"]:
                    rt.add(child.get_text(), bold=True, italic=True)
                elif child.name in ["em", "i"]:
                    rt.add(child.get_text(), italic=True)
                elif child.name == "a":
                    href = child.get("href")
                    text = child.get_text(strip=True)
                    rt.add(text, italic=True, url_id=doc.build_url_id(href) if href else None)
                else:
                    rt.add(child.get_text(), italic=True)
            parts.append(rt)

        elif element.name == "table":
            rows = element.find_all("tr")
            data = []
            for row in rows:
                cells = row.find_all(["td", "th"])
                data.append([cell.get_text(strip=True) for cell in cells])

            num_cols = max(len(row) for row in data)
            col_widths = [0] * num_cols
            for row in data:
                for i, cell in enumerate(row):
                    col_widths[i] = max(col_widths[i], len(cell))

            def horizontal_line(char="═", junction="╬"):
                return junction.join([char * (w + 2) for w in col_widths]).join(["╔", "╗"]) if char == "═" else \
                    junction.join([char * (w + 2) for w in col_widths]).join(["╚", "╝"])

            def vertical_line():
                return "║"

            def middle_line():
                return "╠" + "╬".join("═" * (w + 2) for w in col_widths) + "╣"

            table_str = ""
            font_size = get_auto_font_size(col_widths)

            # Top line
            table_str += "╔" + "╦".join("═" * (w + 2) for w in col_widths) + "╗\n"

            for i, row in enumerate(data):
                row_str = vertical_line() + " " + " ║ ".join(cell.ljust(col_widths[j]) for j, cell in enumerate(row)) + " " + vertical_line()
                table_str += row_str + "\n"

                if i == 0:
                    table_str += middle_line() + "\n"

            # Bottom line
            table_str += "╚" + "╩".join("═" * (w + 2) for w in col_widths) + "╝\n"

            rt = RichText()
            rt.add(table_str, font="Courier New", size=font_size, bold=True)
            parts.append(rt)
        else:
            text = element.get_text(strip=True)
            if text:
                rt = RichText(text)
                parts.append(rt)

        # elif element.name == "table":
        #     rows = element.find_all("tr")
        #     table_data = [
        #         [cell.get_text(strip=True) for cell in row.find_all(["td", "th"])]
        #         for row in rows
        #     ]
        #     if table_data:
        #         subdoc = build_table_subdoc(doc, table_data)
        #         parts.append(subdoc)
        # print("parts>>>>", parts)
    return parts

async def markdown_to_docx_parts_async(md_text, doc):
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(executor, markdown_to_docx_parts, md_text, doc)


async def preprocess_question_async(q, doc):
    async with semaphore:
        context_parts = await markdown_to_docx_parts_async(q.get("context", ""), doc)
        question_parts = await markdown_to_docx_parts_async(q.get("question", ""), doc)
        explanation_parts = await markdown_to_docx_parts_async(q.get("explanation", ""), doc)

        options_parts = []
        for op in q.get("options", []):
            value_parts = await markdown_to_docx_parts_async(op.get("value", ""), doc)
            options_parts.append({
                "value_parts": value_parts,
                "isCorrect": op.get("isCorrect", False)
            })

        subquestions = []
        for cq in q.get("questions", []):
            cq_question_parts = await markdown_to_docx_parts_async(cq.get("question", ""), doc)
            cq_explanation_parts = await markdown_to_docx_parts_async(cq.get("explanation", ""), doc)

            cq_options = []
            for op in cq.get("options", []):
                cq_value_parts = await markdown_to_docx_parts_async(op.get("value", ""), doc)
                cq_options.append({
                    "value_parts": cq_value_parts,
                    "isCorrect": op.get("isCorrect", False)
                })

            subquestions.append({
                "question_parts": cq_question_parts,
                "explanation_parts": cq_explanation_parts,
                "options": cq_options
            })

        return {
            "subject_name": q.get("subject", {}).get("name"),
            "topic_name": q.get("topic", {}).get("name"),
            "ca_topic_name": q.get("current_affairs_topic", {}).get("name"),
            "cms_id": q.get("id"),
            "year": [sou["year"] for sou in q.get("source", []) if sou.get("year")],
            "source_name": [sou["name"] for sou in q.get("source", []) if sou.get("year")],
            "context_parts": context_parts,
            "question_parts": question_parts,
            "explanation_parts": explanation_parts,
            "options": options_parts,
            "questions": subquestions
        }


async def preprocess_all_questions(res_mcq, res_cq, doc):
    all_questions = res_mcq + res_cq
    preprocessed_questions = []

    for i in range(0, len(all_questions), BATCH_SIZE):
        batch = all_questions[i:i + BATCH_SIZE]
        tasks = [preprocess_question_async(q, doc) for q in batch]
        batch_results = await asyncio.gather(*tasks)
        preprocessed_questions.extend(batch_results)

    return preprocessed_questions
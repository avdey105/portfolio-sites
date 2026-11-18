from __future__ import annotations

from pathlib import Path

from openpyxl import Workbook
from openpyxl.styles import Alignment, Font, PatternFill
from openpyxl.utils import get_column_letter


HEADERS = [
    "Название товара",
    "Цена за штуку",
    "Оптовая цена",
    "Канал",
    "Ссылка на пост",
    "Папка с медиа",
    "Полный текст поста",
]


def write_products_excel(rows: list[dict], path: Path) -> None:
    wb = Workbook()
    ws = wb.active
    ws.title = "Товары"

    header_fill = PatternFill("solid", fgColor="1F4E78")
    header_font = Font(color="FFFFFF", bold=True)
    for col, header in enumerate(HEADERS, start=1):
        cell = ws.cell(row=1, column=col, value=header)
        cell.fill = header_fill
        cell.font = header_font
        cell.alignment = Alignment(horizontal="center", vertical="center", wrap_text=True)

    for row_index, item in enumerate(rows, start=2):
        values = [
            item.get("product_name", ""),
            item.get("unit_price", ""),
            item.get("wholesale_price", ""),
            item.get("source_channel", ""),
            item.get("source_link", ""),
            item.get("media_folder", ""),
            item.get("full_text", ""),
        ]
        for col_index, value in enumerate(values, start=1):
            cell = ws.cell(row=row_index, column=col_index, value=value)
            cell.alignment = Alignment(vertical="top", wrap_text=True)
            if col_index == 5 and value:
                cell.hyperlink = value
                cell.style = "Hyperlink"

    widths = [32, 18, 26, 28, 34, 32, 70]
    for col_index, width in enumerate(widths, start=1):
        ws.column_dimensions[get_column_letter(col_index)].width = width

    ws.freeze_panes = "A2"
    ws.auto_filter.ref = ws.dimensions

    for row in range(2, len(rows) + 2):
        ws.row_dimensions[row].height = 70

    path.parent.mkdir(parents=True, exist_ok=True)
    wb.save(path)

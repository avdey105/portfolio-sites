from __future__ import annotations

import csv
import html
import re
from pathlib import Path
from typing import Iterable

from openpyxl import load_workbook


BASE_DIR = Path(__file__).resolve().parent
AVITO_XLSX = BASE_DIR / "avito.xlsx"
AVIRONA_TEMPLATE = BASE_DIR / "avirona-import-template.csv"
OUTPUT_CSV = BASE_DIR / "avirona-import-template-filled-from-avito.csv"


def text(value) -> str:
    if value is None:
        return ""
    return str(value).strip()


def first_nonempty(row: dict[str, str], names: Iterable[str]) -> str:
    for name in names:
        value = text(row.get(name))
        if value:
            return value
    return ""


def clean_description(value: str) -> str:
    value = text(value)
    if not value:
        return ""

    value = re.sub(r"(?i)<\s*br\s*/?\s*>", "\n", value)
    value = re.sub(r"(?i)</\s*p\s*>\s*<\s*p[^>]*>", "\n", value)
    value = re.sub(r"(?i)</?\s*p[^>]*>", "\n", value)
    value = re.sub(r"<[^>]+>", " ", value)
    value = html.unescape(value)
    value = value.replace("\xa0", " ")
    value = re.sub(r"[ \t\r\f\v]+", " ", value)
    value = re.sub(r"\s*\n\s*", " ", value)
    return re.sub(r"\s{2,}", " ", value).strip()


def normalize_photos(value: str) -> str:
    parts = [part.strip() for part in re.split(r"\s*\|\s*", text(value)) if part.strip()]
    return "|".join(parts)


def normalize_price(value: str) -> str:
    value = text(value)
    if not value:
        return ""
    value = re.sub(r"[^\d.,]", "", value)
    if "," in value and "." not in value:
        value = value.replace(",", ".")
    if "." in value:
        try:
            return str(int(round(float(value))))
        except ValueError:
            return value
    return value


def city_from_address(address: str) -> str:
    address = text(address)
    if not address:
        return "Москва"
    return address.split(",", 1)[0].strip() or "Москва"


def normalize_multiline(value: str) -> str:
    lines = [line.strip() for line in text(value).splitlines() if line.strip()]
    return "; ".join(lines)


def first_compatible_make_model(value: str) -> tuple[str, str]:
    for line in text(value).splitlines():
        parts = [part.strip() for part in line.split("|")]
        if len(parts) >= 2 and parts[0]:
            return parts[0], parts[1]
    return "", ""


def original_flag(origin: str) -> str:
    origin_l = text(origin).lower()
    if origin_l == "оригинал":
        return "да"
    if origin_l in {"аналог", "неоригинал"}:
        return "нет"
    return ""


def load_avirona_template() -> tuple[list[str], list[str]]:
    with AVIRONA_TEMPLATE.open("r", encoding="utf-8-sig", newline="") as f:
        rows = list(csv.reader(f))
    if len(rows) < 2:
        raise ValueError("CSV-шаблон Авироны должен содержать минимум две строки.")
    return rows[0], rows[1]


def read_avito_rows() -> list[dict[str, str]]:
    workbook = load_workbook(AVITO_XLSX, data_only=True, read_only=False)
    rows: list[dict[str, str]] = []

    for sheet in workbook.worksheets:
        if sheet.title == "Инструкция" or sheet.title.startswith("Спр-"):
            continue

        category_path = text(sheet.cell(row=1, column=1).value)
        headers = [text(cell.value) for cell in sheet[2]]

        for values in sheet.iter_rows(min_row=5, values_only=True):
            source = {
                header: text(values[index]) if index < len(values) else ""
                for index, header in enumerate(headers)
                if header
            }
            if not text(source.get("Название объявления")):
                continue
            source["_sheet"] = sheet.title
            source["_category_path"] = category_path
            rows.append(source)

    return rows


def build_avirona_row(source: dict[str, str], headers: list[str], first_index: dict[str, int]) -> list[str]:
    out = [""] * len(headers)

    def put(field: str, value: str, *, overwrite: bool = False) -> None:
        value = text(value)
        if not value or field not in first_index:
            return
        index = first_index[field]
        if overwrite or not out[index]:
            out[index] = value

    category_path = text(source.get("_category_path"))
    path_parts = [part.strip() for part in category_path.split(" - ") if part.strip()]
    source_part_group = first_nonempty(source, ["Вид запчасти", "Вид устройства", "Тип защиты", "Тип аксессуара"])
    source_part_type = first_nonempty(
        source,
        [
            "Тип детали двигателя",
            "Тип детали трансмиссии",
            "Тип детали кузова",
            "Тип запчасти топливной системы",
            "Тип запчасти",
            "Тип защиты",
            "Тип аксессуара",
            "Вид устройства",
        ],
    )

    compatibility = normalize_multiline(source.get("Авто для которых подходит запчасть", ""))
    compat_make, compat_model = first_compatible_make_model(source.get("Авто для которых подходит запчасть", ""))
    source_make = text(source.get("Марка"))
    source_model = text(source.get("Модель"))
    part_make = source_make or compat_make
    part_model = source_model or compat_model
    manufacturer = text(source.get("Производитель"))
    oem = first_nonempty(source, ["Номер детали OEM", "Номер оригинала"])
    origin = text(source.get("Происхождение"))
    sheet_context = f"{category_path} {source_part_group} {source_part_type}".lower()

    put("title", source.get("Название объявления", ""))
    put("description", clean_description(source.get("Описание объявления", "")))
    put("price", normalize_price(source.get("Цена", "")))
    put("category", path_parts[0] if path_parts else "Транспорт")
    put("subcategory", path_parts[1] if len(path_parts) > 1 else "Запчасти и аксессуары")
    put("location", city_from_address(source.get("Адрес", "")))
    put("photos", normalize_photos(source.get("Ссылки на фото", "")))
    put("condition", source.get("Состояние", ""))
    put("brand", manufacturer)
    put("brands", manufacturer)
    put("origin", origin)
    put("original", original_flag(origin))
    put("oem_number", oem)
    put("oemNumber", oem)
    put("product_type", source.get("Вид товара", ""))
    put("type", source_part_type or source_part_group)
    put("offer_type", source.get("Вид объявления", ""))
    put("vehicle_type", source.get("Тип товара", ""))
    put("spec_type", source.get("Тип спецтехники", ""))
    put("compatibility", compatibility)
    put("delivery_time", source.get("Доступность", ""))
    put("material", source.get("Материал", ""))
    put("color", source.get("Цвет кузова", ""))
    put("sale_type", "Продажа")
    put("seller_type", "Компания")

    put("partMake", part_make)
    put("partModel", part_model)
    put("car_brand", part_make)
    put("carBrand", part_make)
    put("model", part_model)

    if text(source.get("Тип спецтехники")):
        put("truck_brand", part_make)
        put("spec_brand", part_make)

    if "двигател" in sheet_context or "топлив" in sheet_context or "охлажден" in sheet_context:
        put("engine_type", source_part_type or source_part_group)
    if "подвес" in sheet_context or "рулев" in sheet_context:
        put("chassis_part", source_part_type or source_part_group)
    if "гидравл" in sheet_context or "пневм" in sheet_context:
        put("hydro_part", source_part_type or source_part_group)
    if "трансмисс" in sheet_context or "сцеплен" in sheet_context:
        put("trans_part", source_part_type or source_part_group)
    if "электро" in sheet_context or "стартер" in sheet_context or "генератор" in sheet_context:
        put("electro_part", source_part_type or source_part_group)
    if "тормозн" in sheet_context:
        put("brake_type", source_part_type or source_part_group)
    if "кузов" in sheet_context or "стекл" in sheet_context or "стёкл" in sheet_context:
        put("cabin_part", source_part_type or source_part_group)
        put("body_type", source_part_type or source_part_group)
    if "фильтр" in sheet_context:
        put("filter_type", source_part_type or source_part_group)

    return out


def main() -> None:
    headers, labels = load_avirona_template()
    first_index: dict[str, int] = {}
    for index, header in enumerate(headers):
        first_index.setdefault(header, index)

    avito_rows = read_avito_rows()
    output_rows = [headers, labels]
    output_rows.extend(build_avirona_row(row, headers, first_index) for row in avito_rows)

    with OUTPUT_CSV.open("w", encoding="utf-8-sig", newline="") as f:
        writer = csv.writer(f)
        writer.writerows(output_rows)

    print(f"Создан файл: {OUTPUT_CSV.name}")
    print(f"Объявлений перенесено: {len(avito_rows)}")
    print(f"Всего строк в CSV: {len(output_rows)}")


if __name__ == "__main__":
    main()

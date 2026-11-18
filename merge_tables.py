import pandas as pd

def merge_tables(file1, file2, output_file):
    """
    Объединяет две таблицы из Excel-файлов, складывая количества по цветам и выбирая большую цену.
    
    Args:
        file1 (str): Путь к первому Excel-файлу.
        file2 (str): Путь к второму Excel-файлу.
        output_file (str): Путь к итоговому Excel-файлу.
    """
    # Загружаем данные из Excel-файлов
    df1 = pd.read_excel(file1)
    df2 = pd.read_excel(file2)
    
    # Определяем список столбцов с цветами
    colors = ['⚫️', '⚪️', '💗', '🔴', '🟡', '🟢', '🟣', '🔵', '🩶']
    
    # Объединяем таблицы по столбцу "модель" с параметром how='outer' для включения всех моделей
    df_merged = pd.merge(df1, df2, on='модель', how='outer', suffixes=('_1', '_2'))
    
    # Складываем количества по каждому цвету, заменяя NaN на 0
    for color in colors:
        df_merged[color] = df_merged[f'{color}_1'].fillna(0) + df_merged[f'{color}_2'].fillna(0)
    
    # Выбираем максимальную цену из двух таблиц
    df_merged['цена'] = df_merged[['цена_1', 'цена_2']].max(axis=1)
    
    # Удаляем временные столбцы с суффиксами _1 и _2
    df_merged = df_merged[['модель'] + colors + ['цена']]
    
    # Сохраняем итоговую таблицу в новый Excel-файл
    df_merged.to_excel(output_file, index=False)
    print(f"Итоговая таблица сохранена в файл: {output_file}")

# Пути к файлам
file1 = '1output_table.xlsx'  # если файлы в той же папке
file2 = '2output_table.xlsx'
output_file = 'merged_table.xlsx'

# Вызов функции для объединения таблиц
merge_tables(file1, file2, output_file)
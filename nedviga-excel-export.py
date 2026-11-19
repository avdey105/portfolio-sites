import pandas as pd
import sqlite3
import re
import emoji
import os
from datetime import datetime

# Определяем путь к базе данных относительно текущего модуля
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MODULE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.path.join(MODULE_DIR, 'news.db')

def clean_text(text: str) -> str:
    """Очистка текста от эмодзи и специальных символов"""
    # Удаляем эмодзи
    text = emoji.replace_emoji(text, '')
    
    # Удаляем звездочки
    text = re.sub(r'\*+', '', text)
    
    # Удаляем множественные пробелы и переносы строк
    text = re.sub(r'\s+', ' ', text)
    
    return text.strip()

def export_news_to_excel(output_path: str = None) -> str:
    """
    Экспортирует новости из базы данных в Excel файл
    
    Args:
        output_path: Путь для сохранения Excel файла. Если не указан, 
                    генерируется автоматически с текущей датой
    
    Returns:
        str: Путь к созданному Excel файлу
    """
    try:
        # Подключаемся к базе данных
        conn = sqlite3.connect(DB_PATH)
        
        # Получаем все новости
        query = "SELECT text, date, channel_id FROM news ORDER BY date DESC"
        df = pd.read_sql_query(query, conn)
        
        # Очищаем текст новостей
        df['text'] = df['text'].apply(clean_text)
        
        # Если путь не указан, генерируем его в корневой директории проекта
        if not output_path:
            current_date = datetime.now().strftime('%Y-%m-%d_%H-%M')
            output_path = os.path.join(BASE_DIR, f'news_export_{current_date}.xlsx')
        
        # Сохраняем в Excel
        df.to_excel(output_path, index=False, engine='openpyxl')
        
        conn.close()
        return output_path
        
    except Exception as e:
        raise Exception(f"Ошибка при экспорте в Excel: {str(e)}") 
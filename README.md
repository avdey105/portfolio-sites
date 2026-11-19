# Работы Авдея Голубкова

[Открыть портфолио](https://avdey105.github.io/portfolio-sites/)

В этом репозитории собраны сайты, исходники и примеры моих работ с каталогами и таблицами.

| Работа | Посмотреть | Исходники |
| --- | --- | --- |
| «Холодок», сайт ремонта холодильников | [Сайт](https://avdey105.github.io/portfolio-sites/holodok/) · [Как я разобрал поломки по страницам](https://avdey105.github.io/portfolio-sites/cases/holodok/) | [Вёрстка v53 и ресурсы для Pages](holodok.zip) |
| AlterEgo для Android | [Экраны приложения](https://avdey105.github.io/portfolio-sites/cases/android/) | [Полноэкранный просмотр](FullscreenImageViewer.tsx), [геометрия просмотра](image-viewer-geometry.ts) |
| Дагдел, «Дагестанские деликатесы» | [Полный сайт](https://avdey105.github.io/portfolio-sites/urbech/?v=20261118) · [Карточки и корзина](https://avdey105.github.io/portfolio-sites/cases/dagdel/) | [Проект Next.js](dagdel-source.zip), [сборка для Pages](urbech.zip) |
| «Ручной уют», свечи и подарки | [Сайт](https://avdey105.github.io/portfolio-sites/candles/) · [Каталог и подарки](https://avdey105.github.io/portfolio-sites/cases/candles/) | [HTML, CSS, JavaScript и ресурсы](candles.zip) |
| Alter Ego, лендинг для партнёров | [Сайт](https://avdey105.github.io/portfolio-sites/alterego-partners/) · [Сценарий для автора](https://avdey105.github.io/portfolio-sites/cases/partners/) | [Исходная вёрстка](alterego-partners.zip) |
| Модульные пространства | [Сайт и бриф](https://avdey105.github.io/portfolio-sites/modular/) · [Как устроен подбор](https://avdey105.github.io/portfolio-sites/cases/modular/) | [HTML, CSS, JavaScript и ресурсы](modular.zip) |
| Товарные сообщения Telegram → Excel | [Описание и пример](https://avdey105.github.io/portfolio-sites/cases/telegram-export/) | [Модуль выгрузки](telegram-excel-export.py) |
| Nedviga News, бот о недвижимости | [Как устроен бот](https://avdey105.github.io/portfolio-sites/cases/nedviga/) · [Пример Excel](https://avdey105.github.io/portfolio-sites/cases/nedviga/nedviga-test-export.xlsx) | [Исходный модуль выгрузки](nedviga-excel-export.py) |
| Работа с таблицами и товарными выгрузками | [Опыт и примеры](https://avdey105.github.io/portfolio-sites/cases/excel-stock/) | [Сведение остатков](merge_tables.py), [Авито → Avirona](convert_avito_to_avirona.py) |

Для размещения на GitHub Pages адаптированы адреса файлов. Формы заявок работают в режиме локальной демонстрации.

Чтобы открыть «Холодок», «Ручной уют», сайт для партнёров или сайт модульных помещений локально, распакуйте архив. Запустите `python -m http.server 8000` в папке, где появилась папка сайта. Затем откройте в браузере `http://localhost:8000/` и выберите её.

В архиве исходников Дагдела есть инструкция `GITHUB_PAGES.md`. Чтобы открыть готовую сборку на своём компьютере, распакуйте `urbech.zip` в папку `portfolio-sites`, запустите HTTP-сервер из родительской папки и откройте путь `/portfolio-sites/urbech/`.

#!/bin/bash
# Загружает подготовленный репозиторий Chiaro Studio в приватный репозиторий GitHub.
# Перед запуском создай ПУСТОЙ приватный репозиторий: github.com/new → имя chiaro-studio → Private → без README.
set -e
cd "$(dirname "$0")"
URL="https://github.com/dovgiykostya-jpg/chiaro-studio.git"
if git remote get-url origin >/dev/null 2>&1; then git remote set-url origin "$URL"; else git remote add origin "$URL"; fi
echo "Загружаю в $URL ..."
git push -u origin main
echo "Готово. Открой вкладку Actions на странице репозитория и запусти render-video."

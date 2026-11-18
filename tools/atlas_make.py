#!/usr/bin/env python3
"""tools/atlas_make.py — Atlas Studio: одна команда от идеи до готового пакета ролика.

  python3 tools/atlas_make.py "Тема или идея" [--format long|shorts] [--slug name] [--seconds 80]
                              [--series] [--from-step N] [--dry] [--voice-from файл.wav --script-from файл.txt]

Шаги (каждый возобновляем: --from-step N продолжает с шага N, озвучка не повторяется, если уже есть):
  1 сценарий     Gemini пишет по стандарту удержания -> studio.py check script -> до 2 кругов правок -> проверка фактов (поиск Google)
  2 озвучка      gemini_tts.py --dry-run -> ОДИН запрос -> studio.py check voice (темп, инструкция вслух, дубли, сверка текста)
  3 ролик        transcribe (Whisper) -> auto_storyboard -> studio.py render (preflight -> рендер -> звук -> ворота качества)
  4 обложки      thumb_plates -> thumb_make -> thumb_check (порог 80), 3 варианта
  5 пакет        3 названия с баллом, описание, теги (yt_intel tags), главы, закреп -> ДЛЯ_ЗАГРУЗКИ.txt -> publish_lint
  6 журнал       ЖУРНАЛ.md (пишется после каждого шага)
Выход: ~/Desktop/Видео_<дата по Киеву>_<slug>/. Проект движка: ~/razgon-2d-studio/projects/<slug>.
--dry: только сценарий и план (без озвучки и рендера). Ничего не публикуется на YouTube.
"""
import argparse, json, os, re, shutil, subprocess, sys, time
from datetime import datetime
from pathlib import Path

HERE = Path(__file__).resolve().parent; STUDIO = HERE.parent; QA = Path.home() / "frame-qa"
sys.path.insert(0, str(HERE))
import atlas_gemini as AG
PY = sys.executable
ENV = dict(os.environ, KMP_DUPLICATE_LIB_OK="TRUE")
RETENTION = Path.home() / ".claude/skills/next-video/RETENTION.md"
TR = dict(zip("абвгдеёжзийклмнопрстуфхцчшщъыьэюя", "a b v g d e e zh z i y k l m n o p r s t u f h ts ch sh sch  y  e yu ya".split(" ")))


def kyiv_now():
    try:
        from zoneinfo import ZoneInfo; return datetime.now(ZoneInfo("Europe/Kyiv"))
    except Exception: return datetime.now()


def slugify(s):
    s = "".join(TR.get(c, c) for c in s.lower()); s = re.sub(r"[^a-z0-9]+", "_", s).strip("_")
    return "_".join(s.split("_")[:5])[:40] or "video"


def sh(cmd, cwd=None, log=None, timeout=None):
    r = subprocess.run(cmd, cwd=cwd, capture_output=True, text=True, env=ENV, timeout=timeout)
    out = (r.stdout or "") + (r.stderr or "")
    if log: Path(log).write_text(out, encoding="utf-8")
    return r.returncode, out


def dur(p): return float(subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(p)], capture_output=True, text=True).stdout.strip() or 0)
def wc(t): return len(re.findall(r"[\wё\-]+", t))
def score_line(out): m = re.search(r"Итог: PASS (\d+), WARN (\d+), FAIL (\d+)", out); return (int(m[1]), int(m[2]), int(m[3])) if m else None
def tc(sec): sec = int(round(sec)); return f"{sec // 60}:{sec % 60:02d}" if sec < 3600 else f"{sec // 3600}:{sec % 3600 // 60:02d}:{sec % 60:02d}"


class Run:
    def __init__(s, a):
        s.a = a; date = kyiv_now().strftime("%Y-%m-%d"); s.slug = a.slug or slugify(a.topic)
        s.out = Path(a.out_dir).expanduser() if a.out_dir else Path.home() / "Desktop" / f"Видео_{date}_{s.slug}"
        s.out.mkdir(parents=True, exist_ok=True); s.proj = STUDIO / "projects" / s.slug
        s.state_f = s.out / "state.json"
        s.st = json.loads(s.state_f.read_text(encoding="utf-8")) if s.state_f.exists() else dict(topic=a.topic, slug=s.slug, format=a.format, seconds=a.seconds, series=a.series, steps={}, tts_requests=0, created=kyiv_now().strftime("%d.%m.%Y %H:%M"))
        s.save()

    def save(s): s.state_f.write_text(json.dumps(s.st, ensure_ascii=False, indent=1), encoding="utf-8")

    def step(s, n, title, status, lines):
        s.st["steps"][str(n)] = dict(title=title, status=status, lines=lines, at=kyiv_now().strftime("%d.%m %H:%M")); s.save(); s.journal()
        print(f"\n=== Шаг {n}. {title}: {status}"); [print("  ", l) for l in lines]

    def journal(s):
        L = [f"# ЖУРНАЛ: {s.st.get('title') or s.st['topic']}", "", f"Atlas Studio · тема «{s.st['topic']}» · формат {s.st['format']} · начато {s.st['created']} (Киев)",
             f"Папка: {s.out}", f"Запросов озвучки (TTS) в этом ролике: {s.st.get('tts_requests', 0)}", "", "| Шаг | Что | Проверено | Итог |", "|---|---|---|---|"]
        for k in sorted(s.st["steps"], key=int):
            x = s.st["steps"][k]; L.append(f"| {k} | {x['title']} | {x.get('checked', '') or (x['lines'][0] if x['lines'] else '')} | {x['status']} |")
        for k in sorted(s.st["steps"], key=int):
            x = s.st["steps"][k]; L += ["", f"## Шаг {k}. {x['title']} — {x['status']} ({x['at']})", *[f"- {l}" for l in x["lines"]]]
        L += ["", "Публикацию на YouTube делает только пользователь. Балл обложек и линтеров — проверка формы; настоящий ответ даст YouTube Studio."]
        (s.out / "ЖУРНАЛ.md").write_text("\n".join(L), encoding="utf-8")


# ---------------------------------------------------------------- 1. сценарий
SCRIPT_SCHEMA = {"type": "OBJECT", "properties": {
    "title": {"type": "STRING"}, "paragraphs": {"type": "ARRAY", "items": {"type": "STRING"}}, "headings": {"type": "ARRAY", "items": {"type": "STRING"}},
    "facts": {"type": "ARRAY", "items": {"type": "STRING"}}}, "required": ["title", "paragraphs", "headings", "facts"]}


def write_script(R, feedback=None, prev=None):
    a = R.a; words = int(a.seconds * 2.3); rules = RETENTION.read_text(encoding="utf-8") if RETENTION.exists() else ""
    fmt = "вертикальный Shorts до 60 секунд" if a.format == "shorts" else f"ролик 16:9 примерно на {a.seconds} секунд"
    p = f"""Ты сценарист русскоязычного YouTube-канала объясняющих роликов для взрослых (аудитория СНГ, подача на «ты», спокойно и плотно, без детскости и хоррора).
Напиши закадровый текст: {fmt}, примерно {words} слов (±10%). Тема: «{a.topic}».
Стандарт удержания канала (обязателен):
{rules}
Жёсткие требования к тексту:
- Первые 1–2 фразы — хук: конкретное обещание + ставка, в первых ~40 словах есть слово «покажу» или «узнаешь» или число. Без «привет», «сегодня», «давайте разберёмся».
- 3–5 абзацев (абзац = смысловой блок 10–25 секунд). Абзацы кроме последнего заканчиваются короткой фразой-крючком (≤ 10 слов) со словом «но», «дальше», «хуже», «страшнее» или «следующ».
- Средняя фраза ≤ 12 слов, ни одной длиннее 22 слов, 15–25% фраз ≤ 5 слов. Обращение «ты/тебе/твой» часто.
- В тексте 1–2 петли: «запомни это», «а вот», «но сначала», «дальше хуже». Во второй половине явно вернись к обещанию хука словами «на самом деле» или «вот ответ».
- ВСЕ числа пиши словами так, как их произносит диктор («сорок процентов», «тысяча девятьсот семьдесят третьем»), без цифр и сокращений.
- Только проверяемые факты; если сомневаешься — смягчи («по оценкам», «обычно»). Без брендов-обвинений.
- Финал без вопроса зрителю. {'Последняя фраза: «Продолжение следует.»' if a.series else 'Без «продолжение следует», финал — короткий вывод.'}
- headings: короткий заголовок (1–3 слова) к каждому абзацу для глав в описании. facts: список всех фактических утверждений и чисел из текста (каждое отдельной строкой).
- title: название ролика для YouTube до 60 символов, обещает то же, что хук.
"""
    if feedback: p += f"\n\nЭто ПРАВКА прошлой версии. Прошлый текст:\n{prev}\n\nЗамечания проверки (исправь все FAIL и как можно больше WARN, смысл и факты сохрани):\n{feedback}\n"
    return AG.gen_json(p, SCRIPT_SCHEMA, temperature=0.8, what="сценарий" + (" (правка)" if feedback else ""))


def step1(R):
    lines = []; best = None
    if R.a.script_from:
        txt = Path(R.a.script_from).expanduser().read_text(encoding="utf-8").strip(); paras = [p for p in re.split(r"\n\s*\n", txt) if p.strip()]
        res = dict(title=R.a.title or R.a.topic, paragraphs=paras, headings=[" ".join(p.split()[:3]).strip(".,") for p in paras], facts=[]); lines.append(f"сценарий взят из файла {R.a.script_from} (без Gemini)")
        rounds = [res]
    else:
        res = write_script(R); rounds = [res] if res else []
        if not res: R.step(1, "Сценарий", "СТОП", ["Gemini не ответил (лимит текстовых моделей?): " + "; ".join(AG.LOG[-3:]), "Что сделать: повторить позже или дать готовый текст --script-from файл.txt"]); sys.exit(2)
    base = len(list(R.out.glob("сценарий_v*.txt"))) if R.a.script_from else 0     # новая версия — новым файлом, старые не трогаем
    for k in range(3):
        cur = rounds[-1]; f = R.out / f"сценарий_v{base + k + 1}.txt"; f.write_text("\n\n".join(cur["paragraphs"]).strip() + "\n", encoding="utf-8")
        rep = R.out / f"проверка_сценария_v{k + 1}.md"
        code, out = sh([PY, str(QA / "studio.py"), "check", "script", str(f), "--out", str(rep)] + ([] if R.a.series else ["--no-series"]))
        sc = score_line(out); lines.append(f"v{k + 1}: {wc(f.read_text(encoding='utf-8'))} слов, script_lint PASS {sc[0]} WARN {sc[1]} FAIL {sc[2]}" if sc else f"v{k + 1}: проверка не дала итога")
        best = (f, cur, sc)
        if sc and sc[2] == 0 and (sc[1] <= 2 or k == 2): break
        if k == 2 or R.a.script_from: break
        nxt = write_script(R, feedback=re.sub(r"\n## Числа.*", "", rep.read_text(encoding="utf-8"), flags=re.S), prev=f.read_text(encoding="utf-8"))
        if not nxt: lines.append("правка: Gemini не ответил, оставляю текущую версию"); break
        rounds.append(nxt)
    f, cur, sc = best
    if not sc or sc[2] > 0: R.step(1, "Сценарий", "СТОП", lines + [f"FAIL в {f.name} после 2 кругов правок — см. {f.with_name('проверка_сценария_' + f.stem.split('_')[-1] + '.md').name}", "Что сделать: поправить текст вручную и запустить --from-step 1 --script-from файл"]); sys.exit(2)
    # проверка фактов с поиском Google
    facts = cur.get("facts") or []; fact_md = ["# Факты для проверки", "", f"Сценарий: {f.name}", ""]
    if facts:
        q = "Проверь каждое утверждение по надёжным источникам (энциклопедии, госстандарты, научные и отраслевые источники). Для каждого строка формата: «N. ВЕРДИКТ — короткое пояснение — источник», где ВЕРДИКТ одно из: ВЕРНО, СПОРНО, НЕВЕРНО. Отвечай по-русски.\n\n" + "\n".join(f"{i + 1}. {x}" for i, x in enumerate(facts))
        txt, src = AG.grounded(q, what="проверка фактов")
        if not txt:                                            # поиск Google недоступен на бесплатном ключе — опора на Википедию
            wk = AG.wiki_context(R.a.topic)
            if wk:
                ctx = "\n\n".join(f"### {t}\n{x}" for t, u, x in wk); src = [f"{t} {u}" for t, u, _ in wk]
                txt = AG.gen_text(q.replace("по надёжным источникам (энциклопедии, госстандарты, научные и отраслевые источники)", "ТОЛЬКО по приведённым статьям Википедии; если в статьях нет данных — вердикт СПОРНО") + "\n\nСтатьи:\n" + ctx, temperature=0.1, what="проверка фактов по Википедии")
        if txt:
            fact_md += [txt.strip(), "", "## Источники поиска", *[f"- {s}" for s in src[:15]]]
            bad = len(re.findall(r"НЕВЕРНО", txt)); doubt = len(re.findall(r"СПОРНО", txt)); ok = len(re.findall(r"ВЕРНО", txt)) - bad
            lines.append(f"факты: {len(facts)} утверждений проверено поиском Google — верно {ok}, спорно {doubt}, неверно {bad} (ФАКТЫ.md)")
            if bad and not R.a.script_from:
                fixed = write_script(R, feedback="Проверка фактов нашла ошибки, исправь или убери эти утверждения, остальное не меняй:\n" + txt, prev=f.read_text(encoding="utf-8"))
                if fixed:
                    nf = R.out / f"сценарий_v{int(f.stem.split('_v')[-1]) + 1}.txt"; nf.write_text("\n\n".join(fixed["paragraphs"]).strip() + "\n", encoding="utf-8")
                    code, out = sh([PY, str(QA / "studio.py"), "check", "script", str(nf), "--out", str(nf.with_name("проверка_сценария_" + nf.stem.split("_")[-1] + ".md"))] + ([] if R.a.series else ["--no-series"]))
                    sc2 = score_line(out)
                    if sc2 and sc2[2] == 0: f, cur, sc = nf, fixed, sc2; lines.append(f"{nf.name}: исправлены неверные факты, script_lint PASS {sc2[0]} WARN {sc2[1]} FAIL 0")
                    else: lines.append(f"{nf.name}: правка фактов дала FAIL линтера — оставлена {f.name}, неверные факты отмечены в ФАКТЫ.md")
        else:
            fact_md += ["Поиск недоступен — проверить вручную:", *[f"- [ ] {x}" for x in facts]]; lines.append(f"факты: {len(facts)} утверждений НЕ проверены (поиск недоступен) — список в ФАКТЫ.md")
    if facts or not (R.out / "ФАКТЫ.md").exists(): (R.out / "ФАКТЫ.md").write_text("\n".join(fact_md), encoding="utf-8")
    else: lines.append("факты: текст задан вручную — проверка фактов в ФАКТЫ.md не перезаписана")
    final = R.out / "сценарий.txt"; shutil.copy(f, final)
    R.st.update(title=cur.get("title") or R.a.topic, headings=cur.get("headings") or [], script=str(final), script_version=f.name)
    R.step(1, "Сценарий", "ОК", lines + [f"итоговая версия: {f.name} -> сценарий.txt; название-черновик: «{R.st['title']}»"])
    R.st["steps"]["1"]["checked"] = f"script_lint: FAIL {sc[2]}, WARN {sc[1]}"; R.save(); R.journal()


# ---------------------------------------------------------------- 2. озвучка
def step2(R):
    R.proj.mkdir(parents=True, exist_ok=True); (R.proj / "input").mkdir(exist_ok=True)
    wav = R.proj / "input/voiceover.wav"; script = R.proj / "input/script.txt"; shutil.copy(R.st["script"], script)
    lines = []
    if R.a.voice_from:
        shutil.copy(Path(R.a.voice_from).expanduser(), wav); lines.append(f"озвучка взята из файла {R.a.voice_from} (0 запросов TTS)")
    elif wav.exists() and R.st.get("voice_for") == Path(R.st["script"]).read_text(encoding="utf-8"):
        lines.append("озвучка уже есть для этого текста — повторно не озвучиваю (0 запросов)")
    else:
        code, out = sh([PY, str(HERE / "gemini_tts.py"), "--text", str(script), "--out", str(wav), "--dry-run"]); lines += [l.strip() for l in out.splitlines() if l.strip()][:4]
        if R.a.dry: R.step(2, "Озвучка", "ПРОПУЩЕНО (--dry)", lines); return False
        code, out = sh([PY, str(HERE / "gemini_tts.py"), "--text", str(script), "--out", str(wav), "--budget", str(R.a.tts_budget)])
        R.st["tts_requests"] = R.st.get("tts_requests", 0) + (0 if "СТОП: бюджет" in out else 1); R.save()
        (R.out / "озвучка_лог.txt").write_text(out, encoding="utf-8")
        if code or not wav.exists():
            why = "дневной лимит TTS исчерпан (429 per day)" if "лимит" in out.lower() or "per day" in out.lower() else ("бюджет запросов на сегодня" if "бюджет" in out else "ошибка озвучки")
            R.step(2, "Озвучка", "СТОП", lines + [f"{why}: {out.strip().splitlines()[-1][:200] if out.strip() else ''}", "Что сделать: дождаться сброса лимита (полночь по Тихоокеанскому времени = 10:00 по Киеву) и запустить --from-step 2, или --voice-from готовый.wav"]); sys.exit(3)
        lines += [l.strip() for l in out.splitlines() if l.startswith(("ok ", "ОБРЕЗАНО", "Начало", "ВНИМАНИЕ"))]
    R.st["voice_for"] = Path(R.st["script"]).read_text(encoding="utf-8") if not R.a.voice_from else "external"; R.save()
    code, out = sh([PY, str(QA / "studio.py"), "check", "voice", str(wav), str(script)], log=R.out / "проверка_озвучки.txt")
    tail = [l.strip() for l in out.splitlines() if re.search(r"темп|дубл|ЛИШНЕЕ|ПРОПУЩЕНО|СТОП|✅", l)]
    if code: R.step(2, "Озвучка", "СТОП", lines + tail + ["Что сделать: лишнее вырезать по таймкодам (ffmpeg atrim), пропущенное переозвучить одним куском; затем --from-step 2 --voice-from исправленный.wav"]); sys.exit(3)
    R.step(2, "Озвучка", "ОК", lines + tail + [f"длительность {dur(wav):.1f} с"]); R.st["steps"]["2"]["checked"] = "check voice: темп, инструкция вслух, дубли, сверка текста"; R.save(); R.journal()
    return True


# ---------------------------------------------------------------- 3. ролик
def step3(R):
    P = R.proj; lines = []
    cfg = dict(title=R.st.get("title") or R.a.topic, aspect="9:16" if R.a.format == "shorts" else "16:9", resolution="1080p", fps=24, style="dusk", voiceover="input/voiceover.wav",
               script="input/script.txt", duration=round(dur(P / "input/voiceover.wav") + 1.2, 2), captions=True, bars="wide" if R.a.format == "long" else "none", fadeIn=0.5, fadeOut=0.8,
               music=dict(enabled=True, gainDb=-19), sfx=dict(enabled=True, gainDb=-6), loudness=-14)
    if R.a.format == "shorts": cfg["captionStyle"] = dict(size=78)
    (P / "config.json").write_text(json.dumps(cfg, ensure_ascii=False, indent=1), encoding="utf-8")
    t0 = time.time(); code, out = sh([PY, str(HERE / "transcribe.py"), "--project", str(P), "--lang", "ru", "--script", str(P / "input/script.txt")], log=R.out / "тайминги_лог.txt")
    m = re.search(r"script alignment: (\d+)/(\d+)", out)
    if code: R.step(3, "Ролик", "СТОП", ["Whisper не отработал: см. тайминги_лог.txt"]); sys.exit(4)
    lines.append(f"тайминги Whisper: совпало {m[1]} из {m[2]} слов сценария ({int(m[1]) * 100 // int(m[2])}%), {time.time() - t0:.0f} с" if m else "тайминги готовы")
    code, out = sh([PY, str(HERE / "auto_storyboard.py"), "--project", str(P)] + (["--series"] if R.a.series else ["--no-series"]))
    lines += [l.strip() for l in out.splitlines() if l.startswith(("Раскадровка", "Шаблоны"))]
    if code: R.step(3, "Ролик", "СТОП", lines + ["auto_storyboard упал:", out[-400:]]); sys.exit(4)
    sh(["node", "render.mjs", "--project", str(P), "--sheet", "--scale", "0.4"], cwd=STUDIO)
    sheets = sorted((P / "build/sheets").glob("sheet_*.png"))
    for k, s_ in enumerate(sheets): shutil.copy(s_, R.out / f"лист_кадров_v1_{k + 1}.png")
    lines.append(f"лист кадров: {len(sheets)} файл(ов) лист_кадров_v1_*.png")
    if R.a.dry: R.step(3, "Ролик", "ПРОПУЩЕН РЕНДЕР (--dry)", lines); return
    for f in (P / "out").glob("*.mp4") if (P / "out").exists() else []: f.unlink()
    t0 = time.time(); code, out = sh([PY, str(QA / "studio.py"), "render", str(P)], log=R.out / "рендер_лог.txt")
    pf = re.findall(r"Итог: PASS (\d+), WARN (\d+), FAIL (\d+)\.\n", out)
    gate = re.search(r"Ворота качества.*?Итог: PASS (\d+), WARN (\d+), FAIL (\d+)", out, re.S)
    if pf: lines.append(f"preflight (check project): PASS {pf[0][0]} WARN {pf[0][1]} FAIL {pf[0][2]}")
    if code or not gate: R.step(3, "Ролик", "СТОП", lines + ["рендер или ворота не пройдены — см. рендер_лог.txt", out.strip().splitlines()[-1][:200] if out.strip() else ""]); sys.exit(4)
    fin = sorted((P / "out").glob("*_final.mp4"), key=lambda x: x.stat().st_mtime)[-1]
    base = re.sub(r"[^\wё\- ]+", "", R.st.get("title") or R.slug).strip().replace(" ", "_")[:60]
    n = 1
    while (R.out / f"{base}_v{n}.mp4").exists(): n += 1                     # новая версия — новым файлом
    name = f"{base}_v{n}.mp4"
    shutil.copy(fin, R.out / name); R.st["video"] = str(R.out / name)
    srt = R.out / "субтитры.srt"; make_srt(P, srt)
    code2, out2 = sh([PY, str(QA / "final_gate.py"), str(R.out / name), "--voice", str(P / "input/voiceover.wav"), "--srt", str(srt), "--out", str(R.out / "ворота_качества.md")])
    g2 = score_line(out2)
    lines += [f"рендер + звук: {time.time() - t0:.0f} с; ролик {name}, {dur(R.out / name):.1f} с", f"ворота качества (с субтитрами): PASS {g2[0]} WARN {g2[1]} FAIL {g2[2]} — ворота_качества.md"]
    R.step(3, "Ролик", "ОК" if g2 and g2[2] == 0 else "СТОП", lines); R.st["steps"]["3"]["checked"] = f"preflight FAIL {pf[0][2] if pf else '?'}; ворота {g2[0]}/{sum(g2)} PASS, FAIL {g2[2]}"; R.save(); R.journal()
    if not g2 or g2[2]: sys.exit(4)


def make_srt(P, out, per=7):
    w = json.loads((P / "timeline/words.json").read_text(encoding="utf-8")); ws = w["words"] if isinstance(w, dict) else w
    f = lambda t: f"{int(t // 3600):02d}:{int(t % 3600 // 60):02d}:{int(t % 60):02d},{int(round((t % 1) * 1000)) % 1000:03d}"
    L, i, k = [], 0, 1
    while i < len(ws):
        grp = ws[i:i + per]; j = next((n for n, x in enumerate(grp) if re.search(r"[.!?…]$", x["word"])), None); grp = grp[:j + 1] if j is not None else grp
        L += [str(k), f"{f(grp[0]['start'])} --> {f(grp[-1]['end'])}", " ".join(x["word"] for x in grp), ""]; i += len(grp); k += 1
    out.write_text("\n".join(L), encoding="utf-8")


# ---------------------------------------------------------------- 4. обложки
def step4(R):
    P = R.proj; story = json.loads((P / "story/shots.json").read_text(encoding="utf-8")); shots = story["shots"]; lines = []
    work = R.out / "обложки_v1"; (work / "исходники").mkdir(parents=True, exist_ok=True)
    sets = [s["params"].get("set") or (s["params"].get("bg") or {}).get("set") for s in shots]; main_set = max((x for x in sets if x and x != "void"), key=sets.count, default="city")
    calm = [x for x in sorted(set(sets), key=sets.count, reverse=True) if x and x not in ("void", "store")]; hero_set = calm[0] if calm else "city"   # пёстрый магазин — плохая подложка под героя
    icons = [i for s in shots for i in (s["params"].get("icons") or ([s["params"]["icon"]] if s["params"].get("icon") else [])) if i not in ("question", "warning", "check", "cross")]
    main_icon = max(set(icons), key=icons.count) if icons else "warning"
    plates = [dict(tpl="insert", kind="icon", icons=[main_icon], bg=dict(set=main_set), dim=0.45),
              dict(tpl="face", who="hero", expr="shocked", bg=dict(set=main_set), side=-1, fx0=0.7, look=[-0.4, -0.1], icon=None),
              dict(tpl="wide", set=hero_set, fg=False, actors=[dict(t="hero", x=0.72, s=3.2, f=-1, pose="holdFront", expr="worried", y=1.02, hold=main_icon)], z0=1.0, z1=1.0, x0=0, x1=0)]
    pj = work / "исходники/plates.json"; pj.write_text(json.dumps(plates, ensure_ascii=False), encoding="utf-8")
    code, out = sh([PY, str(QA / "thumb_plates.py"), "--project", str(P), "--shots", str(pj), "--out", str(work / "исходники")])
    pl = sorted((work / "исходники").glob("plate_*.png"))
    if len(pl) < 3: R.step(4, "Обложки", "СТОП", ["thumb_plates не дал подложек: " + out[-300:]]); return
    script = Path(R.st["script"]).read_text(encoding="utf-8")
    ICN = json.loads((STUDIO / "engine/kit/schema.json").read_text(encoding="utf-8"))["icons"]
    sch = {"type": "OBJECT", "properties": {"object": {"type": "STRING", "enum": ICN}, "phrases": {"type": "ARRAY", "items": {"type": "OBJECT", "properties": {"text": {"type": "STRING"}, "accent": {"type": "STRING"}}, "required": ["text", "accent"]}}}, "required": ["object", "phrases"]}
    res = AG.gen_json(f"Придумай 3 разные фразы для обложки YouTube-ролика «{R.st.get('title')}». Каждая 1–4 слова ПРОПИСНЫМИ, максимум 2 строки (разделитель |), только то, что реально сказано в тексте, интрига без обмана, взрослый тон. accent — одно слово из фразы для выделения цветом. object — иконка, которая сразу показывает предмет ролика (сам продукт/предмет темы, а не абстракция).\nТекст ролика:\n{script}", sch, what="фразы обложек")
    if res and res.get("object") in ICN:
        plates[0]["icons"] = [res["object"]]; plates[2]["actors"][0]["hold"] = res["object"]; pj.write_text(json.dumps(plates, ensure_ascii=False), encoding="utf-8")
        for f_ in pl: f_.unlink()
        sh([PY, str(QA / "thumb_plates.py"), "--project", str(P), "--shots", str(pj), "--out", str(work / "исходники")]); pl = sorted((work / "исходники").glob("plate_*.png"))
        lines.append(f"предмет темы на обложке A: иконка «{res['object']}»")
    phr = [(x["text"].upper(), x["accent"].upper()) for x in (res or {}).get("phrases", []) if 1 <= len(x["text"].replace("|", " ").split()) <= 4][:3]
    while len(phr) < 3: w = (R.st.get("title") or R.a.topic).upper().split(); phr.append(("|".join([" ".join(w[:2]), " ".join(w[2:4])]).strip("|"), w[-1] if w else ""))
    names = ["A", "B", "C"]; variants = [dict(side="left", darken="0.55"), dict(side="left", darken="0.7", tw="0.5"), dict(side="top", darken="0.6"), dict(side="right", darken="0.6"),
                                          dict(side="left", darken="0.75", tw="0.55", plate=1), dict(side="top", darken="0.75", plate=1)]
    spots = ["0.66,0.45,0.25,0.5", "0.72,0.62,0.3,0.45", "0.7,0.6,0.3,0.45"]; crops = ["0.0,0.1,0.72,0.72", None, None]
    topic = R.a.topic; best = []
    import importlib.util; spec = importlib.util.spec_from_file_location("tc", QA / "thumb_check.py"); tcm = importlib.util.module_from_spec(spec); spec.loader.exec_module(tcm)
    if not (tcm.THUMBS / tcm.slug(topic)).exists():                     # обложки конкурентов темы — для пункта «выделение»
        try: sh([PY, str(QA / "yt_intel.py"), "thumbs", topic, "--n", "12"], timeout=400); lines.append("обложки конкурентов собраны (yt_intel thumbs)")
        except Exception as e: lines.append(f"обложки конкурентов не собраны: {str(e)[:60]}")
    for k, (plate, (text, acc)) in enumerate(zip(pl, phr)):
        cand = []
        for vi, v in enumerate(variants):
            o = work / f"{names[k]}_{slugify(text.replace('|', ' '))}_{vi + 1}.jpg"
            cmd = [PY, str(QA / "thumb_make.py"), "--bg", str(plate), "--text", text, "--accent", acc, "--color", "yellow", "--side", v["side"], "--darken", v["darken"], "--spot", spots[k], "--out", str(o)]
            if crops[k]: cmd += ["--crop", crops[k]]
            if v.get("tw"): cmd += ["--tw", v["tw"]]
            if v.get("plate"): cmd += ["--plate"]
            if v["side"] == "right" and k > 0: continue
            if v["side"] == "top" and k == 2: continue                        # герой в полный рост: текст сверху ложится на голову
            if sh(cmd)[0]: continue
            c2, o2 = sh([PY, str(QA / "thumb_check.py"), str(o), "--topic", topic, "--json"])
            try:
                js = json.loads(o2[o2.index("["):]); raw = scv = js[0]["score"]
                if any("задевает" in i.get("msg", "") and not i.get("ok") for i in js[0].get("items", [])): scv -= 15   # текст на главном объекте — при выборе варианта штрафуем
            except Exception: raw = scv = 0
            cand.append((scv, o, raw))
            if scv >= 90: break
        cand.sort(key=lambda x: -x[0])
        if cand:
            cand = [(c[2], c[1]) for c in cand]                                   # в отчёт — настоящий балл thumb_check
            win = cand[0][1]; final = work / f"{names[k]}_{slugify(text.replace('|', ' '))}.jpg"
            for _, o in cand[1:]: o.unlink(missing_ok=True); Path(str(o)[:-4] + ".json").unlink(missing_ok=True)
            win.rename(final); Path(str(win)[:-4] + ".json").rename(str(final)[:-4] + ".json")
            best.append((names[k], cand[0][0], final, text))
    mock = work / "мокап_выдачи.png"
    c3, o3 = sh([PY, str(QA / "thumb_check.py"), *[str(b[2]) for b in best], "--topic", topic, "--mockup", str(mock), "--title", R.st.get("title", "")])
    (work / "проверка_обложек.txt").write_text(o3, encoding="utf-8")
    best.sort(key=lambda b: -b[1]); R.st["thumbs"] = [str(b[2]) for b in best]
    rep = ["# Обложки v1", "", "| Обложка | Фраза | Балл thumb_check |", "|---|---|---|"] + [f"| {b[2].name} | {b[3].replace('|', ' / ')} | {b[1]} |" for b in best] + ["", f"Первой ставить: {best[0][2].name} (наибольший балл). Порог показа 80. Загрузите все три в «Тест и сравнение» в Studio.", "Подробно по пунктам: проверка_обложек.txt; выдача: мокап_выдачи.png."]
    (work / "ОТЧЁТ_обложки.md").write_text("\n".join(rep), encoding="utf-8")
    ok = all(b[1] >= 80 for b in best) and len(best) == 3
    lines += [f"{b[2].name}: «{b[3].replace('|', ' ')}» — {b[1]}/100" for b in best] + [f"мокап выдачи: {mock.name}"]
    lines = [re.sub(r"\s{2,}", " ", l) for l in lines]
    R.step(4, "Обложки", "ОК" if ok else "ЕСТЬ ОБЛОЖКИ < 80", lines); R.st["steps"]["4"]["checked"] = "thumb_check: " + ", ".join(str(b[1]) for b in best); R.save(); R.journal()


# ---------------------------------------------------------------- 5. пакет
def step5(R):
    P = R.proj; lines = []; script = Path(R.st["script"]).read_text(encoding="utf-8"); topic = R.a.topic
    sents = json.loads((P / "timeline/sentences.json").read_text(encoding="utf-8")); VD = dur(R.st["video"]) if R.st.get("video") else dur(P / "input/voiceover.wav")
    paras = [p for p in re.split(r"\n\s*\n", script.strip()) if p.strip()]
    sch = {"type": "OBJECT", "properties": {"titles": {"type": "ARRAY", "items": {"type": "STRING"}}, "description": {"type": "STRING"}, "pinned": {"type": "STRING"},
           "hashtags": {"type": "ARRAY", "items": {"type": "STRING"}}, "tags": {"type": "ARRAY", "items": {"type": "STRING"}}, "chapters": {"type": "ARRAY", "items": {"type": "STRING"}}},
           "required": ["titles", "description", "pinned", "hashtags", "tags", "chapters"]}
    pk = AG.gen_json(f"""Подготовь упаковку YouTube-ролика (русский, взрослая аудитория СНГ) по тексту ниже.
titles: 5 вариантов названия до 60 символов, без капслока и «!!!», с конкретикой («как», «почему», «что», число — только если оно есть в тексте), обещают то же, что хук, без обмана; не обещай «N секретов/ошибок», если в тексте нет ровно такого списка.
Во всех полях не усиливай утверждения текста («обычно» не превращай в «никогда»/«всегда»), пиши на «ты», как в ролике.
description: 2 коротких абзаца; первая строка 60–150 символов и содержит ключевые слова темы; без ссылок, без глав (их добавлю сам), без хештегов.
pinned: закреплённый комментарий до 300 символов: короткий факт-добавка из ролика + приглашение поделиться опытом (не вопрос «понравилось ли»).
hashtags: 3 хештега без пробелов. tags: 10–12 поисковых тегов по теме на русском.
chapters: название главы для КАЖДОГО абзаца текста по порядку (абзацев {len(paras)}), 2–4 слова, с заглавной буквы, без кавычек.
Тема: «{topic}». Текст ролика:\n{script}""", sch, what="упаковка")
    if not pk: pk = dict(titles=[R.st.get("title") or topic], description=paras[0], pinned=paras[-1][:300], hashtags=[], tags=[topic], chapters=[])
    if len(pk.get("chapters") or []) == len(paras): R.st["headings"] = [c.strip(" .«»\"") for c in pk["chapters"]]
    # главы: начало каждого абзаца сценария
    paras = [p for p in re.split(r"\n\s*\n", script.strip()) if p.strip()]; heads = R.st.get("headings") or []; n, starts = 0, []
    for p in paras: starts.append(n); n += len(p.split())
    W = json.loads((P / "timeline/words.json").read_text(encoding="utf-8")); W = W["words"] if isinstance(W, dict) else W
    ch = []
    for k, s0 in enumerate(starts):
        t = 0 if k == 0 else W[min(s0, len(W) - 1)]["start"]; h = (heads[k] if k < len(heads) else paras[k].split(".")[0])[:40].strip(" .")
        if ch and t - ch[-1][0] < 10: continue
        if VD - t < 10: continue
        ch.append((t, h[:1].upper() + h[1:]))
    chapters = "\n".join(f"{tc(t)} {h}" for t, h in ch) if len(ch) >= 3 else ""

    # баллы названий (yt_intel title — правила + сравнение с топом темы)
    scored = []
    import auto_storyboard as AS
    said = AS.spoken_numbers(script)
    for t in list(dict.fromkeys([R.st.get("title")] + pk["titles"]))[:6]:
        if not t: continue
        if any(not any(abs(float(n) - v) < 0.01 for v in said) for n in re.findall(r"\d+", t)): lines.append(f"название отброшено (число не из ролика): «{t}»"); continue
        try: c, o = sh([PY, str(QA / "yt_intel.py"), "title", t, "--topic", topic], timeout=180); m = re.search(r"Оценка: (\d+)/100", o); scored.append((int(m[1]) if m else 0, t))
        except Exception: scored.append((0, t))
    scored.sort(key=lambda x: -x[0]); top3 = scored[:3]; title = top3[0][1]
    lines.append("названия (yt_intel title): " + "; ".join(f"«{t}» {s}" for s, t in top3))
    # теги: yt_intel tags, иначе Gemini
    tags_line, src = "", "Gemini"
    try:
        c, o = sh([PY, str(QA / "yt_intel.py"), "tags", topic, "--n", "20"], timeout=600); (R.out / "теги_анализ.txt").write_text(o, encoding="utf-8")
        m = re.search(r"## Строка тегов для копирования.*?\n(.+)", o)
        if m and m[1].strip(): tags_line, src = m[1].strip(), "yt_intel tags"
    except Exception as e: lines.append(f"yt_intel tags не ответил: {str(e)[:80]}")
    if not tags_line: tags_line = ", ".join(dict.fromkeys(t.strip() for t in pk["tags"] if t.strip()))
    tags = [t.strip() for t in tags_line.split(",") if t.strip()]
    GEN = {"самом", "делаю", "делат", "сдела", "почем", "котор", "правд", "такое", "этого", "нужно", "можно", "сколь", "всего", "больш", "самые", "самый", "очень", "чтобы"}
    stems = {w[:5] for w in re.findall(r"[а-яёa-z]{5,}", (topic + " " + (R.st.get("title") or "")).lower())} - GEN      # только предметные слова темы
    rel = [t for t in tags if any(w[:5] in stems for w in re.findall(r"[а-яёa-z]{5,}", t.lower()))]
    if len(rel) < len(tags): lines.append(f"теги: отброшено {len(tags) - len(rel)} не по теме ролика (например «{next((t for t in tags if t not in rel), '')}»)")
    tags = rel
    if len(tags) < 6:
        tags = list(dict.fromkeys(tags + [t.strip().lower() for t in pk["tags"] if t.strip() and any(w[:5] in stems for w in re.findall(r"[а-яёa-z]{5,}", t.lower()))] + [t.strip().lower() for t in pk["tags"] if t.strip()]))[:12]; src = (src + " + Gemini") if rel else "Gemini (yt_intel дал теги не по теме)"
    while sum(len(t) for t in tags) + len(tags) - 1 > 480: tags.pop()
    hashtags = " ".join(("#" + re.sub(r"[^\wё]", "", h.lstrip("#")))[:30] for h in pk["hashtags"][:3])
    d0 = pk["description"].strip(); m1 = re.match(r"(.{40,150}?[.!?])\s+(.*)", d0, re.S)
    if m1 and len(d0.splitlines()[0]) > 160: d0 = m1.group(1) + "\n\n" + m1.group(2)                # первая строка видна без раскрытия: 40–150 символов
    desc = d0 + ("\n\nГлавы:\n" + chapters if chapters else "") + ("\n\n" + hashtags if hashtags else "")
    txt = f"НАЗВАНИЕ:\n{title}\n\nОПИСАНИЕ:\n{desc}\n\nТЕГИ:\n{', '.join(tags)}\n\nЗАКРЕПЛЁННЫЙ КОММЕНТАРИЙ:\n{pk['pinned'].strip()}\n"
    up = R.out / "ДЛЯ_ЗАГРУЗКИ.txt"; up.write_text(txt, encoding="utf-8")
    (R.out / "названия_варианты.md").write_text("# Названия (балл yt_intel title)\n\n" + "\n".join(f"- {s}/100 — {t}" for s, t in scored), encoding="utf-8")
    cmd = [PY, str(QA / "publish_lint.py"), str(up), "--out", str(R.out / "проверка_пакета.md")]
    if R.st.get("video"): cmd += ["--video", R.st["video"]]
    if R.st.get("thumbs"): cmd += ["--thumb", R.st["thumbs"][0]]
    if (R.out / "субтитры.srt").exists(): cmd += ["--srt", str(R.out / "субтитры.srt")]
    code, out = sh(cmd); sc = score_line(out)
    lines += [f"теги: {len(tags)} шт. ({src}), главы: {len(ch) if chapters else 0}, хештеги: {hashtags or '—'}", f"publish_lint: PASS {sc[0]} WARN {sc[1]} FAIL {sc[2]} — проверка_пакета.md" if sc else "publish_lint: нет итога"]
    R.step(5, "Пакет к загрузке", "ОК" if sc and sc[2] == 0 else "ЕСТЬ FAIL", lines); R.st["steps"]["5"]["checked"] = f"publish_lint FAIL {sc[2] if sc else '?'}"; R.save(); R.journal()


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("topic"); ap.add_argument("--format", choices=["long", "shorts"], default="long"); ap.add_argument("--slug"); ap.add_argument("--seconds", type=int)
    ap.add_argument("--series", action="store_true"); ap.add_argument("--from-step", type=int, default=1); ap.add_argument("--dry", action="store_true")
    ap.add_argument("--voice-from"); ap.add_argument("--script-from"); ap.add_argument("--title"); ap.add_argument("--out-dir"); ap.add_argument("--tts-budget", type=int, default=10)
    ap.add_argument("--to-step", type=int, default=5)
    a = ap.parse_args(); a.seconds = a.seconds or (50 if a.format == "shorts" else 420)
    R = Run(a); print(f"Atlas Studio: {R.out}")
    steps = {1: step1, 2: step2, 3: step3, 4: step4, 5: step5}
    for n in range(a.from_step, a.to_step + 1):
        r = steps[n](R)
        if n == 2 and r is False: break
        if a.dry and n >= 3: break
    R.st["gemini_log"] = AG.LOG; R.save(); R.journal()
    print(f"\nГотово. Журнал: {R.out / 'ЖУРНАЛ.md'}")


if __name__ == "__main__":
    main()

#!/usr/bin/env python3
"""gemini_tts — озвучка Gemini TTS для Chiaro Studio. Одна роль = ОДИН запрос (лимит ~10 запросов в день на ключ).

  python3 tools/gemini_tts.py --text сценарий.txt --out projects/<slug>/input/voice.wav \
      [--voice Charon] [--style "..."] [--key-n 0] [--dry-run]
  python3 tools/gemini_tts.py --roles roles.json --outdir projects/<slug>/input/roles

roles.json: [{"name": "narr", "voice": "Charon", "style": "...", "text": "..."}, ...]
Ключ берётся из GEMINI_API_KEY или из строк GEMINI_API_KEY=... в .env CineTales (путь ниже).
Ключ нигде не печатается. После озвучки тайминги слов: tools/transcribe.py --script ... (Whisper).
"""
import argparse, base64, json, os, re, sys, time, urllib.error, urllib.request, wave
from pathlib import Path

ENV_PATHS = [Path.home() / "razgon-2d-studio/.env", Path.home() / "ai-video-studio/.env", Path.home() / "Desktop/CineTales_OUTPUT/.env", Path(".env")]
MODEL = os.environ.get("GEMINI_TTS_MODEL", "gemini-3.8-flash-tts")
DEFAULT_STYLE = ("Прочитай по-русски как рассказчик документального ролика для взрослых: спокойно, "
                 "уверенно, чуть ниже обычного тона, ровный темп, живые паузы на запятых и между "
                 "абзацами, без театральности. Текст:")


def keys():
    ks = []
    if os.environ.get("GEMINI_API_KEY"):
        ks.append(os.environ["GEMINI_API_KEY"].strip())
    for p in ENV_PATHS:
        if p.exists():
            ks += [m.strip().strip("\"'") for m in re.findall(r"^GEMINI_API_KEY=(.+)$", p.read_text(), re.M)]
    return list(dict.fromkeys(k for k in ks if k))


USAGE = Path.home() / ".studio_data/tts_usage.jsonl"     # журнал запросов озвучки (дата по Киеву), без ключа


def kyiv_today():
    from datetime import datetime, timezone, timedelta
    try:
        from zoneinfo import ZoneInfo; return datetime.now(ZoneInfo("Europe/Kyiv")).strftime("%Y-%m-%d")
    except Exception:
        return (datetime.now(timezone.utc) + timedelta(hours=2)).strftime("%Y-%m-%d")


def used_today():
    """Сколько запросов озвучки уже отправлено сегодня (по Киеву) с этой машины через gemini_tts.py."""
    if not USAGE.exists(): return 0
    d = kyiv_today(); return sum(1 for ln in USAGE.read_text(encoding="utf-8").splitlines() if ln.strip() and json.loads(ln).get("date") == d)


def log_usage(out, status, words):
    USAGE.parent.mkdir(parents=True, exist_ok=True)
    with open(USAGE, "a", encoding="utf-8") as f:
        f.write(json.dumps({"date": kyiv_today(), "time": time.strftime("%H:%M:%S"), "model": MODEL, "out": str(out), "status": status, "words": words}, ensure_ascii=False) + "\n")


def say(text, voice, style, out, key):
    body = {"contents": [{"parts": [{"text": f"{style}\n{text}"}]}],
            "generationConfig": {"responseModalities": ["AUDIO"],
                                 "speechConfig": {"voiceConfig": {"prebuiltVoiceConfig": {"voiceName": voice}}}}}
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{MODEL}:generateContent"
    req = urllib.request.Request(url, data=json.dumps(body).encode(),
                                 headers={"Content-Type": "application/json", "x-goog-api-key": key})
    d = None
    for i in range(5):
        try:
            d = json.load(urllib.request.urlopen(req, timeout=300)); log_usage(out, "ok", len(text.split())); break
        except urllib.error.HTTPError as e:
            msg = e.read().decode()[:200]
            print(f"HTTP {e.code}: {msg}", flush=True); log_usage(out, f"http {e.code}", len(text.split()))
            if e.code == 429 and "per day" in msg.lower():
                sys.exit("Дневной лимит ключа исчерпан. Подожди сброса (по Киеву) или возьми другой ключ: --key-n 1")
            if e.code in (429, 500, 503):
                time.sleep(45 * (i + 1)); continue
            raise
    if d is None:
        sys.exit("Нет ответа от Gemini после повторов")
    pcm = base64.b64decode(d["candidates"][0]["content"]["parts"][0]["inlineData"]["data"])
    Path(out).parent.mkdir(parents=True, exist_ok=True)
    with wave.open(str(out), "wb") as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(24000); w.writeframes(pcm)
    dur = len(pcm) / 48000
    words = len(text.split())
    print(f"ok {out}: {dur:.1f} с, слов {words}, темп {words / dur:.2f} сл/с")
    if words / dur > 4.2:
        print("ВНИМАНИЕ: слишком быстро, возможно, текст оборван или проглочен. Проверь на слух и по Whisper.")
    if words / dur < 1.3:
        print("ВНИМАНИЕ: слишком медленно, много пауз или лишнего. Проверь.")
    return dur


def _whisper(path, seconds=None):
    os.environ.setdefault("KMP_DUPLICATE_LIB_OK", "TRUE")
    from faster_whisper import WhisperModel
    m = WhisperModel("small", device="cpu", compute_type="int8")
    src = str(path)
    if seconds:
        import subprocess, tempfile
        tmp = Path(tempfile.mkdtemp()) / "head.wav"
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-t", str(seconds), "-i", src, str(tmp)], check=True); src = str(tmp)
    segs, _ = m.transcribe(src, language="ru", word_timestamps=True)
    return [w for sg in segs for w in sg.words]


def trim_preamble(wav):
    """Gemini иногда читает инструкцию по стилю вслух (проверено 12.11: первые ~13 с). Находим слово «Текст» и режем до него."""
    import subprocess
    try:
        words = _whisper(wav, 30)
    except Exception as e:
        print("Проверка начала пропущена (нет faster-whisper):", e); return
    cut = None
    for i, w in enumerate(words[:60]):
        if w.word.strip(" .,:").lower().startswith("текст"):
            cut = w.end; break
    if cut and cut < 25:
        tmp = Path(str(wav) + ".tmp.wav")
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-ss", f"{cut + 0.05:.2f}", "-i", str(wav), "-af", "afade=t=in:d=0.05", "-ar", "24000", str(tmp)], check=True)
        Path(str(wav) + ".with_preamble.wav").write_bytes(Path(wav).read_bytes()); tmp.replace(wav)
        print(f"ОБРЕЗАНО: Gemini прочитал инструкцию вслух, убрано первые {cut:.1f} с (копия: {Path(wav).name}.with_preamble.wav)")
    else:
        print("Начало чистое: инструкция вслух не прочитана")


def check_duplicates(wav, text):
    """Ищем повтор блока текста (бывает: Gemini зачитывает кусок дважды). Только предупреждение с таймкодами."""
    try:
        words = _whisper(wav)
    except Exception as e:
        print("Проверка дублей пропущена:", e); return
    seq = [w.word.strip(" .,!?:;—-«»").lower() for w in words]
    seen, dups = {}, []
    for i in range(len(seq) - 6):
        key = tuple(seq[i:i + 6])
        if key in seen and i - seen[key] > 6: dups.append((words[seen[key]].start, words[i].start, " ".join(key)))
        else: seen.setdefault(key, i)
    if dups:
        a, b, k = dups[0]
        print(f"ВНИМАНИЕ: возможный дубль текста: «{k}» на {a:.1f} с и на {b:.1f} с. Проверь на слух и вырежи лишнее. Всего совпадений: {len(dups)}")
    else:
        print("Дублей текста не найдено")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--text"); ap.add_argument("--out")
    ap.add_argument("--roles"); ap.add_argument("--outdir")
    ap.add_argument("--voice", default="Charon"); ap.add_argument("--style", default=DEFAULT_STYLE)
    ap.add_argument("--key-n", type=int, default=0); ap.add_argument("--dry-run", action="store_true")
    ap.add_argument("--no-trim", action="store_true", help="не обрезать прочитанную вслух инструкцию")
    ap.add_argument("--verify", action="store_true", help="после озвучки проверить дубли текста (долго, Whisper)")
    ap.add_argument("--budget", type=int, help="не отправлять, если за сегодня (по Киеву) запросов станет больше N")
    a = ap.parse_args()

    if a.roles:
        roles = json.loads(Path(a.roles).read_text(encoding="utf-8"))
        outdir = Path(a.outdir or "roles")
        jobs = [(r["text"], r.get("voice", a.voice), r.get("style", a.style), outdir / f"{r['name']}.wav") for r in roles]
    elif a.text and a.out:
        jobs = [(Path(a.text).read_text(encoding="utf-8").strip(), a.voice, a.style, Path(a.out))]
    else:
        ap.error("нужно --text и --out, либо --roles")

    print(f"Запросов: {len(jobs)} (одна роль одним запросом). Модель: {MODEL}")
    for t, v, _, o in jobs:
        print(f" - {o.name}: голос {v}, {len(t.split())} слов (~{len(t.split()) / 2.4 / 60:.1f} мин)")
    print(f"Сегодня (по Киеву) уже отправлено запросов озвучки с этой машины: {used_today()} (журнал {USAGE})")
    if a.dry_run:
        print("dry-run: запросы не отправлялись"); return
    if a.budget is not None and used_today() + len(jobs) > a.budget:
        sys.exit(f"СТОП: бюджет озвучки на сегодня {a.budget} запросов, уже {used_today()}, нужно ещё {len(jobs)}. Запросы не отправлены.")
    ks = keys()
    if not ks:
        sys.exit("Ключ Gemini не найден (GEMINI_API_KEY или .env CineTales)")
    key = ks[min(a.key_n, len(ks) - 1)]
    for t, v, s, o in jobs:
        say(t, v, s, o, key)
        if not a.no_trim: trim_preamble(o)
        if a.verify: check_duplicates(o, t)
        time.sleep(4)


if __name__ == "__main__":
    main()


def check_text(wav, text_path, min_run=4):
    """Сверка озвучки со сценарием: ищет фразы, которые Gemini ДОБАВИЛ от себя или ПРОПУСТИЛ.
    Возвращает список (вид, время, фраза). Мелкие расхождения распознавания (1–3 слова) игнорируются."""
    import difflib
    def norm(w): w = re.sub(r"[^\wё-]", "", w.lower()).replace("ё", "е"); return w
    def stem(w): return w[:4]
    ws = [w for w in _whisper(wav) if norm(w.word)]
    hyp = [stem(norm(w.word)) for w in ws]
    ref_words = [norm(w) for w in Path(text_path).read_text(encoding="utf-8").split() if norm(w)]
    ref = [stem(w) for w in ref_words]
    out = []
    for op, i1, i2, j1, j2 in difflib.SequenceMatcher(None, ref, hyp, autojunk=False).get_opcodes():
        if op in ("insert", "replace") and (j2 - j1) >= min_run and (j2 - j1) - (i2 - i1) >= min_run - 1 and not any(ch.isdigit() for w in ws[j1:j2] for ch in w.word):
            out.append(("ЛИШНЕЕ", round(ws[j1].start, 2), round(ws[j2 - 1].end, 2), " ".join(w.word.strip() for w in ws[j1:j2])))
        if op in ("delete", "replace") and (i2 - i1) >= min_run + 1 and (i2 - i1) - (j2 - j1) >= min_run:
            t = ws[min(j1, len(ws) - 1)].start
            out.append(("ПРОПУЩЕНО", round(t, 2), round(t, 2), " ".join(ref_words[i1:i2])))
    return out

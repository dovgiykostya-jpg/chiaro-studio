"""tools/atlas_gemini.py — текстовые запросы к Gemini для Atlas Studio (сценарий, раскадровка, упаковка, проверка фактов).

Ключ берётся так же, как в gemini_tts.py (GEMINI_API_KEY или .env), нигде не печатается и не сохраняется.
Текстовые модели имеют свой лимит, отдельный от озвучки (TTS) — эти запросы лимит озвучки не тратят.
  gen_json(prompt, schema)  -> объект по JSON-схеме (structured output) или None
  gen_text(prompt)          -> строка или None
  grounded(prompt)          -> (текст, [источники]) с поиском Google или (None, [])
"""
import json, os, sys, time, urllib.error, urllib.request
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
MODELS = [m for m in os.environ.get("ATLAS_TEXT_MODELS", "gemini-3.8-flash,gemini-3.7-flash,gemini-3.6-flash,gemini-3.5-flash,gemini-flash-latest,gemini-3-flash-preview,gemini-3.5-flash-lite,gemini-3.1-flash-lite,gemini-flash-lite-latest").split(",") if m]
LOG = []          # краткий журнал запросов (без ключа) — его пишет конвейер
DEAD = set()      # модели, у которых на сегодня кончился лимит (бесплатно ~20 запросов в день на модель)


def _key():
    try:
        import gemini_tts
        ks = gemini_tts.keys()
        return ks[0] if ks else None
    except Exception:
        return None


def _call(model, body, timeout=240):
    key = _key()
    if not key: raise RuntimeError("нет ключа Gemini")
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"
    req = urllib.request.Request(url, data=json.dumps(body).encode(), headers={"Content-Type": "application/json", "x-goog-api-key": key})
    return json.load(urllib.request.urlopen(req, timeout=timeout))


def _run(body, what):
    last = None
    for model in MODELS:
        if model in DEAD: continue
        for attempt in range(3):
            try:
                t0 = time.time(); d = _call(model, body)
                parts = d["candidates"][0]["content"]["parts"]
                txt = "".join(p.get("text", "") for p in parts if not p.get("thought"))
                LOG.append(f"{what}: {model}, {time.time() - t0:.0f} с")
                return txt, d
            except urllib.error.HTTPError as e:
                full = e.read().decode(); msg = full[:160]; last = f"{model}: HTTP {e.code}"
                if e.code == 429 and "PerDay" in full: DEAD.add(model); break          # дневной лимит модели — сразу к следующей
                if e.code in (429, 500, 503): time.sleep(8 * (attempt + 1)); continue
                if e.code in (400, 404): DEAD.add(model)
                break
            except Exception as e:
                last = str(e)[:160]; time.sleep(3); continue
    LOG.append(f"{what}: нет ответа ({last})")
    return None, None


def gen_json(prompt, schema, temperature=0.7, what="json"):
    body = {"contents": [{"parts": [{"text": prompt}]}],
            "generationConfig": {"responseMimeType": "application/json", "responseSchema": schema, "temperature": temperature}}
    txt, _ = _run(body, what)
    if not txt: return None
    try: return json.loads(txt)
    except Exception:
        LOG.append(f"{what}: ответ не JSON"); return None


def gen_text(prompt, temperature=0.8, what="text"):
    txt, _ = _run({"contents": [{"parts": [{"text": prompt}]}], "generationConfig": {"temperature": temperature}}, what)
    return txt


def grounded(prompt, what="grounded"):
    """Поиск Google внутри Gemini. На бесплатном ключе часто недоступен (429 без дневной квоты) — тогда сразу (None, []),
    без перебора всех моделей, а конвейер проверяет факты по Википедии (wiki_context)."""
    saved = MODELS[:]; ok = [m for m in MODELS if m not in DEAD][:2]; MODELS[:] = ok
    try: txt, d = _run_once({"contents": [{"parts": [{"text": prompt}]}], "tools": [{"google_search": {}}], "generationConfig": {"temperature": 0.2}}, what)
    finally: MODELS[:] = saved
    if not txt: return None, []
    src = []
    try:
        for ch in d["candidates"][0].get("groundingMetadata", {}).get("groundingChunks", []):
            w = ch.get("web", {}); src.append(f"{w.get('title', '')} {w.get('uri', '')}".strip())
    except Exception: pass
    return txt, src


def _run_once(body, what):
    for model in MODELS:
        try:
            t0 = time.time(); d = _call(model, body, timeout=120); parts = d["candidates"][0]["content"]["parts"]
            LOG.append(f"{what}: {model}, {time.time() - t0:.0f} с"); return "".join(p.get("text", "") for p in parts if not p.get("thought")), d
        except urllib.error.HTTPError as e:
            LOG.append(f"{what}: {model} HTTP {e.code}")
        except Exception as e:
            LOG.append(f"{what}: {model} {str(e)[:60]}")
    return None, None


def wiki_context(query, n=3, chars=6000):
    """Тексты статей русской Википедии по запросу (бесплатно, без ключа) — опора для проверки фактов."""
    import urllib.parse
    UA = {"User-Agent": "AtlasStudio-factcheck/1.0"}
    def get(params):
        u = "https://ru.wikipedia.org/w/api.php?" + urllib.parse.urlencode(dict(params, format="json"))
        return json.load(urllib.request.urlopen(urllib.request.Request(u, headers=UA), timeout=30))
    try:
        hits = get(dict(action="query", list="search", srsearch=query, srlimit=n))["query"]["search"]
        out = []
        for h in hits:
            pg = get(dict(action="query", prop="extracts", explaintext=1, titles=h["title"]))["query"]["pages"]
            txt = next(iter(pg.values())).get("extract", "")
            if txt: out.append((h["title"], "https://ru.wikipedia.org/wiki/" + urllib.parse.quote(h["title"].replace(" ", "_")), txt[:chars]))
        return out
    except Exception as e:
        LOG.append(f"Википедия: {str(e)[:80]}"); return []


def _grounded_old(prompt, what="grounded"):
    txt, d = _run({"contents": [{"parts": [{"text": prompt}]}], "tools": [{"google_search": {}}], "generationConfig": {"temperature": 0.2}}, what)
    if not txt: return None, []
    src = []
    try:
        for ch in d["candidates"][0].get("groundingMetadata", {}).get("groundingChunks", []):
            w = ch.get("web", {}); src.append(f"{w.get('title', '')} {w.get('uri', '')}".strip())
    except Exception: pass
    return txt, src

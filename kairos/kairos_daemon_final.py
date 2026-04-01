import os
import re
import time
import json
import asyncio
import shutil
import difflib
import subprocess
from pathlib import Path
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

import requests
import schedule
import chromadb
from dotenv import load_dotenv
from anthropic import Anthropic
from github import Github, GithubException
from telegram import Bot
from chromadb.utils import embedding_functions

_SCRIPT_DIR = Path(__file__).resolve().parent
load_dotenv(_SCRIPT_DIR / ".env", override=True)

# ============== CONFIG ==============
PROJECT_DIR = Path(os.getenv("PROJECT_DIR", ".")).resolve()
ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY")
GITHUB_TOKEN = os.getenv("GITHUB_TOKEN")
GITHUB_REPO = os.getenv("GITHUB_REPO")
TELEGRAM_BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN")
TELEGRAM_CHAT_ID = os.getenv("TELEGRAM_CHAT_ID")
SLACK_WEBHOOK_URL = os.getenv("SLACK_WEBHOOK_URL")
CHROMA_PERSIST_DIR = os.getenv("CHROMA_PERSIST_DIR", "./kairos_chroma_db")
MODEL_NAME = os.getenv("ANTHROPIC_MODEL", "claude-3-5-sonnet-20241022")
TICK_INTERVAL_MIN = int(os.getenv("TICK_INTERVAL_MIN", "10"))

MEMORY_FILE = PROJECT_DIR / "kairos_memory.json"
LOG_FILE = PROJECT_DIR / "kairos_logs.txt"
LAST_CHECK_FILE = PROJECT_DIR / "kairos_last_github_check.json"

NOTIFY_ONLY_ON_ACTION = os.getenv("NOTIFY_ONLY_ON_ACTION", "true").lower() == "true"
AUTO_APPLY_REFACTOR = os.getenv("AUTO_APPLY_REFACTOR", "false").lower() == "true"

ALLOWED_EXTENSIONS = {".py", ".ts", ".js", ".tsx", ".jsx", ".go", ".rs", ".java"}

if not ANTHROPIC_API_KEY:
    raise ValueError("ANTHROPIC_API_KEY ist Pflicht.")
if not GITHUB_TOKEN:
    raise ValueError("GITHUB_TOKEN ist Pflicht.")
if not GITHUB_REPO:
    raise ValueError("GITHUB_REPO ist Pflicht.")

client = Anthropic(api_key=ANTHROPIC_API_KEY)
from github import Auth
gh = Github(auth=Auth.Token(GITHUB_TOKEN))
try:
    repo = gh.get_repo(GITHUB_REPO)
    print(f"[INFO] GitHub Repo verbunden: {GITHUB_REPO}")
except Exception as e:
    repo = None
    print(f"[WARN] GitHub Repo '{GITHUB_REPO}' nicht erreichbar: {e}")
    print("       Kairos laeuft ohne GitHub-Integration weiter.")

telegram_bot = Bot(token=TELEGRAM_BOT_TOKEN) if TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID else None

# ============== ChromaDB ==============
chroma_client = chromadb.PersistentClient(path=CHROMA_PERSIST_DIR)
embedding_fn = embedding_functions.DefaultEmbeddingFunction()
collection = chroma_client.get_or_create_collection(
    name="kairos_observations",
    embedding_function=embedding_fn,
)


# ============== HELPERS ==============
def utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def parse_iso_datetime(value: str) -> datetime:
    value = value.replace("Z", "+00:00")
    return datetime.fromisoformat(value)


def append_log(message: str) -> None:
    timestamp = datetime.now().isoformat(timespec="seconds")
    line = f"[{timestamp}] {message}"
    with open(LOG_FILE, "a", encoding="utf-8") as f:
        f.write(line + "\n")
    print(line.encode("ascii", errors="replace").decode("ascii"))


def load_json_file(path: Path, default: Any) -> Any:
    if not path.exists():
        return default
    try:
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception as e:
        append_log(f"JSON-Ladefehler bei {path.name}: {e}")
        return default


def save_json_file(path: Path, data: Any) -> None:
    try:
        with open(path, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
    except Exception as e:
        append_log(f"JSON-Speicherfehler bei {path.name}: {e}")


def load_memory() -> Dict[str, Any]:
    return load_json_file(MEMORY_FILE, {"consolidated": "", "dream_count": 0})


def save_memory(memory: Dict[str, Any]) -> None:
    save_json_file(MEMORY_FILE, memory)


def load_last_check() -> str:
    data = load_json_file(LAST_CHECK_FILE, {"last_check": "2020-01-01T00:00:00Z"})
    return data.get("last_check", "2020-01-01T00:00:00Z")


def save_last_check(timestamp: str) -> None:
    save_json_file(LAST_CHECK_FILE, {"last_check": timestamp})


def get_git_status() -> str:
    try:
        result = subprocess.run(
            ["git", "status", "--porcelain"],
            cwd=PROJECT_DIR,
            capture_output=True,
            text=True,
            timeout=10,
            check=False,
        )
        return result.stdout.strip() or "Keine lokalen Aenderungen."
    except Exception as e:
        append_log(f"Git-Status Fehler: {e}")
        return "Git nicht verfuegbar."


def is_safe_project_path(target_file: Path) -> bool:
    try:
        target_file.resolve().relative_to(PROJECT_DIR.resolve())
        return True
    except ValueError:
        return False


# ============== NOTIFICATIONS ==============
async def _send_telegram_message(bot: Bot, chat_id: str, text: str) -> None:
    await bot.send_message(chat_id=chat_id, text=text)


def send_notification(message: str) -> None:
    full_msg = f"Kairos [{datetime.now().strftime('%H:%M')}]\n{message}"
    if telegram_bot and TELEGRAM_CHAT_ID:
        try:
            try:
                loop = asyncio.get_running_loop()
                loop.create_task(_send_telegram_message(telegram_bot, TELEGRAM_CHAT_ID, full_msg))
            except RuntimeError:
                asyncio.run(_send_telegram_message(telegram_bot, TELEGRAM_CHAT_ID, full_msg))
        except Exception as e:
            append_log(f"Telegram Fehler: {e}")
    if SLACK_WEBHOOK_URL:
        try:
            requests.post(SLACK_WEBHOOK_URL, json={"text": full_msg}, timeout=5)
        except Exception as e:
            append_log(f"Slack Fehler: {e}")


# ============== GITHUB ==============
def check_github_updates() -> List[str]:
    if repo is None:
        return []
    last_check_str = load_last_check()
    new_items: List[str] = []
    try:
        last_check_dt = parse_iso_datetime(last_check_str)
        issues = repo.get_issues(state="open", since=last_check_dt)
        for issue in issues:
            if issue.pull_request is None:
                new_items.append(f"Issue #{issue.number}: {issue.title}")
        prs = repo.get_pulls(state="open", sort="created", direction="desc")
        for pr in prs:
            created_at = pr.created_at.replace(tzinfo=timezone.utc)
            if created_at > last_check_dt:
                new_items.append(f"PR #{pr.number}: {pr.title}")
        if new_items:
            save_last_check(utc_now_iso())
    except Exception as e:
        append_log(f"GitHub Fehler: {e}")
    return new_items


# ============== VECTOR STORE ==============
def add_observation_to_vectorstore(action_text: str, metadata: Dict[str, Any]) -> None:
    obs_id = f"obs_{int(time.time() * 1000)}"
    try:
        collection.add(documents=[action_text], metadatas=[metadata], ids=[obs_id])
    except Exception as e:
        append_log(f"Chroma Add Fehler: {e}")


def query_relevant_observations(query_text: str, n_results: int = 20) -> List[str]:
    try:
        results = collection.query(query_texts=[query_text], n_results=n_results)
        docs = results.get("documents", [[]])
        return docs[0] if docs and isinstance(docs[0], list) else []
    except Exception as e:
        append_log(f"Chroma Query Fehler: {e}")
        return []


# ============== SEED LOADER ==============
SEED_FILE = _SCRIPT_DIR / "WundScan-AI_seed.md"
SEED_MARKER_ID = "seed_loaded_marker"


def load_seed_if_needed() -> None:
    """Laedt die Seed-Datei in ChromaDB, falls noch nicht geschehen."""
    try:
        existing = collection.get(ids=[SEED_MARKER_ID])
        if existing and existing.get("ids"):
            return  # Seed bereits geladen
    except Exception:
        pass  # Marker existiert nicht, also laden

    if not SEED_FILE.exists():
        append_log(f"Seed-Datei nicht gefunden: {SEED_FILE.name}")
        return

    try:
        content = SEED_FILE.read_text(encoding="utf-8")
        # Splitte nach Markdown-Sektionen
        sections = re.split(r'\n(?=## )', content)
        chunks = [s.strip() for s in sections if s.strip() and len(s.strip()) > 20]

        if not chunks:
            append_log("Seed-Datei leer oder nicht parsebar.")
            return

        ids = [f"seed_{i}" for i in range(len(chunks))]
        metadatas = [{"source": "seed", "timestamp": utc_now_iso()} for _ in chunks]
        collection.add(documents=chunks, metadatas=metadatas, ids=ids)

        # Marker setzen damit Seed nicht doppelt geladen wird
        collection.add(
            documents=["Seed geladen"],
            metadatas=[{"source": "marker", "timestamp": utc_now_iso()}],
            ids=[SEED_MARKER_ID],
        )
        append_log(f"Seed geladen: {len(chunks)} Sektionen aus {SEED_FILE.name}")
    except Exception as e:
        append_log(f"Seed-Loader Fehler: {e}")


# ============== AI HELPERS ==============
def anthropic_text(prompt: str, max_tokens: int = 800, temperature: float = 0.2) -> str:
    try:
        resp = client.messages.create(
            model=MODEL_NAME,
            max_tokens=max_tokens,
            temperature=temperature,
            messages=[{"role": "user", "content": prompt}],
            timeout=30.0,
        )
        return resp.content[0].text.strip()
    except Exception as e:
        append_log(f"Anthropic API Fehler: {e}")
        return "Fehler bei der AI-Anfrage."


# ============== AUTO DREAM ==============
def perform_autodream(memory: Dict[str, Any]) -> bool:
    append_log("autoDream gestartet – Vector-Search laeuft...")
    relevant_obs = query_relevant_observations(
        memory.get("consolidated", "Projekt Kontext") or "Projekt Kontext"
    )
    dream_prompt = f"""Fasse den aktuellen Stand des WundScan-AI Projekts zusammen.

Beobachtungen aus dem Monitoring:
{" | ".join(relevant_obs[:10]) if relevant_obs else "Keine Beobachtungen."}

Regeln:
- Nur ASCII-Zeichen verwenden
- Maximal 10 Saetze
- Ignoriere fruehere Meldungen ueber "Deadlock" oder "knowledge_base.json" - das ist geloest
- Fokus auf: Was ist WundScan-AI, welcher Stack, was sind die naechsten Schritte
- Keine Empfehlungen zum Daemon selbst"""

    try:
        memory["consolidated"] = anthropic_text(dream_prompt, max_tokens=600, temperature=0.3)
        memory["dream_count"] = int(memory.get("dream_count", 0)) + 1
        save_memory(memory)
        append_log(f"autoDream abgeschlossen (Dream #{memory['dream_count']})")
        return True
    except Exception as e:
        append_log(f"autoDream Fehler: {e}")
        return False


# ============== REFACTORING ==============
def extract_target_file_from_action(action_text: str) -> Optional[Path]:
    pattern = r'(?:in|file|Datei)\s+([^\s]+\.(?:py|ts|js|tsx|jsx|go|rs|java))'
    match = re.search(pattern, action_text, re.IGNORECASE)
    if not match:
        return None
    candidate = (PROJECT_DIR / match.group(1)).resolve()
    if candidate.suffix.lower() not in ALLOWED_EXTENSIONS:
        return None
    if not is_safe_project_path(candidate):
        return None
    return candidate


def extract_code_block(text: str) -> Optional[str]:
    code_block = re.search(r"```(?:\w+)?\n(.*?)```", text, re.DOTALL)
    if code_block:
        return code_block.group(1).strip()
    return text.strip() if text.strip() else None


def backup_file(path: Path) -> Path:
    backup_path = path.with_name(
        path.name + ".kairos_backup_" + datetime.now().strftime("%Y%m%d_%H%M%S")
    )
    shutil.copy2(path, backup_path)
    return backup_path


def generate_diff(old: str, new: str, file_name: str) -> str:
    diff = difflib.unified_diff(
        old.splitlines(keepends=True),
        new.splitlines(keepends=True),
        fromfile=f"{file_name} (alt)",
        tofile=f"{file_name} (neu)",
        lineterm="",
    )
    return "".join(diff)


def perform_refactor(action_text: str) -> bool:
    target_file = extract_target_file_from_action(action_text)
    if not target_file:
        send_notification("Aktion erkannt, aber keine sichere Zieldatei gefunden.")
        return False
    if not target_file.exists():
        send_notification(f"Datei nicht gefunden: {target_file.name}")
        return False

    try:
        current_code = target_file.read_text(encoding="utf-8")
    except Exception as e:
        append_log(f"Datei-Lesefehler: {e}")
        return False

    refactor_prompt = f"""Du bist ein praeziser Senior-Software-Engineer.
Fuehre exakt diese Refactoring-Aktion durch: {action_text}

Wichtige Regeln:
- Gib NUR den vollstaendigen neuen Dateiinhalt zurueck.
- Keine Erklaerungen, keine Kommentare ausserhalb des Codes.
- Erhalte die bestehende Funktionalitaet.
- Verbessere Lesbarkeit, Struktur und Fehlerbehandlung wo sinnvoll.

Dateiname: {target_file.name}
Aktueller Code:
```{target_file.suffix.lstrip('.')}
{current_code}
```"""

    try:
        new_code_raw = anthropic_text(refactor_prompt, max_tokens=4000, temperature=0.2)
        new_code = extract_code_block(new_code_raw)
        if not new_code or len(new_code) < 50:
            send_notification("Refactoring fehlgeschlagen: Kein gueltiger Code zurueckgegeben.")
            return False

        diff = generate_diff(current_code, new_code, target_file.name)
        send_notification(
            f"Refactoring-Vorschlag fuer {target_file.name}\n\n```diff\n{diff[:1800]}...\n```"
        )

        if AUTO_APPLY_REFACTOR:
            backup_file(target_file)
            target_file.write_text(new_code, encoding="utf-8")
            send_notification(f"Refactoring automatisch auf {target_file.name} angewendet!")
        else:
            send_notification("Bestaetige mit 'kairos apply' oder ignoriere den Vorschlag.")

        return True
    except Exception as e:
        append_log(f"Refactor Fehler: {e}")
        return False


# ============== MAIN TICK ==============
def tick() -> None:
    append_log("=== Kairos-Tick gestartet ===")
    memory = load_memory()
    git_status = get_git_status()
    github_updates = check_github_updates()
    github_context = "\n".join(github_updates) if github_updates else "Keine neuen GitHub-Aktivitaeten."

    prompt = f"""Du bist Kairos, Beobachter-Daemon fuer WundScan-AI (klinisches Wunddokumentations-Tool).

GIT-STATUS:
{git_status}

GITHUB-UPDATES:
{github_context}

REGELN:
- Du bist NUR Beobachter. Du kannst nichts ausfuehren.
- Melde NUR echte Aenderungen: neue Issues, neue PRs, grosse Git-Diffs.
- Uncommitted Changes sind NORMAL bei aktiver Entwicklung - nicht melden.
- Erwaehne NIEMALS "Deadlock", "knowledge_base.json" oder interne Daemon-Probleme.
- Nur ASCII-Zeichen.

ANTWORT-FORMAT (waehle genau eins):
BERICHT: [Was hat sich konkret geaendert seit dem letzten Tick]
EMPFEHLUNG: [Konkreter Vorschlag zum WundScan-AI Projekt]
RUHE: Keine relevanten Aenderungen.

Maximal 2 Saetze."""

    try:
        action_text = anthropic_text(prompt, max_tokens=400, temperature=0.5)
        append_log(action_text)

        # Speichere Observation
        is_noteworthy = "EMPFEHLUNG" in action_text.upper() or "BERICHT" in action_text.upper()
        metadata = {
            "timestamp": utc_now_iso(),
            "github_updates": len(github_updates),
            "has_action": is_noteworthy,
        }
        add_observation_to_vectorstore(action_text, metadata)

        # autoDream alle 6 Beobachtungen
        if collection.count() % 6 == 0 and collection.count() > 0:
            perform_autodream(memory)

        # Benachrichtigung nur bei Empfehlungen/Berichten
        if is_noteworthy or not NOTIFY_ONLY_ON_ACTION:
            send_notification(action_text)

        # Refactoring pruefen
        if is_noteworthy and any(
            kw in action_text.lower()
            for kw in ["refactor", "refactoring", "verbesser", "clean", "umstruktur"]
        ):
            perform_refactor(action_text)

    except Exception as e:
        append_log(f"Tick Fehler: {e}")


# ============== START ==============
def run_kairos_daemon():
    load_seed_if_needed()  # Wissensbasis laden
    schedule.every(TICK_INTERVAL_MIN).minutes.do(tick)
    append_log(
        f"Kairos-Daemon FINAL gestartet! Tick-Intervall: {TICK_INTERVAL_MIN} Minuten | Projekt: {PROJECT_DIR}"
    )
    tick()  # Erster Tick sofort
    while True:
        schedule.run_pending()
        next_run = schedule.next_run()
        if next_run:
            remaining = (next_run - datetime.now()).total_seconds()
            mins, secs = divmod(max(0, int(remaining)), 60)
            print(f"\r  Naechster Tick in {mins}m {secs}s ...", end="", flush=True)
        time.sleep(30)


if __name__ == "__main__":
    run_kairos_daemon()

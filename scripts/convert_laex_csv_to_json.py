import csv
import json
from pathlib import Path
from typing import Dict, List, Any


def convert(csv_path: Path, json_path: Path) -> None:
    subjects: Dict[str, Dict[str, Any]] = {}
    with csv_path.open(newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        # Expected columns include at least: Subject, Topic, Topic code
        # Be forgiving about spacing/casing
        for row in reader:
            subject_raw = (row.get("Subject") or row.get("subject") or "").strip()
            topic = (row.get("Topic") or row.get("topic") or "").strip()
            topic_code = (
                row.get("Topic code ")
                or row.get("Topic code")
                or row.get("topic_code")
                or ""
            ).strip()
            if not subject_raw or not topic:
                continue
            # Derive subject + subject_code
            subject_name, subject_code = _split_subject(subject_raw)
            entry = subjects.setdefault(subject_name, {
                "subject": subject_name,
                "subject_code": subject_code,
                "topics": []
            })
            if not entry.get("subject_code"):
                entry["subject_code"] = subject_code
            entry["topics"].append({
                "topic": topic,
                "topic_code": topic_code,
            })

    payload = {"subjects": list(subjects.values())}
    json_path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")


def _split_subject(subject_raw: str) -> tuple[str, str]:
    # Common format: "History-Ancient  (H01)" -> ("History-Ancient", "H01")
    s = subject_raw.strip()
    code = ""
    if "(" in s and ")" in s and s.rfind("(") < s.rfind(")"):
        start = s.rfind("(")
        end = s.rfind(")")
        code = s[start+1:end].strip()
        name = (s[:start] + s[end+1:]).strip()
    else:
        name = s
    # Collapse internal double spaces
    name = " ".join(name.split())
    return name, code


if __name__ == "__main__":
    repo_root = Path(__file__).resolve().parents[1]
    csv_path = repo_root / "Laex_Mains_DNA.csv"
    json_path = repo_root / "laex_topics.json"
    if not csv_path.exists():
        raise FileNotFoundError(f"CSV not found at {csv_path}")
    convert(csv_path, json_path)
    print(f"Wrote {json_path}")



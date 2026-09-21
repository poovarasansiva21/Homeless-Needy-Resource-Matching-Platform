import re

CRITICAL_KEYWORDS = [
    "bleeding", "unconscious", "heart attack", "chest pain", "seizure", 
    "fire", "trapped", "collapse", "drowning", "assault", "violence", 
    "suicide", "hypothermia", "life threatening", "severe injury", "snake bite",
    "poison", "critical", "dying", "flood water", "suffocating"
]

HIGH_KEYWORDS = [
    "tonight", "starving", "no food", "infant", "newborn", "baby", "children", 
    "pregnant", "insulin", "urgent", "evicted", "homeless", "sleeping outside", 
    "freezing", "in the rain", "elderly", "disabled", "dialysis", "fever", 
    "pavement", "hungry for days", "stranded", "no water"
]

MEDIUM_KEYWORDS = [
    "soon", "tomorrow", "this week", "struggling", "lost job", "low income", 
    "need rations", "school fees", "textbooks", "clothes", "shoes", "blanket", 
    "daily wages", "looking for work", "rent due"
]

def analyze_urgency(text: str, category: str = "", people_count: int = 1, situation: str = "") -> dict:
    """
    Evaluates multi-factor urgency score (0-100) and assigns urgency level:
    CRITICAL, HIGH, MEDIUM, LOW.
    Includes healthcare/emergency safety disclaimers.
    """
    combined_text = f"{text} {situation}".lower()
    score = 25  # Base score
    indicators_found = []

    # Check critical keywords
    for kw in CRITICAL_KEYWORDS:
        if re.search(r'\b' + re.escape(kw) + r'\b', combined_text):
            score += 35
            indicators_found.append(f"Critical flag: {kw}")

    # Check high urgency keywords
    for kw in HIGH_KEYWORDS:
        if re.search(r'\b' + re.escape(kw) + r'\b', combined_text):
            score += 20
            indicators_found.append(f"High urgency flag: {kw}")

    # Check medium keywords
    for kw in MEDIUM_KEYWORDS:
        if re.search(r'\b' + re.escape(kw) + r'\b', combined_text):
            score += 10
            indicators_found.append(f"Standard priority: {kw}")

    # Structured data factor: Category
    clean_cat = category.upper().strip()
    if clean_cat == "EMERGENCY":
        score += 40
        indicators_found.append("Category boost: Emergency")
    elif clean_cat in ["MEDICAL", "FOOD", "SHELTER"]:
        score += 15
        indicators_found.append(f"Essential need category: {clean_cat}")

    # Structured data factor: People count
    if people_count >= 5:
        score += 15
        indicators_found.append(f"Large group affected ({people_count} individuals)")
    elif people_count >= 3:
        score += 10
        indicators_found.append(f"Multiple dependents ({people_count} individuals)")

    # Normalize score to 10 - 100
    score = max(10, min(100, score))

    # Determine Urgency Level
    if score >= 80:
        level = "CRITICAL"
    elif score >= 60:
        level = "HIGH"
    elif score >= 35:
        level = "MEDIUM"
    else:
        level = "LOW"

    # Emergency escalation and safety disclaimer
    escalation_required = (level == "CRITICAL") or (clean_cat == "EMERGENCY")
    
    disclaimer = ""
    if clean_cat in ["MEDICAL", "EMERGENCY"] or level in ["CRITICAL", "HIGH"]:
        disclaimer = "AI priority estimate — professional/NGO verification required. This system does not replace certified emergency healthcare services."

    return {
        "urgency_level": level,
        "urgency_score": score,
        "indicators": indicators_found[:6],  # top distinct indicators
        "escalation_required": escalation_required,
        "disclaimer": disclaimer
    }

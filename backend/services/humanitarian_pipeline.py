"""
SAHAAYAA AI - Advanced Humanitarian Analysis Pipeline
Model Version: v2.1.0-humanitarian-pipeline

Processes natural language distress input and context into a structured 8-point 
humanitarian schema:
1. Category (FOOD, SHELTER, CLOTHING, MEDICAL, EMERGENCY, EDUCATION, EMPLOYMENT)
2. Urgency (CRITICAL, HIGH, MEDIUM, LOW)
3. People Affected (integer count extracted via NLP/context)
4. Intent (humanitarian distress intent classification)
5. Transport Barrier & Reason (Boolean + COST, DISTANCE, MOBILITY, WEATHER, NO_VEHICLE, NONE)
6. Duration of Need (IMMEDIATE_TONIGHT, 1 DAY, 2-3 DAYS, LONG_TERM, UNKNOWN)
7. Important Entities (extracted dependents, timeframe, barriers, landmarks)
8. Confidence & Decision Handling (HIGH -> CONTINUE, LOW -> ASK_CLARIFICATION, VERY LOW -> HUMAN_REVIEW)
"""

import re
import hashlib
from typing import Dict, Any, List
from services.classifier import classify_text
from services.urgency import analyze_urgency

PIPELINE_MODEL_VERSION = "v2.1.0-humanitarian-pipeline"

NUMBER_WORDS = {
    "one": 1, "a": 1, "an": 1, "single": 1,
    "two": 2, "couple": 2, "pair": 2,
    "three": 3, "triple": 3,
    "four": 4, "five": 5, "six": 6, "seven": 7, "eight": 8, "nine": 9, "ten": 10,
    "eleven": 11, "twelve": 12, "dozen": 12, "fifteen": 15, "twenty": 20
}

def extract_people_count(text: str, default_count: int = 1) -> int:
    """
    Parses natural language text to extract total count of affected individuals.
    Handles phrases like:
    - 'me and two children' -> 1 + 2 = 3
    - 'I have two kids' -> 1 + 2 = 3
    - 'myself, wife and 3 children' -> 1 + 1 + 3 = 5
    - 'family of 4' -> 4
    - '5 people' -> 5
    """
    lower_text = text.lower()

    # Pattern 1: Direct numbers before people/family/individuals/members
    m = re.search(r'\b(\d+|one|two|three|four|five|six|seven|eight|nine|ten)\s*(people|persons|family members|individuals|members|kids|children|infants|babies)\b', lower_text)
    if m:
        val_str = m.group(1)
        count = int(val_str) if val_str.isdigit() else NUMBER_WORDS.get(val_str, 1)
        # If phrase says "my X kids" or "X children", check if speaker is included
        if re.search(r'\b(i|me|my|myself|we|our)\b', lower_text) and m.group(2) in ["kids", "children", "infants", "babies"]:
            return count + 1
        return count

    # Pattern 2: 'family of X'
    m2 = re.search(r'\bfamily\s+of\s+(\d+|one|two|three|four|five|six|seven|eight|nine|ten)\b', lower_text)
    if m2:
        val_str = m2.group(1)
        return int(val_str) if val_str.isdigit() else NUMBER_WORDS.get(val_str, 1)

    # Pattern 3: 'me/myself and X children/kids/family'
    m3 = re.search(r'\b(i|me|myself|we)\s+and\s+(\d+|one|two|three|four|five|six|seven|eight|nine|ten)\s*(children|kids|infants|babies|dependents|people)?\b', lower_text)
    if m3:
        val_str = m3.group(2)
        kids_count = int(val_str) if val_str.isdigit() else NUMBER_WORDS.get(val_str, 1)
        return kids_count + 1

    # Pattern 4: Explicit standalone digits
    m4 = re.search(r'\b(\d+)\s*(people|individuals|members)?\b', lower_text)
    if m4:
        num = int(m4.group(1))
        if 1 <= num <= 50:
            return num

    return max(1, default_count)

def extract_duration_of_need(text: str) -> str:
    """
    Parses duration or timeframe of distress from natural language.
    """
    lower_text = text.lower()

    if re.search(r'\b(since yesterday|1 day|one day|for a day|last 24 hours)\b', lower_text):
        return "1 DAY"
    elif re.search(r'\b(since 2 days|since 3 days|2 days|3 days|for days|hungry for days|for two days|for three days)\b', lower_text):
        return "2-3 DAYS"
    elif re.search(r'\b(tonight|this evening|right now|immediately|today|overnight)\b', lower_text):
        return "IMMEDIATE_TONIGHT"
    elif re.search(r'\b(since a week|for weeks|last month|lost job|rent due|evicted|long term|months)\b', lower_text):
        return "LONG_TERM"
    elif re.search(r'\b(since morning|all day|since last night)\b', lower_text):
        return "1 DAY"
    
    return "IMMEDIATE_TONIGHT"

def extract_transport_barrier(text: str) -> Dict[str, Any]:
    """
    Detects if there is a transportation barrier preventing reaching aid centers,
    and identifies the primary root reason.
    """
    lower_text = text.lower()
    barrier = False
    reason = "NONE"

    # Cost barrier
    if re.search(r'\b(cannot afford|can\'t afford|no money for|expensive|no fare|bus fare|no bus money|ticket cost|cannot pay)\b', lower_text):
        barrier = True
        reason = "COST"
    # Distance barrier
    elif re.search(r'\b(far|too far|far away|long distance|cannot walk|no way to reach|miles away|remote)\b', lower_text):
        barrier = True
        reason = "DISTANCE"
    # Mobility/Disability barrier
    elif re.search(r'\b(disabled|handicapped|wheelchair|bedridden|cannot walk|injured leg|fracture|paralyzed|blind|elderly)\b', lower_text):
        barrier = True
        reason = "MOBILITY"
    # Weather barrier
    elif re.search(r'\b(heavy rain|flooded|rainstorm|waterlogged|storm)\b', lower_text):
        barrier = True
        reason = "WEATHER"
    # No vehicle barrier
    elif re.search(r'\b(no vehicle|no car|no bike|no transport|no bus service|stranded)\b', lower_text):
        barrier = True
        reason = "NO_VEHICLE"

    return {
        "has_barrier": barrier,
        "reason": reason
    }

def extract_important_entities(text: str) -> Dict[str, Any]:
    """
    Extracts key named entities, dependents, timeframes, barriers, and landmarks.
    """
    lower_text = text.lower()
    entities = {
        "dependents": [],
        "timeframe": None,
        "barriers": [],
        "landmarks": []
    }

    # Dependents
    m_children = re.search(r'\b(\d+|one|two|three|four|five|six|several)?\s*(children|kids|infants|babies|son|daughter|sons|daughters)\b', lower_text)
    if m_children:
        entities["dependents"].append(m_children.group(0))

    m_elderly = re.search(r'\b(elderly|senior citizen|aged mother|aged father|grandmother|grandfather)\b', lower_text)
    if m_elderly:
        entities["dependents"].append(m_elderly.group(0))

    # Timeframe
    m_time = re.search(r'\b(since yesterday|since morning|for \d+ days|tonight|since last night|for weeks)\b', lower_text)
    if m_time:
        entities["timeframe"] = m_time.group(0)

    # Barriers
    m_barrier = re.search(r'\b(cannot afford the bus|far|no money|cannot walk|flooded|no transport)\b', lower_text)
    if m_barrier:
        entities["barriers"].append(m_barrier.group(0))

    # Landmarks
    m_landmark = re.search(r'\b(bus stop|station|railway station|hospital|centre|center|food centre|park|temple|bridge|highway)\b', lower_text)
    if m_landmark:
        entities["landmarks"].append(m_landmark.group(0))

    return entities

def determine_intent(category: str, urgency: str) -> str:
    """
    Maps category and urgency to standard humanitarian intent enum.
    """
    cat = category.upper().strip()
    if cat == "FOOD":
        return "SEEK_FOOD_RATIONS_OR_MEALS"
    elif cat == "SHELTER":
        return "SEEK_EMERGENCY_SHELTER"
    elif cat == "MEDICAL":
        return "SEEK_URGENT_MEDICAL_CARE"
    elif cat == "CLOTHING":
        return "SEEK_CLOTHING_AID"
    elif cat == "EMERGENCY":
        return "SEEK_IMMEDIATE_CRISIS_DISPATCH"
    elif cat == "EDUCATION":
        return "SEEK_EDUCATIONAL_SUPPORT"
    elif cat == "EMPLOYMENT":
        return "SEEK_JOB_OR_WAGE_SUPPORT"
    
    return "SEEK_GENERAL_HUMANITARIAN_AID"

def generate_targeted_followups(category: str, confidence: float, transport_info: dict, people_count: int, text: str) -> List[str]:
    """
    Generates minimal, non-intrusive, highly-targeted follow-up questions ONLY when needed.
    """
    questions = []

    # If confidence is low or moderate (< 0.70), clarify category/need
    if confidence < 0.70:
        questions.append(f"Do you need immediate {category.lower()} relief, or safe shelter for tonight?")

    # If transport barrier is detected, clarify mobility/delivery necessity
    if transport_info.get("has_barrier"):
        questions.append("Can you reach the nearest resource, or do you require mobile volunteer delivery?")

    # If people count is default 1 and text hints at family/others
    if people_count == 1 and re.search(r'\b(family|children|kids|others|we|us|group)\b', text.lower()):
        questions.append(f"How many people in total need {category.lower()} assistance?")

    # If location landmark is missing
    if not re.search(r'\b(near|at|by|station|stop|road|street|area|colony|nagar|puram)\b', text.lower()):
        questions.append("What is your current landmark or location so nearby responders can locate you?")

    # Limit to max 2 necessary questions
    return questions[:2]

def analyze_humanitarian_request(text: str, context_people_count: int = 1, context_situation: str = "") -> Dict[str, Any]:
    """
    Main entry point for Advanced Humanitarian Analysis Pipeline.
    Runs TensorFlow DNN text classification, NLP entity parsing, urgency engine,
    transport barrier extraction, and confidence action determination.
    """
    cleaned_text = (text or "").strip()
    if not cleaned_text:
        cleaned_text = "I need urgent assistance."

    # 1. Model Inference via TensorFlow DNN Classifier
    clf_res = classify_text(cleaned_text)
    dnn_category = clf_res["predicted_category"]
    confidence = clf_res["confidence"]

    # 2. Extract People Count
    extracted_people = extract_people_count(cleaned_text, default_count=context_people_count)

    # 3. Urgency Analysis
    urgency_info = analyze_urgency(
        text=cleaned_text,
        category=dnn_category,
        people_count=extracted_people,
        situation=context_situation
    )
    urgency_level = urgency_info["urgency_level"]

    # 4. Transport Barrier & Reason
    transport_info = extract_transport_barrier(cleaned_text)

    # 5. Duration of Need
    duration_of_need = extract_duration_of_need(cleaned_text)

    # 6. Extracted Entities
    entities = extract_important_entities(cleaned_text)

    # 7. Intent Determination
    intent = determine_intent(dnn_category, urgency_level)

    # 8. Confidence Action & Threshold Flow
    # HIGH CONFIDENCE >= 0.70 -> CONTINUE
    # LOW CONFIDENCE 0.40 - 0.69 -> ASK_CLARIFICATION
    # VERY LOW CONFIDENCE < 0.40 -> HUMAN_REVIEW
    if confidence >= 0.70:
        confidence_action = "CONTINUE"
        action_note = "High confidence prediction. Proceeding with resource dispatch and registration."
    elif confidence >= 0.40:
        confidence_action = "ASK_CLARIFICATION"
        action_note = "Moderate confidence prediction. AI clarification recommended."
    else:
        confidence_action = "HUMAN_REVIEW"
        action_note = "Low confidence prediction. Flagged for human coordinator / field auditor review."

    # Follow-up questions (only if needed or clarification requested)
    follow_ups = generate_targeted_followups(
        category=dnn_category,
        confidence=confidence,
        transport_info=transport_info,
        people_count=extracted_people,
        text=cleaned_text
    )

    # Privacy hash of text (no sensitive PII logged unnecessarily)
    text_hash = hashlib.sha256(cleaned_text.encode("utf-8")).hexdigest()[:16]

    return {
        "category": dnn_category,
        "urgency": urgency_level,
        "urgency_score": urgency_info["urgency_score"],
        "people": extracted_people,
        "duration": duration_of_need,
        "transport_barrier": transport_info["has_barrier"],
        "transport_reason": transport_info["reason"],
        "intent": intent,
        "important_entities": entities,
        "confidence": confidence,
        "confidence_percentage": round(confidence * 100, 1),
        "confidence_action": confidence_action,
        "action_note": action_note,
        "follow_up_questions": follow_ups,
        "model_version": PIPELINE_MODEL_VERSION,
        "text_hash": text_hash,
        "all_category_probabilities": clf_res["probabilities"],
        "disclaimer": urgency_info.get("disclaimer", ""),
        "escalation_required": urgency_info.get("escalation_required", False)
    }

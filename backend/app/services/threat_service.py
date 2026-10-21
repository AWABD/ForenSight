import os
import re
from pathlib import Path
from typing import Dict, List, Any, Optional
from app.utils.logging_config import logger

class ThreatService:
    """
    Forensic Threat Intelligence & Violent Intent Analysis Engine.
    
    Inspects digital evidence payloads (plain text files, OCR-extracted text,
    chat transcripts, crime scene photographs) for:
      1. Violent & Homicide Threats (murder, shooting, death threats, bodily harm)
      2. Weapons & Firearms Contraband (guns, rifles, explosives, blades)
      3. Extortion & Ransom Operations (coercion, hostage, pay-or-die)
      4. Crime Scene / Physical Evidence Classification (non-text scene photographs)
    """

    # --- Forensic Lexicons & Regex Patterns ---

    HOMICIDE_PATTERNS = [
        # Explicit intent to kill / shoot
        (r'\b(?:i\s+will|i\'ll|going\s+to|gonna|we\s+will|want\s+to|ready\s+to)\s+(?:kill|shoot|murder|slay|eliminate|execute|strangle|slit\s+your\s+throat)\b', 'EXPLICIT_KILL_INTENT'),
        (r'\b(?:kill|murder|shoot|stab|execute|eliminate)\s+(?:you|him|her|them|[A-Za-z]+)\s+(?:tonight|today|tomorrow|now|dead|soon)\b', 'DIRECT_DEATH_THREAT'),
        (r'\b(?:put\s+a\s+bullet\s+(?:in|through)|bullet\s+in\s+(?:your|his|her)\s+head)\b', 'FIREARM_EXECUTION_THREAT'),
        (r'\b(?:slit\s+(?:your|his|her)\s+throat|cut\s+(?:your|his|her)\s+head\s+off)\b', 'SEVERE_BODILY_HARM'),
        (r'\b(?:dispose\s+of\s+the\s+body|dump\s+the\s+body|hide\s+the\s+body|body\s+in\s+the\s+(?:river|trunk|woods))\b', 'BODY_DISPOSAL_CONSPIRACY'),
        (r'\b(?:hire\s+a\s+hitman|contract\s+killing|order\s+a\s+hit)\b', 'CONTRACT_MURDER'),
        (r'\b(?:you\s+are\s+dead|you\'re\s+a\s+dead\s+man|say\s+your\s+prayers)\b', 'DEAD_MAN_THREAT'),
        (r'\b(?:shoot\s+(?:someone|another|him|her|people)|open\s+fire\s+on)\b', 'MASS_SHOOTING_INTENT')
    ]

    WEAPON_KEYWORDS = [
        # Firearms
        'glock', 'pistol', 'handgun', 'revolver', 'ak-47', 'ak47', 'ar-15', 'ar15',
        'shotgun', 'rifle', 'carbine', 'sniper', 'firearm', 'silencer', 'suppressor',
        'ammunition', 'bullets', 'caliber', '9mm', '.45 acp', 'magazine clip',
        # Explosives
        'pipe bomb', 'c4', 'plastic explosive', 'ied', 'dynamite', 'detonator',
        # Bladed Weapons
        'machete', 'hunting knife', 'switchblade', 'butterfly knife', 'dagger'
    ]

    EXTORTION_PATTERNS = [
        (r'\b(?:pay\s+(?:or\s+die|or\s+else)|transfer\b.*(?:or\s+else|or\s+(?:i|we)\s+will\s+kill))\b', 'EXTORTION_UNDER_DURESS'),
        (r'\b(?:ransom|(?:held|holding)\s+(?:\w+\s+)?hostage|kidnap|kidnapped)\b', 'KIDNAPPING_RANSOM'),
        (r'\b(?:blackmail|expose\s+your\s+secrets|unless\s+you\s+pay)\b', 'COERCION_BLACKMAIL')
    ]

    CRIME_SCENE_KEYWORDS = [
        'shoot', 'shooting', 'shot', 'gunshot', 'homicide', 'murder', 'crime_scene',
        'crimescene', 'weapon', 'victim', 'assault', 'dead_body', 'blood', 'cctv_shooting',
        'cctv_frame', 'cctv_gun', 'gunman', 'shooter', 'stabbed'
    ]

    @classmethod
    def analyze_text_content(cls, text: str, file_name: str = "") -> Dict[str, Any]:
        """
        Analyzes raw text (from .txt, .log, .md, or OCR output) for criminal threats,
        homicide intent, weapons contraband, and extortion.
        """
        if not text or not text.strip():
            return {
                "has_threats": False,
                "threat_level": "NONE",
                "categories": [],
                "flagged_excerpts": [],
                "anomalies": []
            }

        text_lower = text.lower()
        flagged_excerpts = []
        categories = set()
        anomalies = []

        # 1. Homicide & Direct Violent Threats (CRITICAL)
        for pattern, threat_subtag in cls.HOMICIDE_PATTERNS:
            matches = list(re.finditer(pattern, text_lower))
            for m in matches:
                # Extract surrounding sentence/context
                start = max(0, m.start() - 30)
                end = min(len(text), m.end() + 30)
                excerpt = text[start:end].strip().replace('\n', ' ')
                flagged_excerpts.append({
                    "category": "VIOLENT_HOMICIDE_THREAT",
                    "tag": threat_subtag,
                    "matched": m.group(0),
                    "context": f"...{excerpt}...",
                    "severity": "CRITICAL"
                })
                categories.add("VIOLENT_HOMICIDE_THREAT")

        # 2. Weapons & Firearms Contraband (HIGH/CRITICAL)
        detected_weapons = []
        for weapon in cls.WEAPON_KEYWORDS:
            # Word boundary check for weapons
            if re.search(r'\b' + re.escape(weapon) + r'\b', text_lower):
                detected_weapons.append(weapon)

        if detected_weapons:
            categories.add("WEAPONS_CONTRABAND")
            flagged_excerpts.append({
                "category": "WEAPONS_CONTRABAND",
                "tag": "FIREARM_WEAPON_DETECTED",
                "matched": ", ".join(detected_weapons[:5]),
                "context": f"Contraband weapons/firearms detected in content: {', '.join(detected_weapons[:5])}",
                "severity": "CRITICAL" if any(w in detected_weapons for w in ('ak-47', 'ak47', 'pipe bomb', 'c4', 'ied')) else "HIGH"
            })

        # 3. Extortion & Coercion (CRITICAL)
        for pattern, threat_subtag in cls.EXTORTION_PATTERNS:
            matches = list(re.finditer(pattern, text_lower))
            for m in matches:
                start = max(0, m.start() - 30)
                end = min(len(text), m.end() + 30)
                excerpt = text[start:end].strip().replace('\n', ' ')
                flagged_excerpts.append({
                    "category": "CRIMINAL_EXTORTION",
                    "tag": threat_subtag,
                    "matched": m.group(0),
                    "context": f"...{excerpt}...",
                    "severity": "CRITICAL"
                })
                categories.add("CRIMINAL_EXTORTION")

        # Compile System Anomalies matching ForenSight AnomalySchema
        if "VIOLENT_HOMICIDE_THREAT" in categories:
            primary_threat = next((e for e in flagged_excerpts if e["category"] == "VIOLENT_HOMICIDE_THREAT"), None)
            context_snippet = primary_threat["context"] if primary_threat else "Explicit homicide/death threat"
            anomalies.append({
                "type": "VIOLENT_THREAT_DETECTED",
                "severity": "CRITICAL",
                "message": f"Explicit death threat / homicide intent identified in evidence payload: \"{context_snippet}\""
            })

        if "WEAPONS_CONTRABAND" in categories:
            weapon_list = ", ".join(detected_weapons[:4])
            anomalies.append({
                "type": "WEAPON_CONTRABAND_FLAG",
                "severity": "HIGH",
                "message": f"Firearms / contraband weapons identified in text stream: [{weapon_list}]"
            })

        if "CRIMINAL_EXTORTION" in categories:
            anomalies.append({
                "type": "CRIMINAL_EXTORTION",
                "severity": "CRITICAL",
                "message": "Criminal extortion / ransom ultimatum identified in communication payload."
            })

        has_threats = len(anomalies) > 0
        overall_level = "CRITICAL" if any(a["severity"] == "CRITICAL" for a in anomalies) else (
            "HIGH" if any(a["severity"] == "HIGH" for a in anomalies) else "NONE"
        )

        return {
            "has_threats": has_threats,
            "threat_level": overall_level,
            "categories": list(categories),
            "flagged_excerpts": flagged_excerpts,
            "detected_weapons": detected_weapons,
            "anomalies": anomalies
        }

    @classmethod
    def classify_media_type(cls, file_name: str, ext: str, extracted_text: str, ocr_lines_count: int) -> Dict[str, Any]:
        """
        Classifies evidence media appropriately between:
          - DOCUMENT_TEXT_IMAGE (Receipts, UPI screenshots, invoices, passports)
          - PHYSICAL_CRIME_SCENE (Photos of shootings, weapons, crime scene - where OCR is not applicable)
          - DIGITAL_TEXT_DOCUMENT (.txt, .log, notes)
          - GENERAL_SCENE_PHOTO (Standard photos without text)
        """
        fn_lower = file_name.lower()
        is_image = ext.lower() in ('.jpg', '.jpeg', '.png', '.bmp', '.webp', '.tiff')
        is_text_doc = ext.lower() in ('.txt', '.log', '.csv', '.json', '.md', '.sql')

        # Check for crime scene / shooting / violent imagery indicators in filename or tags
        is_crime_scene_tag = any(kw in fn_lower for kw in cls.CRIME_SCENE_KEYWORDS)

        if is_text_doc:
            return {
                "media_class": "DIGITAL_TEXT_DOCUMENT",
                "label": "Plain Text Evidence Document",
                "is_text_based": True,
                "ocr_applicable": False,
                "ocr_explanation": "Direct text file stream parsed natively. Optical Character Recognition (OCR) is bypassed for native digital text."
            }

        if is_image:
            if is_crime_scene_tag and ocr_lines_count == 0:
                return {
                    "media_class": "CRIME_SCENE_MEDIA",
                    "label": "Physical Crime Scene / Suspected Violent Media",
                    "is_text_based": False,
                    "ocr_applicable": False,
                    "ocr_explanation": "Physical crime scene photograph (e.g. shooting/weapons/assault). Standard OCR bypassed as no typographical document text is present."
                }
            elif ocr_lines_count > 0:
                return {
                    "media_class": "DOCUMENT_TEXT_IMAGE",
                    "label": "Text-Bearing Image / Document Screenshot",
                    "is_text_based": True,
                    "ocr_applicable": True,
                    "ocr_explanation": f"Optical Character Recognition applied successfully ({ocr_lines_count} text blocks detected)."
                }
            else:
                return {
                    "media_class": "GENERAL_SCENE_PHOTO",
                    "label": "Visual Scene Photograph (Non-Document)",
                    "is_text_based": False,
                    "ocr_applicable": False,
                    "ocr_explanation": "Visual photographic evidence with no typography detected. OCR is designed for text-bearing documents, not physical scene photographs."
                }

        return {
            "media_class": "BINARY_PAYLOAD",
            "label": "Binary / Structured Forensic Asset",
            "is_text_based": False,
            "ocr_applicable": False,
            "ocr_explanation": "Binary evidence payload."
        }

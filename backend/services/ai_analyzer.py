"""CloudGuard — AI-powered security analysis using Google Gemini."""

import json
import logging
from typing import Any

import google.generativeai as genai
from config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()

# Configure Gemini
genai.configure(api_key=settings.GEMINI_API_KEY)


SYSTEM_PROMPT = """You are CloudGuard AI — a senior cloud security analyst.
You will receive a JSON array of cloud security findings from an automated scan.
Each finding has: category, severity, title, description, resource_arn, resource_type, recommendation.

Analyze ALL findings and produce a JSON response with this EXACT structure:
{
  "executive_summary": "A 2-3 sentence high-level summary of the security posture",
  "risk_level": "CRITICAL | HIGH | MEDIUM | LOW",
  "top_risks": [
    {
      "title": "Short risk title",
      "description": "Why this is dangerous",
      "affected_resources": ["resource1", "resource2"],
      "remediation": "Step-by-step fix"
    }
  ],
  "attack_chains": [
    {
      "name": "Attack scenario name",
      "description": "How an attacker could chain these vulnerabilities",
      "steps": ["Step 1", "Step 2", "Step 3"],
      "impact": "What damage could result"
    }
  ],
  "remediation_priorities": [
    {
      "priority": 1,
      "action": "What to fix first",
      "reason": "Why this is the top priority",
      "effort": "LOW | MEDIUM | HIGH"
    }
  ],
  "compliance_gaps": [
    {
      "framework": "CIS / SOC2 / HIPAA / PCI-DSS / etc.",
      "gap": "What control is missing",
      "finding_titles": ["Related finding 1"]
    }
  ]
}

IMPORTANT:
- Return ONLY valid JSON, no markdown, no code fences, no extra text.
- Be specific and actionable in all recommendations.
- Identify at least one attack chain if critical/high findings exist.
- Prioritize remediation by impact and effort.
"""


async def analyze_findings(findings: list[dict[str, Any]]) -> dict:
    """Send findings to Gemini for AI-powered security analysis."""
    if not settings.GEMINI_API_KEY:
        return {"error": "Gemini API key not configured"}

    if not findings:
        return {
            "executive_summary": "No findings to analyze. Your cloud environment appears clean.",
            "risk_level": "LOW",
            "top_risks": [],
            "attack_chains": [],
            "remediation_priorities": [],
            "compliance_gaps": [],
        }

    # Build the prompt
    findings_json = json.dumps(findings, indent=2, default=str)
    user_prompt = (
        f"Analyze these {len(findings)} cloud security findings and provide "
        f"your assessment:\n\n{findings_json}"
    )

    try:
        model = genai.GenerativeModel(
            "gemini-2.0-flash",
            system_instruction=SYSTEM_PROMPT,
        )

        response = await model.generate_content_async(
            user_prompt,
            generation_config=genai.types.GenerationConfig(
                temperature=0.2,
                max_output_tokens=4096,
            ),
        )

        # Parse the JSON response
        text = response.text.strip()
        # Strip markdown code fences if Gemini adds them anyway
        if text.startswith("```"):
            text = text.split("\n", 1)[1]
            if text.endswith("```"):
                text = text[:-3].strip()

        analysis = json.loads(text)
        logger.info(f"AI analysis completed: risk_level={analysis.get('risk_level')}")
        return analysis

    except json.JSONDecodeError as e:
        logger.error(f"Failed to parse Gemini response as JSON: {e}")
        return {
            "error": "AI returned invalid JSON",
            "raw_response": response.text if 'response' in dir() else str(e),
        }
    except Exception as e:
        logger.error(f"Gemini API call failed: {e}")
        return {"error": f"AI analysis failed: {str(e)}"}

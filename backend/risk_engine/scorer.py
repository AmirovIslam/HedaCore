"""CloudGuard — Risk Scoring Engine.

Calculates an overall risk score (0–100) from detected findings.
Higher score = worse security posture.

Scoring method:
 1. Assign weights: CRITICAL=10, HIGH=7, MEDIUM=4, LOW=1
 2. Sum weighted finding scores
 3. Normalise to 0–100 using a logarithmic curve capped at 100
"""

import math
from typing import Any

SEVERITY_WEIGHTS = {
    "CRITICAL": 10,
    "HIGH": 7,
    "MEDIUM": 4,
    "LOW": 1,
}

# Scale factor — controls how fast the score climbs to 100
# With SCALE=50, ~25 CRITICAL findings ≈ score 100
SCALE = 50.0


def calculate_risk_score(findings: list[dict[str, Any]]) -> float:
    """Compute a 0–100 risk score from a list of finding dicts."""
    if not findings:
        return 0.0

    raw = sum(
        SEVERITY_WEIGHTS.get(f.get("severity", "LOW"), 1) for f in findings
    )

    # Logarithmic normalisation → asymptotically approaches 100
    score = 100 * (1 - math.exp(-raw / SCALE))
    return round(min(score, 100.0), 1)


def severity_counts(findings: list[dict[str, Any]]) -> dict[str, int]:
    """Count findings by severity level."""
    counts = {"CRITICAL": 0, "HIGH": 0, "MEDIUM": 0, "LOW": 0}
    for f in findings:
        sev = f.get("severity", "LOW")
        if sev in counts:
            counts[sev] += 1
    return counts

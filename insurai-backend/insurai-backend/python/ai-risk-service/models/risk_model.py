"""
Rule-based risk model fallback. No trained models required.
"""

POLICY_TYPE_RISK_BASE = {
    "MARINE_CARGO": 70,
    "CYBER_RISK": 65,
    "FIRE_HAZARD": 60,
    "PUBLIC_LIABILITY": 55,
    "VEHICLE": 45,
    "GROUP_LIFE": 40,
    "CORPORATE_HEALTH": 35,
    "GROUP_HEALTH": 30,
    "TERM_LIFE": 25,
    "HOME": 30,
}


class RiskModel:
    """
    Rule-based risk scoring. Returns risk_score 0-100 and contributing factors.
    """

    def predict(self, policy_type: str, features: dict) -> tuple[int, list[str]]:
        """Returns (risk_score 0-100, [contributing factors])"""
        return self._rule_predict(policy_type, features)

    def _rule_predict(self, policy_type: str, features: dict) -> tuple[int, list[str]]:
        base = POLICY_TYPE_RISK_BASE.get(
            (policy_type or "").upper().strip(), 50
        )
        factors = []
        score = base

        coverage = features.get("coverage_amount") or 0
        revenue = features.get("revenue") or 1

        if coverage > 0 and revenue > 0:
            ratio = coverage / revenue
            if ratio > 0.5:
                score += 15
                factors.append("high_coverage_to_revenue_ratio")

        employees = features.get("employees") or 0
        if employees > 1000:
            score += 5
            factors.append("large_workforce")

        years = features.get("years_in_business") or 0
        if years < 1:
            score += 10
            factors.append("new_business")

        return min(max(int(score), 0), 100), factors

    def get_recommendation(self, score: int) -> tuple[str, str]:
        if score < 40:
            return "LOW", "APPROVE"
        elif score < 70:
            return "MEDIUM", "MANUAL_REVIEW"
        else:
            return "HIGH", "ESCALATE"


risk_model = RiskModel()

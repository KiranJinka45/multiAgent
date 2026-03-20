import json
from typing import Dict, Any

class TokenCostModel:
    """
    Calculates operational LLM costs to ensure positive unit economics.
    We are targeting a strong Gross Margin across all pricing tiers.
    """
    
    # Costs roughly modeled out for Groq / Gemini Pro blended usage per 1M tokens
    COST_PER_MILLION_INPUT_TOKENS_RS = 40.0 
    COST_PER_MILLION_OUTPUT_TOKENS_RS = 120.0
    
    def __init__(self, avg_input_tokens_call: int = 5000, avg_output_tokens_call: int = 1500):
        self.avg_input = avg_input_tokens_call
        self.avg_output = avg_output_tokens_call
        
    def _calculate_call_cost(self) -> float:
        """Returns the cost of a single average LLM call in Rupees."""
        input_cost = (self.avg_input / 1_000_000) * self.COST_PER_MILLION_INPUT_TOKENS_RS
        output_cost = (self.avg_output / 1_000_000) * self.COST_PER_MILLION_OUTPUT_TOKENS_RS
        return input_cost + output_cost

    def calculate_economics(self, metrics: Dict[str, float]) -> Dict[str, Any]:
        """
        Receives batch run metrics to project scale costs.
        Expected metrics:
        - avg_llm_calls_per_build
        - total_retries
        """
        
        avg_calls_per_build = metrics.get("avg_llm_calls_per_build", 6)
        
        # 1. Cost Per Build
        total_tokens_per_build = avg_calls_per_build * (self.avg_input + self.avg_output)
        cost_per_build = avg_calls_per_build * self._calculate_call_cost()
        
        # 2. Monthly User Projection (Assuming 100 users * 5 builds/mo)
        monthly_builds = 100 * 5
        projected_monthly_cost = monthly_builds * cost_per_build
        
        # 3. Margin Projection
        revenue_tiers = [2000, 4000, 8000] # Subscriptions in Rupees
        cost_per_user_mo = 5 * cost_per_build # 5 builds/month allowance
        
        margins = {}
        for tier in revenue_tiers:
            profit_per_user = tier - cost_per_user_mo
            margin_pct = (profit_per_user / tier) * 100
            margins[f"Tier_₹{tier}"] = f"{margin_pct:.2f}%"

        # 4. Enforce Financial Gatekeeper
        is_viable = margin_pct > 60.0 # Strict ≥60% Gross Margin rule

        return {
            "unit_economics": {
                "avg_tokens_per_build": total_tokens_per_build,
                "cost_per_build_rs": round(cost_per_build, 2),
                "monthly_cost_100_users_rs": round(projected_monthly_cost, 2)
            },
            "gross_margins": margins,
            "financial_viability": {
                "status": "APPROVED" if is_viable else "MARGIN_DANGER",
                "recommended_action": "Proceed to Alpha" if is_viable else "Reduce LLM calls. Margin under 60%."
            }
        }

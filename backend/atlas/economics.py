"""Fixed-coefficient input-output models; all vectors use fractional units."""

import numpy as np
from scipy.linalg import solve


def validate_coefficients(coefficients):
    a = np.asarray(coefficients, dtype=float)
    if a.ndim != 2 or a.shape[0] != a.shape[1] or not 1 <= len(a) <= 500:
        raise ValueError("A must be a square matrix with 1–500 nodes")
    if not np.isfinite(a).all() or (a < 0).any():
        raise ValueError("Coefficients must be finite and nonnegative")
    if (a.sum(axis=0) > 1 + 1e-9).any():
        raise ValueError("Input shares exceed total output in a column")
    rho = float(np.max(np.abs(np.linalg.eigvals(a))))
    condition = float(np.linalg.cond(np.eye(len(a)) - a.T))
    if rho >= 1 - 1e-10 or not np.isfinite(condition) or condition > 1e8:
        raise ValueError("Unstable or ill-conditioned production system")
    return a, rho, condition


def propagate(coefficients, shock, mode="price"):
    a, rho, condition = validate_coefficients(coefficients)
    s = np.asarray(shock, dtype=float)
    if s.shape != (len(a),) or not np.isfinite(s).all():
        raise ValueError("Shock must be a finite vector matching A")
    if mode not in ("price", "quantity"):
        raise ValueError("Unknown propagation mode")
    transmission = a.T if mode == "price" else a
    total = solve(np.eye(len(a)) - transmission, s)
    if mode == "price" and (total < -1).any():
        raise ValueError("Scenario implies negative prices; outside model domain")
    first = transmission @ s
    # Contribution from each supplier i to recipient j at equilibrium.
    contributions = (a * total[:, None]).T if mode == "price" else a * total[None, :]
    return {
        "kind": "hypothetical_structural_estimate",
        "mode": mode,
        "direct": s.tolist(),
        "first_order": first.tolist(),
        "higher_order": (total - s - first).tolist(),
        "total": total.tolist(),
        "relationship_contributions": contributions.tolist(),
        "spectral_radius": rho,
        "condition_number": condition,
        "residual": float(np.linalg.norm(total - transmission @ total - s)),
        "units": "fractional price change"
        if mode == "price"
        else "same monetary units as final-demand shock",
        "assumptions": [
            "Fixed technical coefficients",
            "No substitution or capacity constraint",
            "Full cost pass-through for price model",
            "No dynamic timing, causal identification or asset-pricing link",
        ],
    }

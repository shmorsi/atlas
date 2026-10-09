"""Generate the checked-in learning guide from concise, code-linked chapters."""

from pathlib import Path
import json

ROOT = Path(__file__).resolve().parents[1]
chapters = [
    (
        "Linear Algebra for Economic Networks",
        "economics.py",
        "A is an n×n input-share matrix. A column is the input bill of one buyer, divided by that buyer’s output. s and Δp are n-vectors of fractional unit-cost shocks and price changes.",
        "Start with Δp = AᵀΔp + s. Rearranging gives (I−Aᵀ)Δp=s. Solve that system; forming an inverse is unnecessary and less stable. If spectral radius ρ(A)<1, the Neumann series I+Aᵀ+(Aᵀ)²+… converges.",
        "For A=[[0,.5],[0,0]] and s=[.1,0], the first sector receives 10% direct cost pressure and the second receives 5%; no further round survives.",
        "Why is the transpose needed? Supplier i sells to buyer j in A[i,j]; buyer j’s price receives the weighted sum of supplier price changes. Quantity propagation instead uses A.",
        "A small residual proves numerical consistency, not economic realism.",
    ),
    (
        "Input-Output Economics",
        "economics.py",
        "Z[i,j] is the monetary flow from supplier i to buyer j. x[j] is gross output, positive and in the same monetary units. Define A[i,j]=Z[i,j]/x[j].",
        "Quantity balance is x=Ax+f, giving x=(I−A)⁻¹f. The price model holds physical input requirements and value-added cost assumptions fixed. Column sums above one are rejected by this simplified model because they imply negative residual value-added shares.",
        "A one-sector economy using half its output as intermediate input has multiplier 1/(1−.5)=2. A .1 direct unit-cost shift gives .2 total price change.",
        "Does an oil-price input identify an oil supply shock? No. Identification requires a structural or empirical design beyond imposing a price change.",
        "No substitution, capacity, margins adjustment, policy reaction, timing or market-price dynamics are modeled.",
    ),
    (
        "Graph Theory and Global Production Networks",
        "economics.py",
        "Nodes are country-industry pairs in a real ICIO application; directed edge i→j carries A[i,j]. Our default laboratory uses three explicitly synthetic sectors.",
        "First-order propagation follows one edge. Powers of A follow longer walks, with path weights equal to products of edge coefficients. At equilibrium in price mode, contribution i→j is A[i,j]Δp[i].",
        "If A[0,1]=.2 and A[1,2]=.3, a .1 shock at node 0 contributes .006 to node 2 along the two-edge path, before other paths are added.",
        "Is a central node necessarily an attractive investment? No. Graph position describes a specified economic network and does not identify expected asset returns.",
        "OECD download is blocked. No measured centrality, supplier concentration, or global exposure is claimed.",
    ),
    (
        "Probability and Economic Forecasting",
        "forecast.py",
        "Y is annual GDP growth in percentage points. The Gaussian model outputs conditional mean μ and positive scale σ.",
        "Negative log likelihood is ½log(2π)+log σ+(Y−μ)²/(2σ²). A nominal 80% Gaussian interval uses μ±1.28155σ. Coverage is the proportion of held-out observations inside it.",
        "For μ=2 and σ=1.5, the nominal interval is approximately [0.078,3.922] percentage points. This is a distributional assumption, not a guaranteed error bound.",
        "Does 80% coverage on ten years prove calibration? No. The sample is tiny and serially dependent; coverage changes by ten points for each observation.",
        "The intervals in this build are uncalibrated. No conformal correction or repeated-window reliability study is implemented.",
    ),
    (
        "Time-Series Modeling",
        "forecast.py",
        "Each sample has a five-year sequence of four macro features and one US growth target. Inputs end in year t−2 for a target in year t.",
        "Train targets end in 2005; validation targets cover 2006–2014; test targets cover 2015–2024. Normalization parameters are fitted only on training windows. Windows containing missing data are dropped explicitly.",
        "A target for 2024 uses features from 2018–2022. Its actual value cannot enter its own input sequence. Revised history can still contain revision leakage, which the lag does not remove.",
        "Why not randomly split windows? Overlap and time ordering would contaminate the evaluation with future regimes and possibly future observations.",
        "WDI publication dates and original vintages are missing. This is retrospective forecasting, not a point-in-time tradable backtest.",
    ),
    (
        "PyTorch Fundamentals",
        "forecast.py",
        "Tensors have shape batch×time×features. nn.Module owns learned parameters; an optimizer updates them from gradients.",
        "The training loop zeroes gradients, computes Gaussian loss, backpropagates, clips gradient norm at one, and steps Adam. Evaluation uses eval() and no_grad(). The best validation checkpoint is deep-copied and saved.",
        "The test suite trains a tiny model for three updates and verifies that weights change; it then saves, reloads and runs inference. Synthetic test inputs are never displayed as economic history.",
        "Why deepcopy a state_dict? Otherwise the saved best state can share live tensor storage and be overwritten by subsequent optimization.",
        "Deterministic CPU seeds improve reproducibility, but different library versions and hardware can still change numerical details.",
    ),
    (
        "Graph Neural Networks",
        "forecast.py",
        "X[b,i,f] is a feature of node i at time b. A[i,j] is an observed input share when a valid network is available.",
        "Messages use M[b,j,f]=ΣᵢA[i,j]X[b,i,f]. A learned linear transform of M is combined with a learned local transform of X, passed through tanh, then a prediction head.",
        "A[0,1]=.5 means node 1 receives half of node 0’s features before the learned message transform. The gradient test verifies that the message weights receive a gradient.",
        "Are thousands of nodes thousands of independent temporal samples? No. They share shocks and graph structure. The temporal sample count and effective dependence must be assessed separately.",
        "The architecture and gradient tests work; empirical GNN training and a no-edge economic ablation are blocked by the unavailable verified network and outcome panel. No GNN accuracy is reported.",
    ),
    (
        "Temporal Transformers",
        "forecast.py",
        "A Transformer represents a temporal sequence using attention weights softmax(QKᵀ/√d). Position information distinguishes dates.",
        "The current working alternative is an eight-unit GRU: a compact recurrent model with gates controlling state retention. It is appropriate for a deliberately small annual demonstration and has far fewer parameters than a typical Transformer.",
        "The multivariate GRU has 354 learned parameters. Expanding architecture size without increasing independent history does not create information.",
        "Why not add a Transformer for a stronger résumé? Architectural complexity is not evidence. A defensible comparison needs sufficient data, baselines and predeclared chronological evaluation.",
        "No Transformer is implemented or claimed. Larger temporal architectures require a richer monthly dataset with release-aware alignment.",
    ),
    (
        "Probabilistic Deep Learning",
        "forecast.py",
        "The final two outputs represent μ and an unconstrained scale logit. σ=softplus(logit)+.05 prevents zero or negative scales.",
        "Training minimizes Gaussian log score without its constant in normalized target units. Reported test NLL includes the constant and uses the original target units. MAE/RMSE assess point predictions; coverage and width assess interval behavior.",
        "A model can reduce NLL by widening intervals when uncertain, but excessively wide intervals are penalized by log σ. Good average likelihood does not ensure tail calibration.",
        "Why report multiple seeds? Tiny samples make optimization unstable. Showing all preselected seeds prevents selecting a favorable test result after the fact.",
        "No probabilistic market stress simulator exists. Conditional statistical uncertainty is not causal uncertainty.",
    ),
    (
        "Bond Pricing and Yield Curves",
        "finance.py",
        "F is face value, c annual coupon rate, y nominal annual yield, m coupon frequency, n=mT coupon periods. CF[k] is coupon plus principal at maturity.",
        "P=Σ CF[k](1+y/m)^−k. Modified duration is −P′(y)/P. Convexity is P″(y)/P. The second-order expansion gives ΔP/P≈−DmodΔy+½CΔy².",
        "A 100-face, 5% coupon, 10-year bond with 5% yield and semiannual coupons prices at 100. Finite-difference tests verify duration and convexity.",
        "What is missing from this bond model? Accrued interest, irregular coupon dates, day counts, default, embedded options and nonparallel yield shifts.",
        "No observed Treasury curve is loaded. The interface accepts explicitly hypothetical yield assumptions; rates are fractions and shifts are basis points.",
    ),
    (
        "ETF Portfolio Mathematics",
        "finance.py",
        "P[t,i] is a positive total-return price/index. r[t,i]=P[t,i]/P[t−1,i]−1. Weights are long-only and sum to one.",
        "A periodically rebalanced portfolio has rₚ[t]=r[t]·w. Wealth multiplies (1+rₚ). Drawdown compares wealth with its running peak, including initial capital. Volatility is sample standard deviation times √periods_per_year.",
        "A first-period loss of 10% must produce −10% drawdown even if all later returns are zero. Omitting the initial capital point would miss that decline.",
        "Why require total-return prices? Unadjusted prices can omit distributions and mishandle splits; substituting them silently changes the financial quantity being measured.",
        "User confirmation is not independent verification. Complete common dates are required; no interpolation. Constant assets have undefined correlations, represented as null.",
    ),
    (
        "Convex Optimization and CVaR",
        "finance.py",
        "w is allocation, Σ the training sample covariance, Lₜ(w)=−rₜ·w loss, α=.95. η is a loss threshold and uₜ a nonnegative excess-loss variable.",
        "Minimum variance solves min wᵀΣw. CVaR solves min η+Σuₜ/[(1−α)T], with uₜ≥Lₜ−η and uₜ≥0. Constraints enforce sum(w)=1, w≥0, per-asset cap and an L1 turnover limit.",
        "A three-asset cap of .2 is infeasible because the maximum total allocation is .6. The API rejects it instead of returning normalized invalid weights.",
        "Is CVaR just the average loss exceeding a sample quantile? Not always with small samples or ties. The implemented hinge-loss formula correctly handles fractional tail mass.",
        "One-time turnover cost is reported separately. In the variance objective its penalty is a user-chosen regularizer; mixing risk and cost is not a utility model. No expected-return optimization is claimed.",
    ),
    (
        "Model Validation and Backtesting",
        "forecast.py",
        "Training fits parameters, validation chooses epochs/hyperparameters, and test measures outcomes once. Portfolio fitting uses the first 70% of returns and evaluates on the remaining 30%.",
        "The financial holdout starts strictly after the fitting period. Allocation weights stay fixed as rebalance targets. A one-time turnover cost reduces initial holdout wealth; repeated rebalance costs are not modeled.",
        "Ridge regularization is chosen from .1,1,10,100 using validation error, never test error. All neural seeds are reported, including runs worse than a simple baseline.",
        "Is this a complete trading backtest? No. The system lacks point-in-time releases, rolling portfolio re-estimation, realistic execution and full transaction cost accounting.",
        "Report actual metrics and denominators. Annual data and a ten-year test set cannot establish reliable economic forecasting superiority.",
    ),
    (
        "Backend and API Architecture",
        "api.py",
        "FastAPI serves data and models through local loopback endpoints. Request schemas validate allowed fields, domains and finite numeric values. Mathematical modules do not import frontend code.",
        "Raw downloads are hashed. Preparation preserves nulls and source fields in Parquet, queries use DuckDB, and source metadata lives in SQLite. Training is a separate explicit script; the app reads saved evaluation output.",
        "POST /api/shocks with A=[[0,.5],[0,0]] and shock=[.1,0] returns [.1,.05]. An unstable A=[[1]] returns a validation error.",
        "Why not retrain when a slider changes? It is slow, mixes research and inference, and can make results irreproducible. Checkpoints separate those responsibilities.",
        "The API is local research software without authentication or a remote deployment hardening layer. It deliberately binds only to 127.0.0.1.",
    ),
    (
        "Frontend and Geographic Visualization",
        "../frontend/src/WorldMap.tsx",
        "React coordinates selected country, annual period, region and indicator. MapLibre renders local Natural Earth geometry; ECharts renders backend observations.",
        "Country selection updates the inspector and history request. Failed requests, missing values and loading states are distinct. Flat/globe map mode does not change the underlying measurements.",
        "Selecting Japan and year 2020 updates common-year metrics while history stops at 2020. Missing values are displayed as unavailable and line charts do not connect across them.",
        "Why local map workers and no tile server? This keeps cartography functional after installation without network credentials or a recurring service.",
        "Natural Earth 1:110m is generalized, lacks small territories and uses de facto boundaries. A rendered border is not a political endorsement. Keyboard country controls provide a map alternative.",
    ),
]
for i, (title, code, variables, derivation, example, qa, limits) in enumerate(
    chapters, 1
):
    link = (
        f"../backend/atlas/{code}"
        if not code.startswith("..")
        else "../frontend/src/WorldMap.tsx"
    )
    text = f"# {i:02d} — {title}\n\n## Variables and representation\n\n{variables}\n\n## Derivation and implementation\n\n{derivation}\n\n[Read the implementation]({link}).\n\n## Worked example and expected behavior\n\n{example}\n\n## Interview question\n\n{qa}\n\n## Limits\n\n{limits}\n"
    (ROOT / "learning" / f"{i:02d}-{title.lower().replace(' ', '-')}.md").write_text(
        text
    )
(ROOT / "learning/README.md").write_text(
    "# Learning ATLAS\n\nRead chapters in order. The code links point to working implementations; unavailable architectures and data are explicitly marked. Mathematical assertions are exercised in `backend/tests/`. Reproduce the three notebooks from the repository root or the notebooks directory using the ATLAS virtual environment.\n\n"
    + "\n".join(
        f"- [{i:02d} — {t[0]}]({i:02d}-{t[0].lower().replace(' ', '-')}.md)"
        for i, t in enumerate(chapters, 1)
    )
)
setup = "from pathlib import Path\nimport sys\nROOT=Path.cwd() if (Path.cwd()/'backend').exists() else Path.cwd().parent\nsys.path.insert(0,str(ROOT/'backend'))\n"
notebooks = [
    (
        "01_structural_economics",
        "Synthetic teaching network — not observed economic data.",
        "from atlas.economics import propagate\nimport numpy as np\nr=propagate([[0,.5],[0,0]],[.1,0])\nassert np.allclose(r['total'],[.1,.05])\nprint(r)\n",
    ),
    (
        "02_bonds_and_risk",
        "Analytically checkable bond and explicitly synthetic loss distribution.",
        "from atlas.finance import bond,yield_to_maturity,empirical_cvar\nr=bond(100,.05,.05,10)\nassert abs(r['price']-100)<1e-8\nassert abs(yield_to_maturity(100,100,.05,10)-.05)<1e-8\nprint(r)\nprint('Synthetic 50% expected shortfall:',empirical_cvar([0,1,2,3],.5))\n",
    ),
    (
        "03_pytorch_research",
        "Real WDI revised-history experiment; no point-in-time or causal interpretation. This re-runs all preselected seeds.",
        "from atlas.forecast import train,infer,dataset\nreport=train(ROOT/'data/models')\nfor row in report['results']: print(row)\nx,_,_,_=dataset()\nprint(infer(ROOT/'data/models/gru_multivariate_seed17.pt',x[-1]))\n",
    ),
]
for name, description, code in notebooks:
    nb = {
        "nbformat": 4,
        "nbformat_minor": 5,
        "metadata": {
            "kernelspec": {
                "display_name": "Python 3 (ATLAS venv)",
                "language": "python",
                "name": "python3",
            },
            "language_info": {"name": "python", "version": "3.12"},
        },
        "cells": [
            {
                "cell_type": "markdown",
                "id": "intro",
                "metadata": {},
                "source": [f"# {name}\n", description],
            },
            {
                "cell_type": "code",
                "id": "setup",
                "metadata": {},
                "execution_count": None,
                "outputs": [],
                "source": setup.splitlines(keepends=True),
            },
            {
                "cell_type": "code",
                "id": "experiment",
                "metadata": {},
                "execution_count": None,
                "outputs": [],
                "source": code.splitlines(keepends=True),
            },
        ],
    }
    (ROOT / "notebooks" / f"{name}.ipynb").write_text(json.dumps(nb, indent=2))

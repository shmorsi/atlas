# Model card

Two saved PyTorch experiments and one deterministic network solver ship with ATLAS. This card is the intended-use statement. It is not a results table. Rankings and errors stay in the committed JSON. The README quotes those tokens without rounding, and `backend/tests/test_readme_figures.py` fails if that quotation drifts.

## Intended use

Local research and teaching on one machine. Replay a saved checkpoint. Inspect a hypothetical production-network scenario beside the baselines saved with it.

## Out of scope

Not a trading system, a forecast product, or a hosted service. Not a causal model of oil, monetary policy, or asset prices. Not a point-in-time backtest: World Bank rows are revised history and have no release vintages. No checkpoint was selected for deployment by sorting the test set. The README states, from the JSON, which forecast seed is the default and which runs have a lower test RMSE than ridge.

## What is saved

- A country-sector graph experiment. The target is the next annual log change in gross output. Train 2018–2020, validation 2021, test 2022. Three seeds, a zero-edge ablation, and ridge, persistence, and training-mean baselines are all saved. Record: [`data/models/gnn/evaluation.json`](../data/models/gnn/evaluation.json).
- A US real GDP growth forecast. Feature windows end at t−2. Ten held-out years, 2015–2024. Multivariate and domestic-only GRUs, the same three seeds, and the same kinds of baselines are saved. The nominal Gaussian intervals are not recalibrated. Record: [`data/models/evaluation.json`](../data/models/evaluation.json).
- Scenario Studio solves a linear input-output system. It is not a learned model. The page labels the result as a hypothetical cost change.

The protocol, parameter counts, and the four-decimal printing of the same files are in [`RESEARCH_REPORT.md`](RESEARCH_REPORT.md).

## Reproduction

CI and `npm run verify:release` replay the saved checkpoints. They do not train. Training entry points remain in the repository for a person who chooses to run them. Do not hand-edit evaluation files, hashes, manifests, or checkpoints.

## Limits

One held-out network year, and the nodes in that year are dependent. Ten annual forecast targets are a small sample. Revised inputs can contain information that was not public on a historical publication date. A scenario uses fixed historical coefficients and one pass-through rate.

## Misuse

Reading a scenario, a bond worksheet, or a replayed prediction as GDP, inflation, or a return would be a misuse. The interface keeps observed history, hypothetical scenarios, and learned predictions apart.

## Citation

[`CITATION.cff`](../CITATION.cff).

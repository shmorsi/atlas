# OECD ICIO import and independent audit

The user supplied the official regular 2016–2022 ZIP, ReadMe workbook and 2025 annex. The metadata documents and extracted schema are retained in data/reference/oecd. Archive and individual CSV SHA-256 hashes are recorded in data/processed/network/metadata.json. The original 159 MB ZIP remains external and is required to rebuild the derived cache; normal operation needs only the packaged seven NPZ tables.

The official regular layout has 81 areas (80 economies plus Rest of World), 50 activities, 4,050 country-industry nodes, 4,053 rows including TLS/VA/OUT and 4,537 columns including final demand and OUT. Code identity determines alignment because the workbook has inconsistent numeric row labels. Industry codes can themselves contain underscores. Units are current USD million; values are basic-price intermediate transactions, with tax/subsidy and value-added rows used for reconciliation. Final demand may contain negative inventory entries; it is never treated as intermediate use.

The importer rejects missing/nonfinite cells and negative intermediate flows/output. Zero-output original nodes must have zero intermediate rows and columns. It verifies equality of row and column output denominators, retains row/column accounting residuals, and checks both original and aggregate tolerances. The original threshold is 0.25 million USD + 0.01% output per sector; the aggregate threshold sums constituent tolerances. 2020 original rows exceed that threshold in a number of sectors; exact exceptions are published in metadata. They are not silently rebalanced. All seven five-sector aggregates pass their stated tolerance.

## Aggregation and orientation

Energy = B05, B06, B09, C19 and D (coal, oil/gas, support, refining and utilities). Primary = remaining A/B. Manufacturing = remaining C. Construction = F. Services = remaining industries. The full mapping is retained. For country/group assignment S, Z_group = S Z Sᵀ and X_group = S X. A[i,j] = Z_group[i,j] / X_group[j], supplier i → buyer j. Coefficients are derived after summing flows/output, never averaged. All 405 aggregate nodes have positive output. All annual spectral radii are below one.

The scenario solves (I − Aᵀ)p = s. Country effects weight sector price changes by baseline gross output: they are neither CPI nor GDP changes. Maps draw relationships between cartographic points, not shipping routes.

## Reproduce

```sh
node scripts/python.mjs scripts/import_icio.py /path/to/2016-2022_SML.zip
node scripts/python.mjs scripts/check_icio_samples.py /path/to/2016-2022_SML.zip
node scripts/python.mjs scripts/train_graph.py
npm run verify:release
```

The independent check uses standard-library CSV streaming and Decimal arithmetic rather than the importer's Polars/sparse aggregation. Six transaction blocks and their buyer-output denominators across 2016/2020/2022 agree within 1e-7 million USD; actual values appear in ICIO_SAMPLE_AUDIT.json.

Source: OECD (2025), OECD Inter-Country Input-Output Tables, https://oe.cd/icio (accessed 2026-10-09). The official page identifies a January 2026 revision of the 2025 edition. The supplied file is identified by hash; a filename alone is not proof of its revision vintage. Data use follows https://www.oecd.org/en/about/terms-conditions.html, including attribution and passing that attribution requirement to downstream recipients. This package contains a documented ATLAS aggregation, not an OECD endorsement.

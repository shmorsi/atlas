# OECD ICIO documentation received

The user supplied the 2025 regular ReadMe and annex. Copies and SHA-256 hashes are retained in `data/reference/oecd`; `schema.json` contains extracted area, activity and row/column code definitions. It contains no observed economic flows.

Verified: 81 areas (80 economies plus rest of world), 50 activities, 4,050 unique country-industry codes, 4,053 data rows including TLS/VA/OUT, and 4,537 data columns including six final-demand categories per area and OUT. Industry code sets match across row and column lists. Units are current USD million. The workbook's numeric row labels are inconsistent near the end; importer alignment must use codes, not numeric labels. The annex also lists extended-table splits; those must not be mixed into regular tables.

Still required: the official regular 2016–2022 data ZIP, or its annual CSV files. Neither attached document supplies the intermediate-use values or output denominators needed for coefficient construction. No production network or model training has been enabled from documentation alone.

On receipt, validate actual headers against this schema, preserve NA entries, reconcile supply/use totals and output denominators (including tax conventions), derive A[i,j] = Z[i,j]/X[j], and test numerical stability. Negative and unavailable entries require explicit treatment; do not clip or impute them silently. The full 4,050-node table exceeds the current 500-node teaching solver limit and needs a separately tested sparse solver or documented aggregation before serving scenarios.

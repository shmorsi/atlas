# 03 — Graph Theory and Global Production Networks

## Variables and representation

Nodes are country-industry pairs in a real ICIO application; directed edge i→j carries A[i,j]. Our default laboratory uses three explicitly synthetic sectors.

## Derivation and implementation

First-order propagation follows one edge. Powers of A follow longer walks, with path weights equal to products of edge coefficients. At equilibrium in price mode, contribution i→j is A[i,j]Δp[i].

[Read the implementation](../backend/atlas/economics.py).

## Worked example and expected behavior

If A[0,1]=.2 and A[1,2]=.3, a .1 shock at node 0 contributes .006 to node 2 along the two-edge path, before other paths are added.

## Interview question

Is a central node necessarily an attractive investment? No. Graph position describes a specified economic network and does not identify expected asset returns.

## Limits

Seven supplied OECD tables are aggregated to 405 nodes. Economic Network shows historical supplier flows and fixed-coefficient exposure; see docs/OECD_IMPORT.md for orientation, aggregation and retained accounting discrepancies. No transport-route or current-infrastructure claim is made.

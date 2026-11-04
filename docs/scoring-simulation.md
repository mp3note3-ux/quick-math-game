# Scoring simulation report

Generated: 2026-11-04T14:42:25.515Z
Boards per (config × strategy): 10000 (same seeded boards across all cells).
Bot params: realistic find rate 0.75, fumble rate 0.05, action budget 25, random declare rate 0.1.

This report is evidence for the open scoring decisions in
`GAME_DESIGN_IMPROVEMENT.md` §10. It does not lock any values.

## Board statistics (config-independent)

| Sets on board | Boards | Share |
|---|---|---|
| 0 | 1 | 0.0% |
| 1 | 455 | 4.5% |
| 2 | 1788 | 17.9% |
| 3 | 3266 | 32.7% |
| 4 | 2851 | 28.5% |
| 5 | 1416 | 14.2% |
| 6 | 207 | 2.1% |
| 8 | 16 | 0.2% |

| Set level | Count | Share of all sets |
|---|---|---|
| 1 | 7641 | 22.7% |
| 2 | 15589 | 46.3% |
| 3 | 10453 | 31.0% |

Boards with zero valid sets: 1 (0.01%).

## Score by config × strategy (single board)

| Config | Bot | Mean | Median | p05 | p95 | % < 0 | % = 0 | Clear rate | Mean wrong |
|---|---|---|---|---|---|---|---|---|---|
| flat [1,1,1] (prototype) · no floor | idle | 0.00 | 0 | 0 | 0 | 0.0% | 100.0% | 0.0% | 0.00 |
| flat [1,1,1] (prototype) · no floor | random-guesser | -23.15 | -23 | -25 | -20 | 99.9% | 0.0% | 1.5% | 21.51 |
| flat [1,1,1] (prototype) · no floor | realistic | 5.96 | 6 | 4 | 8 | 0.0% | 0.1% | 100.0% | 0.18 |
| flat [1,1,1] (prototype) · no floor | perfect | 6.37 | 6 | 5 | 8 | 0.0% | 0.0% | 100.0% | 0.00 |
| flat [1,1,1] (prototype) · floor 0 | idle | 0.00 | 0 | 0 | 0 | 0.0% | 100.0% | 0.0% | 0.00 |
| flat [1,1,1] (prototype) · floor 0 | random-guesser | 0.07 | 0 | 0 | 0 | 0.0% | 95.9% | 1.2% | 21.49 |
| flat [1,1,1] (prototype) · floor 0 | realistic | 6.08 | 6 | 4 | 8 | 0.0% | 0.0% | 100.0% | 0.18 |
| flat [1,1,1] (prototype) · floor 0 | perfect | 6.37 | 6 | 5 | 8 | 0.0% | 0.0% | 100.0% | 0.00 |
| levels [1,2,3] (shipped) · no floor | idle | 0.00 | 0 | 0 | 0 | 0.0% | 100.0% | 0.0% | 0.00 |
| levels [1,2,3] (shipped) · no floor | random-guesser | -22.29 | -22 | -25 | -17 | 99.9% | 0.1% | 1.5% | 21.52 |
| levels [1,2,3] (shipped) · no floor | realistic | 9.61 | 10 | 5 | 14 | 0.0% | 0.0% | 100.0% | 0.18 |
| levels [1,2,3] (shipped) · no floor | perfect | 10.02 | 10 | 6 | 14 | 0.0% | 0.0% | 100.0% | 0.00 |
| levels [1,2,3] (shipped) · floor 0 | idle | 0.00 | 0 | 0 | 0 | 0.0% | 100.0% | 0.0% | 0.00 |
| levels [1,2,3] (shipped) · floor 0 | random-guesser | 0.15 | 0 | 0 | 1 | 0.0% | 92.9% | 1.2% | 21.51 |
| levels [1,2,3] (shipped) · floor 0 | realistic | 9.70 | 10 | 5 | 14 | 0.0% | 0.0% | 100.0% | 0.17 |
| levels [1,2,3] (shipped) · floor 0 | perfect | 10.02 | 10 | 6 | 14 | 0.0% | 0.0% | 100.0% | 0.00 |
| levels [1,2,4] · no floor | idle | 0.00 | 0 | 0 | 0 | 0.0% | 100.0% | 0.0% | 0.00 |
| levels [1,2,4] · no floor | random-guesser | -22.12 | -23 | -25 | -16 | 99.9% | 0.0% | 1.4% | 21.56 |
| levels [1,2,4] · no floor | realistic | 10.66 | 11 | 5 | 16 | 0.0% | 0.0% | 100.0% | 0.18 |
| levels [1,2,4] · no floor | perfect | 11.06 | 11 | 6 | 17 | 0.0% | 0.0% | 100.0% | 0.00 |
| levels [1,2,4] · floor 0 | idle | 0.00 | 0 | 0 | 0 | 0.0% | 100.0% | 0.0% | 0.00 |
| levels [1,2,4] · floor 0 | random-guesser | 0.22 | 0 | 0 | 2 | 0.0% | 91.1% | 1.5% | 21.51 |
| levels [1,2,4] · floor 0 | realistic | 10.76 | 11 | 5 | 16 | 0.0% | 0.0% | 100.0% | 0.17 |
| levels [1,2,4] · floor 0 | perfect | 11.06 | 11 | 6 | 17 | 0.0% | 0.0% | 100.0% | 0.00 |

## Fairness checks

The design brief's core exploit: with +1/−1 scoring, a cautious player may rationally do
nothing (score 0). The table shows how often that beats an engaged player, and how often
blind guessing beats engaged play.

| Config | Realistic ends < 0 (idle beats them) | Random guesser beats realistic |
|---|---|---|
| flat [1,1,1] (prototype) · no floor | 0.02% | 0.00% |
| flat [1,1,1] (prototype) · floor 0 | 0.00% | 0.00% |
| levels [1,2,3] (shipped) · no floor | 0.00% | 0.00% |
| levels [1,2,3] (shipped) · floor 0 | 0.00% | 0.01% |
| levels [1,2,4] · no floor | 0.00% | 0.00% |
| levels [1,2,4] · floor 0 | 0.00% | 0.00% |

Notes for the decision:

- `idle` always scores exactly 0: inactivity earns nothing under every config.
- A floor of 0 removes negative finishes but makes idle and unlucky players indistinguishable;
  the eligibility rule (min verified sets) is what separates them for ranking.
- Level-weighted rewards raise the ceiling for engaged play; check the gap between
  `perfect` and `realistic` means to judge reward inflation versus the flat model.

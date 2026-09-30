# Balance report

Made by `npm run balance` from the numbers in `src/data/`. Run it again after changing them; don't edit this file by hand.

200 automatic battles per row, each with a fresh hydra (Biter, Acid Spitter, Mist Breather) and 200 body HP.

- **no orders:** the hydra is left alone, heads pick their own targets.
- **focus fire:** every head that can reach attacks the same enemy (Torchbearers first, then Headhunters). A stand-in for a careful player.

"Heads severed", "Stumps burnt", "Combos" and "Body HP lost" are averages per battle.

| Enemy group | Members | Player | Won | Lost | Avg. length | Heads severed | Stumps burnt | Combos | Body HP lost |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| patrol | Man-at-Arms, Man-at-Arms, Man-at-Arms | no orders | 98% | 2% | 41 s | 2.0 | 0.0 | 3.9 | 100.0 |
| patrol | Man-at-Arms, Man-at-Arms, Man-at-Arms | focus fire | 100% | 0% | 37 s | 1.3 | 0.0 | 6.5 | 67.2 |
| huntingParty | Man-at-Arms, Headhunter, Headhunter | no orders | 100% | 0% | 30 s | 4.0 | 0.0 | 4.3 | 34.7 |
| huntingParty | Man-at-Arms, Headhunter, Headhunter | focus fire | 100% | 1% | 30 s | 2.2 | 0.0 | 6.4 | 32.4 |
| burningDetail | Man-at-Arms, Man-at-Arms, Torchbearer, Headhunter | no orders | 89% | 11% | 46 s | 4.2 | 0.7 | 5.0 | 112.6 |
| burningDetail | Man-at-Arms, Man-at-Arms, Torchbearer, Headhunter | focus fire | 100% | 0% | 38 s | 1.8 | 0.0 | 8.3 | 79.4 |
| lostNovices | Torchbearer, Torchbearer | no orders | 100% | 0% | 11 s | 0.0 | 0.0 | 3.9 | 2.5 |
| lostNovices | Torchbearer, Torchbearer | focus fire | 100% | 0% | 9 s | 0.0 | 0.0 | 5.7 | 1.5 |

# Balance report

Made by `npm run balance` from the numbers in `src/data/`. Run it again after changing them; don't edit this file by hand.

200 automatic battles per row, each with a fresh hydra (Biter, Acid Spitter, Mist Breather) and 150 body HP.

- **no orders:** the hydra is left alone, heads pick their own targets.
- **focus fire:** every head that can reach attacks the same enemy (Torchbearers first, then Headhunters). A stand-in for a careful player.

"Heads severed", "Stumps burnt", "Combos" and "Body HP lost" are averages per battle.

| Enemy group | Members | Player | Won | Lost | Avg. length | Heads severed | Stumps burnt | Combos | Body HP lost |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| patrol | Man-at-Arms, Man-at-Arms, Man-at-Arms | no orders | 100% | 0% | 41 s | 3.1 | 0.0 | 5.7 | 23.9 |
| patrol | Man-at-Arms, Man-at-Arms, Man-at-Arms | focus fire | 100% | 0% | 39 s | 1.8 | 0.0 | 6.4 | 35.3 |
| huntingParty | Man-at-Arms, Headhunter, Headhunter | no orders | 100% | 0% | 32 s | 3.8 | 0.0 | 5.4 | 9.8 |
| huntingParty | Man-at-Arms, Headhunter, Headhunter | focus fire | 100% | 0% | 32 s | 2.2 | 0.0 | 6.7 | 24.4 |
| burningDetail | Man-at-Arms, Man-at-Arms, Torchbearer, Headhunter | no orders | 97% | 3% | 45 s | 5.0 | 0.6 | 5.9 | 47.1 |
| burningDetail | Man-at-Arms, Man-at-Arms, Torchbearer, Headhunter | focus fire | 100% | 0% | 41 s | 2.1 | 0.0 | 9.2 | 54.4 |
| lostNovices | Torchbearer, Torchbearer | no orders | 100% | 0% | 13 s | 0.0 | 0.0 | 4.3 | 0.0 |
| lostNovices | Torchbearer, Torchbearer | focus fire | 100% | 0% | 12 s | 0.0 | 0.0 | 6.1 | 1.7 |

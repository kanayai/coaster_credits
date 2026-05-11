# Identity Comparison Report (2026-04-22)

## Scope
Compared:
- `family_export.karim-only.json`
- `family_export.cadel-only.json`

Goal: verify which profile is Cadel vs Karim based on data fingerprints, not file names.

## Direct User Record Match
- Karim profile:
  - user id: `u1`
  - name: `Karim`
  - avatarColor: `bg-primary`
  - highScore: `44`
- Cadel profile:
  - user id: `u_mihzrqzy_wjurihrkb`
  - name: `Cadel`
  - avatarColor: `bg-red-500`

## Credit Volume + Date Window
- Karim (`u1`): 129 credits, range `2025-11-20` to `2026-02-28`
- Cadel (`u_mihzrqzy_wjurihrkb`): 114 credits, range `2025-10-24` to `2026-01-03`

## Coaster Overlap Fingerprint
- Shared credited coasters: `80`
- Coasters only Karim has: `23`
- Coasters only Cadel has: `30`

This is a strong signal that they are two distinct rider histories.

## Monthly Ride Cadence
Karim:
- 2025-11: 75
- 2025-12: 6
- 2026-01: 45
- 2026-02: 3

Cadel:
- 2025-10: 2
- 2025-11: 93
- 2025-12: 4
- 2026-01: 15

## Peak Day Pattern
Karim top days:
- 2026-01-03: 34
- 2025-11-27: 30
- 2025-11-24: 26

Cadel top days:
- 2025-11-27: 93
- 2026-01-03: 15

Both share trip windows, but with clearly different counts and coaster sets.

## Full Non-Intersection Coaster Lists
These are complete sets from the credit-difference calculation, not samples.

Karim-only full list (`23` total: `16` resolved + `7` unresolved ids):
- `K3 Roller Skater` (Plopsaland De Panne, Belgium) - `c_mig6l5si_bz5v80u75`
- `#LikeMe Coaster` (Plopsaland De Panne, Belgium) - `c_mig6mnt1_epm4qqqs1`
- `Draconis` (Plopsaland De Panne, Belgium) - `c_mig6nsag_rbrcddxyq`
- `SOS Numerobis` (Parc Asterix, France) - `c_mijgwct3_kq417zvyn`
- `Mecalodon` (Walibi Belgium, Belgium) - `c_ming11g6_0d2ebx81r`
- `SOS Tournevis` (Parc Asterix, France) - `c_minh232b_o8948pib9`
- `Rutschebanen` (Tivoli Gardens, Denmark) - `c_mjyjq7ka_3aw1vv86a`
- `Kamelen` (Tivoli Gardens, Denmark) - `c_mjyjqfkb_rp6pwod8m`
- `Mælkevejen` (Tivoli Gardens, Denmark) - `c_mjyjqx1l_jlpra7f9h`
- `Chupacabra` (Six Flags Fiesta Texas, USA) - `c_mjyjyuhi_e1hmbvwic`
- `Mr. Freeze` (Six Flags Over Texas, USA) - `c_mjzr7pt0_b06963klr`
- `Aquaman: Power Wave` (Six Flags Over Texas, USA) - `c_mk06nt7w_1ontmefiw`
- `The Joker` (Six Flags Over Texas, USA) - `c_mk06rp6o_oik01o0vc`
- `Wave Breaker: The Rescue Coaster` (SeaWorld San Antonio, USA) - `c_mk06zi55_1j702tyk5`
- `Atlantica SuperSplash` (Europa Park, Germany) - `c_mk07qex3_gd5ybtl84`
- `Minifigure Speedway` (Legoland Windsor, UK) - `c_mlnroj05_pqzm8u50u`
- `[Unresolved coaster id]` - `de6`
- `[Unresolved coaster id]` - `fl4`
- `[Unresolved coaster id]` - `sp4`
- `[Unresolved coaster id]` - `sp5`
- `[Unresolved coaster id]` - `uk1`
- `[Unresolved coaster id]` - `usa46`
- `[Unresolved coaster id]` - `usa50`

Cadel-only full list (`30` total: `29` resolved + `1` unresolved id):
- `Like Me Coaster` (Plopsaland De Panne, Belgium) - `c_mihfoeow_crot8b0ov`
- `K3 RollerSkater` (Plopsaland De Panne, Belgium) - `c_mihfp7f5_g0af2wz4o`
- `Draak` (Plopsaland De Panne, Belgium) - `c_mihfur58_0nbs724mj`
- `Wodan Timburcoaster` (Europa Park, Germany) - `c_mihh419a_m1dn0mwai`
- `Arthur` (Europa Park, Germany) - `c_mihh4tgw_7n3b36wjw`
- `Ba-a-a Express` (Europa Park, Germany) - `c_mihh881c_rt7g1t0p2`
- `Alpenexpress Enzian` (Europa Park, Germany) - `c_mihhadrr_o6kd931ie`
- `Medusa Steel Coaster` (Six Flags Mexico, Mexico) - `c_mihhmnol_9548y3afc`
- `Batman: The Ride` (Six Flags Mexico, Mexico) - `c_mihhp7en_16p69v7ts`
- `The Joker` (Six Flags Mexico, Mexico) - `c_mihhpw2g_t4tem69ax`
- `Superman el Ultimo Escape` (Six Flags Mexico, Mexico) - `c_mihhqt5b_8v28s4w9m`
- `Batgirl Batarang` (Six Flags Mexico, Mexico) - `c_mihhtony_cswc83m36`
- `Wonder Woman Coaster` (Six Flags Mexico, Mexico) - `c_mihhucp2_0h534m2m9`
- `The Dark Knight Coaster` (Six Flags Mexico, Mexico) - `c_mihhvzk0_5i1sc0uhc`
- `Serpentikha` (La Feria Chapultepec Magico, Mexico) - `c_mihi3s6j_zh7f29rd5`
- `Laka Laka` (La Feria Chapultepec Magico, Mexico) - `c_mihi5vfn_a33t759ob`
- `Marometas` (La Feria Chapultepec Magico, Mexico) - `c_mihi6sdd_ydjk46w8b`
- `La Mocha` (Parque Aztlan, Mexico) - `c_mihi7imx_euzlw2gj1`
- `Dragon's Apprentice` (Legoland Windsor, UK) - `c_mihiazna_gyumyrdl8`
- `The Dragon` (Legoland Windsor, UK) - `c_mihibmzj_ezqosucy2`
- `Mandrill Mayhem` (Chessington World of Adventures, UK) - `c_mihic8vy_8eewccihv`
- `Scorpion Express` (Chessington World of Adventures, UK) - `c_mihid69q_6iqkl4yx6`
- `The Vampire` (Chessington World of Adventures, UK) - `c_mihie77k_lfmyp0lic`
- `Dragon's Fury` (Chessington World of Adventures, UK) - `c_mihieo23_raqbjhf8p`
- `Rattlesnake` (Chessington World of Adventures, UK) - `c_mihif7ga_1rw5xj6xd`
- `Olympia Looping` (Travelling (No Fixed Park), Germany) - `c_mihind9n_7aaovu69s`
- `Crazy Mouse` (Funderworld, UK) - `c_mihiof96_9awue9wbx`
- `Caterpillar Coaster` (Funderworld Bristol, Italy) - `c_mihirl26_pkanxkqw4`
- `Dragon Coaster` (Funderworld (Traveling Funfair), UK) - `c_mihishum_t91c2ig92`
- `[Unresolved coaster id]` - `uk4`

## Multi-Ride Pattern (same coaster repeated)
Karim has more repeat rides in this snapshot (e.g. several coasters with 5-6 entries).
Cadel has fewer repeats in this snapshot (mostly single entries, a few doubles).

## Conclusion
Data-level identity is consistent and high confidence:
- `u1` = Karim
- `u_mihzrqzy_wjurihrkb` = Cadel

If restoring credits, map imports using those user ids and each account's `--owner-id`.

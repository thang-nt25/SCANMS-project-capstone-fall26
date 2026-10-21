# Diagram validation baselines

Only the historical inputs used by `../validate-report-diagrams.ps1` are versioned here:

- `FR10`–`FR16` `_before_balanced_class_layout/fr*-report-spec.json`: class content comparisons.
- `FR10`–`FR16` `_before_fr09_sequence_v2/fr*-report-spec.json`: sequence content comparisons.
- `FR10`–`FR16` `_detailed/*.drawio`: original detailed diagrams required by the validator.

Other revision folders, old PNGs, scene exports and duplicate scripts are local working history and are ignored by Git. They may exist on the author's machine but are not required by a fresh checkout.

Current editable diagrams, PNG previews, scene files, specifications, generators and validators live in the parent directory. The review copies in `docs/review 2` and the XML paste exports are also used by the validators.

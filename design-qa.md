# IK2 visual acceptance — 2026-11-17

Reference: authenticated app.kolayik.com, inspected read-only. Scope excludes shifts and real external services.

## Result
Local visual and interaction checks passed for the inspected surfaces. This is a faithful ERP adaptation, not a claim of pixel identity across every Kolay IK state. Hosted form acceptance remains incomplete because the ERP session returned to login during the settings checks. Authentication was not bypassed or weakened.

## Evidence and comparisons
Private reference captures and fictional implementation captures are retained outside this repository in the task outputs/ik2-gorsel folder. No employee reference captures are published.
Desktop comparison viewport: 1440 x 1000 CSS pixels; mobile: 390 x 844. Full-page capture was used for final settings and performance images after viewport-only capture produced an incorrectly scaled image; CSS geometry was independently checked (200px sidebar, 1440px viewport).

Compared source and implementation: home, employee directory, employee creation dialog, profile, personal details, reports, system settings, leave table, calendar, performance settings and mobile navigation/forms.

1. Layout: 200px sidebar, 73px header, 50px tabs; independent home columns; profile two-column cards; report category/template grid.
2. Typography: OS font stack, source hierarchy and muted field labels.
3. Color and assets: blue actions, pale navigation/cards, observed icon glyphs and bonus illustration; OTOTR branding retained.
4. Spacing and geometry: source-like employee cards, dialog widths, field columns, vertical settings and performance cards.
5. Responsive behavior: five-item bottom navigation, usable forms and report cards; no horizontal page overflow at the tested mobile width.

Iterations fixed home grid gaps, report ordering/icons, profile hierarchy, settings card layout and mobile navigation. No blocking visual defects were observed in the inspected local surfaces. Minor typography/spacing and data-dependent differences remain; exhaustive pixel equivalence is not asserted.

## Functional verification
117 automated tests passed, zero failed. Browser route checks covered employees, leaves, reports, calendar, payroll, performance, compensation, expenses, discover, settings, clock, visa, timesheets, overtime, documents, assets, trainings, candidates, workflows, notifications and audit. Browser console errors: none observed locally.
Report categories/templates, all four performance definition dialogs, bonus reasons, profile editing, menu settings and mobile requests were opened successfully. Employee creation/profile dialogs were cancelled without creating source records.

## Intentional differences
Fictional demo records and explicit demo labels replace private source records. OTOTR branding and ERP return navigation remain. Kolay subscription offers, billing and service promises are not reproduced. Report periods reflect the actual demo model. Existing ERP features remain reachable. The mobile calendar can scroll rather than reproducing source overflow. Real service integrations and shifts remain outside this acceptance scope.

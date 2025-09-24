This PR wires immediate UI refresh after score submissions so changes show on the first submit.

- Dispatch global event ofsl:standings-updated after successful submit in both Admin and Public submit modals.
- LeagueStandings listens for that event and calls refetch to update immediately.
- No backend logic changes to results/standings/movement; only view refresh.

Notes:
- Movement is still applied at submit time; schedule views already reload the current week; this change specifically addresses instant standings refresh.

Scope: UI only.

Do not merge yet; for review and validation.

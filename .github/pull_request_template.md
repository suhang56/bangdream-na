## Summary
<!-- 1-2 sentences on what this PR does and why -->

## Test plan
- [ ] `npm test -- --run` passes locally
- [ ] `cd worker && npx vitest run` passes locally (if worker changed)
- [ ] Manual smoke tested at preview Worker URL (if applicable — see bot comment below)
- [ ] Browser tested at relevant viewport sizes (if frontend changed)

## Related
<!-- Issue # or context -->

## Breaking changes
<!-- None / describe migration path -->

---
**Conventions**:
- Conventional commits (`feat:` / `fix:` / `chore:` / `docs:` / `refactor:` / `test:`)
- No `Co-Authored-By:` trailers
- Bilingual UI strings: every new visible string needs both `zh` and `en` keys in `public/i18n.json`

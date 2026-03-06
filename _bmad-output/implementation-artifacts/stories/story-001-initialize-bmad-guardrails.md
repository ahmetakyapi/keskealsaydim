# Story 001 - BMAD Guardrail Başlangıcı

## Status

Done

## Goal

Projeye BMAD tabanlı minimum operasyon yapısını eklemek ve ilk uygulanabilir iyileştirmeleri başlatmak.

## Acceptance Criteria

1. BMAD kurulu olmalı ve proje içinde saklanmalı.
2. Projeye özgü çalışma kuralları tek noktada dokümante edilmeli.
3. BMAD başlangıç öneri listesi oluşturulmalı.
4. Runtime dış görsel hotlink bağımlılığı kaldırılmalı.

## Implemented

- `_bmad/` ve `_bmad-output/` yapısı eklendi.
- `docs/project-context.md` oluşturuldu.
- `docs/ai-playbook/{rules.md,skills.md,errors.md}` eklendi.
- `_bmad-output/planning-artifacts/bmad-initial-recommendations.md` oluşturuldu.
- Landing logo işaretleri local asset’e taşındı (`frontend/public/brands/*`).

## Validation

- `frontend` içinde `npm run build` başarılı.


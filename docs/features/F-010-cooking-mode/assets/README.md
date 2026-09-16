# F-010 Cooking Mode assets

## `cooking-mode-visual-reference.tsx`

This is the user-supplied visual/interaction reference for Cooking Mode.

Codex should use it to reproduce:

- overall page hierarchy;
- hero/summary card;
- current-step card;
- progress treatment;
- Previous/Next/Cook again controls;
- Ingredients card;
- serving selector placement;
- ingredient checklist style;
- Cooking Progress list;
- top Exit/Cooking Mode header.

It is **not** an architectural source of truth.

Do not copy React Router, React hooks architecture, fake recipe data, Tailwind utility classes, shadcn component ownership, or hard-coded visual tokens.

Use the Appetee Angular architecture and existing shared design system.

### Required intentional differences

1. Ingredients must **not** be sticky.
2. Top metadata adds protein and carbs.
3. Nutrition displays totals for the currently selected cooking servings.
4. Serving control starts from the recipe's actual base servings.
5. Ingredients and nutrition scale from `selectedServings / baseServings`.
6. Timer is a real stopwatch shared across all steps and never resets merely because the step changes.
7. Exit returns to captured origin route/query/scroll position when available.
8. Backend data comes from `/api/recipes/{id}/cooking-view`.

## `cooking-routing.svg`

Routing/data-flow reference for:

```text
Recipe Card
→ Quick Preview
→ Start Cooking
→ Cooking route
→ Exit
→ exact origin/fallback
```

The SVG documents product routing, not implementation-specific method names.

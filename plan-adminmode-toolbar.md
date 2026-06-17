# Admin Mode toolbar rendering fix - plan

## Information gathered
- `/admin-vs-2024` route matching in `src/App.tsx` was made more robust, but toolbar still results in a blank/white page after successful auth.
- Verified that `http://localhost:5173/admin-vs-2024` responds with **404 Not Found**, meaning the SPA deep-link is not being served/bootstrapped for that path.
- `vite.config.ts` currently sets `server.port = 3000` but the running dev server shows Vite on **5173**, and there is no explicit SPA fallback config ensuring index.html is served for deep links.

## Plan
1. Update `vite.config.ts` to set a dev server port that matches the command usage (or at least ensure the correct server is tested) and to include SPA fallback so all unknown routes return `index.html`.
2. Restart the dev server.
3. Re-test:
   - unauthenticated `/admin-vs-2024` shows login screen
   - authenticated `/admin-vs-2024` renders toolbar (not white)

## Dependent files to edit
- `vite.config.ts`

## Followup steps
- Restart dev server.
- Verify in browser/network that `/admin-vs-2024` returns 200 with `index.html`.

<ask_followup_question>
Proceed to edit `vite.config.ts` to add SPA fallback for deep routes and re-run the server so `/admin-vs-2024` doesn’t 404?
</ask_followup_question>


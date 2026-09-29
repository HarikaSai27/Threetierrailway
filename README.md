# Three-Tier App, Railway Ready

| Tier         | Tech              | Folder      | Railway service          |
|--------------|-------------------|-------------|--------------------------|
| Presentation | HTML/JS + nginx   | `frontend/` | `frontend` (public)      |
| Application  | Node + Express    | `backend/`  | `backend` (private)      |
| Data         | PostgreSQL        | (managed)   | `Postgres` (private)     |

The browser talks only to the frontend. nginx proxies `/api/*` to the backend over
Railway's private network. The backend creates its own table on first start.

---

## Deploy on Railway (GitHub method, recommended)

1. **Push to GitHub.** Unzip, then:
   ```bash
   cd railway-three-tier
   git init && git add . && git commit -m "initial"
   # create an empty repo on GitHub, then:
   git remote add origin <your-repo-url>
   git push -u origin main
   ```

2. **Create the project.** In Railway: *New Project* → *Deploy PostgreSQL*.

3. **Add the backend.** In the project: *New* → *GitHub Repo* → select your repo.
   - Service *Settings* → **Root Directory** = `backend`
   - Rename the service to **`backend`** (the name matters for the variables below)
   - *Variables* tab, add:
     - `DATABASE_URL` = `${{Postgres.DATABASE_URL}}`
     - `PORT` = `3000`
   - Do NOT generate a public domain for it.

4. **Add the frontend.** *New* → *GitHub Repo* → same repo.
   - Service *Settings* → **Root Directory** = `frontend`
   - Rename the service to **`frontend`**
   - *Variables* tab, add:
     - `BACKEND_URL` = `http://${{backend.RAILWAY_PRIVATE_DOMAIN}}:3000`
   - *Settings* → *Networking* → **Generate Domain**

5. Open the generated frontend URL. You should see the task app with two seed tasks.

> If your Postgres service is named something other than `Postgres`, change the
> reference in `DATABASE_URL` to match.

## Deploy with the Railway CLI (no GitHub)

```bash
npm i -g @railway/cli
railway login
railway init                      # create the project, then add Postgres in the dashboard

cd backend  && railway up --service backend    # first create the service + set variables in the dashboard
cd ../frontend && railway up --service frontend
```
Set the same variables as in steps 3 and 4 above.

## Troubleshooting

| Symptom | Fix |
|---|---|
| Frontend loads but tasks show an error / 502 | Check `BACKEND_URL` and that the backend's `PORT` variable is `3000`. Check backend logs. |
| nginx 502 with "no resolver" / "could not be resolved" | Set a variable `NGINX_LOCAL_RESOLVERS` = `[fd12::10]` on the frontend service (Railway's private DNS). |
| Backend crash: `DATABASE_URL is not set` | Add the reference variable from step 3. |
| Backend crash: SSL error | Set `DATABASE_SSL` = `true` (needed only when using the public Postgres URL). |
| Backend "Database not ready" loops | Confirm the Postgres service is deployed and the variable reference name matches. |

## Run locally (optional, needs Docker)
```bash
docker compose up --build
```
Open http://localhost:8080

## API
- `GET /api/health`
- `GET /api/tasks`
- `POST /api/tasks` body `{"title":"..."}`
- `PATCH /api/tasks/:id` toggles done
- `DELETE /api/tasks/:id`

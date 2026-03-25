# Publishing a Clean Public Version

This repository is private and may contain secrets (e.g., `.env`).
When publishing to the public repository, we create a **clean snapshot with no commit history** so secrets from previous commits are not exposed.

Public repository:
https://github.com/M-Hasaam/FinanceTracker-public

---

# Step 0 — (First time on a new computer)

If the public repository remote is not configured yet, add it:

```bash
git remote add publicrepo https://github.com/M-Hasaam/FinanceTracker-public.git
```

Verify:

```bash
git remote -v
```

You should see:

```
origin      git@github.com:M-Hasaam/FinanceTracker.git
publicrepo  https://github.com/M-Hasaam/FinanceTracker-public.git
```

This step only needs to be done **once per machine**.

---

# Step 1 — Create a temporary public branch

Create a branch from the current development branch (usually `dev`).

```bash
git checkout -b public
```

---

# Step 2 — Remove sensitive files

Remove secrets and private resources.

Typical changes:

* Delete `.env`
* Ensure `.env` is ignored in `.gitignore`
* Keep `.env.example`
* Update `README.md` for public usage
* Remove private documentation if necessary

Stage changes:

```bash
git add -A
```

Commit:

```bash
git commit -m "Prepare public version (remove env, apply security changes)"
```

---

# Step 3 — Create a clean history branch

Create an orphan branch so the public repository **does not contain previous commits**.

```bash
git checkout --orphan public-clean
```

---

# Step 4 — Clear the working tree

Remove everything from the index.

```bash
git rm -rf .
```

---

# Step 5 — Restore files from the sanitized branch

Bring the cleaned files from the `public` branch.

```bash
git checkout public -- .
```

---

# Step 6 — Create the public release commit

```bash
git add .
git commit -m "Initial public release"
```

This produces **a single clean commit with no secret history**.

---

# Step 7 — Push to the public repository

Force update the `main` branch of the public repo.

```bash
git push -f publicrepo public-clean:main
```

---

# Step 8 — Clean up temporary branches

Return to the development branch:

```bash
git checkout dev
```

Delete temporary branches:

```bash
git branch -D public
git branch -D public-clean
```

---

# Final Result

Private repository:

```
dev
main
```

Public repository:

```
main  → clean snapshot (no history, no secrets)
```

---

# Important Notes

* `.env` must **never be committed**.
* Only `.env.example` should be public.
* The public repository always contains **a clean snapshot**, not the full development history.
* This process avoids GitHub secret scanning push protection.

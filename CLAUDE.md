# KH Chauffeurs website

Static multi-page site (plain HTML, CSS, JS). Styles: `styles.css` (base) and `premium.css` (overrides). Fleet data: `data.js`.

Link every CSS/JS file with `?v=dev` (e.g. `<script src="script.js?v=dev">`). The deploy workflow replaces `dev` with the commit ID so Hostinger's CDN and browsers never serve stale CSS/JS.

## Git workflow (required)

- **Never work on `main`.** Before making any code change, create a new branch from an up-to-date `main` (or continue on the current task's branch if one is already in progress).
- **Branch names start with the author's name:** `kinza/<short-description>`, e.g. `kinza/fleet-redesign`.
- Commit as you go, but **only push when Kinza says the work is done.**
- After pushing, **open a pull request** into `main` with `gh pr create`. Make the PR title and description say the change is by Kinza and include the branch name, so the team knows who made it.
- **Never merge** a PR or push to `main`. Merging is left to the team.
- **Never commit or push the `.claude/` folder** (local skills and agents). It is excluded in `.git/info/exclude`; don't `git add` it by path or with `-f`.

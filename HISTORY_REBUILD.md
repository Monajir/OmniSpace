# Rebuild a 49-commit history

`rebuild-history.ps1` groups the current OmniSpace source snapshot into exactly
49 non-empty commits on `main`. Both author and committer timestamps run from
**9 December 2025** to **23 January 2026**, Bangladesh time (`+06:00`).
Times are randomized between 09:00 and 23:00, including minutes and seconds,
and remain in chronological order. There is one commit per day and a second
commit on 20 December, 5 January, and 17 January. Each invocation generates
fresh times, so preview times will differ from a later rebuild. Author and
committer timestamps match for each commit.

This is a reconstructed timeline, not recovery of the original development
history. Each file enters once with its current contents. Intermediate commits
are feature groupings and are not guaranteed to build independently. File
contents, dependency versions, and dates inside documents are preserved.

## Preview safely

From the `omnispace` directory, with Git installed:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\rebuild-history.ps1 -Preview
```

The preview lists every included file, commit message, and timestamp. It works
while the original `.git` exists and does not modify it.

## Create the history

Back up the original repository first. `.git` is normally a hidden **directory**;
removing it discards local history, branches, tags, remote settings, and any
repository-local author identity. A worktree may instead have a `.git` file.
The script will never delete or overwrite either form.

After you have removed `.git` from this project's directory, run:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\rebuild-history.ps1 -AuthorName "Your Name" -AuthorEmail "you@example.com"
```

Use your own Git identity. If global `user.name` and `user.email` are configured,
the two parameters can be omitted. The same identity is used for every author
and committer. The script always targets the directory containing itself, even
when invoked from elsewhere.

The script constructs the repository in temporary storage and installs `.git`
only after verifying all 49 commits, both sets of timestamps, file coverage,
file hashes, repository integrity, and a clean working tree. On failure it cleans
its temporary storage and leaves the project's existing files intact. No remote
is configured or contacted. Existing remote history is not changed.

## Included files and grouping

The plan covers the Spring Boot application, React interface, dependencies,
seven Flyway migrations, seed data, Docker configuration, backend and frontend
tests, diagrams, and documentation. The reconstruction script and this guide
belong to the final documentation commit.

The project's `.gitignore` rules are respected. They currently exclude `docs/`
and `scripts/`, as well as backups, build output, dependencies, and logs. Those
files stay on disk and are not added to the new history. Local `.env` files are
also excluded; `.env.example` is included. Global ignore rules are bypassed
during construction so the result depends on the project's own rules.

Every eligible file must match an explicit commit group and all 49 groups must
be non-empty. If files are added or removed later, use `-Preview` and adjust the
`$plan` mappings in the script as needed. Unmapped files cause an error rather
than being silently omitted or swept into an unrelated commit.

## Verify after running

```powershell
git rev-list --count HEAD
git log --reverse --format="%h %aI %cI %s"
git status --short
```

The first command should print `49`; the final command should print nothing.
The log shows the author date followed by the committer date for every commit.

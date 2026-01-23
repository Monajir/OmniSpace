#requires -Version 5.1
<#
.SYNOPSIS
Reconstructs 49 non-empty commits from the current OmniSpace files.
.DESCRIPTION
Author and committer dates span 2025-12-09 through 2026-01-23 (+06:00).
This groups today's snapshot by feature; it does not recover past file versions.
Existing .git metadata is never deleted or overwritten. No remote is contacted.
.EXAMPLE
.\rebuild-history.ps1 -Preview
.EXAMPLE
.\rebuild-history.ps1 -AuthorName 'Your Name' -AuthorEmail 'you@example.com'
#>
[CmdletBinding()]
param(
    [string]$AuthorName,
    [string]$AuthorEmail,
    [switch]$Preview
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
$projectRoot = [IO.Path]::GetFullPath($PSScriptRoot)
$destinationGit = Join-Path $projectRoot '.git'
if (-not (Get-Command git -ErrorAction SilentlyContinue)) { throw 'Install Git and make it available on PATH first.' }
if (-not $Preview -and (Test-Path -LiteralPath $destinationGit)) {
    throw 'This project already has .git metadata. Use -Preview, or back up and remove .git yourself before rebuilding.'
}
foreach ($required in @('backend/pom.xml', 'frontend/package.json', '.gitignore')) {
    if (-not (Test-Path -LiteralPath (Join-Path $projectRoot $required) -PathType Leaf)) {
        throw "Expected OmniSpace project file is missing: $required"
    }
}

# Always use the script's directory, independent of the caller's working directory.
# Construct and verify Git metadata separately, then install it only on success.
$temporaryRoot = Join-Path ([IO.Path]::GetTempPath()) ('omnispace-history-' + [guid]::NewGuid().ToString('N'))
$temporaryRoot = [IO.Path]::GetFullPath($temporaryRoot)
$temporaryGit = Join-Path $temporaryRoot 'repository.git'
$savedGitEnvironment = @{}
Get-ChildItem Env:GIT_* | ForEach-Object { $savedGitEnvironment[$_.Name] = $_.Value }

function Invoke-HistoryGit {
    param([Parameter(Mandatory = $true)][string[]]$GitArguments)
    $result = & git --git-dir=$temporaryGit --work-tree=$projectRoot @GitArguments
    if ($LASTEXITCODE -ne 0) { throw "Git failed (exit $LASTEXITCODE): $($GitArguments -join ' ')" }
    $result
}

function New-Group {
    param([string]$Message, [string[]]$Patterns)
    [pscustomobject]@{ Message = $Message; Patterns = $Patterns; Files = @(); Date = '' }
}

$java = 'backend/src/main/java/com/bookingapp'
$tests = 'backend/src/test/java/com/bookingapp'
$migrations = 'backend/src/main/resources/db/migration'
$ui = 'frontend/src/components'
$routes = 'frontend/src/routes'

# First matching group owns a file; all 49 groups must contain real changes.
$plan = @(
    New-Group 'Set up repository rules and code formatting' @('.gitignore', 'frontend/.gitignore', 'frontend/.prettierignore', 'frontend/.prettierrc')
    New-Group 'Set up the Spring Boot backend' @('backend/pom.xml', "$java/BookingAppApplication.java", 'backend/src/main/resources/application.yml')
    New-Group 'Configured React, TypeScript and Vite' @('frontend/package.json', 'frontend/vite.config.ts', 'frontend/tsconfig.json', 'frontend/eslint.config.js', 'frontend/components.json', 'frontend/bunfig.toml')
    New-Group 'Added the frontend dependency lockfile' @('frontend/package-lock.json')
    New-Group 'Added the frontend server and public assets' @('frontend/server.mjs', 'frontend/src/server.ts', 'frontend/src/start.ts', 'frontend/public/*')
    New-Group 'Added Docker setup and example environment settings' @('docker-compose.yml', 'backend/Dockerfile', 'frontend/Dockerfile', 'frontend/.dockerignore', '.env.example')
    New-Group 'Created the initial booking database schema' @("$migrations/V1__init_schema.sql")
    New-Group 'Added personal schedules, time slots and cohort batches' @("$migrations/V2__personal_schedule_and_slots.sql", "$migrations/V3__add_cohort_batch.sql")
    New-Group 'Added shared error handling' @("$java/common/exception/*")
    New-Group 'Configured caching, web access and API documentation' @("$java/config/CacheConfig.java", "$java/config/WebConfig.java", "$java/config/OpenApiConfig.java")
    New-Group 'Added user models and roles' @("$java/user/User.java", "$java/user/UserRole.java", "$java/user/UserRepository.java", "$java/user/dto/*")
    New-Group 'Added academic profile models' @("$java/profile/Profile.java", "$java/profile/ProfileRepository.java", "$java/profile/dto/*")
    New-Group 'Added JWT authentication and access controls' @("$java/security/*", "$java/config/SecurityConfig.java", "$java/common/util/*")
    New-Group 'Implemented registration, login and token refresh' @("$java/auth/*")
    New-Group 'Implemented user and profile administration' @("$java/user/UserService.java", "$java/user/UserController.java", "$java/profile/ProfileService.java", "$java/profile/ProfileController.java")
    New-Group 'Added tests for authentication, users and profiles' @("$tests/auth/*", "$tests/security/*", "$tests/user/*", "$tests/profile/*")
    New-Group 'Added classroom models and teaching slots' @("$java/classroom/Classroom.java", "$java/classroom/ClassroomRepository.java", "$java/classroom/ClassroomStatus.java", "$java/classroom/ClassroomTimeSlot.java", "$java/classroom/dto/*")
    New-Group 'Implemented classroom management and slot validation' @("$java/classroom/ClassroomService.java", "$java/classroom/ClassroomController.java", "$java/classroom/ClassroomSlotValidator.java")
    New-Group 'Added tests for classrooms and slot validation' @("$tests/classroom/*")
    New-Group 'Implemented resource management and availability' @("$java/resource/*")
    New-Group 'Added tests for resource management' @("$tests/resource/*")
    New-Group 'Implemented academic term management and tests' @("$java/academicterm/*", "$migrations/V4__add_academic_terms.sql", "$tests/academicterm/*")
    New-Group 'Added routine models and scheduling details' @("$java/routine/Routine.java", "$java/routine/RoutineRepository.java", "$java/routine/RoutineDayOfWeek.java", "$java/routine/dto/*")
    New-Group 'Implemented routine scheduling and tests' @("$java/routine/RoutineService.java", "$java/routine/RoutineController.java", "$tests/routine/*")
    New-Group 'Added booking models and statuses' @("$java/booking/Booking.java", "$java/booking/BookingRepository.java", "$java/booking/BookingStatus.java", "$java/booking/BookingType.java", "$java/booking/dto/*")
    New-Group 'Implemented booking and approval workflows' @("$java/booking/BookingService.java", "$java/booking/BookingController.java")
    New-Group 'Added booking tests and saved rejection reasons' @("$tests/booking/*", "$migrations/V7__persist_booking_rejection_reasons.sql")
    New-Group 'Added scheduled cleanup for routines and expired bookings' @("$java/scheduler/*")
    New-Group 'Added issue report models and statuses' @("$java/issue/IssueReport.java", "$java/issue/IssueReportRepository.java", "$java/issue/IssueStatus.java", "$java/issue/dto/*")
    New-Group 'Implemented issue inspection and tests' @("$java/issue/IssueService.java", "$java/issue/IssueController.java", "$migrations/V6__add_issue_inspection_workflow.sql", "$tests/issue/*")
    New-Group 'Added database changes for authentication security' @("$migrations/V5__harden_authentication.sql")
    New-Group 'Added tests for configuration, relationships and locking' @("$tests/config/*")
    New-Group 'Added PostgreSQL integration and concurrency tests' @("$tests/Phase5PostgresIntegrationTest.java")
    New-Group 'Added shared frontend types and API client' @('frontend/src/types/*', 'frontend/src/services/*')
    New-Group 'Added application state and error handling' @('frontend/src/lib/app-store.tsx', 'frontend/src/lib/error-capture.ts', 'frontend/src/lib/error-page.ts')
    New-Group 'Added reusable interface components' @("$ui/ui/*")
    New-Group 'Added shared styles and responsive layout helpers' @('frontend/src/styles.css', 'frontend/src/lib/utils.ts', 'frontend/src/hooks/*', "$ui/common/*")
    New-Group 'Added login and registration screens' @("$ui/auth/*", "$routes/login.tsx", "$routes/register.tsx")
    New-Group 'Added classroom management screens' @("$ui/classrooms/*", "$routes/classrooms.tsx")
    New-Group 'Added resource management screens' @("$ui/resources/*", "$routes/resources.tsx")
    New-Group 'Added routine and academic term management screens' @("$ui/routines/*", "$routes/routines.tsx")
    New-Group 'Added the weekly calendar and time slot helpers' @("$ui/calendar/*", 'frontend/src/utils/*', "$routes/calendar.tsx")
    New-Group 'Added booking forms, lists and approval queue' @("$ui/bookings/*", "$ui/approvals/*", "$routes/bookings.tsx", "$routes/approvals.tsx")
    New-Group 'Added issue reporting and maintenance screens' @("$ui/issues/*", "$routes/issues.tsx")
    New-Group 'Added user roles and profile settings screens' @("$ui/users/*", "$ui/profile/*", "$routes/users.tsx", "$routes/profile.tsx")
    New-Group 'Connected dashboards, navigation and routes' @("$ui/dashboard/*", "$ui/layout/*", 'frontend/src/router.tsx', 'frontend/src/routeTree.gen.ts', "$routes/__root.tsx", "$routes/index.tsx")
    New-Group 'Added frontend tests for API calls, navigation, profiles and bookings' @('frontend/vitest.config.ts', 'frontend/src/test/*')
    New-Group 'Added administrator and demo data' @('seed-admin.sql', 'demo-data.sql')
    New-Group 'Documented the architecture, user flows and history rebuild process' @('README.md', 'ERD.md', 'USER_FLOWS.md', 'frontend/README.md', "$routes/README.md", 'rebuild-history.ps1', 'HISTORY_REBUILD.md')
)

try {
    # Isolate Git's environment so an inherited index/date/repository cannot leak in.
    foreach ($key in $savedGitEnvironment.Keys) { Remove-Item -LiteralPath "Env:$key" }
    New-Item -ItemType Directory -Path $temporaryRoot | Out-Null
    $emptyTemplates = Join-Path $temporaryRoot 'empty-templates'
    New-Item -ItemType Directory -Path $emptyTemplates | Out-Null
    Invoke-HistoryGit @('init', '--quiet', '--initial-branch=main', "--template=$emptyTemplates") | Out-Null
    Invoke-HistoryGit @('config', 'core.autocrlf', 'false') | Out-Null
    Invoke-HistoryGit @('config', 'core.safecrlf', 'false') | Out-Null
    Invoke-HistoryGit @('config', 'commit.gpgsign', 'false') | Out-Null
    Invoke-HistoryGit @('config', 'core.hooksPath', $emptyTemplates) | Out-Null
    $emptyIgnore = Join-Path $temporaryRoot 'empty-ignore'
    [IO.File]::WriteAllText($emptyIgnore, '')
    Invoke-HistoryGit @('config', 'core.excludesFile', $emptyIgnore) | Out-Null
    # Keep local environment secrets and any existing Git metadata out of preview.
    # Project .gitignore rules remain authoritative for build output/docs/scripts.
    New-Item -ItemType Directory -Path (Join-Path $temporaryGit 'info') -Force | Out-Null
    [IO.File]::WriteAllLines((Join-Path $temporaryGit 'info/exclude'), @('.git', '.env', '.env.*', '!.env.example'))

    if ($plan.Count -ne 49) { throw "Expected 49 groups, found $($plan.Count)." }
    $files = @(Invoke-HistoryGit @('-c', 'core.quotePath=false', 'ls-files', '--others', '--exclude-standard') | Sort-Object)
    $unassigned = New-Object 'System.Collections.Generic.List[string]'
    foreach ($file in $files) {
        $owner = $null
        foreach ($group in $plan) {
            foreach ($pattern in $group.Patterns) {
                if ($file -like $pattern) { $owner = $group; break }
            }
            if ($null -ne $owner) { break }
        }
        if ($null -eq $owner) { $unassigned.Add($file) } else { $owner.Files += $file }
    }
    if ($unassigned.Count -gt 0) {
        throw "Files have no commit group. Add them to the plan or .gitignore before rebuilding:`n$($unassigned -join "`n")"
    }

    # 46 calendar days, with a second commit on Dec 20, Jan 5, and Jan 17.
    # Choose fresh times between 09:00 and 23:00 on each run, ordered within each day.
    # Explicit offset makes the timeline independent of the machine's time zone.
    $dates = New-Object 'System.Collections.Generic.List[string]'
    $firstDay = [datetime]::ParseExact('2025-12-09', 'yyyy-MM-dd', [Globalization.CultureInfo]::InvariantCulture)
    for ($day = 0; $day -lt 46; $day++) {
        $date = $firstDay.AddDays($day).ToString('yyyy-MM-dd', [Globalization.CultureInfo]::InvariantCulture)
        $dailyCount = if ($date -in @('2025-12-20', '2026-01-05', '2026-01-17')) { 2 } else { 1 }
        $seconds = @()
        while ($seconds.Count -lt $dailyCount) {
            $candidate = Get-Random -Minimum (9 * 60 * 60) -Maximum (23 * 60 * 60)
            if ($seconds -notcontains $candidate) { $seconds += $candidate }
        }
        foreach ($second in ($seconds | Sort-Object)) {
            $time = $firstDay.AddDays($day).AddSeconds($second).ToString('HH:mm:ss', [Globalization.CultureInfo]::InvariantCulture)
            $dates.Add("${date}T${time}+06:00")
        }
    }
    for ($i = 0; $i -lt $plan.Count; $i++) {
        if ($plan[$i].Files.Count -eq 0) { throw "Commit $($i + 1) has no files: $($plan[$i].Message)" }
        $plan[$i].Date = $dates[$i]
    }
    if ($Preview) {
        for ($i = 0; $i -lt $plan.Count; $i++) {
            Write-Output ('{0:D2} | {1} | {2} files | {3}' -f ($i + 1), $plan[$i].Date, $plan[$i].Files.Count, $plan[$i].Message)
            foreach ($file in $plan[$i].Files) { Write-Output "    $file" }
        }
        Write-Output "Preview: 49 non-empty commits, $($files.Count) files, 2025-12-09 to 2026-01-23 (+06:00). No project files or existing Git metadata changed."
        return
    }

    if ([string]::IsNullOrWhiteSpace($AuthorName)) {
        $AuthorName = & git config --get user.name
        if ($LASTEXITCODE -ne 0) { $AuthorName = '' }
    }
    if ([string]::IsNullOrWhiteSpace($AuthorEmail)) {
        $AuthorEmail = & git config --get user.email
        if ($LASTEXITCODE -ne 0) { $AuthorEmail = '' }
    }
    if ([string]::IsNullOrWhiteSpace($AuthorName) -or [string]::IsNullOrWhiteSpace($AuthorEmail)) {
        throw 'Supply -AuthorName and -AuthorEmail, or configure a global Git user.name and user.email.'
    }
    if ($AuthorName -match '[\r\n<>]' -or $AuthorEmail -match '[\s<>]' -or $AuthorEmail -notmatch '.+@.+') {
        throw 'Use a non-empty author name and a valid email address without line breaks or angle brackets.'
    }
    Invoke-HistoryGit @('config', 'user.name', $AuthorName) | Out-Null
    Invoke-HistoryGit @('config', 'user.email', $AuthorEmail) | Out-Null
    $env:GIT_AUTHOR_NAME = $AuthorName
    $env:GIT_AUTHOR_EMAIL = $AuthorEmail
    $env:GIT_COMMITTER_NAME = $AuthorName
    $env:GIT_COMMITTER_EMAIL = $AuthorEmail

    # Hash every included file before/after: the script only creates Git metadata.
    $before = @{}
    foreach ($file in $files) { $before[$file] = (Get-FileHash -LiteralPath (Join-Path $projectRoot $file) -Algorithm SHA256).Hash }
    for ($i = 0; $i -lt $plan.Count; $i++) {
        $group = $plan[$i]
        Invoke-HistoryGit (@('--literal-pathspecs', 'add', '--') + $group.Files) | Out-Null
        $staged = @(Invoke-HistoryGit @('diff', '--cached', '--name-only'))
        if ($staged.Count -eq 0) { throw "Refusing an empty commit: $($group.Message)" }
        $env:GIT_AUTHOR_DATE = $group.Date
        $env:GIT_COMMITTER_DATE = $group.Date
        Invoke-HistoryGit @('commit', '--quiet', '--no-gpg-sign', '-m', $group.Message) | Out-Null
        Write-Host ('[{0:D2}/49] {1} {2}' -f ($i + 1), $group.Date, $group.Message)
    }

    $count = Invoke-HistoryGit @('rev-list', '--count', 'HEAD')
    if ([int]$count -ne 49) { throw "Expected 49 commits; found $count." }
    $actualDates = @(Invoke-HistoryGit @('log', '--reverse', '--format=%aI|%cI'))
    for ($i = 0; $i -lt 49; $i++) {
        if ($actualDates[$i] -ne ($dates[$i] + '|' + $dates[$i])) { throw "Date verification failed for commit $($i + 1)." }
    }
    $tracked = @(Invoke-HistoryGit @('-c', 'core.quotePath=false', 'ls-files') | Sort-Object)
    if (@(Compare-Object $files $tracked).Count -ne 0) { throw 'Final tracked file list differs from the plan.' }
    if (@(Invoke-HistoryGit @('status', '--porcelain')).Count -ne 0) { throw 'Final working tree is not clean.' }
    foreach ($file in $files) {
        if ($before[$file] -ne (Get-FileHash -LiteralPath (Join-Path $projectRoot $file) -Algorithm SHA256).Hash) {
            throw "File changed during reconstruction: $file. No history has been installed."
        }
    }
    Invoke-HistoryGit @('fsck', '--full', '--no-dangling') | Out-Null
    # Remove temporary-only settings before moving the completed repository.
    Invoke-HistoryGit @('config', '--unset', 'core.hooksPath') | Out-Null
    Invoke-HistoryGit @('config', '--unset', 'core.excludesFile') | Out-Null
    if (Test-Path -LiteralPath $destinationGit) { throw '.git appeared during reconstruction; refusing to overwrite it.' }
    # Validate both absolute move targets before moving the metadata directory.
    if ([IO.Path]::GetFullPath($temporaryGit) -ne (Join-Path $temporaryRoot 'repository.git') -or
        [IO.Path]::GetFullPath($destinationGit) -ne (Join-Path $projectRoot '.git')) {
        throw 'Unexpected Git metadata location.'
    }
    Move-Item -LiteralPath $temporaryGit -Destination $destinationGit
    Write-Host "Created and verified 49 commits on main for $AuthorName <$AuthorEmail>."
    Write-Host 'Dates: 2025-12-09 to 2026-01-23 (+06:00). Project files preserved. No remote configured or pushed.'
}
finally {
    Get-ChildItem Env:GIT_* | ForEach-Object { Remove-Item -LiteralPath ('Env:' + $_.Name) }
    foreach ($key in $savedGitEnvironment.Keys) { [Environment]::SetEnvironmentVariable($key, $savedGitEnvironment[$key], 'Process') }
    # Delete only this invocation's unique temporary directory, never project data.
    $tempParent = [IO.Path]::GetFullPath([IO.Path]::GetTempPath()).TrimEnd([IO.Path]::DirectorySeparatorChar)
    if ((Split-Path -Parent $temporaryRoot) -eq $tempParent -and
        (Split-Path -Leaf $temporaryRoot) -match '^omnispace-history-[0-9a-f]{32}$' -and
        (Test-Path -LiteralPath $temporaryRoot)) {
        Remove-Item -LiteralPath $temporaryRoot -Recurse -Force
    }
}

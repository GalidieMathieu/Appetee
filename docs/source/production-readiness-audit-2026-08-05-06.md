# Appetee Production Readiness Audit

Audit date: 2026-08-05–06 (America/Denver)  
Audit type: read-only source, local build, local integration-test, dependency, and delivery review  
Overall rating: **Not production ready**

## 1. Executive summary

Appetee is **not production ready**. The current worktree contains a realistic unauthenticated account-management vulnerability: anonymous callers can list users, retrieve user profiles, update any user ID, and delete any user ID. Because deletion cascades through user-owned relational data, SEC-001 meets the supplied Critical definition for destructive data modification and material personal-data exposure.

The next most serious confirmed problems are:

- every signed-in user is treated as an administrator by the API;
- sign-up and login request records, including passwords, are written to the server console;
- upload endpoints accept arbitrary bytes, relabel them as AVIF, and store them without explicit application-specific size, signature, decode, dimension, metadata, or malware controls;
- cross-origin cookie authentication uses SameSite=None and credentialed CORS without an antiforgery mechanism, leaving simple multipart administrative mutations exposed to CSRF;
- login and registration have no rate limiting, lockout, or meaningful server-side password policy;
- the production npm tree has known high-severity advisories;
- the database has destructive rebuild/seed scripts but no versioned production migration path;
- nutrition and cost values are calculated in the browser and accepted as authoritative by the API;
- pushes to deployment branches can go directly to production without a backend test gate, protected environment, staging/slot validation, health gate, migration gate, or automated rollback.

The most serious architectural risks are weak module boundaries, application-layer coupling to ASP.NET types, large query classes that mix persistence and Blob orchestration, an unversioned and drifting frontend/backend contract, and a data model that lacks the provenance, units, pricing history, ownership, workflow, and audit concepts needed for planned features.

The most serious reliability risks are non-atomic MySQL/Blob updates, a current-worktree exception-pipeline regression that makes 11 expected 4xx tests return 500, unbounded catalogue reads, a frontend startup initializer that can wait indefinitely, no health/readiness surface, and no repository evidence of coordinated backup/restore drills, telemetry, alerts, or incident procedures.

Major unknowns are the live Azure configuration: Key Vault references, managed-identity RBAC, network access, database TLS and least privilege, Blob public access, App Service slot and health settings, durable Data Protection keys, backups/PITR, restore tests, monitoring, alerts, DNS, certificates, access reviews, and branch/environment protection. These are **unable to verify**, not presumed secure or insecure.

Recommended decision: do not expose Appetee to additional users. Run a containment sprint that first closes SEC-001 through SEC-006, removes credential logging, prevents untrusted uploads, patches production dependencies, replaces destructive schema deployment, moves authoritative calculations server-side, and establishes a gated staging-to-production release path.

Finding count: **34 total — 1 Critical, 7 High, 21 Medium, 5 Low, 0 Informational.**

## 2. Scope and limitations

### Repository snapshot

The workspace contains two sibling Git repositories and no root Git repository:

| Area | Branch | Audited commit | Worktree state at start |
|---|---|---|---|
| Backend | master | 4782206525871a02e1e73aefc643279265c195a0 | 29 pre-existing status entries |
| Frontend | main | bee4a89a53bafada868873b94ebd886eda8ebd6e | 55 pre-existing status entries |

The audit reviewed the **current worktrees**, including the user's uncommitted changes. Where behavior differs from committed HEAD, the report says so. The existing changes were preserved. The only intentional persistent report/source artifact is this report; builds produced normal ignored outputs and tests reset only the dedicated local test database. Repository status counts remained unchanged.

### Areas reviewed

- Backend projects: Appetee.Api, Appetee.Application, Appetee.Infrastructure, and Appetee.Api.Tests.
- All controllers, middleware configuration, authentication/cookie logic, services, DTOs, request models, Dapper repositories/queries/SQL, Blob client code, configuration files, schema/seed SQL, tests, README, product documentation, and backend workflow.
- Angular application routes, guards, interceptors, stores/facades, forms, templates, styles, feature code, environments, Node static host, tests, package manifests/lockfile, Angular configuration, README, and frontend workflow.
- Authentication, authorization, CSRF/CORS, injection, validation, uploads, secrets, privacy, data integrity, architecture, reliability, observability, performance, testing, dependencies, and deployment assumptions.
- All 24 active controller routes. Commented methods in AuthController.cs:57-86 were not treated as endpoints.

### Standards basis

The review applied the repository evidence to the current [OWASP Top 10:2025](https://owasp.org/Top10/), [OWASP API Security Top 10:2023](https://owasp.org/API-Security/editions/2023/en/0x11-t10/), [OWASP Web Security Testing Guide](https://owasp.org/www-project-web-security-testing-guide/), [ASP.NET Core antiforgery guidance](https://learn.microsoft.com/en-us/aspnet/core/security/anti-request-forgery?view=aspnetcore-10.0), [ASP.NET Core file-upload guidance](https://learn.microsoft.com/en-us/aspnet/core/mvc/models/file-uploads?view=aspnetcore-10.0), [ASP.NET Core rate-limiting guidance](https://learn.microsoft.com/en-us/aspnet/core/performance/rate-limit?view=aspnetcore-10.0), [ASP.NET Core health-check guidance](https://learn.microsoft.com/en-us/aspnet/core/host-and-deploy/health-checks?view=aspnetcore-10.0), [Angular security guidance](https://angular.dev/best-practices/security), [GitHub Actions secure-use guidance](https://docs.github.com/en/actions/reference/security/secure-use), [Azure MySQL backup/restore guidance](https://learn.microsoft.com/en-us/azure/mysql/flexible-server/concepts-backup-restore), and [Azure App Service managed-identity guidance](https://learn.microsoft.com/en-us/azure/app-service/overview-managed-identity).

### Commands executed

| Command | Purpose | Result and important warnings | Interpretation |
|---|---|---|---|
| node --version; npm --version; npm ls --depth=0 | Runtime and installed dependency inventory | Pass; Node 24.13.0, npm 11.7.0 | Installed top-level tree resolved |
| npm run build | Angular production build | Pass; initial 318.45 kB raw / 89.55 kB transfer; admin-recipes.page.scss 7.12 kB exceeds 4 kB warning budget, below 8 kB error | Code passes build; warning is a repository quality issue |
| npm run test -- --watch=false | Frontend unit/component tests | Pass outside sandbox: 6 files, 18 passed, 1 skipped | Initial sandbox traversal failure was environmental; rerun proves suite result |
| npx --no-install tsc --noEmit -p tsconfig.app.json | Application type check | Pass | No TypeScript application errors |
| npx --no-install tsc --noEmit -p tsconfig.spec.json | Test type check | Pass | No TypeScript spec errors |
| npm run lint | Lint | Fail: no lint script; npm log-directory warning in sandbox | Repository capability gap |
| npm audit --omit=dev --json | Production dependency advisories | Exit 1 because 9 nodes were vulnerable: 7 High, 1 Moderate, 1 Low | Code/dependency finding; no production Critical |
| npm audit --json | Full dependency advisories | Exit 1 because 36 nodes were vulnerable: 2 Critical, 21 High, 10 Moderate, 3 Low | Critical nodes are development/build-chain dependencies |
| npm outdated --json | Update inventory | Exit 1 is npm's expected result when packages are outdated | Angular patches, Vitest 4.1.10, and other updates available |
| npm lockfile inspection | Integrity/reproducibility review | Pass; lockfile v3, 577 package entries, integrity on resolved artifacts, no non-registry resolution; install scripts declared by @parcel/watcher, esbuild, fsevents, lmdb, and msgpackr-extract | Positive baseline; scripts still require review |
| dotnet --info | SDK/runtime inventory | Pass; SDK 10.0.302, runtime 10.0.10; no global.json | CI SDK is not repository-pinned |
| dotnet build Appetee.sln -c Release --no-restore | Backend Release build | Pass; 0 warnings, 0 errors | Build succeeds |
| dotnet test tests/Appetee.Api.Tests/Appetee.Api.Tests.csproj -c Release --no-build --no-restore | Backend integration tests | Fail; 28 passed, 11 failed, 0 skipped; every failure expected 4xx and received 500 | Current-worktree code regression, not an environment limitation |
| dotnet format Appetee.sln --verify-no-changes --no-restore | Formatting check | Fail; 37 whitespace diagnostics plus workspace-loading warnings | Repository quality-gate gap |
| dotnet list Appetee.sln package --vulnerable --include-transitive --no-restore | NuGet advisory check | Pass outside sandbox; no known vulnerable NuGet package reported | Initial sandbox network failure was environmental; result is point-in-time, not a guarantee |
| dotnet list Appetee.sln package --outdated | NuGet update inventory | Pass with NU1900 restore-source warnings | Direct updates observed: Azure.Identity 1.19→1.21, Azure.Storage.Blobs 12.27→12.29.1, Swashbuckle 6.9→10.2.3, Dapper 2.1.66→2.1.79, MySqlConnector 2.5→2.6.1, ImageSharp 3.1.12→4.0; major updates need migration/regression review |
| dotnet list Appetee.sln package --deprecated --include-transitive --no-restore | NuGet deprecation inventory | Pass; only test dependency xunit 2.9.3 and its xUnit 2 transitives were marked Legacy | Migrate the test project deliberately to xUnit v3; no runtime package was reported deprecated |
| git diff --check | Changed-file whitespace check | Pass in both repositories; many LF-to-CRLF warnings | No diff whitespace errors |
| rg --files / rg -n / Get-Content -Raw / git status, diff, log, rev-parse | Repository mapping, evidence, history and worktree preservation | Pass; two repositories mapped at the commits above; final status counts remained 29 backend and 55 frontend | Read-only inspection; pre-existing worktree changes preserved |
| Scanner availability and redacted heuristic scan | Secret/static analysis availability | gitleaks, TruffleHog, detect-secrets, Semgrep, SonarScanner, and actionlint unavailable; heuristic scan found a tracked local DB credential | Coverage limitation; not equivalent to mature history/static scanning |

Commands that initially failed only because registry, NuGet, or dependency paths were inaccessible in the sandbox were rerun in the authorized local environment. No package or tool was installed. No public application endpoint or Azure resource was probed.

### Limitations

- Azure Portal, GitHub repository settings, DNS, certificates, Key Vault, MySQL, Storage, App Service, monitoring, and production data were not accessed.
- No infrastructure-as-code exists to make most Azure settings reviewable.
- No destructive security or production test was run. The existing integration suite performed its designed destructive reset only against the dedicated local appetee_backend_tests database. No fuzzing, load, browser-automation, malware, external DAST, backup-restore, production migration, concurrency, or fault-injection test was run.
- Secret discovery used repository search and Git history spot checks; mature history-aware scanners were unavailable. Any credential values encountered were redacted.
- npm and NuGet advisory results are point-in-time and depend on upstream databases. Advisory presence does not by itself prove reachability; absence does not prove safety.
- Accessibility observations are source-based. A source-token contrast calculation produced the cited approximate ratio, but no rendered-browser contrast tool, screen-reader, keyboard-only browser, or axe run was performed.
- The worktrees are materially dirty. Some findings, especially REL-001 and the untracked recipe UI, may represent work in progress rather than deployed behavior.
- Source review and passing builds cannot prove the absence of unknown vulnerabilities. Residual risk remains until the recommended adversarial, browser, staging, recovery, and operational checks are completed.

## 3. System overview

### Architecture summary

- **Frontend:** Angular 21 standalone application under appetee_front/src/app. Core contains API/auth/layout/session/shared concerns; features contain landing, authentication, home, recipe administration, and an unregistered recipe-list worktree. The app is built to static files and served by Express from server.js.
- **Backend:** ASP.NET Core API with controllers in Appetee.Api, service/request/DTO abstractions in Appetee.Application, and Dapper/MySQL, cookie, password, and Azure Blob implementations in Appetee.Infrastructure.
- **Data:** MySQL holds users, diets, restrictions, recipes, ingredient nutrition, favorites, and collections. Azure Blob Storage holds recipe/ingredient image bytes; recipe and ingredient rows store Blob names and read paths construct URLs. The user image_url field is a separate client-writable URL.
- **Deployment:** separate frontend and API Azure App Services are assumed, with Azure MySQL Flexible Server, Blob Storage, Key Vault, and GitHub Actions OIDC. The repositories do not define the Azure resources.

~~~mermaid
flowchart LR
    U[User browser] -->|HTTPS: Angular/Express| FE[Frontend App Service]
    FE -->|Static JS, CSS, images| U
    U -->|Cross-origin JSON/FormData\ncredentials include| API[ASP.NET Core API App Service]
    API --> CTL[Controllers]
    CTL --> APP[Application services]
    APP --> DAL[Dapper query/repository classes]
    DAL -->|Parameterized SQL| DB[(Azure MySQL Flexible Server)]
    DAL --> BLOB[Blob storage adapter]
    BLOB -->|DefaultAzureCredential| BS[(Azure Blob Storage)]
    API -. configuration .-> CFG[App Service settings / Key Vault\nnot reviewable]
    GHA[GitHub Actions OIDC] -->|Direct production deploy| FE
    GHA -->|Direct production deploy| API
    U --> EXT[Google Fonts / Unsplash]
~~~

### Main flows and boundaries

1. **Registration:** Angular gathers email, username, password, diet IDs, and restricted ingredient IDs; POST /api/auth/sign-up crosses the browser/API origin boundary; the API hashes the password and inserts relational user/preferences data in a transaction; it then issues the authentication cookie.
2. **Login/session:** POST /api/auth/login verifies the ASP.NET Identity-format hash and signs a persistent 14-day cookie. The browser sends the HttpOnly, Secure, SameSite=None cookie on API-prefix calls. Startup blocks on GET /api/auth/session and then GET /api/users/me.
3. **Catalogue:** public diet/ingredient endpoints and authenticated recipe endpoints read Dapper result sets from MySQL. The current recipe list is global, not owned.
4. **Administration/upload:** the browser computes recipe totals, submits multipart ingredient/recipe requests, and any authenticated principal can reach the controller. The API streams the supplied bytes to Blob Storage, writes rows to MySQL, and performs best-effort cleanup.
5. **User management:** /api/users routes cross directly from any network caller to user queries/repository operations; most have neither authentication nor ownership validation.
6. **Delivery:** a push to main/master builds in GitHub Actions and deploys directly to the production App Service target using OIDC.

Primary trust boundaries are browser-to-frontend host, browser-to-API cross-origin requests, API-to-MySQL, the API DefaultAzureCredential path-to-Blob (live credential selection/RBAC unknown), GitHub-to-Azure deployment federation, and configuration/secret injection from Azure into the API. Personal data includes email, username, password hashes, profile image URL, diet selections, and ingredient restrictions that may reveal allergy-related information.

### Authentication and deployment assumptions

Cookie claims contain user ID and name, not a role or security stamp (AuthCookieService.cs:22-40). Authorization therefore cannot currently distinguish administrators. The API expects exact allowed origins and credentials; production fails configuration validation when core CORS, storage, or database settings are absent (Program.cs:66-85,463-569). Production hostnames are hard-coded/compiled in environment.production.ts:2 and appsettings.Production.json:5-17. Whether Azure overrides them correctly is unknown.

## 4. Attack-surface inventory

| Surface | Access level | Inputs | Sensitive operations | Existing protections | Main risks |
|---|---|---|---|---|---|
| Guest Angular routes / and /auth/* | Public browser | Credentials, diet/restriction selections, route state | Registration and login initiation | Angular escaping, typed forms, guest guard | Guards are UX only; weak max-length/password checks; broken wizard redirect |
| Authenticated Angular /home | Cookie-authenticated UX | UI actions | Catalogue navigation | Auth guard and restored profile | Startup can hang; content is largely placeholder |
| Angular /admin-recipes/create, /create/success/:id, /:id/edit | Any authenticated UI user | Text, numbers, IDs, image file | Create/update catalogue data | Auth guard, form validation | No role concept; client-calculated authoritative totals; unsafe upload assumptions |
| Linked but unwired routes | Any signed-in UI user | Navigation | Header links /recipes, /diet-needs and /profile; unused helper /recipes/create | Wildcard redirect | Broken navigation is hidden by redirect; /admin-recipes/create itself is registered |
| POST /api/auth/sign-up | Anonymous | JSON email, username, password, ID arrays | Account creation, cookie issuance | Password hashing, transaction, duplicate email handling | Plaintext request logging, weak password policy, no throttling/max lengths |
| POST /api/auth/login | Anonymous | JSON email/password | Cookie issuance | Generic invalid-credential message, salted hash | Plaintext request logging, enumeration timing, credential stuffing |
| POST /api/auth/logout | Anonymous metadata; cookie affects result | Cookie | Sign-out | HttpOnly/Secure cookie | CSRF logout; no server-side session revocation |
| GET /api/auth/session | Manual cookie-principal check | Cookie | Session disclosure | Requires authenticated principal in action | No endpoint auth metadata, DB/security-stamp validation, or no-store |
| /api/users/{id}, /api/users | Anonymous | Route ID, pagination, update JSON | Read/list/update/delete users | Parameterized SQL; list cap 100 | Critical IDOR/BOLA, personal-data exposure, arbitrary cascading deletion |
| /api/users/exists-by-email | Anonymous | Email query | Account existence check | Parameterized SQL | Exact enumeration and abuse |
| GET /api/users/me | Authenticated | Cookie claims | Current profile read | Claim-derived ID plus DB lookup | Data still lacks explicit no-store; only route with sound current-user binding |
| GET /api/diets, /api/ingredients | Public | None | Catalogue read | Parameterized SQL | Unbounded ingredient response; documentation/auth mismatch |
| GET /api/recipes and /{id} | Authenticated | Route ID | Global recipe read | Controller Authorize, parameterized SQL | Unbounded list, over-fetching, no versioning |
| /api/recipes/meal-preps* | Authenticated | IDs/bodies | Future meal-planning CRUD | Controller Authorize | Five public contracts return 501; no ownership model |
| /api/admin/ingredient-details* | Any authenticated account | IDs, multipart fields/file | Read/create ingredient detail | Authorize, DB transaction, GUID Blob name | Broken function authorization, CSRF, arbitrary bytes, no explicit application-specific upload/content limits |
| /api/admin/recipe-details* | Any authenticated account | ID, multipart recipe/file | Create/update recipes | Authorize, DB transaction, GUID Blob name | Broken function authorization, CSRF, trusted client totals, partial DB/Blob failures |
| ANY /error | Public | Direct request/error features | Error response/log event | Production ProblemDetails sanitization and trace ID | Direct calls produce/log 500; no method constraint |
| Authentication cookie | Browser/API boundary | Cookie ticket | Ambient authentication | Current/default __Host- name (configuration must preserve prefix rules), Secure, HttpOnly, SameSite=None | CSRF, 14-day persistence, sliding lifetime, no revocation/security stamp |
| CORS middleware | Cross-origin browser | Origin/preflight headers | Allows credentialed API calls | Exact production allowlist; no wildcard credentials | CORS is not CSRF protection; deployment hostname drift |
| Image/Blob path | Any authenticated account through admin routes | Arbitrary stream, asserted file metadata | Store/delete externally hosted bytes | Random GUID name, HTTPS Azure host validation, managed-identity-capable DefaultAzureCredential path; live identity/RBAC unknown | Content spoofing, oversized/polyglot content, public-access unknown, orphaning |
| MySQL access | API process | Dapper parameters, transactions | All persistent data | Parameterization, disposal, FKs/checks/transactions | Excess app privilege unknown, no migration/timeout/concurrency strategy |
| Favorites/collections tables | No active API | Future IDs and mutations | User-specific saved content | Relational FKs/composite keys | No implemented ownership/API tests; future attack surface |
| Express static host | Public internet | URL path | Delivers executable frontend | Hashed Angular assets | No explicit CSP/frame/referrer/nosniff/permissions/cache/compression policy |
| Swagger | Development only | Browser/API input | API discovery/invocation | Development environment guard | Deployment environment must be verified |
| Console/application logs | App operators/log platform | Request/error fields | Operational record | Trace-scoped structured error logs | Auth controller writes password-bearing records; retention/redaction unknown |
| GitHub Actions/Azure OIDC | Push to deployment branches | Repository code/workflow/artifacts | Production deployment | OIDC, job-scoped contents read/id-token write | Mutable action tags, direct production, broad frontend artifact, missing gates |
| npm/NuGet/actions | Build and runtime | Packages/install scripts | Executes dependencies | npm integrity lock; explicit NuGet versions | Known npm advisories, no dependency policy/SBOM/provenance |
| Azure resources | Operators/cloud identities | Settings, network and RBAC controls | Production compute/data/secrets | DefaultAzureCredential-capable code path; required-setting presence, production CORS non-empty, and Blob URI-shape validation | IaC absent; live credential choice/RBAC, DB connectivity/TLS, networking, backups, locks, alerts unknown |
| Third-party fonts/images | Public browser | Browser metadata | External content requests | HTTPS URLs | Privacy, availability, CSP, and performance dependency |
| Health/logging endpoints | None implemented | N/A | Readiness/diagnostics | Trace IDs in errors | No liveness/readiness; static SPA fallback is not a health check |

### Return-data and trust-boundary mapping

This companion table makes the returned data, boundary, and missing control explicit for every inventory row while preserving the required six-column inventory above.

| Surface | Returns | Trust boundary | Missing protection |
|---|---|---|---|
| Guest Angular routes / and /auth/* | Executable SPA/forms and rendered validation; auth APIs return session data separately | Untrusted browser/user input → Angular DOM/API clients | Complete server-aligned caps, working guarded redirect, E2E/accessibility |
| Authenticated Angular /home | Rendered recipe-card placeholder/catalogue state | Cookie-derived API state → browser memory/DOM | Bounded startup, completed live data/actions |
| Angular /admin-recipes/* | Ingredient detail and created/updated recipe/ingredient DTOs | Untrusted form/file/client totals → privileged API/DB/Blob | Real role policy, antiforgery, canonical media, server calculation |
| Linked but unwired routes | Wildcard redirect, then /home for authenticated users or landing for guests | Navigation state → router/guards | Registered capability/404/deep-link test |
| POST /api/auth/sign-up | AuthResult fields plus Set-Cookie; errors | Anonymous JSON/credential → auth service/MySQL/cookie issuer | Secret-safe logging, strong policy, rate control, bounds |
| POST /api/auth/login | AuthResult plus Set-Cookie or generic error | Anonymous credential → hash verification/cookie issuer | Rate control, timing normalization, secret-safe logging |
| POST /api/auth/logout | 204 and cookie removal | Untrusted origin + ambient cookie → cookie middleware | Antiforgery/origin enforcement and server revocation |
| GET /api/auth/session | User ID/name session DTO or error | Protected cookie ticket → browser | Authorize metadata, active-account/security-stamp check, no-store |
| /api/users/{id}, /api/users | User IDs, usernames, emails and detail preferences; update DTO/204 | Anonymous route/body → personal-data queries/destructive repository | Authentication, field minimization, current-user/ownership policy |
| /api/users/exists-by-email | Exact Boolean/existence result | Anonymous query → account database | Enumeration-resistant behavior and throttling |
| GET /api/users/me | Current UserDto | Validated claim ID → user database → browser | Session revalidation and explicit no-store |
| GET /api/diets, /api/ingredients | Catalogue arrays | Public caller → MySQL → browser | Ingredient pagination/bounds and intended-access documentation |
| GET /api/recipes and /{id} | Global recipe summary/detail DTOs | Authenticated browser → broad Dapper reads | Pagination, stable versioned contract, measured indexes |
| /api/recipes/meal-preps* | 501 response | Authenticated caller → placeholder controller contract | Remove until ownership/data/idempotency design is implemented |
| /api/admin/ingredient-details* | Detail/created DTO | Any cookie principal + multipart/file → MySQL/Blob | Admin policy, CSRF, input/media limits, audit |
| /api/admin/recipe-details* | Created summary/updated detail DTO | Any cookie principal + client-derived multipart → MySQL/Blob | Admin policy, CSRF, authoritative calculation, concurrency |
| ANY /error | Safe production error object with trace ID; direct call is 500 | Exception/internal state → public response/log | Method/internal-only mapping and consistent environment pipeline |
| Authentication cookie | Ambient ticket, not script-readable | API issuer → browser cookie jar → every credentialed API request | Revocation, absolute bound, revalidation, CSRF |
| CORS middleware | Preflight/response access-control headers | Browser Origin → API cross-origin policy | Live-origin validation and separate request-intent/CSRF control |
| Image/Blob path | Media URL/bytes and operation result | Untrusted upload → API stream → Azure data plane → browsers | Private quarantine, decode/re-encode, scan, explicit caps/reconciliation |
| MySQL access | Internal rows/command results and surfaced DTO/errors | API managed process/config credential → database | Live TLS/least privilege/timeouts/pool/retry and migrations |
| Favorites/collections tables | Nothing through an active API | Future user/household IDs → ownership-scoped persistence | Implemented service/policy/API and two-user tests |
| Express static host | index.html, JS/CSS/assets | Public URL/browser → executable document origin | CSP/header/cache/compression/signature policy |
| Swagger | API schema/UI in Development | Development operator/browser → API invocation | Verify environment/production exclusion and protect shared dev |
| Console/application logs | Operational event text and trace context | Application/request fields → App Service/log platform/operators | Credential removal, field allowlist/redaction, retention/access controls |
| GitHub Actions/Azure OIDC | Build/deploy logs, artifact and deployed app | Repository contributors/workflow tokens → Azure control plane | Protected PR/environment, staged gates, minimal attested artifact |
| npm/NuGet/actions | Runtime/build code and metadata | External registries/action publishers → CI/runtime | Patched versions, locked restores, scans, SHA pins, SBOM/provenance |
| Azure resources | Compute/database/blob/secret service responses | App/GitHub/operator identities → Azure control/data planes | IaC/live RBAC/network/TLS/backup/alert/access evidence |
| Third-party fonts/images | Font/image bytes and third-party request metadata | User browser → Google/Unsplash origins | Self-hosting or explicit CSP/privacy/availability/cache decision |
| Health/logging endpoints | No health response; arbitrary frontend GET can return SPA index | Platform/load balancer/operator → application/dependencies | Real separated live/ready endpoints; no public log endpoint |

## 5. Findings summary

| ID | Severity | Confidence | Category | Finding | Affected area | Effort | Timing |
|---|---|---|---|---|---|---|---|
| SEC-001 | Critical | Confirmed | Security | Anonymous callers can read, update, and delete arbitrary users | Users API/data | Medium | Fix immediately |
| SEC-002 | High | Confirmed | Security | Any authenticated user can invoke administrative catalogue operations | Admin API | Medium | Fix immediately |
| SEC-003 | High | Confirmed | Security | Sign-up and login records containing passwords are logged | Auth API/logging | Small | Fix immediately |
| SEC-004 | High | Confirmed | Security | Image uploads accept and relabel unverified arbitrary bytes | Admin API/Blob | Medium | Fix immediately |
| SEC-006 | High | Confirmed | Security | Authentication abuse controls and meaningful server password policy are absent | Auth API | Medium | Fix immediately |
| SEC-007 | High | High | Security | Production npm dependency tree contains known High advisories | Frontend/runtime | Medium | Fix immediately |
| DB-001 | High | Confirmed | Database | Destructive rebuild scripts exist without versioned migrations or rollback | MySQL/deployment | Large | Before production |
| OPS-001 | High | Confirmed | DevOps | Pushes can deploy directly to production without essential release gates | Both workflows | Medium | Before production |
| SEC-005 | Medium | Confirmed | Security | Cookie-authenticated mutations lack CSRF protection | Browser/API boundary | Medium | Fix immediately |
| DB-002 | Medium | Confirmed | Database | Browser-calculated nutrition and cost are stored as authoritative data | Recipe integrity | Large | Before production |
| SEC-008 | Medium | Confirmed | Security | Cookie lifecycle lacks server-side revocation, absolute limits, and revalidation | Authentication | Medium | Before production |
| SEC-009 | Medium | Confirmed | Security | A plaintext development database credential is tracked | Backend configuration/history | Small | Fix immediately |
| REL-001 | Medium | Confirmed | Reliability | Current Development exception pipeline converts expected 4xx paths into 500 | Backend worktree/tests | Small | Fix immediately |
| REL-002 | Medium | Confirmed | Reliability | MySQL and Blob writes are not atomic or reconciled | Recipe/ingredient writes | Large | Before production |
| REL-003 | Medium | Confirmed | Reliability | Health, telemetry, alerting, recovery, and restore readiness are incomplete | Operations | Large | Before production |
| DB-003 | Medium | Confirmed | Database | Concurrency, audit, ownership, and several integrity/index controls are missing | Schema/write paths | Large | Before production |
| BE-001 | Medium | Confirmed | Backend | Boundary validation, request limits, response contracts, and status semantics are inconsistent | API contracts | Medium | Before production |
| FE-001 | Medium | Confirmed | Frontend | Registered routes are incomplete and key signed-in flows are placeholders | Angular UX | Medium | Before production |
| FE-002 | Medium | Confirmed | Frontend | Sign-up navigation and session cache reset behavior can produce incorrect state | Angular auth/stores | Medium | Before production |
| FE-003 | Medium | High | Frontend | Confirmed source-level accessibility barriers affect core flows | Angular templates/styles | Medium | Before production |
| TEST-001 | Medium | Confirmed | Testing | Backend suite is red and existing tests encode broken authorization | Backend tests/CI | Medium | Fix immediately |
| OPS-002 | Medium | Confirmed | DevOps | Builds and artifacts are not fully reproducible, minimal, or supply-chain hardened | CI/dependencies | Medium | Before production |
| PERF-001 | Medium | Confirmed | Performance | Catalogue APIs are unbounded and cold-cache admin edit causes redundant N+1 ingredient calls | API/frontend/data | Medium | Before production |
| REL-004 | Medium | Confirmed | Reliability | Frontend bootstrap can wait indefinitely for session restoration | Angular startup | Small | Before production |
| ARC-001 | Medium | Confirmed | Architecture | Layer boundaries are coupled to HTTP/storage and query classes mix responsibilities | Backend | Large | Later |
| ARC-002 | Medium | Confirmed | Architecture | API contracts are unversioned, hand-copied, and already drifting | Full stack | Large | Before production |
| ARC-003 | Medium | Confirmed | Architecture | Current domain model cannot safely support planned pricing, planning, and multi-user features | Domain/schema | Large | Later |
| PRIV-001 | Medium | Confirmed | Privacy | Data lifecycle, export, deletion verification, and privileged-access operations are undefined | User/preferences data | Large | Before production |
| TEST-002 | Medium | Confirmed | Testing | Security, E2E, migration, resilience, accessibility, performance, and recovery suites are absent | Full stack/operations | Large | Before production |
| SEC-010 | Low | Confirmed | Security | Browser headers and sensitive-response cache controls are incomplete | Frontend host/API | Medium | Before production |
| PERF-002 | Low | Confirmed | Performance | Static asset, external image/font, cache, and compression controls are incomplete | Frontend host | Medium | Soon after production |
| FE-004 | Low | Confirmed | Frontend | Debug residue, subscription cleanup, validation caps, and localization readiness need hardening | Angular | Medium | Soon after production |
| BE-002 | Low | Confirmed | Backend | Naming, dead code, formatting, and quality automation reduce maintainability | Backend | Medium | Soon after production |
| DOC-001 | Low | Confirmed | Documentation | Deployment, test, migration, and operational documentation is stale/incomplete | Both repositories | Medium | Before production |

## 6. Detailed findings

### SEC-001: Anonymous callers can read, update, and delete arbitrary users

- **Severity:** Critical
- **Confidence:** Confirmed
- **Category:** Security
- **Status:** Confirmed vulnerability
- **Affected components:** UsersController, user service/repository/query layer, users and user-owned tables
- **Evidence:** The controller has no class-level Authorize. GET /api/users/{id}, GET /api/users, PUT /api/users/{id}, and DELETE /api/users/{id} have no action authorization or ownership check. Integration tests intentionally call these operations anonymously.
- **File paths and line numbers:** Backend/src/Appetee.Api/Controllers/UsersController.cs:13,24-30,71-78,81-88,91-97; Backend/src/Appetee.Application/Dtos/UserDto.cs:3-9; Backend/src/Appetee.Infrastructure/Users/UserSql.cs:33-50,74-85; Backend/tests/Appetee.Api.Tests/Integration/UsersEndpointsTests.cs:13-23,87-118,142-150
- **Attack or failure scenario:** An unauthenticated caller enumerates IDs, obtains emails/diet/restriction data, changes another user's username/image URL, or deletes the account. Foreign-key cascades then remove related user data.
- **Business impact:** Personal-data exposure, account corruption, destructive data loss, user trust loss, and incident/notification burden.
- **Technical impact:** Broken object-level authorization and unrestricted destructive CRUD over user records.
- **Likelihood:** High as soon as the API is internet reachable; no prerequisite account is needed and IDs are ordinary integers.
- **Existing mitigation:** Dapper parameters prevent SQL injection; GET /api/users is capped at 100 rows; GET /api/users/me correctly derives the current ID from claims.
- **Why the existing mitigation is insufficient:** Parameterization controls query syntax, not who may access an object. A page-size cap neither hides identifiers nor protects mutations.
- **Recommended remediation:** Deny anonymous access by default. Remove general user listing from the consumer API. Replace client-selected IDs with claim-derived current-user commands for profile update/delete. If support administration is needed, require an explicit policy and return a minimal DTO.
- **Example of a safer design:** Map GET/PUT/DELETE /api/users/me to a CurrentUser service that obtains the subject from a validated principal, loads the account, and performs an ownership-scoped update or deletion; place support-only search behind RequireAuthorization("SupportUsers.Read").
- **Validation steps after fixing:** Run anonymous, user A, user B, disabled/deleted-user, and administrator matrices for every user route; assert 401/403/404 without distinguishable leakage; verify relational cascade behavior, client-writable image_url handling, session invalidation, and audit events. No current user-owned Blob object is linked by this flow.
- **Dependencies:** SEC-008 identity revalidation; PRIV-001 deletion/audit rules; TEST-001 security regression suite
- **Estimated effort:** Medium
- **Recommended timing:** Fix immediately

### SEC-002: Any authenticated user can invoke administrative catalogue operations

- **Severity:** High
- **Confidence:** Confirmed
- **Category:** Security
- **Status:** Confirmed vulnerability
- **Affected components:** AdminController, cookie claims, Angular administrative routes/navigation
- **Evidence:** AdminController uses Authorize with its Roles argument commented out. Issued cookies contain ID/name claims but no role. Tests register an ordinary user and successfully call administrative create/update endpoints.
- **File paths and line numbers:** Backend/src/Appetee.Api/Controllers/AdminController.cs:13-14,27-65; Backend/src/Appetee.Infrastructure/Auth/AuthCookieService.cs:22-40; Backend/tests/Appetee.Api.Tests/Integration/AdminEndpointsTests.cs:21-63,80-102,189-224; appetee_front/src/app/app.routes.ts:25-41; appetee_front/src/app/core/layout/private-layout/private-header.component.ts:39-45
- **Attack or failure scenario:** Any newly registered account creates ingredients, uploads image content, creates recipes, or overwrites an existing recipe ID.
- **Business impact:** Catalogue defacement, unsafe or false nutrition/allergen content, storage cost, moderation burden, and loss of integrity.
- **Technical impact:** Broken function-level authorization and vertical privilege escalation.
- **Likelihood:** High; registration is public and the administrative routes require only a normal cookie.
- **Existing mitigation:** Backend Authorize requires authentication, and Angular also guards the feature.
- **Why the existing mitigation is insufficient:** Authentication answers who the caller is, not whether the caller may administer content. Angular guards and hidden links are not security boundaries.
- **Recommended remediation:** Define a durable role/permission source, issue or resolve claims only after server validation, require a named policy on each administrative endpoint, and audit sensitive actions. Do not rely forever on a stale cookie role; revalidate or use short-lived authorization data.
- **Example of a safer design:** An AdministerCatalog policy requires a server-backed permission and active security stamp; commands record actor ID and use optimistic concurrency.
- **Validation steps after fixing:** Test anonymous, ordinary, moderator, admin, removed-admin, stale-cookie, and forged-claim cases; verify the frontend merely reflects, rather than grants, permission.
- **Dependencies:** SEC-008 session revalidation; DB-003 audit/concurrency; TEST-001 authorization matrix
- **Estimated effort:** Medium
- **Recommended timing:** Fix immediately

### SEC-003: Sign-up and login records containing passwords are logged

- **Severity:** High
- **Confidence:** Confirmed
- **Category:** Security
- **Status:** Confirmed vulnerability
- **Affected components:** AuthController and production console/log ingestion
- **Evidence:** Both actions call Console.WriteLine(request). The positional request records include Password, so their generated record string representation includes the credential. Production console logging is enabled.
- **File paths and line numbers:** Backend/src/Appetee.Api/Controllers/AuthController.cs:19-31; Backend/src/Appetee.Application/Requests/Auth/LoginRequest.cs:3-6; Backend/src/Appetee.Application/Requests/Auth/SignUpRequest.cs:3-8; Backend/src/Appetee.Api/Program.cs:28-41
- **Attack or failure scenario:** A real registration or login writes a reusable plaintext password into App Service logs; operators, log exporters, support tooling, or a later log compromise expose it.
- **Business impact:** Account compromise in Appetee and potentially other services where a password was reused, plus severe privacy and incident-response impact.
- **Technical impact:** Direct credential disclosure into a secondary storage and access domain.
- **Likelihood:** High whenever these endpoints receive real traffic; the write is unconditional.
- **Existing mitigation:** Passwords are hashed for database storage.
- **Why the existing mitigation is insufficient:** Database hashing does not protect plaintext copied to logs before verification/storage.
- **Recommended remediation:** Delete both request-object writes; use structured allowlisted fields that exclude secrets and personal data; centralize log redaction; restrict/retain logs appropriately; rotate any real credentials known to have traversed the current logging path.
- **Example of a safer design:** Log AuthLoginFailed with trace ID, coarse reason code, and rate-limit result—never email/password/request serialization—and enforce analyzers/tests against sensitive property logging.
- **Validation steps after fixing:** Exercise success/failure flows against a test log sink; scan captured and deployed logs for sentinel password/email values; inspect optimized binaries/source; verify access and retention settings.
- **Dependencies:** OPS-002 static/lint gates; REL-003 log governance
- **Estimated effort:** Small
- **Recommended timing:** Fix immediately

### SEC-004: Image uploads accept and relabel unverified arbitrary bytes

- **Severity:** High
- **Confidence:** Confirmed
- **Category:** Security
- **Status:** Confirmed vulnerability
- **Affected components:** Administrative multipart endpoints, RecipeService, IngredientService, BlobStorageService, frontend file selector
- **Evidence:** Server validation checks presence/length but does not enforce an application size limit, signature, MIME, extension, successful decode, dimensions, frame count, or metadata policy. UploadImageAsAvifAsync assigns an .avif name and image/avif header but streams original bytes; its quality argument is unused. Client validation accepts the asserted MIME type or filename extension. Read mapping returns plain direct Blob URIs through GetUri; no SAS generation or authenticated media proxy/download endpoint was found.
- **File paths and line numbers:** Backend/src/Appetee.Application/Services/Recipes/RecipeService.cs:86-90; Backend/src/Appetee.Application/Services/Ingredients/IngredientService.cs:45-54; Backend/src/Appetee.Infrastructure/Data/BlobStorageService.cs:83-125,159-162; Backend/src/Appetee.Infrastructure/Ingredients/IngredientQueries.cs:62,222; Backend/src/Appetee.Infrastructure/Recipes/RecipeQueries.cs:277-292,456; appetee_front/src/app/core/shared/utils/avif-file-selection/avif-file-selection.ts:35-36
- **Attack or failure scenario:** A signed-in attacker uploads oversized, malformed, polyglot, mislabeled, or non-image content. It consumes storage/bandwidth and may be served to users or later processed by a vulnerable decoder. If the live container is private, current plain URLs may fail in browsers; if anonymous read is enabled, the exposure of untrusted content broadens.
- **Business impact:** Storage abuse, broken catalogue images, content-safety incident, availability degradation, and possible downstream client/parser exposure.
- **Technical impact:** Unrestricted content ingestion and content-type spoofing at a privileged catalogue boundary.
- **Likelihood:** High while SEC-002 allows every account to upload; impact depends partly on the unverified Blob access/serving configuration.
- **Existing mitigation:** Blob names are random GUIDs, user filenames are not used as paths, Azure URLs are validated, and recipe create/update validation rejects applicable zero-length images. Ingredient creation rejects a missing image but does not explicitly reject a zero-length bound file.
- **Why the existing mitigation is insufficient:** Random naming and partial empty-file checks prevent neither malicious content, application-level resource exhaustion, parser attacks, nor unsafe serving.
- **Recommended remediation:** Enforce endpoint and reverse-proxy body limits; read a bounded stream; decode with a maintained image library; reject non-AVIF or transcode to a canonical safe output; cap pixels/dimensions/frames; strip metadata; store outside the public web origin; add scanning/quarantine and lifecycle cleanup. Choose an intentional private delivery path—authenticated proxy, short-lived narrowly scoped SAS, or controlled CDN—rather than relying accidentally on anonymous direct Blob URIs.
- **Example of a safer design:** Upload to a private quarantine container under a random object key, validate magic bytes and decode within strict resource/time limits, re-encode to canonical AVIF, malware-scan, then promote and persist a server-generated media ID; an authorized media endpoint/CDN supplies bounded read access.
- **Validation steps after fixing:** Test wrong extension/MIME, magic mismatch, polyglot, truncation, huge dimensions, oversized body, decompression/resource bomb, metadata, duplicate/replay, and scanner failure; assert 400/413/415 and no durable Blob/row.
- **Dependencies:** SEC-002 authorization; REL-002 cross-resource workflow; Azure Blob access review
- **Estimated effort:** Medium
- **Recommended timing:** Fix immediately

### SEC-006: Authentication abuse controls and meaningful server password policy are absent

- **Severity:** High
- **Confidence:** Confirmed
- **Category:** Security
- **Status:** Confirmed missing protection with realistic account-compromise risk
- **Affected components:** Sign-up/login/user-existence endpoints and authentication configuration
- **Evidence:** Registration requires only nonblank values server-side. There is no ASP.NET rate limiter, per-account/IP control, lockout, progressive delay, or challenge. exists-by-email returns an exact result. A nonexistent email skips password hashing while a wrong password performs it, creating a timing distinction.
- **File paths and line numbers:** Backend/src/Appetee.Application/Services/Auth/AuthService.cs:33-47; Backend/src/Appetee.Infrastructure/Auth/AuthQueries.cs:29-37; Backend/src/Appetee.Api/Controllers/UsersController.cs:33-41; Backend/src/Appetee.Api/Program.cs:126-435; appetee_front/src/app/features/auth/sign-up/sign-up.wizard.ts:32-39
- **Attack or failure scenario:** Automated callers enumerate accounts, submit weak passwords by bypassing frontend validators, and run password-spraying or credential-stuffing attempts without a server throttle.
- **Business impact:** Increased probability of account takeover, infrastructure cost, and support/incident load.
- **Technical impact:** Uncontrolled authentication resource consumption and weak credential assurance.
- **Likelihood:** High for an internet-facing login; commodity tooling automates these behaviors.
- **Existing mitigation:** ASP.NET Identity's salted password hasher is used and the login body returns a generic invalid-credentials message.
- **Why the existing mitigation is insufficient:** Strong hashing protects stored hashes but cannot limit online guesses. A generic body does not remove the exact existence endpoint or timing gap.
- **Recommended remediation:** Enforce reasonable length and password rules server-side; reject breached passwords; add per-account plus IP/network rate controls and exponential backoff; normalize failure work with a dummy hash; return generic existence behavior or strictly limit that endpoint; add email verification and security-event audit.
- **Example of a safer design:** A login policy partitions limits by normalized account and source, performs a fixed-cost verification path for absent users, returns generic 401/429, emits privacy-safe counters, and supports recovery without revealing registration state.
- **Validation steps after fixing:** Measure present/absent/wrong-password timings statistically; run bounded repeated-login and distributed-source simulations; bypass the UI with short/long/common passwords; verify 429/backoff, no enumeration, and useful alerts.
- **Dependencies:** REL-003 metrics/alerts; TEST-002 adversarial suite
- **Estimated effort:** Medium
- **Recommended timing:** Fix immediately

### SEC-007: Production npm dependency tree contains known High advisories

- **Severity:** High
- **Confidence:** High
- **Category:** Security
- **Status:** Confirmed vulnerable versions; route-specific exploitability varies
- **Affected components:** Angular 21.2.4 suite and Express transitive dependencies
- **Evidence:** npm audit --omit=dev reported 9 affected production nodes: 7 High, 1 Moderate, 1 Low. Angular 21.2.4 findings include GHSA-48r7-hpm6-gfxm, GHSA-39pv-4j6c-2g6v, GHSA-p3vc-36g9-x9gr, GHSA-q6f4-qqrg-jv6x, GHSA-jhpw-976m-542j, GHSA-58w9-8g37-x9v5, GHSA-f3m7-gqxr-g87x, GHSA-jj27-h5hq-8x99, GHSA-692r-grfm-v8x7, and GHSA-rgjc-h3x7-9mwg. Express transitives include body-parser 2.2.2 (GHSA-v422-hmwv-36x6), path-to-regexp 8.3.0 (GHSA-j3q9-mxjg-w52f and GHSA-27v5-c462-wpq7), and qs 6.15.0 (GHSA-q8mj-m7cp-5q26).
- **File paths and line numbers:** appetee_front/package-lock.json:479-482,495-498,540-543,565-568,601-604,623-626,4260-4263,6903-6906,7083-7086
- **Attack or failure scenario:** A reachable vulnerable Angular binding, formatting, hydration/transfer-cache, or routing behavior is triggered by crafted data, or an Express transitive flaw becomes reachable as host behavior evolves.
- **Business impact:** Potential browser compromise/data leak/denial of service depending advisory reachability; known-vulnerable framework versions also block a defensible production release.
- **Technical impact:** Exposure to listed GHSAs including Angular XSS/cache/OOM issues and path-to-regexp/body-parser/qs issues.
- **Likelihood:** Advisory-dependent. This is a client-rendered SPA with no observed hydration/HttpTransferCache use, fixed formatting arguments, and no Express body parsing, so some paths appear unreachable; no exploit was demonstrated.
- **Existing mitigation:** Lockfile integrity is complete, builds are hashed, and no production Critical was reported.
- **Why the existing mitigation is insufficient:** Integrity proves which vulnerable artifact was installed, not that it is safe. Direct framework packages have patch releases.
- **Recommended remediation:** Upgrade the Angular suite together to at least 21.2.19; refresh body-parser to at least 2.3.0, path-to-regexp to at least 8.4.0, and qs above 6.15.1 through a tested Express lock update; review each advisory's reachable feature; rerun functional/XSS/CSP/browser tests. Avoid an unreviewed force upgrade across majors.
- **Example of a safer design:** Automated dependency PRs update a locked suite in staging; CI blocks unsuppressed production High/Critical advisories, and any reachability suppression has an owner, evidence, and expiry.
- **Validation steps after fixing:** Re-run both audits, npm ls, type checks, unit tests, production build, browser E2E, and targeted regression cases for advisory features; record remaining accepted risks.
- **Dependencies:** OPS-002 dependency policy and reproducible CI
- **Estimated effort:** Medium
- **Recommended timing:** Fix immediately

### DB-001: Destructive rebuild scripts exist without versioned migrations or rollback

- **Severity:** High
- **Confidence:** Confirmed
- **Category:** Database
- **Status:** Confirmed production-readiness risk
- **Affected components:** MySQL schema, seed process, backend deployment workflow
- **Evidence:** scriptDatabase.sql selects the application database, disables FK checks, and drops all major tables before recreating them. initObjectDatabase.sql deletes application rows. No migration history/tool, compatibility test, migration identity, backup preflight, or workflow migration step exists.
- **File paths and line numbers:** Backend/scriptDatabase.sql:19-52; Backend/initObjectDatabase.sql:9-18; Backend/.github/workflows/master_appeteeapi.yml:26-65
- **Attack or failure scenario:** An operator applies the rebuild/seed script to production or deploys code against an incompatible schema, causing destructive data loss or a major outage with no rehearsed roll-forward/rollback.
- **Business impact:** Loss of accounts/catalogue data, extended outage, unrecoverable drift, and failed releases.
- **Technical impact:** No controlled schema evolution, ordering, idempotency, compatibility window, or auditable migration history.
- **Likelihood:** Medium; human error or the first required schema change makes this increasingly likely.
- **Existing mitigation:** Integration tests rewrite the database target to a dedicated test database before applying schema/reset operations (ApiTestDatabase.cs:38-51).
- **Why the existing mitigation is insufficient:** Test isolation does not provide a safe production migration mechanism.
- **Recommended remediation:** Adopt versioned forward migrations, immutable history, expand/contract changes, staging clean-install and N-1-to-N tests, least-privileged migration credentials, backup/PITR preflight, and documented roll-forward/rollback. Mark rebuild/seed scripts explicitly nonproduction.
- **Example of a safer design:** A numbered migration artifact runs once under a migration identity before slot promotion, verifies schema compatibility, and is paired with a data-safe roll-forward plan and tested restore point.
- **Validation steps after fixing:** Apply migrations to empty and representative previous-version databases twice; verify data preservation, old/new app compatibility window, failure recovery, restore, and deployment smoke.
- **Dependencies:** REL-003 backup/restore; OPS-001 staged release
- **Estimated effort:** Large
- **Recommended timing:** Before production

### OPS-001: Pushes can deploy directly to production without essential release gates

- **Severity:** High
- **Confidence:** Confirmed
- **Category:** DevOps
- **Status:** Confirmed production-outage and security risk
- **Affected components:** Frontend and backend GitHub Actions workflows
- **Evidence:** Workflows trigger on push to main/master or dispatch and target the Production slot. The frontend builds/tests but has no lint/security/E2E gate; the backend builds/publishes but never runs its 39-test integration project. Neither defines a GitHub environment, staging/slot verification, concurrency, migration, health, approval, canary, or rollback step.
- **File paths and line numbers:** appetee_front/.github/workflows/main_appetee.yml:6-10,26-64; Backend/.github/workflows/master_appeteeapi.yml:6-10,26-65
- **Attack or failure scenario:** A merged regression or compromised dependency is built and deployed immediately. The current 11-test backend regression would not block the backend workflow.
- **Business impact:** Avoidable production outages, data incompatibility, rapid security regression, and slower recovery.
- **Technical impact:** Build and deployment are conflated; an unverified artifact reaches the only named production target.
- **Likelihood:** High over repeated releases.
- **Existing mitigation:** Release builds run and Azure authentication uses OIDC with minimal job permissions.
- **Why the existing mitigation is insufficient:** A successful compile and federated authentication do not validate behavior, schema, security, readiness, or recovery.
- **Recommended remediation:** Add PR CI and branch protection; build once; deploy the same signed artifact to a protected staging environment/slot; run migration preflight, readiness, API/browser smoke and safe DAST; require production approval; promote/swap; observe SLOs; retain and automate rollback/roll-forward.
- **Example of a safer design:** Required PR checks produce an attested artifact digest. A deployment workflow with environment protection and concurrency deploys that digest to staging, gates it, then promotes it to production after approval.
- **Validation steps after fixing:** Intentionally submit failing test, vulnerable dependency, broken migration, failed readiness, concurrent deploy, and post-deploy smoke scenarios; confirm each blocks or rolls back with traceable evidence.
- **Dependencies:** DB-001 migrations; REL-003 health/monitoring; TEST-001/002 suites; OPS-002 artifact controls
- **Estimated effort:** Medium
- **Recommended timing:** Before production

### SEC-005: Cookie-authenticated mutations lack CSRF protection

- **Severity:** Medium
- **Confidence:** Confirmed
- **Category:** Security
- **Status:** Confirmed vulnerability
- **Affected components:** Cookie authentication, CORS, logout, multipart administrative POST endpoints
- **Evidence:** The cookie is Secure, HttpOnly, and SameSite=None; production CORS allows credentials from configured origins; the Angular interceptor always includes credentials for the API prefix. No antiforgery token/header, Origin/Referer validation, or Fetch Metadata policy was found.
- **File paths and line numbers:** Backend/src/Appetee.Api/Program.cs:126-151,161-176,432-435; appetee_front/src/app/core/auth/auth.interceptor.ts:7-12; Backend/src/Appetee.Api/Controllers/AuthController.cs:35-39; Backend/src/Appetee.Api/Controllers/AdminController.cs:38-55
- **Attack or failure scenario:** A malicious site sends a credentialed no-cors multipart/form-data POST to an administrative create route. Multipart is a CORS-safelisted request shape, so the victim's SameSite=None cookie can accompany the mutation even though the attacker cannot read the response. Logout is similarly triggerable.
- **Business impact:** Catalogue corruption or forced logout under a victim's authority. Current incremental impact overlaps SEC-002 because every account already has catalogue authority; impact becomes serious CSRF once real admin roles exist.
- **Technical impact:** Ambient credential replay from an untrusted origin.
- **Likelihood:** Medium–High; it requires a signed-in victim visiting an attacker-controlled page, but no response read is necessary.
- **Existing mitigation:** Production uses an exact origin allowlist rather than wildcard origins, and HTTPS protects transport.
- **Why the existing mitigation is insufficient:** CORS controls whether attacker JavaScript may read a response; it does not reliably stop the server from processing a simple cross-origin request. HTTPS does not prove request intent.
- **Recommended remediation:** Prefer same-origin hosting/BFF or reverse proxy where practical. Otherwise issue an antiforgery token and require a custom header on every state-changing request, reject missing/untrusted Origin, add Fetch Metadata defense, and keep SameSite as restrictive as the deployment allows.
- **Example of a safer design:** GET /api/auth/csrf returns a bound token; Angular sends X-CSRF-Token; API middleware requires a valid token plus Sec-Fetch-Site/Origin checks for POST/PUT/PATCH/DELETE.
- **Validation steps after fixing:** Use a real hostile-origin browser page to attempt form, FormData/no-cors, text/plain, JSON/preflight, logout, upload, PUT, and DELETE cases; verify rejected requests produce no side effects while the configured frontend succeeds.
- **Dependencies:** Final frontend/API domain design; SEC-002 authorization
- **Estimated effort:** Medium
- **Recommended timing:** Fix immediately

### DB-002: Browser-calculated nutrition and cost are stored as authoritative data

- **Severity:** Medium
- **Confidence:** Confirmed
- **Category:** Database
- **Status:** Confirmed integrity/architecture risk
- **Affected components:** Admin recipe form/facade, RecipeService, RecipeQueries, recipe schema
- **Evidence:** Angular calculates calories, macronutrients, and cost using submitted quantities and basis values, then sends totals. The backend validates only nonnegative totals and persists them unchanged; database checks likewise enforce only nonnegativity.
- **File paths and line numbers:** appetee_front/src/app/features/admin-recipes/admin-recipes.page.ts:551-624; appetee_front/src/app/core/shared/data-access/recipes/recipe.facade.ts:135-140; Backend/src/Appetee.Application/Services/Recipes/RecipeService.cs:101-107; Backend/src/Appetee.Infrastructure/Recipes/RecipeQueries.cs:83-102,165-185; Backend/scriptDatabase.sql:66-88
- **Attack or failure scenario:** A caller edits multipart fields directly and stores false nutrition/allergen/cost totals inconsistent with ingredient rows; SEC-002 lets any account do so today. Even a legitimately authorized editor can create inconsistent derived facts accidentally.
- **Business impact:** Users receive misleading dietary/nutrition information, pricing becomes untrustworthy, and catalogue integrity is lost.
- **Technical impact:** A lower-trust client controls derived authoritative values without reproducible server calculation or provenance.
- **Likelihood:** High for accidental calculation drift as units expand; deliberate unauthorized editing is primarily captured by SEC-002.
- **Existing mitigation:** Values must be nonnegative and ingredient IDs are validated.
- **Why the existing mitigation is insufficient:** Plausible-looking positive values can still be arbitrarily false, and unit conversions are not normalized.
- **Recommended remediation:** Make the server authoritative. Store normalized ingredient quantity/unit and versioned nutrition/price sources; calculate derived totals in the command transaction; either omit client totals or compare them as nonauthoritative previews.
- **Example of a safer design:** Recipe creation submits ingredient ID plus normalized amount; a domain calculator loads effective-dated nutrition/price facts, persists inputs and calculation version, and returns computed totals.
- **Validation steps after fixing:** Tamper every total, unit, and factor; verify the server ignores/rejects mismatches; add deterministic rounding/unit tests and recalculate historical recipes under controlled versioning.
- **Dependencies:** ARC-003 units/pricing model; SEC-002 authorization; DB-003 audit/concurrency
- **Estimated effort:** Large
- **Recommended timing:** Before production

### SEC-008: Cookie lifecycle lacks server-side revocation, absolute limits, and revalidation

- **Severity:** Medium
- **Confidence:** Confirmed
- **Category:** Security
- **Status:** Confirmed missing protection
- **Affected components:** AuthCookieService, cookie configuration, all Authorize endpoints
- **Evidence:** Sign-in creates a persistent ticket with a hard-coded ExpiresUtc of 14 days while Program separately reads configurable expiry and enables sliding expiration. Claims contain no security stamp/version. No server session store, OnValidatePrincipal, disabled-user check, password-change invalidation, absolute maximum, or sensitive-action reauthentication exists.
- **File paths and line numbers:** Backend/src/Appetee.Infrastructure/Auth/AuthCookieService.cs:22-44; Backend/src/Appetee.Api/Program.cs:53-64,161-176; Backend/src/Appetee.Api/Controllers/AuthController.cs:42-55; Backend/src/Appetee.Api/Controllers/UsersController.cs:44-66
- **Attack or failure scenario:** A copied cookie remains usable until expiry and can keep authorizing recipes/admin even after the user row is deleted or privilege/account state changes; only /users/me rechecks the database.
- **Business impact:** Prolonged unauthorized access after account or privilege changes and weak incident containment.
- **Technical impact:** Authentication tickets become the sole long-lived source of truth.
- **Likelihood:** Medium; exploitation requires a stolen ticket or a state change during its lifetime.
- **Existing mitigation:** The current/default cookie name uses the __Host- prefix, with Secure, HttpOnly, HTTPS, a protected ASP.NET ticket, handler-level configurable TimeSpan, and logout cookie clearing.
- **Why the existing mitigation is insufficient:** AuthCookieService explicitly sets ExpiresUtc to 14 days, overriding the handler lifetime intent for issued tickets; ticket confidentiality/integrity does not provide revocation or fresh authorization, and sliding expiration can extend exposure.
- **Recommended remediation:** Reconcile one expiry policy; use shorter idle lifetime plus absolute maximum; add a user security stamp/session version and periodic validation; invalidate on password/role/account changes; persist Data Protection keys safely; require reauthentication for destructive/administrative actions.
- **Example of a safer design:** Each ticket contains user ID and session version; OnValidatePrincipal performs a bounded cached active-user/version check and rejects mismatches, while server records allow explicit session revocation.
- **Validation steps after fixing:** Test idle/absolute expiry, logout, deleted/disabled user, password and role changes, key rotation, restart, multi-instance/slot swap, copied cookie, and sensitive-action reauthentication.
- **Dependencies:** Azure Data Protection-key configuration; SEC-002 authorization model
- **Estimated effort:** Medium
- **Recommended timing:** Before production

### SEC-009: A plaintext development database credential is tracked

- **Severity:** Medium
- **Confidence:** Confirmed
- **Category:** Security
- **Status:** Confirmed secret-management weakness; production applicability unproven
- **Affected components:** Backend development configuration and Git history
- **Evidence:** appsettings.Development.json contains a nonempty connection-string user ID and password and is tracked in current HEAD/history. The value was redacted. The host is local, so this audit does not claim a production credential was exposed.
- **File paths and line numbers:** Backend/src/Appetee.Api/appsettings.Development.json:3; Backend/README.md:45-48
- **Attack or failure scenario:** Someone with repository access reuses the credential against a reachable local/shared database, or a developer has reused the same password elsewhere.
- **Business impact:** Local/test data access and a credential-reuse risk; severity rises immediately if the value was reused in shared or production infrastructure.
- **Technical impact:** Secret material is distributed through source control and remains in history.
- **Likelihood:** Medium for local misuse; production reach is unable to verify.
- **Existing mitigation:** The connection host is local. Frontend local certificate/key files are ignored and untracked (appetee_front/.gitignore:46-50).
- **Why the existing mitigation is insufficient:** Local secrets still authorize data access and train an unsafe pattern; ignoring a file later does not remove Git history.
- **Recommended remediation:** Rotate if valid or reused; move developer credentials to .NET user-secrets/environment variables; commit only a redacted example; prevent development secrets from publish output; run history-aware secret scanning.
- **Example of a safer design:** appsettings.Development.json contains only nonsecret defaults, each developer provisions a scoped test DB credential through user-secrets, and CI injects an ephemeral service credential.
- **Validation steps after fixing:** Verify the old value no longer authenticates, current/history scans are clean or history remediation is documented, publish artifacts omit secrets, and startup clearly reports a missing local secret.
- **Dependencies:** Team coordination if history rewrite becomes necessary
- **Estimated effort:** Small
- **Recommended timing:** Fix immediately

### REL-001: Current Development exception pipeline converts expected 4xx paths into 500

- **Severity:** Medium
- **Confidence:** Confirmed
- **Category:** Reliability
- **Status:** Confirmed current-worktree regression; committed/deployed behavior may differ
- **Affected components:** Program middleware, ErrorsController contract, integration-test environment
- **Evidence:** The test factory forces Development. Current Program uses DeveloperExceptionPage in Development but maps /error only outside Development. Eleven validation/auth/conflict tests therefore receive 500 rather than expected 400/401/409. Committed HEAD previously always used UseExceptionHandler("/error").
- **File paths and line numbers:** Backend/tests/Appetee.Api.Tests/Infrastructure/AppeteeWebApplicationFactory.cs:24-26; Backend/src/Appetee.Api/Program.cs:369-384; Backend/tests/Appetee.Api.Tests/Integration/AdminEndpointsTests.cs:114,134,165,184; AuthEndpointsTests.cs:53,72,120,131,166; RecipesEndpointsTests.cs:51; UsersEndpointsTests.cs:136
- **Attack or failure scenario:** A client validation or authentication error in Development/testing becomes an internal-error response, breaks consumers, obscures intended status semantics, and causes a red suite that CI currently ignores.
- **Business impact:** Regression escape, poor diagnostics, false incident signals, and client-flow failure.
- **Technical impact:** Environment-dependent error contracts and middleware behavior.
- **Likelihood:** Confirmed in the current test run; Production currently follows the other branch, but merging WIP without a stable contract is risky.
- **Existing mitigation:** Production error responses are sanitized, include trace IDs, set no-cache on errors, and map known ApiException types.
- **Why the existing mitigation is insufficient:** Tests cannot validate the production contract when their environment bypasses it.
- **Recommended remediation:** Use a consistent IExceptionHandler/ProblemDetails pipeline in all environments; vary only detail disclosure. Give tests a Testing environment that exercises the production mapping.
- **Example of a safer design:** Exception handlers map validation/auth/conflict exceptions identically everywhere, attach trace IDs, and conditionally add development details without changing status/shape.
- **Validation steps after fixing:** Make all 39 tests pass; add schema assertions for ProblemDetails, trace ID, cache headers, unexpected exceptions, malformed JSON, and direct /error requests across Testing/Development/Production settings.
- **Dependencies:** TEST-001 CI gate
- **Estimated effort:** Small
- **Recommended timing:** Fix immediately

### REL-002: MySQL and Blob writes are not atomic or reconciled

- **Severity:** Medium
- **Confidence:** Confirmed
- **Category:** Reliability
- **Status:** Confirmed consistency risk
- **Affected components:** IngredientQueries, RecipeQueries, BlobStorageService, administrative write flows
- **Evidence:** Create uploads before the DB transaction and performs best-effort cleanup on failure. Recipe cleanup swallows errors; ingredient cleanup only logs. Updates obtain old Blob state outside the transaction, commit the new reference, then delete the old Blob. There is no outbox, durable operation state, idempotency key, inventory reconciliation, or repair job.
- **File paths and line numbers:** Backend/src/Appetee.Infrastructure/Recipes/RecipeQueries.cs:72-134,136-247,464-475; Backend/src/Appetee.Infrastructure/Ingredients/IngredientQueries.cs:39-200; Backend/src/Appetee.Infrastructure/Data/BlobStorageService.cs:42-81,83-175
- **Attack or failure scenario:** DB timeout after upload leaves an orphan; cleanup uses an already-cancelled token and fails; concurrent updates silently overwrite data and can leave a superseded replacement Blob orphaned; an ambiguous commit/post-commit failure can leave DB and Blob disagreeing.
- **Business impact:** Missing images, storage leaks/cost, inconsistent catalogue data, and hard-to-repair failures.
- **Technical impact:** Cross-resource workflow has no durable state or idempotent convergence guarantee.
- **Likelihood:** Medium and rising with traffic, transient failures, cancellations, and concurrent administration.
- **Existing mitigation:** Relational sub-operations use transactions; random Blob names prevent collision; code attempts compensation and logs Azure failures.
- **Why the existing mitigation is insufficient:** A MySQL transaction cannot roll back Blob Storage, and best-effort compensation can itself fail or race.
- **Recommended remediation:** Define idempotent media states; use a durable outbox/work queue for promotion/deletion; use independent bounded cleanup cancellation; reconcile DB references against Blob inventory; add lifecycle retention for uncommitted objects.
- **Example of a safer design:** Upload to pending/{operationId}; commit a row plus outbox event; a worker promotes/marks active and later deletes superseded media; reconciliation retries safely and reports dead letters.
- **Validation steps after fixing:** Inject Blob failures before/after upload, DB begin/command/commit ambiguity, cancellation, duplicate requests, and concurrent updates; assert a single active reference and eventual cleanup.
- **Dependencies:** DB-003 concurrency/versioning; REL-003 worker telemetry; SEC-004 media states
- **Estimated effort:** Large
- **Recommended timing:** Before production

### REL-003: Health, telemetry, alerting, recovery, and restore readiness are incomplete

- **Severity:** Medium
- **Confidence:** Confirmed
- **Category:** Reliability
- **Status:** Confirmed missing application/operational controls, not a claim that Azure backups are disabled
- **Affected components:** API, Express host, Azure operations, MySQL/Blob recovery, deployment process
- **Evidence:** No health services/endpoints exist; Express falls back all GET paths to index.html. Logging has trace scopes and structured Blob/error logs but no successful request duration/status, metrics, exporter, dependency tracing, dashboards, alerts, availability tests, runbooks, RPO/RTO, coordinated MySQL/Blob restore procedure, or restore drill evidence.
- **File paths and line numbers:** Backend/src/Appetee.Api/Program.cs:28-41,337-362,430-439; Backend/src/Appetee.Api/Controllers/ErrorsController.cs:65-71,94-106,141-142; appetee_front/server.js:10-18; Backend/README.md:5-23
- **Attack or failure scenario:** A DB, Blob, identity, deployment, or latency failure is accepted by the load balancer, goes undetected, cannot be correlated quickly, and is restored inconsistently across database rows and media.
- **Business impact:** Longer and less predictable outages, missed SLOs, data inconsistency, and no demonstrated recovery capability.
- **Technical impact:** The system lacks dependency-aware readiness, measurable service health, actionable alerts, and a tested recovery control plane.
- **Likelihood:** High that some dependency failure occurs over a production lifetime; impact is conditioned on unverified Azure settings.
- **Existing mitigation:** Production startup validates critical configuration; errors have trace IDs; console logging has scopes; Azure SDK provides its own client-level retries.
- **Why the existing mitigation is insufficient:** Startup validation is not continuous readiness, logs are not service-level telemetry, SDK retry does not define application recovery, and provider backup defaults do not prove a coordinated restore.
- **Recommended remediation:** Add /health/live and bounded/cached /health/ready checks for MySQL, Blob, schema, and identity; add OpenTelemetry/Application Insights request/dependency metrics and traces; define alerts/runbooks; set RPO/RTO; configure and test isolated, coordinated restore; make readiness/smoke a deployment gate.
- **Example of a safer design:** Liveness checks only the process; readiness uses short timeouts and cached dependency probes; dashboards/alerts link trace IDs to owned runbooks; quarterly restoration reconstructs a consistent DB/Blob snapshot and verifies reference inventory.
- **Validation steps after fixing:** Test process, DB, Blob, identity, slow dependency, schema mismatch, alert routing, log redaction, backup restore, and cross-service consistency; record measured RPO/RTO.
- **Dependencies:** Azure configuration access; DB-001 migrations; OPS-001 staged delivery
- **Estimated effort:** Large
- **Recommended timing:** Before production

### DB-003: Concurrency, audit, ownership, and several integrity/index controls are missing

- **Severity:** Medium
- **Confidence:** Confirmed
- **Category:** Database
- **Status:** Confirmed integrity and scalability risk
- **Affected components:** Schema, recipe updates, user/security tables, future favorites/collections
- **Evidence:** Mutable recipes/users have no row version or compare-and-swap condition and administrative content has no created_by/updated_by audit actor. The schema has no user role, security stamp, account state, email verification, server session, recipe creator/moderation state, or meal-plan model. Username is described as unique in a comment but not constrained; reset token_hash lacks a unique/indexed lookup; recipe pagination lacks a composite cursor index.
- **File paths and line numbers:** Backend/scriptDatabase.sql:7,58-121,128-195,314-329; Backend/src/Appetee.Infrastructure/Recipes/RecipeQueries.cs:136-247; Backend/src/Appetee.Infrastructure/Users/UserSql.cs:74-85
- **Attack or failure scenario:** Two admins overwrite each other; a stale update deletes/replaces media unexpectedly; security/ownership changes are unauditable; duplicate usernames or inefficient token/recipe lookups appear at scale.
- **Business impact:** Silent data loss, disputed administrative changes, security-response limitations, and degraded query performance.
- **Technical impact:** Last-write-wins mutation without actor/version invariants and incomplete operational schema.
- **Likelihood:** Medium now; high once multiple administrators, user-created content, reset flows, or larger datasets exist.
- **Existing mitigation:** Strong relational positives include FKs, cascades, composite join keys, checks, unique email and ingredient name, reverse lookup indexes, and transactions for multi-table writes.
- **Why the existing mitigation is insufficient:** Referential integrity does not detect stale writes, establish authorization ownership, or capture who changed authoritative content.
- **Recommended remediation:** Add optimistic row versions/updated_at checks, actor/audit records, explicit user/content state and ownership, unique/indexed normalized identifiers and tokens, and query-specific composite indexes after EXPLAIN evidence. Define hard-delete versus soft-delete requirements.
- **Example of a safer design:** Update recipe where id and version match, increment version, record actor and changed fields, and return 409 on conflict; authorization loads owner/permission independently of request DTOs.
- **Validation steps after fixing:** Concurrent-update tests, duplicate normalized username/token tests, audit immutability/access checks, delete-cascade inventory, EXPLAIN for cursor queries, and contention/deadlock tests.
- **Dependencies:** SEC-002 authorization model; ARC-003 domain ownership; DB-001 migrations
- **Estimated effort:** Large
- **Recommended timing:** Before production

### BE-001: Boundary validation, request limits, response contracts, and status semantics are inconsistent

- **Severity:** Medium
- **Confidence:** Confirmed
- **Category:** Backend
- **Status:** Confirmed API robustness gap
- **Affected components:** Request models/services/controllers and multipart endpoints
- **Evidence:** Important strings/arrays/numbers lack central maximum lengths/counts/ranges; no application multipart/body limits were found; recipes/ingredients are unbounded; create actions return 200 rather than location-bearing 201; IngredientsController declares DietDto while returning ingredients; several unfinished meal-prep routes expose 501 contracts.
- **File paths and line numbers:** Backend/src/Appetee.Application/Requests/Auth/SignUpRequest.cs:3-8; Backend/src/Appetee.Application/Requests/RecipeRequest.cs; Backend/src/Appetee.Application/Requests/IngredientRequest.cs; Backend/src/Appetee.Api/Controllers/IngredientsController.cs:16-20; Backend/src/Appetee.Api/Controllers/AdminController.cs:38-65; Backend/src/Appetee.Api/Controllers/RecipesController.cs:36-83
- **Attack or failure scenario:** Very large text/array/multipart input consumes resources or reaches DB/Blob before rejection; client generation sees the wrong DTO; clients depend on placeholder or inconsistent status behavior.
- **Business impact:** Denial-of-service risk, data-quality defects, brittle integrations, and slower multi-client development.
- **Technical impact:** Validation and protocol invariants are scattered rather than enforced at the trust boundary.
- **Likelihood:** Medium; direct API clients bypass all Angular checks.
- **Existing mitigation:** ApiController binding, service validation, integer route constraints, cancellation tokens, parameterized SQL, and some nonnegative/reference checks.
- **Why the existing mitigation is insufficient:** Presence and nonnegative checks do not cap work, ensure semantic units, or define stable response contracts.
- **Recommended remediation:** Define per-command validators and request/body/file limits; cap collection sizes and string lengths before database work; normalize inputs; use consistent ProblemDetails and HTTP semantics; remove/feature-flag unfinished routes; generate OpenAPI contract tests.
- **Example of a safer design:** Each application command has a validator with bounded fields and cross-field rules; controllers map typed results to 201/204/400/404/409/413/415; an OpenAPI schema is the reviewed source for generated clients.
- **Validation steps after fixing:** Boundary values, oversized bodies/files/arrays, malformed JSON, unexpected content type, Unicode normalization, duplicate submission, negative/overflow decimals, and contract snapshot tests.
- **Dependencies:** ARC-002 contract definition; SEC-004 upload design; PERF-001 pagination
- **Estimated effort:** Medium
- **Recommended timing:** Before production

### FE-001: Registered routes are incomplete and key signed-in flows are placeholders

- **Severity:** Medium
- **Confidence:** Confirmed
- **Category:** Frontend
- **Status:** Confirmed functional production blocker
- **Affected components:** Angular routes, private navigation, home and recipe features
- **Evidence:** Registered guest routes are /, /auth/login, case-variant duplicate /auth/Login, and sign-up steps. Registered authenticated routes are /home, /admin-recipes/create, /admin-recipes/create/success/:id, and /admin-recipes/:id/edit. Header links /recipes, /diet-needs, and /profile are unwired; goToCreateRecipe targets invalid /recipes/create. recipes.routes.ts is entirely commented, and the current recipe-list files are untracked/unregistered. Home displays one hard-coded recipe; view/meal filter handlers update selection state but do not filter recipes, while add/search/search-submit/favorite/explore handlers are empty.
- **File paths and line numbers:** appetee_front/src/app/app.routes.ts:8-43; src/app/features/auth/auth.routes.ts:5-20; src/app/features/admin-recipes/admin-recipes.routes.ts:5-20; src/app/core/layout/private-layout/private-header.component.ts:39-44,72-74; src/app/features/recipes/recipes.routes.ts:3-31; src/app/features/home/home.page.ts:47-82
- **Attack or failure scenario:** Signed-in users choose /recipes, /diet-needs or /profile and the wildcard routes to the empty path; guestGuard then sends authenticated users back to /home (guests reach landing). The unused /recipes/create helper would behave similarly. Home search/card handlers are no-ops. The valid header /admin-recipes/create route does work.
- **Business impact:** The intended recipe/meal-planning product cannot be used reliably and is not suitable for a production audience.
- **Technical impact:** Route declarations, navigation, and implemented features are out of sync.
- **Likelihood:** Certain for the named links.
- **Existing mitigation:** Lazy standalone routing, guest/auth guards, and a wildcard avoid a raw 404.
- **Why the existing mitigation is insufficient:** A silent redirect masks defects and cannot substitute for implemented routes or a not-found experience.
- **Recommended remediation:** Define a route/product inventory; wire completed routes only; remove/disable misleading links; add a real not-found page; finish recipe/profile/diet flows and route-level smoke tests before declaring production readiness.
- **Example of a safer design:** Each feature owns a tested route array and navigation metadata derived from authorized capabilities; CI crawls every navigation target and deep-link refresh.
- **Validation steps after fixing:** Navigate/cold-refresh every declared and linked route as guest/user/admin, exercise back/forward and unsaved forms, and assert an intentional 404 for unknown paths.
- **Dependencies:** ARC-002 stable API; SEC-002 permission-aware navigation
- **Estimated effort:** Medium
- **Recommended timing:** Before production

### FE-002: Sign-up navigation and session cache reset behavior can produce incorrect state

- **Severity:** Medium
- **Confidence:** Confirmed
- **Category:** Frontend
- **Status:** Confirmed broken redirect and incomplete reset/current stale-state risk; future principal-isolation risk
- **Affected components:** Sign-up wizard guard, session reset registration, recipe/ingredient stores and facades
- **Evidence:** The wizard guard redirects to /sign-up/account instead of registered /auth/sign-up/account. Tests construct a custom route array that omits canActivateChild: signupWizardGuard, so they cannot expose the mismatch. RecipesStore reset registration is commented out. Base reset clears its primary data/state/error/loaded subjects, but subclass-owned ingredient/recipe detail maps/subjects remain populated, and facades return cached details without refetching.
- **File paths and line numbers:** appetee_front/src/app/features/auth/sign-up/sign-up.wizard.guard.ts:17-22; src/app/features/auth/sign-up/sign-up.shell.page.spec.ts:19-31; src/app/app.config.ts:26-29; src/app/core/shared/data-access/generic-template/entityStore.ts:145-149; src/app/core/shared/data-access/ingredients/ingredients.store.ts:16-26; src/app/core/shared/data-access/recipes/recipes.store.ts:23-33; src/app/core/shared/data-access/ingredients/ingredient.facade.ts:73-75; src/app/core/shared/data-access/recipes/recipe.facade.ts:88-90,105-108; src/app/core/auth/data-access/auth.facade.ts:126-128
- **Attack or failure scenario:** A guarded sign-up step redirects to a nonexistent path. After logout/login without a full reload, detail subjects/maps can return stale catalogue/admin-detail objects from the previous session rather than refetching current state.
- **Business impact:** Broken onboarding and stale-data/correctness risk. Current recipe/ingredient detail is global catalogue data and every authenticated user can fetch admin detail, so no present confidentiality breach was demonstrated; the cache becomes a principal-boundary risk when permissions or user-owned content are added.
- **Technical impact:** Session reset does not reliably invalidate all in-memory state; cache keys omit future principal/permission context.
- **Likelihood:** High for the redirect path; stale cache behavior requires logout/login without a full page reload.
- **Existing mitigation:** logout calls session.resetAll, auth restoration validates /users/me, and the primary generic store has a reset method.
- **Why the existing mitigation is insufficient:** Resetters must be registered and must clear subclass-owned caches; a generic base cannot know those fields.
- **Recommended remediation:** Correct the route; test real app routes; register every principal-bound store; override reset to clear detail maps/subjects; scope sensitive cache keys to principal/authorization version; cancel in-flight requests on logout.
- **Example of a safer design:** A single session lifecycle broadcasts principal changes, every scoped store implements a complete reset contract, and route guards use named route builders instead of string literals.
- **Validation steps after fixing:** Real-router guard tests; user A/logout/user B scenario without reload; in-flight response after logout; revoked permission; cached detail access; verify all subjects/maps return initial state.
- **Dependencies:** SEC-002 permission model; SEC-008 session model
- **Estimated effort:** Medium
- **Recommended timing:** Before production

### FE-003: Confirmed source-level accessibility barriers affect core flows

- **Severity:** Medium
- **Confidence:** High
- **Category:** Frontend
- **Status:** Confirmed source findings; complete conformance requires manual/browser verification
- **Affected components:** Global theme/buttons/text, headers, login, signup, search inputs, layouts/dialogs
- **Evidence:** White text on the primary orange is about 2.75:1, below 4.5:1 for small text. A click-only div acts as a button; mobile-menu controls lack expanded/controls relationships; the closed mobile panel is only visually collapsed and its links/buttons remain in tab order; the open overlay is an empty unlabeled button; home filters expose selected state only visually, without aria-pressed or radio semantics; aria-describedby points to absent IDs; the login action sits outside the form with no submit handler; search fields lack labels; nested main landmarks appear; a dialog uses max-width based on viewport height.
- **File paths and line numbers:** appetee_front/src/styles/_theme.scss:1-5; appetee_front/src/styles/_button.scss:2-4; appetee_front/src/styles/_text.scss:96-112,151-154; appetee_front/src/app/core/layout/public-layout/components/public-header.component.html:3; appetee_front/src/app/core/layout/private-layout/private-header.component.html:39-78; appetee_front/src/app/core/layout/private-layout/private-header.component.scss:161-170; appetee_front/src/app/features/home/home.page.html:41-73; appetee_front/src/app/features/auth/sign-up/steps/step-account.page.html:7,27; appetee_front/src/app/features/auth/login/login.page.html:11-55; appetee_front/src/app/features/auth/sign-up/steps/step-ingredient.page.html:5-8; appetee_front/src/app/features/admin-recipes/component/ingredient-creation.dialog.html:29-35; appetee_front/src/app/features/admin-recipes/component/ingredient-creation.dialog.scss:1-7; appetee_front/src/app/core/layout/public-layout/public-layout.component.html:2; appetee_front/src/app/features/auth/login/login.page.html:3; appetee_front/src/app/features/auth/sign-up/sign-up.shell.page.html:12; appetee_front/src/app/core/layout/private-layout/private-layout.component.ts:9; appetee_front/src/app/features/home/home.page.html:1
- **Attack or failure scenario:** Keyboard, low-vision, or assistive-technology users may be unable to identify controls/status, submit naturally, operate specific navigation controls, or understand field help.
- **Business impact:** Exclusion from registration/login/core navigation, higher abandonment/support cost, and accessibility compliance risk without making a legal conclusion.
- **Technical impact:** Semantic, contrast, naming, relationship, landmark, and responsive-layout defects.
- **Likelihood:** High for affected users; contrast and markup defects are deterministic.
- **Existing mitigation:** Angular Material dialog focus infrastructure, some ARIA busy/alert states, responsive breakpoints, typed form errors, loading/error/empty UI.
- **Why the existing mitigation is insufficient:** Component-library defaults cannot repair custom semantics, labels, contrast, or invalid relationships.
- **Recommended remediation:** Use native button/form submit semantics; add programmatic labels/help/error IDs and aria-pressed or radio semantics for exclusive filter state; correct landmarks/menu states/focus/tab order; adopt accessible color tokens; make dialogs width responsive; establish keyboard, screen-reader, axe, and contrast acceptance criteria.
- **Example of a safer design:** One main landmark per page shell; buttons are native; menu trigger exposes aria-expanded/controls; form errors use stable IDs and live regions; theme tokens meet WCAG AA contrast.
- **Validation steps after fixing:** Keyboard-only traversal, 200%/400% zoom, high contrast, mobile reflow, NVDA/VoiceOver smoke, automated axe, contrast measurement, and form submit/error announcement checks.
- **Dependencies:** Design-token decision and completed routes
- **Estimated effort:** Medium
- **Recommended timing:** Before production

### TEST-001: Backend suite is red and existing tests encode broken authorization

- **Severity:** Medium
- **Confidence:** Confirmed
- **Category:** Testing
- **Status:** Confirmed release-control defect
- **Affected components:** Backend integration tests and backend workflow
- **Evidence:** Release integration run produced 28 pass, 11 fail, 0 skip due REL-001. More importantly, UsersEndpointsTests deliberately verifies anonymous user CRUD and AdminEndpointsTests verifies that a newly registered ordinary user can use admin endpoints. The backend workflow never runs tests.
- **File paths and line numbers:** Backend/tests/Appetee.Api.Tests/Integration/UsersEndpointsTests.cs:13-23,87-118,142-150; Backend/tests/Appetee.Api.Tests/Integration/AdminEndpointsTests.cs:21-63,80-102,189-224; Backend/.github/workflows/master_appeteeapi.yml:26-36
- **Attack or failure scenario:** A test suite gives false confidence by treating vulnerabilities as expected behavior, then a separate exception regression ships because no backend test blocks deployment.
- **Business impact:** Security and reliability defects reach production unnoticed.
- **Technical impact:** Automated specifications encode the wrong trust model and are nonblocking.
- **Likelihood:** Certain under the current workflow for any defect that still compiles.
- **Existing mitigation:** There are 39 meaningful MySQL-backed tests, a dedicated deterministic database reset setup, and a fake Blob service.
- **Why the existing mitigation is insufficient:** Coverage only helps when expected outcomes are secure, the suite is green, and CI requires it.
- **Recommended remediation:** Fix REL-001, invert authorization expectations, add two-user/admin matrices, and make the entire backend solution test job PR-blocking before publish.
- **Example of a safer design:** Policy-level test helpers exercise anonymous/user A/user B/admin/disabled roles across all routes, while a required CI check provisions an isolated MySQL service and fails on any skip/failure.
- **Validation steps after fixing:** Confirm 39/39 current tests plus new security tests pass locally and in clean CI; prove a deliberately removed Authorize/policy check fails CI.
- **Dependencies:** SEC-001/002 intended policies; REL-001 error contract
- **Estimated effort:** Medium
- **Recommended timing:** Fix immediately

### OPS-002: Builds and artifacts are not fully reproducible, minimal, or supply-chain hardened

- **Severity:** Medium
- **Confidence:** Confirmed
- **Category:** DevOps
- **Status:** Confirmed supply-chain and deployment-hardening gap
- **Affected components:** Both workflows, npm/NuGet/toolchain, deployed frontend artifact
- **Evidence:** Frontend CI uses npm install instead of npm ci and uploads path '.', including source/tests/dev dependencies. Backend has no global.json or packages.lock.json. Actions use mutable major tags. There is no dependency review/update bot, CodeQL, action pinning, secret scanning, SBOM, license gate, or provenance. Full npm audit reports 2 Critical development/build nodes and 21 High: Vitest 4.0.17 includes GHSA-5xrq-8626-4rwp; transitive tar 7.5.11 includes GHSA-23hp-3jrh-7fpw and related advisories.
- **File paths and line numbers:** appetee_front/.github/workflows/main_appetee.yml:21-36,41-64; Backend/.github/workflows/master_appeteeapi.yml:21-36,41-65; appetee_front/package-lock.json:8114-8117,7769-7772
- **Attack or failure scenario:** Mutable tooling or dependency resolution changes between reviews, compromised/unnecessary files are deployed, or a vulnerable dev server/build parser processes attacker-influenced content.
- **Business impact:** Build compromise, unverifiable releases, larger disclosure surface, and difficult incident attribution.
- **Technical impact:** Artifact contents and toolchain are insufficiently pinned, scanned, attested, or minimized.
- **Likelihood:** Medium; dev-only Criticals are not production runtime Criticals, but CI and developer environments execute them.
- **Existing mitigation:** npm lockfile v3 has integrity metadata and no non-registry resolutions; NuGet versions are explicit; OIDC and minimal workflow permissions are positive.
- **Why the existing mitigation is insufficient:** npm install may update the lock/tree, NuGet transitives/SDK float, mutable actions can change, and the frontend deploy artifact contains far more than runtime output.
- **Recommended remediation:** Use npm ci and pinned Node/npm; deploy only dist/server runtime assets or a static hosting model; add global.json and NuGet locked mode; pin action commit SHAs; update Vitest to 4.1.10 and tar above affected ranges; add CodeQL, dependency review, history-aware secret scanning, SBOM/license/provenance.
- **Example of a safer design:** Hermetic PR jobs restore in locked mode, scan, build once, inventory an SBOM, sign/attest an artifact digest, and production promotes that exact digest.
- **Validation steps after fixing:** Repeat clean builds and compare dependency/artifact manifests; inspect artifact contents; run audits/scanners/actionlint; verify action SHAs and attestations; test update-bot PRs.
- **Dependencies:** SEC-007 package patching; OPS-001 release redesign
- **Estimated effort:** Medium
- **Recommended timing:** Before production

### PERF-001: Catalogue APIs are unbounded and cold-cache admin edit causes redundant N+1 ingredient calls

- **Severity:** Medium
- **Confidence:** Confirmed
- **Category:** Performance
- **Status:** Confirmed current inefficiency and future scalability risk
- **Affected components:** Recipe/ingredient list API, Dapper recipe query, Angular stores/facades
- **Evidence:** GET /api/recipes and GET /api/ingredients accept no pagination/search. RecipeSql loads four broad datasets and assembles results in memory. The active admin edit path fetches one full /recipes/{id}; although that response already embeds IngredientAdminDetailDto objects, a cold ingredient cache then re-fetches ingredient details sequentially. Cached entries avoid those later HTTP calls. Stores retain unbounded lists/detail maps.
- **File paths and line numbers:** Backend/src/Appetee.Api/Controllers/RecipesController.cs:18-33; Backend/src/Appetee.Api/Controllers/IngredientsController.cs:16-20; Backend/src/Appetee.Infrastructure/Recipes/RecipeSql.cs:3-39; Backend/src/Appetee.Application/Dtos/RecipeDto.cs:11-16,36-50; Backend/src/Appetee.Infrastructure/Recipes/RecipeQueries.cs:250-340; appetee_front/src/app/features/admin-recipes/admin-recipes.page.ts:246-264; appetee_front/src/app/core/shared/data-access/recipes/recipe.facade.ts:174-189; appetee_front/src/app/core/shared/data-access/recipes/recipes.store.ts:23-33; appetee_front/src/app/core/shared/data-access/ingredients/ingredient.facade.ts:72-85; appetee_front/src/app/core/shared/data-access/ingredients/ingredients.store.ts:16-26
- **Attack or failure scenario:** A growing catalogue causes large scans/responses. Editing a recipe with N ingredients on a cold cache adds N sequential ingredient-detail calls, consuming latency, connections, bandwidth, and browser memory.
- **Business impact:** Slow pages, higher Azure cost, timeouts, and reduced concurrent-user capacity.
- **Technical impact:** List work scales with the entire catalogue; cold-cache edit latency grows serially with ingredient count.
- **Likelihood:** Low with tiny seed data but high as the stated product grows.
- **Existing mitigation:** User list is capped at 100; Angular routes are lazy; cancellation tokens flow through most backend calls.
- **Why the existing mitigation is insufficient:** The affected catalogue routes have no bounds and cancellation does not reduce successful over-fetch.
- **Recommended remediation:** Define cursor-paginated, filterable summary endpoints; use the existing assembled full-detail response and consume its embedded ingredient details instead of re-fetching them, or batch only genuinely missing references; cap nested detail arrays as part of BE-001; add appropriate (sort,id) indexes; cap page sizes; instrument query/response size and latency before adding caches.
- **Example of a safer design:** GET /api/v1/recipes?after=...&limit=... returns summaries plus next cursor; GET /{id} returns one assembled detail; search uses indexed normalized columns or a dedicated search service only when justified.
- **Validation steps after fixing:** Seed representative volumes; EXPLAIN queries; measure p50/p95/p99 latency, rows scanned, payload, memory, connection pool, and browser requests; reject excessive limits.
- **Dependencies:** DB-001 migration/index path; ARC-002 contract
- **Estimated effort:** Medium
- **Recommended timing:** Before production

### REL-004: Frontend bootstrap can wait indefinitely for session restoration

- **Severity:** Medium
- **Confidence:** Confirmed
- **Category:** Reliability
- **Status:** Confirmed missing failure bound
- **Affected components:** Angular app initializer, AuthFacade, session/user APIs
- **Evidence:** provideAppInitializer waits for restoreSession$ completion. That observable calls session then current-user APIs and has catch behavior but no explicit timeout; a hung network/API request prevents bootstrap from completing, including public landing/login.
- **File paths and line numbers:** appetee_front/src/app/app.config.ts:26; appetee_front/src/app/core/auth/data-access/auth.facade.ts:35-61; appetee_front/src/app/core/auth/data-access/auth.api.ts; appetee_front/src/app/core/shared/data-access/user/user_auth.api.ts
- **Attack or failure scenario:** API packets stall without completing/erroring, leaving the application blank or permanently loading rather than entering a recoverable guest state.
- **Business impact:** Whole-site availability depends on session API responsiveness, even for visitors who are not signed in.
- **Technical impact:** A global initialization dependency lacks a deadline and fallback UX.
- **Likelihood:** Medium during network degradation, regional failures, proxies, or stalled requests.
- **Existing mitigation:** Ordinary HTTP errors reset session and complete through catchError; auth state restoration avoids UI flicker.
- **Why the existing mitigation is insufficient:** Error handling only runs after an error; a stalled Observable need not terminate promptly.
- **Recommended remediation:** Apply a short explicit timeout and guest fallback; show a recoverable service-status message; consider booting the public shell immediately and restoring authentication asynchronously with guarded route resolution.
- **Example of a safer design:** Bootstrap establishes an unknown auth state immediately, a bounded refresh transitions to authenticated/guest/degraded, and protected navigation waits on that state without blocking public routes.
- **Validation steps after fixing:** Simulate offline, DNS failure, connection refusal, never-completing request, 401/500, and slow response; verify bounded meaningful UI and later retry.
- **Dependencies:** REL-003 client telemetry/availability expectations
- **Estimated effort:** Small
- **Recommended timing:** Before production

### ARC-001: Layer boundaries are coupled to HTTP/storage and query classes mix responsibilities

- **Severity:** Medium
- **Confidence:** Confirmed
- **Category:** Architecture
- **Status:** Confirmed maintainability/testability risk
- **Affected components:** Appetee.Application, RecipeQueries, IngredientQueries, service/repository conventions
- **Evidence:** Application references Microsoft.AspNetCore.App and exposes HttpContext/IFormFile in application abstractions/services. RecipeQueries is roughly 500 lines and combines SQL orchestration, mapping, transaction control, Blob lifecycle, and cleanup; IngredientQueries follows the same pattern. Naming alternates among queries and repositories.
- **File paths and line numbers:** Backend/src/Appetee.Application/Appetee.Application.csproj:1-10; Backend/src/Appetee.Application/Abstractions/Auth/IAuthCookieService.cs; Backend/src/Appetee.Application/Requests/RecipeRequest.cs; Backend/src/Appetee.Infrastructure/Recipes/RecipeQueries.cs:1-498; Backend/src/Appetee.Infrastructure/Ingredients/IngredientQueries.cs; Backend/src/Appetee.Infrastructure/Users/UserRepository.cs
- **Attack or failure scenario:** A new mobile client, background job, import pipeline, or recommendation task must fake HTTP primitives and duplicate transaction/media rules; changes create broad regressions in oversized persistence classes.
- **Business impact:** Slower feature delivery, harder review/testing, and rising defect rate.
- **Technical impact:** Dependency direction and use-case boundaries are blurred; domain rules are tied to transport and infrastructure.
- **Likelihood:** High once planned non-HTTP workflows and new domains are implemented.
- **Existing mitigation:** Three projects create an initial separation; interfaces support dependency injection; controllers are generally thin.
- **Why the existing mitigation is insufficient:** Project folders do not enforce clean boundaries when the inner project directly depends on web types and orchestration lives in infrastructure queries.
- **Recommended remediation:** Keep a modular monolith; organize by business module/use case. Map HTTP DTOs/IFormFile to neutral command/media streams at the API boundary; place invariants/orchestration in application/domain; keep Dapper and Blob behind focused ports; use one consistent persistence vocabulary.
- **Example of a safer design:** Recipes.Application.CreateRecipeHandler coordinates IRecipeRepository, IIngredientCatalog and IMediaStore using a command with Stream/metadata; Infrastructure implements adapters; Api maps multipart form to the command.
- **Validation steps after fixing:** Application/domain build without ASP.NET reference; handlers unit-test with neutral ports; controllers contain only mapping; mutation/failure integration tests remain green.
- **Dependencies:** Decide module boundaries and contracts before large feature additions
- **Estimated effort:** Large
- **Recommended timing:** Later

### ARC-002: API contracts are unversioned, hand-copied, and already drifting

- **Severity:** Medium
- **Confidence:** Confirmed
- **Category:** Architecture
- **Status:** Confirmed current UI defect and contract risk
- **Affected components:** C# DTOs, TypeScript models, controllers, client APIs, placeholder endpoints
- **Evidence:** There is no /api/v1 or documented compatibility policy/generated client. Login/sign-up AuthResult serializes userName while /auth/session serializes username and TypeScript/header read username. Immediately after login/sign-up, the session object's expected property is undefined and the header falls back to Guest until a full-page/bootstrap session restore. IngredientsController declares ActionResult<IReadOnlyList<DietDto>> while returning ingredients. Meal-prep routes expose 501 placeholders and the corresponding frontend worktree was deleted/unwired.
- **File paths and line numbers:** Backend/src/Appetee.Application/Requests/Auth/AuthResult.cs:5-8; Backend/src/Appetee.Application/Dtos/UserSessionDto.cs:3-6; appetee_front/src/app/core/auth/data-access/auth.model.ts:1-4; appetee_front/src/app/core/layout/private-layout/private-header.component.ts:31-34; Backend/src/Appetee.Api/Controllers/IngredientsController.cs:16-20; Backend/src/Appetee.Api/Controllers/RecipesController.cs:36-83; appetee_front/src/app/features/recipes/recipes.routes.ts:3-31
- **Attack or failure scenario:** Current login/sign-up returns a differently named property and displays Guest in the signed-in header; future renames can silently yield more undefined frontend fields, and new clients can rely on placeholder or breaking responses.
- **Business impact:** Login/UI defects, failed releases, and high coordination cost for mobile or additional frontends.
- **Technical impact:** Compile-time checks stop at repository boundaries and cannot detect serialized shape drift.
- **Likelihood:** High; two concrete mismatches already exist.
- **Existing mitigation:** DTOs avoid exposing database row entities directly, and TypeScript models give local typing.
- **Why the existing mitigation is insufficient:** Two separately maintained types can both compile while disagreeing on the wire.
- **Recommended remediation:** Publish reviewed OpenAPI, generate/validate client types, add contract tests and breaking-change detection, establish additive deprecation/version rules, and remove unavailable endpoints until implemented.
- **Example of a safer design:** /api/v1 OpenAPI is generated in CI, linted, diffed against the released contract, and used to generate a thin TypeScript client; domain/application objects remain internal.
- **Validation steps after fixing:** Serialization snapshot tests, generated-client compile, consumer-driven happy/error tests, N-1 compatibility, and deliberate breaking-change gate.
- **Dependencies:** BE-001 status/validation conventions; route/product inventory
- **Estimated effort:** Large
- **Recommended timing:** Before production

### ARC-003: Current domain model cannot safely support planned pricing, planning, and multi-user features

- **Severity:** Medium
- **Confidence:** Confirmed
- **Category:** Architecture
- **Status:** Evidence-based future risk, not a current exploit
- **Affected components:** MySQL schema and recipe/user modules
- **Evidence:** Pricing/nutrition are flattened into recipe/ingredient values without store, currency, source, effective date, normalized unit/conversion, provenance, or calculation version. There is no meal-plan/grocery schema despite 501 routes; recipes lack creator/household/moderation lifecycle; user roles and background-job/idempotency concepts are absent.
- **File paths and line numbers:** Backend/scriptDatabase.sql:66-88,91-121,128-195,241-329; Backend/src/Appetee.Api/Controllers/RecipesController.cs:36-83
- **Attack or failure scenario:** Walmart/multiple-store prices, substitutions, households, recommendations, imported/user-created recipes, notifications, or planning are added by appending nullable columns and duplicating calculations, producing contradictory data and authorization.
- **Business impact:** Expensive rework, unreliable recommendations/prices, and inability to explain or recalculate results.
- **Technical impact:** Missing domain concepts force transport/UI code to become the de facto model.
- **Likelihood:** High if the stated roadmap proceeds.
- **Existing mitigation:** Current relational schema has useful normalized many-to-many tables and works for a small curated catalogue.
- **Why the existing mitigation is insufficient:** Join tables alone do not model temporal/provenance/unit/ownership/workflow semantics.
- **Recommended remediation:** Define bounded modules and ubiquitous concepts before implementing those features: Accounts/Households, Catalog, Recipes, Nutrition, Pricing, Favorites, MealPlanning/Grocery, and Media. Add normalized quantities/units, source/effective dates, ownership/visibility, audit/version, and background-work state only as required.
- **Example of a safer design:** A modular monolith owns separate schemas/namespaces and integration events; Pricing stores store/product/currency/effective facts, Recipe references normalized ingredient amounts, and a versioned calculator produces projections.
- **Validation steps after fixing:** Architecture decision records and domain examples for substitutions, price history, household sharing, ownership, recalculation, import moderation, and partial job failure; enforce module dependency tests.
- **Dependencies:** Product decisions; DB-001 migrations; ARC-001 boundaries
- **Estimated effort:** Large
- **Recommended timing:** Later

### PRIV-001: Data lifecycle, export, deletion verification, and privileged-access operations are undefined

- **Severity:** Medium
- **Confidence:** Confirmed
- **Category:** Privacy
- **Status:** Confirmed technical/operational gap; no legal conclusion
- **Affected components:** User, preference, restriction, favorite/collection, logs, backups, and future user-media lifecycle
- **Evidence:** The schema stores email, username, password hash, client-writable image URL, diet preferences, ingredient restrictions, favorites and collections. Cascades and a delete repository method exist, but no export format, retention schedule, backup-erasure handling, administrator access review/audit, telemetry redaction policy, or privacy runbook is documented/implemented. Current recipe/ingredient Blobs are global catalogue media with no user/actor owner link; there is no current user-profile Blob upload.
- **File paths and line numbers:** Backend/scriptDatabase.sql:91-121,128-195,314-329; Backend/src/Appetee.Infrastructure/Users/UserRepository.cs:29-37; Backend/README.md
- **Attack or failure scenario:** A deletion leaves log/backup copies operationally undefined; support/admin access cannot be reconstructed; a user cannot obtain a complete export; allergy-related preferences appear in overly broad user responses.
- **Business impact:** Privacy incidents, inability to honor product commitments, excess retained data, and weak accountability.
- **Technical impact:** Data lineage and lifecycle stop at relational cascade behavior.
- **Likelihood:** Medium before a broad beta; the public Users API already exposes unnecessary personal/preference data under SEC-001.
- **Existing mitigation:** Passwords are hashed; schema cascades many user join rows; user deletion is implemented.
- **Why the existing mitigation is insufficient:** Cascades do not cover logs, backups, export or access governance, and current deletion is itself unauthenticated. Future user-owned media would add a separate cleanup obligation; current catalogue Blob governance is REL-002.
- **Recommended remediation:** Inventory data classes/purposes/locations; minimize UserDto; define retention/export/delete and client image-URL handling; document backup retention effects; restrict/audit administrative access; redact telemetry; test end-to-end deletion/export. Define cleanup separately if user-owned media is added later; catalogue Blob cleanup belongs to REL-002.
- **Example of a safer design:** A claim-derived account-closure workflow records a request, revokes sessions, deletes/retains current account data by policy, produces a verification record, and documents backup expiry without promising immediate physical erasure; future user-owned media would add an explicit cleanup job.
- **Validation steps after fixing:** Synthetic user export completeness, deletion across DB/cache/log views and any future user-media store, backup-retention verification, admin-access audit review, and data-minimization response tests.
- **Dependencies:** SEC-001; REL-003 backup/log policy
- **Estimated effort:** Large
- **Recommended timing:** Before production

### TEST-002: Security, E2E, migration, resilience, accessibility, performance, and recovery suites are absent

- **Severity:** Medium
- **Confidence:** Confirmed
- **Category:** Testing
- **Status:** Confirmed assurance gap
- **Affected components:** Full stack, CI, staging, and operations
- **Evidence:** Backend has API integration coverage and frontend has 18 passing/1 skipped tests, but no security regression, real-browser E2E, contract, migration, Blob integration, accessibility, concurrency, load, failure-injection, deployment smoke, alert, or backup-restore suite is configured.
- **File paths and line numbers:** Backend/tests/Appetee.Api.Tests; appetee_front/src/app/**/*.spec.ts; appetee_front/src/app/features/auth/sign-up/sign-up.shell.page.spec.ts:180-181; appetee_front/src/app/app.spec.ts:17-21; both .github/workflows
- **Attack or failure scenario:** CSRF/cookie behavior, authorization, malformed uploads, migrations, cross-resource failure, browser accessibility, or deployment recovery regress without detection.
- **Business impact:** Unknown residual risk and expensive production discovery.
- **Technical impact:** Important trust boundaries and nonfunctional properties have no executable specification.
- **Likelihood:** High over ongoing development.
- **Existing mitigation:** Backend tests use real local MySQL and a dedicated database; frontend has targeted auth/guard/component tests; builds and strict type checks pass.
- **Why the existing mitigation is insufficient:** Unit/API happy paths cannot reproduce hostile origins, real cookies, Azure dependencies, volume, concurrency, or recovery.
- **Recommended remediation:** Implement the prioritized matrix in section 12 and run each level in the appropriate environment; do not make destructive recovery/load tests against production.
- **Example of a safer design:** Fast unit/contract/security tests block PRs, isolated MySQL/Blob integration runs in CI, browser/accessibility runs against ephemeral environments, resilience/load runs in staging, and restore/alert drills run on a schedule.
- **Validation steps after fixing:** Prove each suite catches a seeded defect, publishes evidence, has bounded runtime/flakiness ownership, and blocks the intended stage.
- **Dependencies:** Intended security policies/contracts and safe test environments
- **Estimated effort:** Large
- **Recommended timing:** Before production

### SEC-010: Browser headers and sensitive-response cache controls are incomplete

- **Severity:** Low
- **Confidence:** Confirmed
- **Category:** Security
- **Status:** Confirmed defense-in-depth repository gap; deployed edge behavior unable to verify
- **Affected components:** Express frontend host and authenticated/auth responses
- **Evidence:** The API adds nosniff, X-Frame-Options DENY, Referrer-Policy no-referrer, and production HSTS. Express only serves static/fallback content and sets no explicit CSP/Trusted Types, frame-ancestors/XFO, nosniff, Referrer-Policy, Permissions-Policy, or cache policy. Auth/session/user responses do not explicitly use Cache-Control: no-store.
- **File paths and line numbers:** Backend/src/Appetee.Api/Program.cs:379-407; appetee_front/server.js:10-18; appetee_front/src/index.html:9-12; appetee_front/src/styles/_theme.scss:1; Backend/src/Appetee.Api/Controllers/AuthController.cs:19-55; Backend/src/Appetee.Api/Controllers/UsersController.cs:24-78
- **Attack or failure scenario:** A framing/content-type/referrer/browser-feature weakness or cached authenticated response increases impact of another flaw; a future injection executes without a restrictive CSP.
- **Business impact:** Increased browser attack impact and possible sensitive-response retention on shared/intermediary caches.
- **Technical impact:** Browser policy depends on unverified App Service/edge defaults rather than application-owned configuration.
- **Likelihood:** Low–Medium as defense in depth; no XSS exploit or cache disclosure was demonstrated and Angular template escaping is a strong control.
- **Existing mitigation:** API headers/HSTS are good, Angular avoids unsafe HTML/sanitizer bypasses, and production emits no source maps.
- **Why the existing mitigation is insufficient:** The document host controls the most important CSP/framing policy; API headers do not automatically protect the separate frontend origin.
- **Recommended remediation:** Set CSP with frame-ancestors, object-src, base-uri and tightly scoped connect/img/font/style sources; add nosniff/referrer/permissions policy; disable Express signature; define immutable hashed-asset caching, no-cache/must-revalidate for index.html, and private/no-store for auth/session/user data; verify at the public edge.
- **Example of a safer design:** A nonce/hash-based frontend CSP is emitted by the host, external fonts/images are self-hosted or explicitly allowed, index.html uses no-cache/must-revalidate, hashed assets are immutable, and sensitive API routes are private/no-store.
- **Validation steps after fixing:** Inspect real production headers/cache behavior; run CSP report-only then enforcing tests; attempt framing; verify browser storage/cache after logout and no breakage of Angular/Material/Blob images.
- **Dependencies:** Final external asset and custom-domain design
- **Estimated effort:** Medium
- **Recommended timing:** Before production

### PERF-002: Static asset, external image/font, cache, and compression controls are incomplete

- **Severity:** Low
- **Confidence:** Confirmed
- **Category:** Performance
- **Status:** Confirmed optimization/readiness gap
- **Affected components:** Express host, Angular image/font usage
- **Evidence:** Express has no explicit compression or cache policy. index.html loads Roboto and Material Icons while _theme.scss separately imports Inter; home uses a resized hard-coded Unsplash URL. No NgOptimizedImage, lazy loading, or responsive srcset/sizes strategy was found. Recipe-card/feature/header images and admin previews reserve some dimensions/aspect, so dimension handling is inconsistent rather than absent.
- **File paths and line numbers:** appetee_front/server.js:10-18; appetee_front/src/index.html:9-12; appetee_front/src/styles/_theme.scss:1; appetee_front/src/app/features/home/home.page.ts:52-53; appetee_front/src/app/core/shared/ui/recipe-card/recipe-card.component.html:3-9; appetee_front/src/app/features/landing/components/feature-item.component.html:3-8; appetee_front/src/app/core/layout/private-layout/private-header.component.scss:26-27; appetee_front/src/app/core/layout/public-layout/components/public-header.component.scss:32-33; appetee_front/src/app/features/admin-recipes/admin-recipes.page.scss:310-328; appetee_front/src/app/features/admin-recipes/admin-recipes-success.page.scss:81-97
- **Attack or failure scenario:** Repeat visitors revalidate too much, responsive variants are not selected for device conditions, and third-party font/image latency/privacy/availability becomes part of the page. The audited Unsplash image is resized and no current large-image/LCP defect was measured.
- **Business impact:** Slower UX, unnecessary bandwidth/cost, and inconsistent presentation.
- **Technical impact:** Delivery policy is delegated to host defaults and external origins.
- **Likelihood:** High as routine inefficiency; current bundle itself is within budget.
- **Existing mitigation:** Lazy routes, hashed production assets, bundle budgets, no source maps, and an 89.55 kB estimated initial transfer are positive.
- **Why the existing mitigation is insufficient:** JS bundle health does not optimize HTML caching, compression, fonts, or content images.
- **Recommended remediation:** Self-host/subset fonts, optimize/responsive-size images with consistent dimensions and srcset/sizes, lazy-load below-fold images while prioritizing a measured LCP image, set Brotli/gzip and immutable cache headers for hashes, keep index revalidating, and consider CDN only after measurement.
- **Example of a safer design:** The host emits long immutable caching for hashed assets, short/no-cache for index/config, compressed content, and responsive local/Blob image variants with explicit dimensions.
- **Validation steps after fixing:** Lighthouse/WebPageTest under mobile throttling, cache-repeat test, layout-shift and LCP measurement, content-encoding/header inspection, and third-party request inventory.
- **Dependencies:** SEC-010 CSP/cache design
- **Estimated effort:** Medium
- **Recommended timing:** Soon after production

### FE-004: Debug residue, subscription cleanup, validation caps, and localization readiness need hardening

- **Severity:** Low
- **Confidence:** Confirmed
- **Category:** Frontend
- **Status:** Confirmed maintainability/quality gap
- **Affected components:** Signup wizard/guard, headers/forms, admin form, formatting
- **Evidence:** Production retains console calls. The wizard constructor logs only its initial four empty strings—not live credentials—and guard logs only validity/path. Router and form subscriptions lack explicit teardown in smaller components. One any remains. Client forms lack comprehensive maximum lengths/counts/numeric/file dimensions, and formatting/unit/currency/internationalization policy is not centralized.
- **File paths and line numbers:** appetee_front/src/app/features/auth/sign-up/sign-up.wizard.ts:23,32-39; src/app/features/auth/sign-up/sign-up.wizard.guard.ts:19-20; src/app/core/layout/private-layout/private-header.component.ts:52-57; src/app/features/auth/sign-up/steps/step-account.page.ts:57-58; src/app/features/admin-recipes/component/ingredient-creation.dialog.ts:26
- **Attack or failure scenario:** Recreated components accumulate subscriptions, debug output adds noise, boundary inconsistencies reach the server, and pricing/unit displays diverge across locales.
- **Business impact:** Minor leaks/bugs and rising maintenance cost rather than a demonstrated credential disclosure.
- **Technical impact:** Lifecycle and presentation rules are inconsistently applied.
- **Likelihood:** Medium as the UI grows.
- **Existing mitigation:** Strict TypeScript/templates, typed forms, takeUntilDestroyed in complex admin code, and object-URL revocation.
- **Why the existing mitigation is insufficient:** Strict typing does not unsubscribe Observables or define business display/validation limits.
- **Recommended remediation:** Remove production console residue and add no-console lint; use takeUntilDestroyed/async pipe; eliminate any; mirror server caps for UX; centralize Intl/date/currency/unit formatting and localization keys.
- **Example of a safer design:** Shared typed validators derive display constraints from versioned contract metadata, subscriptions are template- or DestroyRef-managed, and display services use locale/currency/unit context.
- **Validation steps after fixing:** Recreate/destroy components under subscription instrumentation, inspect optimized bundles/console, run lint, test server/client boundary parity and two locales/unit systems.
- **Dependencies:** BE-001/ARC-002 boundary contract
- **Estimated effort:** Medium
- **Recommended timing:** Soon after production

### BE-002: Naming, dead code, formatting, and quality automation reduce maintainability

- **Severity:** Low
- **Confidence:** Confirmed
- **Category:** Backend
- **Status:** Confirmed quality debt
- **Affected components:** Backend naming/controllers/interfaces and repository automation
- **Evidence:** The interface filename IBlopStorageService.cs is misspelled although the declared symbol is IBlobStorageService; an ingredient response is declared as DietDto; method/action casing is inconsistent; commented endpoint blocks and stale comments remain; dotnet format reports 37 whitespace diagnostics; no formatter/analyzer gate is enforced.
- **File paths and line numbers:** Backend/src/Appetee.Infrastructure/Data/IBlopStorageService.cs; Backend/src/Appetee.Api/Controllers/IngredientsController.cs:14-20; Backend/src/Appetee.Api/Controllers/AuthController.cs:27-86; Backend/.github/workflows/master_appeteeapi.yml
- **Attack or failure scenario:** Developers select or extend the wrong abstraction/contract, review noise hides substantive changes, and dead comments diverge further.
- **Business impact:** Slower onboarding and higher change defect rate.
- **Technical impact:** Inconsistent vocabulary and unenforced style obscure boundaries.
- **Likelihood:** High as ordinary maintenance friction.
- **Existing mitigation:** Release build has zero compiler warnings and nullable reference types are enabled.
- **Why the existing mitigation is insufficient:** Compiler success does not validate naming, dead code, formatting, or architecture consistency.
- **Recommended remediation:** Rename deliberately with compatibility awareness; remove dead/commented routes; correct DTO/action names; adopt editorconfig, dotnet format, analyzers, warnings-as-errors policy, and architecture tests.
- **Example of a safer design:** Module vocabulary is documented and enforced by analyzers/CI; inactive work stays in version control history or feature branches, not commented production controllers.
- **Validation steps after fixing:** Clean build/test, zero format/analyzer findings, OpenAPI diff review, and repository search for superseded symbols/comments.
- **Dependencies:** ARC-001/002 naming and contract decisions
- **Estimated effort:** Medium
- **Recommended timing:** Soon after production

### DOC-001: Deployment, test, migration, and operational documentation is stale/incomplete

- **Severity:** Low
- **Confidence:** Confirmed
- **Category:** Documentation
- **Status:** Confirmed documentation gap
- **Affected components:** Both READMEs and product/operations documentation
- **Evidence:** Frontend README says the backend is not deployed while production environment code points to a public App Service and a backend production workflow exists. Backend Azure integration remains TODO. Dedicated test DB behavior, destructive scripts, migrations, rollback, health, recovery, alerting, access, and incident processes are not documented.
- **File paths and line numbers:** appetee_front/README.md:24-26; appetee_front/src/environments/environment.production.ts:2; Backend/README.md:5-23,45-52; Backend/docs/product/product-spec.md
- **Attack or failure scenario:** A maintainer follows outdated setup/deployment assumptions, applies a destructive script, misses a required secret/role, or cannot recover an incident consistently.
- **Business impact:** Operational error, longer onboarding/incidents, and knowledge concentration.
- **Technical impact:** The executable system and stated operating model disagree.
- **Likelihood:** High during handoff or emergency work.
- **Existing mitigation:** READMEs identify the basic stack and Azure resources; some configuration validation is self-documenting.
- **Why the existing mitigation is insufficient:** Resource names and aspirations are not deploy, test, restore, or incident procedures.
- **Recommended remediation:** Update architecture/setup/test docs; mark destructive SQL; document configuration contracts, migration/release/rollback, health/runbooks, RPO/RTO/restore, access/secret rotation, dependency patching, and ownership; link ADRs.
- **Example of a safer design:** A versioned operator guide maps each environment, required setting, deployment gate, smoke check, rollback/restore procedure, alert owner, and evidence date.
- **Validation steps after fixing:** A new maintainer performs clean setup/test/staging deploy from docs; run a tabletop incident and isolated restore; review docs in release PRs.
- **Dependencies:** Decisions from OPS-001, DB-001, REL-003
- **Estimated effort:** Medium
- **Recommended timing:** Before production

## 7. Authentication and authorization review

### Endpoint authorization matrix

| Method | Route | Authentication required | Authorization required | Ownership validation | Main risk |
|---|---|---|---|---|---|
| POST | /api/auth/sign-up | No | None | N/A | Password logging, weak policy, no throttling |
| POST | /api/auth/login | No | None | N/A | Password logging, timing/enumeration, stuffing |
| POST | /api/auth/logout | No metadata; cookie cleared if present | None | Current browser cookie only | CSRF logout; no server revocation |
| GET | /api/auth/session | Manual principal check; no Authorize metadata | None | Ticket identity only; no DB check | Stale/deleted account remains authenticated elsewhere |
| GET | /api/users/{id} | **No** | **None** | **None** | Critical BOLA/IDOR and personal-data exposure |
| GET | /api/users/exists-by-email | No | None | None | Exact account enumeration |
| GET | /api/users/me | Yes | Authenticated user | Yes, claim-derived ID then DB lookup | Sound binding; add no-store/revalidation |
| GET | /api/users | **No** | **None** | **None** | Bulk ID/username/email exposure |
| PUT | /api/users/{id} | **No** | **None** | **None** | Arbitrary profile/account modification |
| DELETE | /api/users/{id} | **No** | **None** | **None** | Arbitrary cascading account deletion |
| GET | /api/diets | No | None | N/A | Public catalogue; intended access must be documented |
| GET | /api/ingredients | No | None | N/A | Unbounded public catalogue; comment claims auth |
| GET | /api/recipes | Yes | Authenticated user | N/A, global catalogue | Unbounded result |
| GET | /api/recipes/{id} | Yes | Authenticated user | N/A, global catalogue | Stable DTO/versioning absent |
| GET | /api/recipes/meal-preps | Yes | Authenticated user | Not implemented | 501 public contract; future ownership required |
| GET | /api/recipes/meal-preps/{id} | Yes | Authenticated user | Not implemented | 501 public contract; future BOLA risk |
| POST | /api/recipes/meal-preps | Yes | Authenticated user | Not implemented | 501; future CSRF/idempotency/ownership |
| PUT | /api/recipes/meal-preps/{id} | Yes | Authenticated user | Not implemented | 501; future BOLA/concurrency |
| DELETE | /api/recipes/meal-preps/{id} | Yes | Authenticated user | Not implemented | 501; future destructive BOLA |
| GET | /api/admin/ingredient-details/{id} | Yes | **Any authenticated user; no Admin policy** | N/A, global catalogue | Broken function authorization |
| POST | /api/admin/ingredient-details | Yes | **Any authenticated user; no Admin policy** | N/A | Privilege escalation, CSRF, unsafe upload |
| POST | /api/admin/recipe-details | Yes | **Any authenticated user; no Admin policy** | N/A | Privilege escalation, CSRF, trusted client totals/upload |
| PUT | /api/admin/recipe-details/{id} | Yes | **Any authenticated user; no Admin policy** | No owner/version check | Privilege escalation and lost update |
| ANY | /error | No | None | N/A | Direct request logs/returns 500; no method constraint |

Evidence for active routes: Backend/src/Appetee.Api/Controllers/AuthController.cs:12-55; UsersController.cs:13-97; DietsController.cs:8-19; IngredientsController.cs:8-20; RecipesController.cs:10-83; AdminController.cs:13-65; ErrorsController.cs:35-40. Program.cs:437 maps controllers and no other application/minimal/health endpoints. Swagger middleware exists only in Development (Program.cs:414-423).

### Roles and policies

No real role or policy model exists. The only role text is the commented Admin argument at AdminController.cs:14. Cookie claims contain NameIdentifier and Name, and the schema has no role/permission or security-stamp columns. The immediate design should be policy-based, with permission data loaded from a durable source and tested for removal/stale-ticket behavior. Do not simply add an unvalidated role string from registration or the browser.

### Object ownership

- User-object enforcement is absent except /api/users/me. SEC-001 is the priority.
- Recipes are currently a global curated catalogue, so reads do not require per-user ownership; administrative writes still require function permission and concurrency control.
- Meal plans, favorites, and collections have no active API implementation. Before exposing them, every ID must be resolved through the current user/household scope rather than loaded globally and checked only in Angular.
- Future user-created recipes require creator/household/visibility/moderation rules in the database and application policy, not just a userId property accepted from a DTO.

### Cookie and session analysis

Positive cookie choices are that the current/default name uses the __Host- prefix, Path=/, Secure=Always, HttpOnly, a protected ASP.NET ticket, 401/403 status responses instead of redirect, and production HTTPS/HSTS. Configuration can override the name and must preserve prefix rules. No caller-supplied session identifier or classic fixation path was found; SignInAsync issues/replaces a protected authentication ticket. Still add login and privilege-change ticket-rotation/fixation regression tests. Risks are SameSite=None, hard-coded persistent ExpiresUtc=14 days in addition to configured sliding TimeSpan, no absolute lifetime, no server-side session/security stamp, no role/account revalidation, no MFA/email-verification/password-reset implementation, no reauthentication, and no authentication-event audit. Data Protection key persistence/slot behavior is unable to verify.

### CSRF and CORS

Production CORS is fail-closed when the origin list is absent and uses exact origins with credentials, which is materially better than wildcard credentials. Development CORS is broader but still named. However, CORS does not establish request intent. Because the cross-origin cookie is SameSite=None, administrative multipart POSTs are realistically CSRFable as described in SEC-005. Add antiforgery/custom-header plus Origin/Fetch Metadata validation or collapse to a same-origin/BFF topology. Re-test real custom domains and preflight behavior after deployment.

### Account enumeration and authentication lifecycle

GET /api/users/exists-by-email is an explicit oracle. Login's generic body is positive, but absent-user execution skips the password hash. There is no throttle/lockout/backoff or server password strength beyond nonblank. Add a dummy-hash path, generic registration/recovery behavior where feasible, length/breached-password checks, per-account and network rate partitions, email verification, secure reset token indexing/expiry/one-time use, session revocation, and security-event metrics. Authentication tests must measure behavior rather than rely only on response text.

### Injection and unsafe-sink review

- Reviewed Dapper statements bind request values as parameters. Bulk helpers generate parameter names and populate DynamicParameters; no request-controlled table/column selection or confirmed SQL injection path was found. Continue with a regression corpus and least-privilege database identity because source review is not a proof of absence.
- No process-spawning/shell execution path was found in application code, so no command-injection sink was identified.
- Angular uses interpolation/template binding and contains no reviewed innerHTML, sanitizer-bypass, eval or new Function sink. Recipe/user text therefore benefits from Angular escaping. No confirmed stored, reflected or DOM XSS was found, but user text still needs the browser XSS corpus and frontend CSP in SEC-010.
- Request DTOs, rather than Dapper row/entity objects, form most write boundaries, reducing generic over-posting. DB-002 is a concrete business-field over-trust case: derived totals should not be client writable.
- Upload Blob names are server-generated GUIDs and the configured storage URL is constrained to an HTTPS Azure Blob account host without query/userinfo, so no filename path traversal or arbitrary storage-host injection was found. Content validation remains materially insufficient under SEC-004.
- Cookie middleware returns 401/403 instead of redirecting to a client-supplied URL, and reviewed Angular redirects use application literals. No open redirect was found. No confirmed response-header or JSON-serialization injection was found.
- AuthController's raw record logging is both a credential disclosure (SEC-003) and an unsafe log practice; structured allowlisted events should prevent line-breaking/forgery and personal-data leakage.

## 8. Data and database review

### Schema and integrity

| Area | Existing strengths | Risk/gap | Required action |
|---|---|---|---|
| Users | Unique email, password hash, FKs/cascades | No unique normalized username, account state, email verification, role, security stamp, audit/version; user DTO is overbroad | Add identity/security lifecycle fields deliberately; minimize DTO; claim-scoped CRUD |
| Password reset | Separate reset table with expiry/used concepts | token_hash lookup uniqueness/index and complete application flow absent | Store only strong hashes, unique/index lookup, one-time atomic consume, rate/audit tests |
| Recipes | Checks and normalized ingredient/diet joins | Client controls totals; no owner/visibility/moderation/audit/version | Server calculation, ownership/workflow, actor/version |
| Ingredients/nutrition | Unique ingredient name, checks and referenced detail data | Unit/provenance/effective-date model insufficient | Normalize units and version sources before pricing/nutrition expansion |
| Favorites/collections | FKs and composite membership keys | No service/API/ownership tests; deletion/visibility semantics unproven | Implement within current-user/household module with scoped queries |
| Diet/restrictions | Normalized join tables and cascades | Potentially sensitive preferences returned through public user routes | Close SEC-001 and minimize purpose-bound responses |
| Meal plans/grocery | None | Five 501 routes but no persistent ownership/integrity model | Remove placeholder routes; design module before implementation |

### Transaction and consistency risks

Sign-up and multi-table catalogue operations use explicit transactions, connections/transactions are disposed, reference IDs are validated, and Dapper values are parameterized. No SQL injection was found in the reviewed queries; generated bulk SQL uses generated parameter placeholders and DynamicParameters rather than concatenated user values. This does **not** reduce authorization, logic, or resource-exhaustion findings.

MySQL transactions cannot include Blob Storage. Current create/update compensation is best effort and lacks idempotency/reconciliation (REL-002). Recipe updates also lack optimistic concurrency, so stale and concurrent writes are silent last-writer-wins (DB-003). Use a durable media state/outbox and row-version checks.

### Index recommendations

Do not add indexes speculatively; confirm with production-like EXPLAIN and query telemetry. Based on current/planned access patterns:

- retain current FK/reverse lookup and composite join-key indexes;
- add a normalized unique username only after collision/data migration analysis;
- add a unique/indexed password-reset token hash plus expiry/used support for the exact consume query;
- design recipe cursor ordering and add a matching composite index such as (created_at, id) only if that becomes the contract;
- index ownership/state/visibility columns together with the actual user/household listing order;
- avoid offset scans for large catalogues; page with a stable unique tie-breaker.

### Data lifecycle and delete behavior

Current FK cascades reduce relational orphaning but anonymous DELETE makes them dangerous. Decide hard versus soft deletion per data class; if soft deletion is required for moderation/audit, make uniqueness and query filters explicit rather than adding an ad hoc flag. Account closure must revoke sessions, handle the client-writable image_url reference, cover caches/logs, record verification, and document backup retention. Current catalogue Blobs are not user-owned; future user-media ownership needs an explicit deletion policy. Administrative mutations need actor/time/version audit, with access to the audit trail itself restricted.

### Database connection and production settings

MySqlConnector is async and connections are disposed; cancellation tokens are broadly propagated. Repository configuration does not explicitly establish application command timeouts, retry policy, pool/connection-budget sizing, deadlock handling, isolation choices, read-only/reporting identities, or TLS certificate verification for production. The local test builder disables TLS only for a local test host. Production app/migration DB users, TLS, firewall/private endpoint, pool limits, slow-query logs, HA, maintenance, and PITR are unable to verify.

### Migration, backup, and restore

Never run scriptDatabase.sql or initObjectDatabase.sql against production. Adopt versioned expand/contract migrations, validate them against clean and previous schemas, and integrate a backup/PITR preflight with staged release. Define MySQL and Blob RPO/RTO and restore them coherently: a database restored to time T may reference Blob objects deleted after T unless retention/versioning and reconciliation are designed together.

## 9. Architecture and maintainability review

### Current strengths

- Thin controllers, dependency injection, nullable reference types, explicit DTO/request boundaries, and asynchronous cancellation-aware data access.
- Initial Api/Application/Infrastructure separation and interface-driven password/cookie/DB/Blob implementations.
- Angular standalone/lazy feature routes, strict TypeScript/template checks, feature/core/shared separation, typed forms, and centralized API interceptors.
- Relational normalization for diets, restrictions, recipe ingredients, favorites, and collections.
- A modular monolith is appropriate; no evidence currently justifies microservices.

### Current weaknesses and likely symptoms

| Concern | Why/when it hurts | Developer symptom | Target direction | When |
|---|---|---|---|---|
| HTTP types in Application | Background jobs/import/mobile flows | Handlers require HttpContext/IFormFile or duplicated logic | Neutral commands/ports at API boundary | Start before new non-HTTP workflows |
| Large mixed query classes | More write variants/failure paths | Broad fragile edits and difficult unit tests | Use-case handler plus focused repositories/media port | Refactor around high-risk writes |
| Unversioned hand-copied contracts | Independent deployments/additional clients | Runtime undefined fields and coordination freezes | Reviewed OpenAPI/generated client/compatibility policy | Before production |
| Global/stale frontend stores | More roles/accounts/features | Cache leaks, hidden load ordering, reset bugs | Principal-scoped feature stores with full reset/cancellation | Before broader auth features |
| Transport/UI owns calculations | More units/stores/prices | Inconsistent totals and impossible recalculation | Domain calculation with provenance/version | Before pricing/nutrition expansion |
| Missing ownership/workflow concepts | User content/households/moderation | Scattered if-statements and IDOR regressions | Module-owned authorization and lifecycle | Before those features |
| Configuration tied to hostnames | Slots/custom domains/regions | Rebuilds and CORS failures during promotion | Validated environment contract/runtime frontend config | Before staging/slots |
| Placeholder/dead routes | Feature churn | Clients bind to 501 or redirects mask gaps | Capability/route inventory and feature flags | Now |

### Recommended target modular-monolith structure

The current structure needs meaningful changes, but they should be evolutionary and use-case driven:

~~~text
Backend/src/
  Appetee.Api/
    Contracts/V1/
    Middleware/
    Modules/{Accounts,Catalog,Recipes,Favorites,MealPlanning}/
  Appetee.Application/
    Common/
    Accounts/{Commands,Queries,Policies}/
    Catalog/{Commands,Queries}/
    Recipes/{Commands,Queries,Calculation}/
    Favorites/
    MealPlanning/
  Appetee.Domain/
    Accounts/
    Catalog/
    Recipes/
    Shared/
  Appetee.Infrastructure/
    Persistence/{Accounts,Catalog,Recipes,...}/
    Media/
    Identity/
    Observability/

appetee_front/src/app/
  core/{api,auth,layout,session,config}/
  features/{accounts,catalog,recipes,favorites,meal-planning}/
    data-access/
    pages/
    ui/
    feature.routes.ts
  shared/{ui,forms,formatting}/
~~~

Each module should own invariants and persistence contracts; cross-module calls should use explicit application interfaces/events. Keep database deployment unified while module boundaries mature. Add background processing only for durable asynchronous needs such as media scanning/reconciliation, notifications, imports, and recalculation—not as a reason to split services prematurely.

### Changes needed now

1. Establish claim/policy/current-user boundaries and stable error/contract conventions.
2. Move authoritative recipe calculation server-side.
3. Add versioned migrations and optimistic/audit/media workflow primitives.
4. Remove HTTP types from newly written application use cases; do not require a big-bang rewrite.
5. Repair frontend routes and principal-scoped resets; generate/contract-test API types.

### Changes that can wait

- Split existing read-only Dapper classes only when touched or measured as a bottleneck.
- Add distributed cache/search infrastructure only after bounded APIs, indexes, and telemetry demonstrate need.
- Introduce separate services only for an independently scaled/owned workload with measured constraints.
- Build pricing, recommendation, household, import, and notification modules when their product rules are defined; do not pre-build speculative abstractions.

## 10. Reliability and observability review

| Area | Current state | Production risk | Required improvement |
|---|---|---|---|
| Error handling | Production maps known ApiException types to sanitized ProblemDetails-like responses with trace IDs and no-cache; current Development path bypasses it | Environment-dependent contracts; 11 tests return 500 | One IExceptionHandler/ProblemDetails contract everywhere; control only detail disclosure |
| Request correlation | Middleware adds trace ID/path/method scope | Successful status/duration are not logged; no end-to-end dependency trace | Structured completion logs and OpenTelemetry traces with privacy-safe correlation |
| Logging | Console timestamps/scopes and structured Blob/error logs | Auth passwords are logged; few components emit useful events; retention/access unknown | Remove secrets, allowlist fields, central redaction, event taxonomy, access/retention review |
| Metrics | None found | No SLI for rate, errors, duration, saturation, auth abuse, DB/Blob | Request/dependency/business/security metrics with owners and cardinality limits |
| Tracing | ASP.NET trace IDs appear in errors/log scope | No exporter or DB/Blob/client trace evidence | Application Insights/OpenTelemetry W3C context and dependency spans |
| Liveness/readiness | No endpoints; SPA fallback returns index for arbitrary GET | App Service cannot distinguish alive from ready/dependency failure | /health/live and bounded/cached /health/ready; configure App Service health check |
| Startup | Critical production configuration validates/fails fast | Schema, DB and Blob readiness/identity are not deployment-gated | Validate configuration shape at startup; readiness/smoke validates live dependencies |
| Cancellation/shutdown | Request cancellation propagates through most Dapper/Blob calls; no fire-and-forget work found | Cleanup may reuse a cancelled token; future jobs need drain semantics | Independent bounded compensation token; hosted-service shutdown/idempotency rules |
| Timeouts | No explicit DB command or frontend bootstrap deadlines found | Hung dependency or request can consume resources/blank UI | Per-operation deadlines derived from request budget; DB command timeouts; client timeout/fallback |
| Retry | Azure SDK supplies client defaults; no explicit DB transient policy | Blind retries of mutations can duplicate writes; no retry budget/jitter telemetry | Retry only classified transient/idempotent operations with jitter/budget; use idempotency/versioning |
| Partial failure | Relational transactions and best-effort Blob compensation | Orphans, missing media, lost updates | Durable outbox/media states/reconciliation plus fault tests |
| Alerts/diagnosis | Trace IDs help one request | No dashboards, alerts, availability tests, ownership/on-call/runbooks | SLO dashboards and alerts for availability, 5xx, latency, auth abuse, DB/Blob, deploy and cost |
| Recovery | Provider resources are named | No tracked RPO/RTO, restore/DR runbook, coordinated MySQL/Blob restore evidence | Define backups/retention, isolated restore drills, reference reconciliation, incident exercises |
| Deployment failure | OIDC production deploy exists | No slot/readiness/smoke/observation/rollback | Build-once protected staging promotion and tested rollback/roll-forward |

Production error disclosure is comparatively good: Swagger and DeveloperExceptionPage are environment limited, production responses avoid exception detail, and trace IDs support supportability. That positive is conditional on the deployed environment name and proxy configuration being correct. Forwarded-header/proxy trust behavior, Application Insights collection, App Service health settings, availability monitoring, and data-retention settings require live verification.

Recommended initial service objectives should be based on measurement, not invented numbers. Instrument availability, request duration by route/status, DB duration/rows/pool saturation, Blob duration/status/retries, login failure/rate-limit events, queue/reconciliation age, frontend bootstrap success/time, and deployment health. After a representative beta baseline, choose error-budget-backed SLOs and alert on symptoms rather than every individual exception.

## 11. Performance and scalability review

### Current observations

- Angular production build succeeds. Initial bundle is 318.45 kB raw and 89.55 kB estimated transfer, below the 500 kB warning budget. Feature routes are lazy and outputs are hashed; no source maps were emitted.
- admin-recipes.page.scss is 7.12 kB, above the configured 4 kB warning but below the 8 kB error. This is not itself a production blocker.
- GET recipes and ingredients are unbounded. Recipe assembly reads broad result sets; one cold-cache admin edit may issue sequential ingredient-detail requests even though the full recipe response embeds them.
- User listing alone has a take cap of 100, but it should not be public at all.
- Static host cache/compression policies, responsive image srcset/sizes and self-hosted fonts are absent; explicit dimension handling exists in some components but is inconsistent.
- No application-level API response compression is configured; whether App Service or an edge layer compresses responses is unable to verify. Add it only after measuring payload/CPU tradeoffs and keep output caching authorization-sensitive.
- Async APIs and cancellation are broadly used. Most I/O is asynchronous, but recipe and ingredient writes still use synchronous BeginTransaction, Commit, and Rollback boundaries; no obvious long-running synchronous file processing was found.
- Replace those remaining transaction boundaries with BeginTransactionAsync, CommitAsync, and RollbackAsync using appropriate cancellation; keep compensation on an independent bounded token, then concurrency/load-test behavior.

### Future bottlenecks

| Layer | Risk as data/traffic grows | Correct first response |
|---|---|---|
| Browser | Unbounded arrays/maps, redundant cold-cache ingredient hydration, large images | Paginated summaries, consume embedded/batched detail, bounded/principal-scoped cache, responsive images |
| Express/App Service | Static Node process serves all assets without explicit cache/compression/CDN policy | Correct headers/compression; measure; use App Service/CDN/static hosting appropriate to traffic |
| API | Large bodies/lists, no rate limits/output caching, cross-resource writes | Enforce limits/pagination/rate policy; measure before cache; idempotent commands |
| MySQL | Full catalogue scans, missing cursor indexes, unknown command timeout/pool budget | EXPLAIN with representative data, matching composite indexes, command deadlines, pool capacity |
| Blob | No explicit application-specific media limit, variants/lifecycle/reconciliation | Canonical bounded media, variants, private delivery/CDN decision, lifecycle/reconciliation |
| Scaling | More API instances multiply DB connections and require shared Data Protection keys | Calculate per-instance pool budget, test autoscale, persist keys, verify health/slot behavior |
| Search/recommendations | SQL filters and UI scans become expensive | Define search/recommendation requirements; add a separate index/service only with measured need |
| Pricing/nutrition | Recalculation and store/effective history grow | Versioned facts/calculations and background batch processing with checkpoints |

### Measurements required before optimization

1. p50/p95/p99 API latency, error rate, throughput, request/response size by route.
2. MySQL EXPLAIN/rows examined, query time, locks/deadlocks, CPU/storage IOPS, active/queued connections and pool waits.
3. Blob request latency/status/retry, object size/count, orphan/reference ratio and egress.
4. Frontend LCP/INP/CLS, bootstrap/session time, route chunks, image bytes, third-party requests and cache hit behavior on representative devices.
5. Load tests for login, paginated recipe summary/detail, and bounded upload in isolated staging; capture saturation and recovery rather than only maximum requests/second.
6. App Service instance CPU/memory/restarts, cold start, health removal, scale-out connection multiplication, and cost per representative workload.

Do not add a general cache before authorization, invalidation, staleness, and principal scope are explicit. Public catalogue summaries may become cacheable; session, user, admin, and preference responses should remain private/no-store.

## 12. Testing assessment

### Existing tests

Backend has 39 MySQL-backed integration tests covering sign-up/login/cookies, duplicates/invalid credentials, session/logout, user/catalogue/recipe/admin happy and negative paths. Tests use a dedicated appetee_backend_tests database, rewrite schema targeting, replace Blob Storage with an in-memory fake, and disable parallelization because the database is shared. The audited Release run was **28 passed, 11 failed, 0 skipped** due REL-001. Authorization expectations for SEC-001/002 are unsafe and must be rewritten. There is no separate isolated backend unit-test project for application/domain policy, validation, calculation, or failure-orchestration logic.

Frontend has six spec files with **18 passed and 1 skipped**, covering app/landing, guest guard, AuthFacade, login, and sign-up flows. The sign-up loading test is skipped (sign-up.shell.page.spec.ts:180-181), and the nominal app title test has its only assertion commented (app.spec.ts:17-21), making one of the 18 passing tests vacuous. Both application and spec strict type checks pass. There is no browser E2E project.

Neither frontend nor backend coverage was measured/reported in this audit; pass counts are not a coverage baseline. Establish the first reviewed baseline before enabling the ratchet proposed in section 15.

Tested categories are therefore limited to current unit/component behavior and local API integration with MySQL/fake Blob. No claim is made that every attack, browser, infrastructure, concurrency, scale, accessibility, or recovery path was tested.

### Recommended test matrix

| Test name | Test level | Component | Scenario | Expected result | Priority | Where |
|---|---|---|---|---|---|---|
| Application/domain policy unit tests | Unit | Auth policies, validators, recipe calculation, media orchestration | Role/ownership decisions, boundaries/rounding and state-transition failure branches without HTTP/MySQL | Fast deterministic branch coverage of business rules | P0 | Local + PR CI |
| Stable error contract | API integration | Error middleware/all controllers | Current 11 validation/auth/conflict cases plus unexpected exception | 39/39 baseline pass; correct 400/401/409/500 ProblemDetails, safe detail/trace | P0 | Local + PR CI |
| Anonymous authorization matrix | API integration | Every controller route | Omit cookie for every protected/read/write route | Only intended public catalogue/auth routes succeed; otherwise 401 | P0 | PR CI |
| Two-user BOLA/IDOR matrix | API integration | Users; future favorites/collections/meal plans | User A sends every user B/resource B ID for GET/PUT/DELETE | 403 or nondisclosing 404; no read/mutation | P0 | PR CI |
| Admin privilege matrix | API integration | AdminController | Ordinary, moderator, admin, removed-admin, stale cookie | Only active authorized policy succeeds; audited denial | P0 | PR CI |
| CSRF hostile-origin matrix | Real browser + API | Logout/admin/all mutations | Cross-site form, FormData/no-cors, JSON/preflight, missing/bad token/origin | No side effect; configured origin with valid token succeeds | P0 | CI ephemeral + staging |
| Cookie integrity/lifecycle | API + browser | Authentication | Missing, malformed, modified, expired, copied, revoked, rotated-key cookie | 401/no crash/leak; defined revocation and slot/restart behavior | P0 | PR CI + staging |
| Login abuse/enumeration | API timing/rate | Auth/user existence | Repeated guesses; existent/nonexistent/wrong password; distributed sources | Uniform external behavior; bounded timing; 429/backoff and metrics | P0 | CI bounded + staging |
| Password policy bypass | API integration | Sign-up | UI bypass with blank/short/common/breached/very long/Unicode values | Consistent bounded validation; no account/cookie on failure | P0 | PR CI |
| Upload bypass corpus | API integration | Ingredient/recipe media | MIME/extension mismatch, wrong magic, polyglot, truncated, metadata | 400/415; no durable Blob or row | P0 | PR CI |
| Upload resource limits | API integration | Media/multipart | Oversize body/file, huge pixels/frames, decompression/resource bomb | 413/bounded time/memory; no partial state | P0 | Isolated CI |
| DB-after-Blob fault | Fault-injection integration | Create/update media workflow | Fail DB begin/command/commit after upload, including ambiguous commit | Defined result; no wrong deletion; eventual single consistent reference | P0 | CI |
| Blob failure matrix | Fault-injection integration | Media workflow | 401/403/404/409/429/5xx/timeout before/during upload/delete | Bounded retry/no retry storm; consistent/reconcilable state | P0 | CI + staging/Azurite |
| Migration clean and N-1→N | Database integration | Schema | Clean install, upgrade representative prior DB, repeat apply, forced failure | Idempotent history; data preserved; recovery documented | P0 | PR CI |
| SQL injection corpus | API/database regression | All text/query/route inputs | Quotes, comments, encoded delimiters, JSON/form strings | No query-shape change/data damage; stable validation | P1 | PR CI |
| Stored/reflected/DOM XSS | API + browser | Recipe instructions/names/profile/errors/routes | HTML/SVG/URL/template payload corpus persisted/reflected | Browser treats as text or approved sanitized content; CSP contains impact | P1 | PR CI browser |
| Malformed protocol inputs | API integration | All endpoints | Malformed JSON, wrong/absent Content-Type, duplicate keys, invalid IDs, overflow | Stable 400/404/413/415; no 500 or partial work | P1 | PR CI |
| Duplicate/replayed command | API integration | Sign-up/admin/future favorites | Repeat identical request concurrently/after timeout with same idempotency key | One defined result; no duplicate row/Blob | P1 | PR CI |
| Concurrent updates | API/database integration | Recipe/user/future lists | Two writers use same version; update/delete collision | One success, stale writer 409; audit correct; no lost media | P1 | PR CI |
| Contract compatibility | Contract/consumer | OpenAPI + Angular client | Serialize every success/error; diff released schema | Generated client compiles; breaking change blocked/versioned | P1 | PR CI |
| Real Blob integration | Integration | Managed identity/media | Private container, headers, canonical image, delete/reconcile | Least privilege and delivery behavior correct | P1 | Ephemeral/Azurite + staging |
| Full auth journey | Playwright E2E | Angular/API | Register, login, refresh, logout, expiry, deep link, offline recovery | Correct navigation/state/cookie behavior in browser | P1 | CI + staging |
| Navigation/deep-link smoke | Playwright E2E | Angular routes | Every menu/action route, cold refresh, unknown path, unsaved form | No silent broken redirects; intentional 404/guard behavior | P1 | PR CI |
| Accessibility | Component + browser/manual | Core flows | axe, keyboard, focus, screen reader, zoom/contrast | No high-impact automated violations; usable manual flow | P1 | PR CI + scheduled manual |
| Deployment slot smoke | Post-deploy | Full stack | Readiness, CORS, antiforgery, auth cookie, safe catalogue read | All gates pass before promotion; traceable result | P1 | Staging + production post-promote |
| Slow/unavailable DB | Resilience | API/MySQL | Delay, connection exhaustion, failover, deadlock, timeout | Bounded failure/cancel; correct status; no retry storm/corruption | P2 | Isolated staging |
| Load/capacity | Load | Auth/catalogue/detail/upload | Representative and abuse profiles to saturation/recovery | Agreed SLO and resource/connection limits met | P2 | Isolated staging |
| Alert synthetic | Operational | Telemetry/on-call | Inject safe 5xx/latency/dependency/deploy failure | Correlated trace and actionable alert reach owner | P2 | Staging scheduled |
| Coordinated restore drill | Operational recovery | MySQL + Blob | Restore isolated snapshot and reconcile references | Measured RPO/RTO met; app smoke and inventory consistent | P2 | Isolated scheduled |
| Privacy export/delete | E2E/operational | Account lifecycle | Export then close synthetic account across DB/cache/log views and any future user-media store | Complete export and policy-conformant verified deletion | P2 | Staging scheduled |

### Priorities and quality gates

The first five suites should be: stable backend error baseline, full anonymous/two-user authorization matrix, administrator policy matrix, hostile-origin CSRF browser matrix, and upload plus DB/Blob fault matrix. Migration validation is equally deployment-blocking once versioned migrations exist. Section 15 specifies exact PR and deployment gates.

## 13. Production-readiness checklist

| Area | Requirement | Status | Evidence | Required action |
|---|---|---|---|---|
| Authentication | No credentials in logs | **Not ready** | AuthController.cs:22,30 logs password-bearing records | Remove, redact, inspect/rotate affected credentials |
| Authentication | Strong server password and abuse policy | **Not ready** | AuthService only checks nonblank; no limiter | Server policy, breached-password check, layered throttling |
| Authentication | Secure password storage | **Ready** | ASP.NET Identity salted password hasher | Maintain/update; add hash-upgrade tests |
| Authentication | Email verification/reset/MFA readiness | **Not ready** | Reset schema only; no complete flows/MFA | Design verified, throttled, audited lifecycle |
| Authorization | Default-deny endpoint/function policy | **Not ready** | Public Users API; admin only Authorize | Claim/policy/current-user enforcement |
| Authorization | Object ownership | **Not ready** | Only /users/me binds claim; user ID routes do not | Ownership-scoped queries and two-user tests |
| CSRF | All cookie-authenticated mutations protected | **Not ready** | SameSite=None; no antiforgery/origin enforcement | Token/header plus Origin/Fetch Metadata or same-origin topology |
| CORS | Exact production allowlist | **Partially ready** | Exact origins + credentials; fail-fast config | Verify deployed domains/preflight; keep it separate from CSRF |
| Rate limiting | Auth and resource abuse bounded | **Not ready** | No Add/UseRateLimiter | Per-account/network/route policies and metrics |
| Input validation | Bounded semantic validation at API | **Partially ready** | Some service checks; many maxima/units absent | Command validators and body/collection limits |
| File uploads | Canonical, bounded, scanned image pipeline | **Not ready** | Arbitrary stream relabeled AVIF | Private quarantine, decode/re-encode, caps, scan/reconcile |
| SQL injection | Parameterized reviewed Dapper paths | **Partially ready** | No unsafe user value concatenation found | Preserve patterns; add corpus/static review and least-privilege DB |
| Secrets | No tracked credentials | **Not ready** | Development DB credential tracked | Rotate/move to user-secrets; history scan |
| Configuration | Production options validated | **Partially ready** | CORS/storage/DB fail-fast checks | Typed options validation for all settings; runtime contract |
| TLS | HTTPS/HSTS and strong live platform TLS | **Partially ready** | Redirect/HSTS code present | Verify App Service HTTPS-only/min TLS/custom cert/DB TLS |
| Cookies | Secure transport/browser attributes | **Partially ready** | Current/default __Host- prefix (overridable), Secure, HttpOnly, SameSite=None | Preserve prefix rules; add CSRF; reconcile expiry; verify custom-domain behavior |
| Sessions | Revocable, bounded, revalidated lifecycle | **Not ready** | 14-day persistent/sliding ticket; no stamp/store | Absolute/idle limits, session version/revocation/reauth |
| Security headers | Frontend and API browser policy | **Partially ready** | API has baseline; Express lacks explicit policy | CSP/frame/nosniff/referrer/permissions/cache at public edge |
| Sensitive caching | Auth/user data not stored by caches | **Not ready** | No explicit no-store on auth/session/user | Private/no-store; browser/proxy tests |
| Error handling | Stable safe ProblemDetails | **Partially ready** | Production sanitizes; Development test path returns 500 | Uniform handler; 39/39 tests |
| Logging | Structured, privacy-safe application events | **Not ready** | Trace scope positive; plaintext passwords present | Remove secrets, add completion/security events and governance |
| Metrics | Service/dependency/business/security metrics | **Not ready** | None configured in repository | OpenTelemetry/App Insights metrics |
| Tracing | Request-to-dependency traces | **Not ready** | Trace IDs only; no exporter | W3C distributed tracing/export/redaction |
| Monitoring | Dashboards and availability tests | **Not ready** | No definitions/evidence | SLI dashboards and synthetics |
| Alerts | Actionable routed alerts | **Not ready** | No alert definitions/runbooks | Availability/5xx/latency/auth/DB/Blob/deploy/cost alerts |
| Health checks | Live and dependency-aware ready endpoints | **Not ready** | No endpoints; SPA fallback is not health | /health/live, /health/ready and App Service setting |
| Backups | MySQL/Blob protection meets RPO | **Unable to verify** | No IaC/portal access or policy docs | Inspect/define retention, redundancy, PITR/versioning/soft delete |
| Restore testing | Coordinated recovery demonstrated | **Not ready** | No RPO/RTO/runbook/drill evidence | Isolated MySQL+Blob restore and reconciliation drill |
| Database migrations | Versioned, data-safe schema evolution | **Not ready** | Only destructive rebuild/delete scripts | Migration history, expand/contract, clean/N-1 tests |
| Database integrity | FKs/checks plus concurrency/audit | **Partially ready** | Good relational constraints; no version/actor/ownership | Add row version/audit/ownership and measured indexes |
| Blob consistency | Durable DB/media state | **Not ready** | Best-effort compensation only | Outbox/media states/reconciliation/idempotency |
| API contracts | Versioned/generated compatible contract | **Not ready** | userName/username and DTO drift; 501 routes | OpenAPI source, generated client, breaking-change gate |
| Performance | Bounded APIs and measured capacity | **Not ready** | Unbounded catalogue and redundant cold-cache ingredient N+1 | Cursor pagination, embedded/batched details, limits, representative load/EXPLAIN |
| Frontend completeness | All primary routes/flows work | **Not ready** | Several linked routes missing; placeholder home | Product route inventory and E2E smoke |
| Accessibility | Core flows meet tested accessibility criteria | **Not ready** | Contrast/semantic/label/focus issues | Remediate and run axe/keyboard/screen-reader checks |
| Automated tests | Green security-aware unit/integration baseline | **Partially ready** | Frontend pass; backend 11 fail; tests encode auth flaws | Fix/rewrite and make required |
| E2E/resilience | Browser, failure, concurrency and recovery tests | **Not ready** | No suites configured | Implement section 12 P0/P1 matrix |
| Dependency scanning | Automated risk policy | **Not ready** | Manual npm/NuGet check only; production highs | Patch and add blocking scheduled/PR checks |
| Secret scanning | History-aware CI/pre-receive scan | **Not ready** | Scanner unavailable; heuristic only | Enable managed/history scan and response process |
| Static analysis | C#/TS/SAST/analyzer gates | **Not ready** | No lint/SAST/analyzer workflow | ESLint, analyzers, CodeQL, actionlint |
| CI/CD | Protected staged build-once promotion | **Not ready** | Direct push-to-production workflows | PR CI, environments, staging, approval, smoke |
| Artifact integrity | Minimal locked attested artifacts | **Not ready** | npm install, path '.', mutable actions, floating SDK | Locked restores, minimal artifact, SHA pins, SBOM/provenance |
| Rollback | Tested application/data rollback/roll-forward | **Not ready** | No process/gate | Retain prior artifact; compatible migrations; exercise decision |
| Managed identity | Workload identity instead of storage key | **Partially ready** | DefaultAzureCredential production path | Verify App Service MI and least-privilege RBAC |
| Key Vault | Secret reference/RBAC/rotation | **Unable to verify** | README names Key Vault; no IaC/live access | Verify references, RBAC, network, purge protection, rotation |
| Database network/RBAC | Private/limited network and least privilege | **Unable to verify** | No IaC/live settings | Review firewall/private endpoint/app/migration users/TLS |
| Storage access | Private container/network/least privilege | **Unable to verify** | Code validates Azure HTTPS URL; live access unknown | Review public access/shared key/RBAC/firewall/lifecycle |
| Data Protection keys | Durable protected multi-instance keys | **Unable to verify** | No repository configuration evidence | Verify persistence, encryption, slots/key rotation |
| Deployment slots | Safe settings/staging/swap | **Unable to verify** | Workflow says Production only | Create/verify slots, sticky settings, health and swap behavior |
| DNS/certificates | Custom domains and automatic renewal | **Unable to verify** | Hard-coded App Service names only | Verify DNS, certificates, renewal and cookie/CORS topology |
| Autoscale/capacity | Tested scaling and DB connection budget | **Unable to verify** | No IaC/load evidence | Capacity/load test, pool budget, scale rules, zone decision |
| Privacy | Minimized data and lifecycle operations | **Not ready** | Overbroad user DTO/public routes; no export/retention | Implement PRIV-001 |
| Incident response | Owners, access, runbooks and exercises | **Not ready** | No tracked plan | Define on-call/escalation/evidence/communications/tabletop |
| Cost monitoring | Budgets and anomaly alerts | **Unable to verify** | No IaC/portal access | Configure budgets/owners/anomaly alerts |
| Documentation | Current setup/release/recovery guidance | **Not ready** | Contradictory READMEs and TODOs | Implement DOC-001 and validate with a new maintainer |
| Source maps | Production browser maps disabled | **Ready** | Audited production build emitted none | Preserve and separately retain private debugging symbols if desired |
| Microservice operations | Distributed-service platform | **Not applicable** | A modular monolith is the recommended target | Do not introduce without measured ownership/scale need |

## 14. Remediation roadmap

### Phase 0: Immediate risk containment

Do not expose the application to additional users until this phase is complete.

| Order | Finding IDs | Task | Reason | Dependencies | Effort | Completion criteria |
|---|---|---|---|---|---|---|
| 1 | SEC-003 | Remove auth request logging; identify log retention/access; rotate any real exposed credentials | Direct plaintext credential disclosure | None | Small | Sentinel credentials absent from app/log pipeline; response plan recorded |
| 2 | SEC-001, TEST-001 | Disable general user routes or require claim-scoped /me; add anonymous/two-user tests | Closes Critical data/destructive exposure | Intended product behavior | Medium | Anonymous/other-user matrix denies every read/mutation; minimal DTO |
| 3 | SEC-002, DB-003 | Disable admin writes until a real policy/actor audit exists | Stops immediate vertical escalation/catalogue corruption | Role/permission decision | Medium | Ordinary users denied; removed-admin/stale-cookie tests pass |
| 4 | SEC-005 | Add antiforgery plus Origin/Fetch Metadata enforcement or same-origin proxy | Closes serious ambient-cookie CSRF | Domain/topology decision | Medium | Hostile-origin browser matrix has no side effects |
| 5 | SEC-004, REL-002 | Temporarily reject uploads or enforce bounded canonical private media flow | Stops arbitrary byte/storage abuse | Admin containment first | Medium | Bypass/oversize corpus rejected; no orphan state |
| 6 | SEC-006 | Add password bounds/breached check, dummy hash, throttling and generic enumeration behavior | Reduces automated account compromise | Metrics/log design | Medium | Bounded timing and 429/backoff tests pass |
| 7 | SEC-007, OPS-002 | Patch Angular/Express production dependencies and high-risk dev tools | Removes known vulnerable versions | Tested lock update | Medium | Production audit has no unsuppressed High/Critical; build/tests/E2E pass |
| 8 | SEC-009 | Rotate/remove tracked local DB credential and scan history | Stops further secret distribution/reuse | Developer coordination | Small | Old value invalid; nonsecret example; scan evidence |
| 9 | DB-002 | Disable catalogue publication or calculate authoritative totals server-side | Prevents false nutrition/cost data | SEC-002 and minimum unit rules | Medium | Tampered totals ignored/rejected; deterministic server calculation |
| 10 | OPS-001 | Pause direct production deploy; require review/checks/environment approval | Prevents containment regressions from auto-deploying | Basic CI checks | Medium | Branch/environment protection and no direct unchecked production job |

### Phase 1: Required before production

| Order | Finding IDs | Task | Reason | Dependencies | Effort | Completion criteria |
|---|---|---|---|---|---|---|
| 1 | REL-001, TEST-001 | Standardize error contract and restore a green backend suite | Establish trustworthy baseline | Phase 0 auth outcomes | Medium | 39/39 existing plus new P0 auth tests green and required |
| 2 | DB-001, DOC-001 | Adopt/version/test production migrations and document recovery | Required for safe schema releases | Backup/PITR inspection | Large | Clean/N-1/idempotency/failure tests and nonproduction labels |
| 3 | SEC-008 | Add revocable session/version lifecycle, absolute bound and reauthentication | Contain stolen/stale cookies | Account/permission schema migration | Medium | State-change/expiry/restart/slot tests pass |
| 4 | BE-001, ARC-002 | Bound requests, stabilize ProblemDetails/status, publish/test versioned OpenAPI | Secures trust boundary and clients | Error baseline | Large | Generated client, limits and breaking-change gate pass |
| 5 | DB-003, REL-002 | Add optimistic/audit controls and durable media reconciliation/outbox | Prevent lost updates and DB/Blob drift | Migrations and media design | Large | Concurrency/fault/reconciliation tests pass |
| 6 | PERF-001 | Implement bounded cursor catalogue APIs and matching measured indexes | Prevent scale/resource failure | Stable contract/migrations | Medium | Page caps, EXPLAIN and representative performance targets pass |
| 7 | FE-001, FE-002, REL-004 | Repair routes, principal reset, and bounded auth bootstrap | Make core UI functional/recoverable | Stable auth/API contract | Medium | Route/session/cross-user/E2E tests pass |
| 8 | FE-003 | Remediate core accessibility defects | Core flows must be usable | Stable core UI | Medium | Axe plus keyboard/contrast/screen-reader acceptance |
| 9 | SEC-010 | Deploy CSP/security/cache headers on both origins | Browser defense and sensitive caching | Final domains/external assets | Medium | Public-edge header/CSP/frame/cache tests pass |
| 10 | REL-003 | Implement health, telemetry, alerts, runbooks and coordinated restore drill | Required to detect/recover failure | Azure access and migrations | Large | Readiness deployment gate, owned alerts, measured RPO/RTO |
| 11 | OPS-001, OPS-002 | Build once, attest, stage, smoke, approve and promote minimal artifacts | Safe repeatable release | Health/migrations/test gates | Medium | Protected staging/production workflow and rollback exercise |
| 12 | PRIV-001 | Implement minimum data inventory, response minimization, export/delete/retention | Required before broad user data collection | User/media/session lifecycle | Large | Synthetic export/deletion and access-audit tests |
| 13 | TEST-002 | Deliver all P0 and core P1 security/browser/migration/fault suites | Evidence that controls work together | Controls above | Large | Required test evidence attached to releases |
| 14 | DOC-001 | Complete operator/developer/incident documentation | Makes readiness repeatable | Final phase-1 procedures | Medium | New-maintainer deploy and incident tabletop succeed |

### Phase 2: Production hardening

| Order | Finding IDs | Task | Reason | Dependencies | Effort | Completion criteria |
|---|---|---|---|---|---|---|
| 1 | REL-003, TEST-002 | Tune SLOs/alerts from beta evidence; schedule synthetic, resilience and restore drills | Improve detection/recovery confidence | Phase-1 telemetry | Medium | Low-noise owned alerts; quarterly drill evidence |
| 2 | OPS-002 | Add CodeQL, dependency review/update automation, action SHA pins, SBOM/license/provenance | Defense-in-depth supply-chain control | Reproducible pipeline | Medium | Policy gates and signed artifact/SBOM retained |
| 3 | PERF-001, PERF-002 | Optimize images/fonts/cache/compression and capacity-test App Service/MySQL | Improve UX/cost after measurement | Bounded APIs and telemetry | Medium | LCP/INP/CLS, cache and SLO/capacity targets met |
| 4 | TEST-002 | Add full XSS/SQLi/protocol/concurrency/load/accessibility/privacy regression sets | Broaden residual-risk coverage | Stable contracts | Large | Scheduled and PR suites with owners/flakiness bounds |
| 5 | FE-004, BE-002 | Enforce lint/format/analyzers/no-console and lifecycle/formatting conventions | Reduce long-term defect rate | CI pipeline | Medium | Clean mandatory gates and no unapproved skips |
| 6 | DOC-001, PRIV-001 | Exercise access reviews, secret rotation, incident and privacy runbooks | Validate human controls | Runbooks and monitoring | Medium | Time-bounded tabletop/action items closed |

### Phase 3: Long-term architecture improvements

| Order | Finding IDs | Task | Reason | Dependencies | Effort | Completion criteria |
|---|---|---|---|---|---|---|
| 1 | ARC-001 | Evolve to feature modules and neutral application commands/ports | Supports background/mobile/import workflows without HTTP coupling | Stable use cases | Large | Application/domain independent of ASP.NET for migrated modules |
| 2 | ARC-003, DB-002 | Model normalized units, provenance, calculation versions and effective-dated price/nutrition facts | Supports accurate nutrition, Walmart and multi-store pricing | Product rules | Large | Domain examples and recalculation/version tests pass |
| 3 | ARC-003, DB-003 | Add Accounts/Households, ownership, visibility and moderation lifecycle before user content | Prevent future BOLA/workflow debt | Authorization/audit foundation | Large | Policy and multi-user scenario tests pass |
| 4 | ARC-003 | Build MealPlanning/Grocery/Favorites modules with scoped commands and durable background work | Supports roadmap without placeholder contracts | Domain decisions and modules | Large | End-to-end ownership/idempotency/failure tests |
| 5 | ARC-002, PERF-001 | Extend versioned API/search/mobile support based on measured client needs | Avoid premature infrastructure while preserving compatibility | Stable modules/telemetry | Large | N-1 client compatibility and measured search targets |

## 15. Recommended automated quality gates

### Pull-request blocking: frontend

1. Pin Node and npm versions; run npm ci with scripts reviewed and the committed lockfile unchanged.
2. Run npm audit --omit=dev --audit-level=high; block every production High/Critical. Run the full audit and block Critical/High unless a named owner supplies reachability evidence, compensating controls, and an expiring approved waiver.
3. Add Angular ESLint with no-console, security-relevant template rules, and zero warnings; run npm run lint.
4. Add Prettier check; run npm run format:check.
5. Run both TypeScript checks:
   - npx --no-install tsc --noEmit -p tsconfig.app.json
   - npx --no-install tsc --noEmit -p tsconfig.spec.json
6. Run npm run test -- --watch=false --coverage; require zero failures and no unexplained skipped tests. Ratchet total coverage from a recorded baseline and require at least 80% changed-line/branch coverage; do not use coverage in place of the explicit authorization matrix.
7. Run npm run build -- --configuration production; budgets and source-map absence block.
8. Run Playwright route/auth/CSRF smoke and axe checks against an ephemeral full-stack environment.

### Pull-request blocking: backend

1. Commit global.json and pin the supported SDK.
2. Generate/commit NuGet lockfiles; run dotnet restore --locked-mode.
3. Run dotnet format Appetee.sln --verify-no-changes --no-restore with zero diagnostics.
4. Run dotnet build Appetee.sln -c Release --no-restore -warnaserror.
5. Run all tests with coverage against an isolated MySQL service:
   - dotnet test tests/Appetee.Api.Tests/Appetee.Api.Tests.csproj -c Release --no-build --collect:"XPlat Code Coverage"
   - require zero failures/skips; enforce the same baseline/changed-code ratchet.
6. Run the anonymous/two-user/admin/cookie/validation/upload security matrix as part of that required test job.
7. Run dotnet list Appetee.sln package --vulnerable --include-transitive --no-restore in machine-readable policy processing; block High/Critical and expiring-waiver violations.
8. Apply migrations to a clean MySQL database and a representative prior-version snapshot; repeat to prove migration-history/idempotency behavior.
9. Generate/lint OpenAPI, compile the generated Angular client, and block incompatible changes unless a reviewed version/deprecation plan exists.

### Repository/security blocking gates

- GitHub CodeQL for C# and JavaScript/TypeScript; block new High/Critical findings and reviewed policy categories.
- History-aware secret scanning on pushes/PRs plus repository-host secret protection; any verified secret blocks and triggers rotation, not merely deletion.
- GitHub dependency review; block newly introduced vulnerable, unapproved-license, Git URL, or unexpected install-script dependencies.
- actionlint and workflow policy: pin third-party actions to full commit SHAs, minimize permissions, forbid untrusted PR code with production credentials.
- Generate CycloneDX or SPDX SBOMs for frontend/runtime and backend, retain with the artifact, scan licenses, and sign/attest artifact provenance/digest.
- Branch protection: required reviews, required checks, no direct/force pushes to deployment branches, reviewed CODEOWNERS for workflows/auth/schema.

### Deployment blocking gates

1. Build once in CI; promote the exact signed artifact digest—never rebuild per environment.
2. Use protected staging and production GitHub environments, environment-scoped OIDC, and a deployment concurrency group.
3. Before migration, verify environment configuration, target identity, schema compatibility, and a usable backup/PITR restore point.
4. Apply reviewed forward migrations with a least-privileged migration identity and capture immutable migration evidence.
5. Deploy to a slot/staging environment; require /health/live and /health/ready.
6. Run API/browser smoke for public routes, CORS, antiforgery, cookie creation/expiry/logout, authorized/denied calls, one safe catalogue read, media read, and OpenAPI compatibility. Run only non-destructive authenticated DAST.
7. Require manual production approval by a separate authorized reviewer.
8. Swap/promote or canary the same artifact; run immediate smoke and observe agreed availability/error/latency/dependency SLIs for a defined window.
9. Automatically stop/roll back the application artifact on failed health/SLO gates when schema compatibility permits; otherwise execute the reviewed roll-forward plan. Retain the prior artifact and deployment/migration evidence.

Nightly/scheduled checks should re-run full dependency/secret/SAST scans, broader browser tests, and synthetic availability. Staging schedules should run resilience/load and alert tests; restore drills should run periodically in isolated resources. A waiver must identify finding, owner, justification, compensating control, affected artifact, approval, and expiry; expired waivers block.

## 16. Manual verification checklist

The following cannot be safely established from source. Verify them in Azure Portal/CLI, GitHub settings, DNS/provider records, and isolated operational exercises. Record evidence date, reviewer, resource ID, and result. Do not run destructive checks against production.

### GitHub and deployment identity

- [ ] Branch protection/rulesets require reviews and all PR checks; direct/force push is blocked.
- [ ] staging/production environments require appropriate reviewers and restrict deployment branches/tags.
- [ ] Azure OIDC federation subject, audience, repository, branch, workflow and environment are narrowly scoped; obsolete credentials/federations are removed.
- [ ] Workflow/service-principal permissions cannot edit unrelated resources, role assignments, Key Vault policy, or data-plane resources beyond need.
- [ ] Deployment history, artifact digest/provenance, rollback artifact and audit retention are accessible to responders.

### App Service and public edge

- [ ] Frontend/backend runtime stacks exactly support the pinned Node/.NET versions; frontend startup command and working directory are explicit.
- [ ] Production environment name is correct; DeveloperExceptionPage/Swagger/remote debugging are off.
- [ ] HTTPS-only, minimum TLS, HTTP/2+, FTPS disablement, custom domains and automatic certificate renewal are configured.
- [ ] Public production headers match SEC-010, HSTS is correct for the chosen domains, and no sensitive response is publicly/intermediately cached.
- [ ] App Service access restrictions and SCM/Kudu restrictions limit administrative surfaces.
- [ ] Deployment slots, sticky settings, slot-specific secrets, swap behavior, Always On and health-check path are correct.
- [ ] Forwarded headers/proxy trust, original scheme/host, redirect behavior and client IP handling are correct behind App Service.
- [ ] Real-browser cookie Domain/Path/SameSite/Secure behavior, CORS exact origins, preflight and antiforgery work across final custom domains.
- [ ] Autoscale/instance limits, zone/region decisions, memory/CPU and restart behavior are capacity-tested.

### Identity, secrets and keys

- [ ] Each App Service system/user-assigned managed identity is known, enabled, owned and least privileged.
- [ ] Blob Data Contributor or narrower custom role is scoped to the intended account/container, not subscription-wide.
- [ ] Connection settings are Key Vault references or equivalent—not plaintext in App Service/workflow output—and diagnostic views do not disclose them.
- [ ] Key Vault RBAC, firewall/private endpoint, soft delete, purge protection, rotation, access logs and break-glass access are reviewed.
- [ ] ASP.NET Data Protection keys persist across instances/restarts/slot swaps, are encrypted, backed up as appropriate, and rotate without mass invalidation surprise.
- [ ] Production log access and retention are least privileged; historical logs are checked for SEC-003 exposure without copying secret values.

### Azure MySQL Flexible Server

- [ ] TLS is required with certificate/hostname verification; the application connection string does not disable it.
- [ ] Public access/firewall or private endpoint/VNet/DNS design permits only required paths.
- [ ] Separate least-privileged application and migration users exist; neither is server administrator; grants are reviewed.
- [ ] Connection limits and per-instance pool budgets, command timeout, slow-query/audit logs, maintenance window and deadlock handling are configured.
- [ ] HA/zone, storage auto-grow, deletion protection/resource locks, backup retention, geo-redundancy and PITR meet documented RPO/RTO.
- [ ] An isolated PITR/restore drill has been timed and application/schema/reference smoke tests pass.

### Azure Blob Storage

- [ ] Account/container public-access setting matches the delivery design; anonymous listing is disabled; shared-key access is disabled where feasible.
- [ ] Plain GetUri image URLs are intentionally usable: either private access is mediated by an authenticated proxy/short-lived scoped SAS/controlled CDN, or any public-read design accepts only canonical scanned content and cannot expose raw untrusted uploads.
- [ ] Firewall/private endpoint/trusted-service settings permit only intended application/CDN/scanner paths.
- [ ] Redundancy, soft delete, versioning, change feed/lifecycle, deletion protection and resource locks meet RPO/RTO/media workflow.
- [ ] Content headers/download behavior cannot turn mislabeled content into same-origin executable content; CDN/custom domain/CORS settings are intentional.
- [ ] Malware scanning/quarantine/promotion and alert behavior are configured if required by the accepted upload threat model.
- [ ] Blob inventory and database reference reconciliation runs and reports orphan/missing objects; restore is coordinated with MySQL point in time.

### Observability, operations and governance

- [ ] Application Insights/OpenTelemetry receives request/dependency traces, metrics and privacy-safe logs with controlled sampling/retention.
- [ ] Availability tests and dashboards cover frontend, API readiness, MySQL, Blob and the critical sign-in/catalogue journey.
- [ ] Alerts cover availability, 5xx, latency, failed/rate-limited login, DB CPU/storage/connections, Blob errors, reconciliation backlog, failed deployment and cost anomaly.
- [ ] Every alert has an owner, severity, actionable threshold, runbook and tested notification path; synthetic alert tests reach the on-call owner.
- [ ] RPO/RTO, incident severity/escalation, communications, evidence preservation, access review, break-glass and post-incident processes are approved/exercised.
- [ ] Tags, budgets, cost alerts, resource locks, owners, inventory and production access reviews are current.
- [ ] Privacy data inventory, retention, export, deletion, backup-expiry, administrator audit and telemetry redaction procedures are reviewed with appropriate stakeholders.
- [ ] DNS records, certificate renewal, domain ownership and third-party font/image/privacy dependencies have owners and failure plans.

## 17. Positive findings

- Reviewed Dapper SQL binds user values with parameters; dynamic bulk statements generate parameter names and use DynamicParameters. No confirmed SQL injection path was found.
- The schema already uses many foreign keys, cascades, composite join keys, check constraints, unique email/ingredient names and reverse lookup indexes.
- Multi-table sign-up, ingredient and recipe relational changes use transactions; connections and transactions are disposed.
- ASP.NET Identity's maintained salted password hasher is used rather than a custom hash.
- Cookie basics are strong: the current/default name uses the __Host- prefix, with Secure, HttpOnly, Path=/, an encrypted/signed ticket, and API 401/403 responses instead of login redirects. Configuration can override the name and must preserve prefix rules.
- Production CORS uses an explicit origin allowlist with credentials and fails configuration validation when missing; it does not use wildcard credentials.
- API middleware enables HTTPS redirection, production HSTS, nosniff, X-Frame-Options DENY and Referrer-Policy no-referrer.
- Production exception output is sanitized, includes a trace ID and avoids cache retention; Swagger and developer diagnostics are environment-limited.
- Cancellation tokens are propagated through most controller/service/Dapper/Blob calls, and async APIs are used.
- Production Blob access uses DefaultAzureCredential rather than a storage key. Account URL validation requires HTTPS/Azure hostname without query/userinfo, and Blob names are randomized GUIDs.
- Required configuration presence, production CORS non-emptiness, and Blob-account URI shape are fail-fast validated; database connectivity, TLS and privileges still require live readiness/manual verification.
- Angular has strict TypeScript, strict injection/template/input-access settings and typed forms. No innerHTML, sanitizer bypass, eval/new Function, localStorage/sessionStorage or browser credential persistence was found.
- Angular template escaping remains the default; API credential inclusion is scoped to the configured API prefix.
- Authentication restoration validates the current profile before committing authenticated client state; logout attempts local cleanup even when the API call fails.
- Several flows implement loading, error and empty states; complex admin subscriptions use takeUntilDestroyed; created object URLs are revoked.
- Angular uses lazy feature loading, hashed production assets, bundle budgets and no production source maps. The audited production build and both type checks pass.
- GitHub Azure login uses OIDC and minimal contents:read/id-token:write job permissions instead of a stored publish profile.
- npm lockfile v3 contains integrity metadata for resolved artifacts and no non-registry resolutions were found.
- NuGet advisory listing found no known vulnerable direct/transitive package at audit time; the Release solution build has zero compiler warnings/errors.
- Backend integration tests use a dedicated MySQL test database and replace external Blob Storage, which is a useful foundation for security/failure coverage.
- The local frontend TLS certificate/private key is gitignored and untracked. No secret value is reproduced in this report.

These controls materially reduce risk but do not negate the findings. In particular, parameterized SQL does not provide authorization, exact CORS does not provide CSRF protection, Angular guards do not provide backend authorization, and managed identity does not prove live least privilege.

## 18. Final verdict

### Current production-readiness rating

**Not production ready.** Appetee should not be exposed to additional users until Phase 0 is complete. Production promotion should wait until Phase 1 exit criteria are evidenced in CI/staging and the live Azure/GitHub manual checklist has no unresolved security, data-loss, or recovery blockers.

### Top five blockers

1. **Identity boundary failure:** anonymous user read/update/delete and any-user administration (SEC-001, SEC-002).
2. **Credential and browser request exposure:** plaintext auth logging, CSRF, and unbounded authentication abuse (SEC-003, SEC-005, SEC-006).
3. **Unsafe data/media integrity:** arbitrary-byte uploads, trusted client nutrition/cost, and non-atomic Blob/DB state (SEC-004, DB-002, REL-002).
4. **Unsafe schema/release path:** destructive SQL and direct-to-production workflows without backend tests, staging, health, migration or rollback gates (DB-001, OPS-001, TEST-001).
5. **No demonstrated production operating/recovery control plane:** health, telemetry, alerts, coordinated restore and critical Azure settings remain missing or unverified (REL-003).

### Top five architectural priorities

1. Establish policy/current-user/ownership and actor/version primitives across Accounts and Catalogue.
2. Stabilize a versioned OpenAPI contract and generated client with consistent validation/error semantics (ARC-002, BE-001).
3. Make server-side normalized, versioned nutrition/pricing calculation authoritative (DB-002, ARC-003).
4. Introduce durable media workflow/reconciliation and optimistic concurrency (REL-002, DB-003).
5. Evolve toward a feature-modular monolith with neutral application commands/ports, not microservices (ARC-001, ARC-003).

### Top five security priorities

1. Close all anonymous user-object routes and verify ownership (SEC-001).
2. Enforce real administrative policies and stale-permission invalidation (SEC-002, SEC-008).
3. Remove password logging and handle affected log/credential exposure (SEC-003).
4. Protect every state-changing cookie request against CSRF (SEC-005).
5. Reject/quarantine/validate/re-encode bounded uploads and reconcile their lifecycle (SEC-004, REL-002).

Authentication throttling/password policy (SEC-006), production dependency patching (SEC-007), and secret rotation (SEC-009) remain immediate even though only five priorities are listed.

### Top five tests to implement first

1. Restore the stable error baseline and make the full backend suite green/blocking.
2. Anonymous/user A/user B/admin/disabled/stale-permission authorization matrix across every endpoint.
3. Real-browser hostile-origin CSRF/CORS/cookie lifecycle matrix.
4. Upload bypass/resource-limit plus DB/Blob fault-injection/reconciliation matrix.
5. Clean and N-1 migration test followed by staged deployment readiness/auth/catalogue smoke.

### Residual risks after recommended fixes

- Azure/GitHub/DNS live-state drift and operator error remain until configuration is managed as code where possible, reviewed, monitored and exercised.
- New dependency/browser/cloud vulnerabilities will continue to emerge; patch and exception processes must remain continuous.
- Security tests reduce known classes but cannot prove absence of novel business-logic, parser, timing, or supply-chain flaws.
- Backup existence does not guarantee recoverability; ongoing coordinated restore drills and reference reconciliation remain necessary.
- Planned household, user-content, pricing, recommendation, import and background-job features create new authorization/privacy/integrity surfaces and require fresh threat modeling.
- Human access, log review, incident response, privacy operations and alert quality remain socio-technical controls that code alone cannot guarantee.

## Terminal summary

~~~text
Audit report path:
  C:\Users\galid\Documents\Appetee\docs\reviews\production-readiness-audit.md

Findings:
  Critical: 1
  High:     7
  Medium:   21
  Low:      5
  Informational: 0
  Total:    34

Production-readiness rating:
  NOT PRODUCTION READY

Top five blockers:
  1. SEC-001/002 — anonymous user CRUD/deletion and any-user admin access
  2. SEC-003/005/006 — password logging, CSRF, and missing auth abuse controls
  3. SEC-004/DB-002/REL-002 — unsafe uploads, client-trusted totals, DB/Blob drift
  4. DB-001/OPS-001/TEST-001 — destructive schema path and ungated production deploy
  5. REL-003 — no demonstrated health/telemetry/alert/restore operating control plane

Commands that failed:
  - npm run lint: repository has no lint script (repository gap).
  - npm audit --omit=dev / full audit: exit 1 because advisories were found.
  - npm outdated --json: exit 1 is expected when outdated packages are reported.
  - dotnet test: 28 passed, 11 failed; current-worktree exception-pipeline defect.
  - dotnet format --verify-no-changes: 37 whitespace diagnostics.
  - Initial sandbox frontend test/npm audit/NuGet queries: environment access limits;
    authorized reruns succeeded (tests 18 pass/1 skip; audits reported findings;
    NuGet reported no known vulnerable packages/advisories).

Manual verification required:
  GitHub branch/environment/OIDC settings; App Service runtime/TLS/slots/health/
  headers/access restrictions; custom DNS/certificates; managed identity/Key Vault/
  Data Protection keys; MySQL TLS/network/RBAC/HA/backups/PITR; Storage public access/
  RBAC/network/versioning/soft delete/scanning; monitoring/alerts/log retention;
  autoscale/capacity/cost; coordinated restore; incident/privacy/access procedures.
~~~

# API_CONTRACT.md

Base URL: `/api/v1`. JSON in/out. Auth: `Authorization: Bearer <accessToken>` unless marked **public**.
Roles: S = student, I = instructor, A = admin.

## Conventions
- Success: `{ "data": <payload> }`; lists: `{ "data": [...], "meta": { "page", "limit", "total" } }`
- Error: `{ "error": { "code": "VALIDATION_ERROR", "message": "...", "details"?: [...] } }`
- Codes: `VALIDATION_ERROR 400`, `UNAUTHORIZED 401`, `FORBIDDEN 403`, `NOT_FOUND 404`, `CONFLICT 409`, `RATE_LIMITED 429`, `INTERNAL 500`
- Pagination: `?page=1&limit=20` (max 100). Dates are ISO-8601 strings. Money is integer cents.
- `comingSoon` on any course payload is computed server-side as `lessonCount === 0` (never stored/derived client-side). Coming-soon courses are rejected for enroll and payment with `FORBIDDEN 403`.

## Health
| Method | Path | Access | Notes |
|---|---|---|---|
| GET | /health | public | `{status:'ok', env, uptimeSec, mongo:'up'\|'down', redis:'up'\|'down'}` |

## Auth
| Method | Path | Access | Body / Notes |
|---|---|---|---|
| POST | /auth/register | public | `{name,email,password,role?}` role limited to `student`\|`instructor` |
| POST | /auth/login | public | `{email,password}` -> `{user, accessToken}` + refresh cookie |
| POST | /auth/refresh | cookie | -> `{accessToken}` |
| POST | /auth/logout | any | clears cookie |
| GET | /auth/me | any | current user |

## Users (admin)
| GET | /users | A | `?role=&q=` |
| PATCH | /users/:id | A | `{role?,isActive?}` |

## Courses
| Method | Path | Access | Notes |
|---|---|---|---|
| GET | /courses | public | published only; `?q=&category=&level=&minPrice=&maxPrice=&sort=newest\|popular\|price&page=&limit=`; `?includeComingSoon=true` returns the full catalog (live + coming-soon), otherwise only live courses; every row carries `comingSoon` |
| GET | /courses/:idOrSlug | public | course + sections + lessons (lesson `videoAssetId` hidden unless allowed) |
| GET | /courses/mine | I | instructor's courses (all statuses) |
| POST | /courses | I | `{title,description,category,level,priceCents,currency?,tags?}` -> draft |
| PATCH | /courses/:id | I(owner),A | partial update |
| DELETE | /courses/:id | I(owner),A | only if no enrollments |
| POST | /courses/:id/submit | I(owner) | draft -> pending_review |
| POST | /courses/:id/publish | A | pending_review -> published |
| POST | /courses/:id/unpublish | A | |
| POST | /courses/:id/thumbnail-url | I(owner) | presigned PUT for thumbnail |

## Sections and lessons
| POST | /courses/:id/sections | I(owner) | `{title,order?}` |
| PATCH | /sections/:id | I(owner) | `{title?,order?}` |
| DELETE | /sections/:id | I(owner) | cascades lessons |
| POST | /sections/:id/lessons | I(owner) | `{title,type,isFreePreview?,videoAssetId?,quizId?,textContent?}` |
| PATCH | /lessons/:id | I(owner) | partial |
| DELETE | /lessons/:id | I(owner) | |
| PUT | /courses/:id/reorder | I(owner) | `{sections:[{id,order,lessons:[{id,order}]}]}` |

## Video
| POST | /videos/upload-url | I | `{courseId,filename,contentType}` -> `{assetId,uploadUrl,key}` |
| POST | /videos/:id/complete | I(owner) | marks uploaded, enqueues transcode |
| GET | /videos/:id | I(owner),A | `{status,progressPct,renditions,durationSec,error?}` |
| GET | /lessons/:id/playback | S(enrolled)/free preview/I(owner)/A | `{manifestUrl, expiresAt}` + sets CloudFront signed cookies |
| PUT | /lessons/:id/progress | S | `{positionSec,completed?}` |

## Enrollment and progress
| GET | /enrollments/mine | S | with `progressPct`, course summary |
| GET | /courses/:id/progress | S | `{progressPct, lessons:[{lessonId,completed,lastPositionSec}], completedAt?}` |
| GET | /courses/:id/students | I(owner),A | enrolled students + progress |

## Quizzes
| POST | /courses/:id/quizzes | I(owner) | `{title,passMarkPct,maxAttempts?,timeLimitSec?,questions[]}` |
| GET | /quizzes/:id | I(owner) full / S(enrolled) sanitized | no `correctOptionIds` for students |
| PATCH | /quizzes/:id | I(owner) | |
| DELETE | /quizzes/:id | I(owner) | |
| POST | /quizzes/:id/attempts | S(enrolled) | `{answers:[{questionId,selectedOptionIds[]}]}` -> `{scorePct,passed,pointsEarned,pointsTotal,results:[{questionId,correct,correctOptionIds,explanation?}]}` |
| GET | /quizzes/:id/attempts/mine | S | history |

## Live classes
| POST | /courses/:id/live-classes | I(owner) | `{title,description?,scheduledAt,durationMin}` |
| GET | /courses/:id/live-classes | enrolled/I/A | `?status=` |
| GET | /live-classes/upcoming | S | across enrolled courses |
| PATCH | /live-classes/:id | I(owner) | reschedule/cancel |
| POST | /live-classes/:id/start | I(owner) | status -> live |
| POST | /live-classes/:id/end | I(owner) | status -> ended |
| POST | /live-classes/:id/token | enrolled/I(owner) | -> `{token, url, roomName, role}` |
| GET | /live-classes/:id/messages | enrolled/I | `?before=&limit=` |
| POST | /live-classes/:id/messages | enrolled/I | `{text}` persists chat message |

## Certificates
| GET | /certificates/mine | S | |
| GET | /certificates/:id/download | S(owner) | `{url}` short-lived signed |
| GET | /certificates/verify/:certificateId | public | `{valid, studentName, courseTitle, issuedAt}` |

## Payments and earnings
| POST | /payments/checkout | S | `{courseId}` -> `{checkoutUrl}` or `{enrolled:true}` for free |
| POST | /payments/webhook | Stripe signature | raw body, idempotent |
| GET | /orders/mine | S | |
| GET | /instructor/earnings/summary | I | `{grossCents,feeCents,netCents,availableCents,paidOutCents}` |
| GET | /instructor/earnings/by-course | I | `[{courseId,title,sales,netCents}]` |
| GET | /instructor/earnings/monthly | I | `?months=12` -> `[{month,netCents,sales}]` |
| GET | /instructor/earnings/transactions | I | paginated ledger |
| POST | /instructor/payouts | I | `{amountCents}` <= available |
| GET | /admin/payouts | A | `?status=` |
| POST | /admin/payouts/:id/mark-paid | A | |
| GET | /admin/stats | A | users, courses, revenue, enrollments |

## Client route map (React Router)
`/` home, `/courses`, `/courses/:slug`, `/login`, `/register`, `/learn/:courseId` (player + curriculum),
`/my-learning`, `/live/:liveClassId`, `/quiz/:quizId`, `/certificates`, `/verify/:certificateId`,
`/instructor` (dashboard), `/instructor/courses/:id/edit`, `/instructor/earnings`, `/admin`.

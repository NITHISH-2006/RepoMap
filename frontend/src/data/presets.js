export const PRESETS = [
  {
    name: "Next.js SaaS",
    icon: "▲",
    tree: `├── .env.local
├── .eslintrc.json
├── next.config.js
├── package.json
├── tsconfig.json
├── tailwind.config.ts
├── prisma/
│   ├── schema.prisma
│   └── migrations/
│       └── 20240101_init/
│           └── migration.sql
├── public/
│   ├── favicon.ico
│   └── images/
│       ├── logo.svg
│       └── hero-bg.png
├── src/
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   ├── globals.css
│   │   ├── api/
│   │   │   ├── auth/
│   │   │   │   └── [...nextauth]/
│   │   │   │       └── route.ts
│   │   │   ├── stripe/
│   │   │   │   ├── webhook/
│   │   │   │   │   └── route.ts
│   │   │   │   └── create-checkout/
│   │   │   │       └── route.ts
│   │   │   └── users/
│   │   │       ├── route.ts
│   │   │       └── [id]/
│   │   │           └── route.ts
│   │   ├── (auth)/
│   │   │   ├── login/
│   │   │   │   └── page.tsx
│   │   │   └── register/
│   │   │       └── page.tsx
│   │   ├── (dashboard)/
│   │   │   ├── layout.tsx
│   │   │   ├── dashboard/
│   │   │   │   └── page.tsx
│   │   │   ├── settings/
│   │   │   │   └── page.tsx
│   │   │   └── billing/
│   │   │       └── page.tsx
│   │   └── (marketing)/
│   │       ├── page.tsx
│   │       ├── pricing/
│   │       │   └── page.tsx
│   │       └── about/
│   │           └── page.tsx
│   ├── components/
│   │   ├── ui/
│   │   │   ├── Button.tsx
│   │   │   ├── Card.tsx
│   │   │   ├── Modal.tsx
│   │   │   ├── Input.tsx
│   │   │   └── Badge.tsx
│   │   ├── layout/
│   │   │   ├── Navbar.tsx
│   │   │   ├── Sidebar.tsx
│   │   │   └── Footer.tsx
│   │   ├── dashboard/
│   │   │   ├── StatsCard.tsx
│   │   │   ├── ActivityFeed.tsx
│   │   │   └── UsageChart.tsx
│   │   └── billing/
│   │       ├── PricingTable.tsx
│   │       └── InvoiceList.tsx
│   ├── lib/
│   │   ├── prisma.ts
│   │   ├── auth.ts
│   │   ├── stripe.ts
│   │   ├── utils.ts
│   │   └── validations.ts
│   ├── hooks/
│   │   ├── useUser.ts
│   │   ├── useSubscription.ts
│   │   └── useDebounce.ts
│   ├── types/
│   │   ├── index.ts
│   │   └── api.ts
│   └── middleware.ts
└── tests/
    ├── unit/
    │   └── lib/
    │       └── utils.test.ts
    └── e2e/
        └── auth.spec.ts`,
  },
  {
    name: "Go Microservice",
    icon: "◆",
    tree: `├── go.mod
├── go.sum
├── Makefile
├── Dockerfile
├── docker-compose.yml
├── .env
├── README.md
├── cmd/
│   └── server/
│       └── main.go
├── internal/
│   ├── config/
│   │   ├── config.go
│   │   └── config_test.go
│   ├── domain/
│   │   ├── models/
│   │   │   ├── user.go
│   │   │   ├── order.go
│   │   │   └── product.go
│   │   ├── repository/
│   │   │   ├── user_repository.go
│   │   │   ├── order_repository.go
│   │   │   └── product_repository.go
│   │   └── service/
│   │       ├── user_service.go
│   │       ├── user_service_test.go
│   │       ├── order_service.go
│   │       └── product_service.go
│   ├── handler/
│   │   ├── http/
│   │   │   ├── user_handler.go
│   │   │   ├── order_handler.go
│   │   │   ├── product_handler.go
│   │   │   ├── middleware.go
│   │   │   └── router.go
│   │   └── grpc/
│   │       ├── user_grpc.go
│   │       └── proto/
│   │           └── user.proto
│   ├── infrastructure/
│   │   ├── database/
│   │   │   ├── postgres.go
│   │   │   └── migrations/
│   │   │       ├── 001_create_users.up.sql
│   │   │       └── 001_create_users.down.sql
│   │   ├── cache/
│   │   │   └── redis.go
│   │   └── messaging/
│   │       ├── kafka_producer.go
│   │       └── kafka_consumer.go
│   └── middleware/
│       ├── auth.go
│       ├── logging.go
│       ├── ratelimit.go
│       └── cors.go
├── pkg/
│   ├── logger/
│   │   └── logger.go
│   ├── validator/
│   │   └── validator.go
│   └── errors/
│       └── errors.go
└── api/
    └── openapi/
        └── spec.yaml`,
  },
  {
    name: "FastAPI Backend",
    icon: "⚡",
    tree: `├── pyproject.toml
├── requirements.txt
├── Dockerfile
├── docker-compose.yml
├── alembic.ini
├── .env
├── README.md
├── app/
│   ├── __init__.py
│   ├── main.py
│   ├── config.py
│   ├── dependencies.py
│   ├── api/
│   │   ├── __init__.py
│   │   ├── v1/
│   │   │   ├── __init__.py
│   │   │   ├── router.py
│   │   │   ├── endpoints/
│   │   │   │   ├── __init__.py
│   │   │   │   ├── auth.py
│   │   │   │   ├── users.py
│   │   │   │   ├── items.py
│   │   │   │   └── admin.py
│   │   │   └── schemas/
│   │   │       ├── __init__.py
│   │   │       ├── user.py
│   │   │       ├── item.py
│   │   │       └── auth.py
│   │   └── deps.py
│   ├── core/
│   │   ├── __init__.py
│   │   ├── security.py
│   │   ├── config.py
│   │   └── exceptions.py
│   ├── models/
│   │   ├── __init__.py
│   │   ├── user.py
│   │   ├── item.py
│   │   └── base.py
│   ├── crud/
│   │   ├── __init__.py
│   │   ├── base.py
│   │   ├── user.py
│   │   └── item.py
│   ├── db/
│   │   ├── __init__.py
│   │   ├── session.py
│   │   └── base.py
│   ├── services/
│   │   ├── __init__.py
│   │   ├── email.py
│   │   ├── auth_service.py
│   │   └── notification.py
│   └── utils/
│       ├── __init__.py
│       ├── helpers.py
│       └── constants.py
├── alembic/
│   ├── env.py
│   └── versions/
│       └── 001_initial.py
└── tests/
    ├── __init__.py
    ├── conftest.py
    ├── test_auth.py
    ├── test_users.py
    └── test_items.py`,
  },
];

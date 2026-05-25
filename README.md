# Naptech Factory OS

Complete development plan for building a modern Factory Operating System for Indian automobile manufacturing SMEs.

## Project Goal

Build a modern Factory Operating System that helps factories manage:

- Inventory
- Production workflow
- Worker assignments
- Task tracking
- Stock monitoring
- Notifications
- Operational analytics

The architecture must stay modular and scalable so future AI integrations can be added after enough operational data is collected.

## Important Development Rules

### Do Not Build

- Complex ERP
- SAP-like system
- Heavy enterprise architecture
- AI features in Version 1

### Build

- Simple workflows
- Clean UI
- Fast APIs
- Mobile-friendly dashboard
- Modular scalable architecture

## System Architecture

```text
Frontend (Next.js)
        |
Backend APIs (FastAPI)
        |
PostgreSQL Database
        |
Redis (later stage)
        |
Future AI Layer
```

## Version 1 Scope

Only build:

- Inventory management
- Production tracking
- Dashboard
- Notifications
- Authentication

Do not build yet:

- AI systems
- Voice systems
- Computer vision
- Predictive analytics

## Frontend Requirements

### Tech Stack

- Next.js 15
- React
- TypeScript
- Tailwind CSS
- ShadCN UI

### Frontend Design Style

The UI should feel like a modern industrial dashboard:

- Clean
- Minimal
- Mobile responsive
- Dark sidebar
- Light content area
- Large readable components
- Practical layout for factory supervisors and workers

Use:

- Card layouts
- Data tables
- Graphs and charts
- Progress indicators

### Public Pages

- [x] Login

### Dashboard Page

KPI cards:

- [x] Total Inventory
- [x] Low Stock Items
- [x] Active Production Tasks
- [x] Delayed Tasks

Charts:

- [x] Inventory Overview
- [x] Production Analytics

Tables:

- [x] Recent stock movement
- [x] Active production tasks

### Inventory Module

Features:

- [x] Inventory list
- [x] Add inventory item
- [x] Edit inventory
- [x] Delete inventory
- [x] Search inventory
- [x] Low stock highlighting
- [x] Add/Edit modal
- [x] Inventory movement history
- [x] Inventory logs view

### Production Module

Features:

- [x] Task board
- [x] Create production task
- [x] Assign worker
- [x] Update status
- [x] Delay reporting
- [x] Completed task logs
- [x] Worker assignment view

### Notifications Module

Features:

- [x] Alerts panel
- [x] Low stock alerts
- [x] Production delay alerts
- [x] Task update alerts

### Authentication UI

Features:

- [x] Login
- [x] Logout
- [ ] Role-based access

## Backend Requirements

### Tech Stack

- Python
- FastAPI
- SQLAlchemy
- Pydantic
- Alembic migrations
- JWT authentication

### Backend Architecture

```text
backend/
|
├── app/
│   ├── main.py
│   ├── routes/
│   ├── models/
│   ├── schemas/
│   ├── services/
│   ├── database/
│   ├── middleware/
│   └── utils/
```

### Coding Requirements

- [x] Modular architecture
- [x] Clean code
- [x] Reusable components
- [x] API validation
- [x] Proper error handling
- [x] Environment variable support
- [x] Production-ready folder structure

## Backend APIs

### Authentication APIs

- [x] Login
- [x] JWT auth
- [x] Role-based middleware

### Inventory APIs

- [x] `POST /inventory` - Create inventory
- [x] `GET /inventory` - Get inventory
- [x] `PUT /inventory/{id}` - Update inventory
- [x] `DELETE /inventory/{id}` - Delete inventory
- [x] `GET /inventory/logs` - Get inventory movement logs

### Production APIs

- [x] `POST /tasks` - Create task
- [x] `GET /tasks` - Get tasks
- [x] `PUT /tasks/{id}` - Update task
- [x] `PUT /tasks/{id}/complete` - Complete task

### Dashboard APIs

- [x] `GET /dashboard` - Dashboard summary

Dashboard summary should return:

- Total inventory
- Low stock count
- Active tasks
- Delayed tasks
- Production summary

### Notifications APIs

- [x] `GET /notifications` - Get notifications

## Database Requirements

Database:

- PostgreSQL

### users

Fields:

- `id`
- `name`
- `email`
- `password`
- `role`
- `created_at`

### inventory

Fields:

- `id`
- `product_name`
- `sku_code`
- `quantity`
- `minimum_stock`
- `location`
- `created_at`
- `updated_at`

### inventory_logs

Fields:

- `id`
- `inventory_id`
- `action_type`
- `quantity_changed`
- `updated_by`
- `timestamp`

### production_tasks

Fields:

- `id`
- `task_name`
- `assigned_worker`
- `status`
- `priority`
- `start_time`
- `end_time`
- `remarks`
- `created_at`

### notifications

Fields:

- `id`
- `message`
- `type`
- `is_read`
- `created_at`

## Authentication And Permissions

Use JWT authentication.

Roles:

- Admin
- Supervisor
- Worker

Permissions:

- Admin: full access
- Supervisor: production and inventory management
- Worker: task updates only

## Deployment Requirements

### Frontend

Deploy on:

- Vercel

### Backend

Deploy on:

- Railway
- DigitalOcean

### Database

Use:

- Neon PostgreSQL

## Future AI Roadmap

Do not implement these in Version 1.

### AI Inventory Prediction

Predict:

- Low stock timing
- Fast-moving inventory
- Dead stock

### AI Delay Detection

Detect:

- Workflow bottlenecks
- Delayed production patterns

### AI Reports

Generate:

- Daily summaries
- Production insights

### Voice Workflow Assistant

Future feature:

- Hindi voice updates from workers

### AI Quality Inspection

Future feature:

- Computer vision for defect detection

## Development Roadmap

### Phase 1: Planning

- [x] Document product goal
- [x] Document Version 1 scope
- [x] Document system architecture
- [x] Document frontend requirements
- [x] Document backend requirements
- [x] Document database tables
- [ ] Finalize user journeys for Admin, Supervisor, and Worker
- [ ] Confirm first production section for pilot testing
- [ ] Confirm first inventory category for pilot testing

### Phase 2: Backend Development

- [x] Create backend folder structure
- [x] Set up FastAPI
- [x] Configure environment variables
- [x] Configure PostgreSQL connection
- [x] Add SQLAlchemy models
- [x] Add Pydantic schemas
- [ ] Add Alembic migrations
- [x] Build authentication APIs
- [x] Build JWT utilities
- [x] Build role-based middleware
- [x] Build inventory APIs
- [x] Build inventory movement logs
- [x] Build production task APIs
- [x] Build dashboard summary API
- [x] Build notifications API
- [x] Add validation and error handling

### Phase 3: Frontend Development

- [x] Create Next.js 15 app
- [x] Set up TypeScript
- [x] Set up Tailwind CSS
- [x] Set up ShadCN UI
- [x] Build app layout with dark sidebar
- [x] Build login page
- [x] Build dashboard page
- [x] Build KPI cards
- [x] Build charts
- [x] Build inventory page
- [x] Build inventory add/edit modal
- [x] Build inventory logs view
- [x] Build production task board
- [x] Build production task forms
- [x] Build worker task update flow
- [x] Build notifications panel
- [x] Add mobile responsive layouts

### Phase 4: Integration

- [ ] Connect frontend to backend APIs
- [ ] Add protected routes
- [ ] Add role-based frontend navigation
- [ ] Add loading states
- [ ] Add empty states
- [ ] Add error states
- [ ] Test CRUD flows end to end
- [ ] Test JWT auth flow
- [ ] Test permissions by role

### Phase 5: Internal Testing

Test with:

- [ ] One production section
- [ ] One inventory category
- [ ] One supervisor
- [ ] Sample worker accounts
- [ ] Realistic inventory entries
- [ ] Realistic production tasks

Goals:

- [ ] Improve workflows
- [ ] Find usability issues
- [ ] Reduce operational errors
- [ ] Confirm supervisors can monitor live work
- [ ] Confirm workers can update tasks quickly

### Phase 6: Deployment

- [ ] Deploy frontend on Vercel
- [ ] Deploy backend on Railway or DigitalOcean
- [ ] Create Neon PostgreSQL database
- [ ] Configure production environment variables
- [ ] Run migrations in production
- [ ] Test production login
- [ ] Test production inventory flow
- [ ] Test production task flow

## Final Product Goal

Build:

> Factory Operating System for Indian Automobile SMEs

Starting features:

- Inventory Management
- Production Tracking
- Operational Dashboard

Future expansion:

- AI Analytics
- Predictive Systems
- Voice Workflows
- Industrial SaaS Platform

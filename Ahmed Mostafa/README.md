# Storage Gateway + Replication Planner

This project implements the Storage Gateway and Replication Planner services for the CSE474 distributed storage project.

| Service | Assignment # | Pattern | Main responsibility |
| --- | ---: | --- | --- |
| Storage Gateway | 19 | Hybrid REST + Kafka | Store/retrieve chunk bytes and publish `chunk.stored` |
| Replication Planner | 20 | Kafka-first consumer | Consume upload/failure/integrity events and publish `replication.task.created` |

Both services expose `GET /health` and `GET /ready`, use the standard JSON response envelope, run with PM2, have independent MongoDB databases, and are containerized separately.

## Project Structure

```text
services/
  storage-gateway/
    src/                 REST API, object storage, Kafka producer
    Dockerfile
    openapi.yaml
  replication-planner/
    src/                 Kafka consumer, planning logic, health API
    Dockerfile
    openapi.yaml
shared/                  response format, Kafka, MongoDB, logging helpers
k8s/                     deployment/service/configmap/secret for each service
AMicroServiceDiagrams.drawio.pdf
docker-compose.yml
pm2/ecosystem.config.cjs
```

## Run With Docker Compose

```powershell
docker compose up -d --build
```

Services:

| URL | Description |
| --- | --- |
| `http://localhost:8080` | Simple browser test UI |
| `http://localhost:3019/health` | Storage Gateway liveness |
| `http://localhost:3019/ready` | Storage Gateway readiness |
| `http://localhost:3020/health` | Replication Planner liveness |
| `http://localhost:3020/ready` | Replication Planner readiness |

Kafka is available inside Docker as `kafka:9092` and from the host as `localhost:9094`.

## Smoke Test

Store a chunk through Storage Gateway:

```powershell
$body = [Text.Encoding]::UTF8.GetBytes("hello distributed storage")
Invoke-RestMethod `
  -Uri "http://localhost:3019/objects/chunk-demo-1" `
  -Method Put `
  -ContentType "application/octet-stream" `
  -Body $body
```

Read it back using the standard JSON envelope:

```powershell
Invoke-RestMethod "http://localhost:3019/objects/chunk-demo-1"
```

Manually trigger the planner for demonstration:

```powershell
$payload = @{
  topic = "upload.completed"
  event = @{
    event_id = "demo-upload-1"
    event_type = "upload.completed"
    data = @{
      chunks = @(@{ chunk_id = "chunk-demo-1"; replicas = @("storage-node-a") })
    }
  }
} | ConvertTo-Json -Depth 8

Invoke-RestMethod `
  -Uri "http://localhost:3020/replication/plan" `
  -Method Post `
  -ContentType "application/json" `
  -Body $payload
```

## Kafka Topics

| Topic | Producer | Consumer |
| --- | --- | --- |
| `chunk.stored` | Storage Gateway | Integrity Checker service |
| `upload.completed` | Upload Session service | Replication Planner |
| `node.heartbeat.missed` | Node Health service | Replication Planner |
| `integrity.failed` | Integrity Checker service | Replication Planner |
| `replication.task.created` | Replication Planner | Replication Worker |
| `replication.task.created.DLQ` | Replication Planner | Operations / DLQ inspection |

## Databases

Storage Gateway owns only its `storage_gateway` database:

```javascript
objects {
  _id: chunk_id,
  path,
  size,
  hash,
  content_type,
  created_at,
  updated_at
}
```

Replication Planner owns only its `replication_planner` database:

```javascript
replication_policies {
  _id,
  name,
  default_factor,
  created_at,
  updated_at
}

replication_plan_runs {
  _id: plan_id,
  source_topic,
  source_event_id,
  trigger_type,
  task_count,
  status,
  error,
  created_at,
  updated_at
}
```

MongoDB indexes are created on startup: `objects.hash`, `objects.updated_at`, unique `replication_policies.name`, unique `{ source_topic, source_event_id }`, `trigger_type`, and `created_at`.

## PM2 Local Run

For a PM2 demonstration, start only infrastructure first:

```powershell
docker compose up -d kafka storage-db replication-db
npm install
npm run pm2:start
```

The PM2 config uses host ports `27019`, `27020`, and `9094` from Compose. Stop the PM2 processes with:

```powershell
npm run pm2:stop
```

## Tests And Syntax Checks

```powershell
npm test
npm run lint
```

The included tests cover chunk validation/hash behavior and replication task planning logic.

## Kubernetes

Each service includes the required Kubernetes files:

```powershell
kubectl apply -f k8s/storage-gateway
kubectl apply -f k8s/replication-planner
```

Both deployments set `replicas: 2`, use `ClusterIP` services, and include readiness/liveness probes.

## API Documentation

OpenAPI files:

- `services/storage-gateway/openapi.yaml`
- `services/replication-planner/openapi.yaml`

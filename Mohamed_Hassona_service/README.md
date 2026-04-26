# Chunk Catalog + Chunk Location

This repository implements the two services assigned to Student 5 from the project document:

- `Chunk Catalog`
- `Chunk Location`

The implementation follows the documented scope only:

- independent microservices
- separate PostgreSQL database per service
- REST endpoints defined in the assignment
- `GET /health` and `GET /ready`
- standard JSON response format
- PM2 support
- Dockerfiles for each service
- `docker-compose.yml`
- Kubernetes manifests with `replicas: 2`
- tests
- API documentation

The assignment document classifies both services as **Pure REST Only**, so no Kafka producer or consumer logic is added here.

## Structure

```text
services/
  chunk-catalog/
  chunk-location/
docker-compose.yml
ecosystem.config.js
```

## Services

### Chunk Catalog

- `POST /chunks`
- `GET /chunks?file_id=...`
- database: `chunks(id PK, file_id, chunk_no UNIQUE per file, hash, size)`

OpenAPI: [openapi.yaml](</e:/PM2 Service/services/chunk-catalog/openapi.yaml>)

### Chunk Location

- `POST /chunk-locations`
- `GET /chunks/{id}/replicas`
- database: `chunk_locations(id PK, chunk_id, node_id UNIQUE)`

OpenAPI: [openapi.yaml](</e:/PM2 Service/services/chunk-location/openapi.yaml>)

Note: the document lists `node_id UNIQUE` literally. That would allow only one chunk per node, which conflicts with chunk replica storage. The implementation uses a composite uniqueness rule on `(chunk_id, node_id)` so the service can correctly track replicas without duplicates.

## Standard JSON responses

Success:

```json
{
  "success": true,
  "data": {},
  "meta": {
    "service": "service-name",
    "request_id": "uuid"
  }
}
```

Error:

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Description",
    "details": {}
  },
  "meta": {
    "service": "service-name",
    "request_id": "uuid"
  }
}
```

## Run locally

Install dependencies:

```bash
npm install
```

Run tests:

```bash
npm test
```

Run both services with PM2:

```bash
npm run start:pm2
```

## Run with Docker Compose

```bash
docker compose up --build
```

Services:

- Chunk Catalog: `http://localhost:3001`
- Chunk Location: `http://localhost:3002`

## Environment

### Chunk Catalog

- `PORT` default `3001`
- `DATABASE_URL`

### Chunk Location

- `PORT` default `3002`
- `DATABASE_URL`
- `NODE_REGISTRY_BASE_URL` optional, documented for future integration

## Kubernetes

Each service includes:

- `deployment.yaml`
- `service.yaml`
- `configmap.yaml`
- `secret.yaml`

Both deployments are configured with `replicas: 2`, plus readiness and liveness probes.

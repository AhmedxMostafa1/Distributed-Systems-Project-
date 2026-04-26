# Chunk Catalog + Chunk Location

This repository contains the two services as separate top-level folders:

- `chunk-catalog/`
- `chunk-location/`

The published repo excludes the service test files, as requested.

## Structure

```text
chunk-catalog/
chunk-location/
docker-compose.yml
ecosystem.config.js
package.json
```

## Services

### Chunk Catalog

- `POST /chunks`
- `GET /chunks?file_id=...`
- OpenAPI: `chunk-catalog/openapi.yaml`

### Chunk Location

- `POST /chunk-locations`
- `GET /chunks/{id}/replicas`
- OpenAPI: `chunk-location/openapi.yaml`

## Run locally

```bash
npm install
npm run start:pm2
```

## Run with Docker Compose

```bash
docker compose up --build
```

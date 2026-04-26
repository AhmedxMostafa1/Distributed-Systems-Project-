# Chunk Catalog + Chunk Location


## Structure

```text
Mohamed_Hassona_service/
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
- OpenAPI: `Mohamed_Hassona_service/chunk-catalog/openapi.yaml`

### Chunk Location

- `POST /chunk-locations`
- `GET /chunks/{id}/replicas`
- OpenAPI: `Mohamed_Hassona_service/chunk-location/openapi.yaml`

## Run locally

```bash
npm install
npm run start:pm2
```

## Run with Docker Compose

```bash
docker compose up --build
```

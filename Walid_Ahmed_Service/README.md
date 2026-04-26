# Walid_Ahmed_Service - Secrets Broker + Chaos Simulator

This repository contains the Phase 2 implementation.

- `Secrets Broker` (`#33`)
- `Chaos Simulator` (`#34`)

The implementation follows the document's communication classification:

- `Secrets Broker` is `Pure REST Only`
- `Chaos Simulator` is `Hybrid REST + Kafka`

## Structure

```text
Walid_Ahmed_Service/
  chaos-simulator/
    docs/
    k8s/
    src/
    tests/
  secrets-broker/
    docs/
    k8s/
    src/
    tests/
  docker-compose.yml
  ecosystem.config.js
  README.md
```

## Services

### Secrets Broker

- Communication pattern: Pure REST Only
- Endpoint: `POST /secrets/issue`
- Health endpoints: `GET /health`, `GET /ready`
- Database collection: `issued_secrets`
- Security note: no Kafka publishing for secrets-related operations

### Chaos Simulator

- Communication pattern: Hybrid REST + Kafka
- Endpoints: `POST /chaos/latency`, `POST /chaos/error-rate`
- Health endpoints: `GET /health`, `GET /ready`
- Database collection: `chaos_rules`
- Kafka topic: `chaos.rule.activated`

## Requirements Covered

- Independent microservices
- Separate databases
- Standard JSON response format
- Docker support
- PM2 support
- Kubernetes manifests
- API documentation
- Basic automated tests

## Install

```bash
cd secrets-broker && npm install
cd ../chaos-simulator && npm install
```

## Run With Docker

Start Docker Desktop first, then run:

```bash
docker compose up --build
```

Available ports:

- Secrets Broker: `http://localhost:3001`
- Chaos Simulator: `http://localhost:3002`
- Kafka: `localhost:9092`

## Run With PM2

```bash
pm2 start ecosystem.config.js
pm2 status
```

## Run Tests

```bash
cd secrets-broker && npm test
cd ../chaos-simulator && npm test
```

## API Documentation

OpenAPI files:

- [secrets-broker/docs/openapi.json](./secrets-broker/docs/openapi.json)
- [chaos-simulator/docs/openapi.json](./chaos-simulator/docs/openapi.json)

Each service also exposes:

- `GET /docs/openapi.json`

## Kubernetes Manifests

Secrets Broker:

- [deployment.yaml](./secrets-broker/k8s/deployment.yaml)
- [service.yaml](./secrets-broker/k8s/service.yaml)
- [configmap.yaml](./secrets-broker/k8s/configmap.yaml)
- [secret.yaml](./secrets-broker/k8s/secret.yaml)

Chaos Simulator:

- [deployment.yaml](./chaos-simulator/k8s/deployment.yaml)
- [service.yaml](./chaos-simulator/k8s/service.yaml)
- [configmap.yaml](./chaos-simulator/k8s/configmap.yaml)
- [secret.yaml](./chaos-simulator/k8s/secret.yaml)

Both deployments are configured with `replicas: 2`.

## API Summary

### Secrets Broker

#### `POST /secrets/issue`

Request:

```json
{
  "service": "chaos-simulator",
  "expiresInSeconds": 3600
}
```

Behavior:

- generates a secret
- hashes it before storage
- stores `service`, `secret_hash`, `expires_at`
- returns the raw secret once

### Chaos Simulator

#### `POST /chaos/latency`

Request:

```json
{
  "service": "file-registry",
  "value": {
    "delayMs": 250
  },
  "enabled": true
}
```

#### `POST /chaos/error-rate`

Request:

```json
{
  "service": "file-registry",
  "value": {
    "percentage": 15
  },
  "enabled": true
}
```

Behavior:

- upserts a chaos rule in MongoDB
- returns the REST response immediately
- publishes `chaos.rule.activated` in the background when the rule is enabled

## Notes

- Secrets use a MongoDB TTL index for automatic expiry cleanup.
- Chaos rules are unique by `service + type`.
- This repository includes the application-layer deliverables requested by the document. Full CI/CD, GHCR publishing, and live Kubernetes deployment still depend on your actual environment.

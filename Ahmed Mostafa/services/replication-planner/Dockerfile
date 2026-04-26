FROM node:20-alpine

WORKDIR /app
ENV NODE_ENV=production

COPY package*.json ./
RUN npm install --omit=dev

COPY shared ./shared
COPY services/replication-planner ./services/replication-planner

EXPOSE 3000

CMD ["npx", "pm2-runtime", "services/replication-planner/ecosystem.config.cjs"]

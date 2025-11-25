# --- Stage 1: Build ---
FROM node:20-alpine AS builder

WORKDIR /app

# 先複製 package 設定，利用 Docker Layer 快取機制加速安裝
COPY package*.json ./
RUN npm install

# 複製原始碼並編譯
COPY . .
RUN npm run build

# --- Stage 2: Production Run ---
FROM node:20-alpine

WORKDIR /app

# 只複製編譯後的檔案與 package.json
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package*.json ./

# 只安裝生產環境依賴 (省略 devDependencies)
RUN npm install --only=production

EXPOSE 3000

# 啟動應用
CMD ["node", "dist/main"]
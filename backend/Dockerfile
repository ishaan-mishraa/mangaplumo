FROM node:18-buster

# install Chrome dependencies for Puppeteer
RUN apt-get update \
 && apt-get install -y \
    wget gnupg --no-install-recommends \
 && wget -qO- https://dl-ssl.google.com/linux/linux_signing_key.pub | apt-key add - \
 && echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" \
    > /etc/apt/sources.list.d/google.list \
 && apt-get update \
 && apt-get install -y google-chrome-stable \
 && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY package*.json ./
RUN npm ci

COPY . .
EXPOSE 4000
CMD ["npm", "run", "dev"]

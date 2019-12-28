FROM node
LABEL name="order-server"
LABEL version="1.0"
COPY . /app
WORKDIR /app
RUN yarn install
EXPOSE 8080
CMD ["yarn", "run", "dev"]
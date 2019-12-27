FROM node
LABEL name="order-server"
LABEL version="1.0"
COPY . /app
WORKDIR /app
EXPOSE 8080
CMD npm start
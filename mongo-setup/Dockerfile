FROM mongo:4
RUN mkdir /config
WORKDIR /config

COPY mongo-setup.js .
COPY mongo-setup.sh .
COPY init.json .

CMD [ "sh",  "/config/mongo-setup.sh"]

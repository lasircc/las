FROM mongo:4
RUN mkdir /config
WORKDIR /config

COPY mongo-setup.js .
COPY mongo-setup.sh .

CMD [ "sh",  "/config/mongo-setup.sh"]

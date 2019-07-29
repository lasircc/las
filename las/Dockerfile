# Multi-stage builds (Docker 17.05+)

# Install node modules
FROM node AS build

RUN mkdir /assets
WORKDIR /assets
COPY _config/packaging/package.json /assets
RUN npm install


FROM python:3.7
ENV PYTHONUNBUFFERED=1

# Copy installed modules into this new container
COPY --from=build /assets /assets

#RUN mkdir /graphdb
COPY _config/graphdb graphdb/

RUN mkdir /data
WORKDIR /data
COPY _config/packaging/requirements.txt /data/

RUN pip install -r requirements.txt


#COPY _config/las-setup.sh /data


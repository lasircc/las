#!/bin/bash

echo 'Launching the LAS container...\n\n'

echo ' *          *        ***'
echo ' *        *   *     *'
echo ' *       * +++ *      *'
echo ' *       *     *       *'
echo ' *****   *     *    ***\n\n'




if [ ! -f /las_status/las-init.flag ]; then
    echo "Init LAS"

    echo 'Migrating data'
    # collect static files TODO: run it just once or when a new app is added
    python manage.py migrate

    echo 'Create user admin'
    python manage.py createAdmin --username admin --email las@ircc.it --password admin --noinput

    echo 'Creating the data model repository in GraphDB'
    curl -X POST http://graphdb:7200/rest/repositories -H 'Accept: application/json' -H 'Content-Type: multipart/form-data' -F "config=@/graphdb/config.ttl"

    echo 'Loading starting model'
    curl -X POST -H "Content-Type:application/x-turtle" -T /graphdb/model.ttl  http://graphdb:7200/repositories/las_ontology/statements

    mkdir -p /data/las_status/
    touch /las_status/las-init.flag

else
    echo "LAS already initialized"
fi

if [ "$PRODUCTION" = True ]; then

    echo '\n'
    echo ' *****   *****      * *     * *       +'
    echo ' *    *  *    *   *     *   *    *    +'
    echo ' * **    * **     *     *   *    *    +'
    echo ' *       *  *     *     *   *    *     '
    echo ' *       *    *    * * *    * * *     +\n\n'

    echo 'Copying Django static files to deploy in PRODUCTION!!!'
    python manage.py collectstatic --noinput

    echo 'Starting gunicorn to serve the LAS in PRODUCTION'
    gunicorn --config=gunicorn_config.py LAS.wsgi

else 
    echo 'Starting development server'
    python manage.py runserver 0.0.0.0:8000
fi



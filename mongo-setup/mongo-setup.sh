#!/bin/bash
TIMEOUT=15
QUIET=0
rm -f /data/mongo-replica.flag
sleep 10 | echo 'sleep to wait lasmongodb1'

wait_for() {
  for i in `seq $TIMEOUT` ; do
    mongo mongodb://lasmongodb1:27017/las --eval "db.stats()" > /dev/null 2>&1
    result=$?

    if [ $result -eq 0 ]; then
        echo "Mongo replica set running!"
        touch /data/mongo-replica.flag
        exit 0
    fi
    sleep 1
  done
  echo "Operation timed out" >&2
  exit 1
}

if [ ! -f /data/mongo-init.flag ]; then

    echo "Init replicaset"
    mongo mongodb://lasmongodb1:27017 /config/mongo-setup.js

    echo "Import starting data"

    while true; do
        echo "Replicaset: hosts status"
        mongo --port 27017 --host lasmongodb1 --eval "rs.status()" | grep stateStr

        primary=$(mongo --port 27017 --host lasmongodb1 --eval "rs.status()" | grep stateStr | grep PRIMARY | wc -l)
        if [[ "$primary" == 1 ]]; then
            echo "Replicaset up and running. Importing data from init.json"
            mongoimport --host lasmongodb1 --port 27017 --db las --collection dataModel --type json --file /config/init.json --jsonArray
            break
        fi
        sleep 1
    done
    
    
    touch /data/mongo-init.flag
else
    echo "Replicaset already initialized"
fi

wait_for "$@"
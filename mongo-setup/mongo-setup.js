rsconf = {
    _id : "rslas",
    members: [
        {
            "_id": 0,
            "host": "lasmongodb1:27017",
            "priority": 3
        },
        {
            "_id": 1,
            "host": "lasmongodb2:27017",
            "priority": 2
        },
        {
            "_id": 2,
            "host": "lasmongodb3:27017",
            "priority": 1
        }
    ]
}

rs.initiate(rsconf);
rs.conf();
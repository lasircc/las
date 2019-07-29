# LAS Configuration

This is the configuration folder of the LAS.

## Packaging

Python and node packages are listed in the folder `packaging`. Regarding this topic, please fix issue [#34](https://github.com/lasircc/las-docker/issues/34).

## GraphDB

We create a new repository in GraphDB with its [REST APIs](http://graphdb.ontotext.com/free/devhub/workbench-rest-api/curl-commands.html). Particularly, you can `POST` a `.ttl` config file, e.g.:

```bash
curl -X POST http://graphdb:7200/rest/repositories -H 'Accept: application/json' -H 'Content-Type: multipart/form-data' -F "config=@your_config_file.ttl"
```

Alternatively, you can also `POST` a `JSON` configuration, e.g.:

```json
curl -X POST <base_url>/rest/repositories -H 'Content-Type:application/json' -d '
    {
        "id": "<repo_id>",
        "location": "<location_uri>",
        "params": {
                "baseURL": {
                    "label": "Base URL",
                    "name": "baseURL",
                    "value": "http://example.org/graphdb#"
                },
                "entityIndexSize": {
                    "label":"Entity index size",
                    "name":"entityIndexSize",
                    "value":"200000"
                },
                "entityIdSize": {
                    "label":"Entity ID bit-size",
                    "name":"entityIdSize",
                    "value":"32"
                },
                "ruleset": {
                    "label":"Ruleset",
                    "name":"ruleset",
                    "value":"owl-horst-optimized"
                },
                "storageFolder": {
                    "label":"Storage folder",
                    "name":"storageFolder",
                    "value":"storage"
                },
                "enableContextIndex": {
                    "label":"Use context index",
                    "name":"enableContextIndex",
                    "value":"false"
                },
                "cacheMemory": {
                    "label":"Total cache memory",
                    "name":"cacheMemory",
                    "value":"80m"
                },
                "tupleIndexMemory": {
                    "label":"Tuple index memory",
                    "name":"tupleIndexMemory",
                    "value":"80m"
                },
                "enablePredicateList": {
                    "label":"Use predicate indices",
                        "name":"enablePredicateList",
                    "value":"false"
                },
                "predicateMemory":{
                    "label":"Predicate index memory",
                    "name":"predicateMemory",
                    "value":"0"
                },
                "ftsMemory":{
                    "label":"Full-text search memory",
                    "name":"ftsMemory",
                    "value":"0"
                },
                "ftsIndexPolicy":{
                    "label":"Full-text search indexing policy",
                    "name":"ftsIndexPolicy",
                    "value":"never"
                },
                "ftsLiteralsOnly":{
                    "label":"Full-text search literals only",
                    "name":"ftsLiteralsOnly",
                    "value":"true"
                },
                "inMemoryLiteralProperties":{
                    "label":"Cache literal language tags",
                    "name":"inMemoryLiteralProperties",
                    "value":"false"
                },
                "enableLiteralIndex":{
                    "label":"Enable literal index",
                    "name":"enableLiteralIndex",
                    "value":"true"
                },
                "indexCompressionRatio":{
                    "label":"Index compression ratio",
                    "name":"indexCompressionRatio",
                    "value":"-1"
                },
                 "checkForInconsistencies":{
                    "label":"Check for inconsistencies",
                    "name":"checkForInconsistencies",
                    "value":"false"
                },
                "disableSameAs":{
                    "label":"Disable owl:sameAs",
                    "name":"disableSameAs",
                    "value":"false"
                },
                 "enableOptimization":{
                    "label":"Enable query optimisation",
                    "name":"enableOptimization",
                    "value":"true"
                },
                "transactionIsolation":{
                    "label":"Transaction isolation",
                    "name":"transactionIsolation",
                    "value":"true"
                },
                 "transactionMode":{
                    "label":"Transaction mode",
                    "name":"transactionMode",
                    "value":"safe"
                },
                "queryTimeout":{
                    "label":"Query time-out (seconds)",
                    "name":"queryTimeout",
                    "value":"0"
                },
                "queryLimitResults":{
                    "label":"Limit query results",
                    "name":"queryLimitResults",
                    "value":"0"
                },
                "throwQueryEvaluationExceptionOnTimeout": {
                    "label":"Throw exception on query time-out",
                    "name":"throwQueryEvaluationExceptionOnTimeout",
                    "value":"false"
                },
                "readOnly": {
                    "label":"Read-only",
                    "name":"readOnly",
                    "value":"false"
                },
                "nonInterpretablePredicates":{
                    "label":"Non-interpretable predicates",
                    "name":"nonInterpretablePredicates",
                    "value":"http://www.w3.org/2000/01/rdf-schema#label;http://www.w3.org/1999/02/22-rdf-syntax-ns#type;http://www.ontotext.com/owlim/ces#gazetteerConfig;http://www.ontotext.com/owlim/ces#metadataConfig"
                }

        },
        "title": <repo_title>,
        "type": <repo_type>
    }'```

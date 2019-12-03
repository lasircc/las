from celery import shared_task, group
import requests
from django.conf import settings
import os
import gzip
from LASUtils.mongodb import db
import json
import copy
#import xmltodict
import time
from bson.objectid import ObjectId

@shared_task
def hello():
    print("Hello there!") 


@shared_task
def execDbOp(op, ns, session, requestId):
    if op['op'] == 'i':
        if '_type' not in op['doc']:
            raise Exception('no class')
        docId = str(db[ns].insert_one(op['doc']).inserted_id)
        typeDoc = op['doc']['_type']
        
    else: #for all other operations (delete, update)
        doc = db[ns].find_one(op['filter'])
        typeDoc = doc['_type']
        docId = str(doc['_id'])
    
    triggers = db.triggers.find({"ns" : ns, "_class" : typeDoc, 'e': op['op']})
    for trigger in triggers:
        execTrigger.delay(docId, ns, str(trigger['_id'])).get(disable_sync_subtasks=False)


    return 


def fstr(template, **context): 
    print(context, template) 
    return eval(f"f'''{template}'''",context) 

def recurisiveStep(nodeid, pipeline, doc):
    if (nodeid == 'end'):
        return
    nodeid = str(int(float(nodeid)))
    node = pipeline[nodeid]
    print (node)
    #{'endif': 0, 'uuid': '511a28d9-44bc-4a55-a2e5-91b89bba476d', 'op': 'update', 'ns': 'entity', 'many': False, 'filter': '"""{"_id": {{doc["parent"]}}}"""', 'update': '"""{"$inc": { "capacity": -{{doc["features"]["quantity"]}} } }"""', 'id': 4, 'w_out': ['end'], 'w_in': ['start']}
    if node['op']=='update':
        contextDict = {'doc': doc}

        filterOp = fstr(f'{node["filter"]}', **contextDict )
        print ('filterOp', filterOp)
        queryCode = eval(filterOp)
        print ('eval', queryCode)
        
    return

@shared_task
def execTrigger(docid, ns, tid):
    doc = db[ns].find_one({ '_id': ObjectId(docid)})
    trigger = db.triggers.find_one({ '_id': ObjectId(tid)})

    pipeline = trigger['pipeline']
    docsModified= []

    # exec pipeline
    startNode = pipeline['start']
    for nodeid in startNode['w_out']:
        recurisiveStep(nodeid, pipeline, doc)


    for d in docsModified:
        triggers = db.triggers.find({"ns": d['ns'], "_class": d['_type'], "e": d['op'] })
        for t in triggers:
            execTrigger.delay(d['_id'], d['ns'], str(t['_id'])).get(disable_sync_subtasks=False)


    return True



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
        execTrigger.delay(docId, ns, str(trigger['_id']), session, requestId).get(disable_sync_subtasks=False)


    return 


def fstr(template, **context): 
    #print(context, template) 
    return eval(f"f'''{template}'''",context) 

def recurisiveStep(nodeid, pipeline, context, session, requestId, triggerId):
    try:
        if (nodeid == 'end'):
            return
        nodeid = str(int(float(nodeid)))
        node = pipeline[nodeid]
        print (node)
        ''' 
        Example of node 
        "1" : {
                "endif" : 0,
                "uuid" : "511a28d9-44bc-4a55-a2e5-91b89bba476d",
                "op" : "update",
                "ns" : "entity",
                "many" : false,
                "filter" : "\"\"\"{{\"_id\": ObjectId(\"{doc['parent']}\") }}\"\"\"",
                "update" : "\"\"\"{{\"$inc\": {{ \"capacity\": -{doc['features']['quantity']} }} }}\"\"\"",
                "id" : 1,
                "w_out" : [
                    "end"
                ],
                "w_in" : [
                    "start"
                ]
            }
        '''
        if node['op']=='update':
            filterOp = fstr(f'{node["filter"]}', **context )
            updateOp = fstr(f'{node["update"]}', **context )
            contextNode = {'ns': node['ns'], 'filter': eval(filterOp), 'update': eval(updateOp)}
            # check if one or many results
            if node['many']:
                query = """db.{ns}.update_many({filter}, {update})"""
                queryModified = """db.{ns}.find({filter})"""
            else:
                query = """db.{ns}.update_one({filter}, {update})"""
                queryModified = """db.{ns}.find_one({filter})"""
            

            queryOp = fstr(query, **contextNode )
            eval(queryOp)
            #print (res)
            queryMod = fstr(queryModified, **contextNode )
            resModified = eval(queryMod)
            if not node['many']:
                resModified = [resModified]
                
            #print ('resModified ---------------->', resModified)
            for r in resModified:
                #print (r)
                db.texec.update_one({'s': session, 'r': requestId, 't': triggerId}, {"$addToSet": {'modified': { 'ns': node['ns'], 'op': 'update', '_type': r['_type'], '_id': r['_id'] }  } } )

            nextNode = node['w_out'][0]

        if node['op'] == 'query':
            filterOp = fstr(f'{node["filter"]}', **context )
            contextNode = {'ns': node['ns'], 'filter': eval(filterOp)}
            if node['aggr']:
                query = """db.{ns}.aggregate({filter})"""
                
            else:
                if node['many']:
                    query = """db.{ns}.find({filter})"""
                else:
                    query = """db.{ns}.find_one({filter})"""
                if node['project']:
                    projectOp = fstr(f'{node["project"]}', **context )
                    contextNode['project'] = eval(projectOp)
                if node['count']:
                    query += ".count()"
                
            
            queryOp = fstr(query, **contextNode )
            context[node['var']] = eval(queryOp)
            nextNode = node['w_out'][0]


        if node['op'] == 'delete':
            filterOp = fstr(f'{node["filter"]}', **context )
            contextNode = {'ns': node['ns'], 'filter': eval(filterOp)}
            if node['many']:
                query = """db.{ns}.delete({filter})"""
                queryModified = """db.{ns}.find({filter})"""
            else:
                query = """db.{ns}.delete_one({filter})"""
                queryModified = """db.{ns}.find_one({filter})"""

            queryMod = fstr(queryModified, **contextNode )
            resModified = eval(queryMod)
            for r in resModified:
                #print (r)
                db.texec.update_one({'s': session, 'r': requestId, 't': triggerId}, {"$addToSet": {'modified': { 'ns': node['ns'], 'op': 'delete', '_type': r['_type'], '_id': r['_id'] }  } } )


            queryOp = fstr(query, **contextNode )
            eval(queryOp)
            nextNode = node['w_out'][0]

        if node['op'] == 'insert':
            filterOp = fstr(f'{node["filter"]}', **context )
            contextNode = {'ns': node['ns'], 'filter': eval(filterOp)}
            query = """db.{ns}.insert_one({filter})"""
            queryGet = """db.{ns}.find_one({id})"""
            queryOp = fstr(query, **contextNode )
            res = eval(queryOp)
            contextGet = {'id': res.inserted_id}
            queryGetOp  = fstr(queryGet, **contextGet)
            resInsert =  eval(queryGetOp)

            db.texec.update_one({'s': session, 'r': requestId, 't': triggerId}, {"$addToSet": {'modified': { 'ns': node['ns'], 'op': 'insert', '_type': resInsert['_type'], '_id': resInsert['_id'] }  } } )
            nextNode = node['w_out'][0]

        if node['op'] == 'ifelse':
            condition = fstr(f'{node["cond"]}', **context )
            flag = eval(condition)
            print (flag)
            if flag: # true condition
                nextNode = node['w_out'][0]
            else: #false condition
                nextNode = node['w_out'][1]
        if node['op'] == 'endif':
            nextNode = node['w_out'][0]
        if node['op'] == 'exception':
            raise Exception('exception trigger')
            
        recurisiveStep(nextNode, pipeline, context, session, requestId, triggerId) 

        return True
    except Exception as e:
        return False

@shared_task
def execTrigger(docid, ns, tid, session, requestId):
    try:
        doc = db[ns].find_one({ '_id': ObjectId(docid)})
        trigger = db.triggers.find_one({ '_id': ObjectId(tid)})

        pipeline = trigger['pipeline']
        
        res = db.texec.find_one({'s': session, 'r': requestId, 't': trigger['_id'], 'docs': doc['_id']  })
        if res:
            return
        else:
            db.texec.update_one({'s': session, 'r': requestId, 't': trigger['_id']}, {"$addToSet": {'docs': doc['_id'] } }, upsert=True )
        
        
        # exec pipeline
        contextDict = {'doc': doc}
        startNode = pipeline['start']
        
        for nodeid in startNode['w_out']:
            recurisiveStep(nodeid, pipeline, contextDict, session, requestId, trigger['_id'])


        docsModified = db.texec.find_one({'s': session, 'r': requestId, 't': trigger['_id']}, {'modified': 1})

        for d in docsModified['modified']:
            print (d)
            triggers = db.triggers.find({"ns": d['ns'], "_class": d['_type'], "e": d['op'] })
            for t in triggers:
                execTrigger.delay(d['_id'], d['ns'], str(t['_id'])).get(disable_sync_subtasks=False)
        return True
    except Exception as e:
        print (e)
        return False
    



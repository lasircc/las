from celery import shared_task, group
import requests
from django.conf import settings
import os
import gzip
from LASUtils.mongodb import db, run_transaction_with_retry
import json
import copy
#import xmltodict
import time
from bson.objectid import ObjectId

@shared_task
def hello():
    print("Hello there!") 


#@shared_task
def execDbOp(data):
    with db.client.start_session() as session:
        try:
            response = run_transaction_with_retry(execOp, session, data)
        except Exception as exc:
            # Do something with error.
            raise exc
    

def execOp(session, data):
    print ('ExecOp', data)
    op = data['operation']
    ns = data['ns']
    requestId = data['request']
    sessionId = data['session']
    with session.start_transaction():
        if op['op'] == 'i':
            if '_type' not in op['doc']:
                raise Exception('no class')
            docId = str(db[ns].insert_one(op['doc'], session=session).inserted_id)
            typeDoc = op['doc']['_type']
        
        if op['op'] == 'u':
            doc = db[ns].find_one(op['filter'], session=session)
            typeDoc = doc['_type']
            docId = str(doc['_id'])

            db[ns].update_one(op['filter'], op['update'], session=session)

        if op['op'] == 'd':
            doc = db[ns].find_one(op['filter'], session=session)
            typeDoc = doc['_type']
            docId = str(doc['_id'])
            db[ns].delete_one(op['filter'], session=session)
        
        
        triggers = db.triggers.find({"ns" : ns, "_class" : typeDoc, 'e': op['op']})
        for trigger in triggers:
            execTrigger(docId, ns, str(trigger['_id']), sessionId, requestId, session)
        
        db.texec.delete_many({'s': sessionId, 'r': requestId}, session=session)

    return 


def fstr(template, **context): 
    #print(context, template) 
    return eval(f"f'''{template}'''",context) 

def recurisiveStep(nodeid, pipeline, context, sessionId, requestId, triggerId, session):
    if (nodeid == 'end'):
        return
    nodeid = str(int(float(nodeid)))
    node = pipeline[nodeid]
    print ('node', node)
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
        f = eval(contextNode['filter'])
        u = eval(contextNode['update'])
        # check if one or many results
        if node['many']:
            db[node['ns']].update_many(f, u, session=session)
            resModified = db[node['ns']].find(f, session=session)
        else:
            db[node['ns']].update_one(f, u, session=session)
            resModified = db[node['ns']].find_one(f, session=session)

        
        if not node['many']:
            resModified = [resModified]
            
        print ('resModified ---------------->', resModified)
        for r in resModified:
            #print (r)
            db.texec.update_one({'s': sessionId, 'r': requestId, 't': triggerId}, {"$addToSet": {'modified': { 'ns': node['ns'], 'op': 'update', '_type': r['_type'], '_id': r['_id'] }  } }, session=session )
        
        nextNode = node['w_out'][0]

    if node['op'] == 'query':
        filterOp = fstr(f'{node["filter"]}', **context )
        contextNode = {'ns': node['ns'], 'filter': eval(filterOp)}
        f = eval(contextNode['filter'])
        
        if node['aggr']:
            db[node['ns']].aggregate(f, session=session)
            
        else:
            if node['project']:
                projectOp = fstr(f'{node["project"]}', **context )
                contextNode['project'] = eval(projectOp)
                
            
            if node['many']:
                if 'project' in contextNode:
                    p = eval(contextNode['project'])
                    if node['count']:
                        context[node['var']] = db[node['ns']].find(f, p, session=session).count()
                    else:
                        context[node['var']] = db[node['ns']].find(f, p, session=session)
                else:
                    if node['count']:
                        db[node['ns']].find(f, session=session).count()
                    else:
                        db[node['ns']].find(f, session=session)
                
            else:
                if 'project' in contextNode:
                    p = eval(contextNode['project'])
                    context[node['var']] = db[node['ns']].find_one(f, p, session=session)
                else:
                    context[node['var']] = db[node['ns']].find_one(f, session=session)

        nextNode = node['w_out'][0]


    if node['op'] == 'delete':
        filterOp = fstr(f'{node["filter"]}', **context )
        contextNode = {'ns': node['ns'], 'filter': eval(filterOp)}
        f = eval(contextNode['filter'])
        
        if node['many']:
            resModified = db[node['ns']].find(f)
            db[node['ns']].delete_many(f, u, session=session)
            
        else:
            resModified = db[node['ns']].find_one(f)
            db[node['ns']].delete_one(f, u, session=session)
            
        if not node['many']:
            resModified = [resModified]

        for r in resModified:
            #print (r)
            db.texec.update_one({'s': sessionId, 'r': requestId, 't': triggerId}, {"$addToSet": {'modified': { 'ns': node['ns'], 'op': 'delete', '_type': r['_type'], '_id': r['_id'] }  } }, session=session )
        
        nextNode = node['w_out'][0]

    if node['op'] == 'insert':
        filterOp = fstr(f'{node["filter"]}', **context )
        contextNode = {'ns': node['ns'], 'filter': eval(filterOp)}
        f = eval(contextNode['filter'])

        res = db[node['ns']].insert_one(f, session=session)
        resInsert =  db[node['ns']].find_one({'_id': res.inserted_id }, session=session)
        
        db.texec.update_one({'s': sessionId, 'r': requestId, 't': triggerId}, {"$addToSet": {'modified': { 'ns': node['ns'], 'op': 'insert', '_type': resInsert['_type'], '_id': resInsert['_id'] }  } }, session=session )

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
    
    print ('recurisiveStep')
    recurisiveStep(nextNode, pipeline, context, sessionId, requestId, triggerId, session) 



#@shared_task
def execTrigger(docid, ns, tid, sessionId, requestId, session):
    
    print ('execTrigger')
    trigger = db.triggers.find_one({ '_id': ObjectId(tid)},session=session)
    if trigger['e'] == 'd':
        doc = db[ns].find_one({ '_id': ObjectId(docid)})
    else:
        doc = db[ns].find_one({ '_id': ObjectId(docid)}, session=session)
    
    

    pipeline = trigger['pipeline']
    print (pipeline)
    
    res = db.texec.find_one({'s': sessionId, 'r': requestId, 't': trigger['_id'], 'docs': doc['_id']  }, session=session)
    if res:
        return
    else:
        db.texec.update_one({'s': sessionId, 'r': requestId, 't': trigger['_id']}, {"$addToSet": {'docs': doc['_id'] }, "$pull": {'modified': doc['_id'] } }, upsert=True, session=session )
    
    print (db.texec.find_one({'s': sessionId, 'r': requestId, 't': trigger['_id']}) )
    
    
    # exec pipeline
    contextDict = {'doc': doc}
    startNode = pipeline['start']
    
    for nodeid in startNode['w_out']:
        recurisiveStep(nodeid, pipeline, contextDict, sessionId, requestId, trigger['_id'], session)

    

    docsModified = db.texec.find({'s': sessionId, 'r': requestId, 't': trigger['_id']}, {'modified': 1}, session=session)

    print ('docsModified', len(list(docsModified)))
    for docs in docsModified:
        d = docs['modified']
        print (d)
        triggers = db.triggers.find({"ns": d['ns'], "_class": d['_type'], "e": d['op'] }, session=session)
        for t in triggers:
            execTrigger(d['_id'], d['ns'], str(t['_id']), sessionId, requestId, session)
    
    return True
    



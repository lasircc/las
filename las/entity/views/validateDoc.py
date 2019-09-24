from .__init__ import *


def checkWhen(doc, conditions):
    check = True

    return check


def validate(doc, acl, event):
    valid = True
    errMess = None

    for typeDoc in doc['_type']:
        triggers = db.triggers.find({"ns" : event['ns'], "_class" : typeDoc, 'e': event['e']})
        for trigger in triggers:
            '''
            {
                "_id" : ObjectId("5d89f40118717047ac650b30"),
                "ns" : "entity",
                "_class" : "Container",
                "e" : "i",
                "when" : [ ],
                "pipeline" : [
                    {
                        "f" : "unique",
                        "params" : {
                            "fields" : [
                                "features.barcode"
                            ]
                        }
                    },
                    {
                        "f" : "update",
                        "params" : {
                            "dict" : {
                                "features.available" : true
                            }
                        }
                    },
                    {
                        "f" : "inherit",
                        "params" : {
                            "fToCopy" : [
                                "features.dim.x",
                                "features.dim.y"
                            ],
                            "inputField" : "features.contType",
                            "ns" : "catalog",
                            "typeDoc" : "Container",
                            "joinField" : "features.contType"
                        }
                    }
                ]
            }
            '''
            try:
                if checkWhen(doc, trigger['when']):
                    p = Pipeline(doc)
                    for step in trigger['pipeline']:
                        p.setParams(step['params'])
                        p.switch(step['f'])

                    doc = p.getDoc()

            except Exception as e:
                print (e)
                valid = False
                errMess = str(e)
                pass

    
    return doc, valid, errMess


#idea: use aggregation framweowrk associated to rel and/or entities to validate new insertion or updates
# to define where save this information (semantic part or a dedicated collection?)


def validateEntity(entity, acl):
    doc = entity
    errMess = None
    if '_id' in doc:
        try:
            doc = db.entity.find_one({'_id': ObjectId(doc['_id'])})
            return doc, True, errMess
        except:
            del doc['_id']
    # TODO use inheritance of models
    doctype = None
    dim = None
    if doc['_type'] == 'Plate1':
        doctype = 'Plate1'
        dim = {"x": 4, "y": 6}
    if doc['_type'] == 'Tube':
        doctype = 'Tube'
        dim = {"x": 1, "y": 1}
    
    if doctype:
        doc['_type'] = ['Container', doctype]
    if dim:
        doc['features']['dim'] = dim
    
    doc['acl'] = acl
    doc['available'] = True

    if 'Container' in doc['_type']:
        res = db.entity.find({'features.barcode': doc['features']['barcode']}).count()
        if res > 0:
            return doc, False, 'Duplicated barcode'
    return doc, True, errMess




def removeOid(path, key, old_parent, new_parent, new_items):
    ret = default_exit(path, key, old_parent, new_parent, new_items)
    if "$oid" in ret:
        ret =  ObjectId(ret["$oid"])
    elif "$date" in ret:
        ret = datetime.datetime.utcfromtimestamp(ret['$date']/ 1e3)
    #if isinstance(value, ObjectId) or isinstance(value, datetime.datetime):
    #    return 
    return ret



def validateRelationship(doc, acl):
    errMess = None
    doc['acl'] = acl
    doc['startt'] = datetime.datetime.now()
    doc['endt'] = None
    #print ('remap---->',  remap(doc, exit=removeOid))
    doc = remap(doc, exit=removeOid)
    return doc, True, errMess

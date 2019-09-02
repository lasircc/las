from . import *

#idea: use aggregation framweowrk associated to rel and/or entities to validate new insertion or updates
# to define where save this information (semantic part or a dedicated collection?)


def validateEntity(entity):
    doc = entity
    errMess = None
    if '_id' in doc:
        try:
            doc = db.entity.find_one({'_id': ObjectId(doc['_id'])})
            return doc
        except:
            del doc['_id']
    # TODO use inheritance of models
    doctype = None
    dim = None
    if doc['@type'] == 'Plate1':
        doctype = 'Plate1'
        dim = {"x": 4, "y": 6}
    if doc['@type'] == 'Tube':
        doctype = 'Tube'
        dim = {"x": 1, "y": 1}
    
    if doctype:
        doc['@type'] = ['Container', doctype]
    if dim:
        doc['dim'] = dim

    if 'Container' in doc['@type']:
        res = db.entity.find({'identifier': doc['identifier']}).count()
        if res > 0:
            return doc, False, 'Duplicated barcode'
    return doc, True, errMess

def validateRelationship(nodes, relationship):
    return True



class DocSessionView(APIView):

    @swagger_auto_schema(
        operation_description="Add doc in entity or relationship collection. Inherit model properties and validate constraints",
        request_body = openapi.Schema(
            title="Add doc",
            type=openapi.TYPE_OBJECT,
            properties={
                'csrf': openapi.Schema(title="csrf", type=openapi.TYPE_STRING),
                'type': openapi.Schema(title="type of doc: entity or relationship", type=openapi.TYPE_STRING),
                'doc': openapi.Schema(title="doc data", type=openapi.TYPE_OBJECT)
                }
        ),
    )
    #TODO: implement relationship part
    def post(self, request, format=None):
        try:
            print (request.data)
            csrf = request.data['csrf']
            typeDoc = request.data['type']
            errMess = 'Something went wrong'
            

            if typeDoc == 'entity':
                entity = json.loads(request.data['doc'])
                doc, valid, errMess = validateEntity(entity)
            elif typeDoc == 'relationship':
                docs = json.loads(request.data['docs'])
                reltype = json.loads(request.data['reltype'])
                rel = validateRelationship(docs, reltype)
            else:
                raise Exception('Error in typedoc')
            
            if not valid:
                raise Exception('no valid data')
            docid = db[typeDoc].insert_one(doc).inserted_id
            print (docid)
            doc = db[typeDoc].find_one({'_id': docid})

            db[typeDoc].update_one({'_id':docid}, {"$set": {"csrf": csrf}})
            
            return Response({'doc': to_json(doc)}, status=status.HTTP_200_OK)
        except Exception as e:
            print ('SessionDataView error: ', e)
            return Response({'error': errMess}, status=status.HTTP_400_BAD_REQUEST)

    
    @swagger_auto_schema(
        operation_description="Add doc in entity or relationship collection. Inherit model properties and validate constraints",
        request_body = openapi.Schema(
            title="Add doc",
            type=openapi.TYPE_OBJECT,
            properties={
                'csrf': openapi.Schema(title="csrf", type=openapi.TYPE_STRING),
                'type': openapi.Schema(title="type of doc: entity or relationship", type=openapi.TYPE_STRING),
                'id': openapi.Schema(title="objectid string", type=openapi.TYPE_STRING)
                }
        ),
    )
    def delete(self, request, format=None):
        try:
            print (request.data)
            csrf = request.data['csrf']
            typeDoc = request.data['type']
            entity_id = ObjectId(request.data['id'])
            print (csrf)
            
            docDel = db[typeDoc].delete_one( {'_id': entity_id, 'csrf': csrf}).deleted_count
            print (docDel)

            return Response({'docDel': docDel}, status=status.HTTP_200_OK)
        except Exception as e:
            print ('SessionDataView error: ', e)
            return Response(status=status.HTTP_400_BAD_REQUEST)


class SessionDataView (APIView):

    # add logic for inheritance permission wg
    # check if a difference structure for log is necessary
    @swagger_auto_schema(
        operation_description="Save session data",
        request_body = openapi.Schema(
            title="Save session data",
            type=openapi.TYPE_OBJECT,
            properties={
                'csrf': openapi.Schema(title="csrf", type=openapi.TYPE_STRING),
                'viewname': openapi.Schema(title="name of the view form which data are sent", type=openapi.TYPE_STRING),
                'data': openapi.Schema(title="session data", type=openapi.TYPE_OBJECT)
                }
        ),
    )
    def post(self, request, format=None):
        try:
            csrf = request.data['csrf']
            viewname = request.data['viewname']

            sessionData = json.loads(request.data['data'])

            jsonSessionData = {}
            for storeName in sessionData:
                jsonSessionData[storeName] = []
                for item in sessionData[storeName]:
                    if '_id' in  item:
                        if '$oid' in item['_id']:
                            item['_id'] = ObjectId( item['_id']['$oid'])

                    if storeName in ['entity', 'relationship']:
                        db[storeName].update_one({'_id': item['_id']}, {"$unset": {'csrf':csrf} })
                    
                    jsonSessionData[storeName].append(item)
                
            
            db.log.insert_one({ 
                'data': jsonSessionData, 
                'session': {'user': request.user.username, 't':  datetime.datetime.now(), 'viewname': viewname}
            })
            

            return Response({}, status=status.HTTP_200_OK)
        except Exception as e:
            print ('SaveSessionView error: ', e)
            return Response(status=status.HTTP_400_BAD_REQUEST)


    @swagger_auto_schema(
        operation_description="Update csrf for enities and relationships",
        request_body = openapi.Schema(
            title="Update session data",
            type=openapi.TYPE_OBJECT,
            properties={
                'old': openapi.Schema(title="old csrf", type=openapi.TYPE_STRING),
                'new': openapi.Schema(title="new csrf", type=openapi.TYPE_STRING)
                }
        ),
    )
    def put(self, request, format=None):
        try:
            oldcsrf = request.data['old']
            newcsrf = request.data['new']
            entityUp = db.entity.update_many( {'csrf': oldcsrf}, {"$set": {'csrf': newcsrf } }).modified_count
            relUp = db.relationship.update_many( {'csrf': oldcsrf}, {"$set": {'csrf': newcsrf } }).modified_count
            print (entityUp, relUp)
            return Response({'entityUp': entityUp, 'relDel': relUp}, status=status.HTTP_200_OK)
        except Exception as e:
            print ('SessionDataView error: ', e)
            return Response(status=status.HTTP_400_BAD_REQUEST)



    @swagger_auto_schema(
        operation_description="Delete session data",
        request_body = openapi.Schema(
            title="CSRF",
            description="Please provide the csrf token of the session page",
            type=openapi.TYPE_OBJECT,
            properties={
                'csrf': openapi.Schema(title="csrf", type=openapi.TYPE_STRING),
            }
        ),
    )
    def delete(self, request, format=None):
        try:
            print (request.data)
            csrf = request.data['csrf']
            print (csrf)
            entityDel = db.entity.delete_many( {'csrf': csrf}).deleted_count
            relDel = db.relationship.delete_many( {'csrf': csrf}).deleted_count
            print (entityDel, relDel)

            return Response({'entityDel': entityDel, 'relDel': relDel}, status=status.HTTP_200_OK)
        except Exception as e:
            print ('SessionDataView error: ', e)
            return Response(status=status.HTTP_400_BAD_REQUEST)



    
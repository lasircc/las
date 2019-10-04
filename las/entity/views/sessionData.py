from rest_framework.viewsets import ViewSet
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework import authentication, permissions, status

from LASUtils.mongodb import *
import json, re, datetime, os
from bson.objectid import ObjectId
import pymongo

from drf_yasg.utils import swagger_auto_schema
from drf_yasg import openapi 

from .validateDoc import *


class DocSessionView(APIView):

    
    def post(self, request, format=None):
        try:
            print (request.data)
            print (request.user)
            userProfile = db.user.find_one({'_id': request.user.username})
            print (userProfile)
            csrf = request.META.get('HTTP_X_CSRFTOKEN')
            docs = json.loads(request.data['docs'])
            typeDoc = request.data['ns']
            errMess = 'Something went wrong'

            print (docs)
            
            returnDocs = {'entity': [], 'relationship': [], 'origin': []}
            for doc in docs:
                d = Document(doc, typeDoc, {'csrf': csrf, 'user': request.user.username})
                valid, errMess = d.validate('i')
            
                if not valid:
                    raise Exception(errMess)
                
                if not d.alreadyExists():
                    
                    docid = db[typeDoc].insert_one(d.getDoc()).inserted_id
                    print (docid)

                    docDb = db[typeDoc].find_one({'_id': docid})
                    returnDocs[typeDoc].append({'doc': docDb, 'op': 'i', 'o2': None})
                else:
                    docid = d.getId()
                    returnDocs[typeDoc].append({'doc': d.getDoc(), 'op': 'a', 'o2': None})
                
                returnDocs['origin'].append(docid)
                
                indexes = db[typeDoc].index_information()
                if "sessionData" not in indexes:

                    print (indexes, 'create index')
                    db[typeDoc].create_index([("csrf.t", pymongo.DESCENDING)],name = "sessionData",expireAfterSeconds= 14400)
                
            
            return Response({'docs': to_json(returnDocs)}, status=status.HTTP_200_OK)
        except Exception as e:
            print ('DocSessionView error: ', e)
            return Response({'error': errMess}, status=status.HTTP_400_BAD_REQUEST)

    @swagger_auto_schema(
        operation_description="Update session documents",
        request_body = openapi.Schema(
            title="Update session documents",
            type=openapi.TYPE_OBJECT,
            properties={
                'old': openapi.Schema(title="old csrf", type=openapi.TYPE_STRING),
                'new': openapi.Schema(title="new csrf", type=openapi.TYPE_STRING)
                }
        ),
    )
    def put(self, request, format=None):
        try:
            csrf = request.META.get('HTTP_X_CSRFTOKEN')

            return Response({}, status=status.HTTP_200_OK)
        except Exception as e:
            print ('DocSessionView error: ', e)
            return Response(status=status.HTTP_400_BAD_REQUEST)

    
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
            csrf = request.META.get('HTTP_X_CSRFTOKEN')
            typeDoc = request.data['type']
            entity_id = ObjectId(request.data['id'])
            print (csrf)
            
            docDel = db[typeDoc].delete_one( {'_id': entity_id, 'session.csrf': csrf}).deleted_count
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
            storeTracked = {'entity': 'e', 'relationship': 'r', 'oplog': 'o'}

            jsonSessionData = {}
            for storeName in sessionData:
                if storeName in storeTracked.keys():
                    jsonSessionData[storeTracked[storeName]] = []
                    for item in sessionData[storeName]:
                        d = Document(item, storeName, {'csrf': csrf, 'user': request.user.username})
                        d.removeSession()
                        newDoc = d.getDoc()

                        if storeName in ['entity', 'relationship']:
                            print ('remove session', storeName, newDoc['_id'])
                            db[storeName].update_one({'_id': newDoc['_id']}, {"$unset": {'session':""} })
                        
                        
                        jsonSessionData[storeTracked[storeName]].append(newDoc)
                        
                
            print (jsonSessionData)
            db.log.insert_one({ 
                'data': jsonSessionData, 
                'session': {'user': request.user.username, 't':  datetime.datetime.now(), 'viewname': viewname}
            })
            

            return Response({}, status=status.HTTP_200_OK)
        except Exception as e:
            print ('SaveSessionView error: ', e)
            return Response(status=status.HTTP_400_BAD_REQUEST)

    def cleanAcl(self, data):
        obj = {'r':[], 'w':[], 'o': []}
        rList = []
        for r in data['r']:
            rList.append(ObjectId(r['$oid']) )
        obj['r'] = rList
        wList = []
        for w in data['w']:
            wList.append(ObjectId(w['$oid']) )
        obj['w'] = wList
        oList = []
        for o in data['o']:
            oList.append(ObjectId(o['$oid']) )
        obj['o'] = oList
        return obj

    
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
            entityUp = db.entity.update_many( {'session.csrf': oldcsrf}, {"$set": {'session.csrf': newcsrf, "session.t": datetime.datetime.now() } }).modified_count
            relUp = db.relationship.update_many( {'session.csrf': oldcsrf}, {"$set": {'session.csrf': newcsrf, "session.t": datetime.datetime.now() } }).modified_count
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
            entityDel = db.entity.delete_many( {'session.csrf': csrf, 'session.t': {'$exists': True} }).deleted_count
            relDel = db.relationship.delete_many( {'session.csrf': csrf, 'session.t': {'$exists': True}}).deleted_count
            entityUpdate = db.entity.update_many( {'session.csrf': csrf }, {"$unset": {'session':""}}).modified_count
            print (entityDel, relDel, entityUpdate)

            return Response({'entityDel': entityDel, 'relDel': relDel, 'entityUpdate': entityUpdate}, status=status.HTTP_200_OK)
        except Exception as e:
            print ('SessionDataView error: ', e)
            return Response(status=status.HTTP_400_BAD_REQUEST)




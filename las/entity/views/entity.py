from . import *

class EntityViewSet (ViewSet):

    #permission_classes = (permissions.AllowAny,)
    @swagger_auto_schema(
        operation_description="Get a list of documents of given collection (dbcollection). The result is paginated.",
        manual_parameters = [
            openapi.Parameter(
            'start',
            openapi.IN_QUERY,
            description='Start of list',
            required=False,
            type= openapi.TYPE_INTEGER
            ),
            openapi.Parameter(
            'length',
            openapi.IN_QUERY,
            description='list lenght',
            required=False,
            type= openapi.TYPE_INTEGER
            ),
            openapi.Parameter(
            'startFilter',
            openapi.IN_QUERY,
            description='Start filter',
            required=False,
            type= openapi.TYPE_OBJECT
            ),
            openapi.Parameter(
            'filter',
            openapi.IN_QUERY,
            description='filter',
            required=False,
            type= openapi.TYPE_OBJECT
            )
        ]
    )
    def list(self, request, dbcollection):
        resp = {}
        try:
            print ('EntityViewSet list: ' , request.user, request, self.kwargs, dbcollection, request.user.is_superuser)
            start = int(request.query_params.get('start', 0))
            length = int(request.query_params.get('length', settings.REST_FRAMEWORK['PAGE_SIZE']))
            startFilter = request.query_params.get('startFilter', {})
            endFilter = request.query_params.get('filter', {})
            print (json.loads(startFilter))
            if request.user.is_superuser:
                print ('is_superuser')
                resp = paginate(dbcollection, None, start, length, startFilter=json.loads(startFilter), filter=json.loads(endFilter))
            else:
                print ('no superuser')
                resp = paginate(dbcollection, request.user['heritage']['w'], start, length, startFilter=json.loads(startFilter), filter=json.loads(endFilter))

            return Response(resp)
        except Exception as e:
            print ('EntityViewSet list error: ', e)
            return Response(status=status.HTTP_400_BAD_REQUEST)
        
    
    @swagger_auto_schema(
        operation_description="Get the document give the ObjectId of given collection (dbcollection)",
    )
    def retrieve(self, request, dbcollection, pk=None, format=None):
        try:
            print ('EntityViewSet Retrieve: ' , request.user, request, self.kwargs, dbcollection)
            if request.user.is_superuser:
                doc = db[dbcollection].find_one( {'_id': ObjectId(pk)} )
            else:
                print ('use filter on access_w')
                doc = db[dbcollection].find_one( {'_id': ObjectId(pk), 'access_w': {'$exists': True, '$in': request.user['heritage']['w']} } )
            if doc:
                return Response(to_json(doc), status=status.HTTP_200_OK)
            else:
                return Response(status=status.HTTP_404_NOT_FOUND)

        except Exception as e:
            print ('EntityViewSet retrieve error: ', e)
            return Response(status=status.HTTP_400_BAD_REQUEST)

    @swagger_auto_schema(
        operation_description="Populate the collection with a new document",
        request_body = openapi.Schema(
            title="New document",
            description="Please provide the document inside an object named as the collection",
            type=openapi.TYPE_OBJECT
            ),
    )
    def create(self, request, dbcollection):
        try:
            print (request.data)
            print ('EntityViewSet: ' , request.user, request, self.kwargs, dbcollection)
            collection = request.data[dbcollection]

            entity_id = db[dbcollection].insert_one( collection ).inserted_id
            if entity_id == None:
                raise ('Error in insert creating entity of type ', self.kwargs['dbcollection'] )
            print (entity_id)

            return Response(request.data, status=status.HTTP_201_CREATED)
        except Exception as e:
            print ('EntityViewSet error: ', e)
            return Response(status=status.HTTP_400_BAD_REQUEST)

    '''
    def destroy(self, request,  dbcollection, pk=None, format =None):
        try:
            print ('EntityViewSet: ' , request.user, request, self.kwargs, dbcollection)
            return Response(request.data, status=status.HTTP_200_OK)
        except:
            return Response(request.data, status=status.HTTP_400_BAD_REQUEST)
    '''

   
    @action(methods=['get'], detail=False)
    @swagger_auto_schema(
        operation_description="Retrieve the first 10 documents that match the query. The field of the document and the query should be specified.",
        manual_parameters = [openapi.Parameter(
            'field',
            openapi.IN_QUERY,
            description='field to search',
            required=True,
            type= openapi.TYPE_STRING
            ),
            openapi.Parameter(
            'q',
            openapi.IN_QUERY,
            description='string to search',
            required=True,
            type= openapi.TYPE_STRING
            )
            ]
    )
    def autocomplete(self, request, dbcollection):
        try:
            print (request.query_params)
            fieldFilter = request.query_params.get('field')
            queryString = request.query_params.get('q')
            search = '(.*)' + queryString.strip() + '(.*)'
            search = search.replace(' ', '(.*)')
            regex = re.compile(search, re.IGNORECASE)
            if request.user.is_superuser:
                doc = db[dbcollection].find({fieldFilter:{"$regex":regex,"$options": 'ix'} }).limit(10)
            else:
                user = db.user.find_one({'_id': request.user.username})
                print ('use filter on access_w')
                doc = db[dbcollection].find({fieldFilter:{"$regex":regex, "$options": 'ix'}, 'access_w': {'$exists': True, '$in': user['heritage']['w']} }).limit(10)
            
            if doc:
                return Response(to_json(doc), status=status.HTTP_200_OK)
            else:
                return Response(status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            print ('Autocomplete error:', e)
            return Response(status=status.HTTP_400_BAD_REQUEST)
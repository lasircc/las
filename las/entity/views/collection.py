from . import *

def paginateColl(start=0, length=settings.REST_FRAMEWORK['PAGE_SIZE']):
    print ('paginate coll', start, length)
    documents = db.list_collection_names()
    nrecordsTotal = len(documents)
    nrecords = len(documents)
    documents = documents[start: start+length ]

    resp = {
        'recordsTotal': nrecordsTotal,
        'recordsFiltered': nrecords,
        'start': start,
        'length': len(documents),
        'data': to_json(documents)
    }
    return resp



class CollectionViewSet (ViewSet):


    """
    API view to show info about collections. The result is paginated.
    """
    @swagger_auto_schema(
        operation_description="Get the list of available collections. Only superuser can use it",
        manual_parameters = [openapi.Parameter(
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
            )
        ]

    )
    def list(self, request):
        resp = {}
        try:
            print ('CollectionViewSet list: ' , request.user, request, request.query_params)
            start = int(request.query_params.get('start', 0))
            length = int(request.query_params.get('length', settings.REST_FRAMEWORK['PAGE_SIZE']))

            print (start, length)

            resp = paginateColl(start, length)
            return Response(resp, status=status.HTTP_200_OK)
        except Exception as e:
            print ('CollectionViewSet list error: ', e)
            resp = ResponseSerializer(data= {'success':False, 'errorCode':'Malformed request'})
            resp.is_valid()
            return Response(resp.data, status=status.HTTP_400_BAD_REQUEST)
            
        

    @swagger_auto_schema(
        operation_description="Create an empty collection. Only superuser can use it",
        request_body = openapi.Schema(
            type=openapi.TYPE_OBJECT, 
            properties={
                'collection': openapi.Schema(type=openapi.TYPE_STRING)
                }
            ),
        responses={
            200:  ResponseSerializer,
            400 : ResponseSerializer
        }
    )
    def create(self, request):
        try:
            print ('CollectionViewSet create: ' , request.user, request)
            
            nameCollection = request.data['collection']
            db.create_collection(nameCollection)
            resp = ResponseSerializer(data= {'success':True, 'errorCode':'Collection created'})
            resp.is_valid()
            return Response(resp.data, status=status.HTTP_200_OK)
            
        except Exception as e:
            print ('CollectionViewSet create error: ', e)
            resp = ResponseSerializer(data= {'success':False, 'errorCode':'Collection already exists'})
            resp.is_valid()
            return Response(resp.data, status=status.HTTP_400_BAD_REQUEST)

    
    @swagger_auto_schema(
        operation_description="Delete an empty collection. Only superuser can use it",
        responses={
            200:  ResponseSerializer,
            400 : ResponseSerializer
        }
    )
    def destroy(self, request, pk=None):
        try:
            print (request.data)
            print ('CollectionViewSet create: ' , request.user, request)
            doc = db[pk].count()
            if doc > 0 :
                raise Exception('not empty collection')
            db.drop_collection(pk)
            resp = ResponseSerializer(data= {'success':True, 'errorCode':'Collection destroyed'})
            resp.is_valid()
            return Response(resp.data, status=status.HTTP_200_OK)
            
        except Exception as e:
            print ('CollectionViewSet cerate error: ', e)
            resp = ResponseSerializer(data= {'success':False, 'errorCode':'Collection not empty'})
            resp.is_valid()
            return Response(resp.data, status=status.HTTP_400_BAD_REQUEST)

    @action(methods=['get'], detail=True)
    @swagger_auto_schema(
        operation_description="Get the schema of the collection (id). Only superuser can use it",
        manual_parameters = [openapi.Parameter(
            'with_count',
            openapi.IN_QUERY,
            description='show stat for each field',
            required=False,
            type= openapi.TYPE_BOOLEAN
            )
            ]
    )
    def schema(self, request, pk=None, format=None):
        try:
            print ('CollectionViewSet schema: ' , request.user, request)
            colSchema = CollectionSchema()
            with_count = request.query_params.get('with_count', False)
            print (with_count)
            if with_count == 'false':
                with_count = False
            elif with_count == 'true':
                with_count = True
            schema = colSchema.extract_collection_schema(db[pk], with_count=with_count)
            print (schema)
            if schema:
                return Response(schema, status=status.HTTP_200_OK)
            else:
                return Response(status=status.HTTP_404_NOT_FOUND)

        except Exception as e:
            print ('CollectionViewSet schema error: ', e)
            return Response(status=status.HTTP_400_BAD_REQUEST)
    

    @action(methods=['get'], detail=True)
    @swagger_auto_schema(
        operation_description="FindOne mongo command for the collection (id). Only superuser can use it"
    )
    def findOne(self, request, pk=None, format=None):
        try:
            print ('CollectionViewSet findOne: ' , request.user, request)
            
            doc = db[pk].find_one()
            if doc:
                return Response(to_json(doc), status=status.HTTP_200_OK)
            else:
                return Response([], status=status.HTTP_404_NOT_FOUND)

        except Exception as e:
            print ('CollectionViewSet findOne error: ', e)
            resp = ResponseSerializer(data= {'success':False, 'errorCode':'Bad request'})
            resp.is_valid()
            return Response(resp.data, status=status.HTTP_400_BAD_REQUEST)
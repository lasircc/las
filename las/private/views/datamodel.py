from .__init__ import *

def custom_retrieval_function(uri):
        obj = db.schemas.find_one({'_id': uri})
        print ('retrieve', json.loads(obj['schema']))
        return json.loads(obj['schema'])


@method_decorator([login_required], name='dispatch')
class Manage(View):
        
    def get(self, request):
        
        context = {'entities': {
                            'count': len(db.features.distinct('class')),
                            'uris': db.features.distinct('class')
                            },
                    'schemas': 
                            {
                            'count': db.schemas.count_documents({}),
                            'uris': db.schemas.find({},{"_id":True, "slug":True})
                    }
        }
        return render(request, 'private/datamodel.html', context)

    def post(self, request):
        print (request.POST)
        jsonSchema = request.POST.get('json-schema', None)
        context = {}
        valid = True
        if jsonSchema:
            print (jsonSchema, type(jsonSchema))
            try:
                jsonSchema = json.loads(jsonSchema)
            except Exception as e:
                print (e)
                context['messages'] = [{"tags": "error", "text": "No json provided"}]
                valid = False

        if valid:
            print ('valid json')
            if isinstance(jsonSchema, dict):
                jsonSchema = [jsonSchema]
            
            for schema in jsonSchema:
                db.schemas.update({'_id': schema['$id']}, {'_id': schema['$id'], 'slug': schema["$id"].replace('las://schema/', ''), 'schema': json.dumps(schema)}, True)

            

        context = {'entities': {
                            'count': len(db.features.distinct('class')),
                            'uris': db.features.distinct('class')
                            },
                    'schemas': 
                            {
                            'count': db.schemas.count_documents({}),
                            'uris': db.schemas.find({},{"_id":True, "slug":True})
                    }
        }
        return render(request, 'private/datamodel.html', context)


@method_decorator([login_required], name='dispatch')
class CreateEntity(View):
    def post(self, request):
        print (request.POST)

        className = request.POST.get('name')
        ns = request.POST.get('ns')
        features = json.loads(request.POST.get('featuresList', "[]"))
        print (features)


        #TODO update save features for class with new structure

        for feat in features:
            required = False
            defaultValue = None
            if 'required' in feat:
                required = feat['required']
            if 'default' in feat:
                defaultValue = feat['default']
            print (feat)
            db.features.update({'ns': ns, 'path': feat['path'], 'class': className}, {'ns': ns, 'path': feat['path'], 'class': className, 'required': required, 'type': feat['type'], 'default': defaultValue }, True)



        return redirect('private:manageModel')

class Entity(Manage):
        
    def get(self, request, entity):  
        context = super(Entity, self).get_context()
        #entity
        context['entity'] = context['model'].get_any_entity(id=entity_id)
        # # implementation
        # context['taxonomy'] = dict()
        # context['taxonomy']['ancestors'] = utils.getAllAncestors(context['entity'])
        # print (utils.getAllAncestors(context['entity']))
        # context['taxonomy']['children'] = utils.getDirectChildren(context['entity'])
        # context['pygments'] = dict()
        # context['pygments']['code'] = highlight(context['entity'].rdf_source(),TurtleLexer(), HtmlFormatter())
        # context['pygments']['css'] = HtmlFormatter().get_style_defs('.highlight')
        print (entity)
        context = {}

        return render(request, 'datamodel/entity.html', context)





class SchemaFeatures(APIView):
    def get(self, request):
        try:
            schema_store = Schema_Store(getter = custom_retrieval_function, saver = None)
            schema = db.schemas.find_one({'_id': request.query_params['oid']})
            obj = schema_store.get_object(schema['_id'])
            features = obj.get_features_paths(schema_store)
            
            return Response({'data': to_json(features)}, status=status.HTTP_200_OK)
        except Exception as e:
            print (e)
            return Response(status=status.HTTP_400_BAD_REQUEST)
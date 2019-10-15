from django.shortcuts import render
from django.views import View
from django.contrib.auth.decorators import login_required
from django.utils.decorators import method_decorator
from . import utils
from django.contrib import messages
from django.shortcuts import redirect


from jsondesign.schema_store import Schema_Store
from jsondesign.entity import Object
from bson.objectid import ObjectId


# from pygments import highlight
# from pygments.lexers.rdf import TurtleLexer
# from pygments.formatters import HtmlFormatter
from LASUtils.mongodb import *
import json

@method_decorator([login_required], name='dispatch')
class Manage(View):
        
    def get(self, request):
        
        context = {'entities': {
                            'count': db.dataModel.count_documents({}),
                            'uris': db.dataModel.find({},{"_id":True, "slug":True})
                            },
                        'schemas': 
                            {
                            'count': db.schemas.count_documents({}),
                            'uris': db.schemas.find({},{"_id":True, "slug":True})
                        }
        }
        return render(request, 'datamodel/index.html', context)

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
                db.schemas.update({'_id': schema['$id']}, {'_id': schema['$id'], 'slug': schema['slug'], 'schema': json.dumps(schema)}, True)

            

        context.update({'entities': {
                            'count': db.dataModel.count_documents({}),
                            'uris': db.dataModel.find({},{"_id":True, "slug":True})
                            },
                        'schemas': 
                            {
                            'count': db.schemas.count_documents({}),
                            'uris': db.schemas.find({},{"_id":True, "slug":True})
                        }
        })
        return render(request, 'datamodel/index.html', context)

    # # TODO: use celery-like implementation for large files
    # def post(self, request):
    #     try:
    #         print('deleting data...')
    #         g = utils.GraphDBRepoManager()
    #         g.clear()
    #         g.load_data(request.FILES['ttlFile'])
    #         messages.success(request, 'The new data model has been imported')
    #     except Exception as ex:
    #         print(ex)
    #         messages.error(request, 'An error occured while uploading new data')


    #     return render(request, 'datamodel/index.html', self.get_context())

    # def get_context(self):
    #     model = utils.get_model()

    #     context = {
    #         'model': model
    #     }
    #     return context



def custom_retrieval_function(uri):
        obj = db.schemas.find_one({'_id': uri})
        print ('retrieve', json.loads(obj['schema']))
        return json.loads(obj['schema'])

# class Tree(Manage):
        
#     def get(self, request):        
#         return render(request, 'datamodel/tree.html', super(Tree, self).get_context())
@method_decorator([login_required], name='dispatch')
class CreateEntity(View):
    def post(self, request):
        print (request.POST)

        schema_store = Schema_Store(getter = custom_retrieval_function, saver = None)

        schema = db.schemas.find_one({'_id': request.POST['schema']})
        
        test = schema_store.get_object(schema['_id'])

        features = test.get_features_paths(schema_store)
        className = request.POST.get('name')

        #TODO save features for class

        for feat in features:
            for p, t in feat.items():
                db.features.update({'path': p, 'class': className}, {'path': p, 'class': className, 'required': True, 'type': t }, True)



        return redirect('datamodel:manageModel')

class Entity(Manage):
        
    def get(self, request, entity):  
        # context = super(Entity, self).get_context()
        # #entity
        # context['entity'] = context['model'].get_any_entity(id=entity_id)
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






from django.shortcuts import render
from django.views import View
from django.contrib.auth.decorators import login_required
from django.utils.decorators import method_decorator
from . import utils
from django.contrib import messages

# from pygments import highlight
# from pygments.lexers.rdf import TurtleLexer
# from pygments.formatters import HtmlFormatter
from LASUtils.mongodb import *

@method_decorator([login_required], name='dispatch')
class Manage(View):
        
    def get(self, request):
        
        print(db.dataModel.find())
        
        context = {'entities': {
                            'count': db.dataModel.count_documents({}),
                            'uris': db.dataModel.find({},{"*id":True, "slug":True})
                            }
        }
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




# class Tree(Manage):
        
#     def get(self, request):        
#         return render(request, 'datamodel/tree.html', super(Tree, self).get_context())



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






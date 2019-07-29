from django.shortcuts import render
from django.views import View
from django.contrib.auth.decorators import login_required
from django.utils.decorators import method_decorator
from . import utils
from django.contrib import messages


@method_decorator([login_required], name='dispatch')
class Manage(View):
        
    def get(self, request):
        return render(request, 'datamodel/index.html', self.get_context())

    # TODO: use celery-like implementation for large files
    def post(self, request):
        try:
            print('deleting data...')
            g = utils.GraphDBRepoManager()
            g.clear()
            g.load_data(request.FILES['ttlFile'])
            messages.success(request, 'The new data model has been imported')
        except Exception as ex:
            print(ex)
            messages.error(request, 'An error occured while uploading new data')


        return render(request, 'datamodel/index.html', self.get_context())

    def get_context(self):
        model = utils.get_model()

        context = {
            'model': model
        }
        return context




class Tree(Manage):
        
    def get(self, request):        
        return render(request, 'datamodel/tree.html', super(Tree, self).get_context())





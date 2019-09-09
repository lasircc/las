from .__init__ import *

@method_decorator([login_required], name='dispatch')
class LoadContainer(View):
    def get(self, request):
        return render(request, 'storage/loadContainer.html')

@method_decorator([login_required], name='dispatch')
class LoadContainerBatch(View):
    def get(self, request):
        return render(request, 'storage/loadContainerBatch.html')


@method_decorator([login_required], name='dispatch')
class MoveContainer(View):
    def get(self, request):
        return render(request, 'storage/moveContainer.html')

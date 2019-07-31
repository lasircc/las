from .__init__ import *

@method_decorator([login_required], name='dispatch')
class LoadContainer(View):
    def get(self, request):
        return render(request, 'storage/loadContainer.html')


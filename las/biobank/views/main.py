from .__init__ import *

@method_decorator([login_required], name='dispatch')
class Index(View):
    def get(self, request):
        return render(request, 'biobank/index.html')
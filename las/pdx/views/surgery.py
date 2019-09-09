from .__init__ import *

@method_decorator([login_required], name='dispatch')
class Implant(View):
    def get(self, request):
        return render(request, 'pdx/implant.html')

@method_decorator([login_required], name='dispatch')
class Explant(View):
    def get(self, request):
        return render(request, 'pdx/explant.html')

from .__init__ import *

@method_decorator([login_required], name='dispatch')
class DefineTreatment(View):
    def get(self, request):
        return render(request, 'pdx/defineTreatment.html')

@method_decorator([login_required], name='dispatch')
class FinalizeTreatment(View):
    def get(self, request):
        return render(request, 'pdx/finalizeTreatment.html')
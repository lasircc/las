from .__init__ import *

@method_decorator([login_required], name='dispatch')
class RegisterAnimals(View):
    def get(self, request):
        return render(request, 'pdx/registerAnimals.html')



@method_decorator([login_required], name='dispatch')
class StatusAnimals(View):
    def get(self, request):
        return render(request, 'pdx/statusAnimals.html')
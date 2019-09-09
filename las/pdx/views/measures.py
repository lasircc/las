from .__init__ import *

@method_decorator([login_required], name='dispatch')
class Measures(View):
    def get(self, request):
        return render(request, 'pdx/measures.html')



from .__init__ import *

@method_decorator([login_required], name='dispatch')
class GroupExperiments(View):
    def get(self, request):
        return render(request, 'pdx/groupExperiments.html')

@method_decorator([login_required], name='dispatch')
class ExploreExperiments(View):
    def get(self, request):
        return render(request, 'pdx/exploreExperiments.html')
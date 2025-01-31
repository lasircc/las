from .__init__ import *

@method_decorator([login_required], name='dispatch')
class Test(View):
    def get(self, request):
        return render(request, 'biobank/test.html')

    def post(self, request):
        session = csrf.get_token(request)
        #session = request.META.get('HTTP_X_CSRFTOKEN')
        requestId = uuid.uuid4()

        data = {'operation':
            {'op': 'i', 'doc': {'parent': ObjectId('5de68cfa14b2159854d3b358'), 'child': ObjectId('5de68d2814b2159854d3b359'), '_type': 'applied', 'features':{'quantity': 2}} },
            'ns': 'relationship',
            'session': session,
            'request' :requestId
        }

        execDbOp(data)
        
        return render(request, 'biobank/test.html')
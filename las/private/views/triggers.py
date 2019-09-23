from .__init__ import *

@method_decorator([login_required], name='dispatch')
class ManageTriggers(View):
    def get(self, request):
        return render(request, 'private/triggers.html')

    def post(self, request):
        print (request.POST)
        return render(request, 'private/triggers.html')


class Triggers(APIView):
    def get(self, request):
        triggers = db.triggers.find()
        return Response({'data': to_json(triggers)}, status=status.HTTP_200_OK)

    def delete(self, request):
        try:
            print (request.data)
            return Response(status=status.HTTP_200_OK)
        except:
            return Response(status=status.HTTP_400_BAD_REQUEST)
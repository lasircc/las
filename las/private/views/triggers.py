from .__init__ import *

@method_decorator([login_required], name='dispatch')
class ManageTriggers(View):
    def get(self, request):
        return render(request, 'private/triggers.html')

    def post(self, request):
        print (request.POST)
        # 'oid': [''], 'ns': ['entity'], '_class': ['Container'], 'e': ['i'], 'when': ['[]'], 'pipeline': ['[{"f":"update","params":{"dict":{"features.available":true}}}]']}

        oid = request.POST.get('oid', None)
        ns = request.POST.get('ns', None)
        classNs =  request.POST.get('_class', None)
        e =  request.POST.get('e', None)
        when =  json.loads ( request.POST.get('when', '[]') )
        pipeline =  json.loads( request.POST.get('pipeline', '[]') )
        doc = {'ns': ns, '_class': classNs, 'e': e, 'when': when, 'pipeline': pipeline }
        print (doc)
        if oid:

            oid = ObjectId(oid)
            doc['_id'] = oid
            db.triggers.replace_one({'_id': oid}, doc)
        else:
            
            db.triggers.insert_one(doc)
        return render(request, 'private/triggers.html')


class Triggers(APIView):
    def get(self, request):
        triggers = db.triggers.find()
        return Response({'data': to_json(triggers)}, status=status.HTTP_200_OK)

    def delete(self, request):
        try:
            print (request.data)
            oid = ObjectId(request.data['oid'])
            db.triggers.delete_one({'_id': oid})
            return Response({'message': 'Trigger deleted'}, status=status.HTTP_200_OK)
        except Exception as e:
            print (e)
            return Response(status=status.HTTP_400_BAD_REQUEST)
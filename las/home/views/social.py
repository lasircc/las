from .__init__ import *


@method_decorator([login_required], name='dispatch')
class ManageWorkingGroups(View):
    def get(self, request):
        try:
            wgList =  db.social.aggregate([{"$match": {"@type":"WG", "users": {"$in": [request.user.username]} }}, {"$lookup": { "from": "auth_user", "localField": 'users', "foreignField": 'username', "as": 'userList' }}])

            return render(request, 'home/manageWorkingGroups.html',{'workingGroups':list(wgList)})
        except Exception as e:
            print (e)
            return redirect('/')





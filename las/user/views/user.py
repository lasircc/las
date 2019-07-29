from .__init__ import *

@method_decorator([login_required], name='dispatch')
class UserProfile(View):
    def get(self, request):
        try:
            lasuser=User.objects.get(username=request.user.username)
            wgList=db.social.find({"@type":"WG", "users": {"$in": [request.user.username ]}})
            ### loginas ###
            hasPreviousUser = loginas.existsPreviousUser(request)
            isSuperUser = request.user.is_superuser
            return render(request, 'user/userProfile.html',{'workingGroups':wgList, 'hasPreviousUser': hasPreviousUser, 'isSuperUser': isSuperUser})
        except Exception as e:
            print ('Error profile', e)
            return redirect('/')


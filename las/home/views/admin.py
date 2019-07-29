from .__init__ import *


@method_decorator([login_required], name='dispatch')
class CreateProject(View):
    def get(self, request):
        try:
            wgs = db.social.find({'@type': 'WG'})
            institutions = db.instituion.find({})
            return render(request, 'home/createProject.html', {'wgs': wgs, 'institutions': institutions})
        except:
            return render(request, 'home/createProject.html')
    
    def post(self, request):
        try:
            wgs = db.social.find({'@type': 'WG'})

            projectName = request.POST['name']
            wgsList = request.POST.getlist('wgs')
            insList = request.POST.getlist('institutions')
            res = db.social.find({'name': projectName, '@type': 'Project'}).count()
            if res==0:
                db.social.insert_one({'name': medicalCenter, '@type': 'Project', 'institutions': insList, 'managers': wgsList})
            else:
                raise Exception('medical Center already exists')
            
            return render(request, 'home/createProject.html', {'wgs': wgs, 'post_save': {'success': 'Project ' + projectName + ' correctly saved.'}})
        except Exception as e:
            print (e)
            return render(request, 'home/createProject.html', {'wgs': wgs, 'post_save': {'error': 'Something went wrong'}})



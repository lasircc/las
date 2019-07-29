from .__init__ import *



#@login_required
def logout(request):
    auth.logout(request)
    return HttpResponseRedirect(reverse('LASLogin'))
    


class LASLogin(View):
    def get(self, request):
        print (request.user)
        if not request.user.is_anonymous:
            return HttpResponseRedirect(reverse(index))
        else:
            projects = []
            return render(request, 'home/login.html', {'projects':projects})
    
    def post(self, request):
        if 'username' in request.POST and 'password' in request.POST:
            #from login form
            form = LoginForm(request.POST)
            if form.is_valid():
                username = request.POST['username']
                password = request.POST['password']
                user = auth.authenticate(username=username, password=password)
                if user is not None and user.is_active:
                    auth.login(request, user)
                    return HttpResponseRedirect(reverse(index))
        return render(request, 'home/login.html', {'projects':[], 'err_message': "Invalid authentication",})



@login_required
def index(request):
    try:
        user = request.user
        #luser = LASUser.objects.get(pk=user.id)

    except Exception as e:
        print(e)
        return HttpResponseRedirect(reverse(logout))
    name = user.username
    mod_list = []
    menu = {}
    menu_sort = []
    piFlag=False
    
    adminFlag=False
    managerFlag= False


    print ({'name':name, 'menu': menu_sort,'PI':piFlag,'admin':adminFlag,'manager':managerFlag})
    return render(request, 'home/index.html',{'name':name, 'menu': menu_sort,'PI':piFlag,'admin':adminFlag,'manager':managerFlag})


class ContactUs(View):
    def get(self, request):
        if 'refreshCaptcha' in request.GET:
            to_json_response = dict()
            to_json_response['status'] = 0
            to_json_response['new_cptch_key'] = CaptchaStore.generate_key()
            to_json_response['new_cptch_image'] = captcha_image_url(to_json_response['new_cptch_key'])
            return HttpResponse(json.dumps(to_json_response), content_type='application/json')

        return render(request, 'home/contactus.html', { 'cf': CaptchaForm()})

    def post(self, request):
        try:
            print (request.POST, request.FILES)
            captcha_data = {'captcha_0': request.POST.get('captcha_0'), 'captcha_1': request.POST.get('captcha_1')}
            print("captcha_data: ", captcha_data)
            cform = CaptchaForm(captcha_data)
            if cform.is_valid():
                print ('valid')

                n = Notification(subject="[LAS-Registration] New registration request", message="A new registration has been submitted. Please check the attached files", html_msg="<p>A new registration has been submitted. Please check the attached files</p>", to=[settings.DEFAULT_FROM_EMAIL], attach=[request.FILES['coverLetter'], request.FILES['userList'] ])
                n.send()
               
                n = Notification(subject="[LAS-Registration] New registration request", message="Dear " + request.POST['title'] + " " + request.POST['first_name'] + " " + request.POST['last_name'] + ",\nthanks for submitting your regustration request. Our staff will check the submitted documentation and if everything will be fine they will proceed to register your group. For further comunitation reply to this email. You find enclosed in this email the documents you submitted.", html_msg="<p>Dear " + request.POST['title'] + " " + request.POST['first_name'] + " " + request.POST['last_name'] + ",</p><p>thanks for submitting your regustration request. Our staff will check the submitted documentation and if everything will be fine they will proceed to register your group. For further comunitation reply to this email. You find enclosed in this email the documents you submitted.</p>", to=[request.POST['email']], attach=[request.FILES['coverLetter'], request.FILES['userList'] ])
                n.send()


                return render(request, 'home/contactus.html', {'post_save': {'success': 'request submitted'}})
            else:
                return render(request, 'home/contactus.html', { 'cf': CaptchaForm(), 'msg': 'No valid captha'})
            
        except Exception as e:
            print (e)
            return render(request, 'home/contactus.html', { 'cf': CaptchaForm(), 'msg': 'Something went wrong'})



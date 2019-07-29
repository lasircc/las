from .__init__ import *

def validateProfile(profile, users):
    valid = True
    try:
        validate_email(profile['email'])
        val = profile['email'].split('@')[0]

        if User.objects.filter(email=profile['email']).count():
            profile['username'] = User.objects.get(email=profile['email']).username
            profile['existing'] = True
        else:
            print (val)
            x=0
            while True:
                if x == 0 and (User.objects.filter(username=val).count() == 0 and (val not in [ u['email'].split('@')[0] for u in users ])):
                    new_val = val
                    break
                else:
                    new_val = "{0}_{1}".format(val,x)
                    print (new_val)
                    if User.objects.filter(username=new_val).count() == 0 and (new_val not in [u['username'] for u in users]):
                        break
                x += 1
                if x > 100:
                    print ("Name is super popular!")
                    raise Exception("Name is super popular!")
            
            profile['username'] = new_val
            

            alphabet = string.ascii_letters + string.digits
            password = ''.join(secrets.choice(alphabet) for i in range(8))
            profile['password'] = password
            profile['existing'] = False
    except Exception as e:
        print (e)
        valid = False
    return valid



@method_decorator([login_required], name='dispatch')
class RegisterWG(View):
    def get(self, request):
        return render(request, 'user/registerWG.html')


    def post(self, request):
        
        print (request.POST, request.FILES)
        msg = "Saved"

        wb = load_workbook(request.FILES['userList'])
        ws = wb['Users']

        i = 0
        users = []
        pi = None
        valid = True
        for row in ws.rows:
            if i > 0:
                userProfile = {'first_name': row[0].value, 'last_name': row[1].value, 'email': row[2].value, 'is_pi': row[3].value, 'is_vice_pi': row[4].value}
                valid = validateProfile(userProfile, users)
                print (userProfile)
                if valid:
                    if userProfile['is_pi'] == 'Yes' and pi == None:
                        pi = userProfile
                        users.append( userProfile)
                    elif userProfile['is_pi'] == 'Yes' and pi != None:
                        msg = "Two PIs selected"
                        return render(request, 'user/registerWG.html', {'post_save': {'msg': msg, 'status': 'err'}})
                    else:
                        users.append( userProfile)
                else:
                    msg = "User profile for " + userProfile['email'] + " is not valid"
                    return render(request, 'user/registerWG.html', {'post_save': {'msg': msg, 'status': 'err'}})
            i += 1


        if pi == None:
            msg = "No PI selected"
            return render(request, 'user/registerWG.html', {'post_save': {'msg': msg, 'status': 'err'}})


        with db.client.start_session() as session:
            try:
                response = run_transaction_with_retry(self.registerWg, session, {'users': users, 'WG': request.POST['WG'], 'PI': pi})
            except Exception as exc:
                # Do something with error.
                raise exc

        return render(request, 'user/registerWG.html', {'post_save': {'msg': msg, 'status': 'ok'}})


    def registerWg(self, session, data):
        response = {'success':False, 'errorCode':'Malformed request'}

        #data = {'users': users, 'WG': request.POST['WG'], 'PI': pi}
        pi = data['PI']
        users = []
        notifications = []
        with session.start_transaction():#read_concern=pymongo.read_concern.ReadConcern("snapshot")
            wgId = db.social.insert_one({
                'name': data['WG'],
                '@type': 'WG',
                'acl': {
                    'r':[],
                    'w': [],
                    'o': []
                }
            }, session=session)

            res = db.social.update_one({'_id': wgId.inserted_id}, 
                {'$addToSet': {'acl.w': wgId.inserted_id} }, session=session )
            if res.modified_count == 0:
                raise('Error in insert access in wg')
            
            if pi['existing'] == False:
                lasPiuser = User.objects.create_user(username=pi['username'], first_name = pi['first_name'], last_name = pi['last_name'], email=pi['email'], password= pi['password'])
                lasPiuser.save()

                PIuserProfile = {
                    '_id': pi['username'],
                    'perm': {
                        'w': {'advanced': [data['WG']]},
                        'b': {}
                    },
                    'acl': {
                       'r': [],
                       'w': [wgId.inserted_id],
                       'o': []
                    }
                }

                db.user.insert_one(PIuserProfile, session=session)
                emailMsg = "Dear " + pi['first_name'] + " " + pi['last_name'] + ",\nyour account has been created. Your Working Group is named " + data['WG'] +".\nYour credentials are the following ones:\nusername: " + pi['username'] + "\npassword: " + pi['password'] + "\nBest regards,\nLAS Team"
                emailHtmlMsg = "<p>Dear "  + pi['first_name'] + " " + pi['last_name'] + ",</p><p>your account has been created. Your Working Group is named " + data['WG'] +".</p><p>Your credentials are the following ones:<ul><li>username: " + pi['username'] + "</li><li>password: " + pi['password'] + "</li></ul></p><p>Best regards,</p><p>LAS Team"

                n = Notification(subject="[LAS] Account created", message=emailMsg, html_msg=emailHtmlMsg, to=[pi['email']])
                notifications.append(n)
            else:
                db.user.update_one({'_id': pi['username']}, {'$addToSet': { 'perm.w.advanced': data['WG'], 'access_w': data['WG'], 'heritage': data['WG'] }}, session=session )

            users.append(pi['username'])


            for u in data['users']:
                if u['is_pi'] == "Yes":
                    continue
                if u['existing'] == False:
                    lasUser = User.objects.create_user(username=u['username'], first_name = u['first_name'], last_name = u['last_name'], email=u['email'], password= u['password'])
                    lasUser.save()

                    userProfile = {
                        '_id': u['username'],
                        'perm': {
                            'w': {},
                            'b': {}
                        },
                        'acl': {
                            'r': [],
                            'w': [wgId.inserted_id],
                            'o': []
                        }
                    }
                    if u['is_vice_pi'] == "Yes":
                        userProfile['perm']['w']['advanced'] = [wgId.inserted_id]

                    db.user.insert_one(userProfile, session=session)
                    emailMsg = "Dear " + u['first_name'] + " " + u['last_name'] + ",\nyour account has been created. You are assigned to the Working Group named " + data['WG'] +".\nYour credentials are the following ones:\nusername: " + u['username'] + "\npassword: " + u['password'] + "\nBest regards,\nLAS Team"
                    emailHtmlMsg = "<p>Dear " + u['first_name'] + " " + u['last_name'] + ",</p><p>your account has been created.  You are assigned to the Working Group named " + data['WG'] +".</p><p>Your credentials are the following ones:<ul><li>username: " + u['username'] + "</li><li>password: " + u['password'] + "</li></ul></p><p>Best regards,</p><p>LAS Team"

                    n = Notification(subject="[LAS] Account created", message=emailMsg, html_msg=emailHtmlMsg, to=[u['email']])
                    notifications.append(n)
                else:

                    db.user.update_one({'_id': u['username']}, {'$addToSet': { 'acl.w': wgId.inserted_id }}, session=session )
                    if u['is_vice_pi'] == "Yes":
                        db.user.update_one({'_id': u['username']}, {'$addToSet': { 'perm.w.advanced': wgId.inserted_id }}, session=session )
                users.append(u['username'])


                
            res = db.social.update_one({'_id': wgId.inserted_id}, {'$set': {'users': users}}, session=session)
            if res.modified_count == 0:
                raise('Error in insert users in wg')
            for n in notifications:
                n.send()
            response = {'success':True, 'errorCode':'Registration wg completed'}
            
            commit_with_retry(session)
        return response 


class AddUser(APIView):
    def post(self, request, format=None):
        try:
            print (request.data)
            email = request.data.get('email', None)
            wgId = request.data.get('wgID', None)
            first_name = request.data.get('first_name', None)
            last_name = request.data.get('last_name', None)
            is_vice_pi = request.data.get('is_vice_pi', False)

            users = []
            userProfile = {'first_name': first_name, 'last_name': last_name, 'email': email, 'is_pi': False, 'is_vice_pi': is_vice_pi}
            valid = validateProfile(userProfile, users)
            if valid:
                users.append(userProfile)
                with db.client.start_session() as session:
                    try:
                        print (wgId)
                        wg = db.social.find_one({'_id': ObjectId(wgId)})
                        response = run_transaction_with_retry(self.registerUser, session, {'users': users, 'WG': wg})
                    except Exception as exc:
                        print (exc)
                        raise exc

            return Response({'message': 'ok', 'userProfile': userProfile}, status=status.HTTP_200_OK)
        except Exception as e:
            print (e)
            return Response({'message': 'error'}, status=status.HTTP_400_BAD_REQUEST)


    def registerUser(self,session, data):
        notifications = []
        with session.start_transaction():
            for u in data['users']:
                if u['existing'] == False:
                    superuser = False
                    if data['WG']['name'] == 'admin':
                        superuser = True
                    lasUser = User.objects.create_user(username=u['username'], first_name = u['first_name'], last_name = u['last_name'], email=u['email'], password= u['password'], is_superuser=superuser, is_staff=superuser)
                    lasUser.save()

                    userProfile = {
                        '_id': u['username'],
                        'perm': {
                            'w': {},
                            'b': {}
                        },
                        'acl': {
                            'r': [],
                            'w': [data['WG']['_id']],
                            'o': []
                        }
                    }
                    if u['is_vice_pi'] == "Yes":
                        userProfile['perm']['w']['advanced'] = [data['WG']['_id']]

                    db.user.insert_one(userProfile, session=session)
                
                    emailMsg = "Dear " + u['first_name'] + " " + u['last_name'] + ",\nyour account has been created. You are assigned to the Working Group named " + data['WG']['name'] +".\nYour credentials are the following ones:\nusername: " + u['username'] + "\npassword: " + u['password'] + "\nBest regards,\nLAS Team"
                    emailHtmlMsg = "<p>Dear " + u['first_name'] + " " + u['last_name'] + ",</p><p>your account has been created.  You are assigned to the Working Group named " + data['WG']['name'] +".</p><p>Your credentials are the following ones:<ul><li>username: " + u['username'] + "</li><li>password: " + u['password'] + "</li></ul></p><p>Best regards,</p><p>LAS Team"

                    n = Notification(subject="[LAS] Account created", message=emailMsg, html_msg=emailHtmlMsg, to=[u['email']])
                    notifications.append(n)
                else:
                    db.user.update_one({'_id': u['username']}, {'$addToSet': { 'acl.w': data['WG']['_id'] }}, session=session )
                    if u['is_vice_pi'] == True:
                        db.user.update_one({'_id': u['username']}, {'$addToSet': { 'perm.w.advanced': data['WG']['_id'] }}, session=session )
                    
                db.social.update_one({'_id': data['WG']['_id']}, {'$addToSet': {'users': u['username']}}, session=session)
                
            
            for n in notifications:
                n.send()
            
            commit_with_retry(session)

        return 



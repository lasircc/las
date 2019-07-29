from .__init__ import *


@method_decorator([login_required], name='dispatch')
class ManageGenid(View):
    def get(self, request):
        try:
            r = requests.get('http://biobank/api/genidFeatures/')
            entityFeatures = r.json()

            # to insert implant sites of mouse (call xeno)

            print (entityFeatures)
            currentRules = list(db.genidrules.find({}))
            print (currentRules)
            return render(request, 'home/manageGenid.html', {"entityFeatures": entityFeatures, "currentRules": currentRules, "features": json.dumps(entityFeatures['features'])})
        except Exception as e:
            print (e)
            return render(request, 'home/manageGenid.html')

    def post(self, request):
        try:
            action = request.POST.get('action', None)
            print ('action', action)
            message = ''
            payload = None
            if action == 'addrule':
                r = requests.get('http://biobank/api/genidFeatures/')
                entityFeatures = r.json()
                material = request.POST.get('material', None)
                default = request.POST.get('default', 'off')
                mousetissue = request.POST.get('mousetissue', None)
                vector = request.POST.get('vector', None)
                tissueType = request.POST.get('tissueType', None)
                features = request.POST.getlist('features', None)
                
                print (material, default, mousetissue, vector, tissueType, features)
                
                g = GenealogyID()
                g.setArchivedMaterial(material)
                print (g.getGenID())
                rule = {'material': material, 'default': False, 'rule': g.getGenID(), 'features': []}
                if default=='on':
                    rule['default'] = True
                    # only one default rule can be saved for a material
                    sameRule = db.genidrules.find({'material': material, 'default':True}).count()
                    if sameRule:
                        raise Exception('Default rule just defined for ' + material)
                    
                else:
                    print ('no default')
                    if mousetissue==None and vector==None and tissueType==None:
                        raise Exception('Insert at least one value among Mouse tissue, Vector, and Tissue type')

                    search = '(.*)' + g.regex() + '(.*)'
                    regex = re.compile(search)
                    otherRules = db.genidrules.find({'material': material, 'default':False, 'rule': {"$regex":regex,"$options": 'x'} })
                    print ('otherRule', otherRules)
                    g.setTissue(tissueType)
                    g.setTissueType(mousetissue)
                    g.setSampleVector(vector)

                    print (g.getGenID())

                    rule['rule'] = g.getGenID()
                    if otherRules.count():
                        valid = self.upperset(g, otherRules)
                        if not valid:
                            raise Exception('Existing upperset')


                for f in entityFeatures['features']:
                    if f['abbreviation'] == material:
                        print (f['features'], features)
                        rule['features'] = [i for i in f['features'] if str(i['id']) in features]
                        break

                    
                print (rule)
                db.genidrules.insert_one(rule)
                message = 'Genid rule updated'

            elif action == 'deleterule':
                oid = request.POST.get('oid', None)
                print (oid)
                if oid:
                    result = db.genidrules.delete_one({'_id': ObjectId(oid)})
                    if result.deleted_count == 1:
                        return JsonResponse({'status': True})
                    else:
                        return JsonResponse({'status': False})    
                else:
                    return JsonResponse({'status': False})

            elif action == 'addmaterial':
                longName = request.POST.get('longName', None)
                abbreviation = request.POST.get('abbreviation', None)
                if longName and abbreviation:
                    payload = {'longName': longName, 'abbreviation': abbreviation, 'action': 'addmaterial'}
                    message = 'Material added'
            elif action == 'addtissuetype':
                longName = request.POST.get('longName', None)
                abbreviation = request.POST.get('abbreviation', None)
                if longName and abbreviation:
                    payload = {'longName': longName, 'abbreviation': abbreviation, 'action': 'addtissuetype'}
                    message = 'Tissue type added'
            elif action == 'addvector':
                longName = request.POST.get('name', None)
                abbreviation = request.POST.get('abbreviation', None)
                if longName and abbreviation:
                    payload = {'name': longName, 'abbreviation': abbreviation, 'action': 'addvector'}
                    message = 'Vector added'
            elif action == 'addtissue':
                longName = request.POST.get('longName', None)
                abbreviation = request.POST.get('abbreviation', None)
                if longName and abbreviation:
                    payload = {'longName': longName, 'abbreviation': abbreviation, 'action': 'addtissue'}
                    message = 'Tissue added'
            elif action == 'addcollection':
                longName = request.POST.get('longName', None)
                abbreviation = request.POST.get('abbreviation', None)
                if longName and abbreviation:
                    payload = {'longName': longName, 'abbreviation': abbreviation, 'action': 'addcollection'}
                    message = 'Collection type added'
            elif action == 'addfeatures':
                name = request.POST.get('name', None)
                measureUnit = request.POST.get('measureUnit', None)
                material = request.POST.get('material', None)
                if name and material:
                    payload = {'name': name, 'measureUnit': measureUnit, 'material':material, 'action': 'addfeatures'}
                    message = 'Feature added'

            if payload:
                r = requests.post('http://biobank/api/genidFeatures/', data=payload)
                if r.status_code != 200:
                    raise Exception('Error in saving to biobank')
                    
            currentRules = list(db.genidrules.find({}))
            r = requests.get('http://biobank/api/genidFeatures/')
            entityFeatures = r.json()
            return render(request, 'home/manageGenid.html', {'entityFeatures': entityFeatures, 'currentRules': currentRules, "features": json.dumps(entityFeatures['features']), 'post_save': {'success': message}})
        except Exception as e:
            print (e)
            currentRules = list(db.genidrules.find({}))
            r = requests.get('http://biobank/api/genidFeatures/')
            entityFeatures = r.json()
            return render(request, 'home/manageGenid.html', {'entityFeatures': entityFeatures, 'currentRules': currentRules, "features": json.dumps(entityFeatures['features']), 'post_save': {'error': 'Something went wrong' }})

    def upperset(self, candidate, cases):
        ruleCandidate = [candidate.getSampleVectorValid(), candidate.getTissueTypeValid(), candidate.getTissueValid()]
        for c in cases:
            gc = GenealogyID(c['rule'])
            ruleCase = [gc.getSampleVectorValid(), gc.getTissueTypeValid(), gc.getTissueValid()]
            inter = set(ruleCandidate).intersection(set(ruleCase))
            ninter = 0
            for i in inter:
                if i:
                    ninter +=1
            if ninter:
                return False

        return True

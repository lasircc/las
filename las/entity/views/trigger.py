from boltons.iterutils import remap, default_enter, default_exit, get_path
from dotty_dict import dotty
from LASUtils.mongodb import db

class Trigger:

    def __init__(self, doc = {}, trigger = None):
        self.doc = dotty(doc)
        self.trigger = trigger


    def exec (self):
        if self.checkWhen():
            for p in self.trigger['pipeline']:
                self.switch(p['f'], p['params'])
        return

    
    def checkWhen(self):
        flag = True
        for w in self.trigger['when']:
            if self.doc[w['f']] != w['v']:
                flag = False
                break
        return flag

    def switch(self, f, params):
        default = "Incorrect function"
        return getattr(self, str(f), lambda: default)(**params)
        

    def unique(self, **params):
        query = { '_type': self.trigger['_class']}
        for f in params['fields']:
            query[f] = self.doc[f]
        
        ndocs = db[self.trigger['ns']].find(query).count()

        if ndocs:
            raise Exception('Duplicated doc')

        #return 


    def update(self, **params):
        for k, v in params['dict'].items():
            self.doc[k] = v
        return 


    def inherit(self, **params):
        print ('inherit', params, self.trigger)
        # {'fToCopy': ['features.dim.x', 'features.dim.y'], 'inputField': 'features.contType', 'ns': 'catalog', 'typeDoc': 'Container', 'joinField': 'features.contType'}
        query = {'_type': params['typeDoc']}
        query[params['joinField']] = self.doc[params['inputField']]
        ref = db[params['ns']].find_one(query)
        print (ref)
        if ref:
            data = dotty(ref)
            for f in params['fToCopy']:
                self.doc[f] = data[f]
        


        return 


    def getDoc(self):
        return self.doc.to_dict()


    

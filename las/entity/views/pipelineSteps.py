from .__init__ import *

class Pipeline:

    def __init__(self, doc = {}):
        self.doc = doc

    def setParams (self, doc, params):
        self.params = params

    def switch(self, f):
        default = "Incorrect function"
        return getattr(self, str(f), lambda: default)()
        

    def unique(self):
        print ('unique', self.params)

        
        #return 


    def update(self):
        print ('update', self.params)
        return 


    def inherit(self):
        print ('inherit', self.params)
        return 


    def getDoc(self):
        return self.doc

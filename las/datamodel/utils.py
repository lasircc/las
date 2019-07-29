import ontospy
import requests
# The low-level cache API
from django.core.cache import cache # This object is equivalent to caches['default'].


def new_ontologyClassTree(self):
    """
    Returns a dict representing the ontology tree
    Top level = {0:[top classes]}
    Multi inheritance is represented explicitly
    """
    treedict = {}
    if self.all_classes:
        treedict[0] = self.toplayer_classes
        for element in self.all_classes:
            if element.children():
                treedict[element] = list()
                children_set = set(element.children())
                for e in element.children():
                    parents_set = set(e.parents())
                    if not children_set.intersection(parents_set):
                        treedict[element].append(e)
        return treedict
    return treedict


ontospy.Ontospy.ontologyClassTree = new_ontologyClassTree


"""
Global vars
"""
# The repo name
REPO = 'las_ontology'
# BASE URL
GRAPHDB_URL = 'http://graphdb:7200/repositories/'
# SPARQL Endpoint
SPARQL_ENDPOINT = GRAPHDB_URL+REPO
# Cache duration
TTL = 30*60 # seconds (passing in None for timeout will cache the value forever)
        


"""
Model Caching system

"""        

def get_model():
    # try to get cached model. If the object doesn’t exist in the cache, cache.get() returns None
    model = cache.get('data_model')

    if not model: # if it is not cached, cache it!
        # load and cache model
        model = cache_model()        

    return model

def cache_model():
    print('Caching data model in redis...')
    model = ontospy.Ontospy(sparql_endpoint=SPARQL_ENDPOINT, verbose = True)
    model.build_all(verbose=True)
    cache.set('data_model', model, TTL)
    return model

def add_data_in_model():
    pass




"""
A simple Graph DB Repo Manager

"""


class GraphDBRepoManager(object):


    def __init__(self):
        self.repo = REPO


    def clear(self):
        """ Clear the DB """
        print (f"Clearing repo: {self.repo}")
    
        r = requests.delete(f"{GRAPHDB_URL+self.repo}/statements")

        if r.status_code == 204: # everything is fine
            print ("Booooooooom!\n-----------------" )
            print (f"{self.repo} clear")
            
        else:
            raise Exception(f'Something went wrong during the clearing of {self.repo}')


    def load_data(self, data):
        """ Add content to DB """
    
        print (f"Loading triples from {data} in {self.repo}")

        headers = {"Content-Type":"application/x-turtle"}


        r = requests.post(f'{GRAPHDB_URL+self.repo}/statements', data=data, headers=headers)

        if r.status_code == 204: # everything is fine
            cache_model()
            print("New model has been loaded and cached")
            print ("Booooooooom!\n-----------------" )
            print (f"{self.repo} clear")
            
        else:
            print(f'GraphDB API returned {r.status_code}')
            raise Exception(f'Something went wrong during the loading of new triples')

        



from jsondesign.schema_store import Schema_Store
from LASUtils.mongodb import *



def replace_char_in_dict_keys(dictionary, old_char, new_char):
    returned_dict = {}
    for k, v in d.iteritems():
        if isinstance(v, dict):
            v = replace_char_in_dict_keys(v)
        returned_dict[k.replace(old, new)] = v

    return returned_dict


# How to retrieve a doc. A custom way. Pass this function to jsondesign.schema_store.Schema_Store
def getter(uri):
    schema = db.dataModel.findOne({"_id":uri})
    return replace_char_in_dict_keys(schema,'_','$')

# Hot to save a doc. A custom way. Pass this function to jsondesign.schema_store.Schema_Store
def saver(schema):
    db.dataModel.insertOne(replace_char_in_dict_keys(schema,'$','_'))

# create a schema store
schema_store = Schema_Store(getter = getter, saver = saver)














# import ontospy
# import requests
# # The low-level cache API
# from django.core.cache import cache # This object is equivalent to caches['default'].


# def new_ontologyClassTree(self):
#     """
#     Returns a dict representing the ontology tree
#     Top level = {0:[top classes]}
#     Multi inheritance is represented explicitly
#     """
#     treedict = {}
#     if self.all_classes:
#         treedict[0] = self.toplayer_classes
#         for element in self.all_classes:
#             children = getDirectChildren(element)
#             if children:
#                 treedict[element] = children
#             # if element.children():
#             #     treedict[element] = list()
#             #     children_set = set(element.children())
#             #     for e in element.children():
#             #         parents_set = set(e.parents())
#             #         if not children_set.intersection(parents_set):
#             #             treedict[element].append(e)
#         return treedict
#     return treedict


# ontospy.Ontospy.ontologyClassTree = new_ontologyClassTree


# def getDirectChildren(entity):

#     if entity.children():
#         children = list()
#         children_set = set(entity.children())
#         for c in entity.children():
#                     parents_set = set(c.parents())
#                     if not children_set.intersection(parents_set):
#                         children.append(c)
#         return children
    
#     # no Children
#     return None


# def getDirectParents(entity):

#     if entity.parents():
#         parents = list()
#         parents_set = set(entity.parents())
#         for p in entity.parents():
#                     children_set = set(p.children())
#                     if not parents_set.intersection(children_set):
#                         parents.append(p)
#         return parents
    
#     # no Children
#     return None
        

# def getAllAncestors(entity):

#     ancestors = dict()
#     parents = getDirectParents(entity)
#     if parents:
#         ancestors[entity] = getDirectParents(entity)
#         for p in entity.parents(): #all the upstream parents
#             grandparents = getDirectParents(p)
#             if grandparents:
#                 ancestors[p] = grandparents
#             else:
#                 ancestors[p] = [0]
#     else:
#         ancestors[entity] = [0]
    
#     return ancestors









# """
# Global vars
# """
# # The repo name
# REPO = 'las_ontology'
# # BASE URL
# GRAPHDB_URL = 'http://graphdb:7200/repositories/'
# # SPARQL Endpoint
# SPARQL_ENDPOINT = GRAPHDB_URL+REPO
# # Cache duration
# TTL = 30*60 # seconds (passing in None for timeout will cache the value forever)
        


# """
# Model Caching system

# """        

# def get_model():
#     # try to get cached model. If the object doesn’t exist in the cache, cache.get() returns None
#     model = cache.get('data_model')

#     if not model: # if it is not cached, cache it!
#         # load and cache model
#         model = cache_model()        

#     return model

# def cache_model():
#     print('Caching data model in redis...')
#     model = ontospy.Ontospy(sparql_endpoint=SPARQL_ENDPOINT, verbose = True)
#     model.build_all(verbose=True)
#     cache.set('data_model', model, TTL)
#     return model

# def add_data_in_model():
#     pass




# """
# A simple Graph DB Repo Manager

# """


# class GraphDBRepoManager(object):


#     def __init__(self):
#         self.repo = REPO


#     def clear(self):
#         """ Clear the DB """
#         print (f"Clearing repo: {self.repo}")
    
#         r = requests.delete(f"{GRAPHDB_URL+self.repo}/statements")

#         if r.status_code == 204: # everything is fine
#             print ("Booooooooom!\n-----------------" )
#             print (f"{self.repo} clear")
            
#         else:
#             raise Exception(f'Something went wrong during the clearing of {self.repo}')


#     def load_data(self, data):
#         """ Add content to DB """
    
#         print (f"Loading triples from {data} in {self.repo}")

#         headers = {"Content-Type":"application/x-turtle"}


#         r = requests.post(f'{GRAPHDB_URL+self.repo}/statements', data=data, headers=headers)

#         if r.status_code == 204: # everything is fine
#             cache_model()
#             print("New model has been loaded and cached")
#             print ("Booooooooom!\n-----------------" )
#             print (f"{self.repo} clear")
            
#         else:
#             print(f'GraphDB API returned {r.status_code}')
#             raise Exception(f'Something went wrong during the loading of new triples')

        



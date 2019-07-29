from pymongo import MongoClient, ReadPreference
from pymongo.collection import Collection
from pymongo.errors import AutoReconnect, ConnectionFailure, OperationFailure

from django.conf import settings

from types import FunctionType
import functools
import time

from bson.json_util import loads, dumps
from bson.objectid import ObjectId
from django.core.serializers.json import DjangoJSONEncoder
import json

__all__ = ('connection', 'connections', 'db', 'to_json')

'''
Goals:
* To provide a clean universal handler for Mongo, similar to how Django does it
for other db connections, but Mongo is unique and simple enough to just live on
it's own.
* To wrap the pymongo Collection methods automatically with a reconnect decorator
in case a server is temporarily down, or a replica set is in the middle of failing
over to a secondary server.
'''

'''
In settings.py:
MONGODB = {
    'default': {
        'NAME': 'db1' # Default database to connect to
        'LOCATION': [ # An array of host strings, similar to the CACHES setting.
            'localhost:27017',
        ]
    }
}

Usage:
from mongodb import connections, connection, db
connections['default'].db1.messages.find({'key': 'value'}) # manually select the 'default' connection
connection.db1.messages.find({'key': 'value'}) # manually specific the database to be used to override "NAME"
db.messages.find({'key': 'value'}) # Just let the library use all of the defaults
'''

def with_reconnect(func):
    '''
    Handle when AutoReconnect is raised from pymongo. This is the standard error
    raised for everything from "host disconnected" to "couldn't connect to host"
    and more.
    
    The sleep handles the edge case when the state of a replica set changes, and
    the cursor raises AutoReconnect because the master may have changed. It can
    take some time for the replica set to stop raising this exception, and the
    small sleep and iteration count gives us a couple of seconds before we fail
    completely. See also http://jira.mongodb.org/browse/PYTHON-216
    '''
    @functools.wraps(func)
    def _reconnector(*args, **kwargs):
        for x in xrange(20):
            try:
                return func(*args, **kwargs)
            except AutoReconnect:
                time.sleep(0.250)
                pass
        raise
    return _reconnector

class ConnectionDoesNotExist(Exception):
    pass
    
class CollectionWrapper(object):
    def __init__(self, collection):
        self._collection = collection

    def __getattr__(self, func):
        old = getattr(self._collection, func)
        if type(old) is FunctionType:
            return with_reconnect(old)
        return old

    
    
    def __repr__(self): return '<CollectionWrapper %s>' % self._collection.__repr__()
    def __str__(self):  return '<CollectionWrapper %s>' % self._collection.__str__()

class DatabaseWrapper(object):
    def __init__(self, database):
        self._database = database
    
    def __getattr__(self, func):
        old = getattr(self._database, func)
        if type(old) is FunctionType:
            return with_reconnect(old)
        elif isinstance(old, Collection):
            return CollectionWrapper(old)
        
        return old
    
    def __getitem__(self, func):
        return CollectionWrapper(self._database[func])
        
        #return old
    
    def __repr__(self): return '<DatabaseWrapper %s>' % self._database.__repr__()
    def __str__(self):  return '<DatabaseWrapper %s>' % self._database.__str__()

class ConnectionWrapper(object):
    def __init__(self, connection, default=None):
        self._connection = connection
        self._databases = {}
        self._default = default
    
    def __getattr__(self, alias):
        if self._default is not None and alias == 'default':
            alias = self._default
        
        if alias in self._databases:
            return self._databases[alias]
        
        database = DatabaseWrapper(self._connection[alias])
        self._databases[alias] = database
        
        return database

    def __getitem__(self, alias):
        if self._default is not None and alias == 'default':
            alias = self._default
        
        if alias in self._databases:
            return self._databases[alias]
        
        database = DatabaseWrapper(self._connection[alias])
        self._databases[alias] = database
        
        return database
    
    def __repr__(self): return '<ConnectionWrapper %s>' % self._connection.__repr__()
    def __str__(self):  return '<ConnectionWrapper %s>' % self._connection.__str__()

class MongoHandler(object):
    def __init__(self, databases):
        self.databases = databases
        self._connections = {}
    
    def __getitem__(self, alias):
        if alias in self._connections:
            return self._connections[alias]
        
        try:
            conn = self.databases[alias]
        except KeyError:
            raise ConnectionDoesNotExist("The connection %s doesn't exist" % alias)
        
        connectionString = 'mongodb://'
        for node in self.databases[alias]['LOCATION'][:-1]:
            connectionString += str(node) + ','
        connectionString += str(self.databases[alias]['LOCATION'][-1]) + '/'

        print (connectionString)

        #conn = MongoClient([node for node in self.databases[alias]['LOCATION']], replicaset='rslas')
        if 'USERNAME' in self.databases[alias]:
            conn = MongoClient(connectionString, tz_aware=True, connect=False, username=self.databases[alias]['USERNAME'], password=self.databases[alias]['PWD'])
        else:
            conn = MongoClient(connectionString, tz_aware=True, connect=False)
        print(conn.nodes)
        self._connections[alias] = ConnectionWrapper(conn, self.databases[alias]['NAME'])
        
        return self._connections[alias]
    
def to_json(o):
    return json.loads(dumps(o))

def run_transaction_with_retry(txn_func, session, data):
    response = {}
    i = 0
    while True:
        try:
            response = txn_func(session, data)  # performs transaction
            break
        except (ConnectionFailure, OperationFailure) as exc:
            # If transient error, retry the whole transaction
            if exc.has_error_label("TransientTransactionError"):
                print("TransientTransactionError, retrying "
                      "transaction ...")
                i += 1
                if i < 3:
                    continue
                else:
                    raise
            else:
                raise
    return response

def commit_with_retry(session):
    while True:
        try:
            # Commit uses write concern set at transaction start.
            session.commit_transaction()
            print("Transaction committed.")
            break
        except (ConnectionFailure, OperationFailure) as exc:
            # Can retry commit
            if exc.has_error_label("UnknownTransactionCommitResult"):
                print("UnknownTransactionCommitResult, retrying "
                      "commit operation ...")
                continue
            else:
                print("Error during commit ...")
                raise

connections = MongoHandler(settings.MONGODB)
connection = connections['default']
db = connection.default
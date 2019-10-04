from rest_framework.viewsets import ViewSet
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework import authentication, permissions, status

from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_exempt
from django.conf import settings


from LASUtils.mongodb import connections, connection, db, to_json
import json
from bson.objectid import ObjectId
import re
from bson.json_util import dumps
from LASUtils.serializers import ResponseSerializer

import random, string
import datetime

from LASUtils.query import paginate

from rest_framework.decorators import action

from drf_yasg.utils import swagger_auto_schema
from drf_yasg import openapi 
import os

import pymongo

from boltons.iterutils import remap, default_enter, default_exit, get_path
from dotty_dict import dotty

from .trigger import *


class Document:
    def __init__(self, doc, ns, session):
        self.doc = doc
        self.ns = ns
        self.session = session

        self.cleanDoc()
        
        if self.alreadyExists():
            self.doc = db[self.ns].find_one({'_id': self.getId()})
            if self.checkLog():
                if self.ns == 'entity':
                    db[self.ns].update_one({'_id': self.getId()}, {"$set": {"session": self.session} })
                    self.doc = db[self.ns].find_one({'_id': self.getId()})
            else:
                raise Exception('Locked resource')
        else:
            self.doc['ts'] = datetime.datetime.now()
            self.addSession()
            



    def validate(self, event):
        valid = True
        errMess = None
        if event == 'i':
            if self.alreadyExists():
                return valid, errMess

        for typeDoc in self.doc['_type']:
            triggers = db.triggers.find({"ns" : self.ns, "_class" : typeDoc, 'e': event})
            for trigger in triggers:
                try:
                    p = Trigger(self.doc, trigger)
                    p.exec()
                    self.doc = p.getDoc()

                except Exception as e:
                    print (e)
                    valid = False
                    errMess = str(e)
                    pass

        return valid, errMess

    def checkLog(self):
        if 'session' in self.doc:
            if self.doc['session']['csrf'] != self.session['csrf']:
                return False

        return True

    def removeSession(self):
        if 'session' in self.doc:
            del self.doc['session']

    def addSession(self):
        self.doc['session'] = self.session
        self.doc['session']['t'] = datetime.datetime.now()

    def alreadyExists(self):
        if '_id' in self.doc:
            return True
        return False

    def getId(self):
        return self.doc['_id']


    # private function to remap and normalize objectid and date fields
    def __noramlizeDoc(self, path, key, old_parent, new_parent, new_items):
        ret = default_exit(path, key, old_parent, new_parent, new_items)
        if "$oid" in ret:
            ret =  ObjectId(ret["$oid"])
        elif "$date" in ret:
            ret = datetime.datetime.utcfromtimestamp(ret['$date']/ 1e3)
        return ret

    def cleanDoc(self):
        docClean = remap(self.doc, exit=self.__noramlizeDoc)
        drop_falsey = lambda path, key, value: bool(value)
        docClean = remap(docClean, visit=drop_falsey)
        self.doc = docClean

    def getDoc(self):
        return self.doc





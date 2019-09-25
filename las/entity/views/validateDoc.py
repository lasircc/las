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
    def __init__(self, doc):
        self.doc = doc


    def validate(self, event):
        valid = True
        errMess = None

        for typeDoc in self.doc['_type']:
            triggers = db.triggers.find({"ns" : event['ns'], "_class" : typeDoc, 'e': event['e']})
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

    def removeSession(self):
        if 'session' in self.doc:
            del self.doc['session']

    def addSession(self, csrf):
        self.doc['session'] = {"csrf": csrf, "t": datetime.datetime.now() }


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





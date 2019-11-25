from django.shortcuts import render
from django.views import View
from django.contrib.auth.decorators import login_required
from django.utils.decorators import method_decorator
from . import utils
from django.contrib import messages
from django.shortcuts import redirect


from jsondesign.schema_store import Schema_Store
from jsondesign.entity import Object
from bson.objectid import ObjectId


# from pygments import highlight
# from pygments.lexers.rdf import TurtleLexer
# from pygments.formatters import HtmlFormatter
from LASUtils.mongodb import *
import json



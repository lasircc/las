from rest_framework.viewsets import ViewSet
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework import authentication, permissions, status
from LASUtils.mongodb import db, to_json, run_transaction_with_retry, commit_with_retry

from django.contrib.auth.models import User

import json
from bson.objectid import ObjectId
import re
from bson.json_util import dumps
from django.conf import settings

import secrets
import string

from django.contrib.auth.hashers import (
    check_password, is_password_usable, make_password,
)
from django.template.loader import get_template
import datetime
import uuid
from urllib.parse import urljoin

from drf_yasg.utils import swagger_auto_schema
from drf_yasg import openapi 

from notification.models import Notification

from LASUtils.serializers import ResponseSerializer

from rest_framework.decorators import action

#from lasauth.permissions import IsAdmin, IsAuthenticated

from LASUtils.query import paginate

from django.core.validators import validate_email
from django.shortcuts import render, redirect
from django.views import View
from django.utils.decorators import method_decorator
from django.urls import reverse
from django.contrib.auth.decorators import login_required

from openpyxl import load_workbook
from LASUtils import loginas

from .user import *
from .registration import *
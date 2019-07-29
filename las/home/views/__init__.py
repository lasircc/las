from django.shortcuts import render, redirect
from ..forms import *
from ..models import *
from django.contrib import auth
from django.contrib.auth.decorators import login_required
from django.http import HttpResponse, HttpResponseRedirect, HttpResponseBadRequest, JsonResponse
from django.urls import reverse
import urllib.request, urllib.parse, urllib.error
import urllib.request, urllib.error, urllib.parse
import hashlib
import hmac
import json
from django.contrib.auth.models import User,Permission
from django.contrib.contenttypes.models import ContentType
from django.contrib.auth.decorators import user_passes_test
from django.contrib.auth import update_session_auth_hash

from django.conf import settings
from django.core.exceptions import PermissionDenied


from django.contrib.auth.hashers import (
    check_password, is_password_usable, make_password,
)


from django.db import transaction
from django.views.decorators.csrf import csrf_exempt
from django.template.loader import render_to_string
import io as StringIO
import cgi
import os

from django.forms.models import model_to_dict

from django.utils import timezone
from django.views import View
from django.utils.decorators import method_decorator
import requests
from ..forms import CaptchaForm
from captcha.models import CaptchaStore
from captcha.helpers import captcha_image_url
import mimetypes


from openpyxl import load_workbook
from django.core.validators import validate_email
import secrets
import string
import pickle
from celery import chain
import re
from bson.objectid import ObjectId

from user.views import validateProfile


RETURN_TO_FIELD_NAME = 'return_to'
SESSION_KEY_FIELD_NAME = 'session_key'
APP_FIELD_NAME = 'appid'
RETURN_STATUS_FIELD_NAME = 'status'
USER_FIELD_NAME = 'uid'
HMAC_FIELD_NAME = 'hmac'
ANSWER_YES = 'yes'
ANSWER_NO = 'no'


from LASUtils.mongodb import db
from LASUtils.decorators import *
from entity.views.genealogyID import GenealogyID

from .login import *
from .utils import *
from .entities import *
from .social import *
from .admin import *
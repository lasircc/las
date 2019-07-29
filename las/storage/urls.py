from django.urls import path, include
from .views import *
from rest_framework.routers import DefaultRouter

app_name = 'storage'

urlpatterns = [
    path('', Index.as_view(), name='index'),
]
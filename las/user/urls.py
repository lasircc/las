from django.urls import path, include
from .views import *
from rest_framework.routers import DefaultRouter


urlpatterns = [
    path('registerWG/', RegisterWG.as_view(), name='registerWG'),
    path('profile/', UserProfile.as_view(), name='userProfile'),
    path('addUser/', AddUser.as_view(), name="addUser")
]
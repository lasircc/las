from django.urls import path, include, re_path
from .views import *
#from user.views import RegisterWG

app_name = 'private'


urlpatterns = [

    path('manageTriggers/', ManageTriggers.as_view(), name='manageTriggers'),
    path('triggers/', Triggers.as_view(), name='triggers'),
    

    
]
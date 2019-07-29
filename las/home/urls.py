from django.urls import path, include, re_path
from .views import *
#from user.views import RegisterWG

urlpatterns = [
    path('', LASLogin.as_view(), name='LASLogin'),
    path('logout/', logout, name='logout'),
    path('home/', index, name='index'),
    path('helpdesk/', helpdesk, name='helpdesk'),
    path('privacy/', privacyView, name='privacyView'),
    path('contactUs/', ContactUs.as_view(), name='contactUs'),
    path('video/', video, name='video'),

    
    #advanced functionalities
    path('createProject/', CreateProject.as_view(), name='createProject'),
    path('manageWorkingGroups/', ManageWorkingGroups.as_view(), name='manageWorkingGroups'),

    # superuser
    path('genid/', ManageGenid.as_view(), name='manageGenid'),
    
]

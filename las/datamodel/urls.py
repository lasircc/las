from django.urls import path, include, re_path
from .views import *

app_name = 'datamodel'

urlpatterns = [
    # superuser
    path('manageModel/', Manage.as_view(), name='manageModel'),
    path('createEntity/', CreateEntity.as_view(), name='entity-create'),
    # path('classes-tree/', Tree.as_view(), name='classes-tree'),
    # path('properties-tree/', Tree.as_view(), name='properties-tree'),
    path('entity/<slug:entity>', Entity.as_view(), name='entity-info'),
]

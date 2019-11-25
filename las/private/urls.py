from django.urls import path, include, re_path
from .views import *
#from user.views import RegisterWG

app_name = 'private'


urlpatterns = [

    path('manageTriggers/', ManageTriggers.as_view(), name='manageTriggers'),
    path('triggers/', Triggers.as_view(), name='triggers'),
    path('datamodel/', Manage.as_view(), name='manageModel'),
    path('datamodel/createEntity/', CreateEntity.as_view(), name='entity-create'),
    # path('classes-tree/', Tree.as_view(), name='classes-tree'),
    # path('properties-tree/', Tree.as_view(), name='properties-tree'),
    path('datamodel/entity/<slug:entity>/', Entity.as_view(), name='entity-info'),
    path('datamodel/getSchemaFeatures/', SchemaFeatures.as_view(), name="schemaFeatures"),
    
    

    
]
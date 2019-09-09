from django.urls import path, include
from .views import *
from rest_framework.routers import DefaultRouter

app_name = 'pdx'

urlpatterns = [
    path('', Index.as_view(), name='index'),
    path('animals/register', RegisterAnimals.as_view(), name='registerAnimals'),
    path('animals/status', StatusAnimals.as_view(), name='statusAnimals'),
    path('measures/', Measures.as_view(), name='measures'),
    path('surgery/implant/', Implant.as_view(), name='implant'),
    path('surgery/explant/', Explant.as_view(), name='explant'),
    path('treatment/define', DefineTreatment.as_view(), name='defineTreatment'),
    path('treatment/finalize', FinalizeTreatment.as_view(), name='finalizeTreatment'),
    path('experiments/groups', GroupExperiments.as_view(), name='groupExperiments'),
    path('experiments/explore', ExploreExperiments.as_view(), name='exploreExperiments'),
    

]
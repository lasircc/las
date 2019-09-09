from django.urls import path, include
from .views import *
from rest_framework.routers import DefaultRouter

app_name = 'storage'

urlpatterns = [
    path('', Index.as_view(), name='index'),
    path('loadContainer', LoadContainer.as_view(), name='loadContainer'),
    path('move', MoveContainer.as_view(), name='moveContainer'),
    path('loadContainerBatch', LoadContainerBatch.as_view(), name='loadContainerBatch'),
    
]
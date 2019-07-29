from django.urls import path, include
from .views import *
from rest_framework.routers import DefaultRouter

'''
router = DefaultRouter()
router.register(r'', NotificationViewSet, base_name='notification')

#router.register(r'institute/autocomplete', InstituteAutocompleteViewSet, base_name='institute')

urlpatterns = router.urls
'''

urlpatterns = [
    path('sendMail/', SendMail.as_view(), name='sendMail'),
]
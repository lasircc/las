from django.urls import path, include, re_path
from .views import *
from rest_framework.routers import DefaultRouter


router = DefaultRouter()
router.register(r'entities/(?P<dbcollection>[-\w]+)', EntityViewSet, base_name='dbcollection')
router.register(r'collections', CollectionViewSet, base_name='collections')


#router.register(r'institute/autocomplete', InstituteAutocompleteViewSet, base_name='institute')

urlpatterns = router.urls

urlpatterns += [
    re_path(r'^getIdentifier/$', GetIdentifier.as_view(), name="getidentifier")
]


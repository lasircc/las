"""LASAuthServer URL Configuration

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/2.1/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.contrib import admin
from django.urls import path, include, re_path
from django.views.defaults import permission_denied
from django.contrib.auth import views as auth_views

from rest_framework.permissions import AllowAny
from LASUtils.decorators import IsAdmin
from drf_yasg.views import get_schema_view
from drf_yasg import openapi
from django.conf import settings


schema_view = get_schema_view(
   openapi.Info(
      title="LAS API",
      default_version='v1',
      description="LAS API description",
      terms_of_service="https://www.google.com/policies/terms/",
      contact=openapi.Contact(email=settings.EMAIL_HOST_USER),
      license=openapi.License(name="BSD License"),
   ),
   #validators=['flex', 'ssv'],
   public=False,
   permission_classes=(IsAdmin,), 
   url =settings.HOST
)



urlpatterns = [
    path('', include('home.urls')),
    #path('admin/', LASAdmin.site.urls),
    path('user/', include('user.urls')),
    path('notification/', include('notification.urls')),
    path('datamodel/', include('datamodel.urls')),
    path('entity/', include('entity.urls')),
    path('private/', include('private.urls')),


    path('storage/', include('storage.urls', namespace='storage')),
    path('biobank/', include('biobank.urls', namespace='biobank')),
    path('pdx/', include('pdx.urls', namespace='pdx')),

    re_path(r'^accounts/changePwd/$', auth_views.PasswordChangeView.as_view(template_name='user/changePwd.html'), name='changePwd'),
    re_path(r'^accounts/changePwdDone/$', auth_views.PasswordChangeDoneView.as_view(template_name='user/changePwdDone.html'), name='password_change_done'),
    re_path(r'^accounts/password_reset/$', auth_views.PasswordResetView.as_view(template_name='user/password_reset.html'), name='password_reset'),
    re_path(r'^accounts/password_reset/done/$', auth_views.PasswordResetDoneView.as_view(template_name='user/password_reset_done.html'), name='password_reset_done'),
    path('accounts/reset/<uidb64>/<token>/', auth_views.PasswordResetConfirmView.as_view(template_name='user/password_reset_confirm.html'), name='password_reset_confirm'),
    re_path(r'^accounts/reset/done/$', auth_views.PasswordResetCompleteView.as_view(template_name='user/password_reset_complete.html'), name='password_reset_complete'),
    
    path('captcha/', include('captcha.urls')),
    path('loginas/', include('LASUtils.urls')),
   
    re_path(r'^forbidden/$', permission_denied),
  

    re_path(r'^swagger(?P<format>\.json|\.yaml)$', schema_view.without_ui(cache_timeout=None), name='schema-json'),
    path('swagger/', schema_view.with_ui('swagger', cache_timeout=None), name='schema-swagger-ui'),
    path('redoc/', schema_view.with_ui('redoc', cache_timeout=None), name='schema-redoc'),

]


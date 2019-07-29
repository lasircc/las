from django.urls import path
from .views import user_logout, other_login


app_name = 'loginas'

urlpatterns = [
    path("logout/", user_logout, name="loginas_logout"),
    path("loginasuser/", other_login, name="loginas_login"),
]

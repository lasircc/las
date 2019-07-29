from rest_framework import permissions
from django.contrib.auth.models import AnonymousUser
from .mongodb import db
#from django.contrib.auth.decorators import user_passes_test

from functools import wraps
from urllib.parse import urlparse

from django.conf import settings
from django.contrib.auth import REDIRECT_FIELD_NAME
from django.core.exceptions import PermissionDenied
from django.shortcuts import resolve_url


def lasadmin(view_func):
    def wrap(request, *args, **kwargs):
        autheticated = not isinstance(request.user, AnonymousUser) 
        if autheticated:
            try:
                if not db.user.find_one({'_id': request.user.username})['is_superuser']:
                    raise PermissionDenied
            except Exception as e:
                print (e)
                raise PermissionDenied
        else:
            raise PermissionDenied
        return view_func(request, *args, **kwargs)
    wrap.__doc__ = view_func.__doc__
    wrap.__name__ = view_func.__name__
    return wrap



def laspermission(perm, login_url=None, raise_exception=False, redirect_field_name=REDIRECT_FIELD_NAME):
    """
    Decorator for views that checks whether a user has a particular permission
    enabled, redirecting to the log-in page if necessary.
    If the raise_exception parameter is given the PermissionDenied exception
    is raised.
    """
    def check_perms(user):
        if isinstance(perm, str):
            perms = (perm,)
        else:
            perms = perm
        # First check if the user has the permission (even anon users)
        userProfile = db.user.find_one({'_id': user.username})
        print (userProfile, perms)

        for p in perms:
            if p not in userProfile['perm']['w'] or p in userProfile['perm']['b']:
                return False
        # In case the 403 handler should be called raise the exception
        if raise_exception:
            raise PermissionDenied
        # As the last resort, show the login form
        return True

    def decorator(view_func):
        @wraps(view_func)
        def _wrapped_view(request, *args, **kwargs):
            if check_perms(request.user):
                response = view_func(request, *args, **kwargs)
                if isinstance(perm, str):
                    perms = (perm,)
                else:
                    perms = perm
                response['LASPerm'] = ','.join(perms)
                return response
            path = request.build_absolute_uri()
            resolved_login_url = resolve_url(login_url or settings.LOGIN_URL)
            # If the login url is the same scheme and net location then just
            # use the path as the "next" url.
            login_scheme, login_netloc = urlparse(resolved_login_url)[:2]
            current_scheme, current_netloc = urlparse(path)[:2]
            if ((not login_scheme or login_scheme == current_scheme) and
                    (not login_netloc or login_netloc == current_netloc)):
                path = request.get_full_path()
            from django.contrib.auth.views import redirect_to_login
            return redirect_to_login(
                path, resolved_login_url, redirect_field_name)
        return _wrapped_view
    return decorator
    




class IsAuthenticated(permissions.BasePermission):
    message = 'User is not authenticated'

    def has_permission(self, request, view):
        return not isinstance(request.user, AnonymousUser) 


class IsAdmin(permissions.BasePermission):

    def has_permission(self, request, view):
        autheticated = not isinstance(request.user, AnonymousUser) 
        if autheticated:
            return request.user.is_superuser
        else:
            return False
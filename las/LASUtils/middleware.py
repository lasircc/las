from django.conf import settings
from django.utils import timezone

class ExtendUserSession:
    def __init__(self, get_response):
        self.get_response = get_response
        # One-time configuration and initialization.
    def __call__(self, request):
        # Code to be executed for each request before
        # the view (and later middleware) are called.
        userProfile = None
        if request.user.is_authenticated:
            now = timezone.now()
            if request.session.get_expiry_date() > now:
                request.session.set_expiry(settings.SESSION_COOKIE_AGE)

        response = self.get_response(request)

        # Code to be executed for each request/response after
        # the view is called.

        return response



 

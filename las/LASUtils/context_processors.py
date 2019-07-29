from .mongodb import db

def userProfile(request):
    if request.user.is_authenticated:
        userProfile = db.user.find_one({'_id': request.user.username})
    else:
        userProfile = None

    return {'userProfile': userProfile}
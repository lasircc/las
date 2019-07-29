from django.views import View
from django.shortcuts import render, redirect
from django.contrib.auth.decorators import login_required
from django.http import HttpResponse, HttpResponseRedirect, HttpResponseBadRequest, JsonResponse
from django.urls import reverse
from django.utils.decorators import method_decorator
from LASUtils.mongodb import db
import json

from .emails import *

@method_decorator([login_required], name='dispatch')
class SendMail(View):
    def get(self, request):
        try:
            wgList =  db.social.aggregate([{"$match": {"@type":"WG"}}, {"$lookup": { "from": "auth_user", "localField": 'users', "foreignField": 'username', "as": 'userList' }}])
            
            return render(request, 'centralMail.html',{'wgList':wgList})
        except Exception as e:
            print(e,'errorMail')
            return_dict = {"message": "error"}
            json_response = json.dumps(return_dict)
            return HttpResponse(json_response)
    
    def post(self, request):
        try:
            wgList =  db.social.aggregate([{"$match": {"@type":"WG"}}, {"$lookup": { "from": "auth_user", "localField": 'users', "foreignField": 'username', "as": 'userList' }}])
            print (request.POST, request.FILES)
            message=request.POST.get('message')
            subject=request.POST.get('subject')
            toRecipients=request.POST.get('toRecipients')
            ccRecipients=request.POST.get('ccRecipients')
            bccRecipients=request.POST.get('bccRecipients')
            percorso=request.POST.get('path')
            print (bccRecipients)
            bccList=set()
            for x in json.loads(bccRecipients):
                bccList.add(x)   
            subject=subject
            message=message
            
            email = EmailMessage(subject,message,"",[],list(bccList),"","","",[])
            for upfile in request.FILES.getlist('file'):
                filename = upfile.name
                email.attach(upfile.name, upfile.read(), upfile.content_type)
            
            email.send(fail_silently=False)
            
            return render(request, 'centralMail.html',{'wgList':wgList, "message":"ok"})
        except Exception as e:
            print(e)
            return render(request, 'centralMail.html',{'wgList':wgList, "message":"error"})

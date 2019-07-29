from django.conf import settings

from django.core.mail import EmailMultiAlternatives

from django.template.loader import get_template
import datetime
from LASUtils.mongodb import db, to_json

#from channels.layers import get_channel_layer
#from asgiref.sync import async_to_sync


#notification
class Notification(object):
    def __init__(self, _id= None, subject = None, message = '', html_msg='', sender =settings.EMAIL_HOST_USER, to=[], cc=[], bcc=[], priority = 'low', attach = [] ):
        self._id = _id
        self.subject = subject
        self.message = message
        self.html_msg = html_msg
        self.sender = sender
        self.to = to
        self.cc = cc
        self.bcc = bcc
        self.timestamp = datetime.datetime.now()
        self.priority = priority#  StringField(default='low', choices=( 'low', 'medium', 'high') )
        self.unreadBy = []
        self.trash = []
        self.attach = attach


    def send(self):
    
        email = EmailMultiAlternatives(
            subject=self.subject,
            body= self.message,
            from_email= settings.EMAIL_HOST_USER,
            to = self.to,
            cc = self.cc,
            bcc = self.bcc,
            reply_to=[self.sender]
        )
        html = get_template('email.html')
        d = { 'message': self.html_msg }
        html_content = html.render(d)

        email.attach_alternative(html_content, "text/html")

        for a in self.attach:
            email.attach(a.name, a.file.getvalue(), mimetypes.guess_type(a.name)[0])
        email.content_subtype = "html"
        print ('sending email')
        email.send(fail_silently=True)




'''
def publish_notification(notification):
    data = {
        'message': notification.message
    }

    print ('prepare email')

    html = get_template('email.html')
    d = { 'message': notification.message }
    html_content = html.render(d)
    
    email = EmailMultiAlternatives(
        subject=notification.subject,
        body= html_content,
        from_email= settings.EMAIL_HOST_USER,
        to = notification.to,
        cc = notification.cc,
        bcc = notification.bcc,
        reply_to=[notification.sender]
    )
    email.content_subtype = "html"
    print ('sending email')
    email.send(fail_silently=True)



class Notification(object):


    def __init__(self, _id = None, subject = None, message = '', sender =settings.EMAIL_HOST_USER, to=[], cc=[], bcc=[], priority = 'low', attach = [] ):
        self._id = _id
        self.subject = subject
        self.message = message
        self.sender = sender
        self.to = to
        self.cc = cc
        self.bcc = bcc
        self.timestamp = datetime.datetime.now()
        self.priority = priority#  StringField(default='low', choices=( 'low', 'medium', 'high') )
        self.unreadBy = []
        self.trash = []
        self.attach = attach
        

    
    def save(self, session, send_email = True):
        try:
            print ('saving notification', send_email, self.__dict__)
            if self._id is None:  # Only publish the notification if it's a new one
                del self._id
                print (self)
                print ('insert notification')
                self.unreadBy = list(set(self.to + self.cc + self.bcc))
                db.notification.insert_one(self.__dict__, session=session)
                print ('inserted notification')
                internalUsers = db['user'].find({'email': {'$in': self.unreadBy}})
                print ('intrnalUsers', internalUsers)
                #channel_layer = get_channel_layer()
                for u in internalUsers:
                    chat = "user-" + str(u['_id'])
                    print ('channel ', chat)
                    #async_to_sync(channel_layer.group_send)(chat, {'type': 'chat_message','message': self.subject})
                if send_email:
                    publish_notification(self)
                    print ('notification published')

            else:
                print ('update')
        except Exception as e:
            print ('Error save notification ', e)
'''
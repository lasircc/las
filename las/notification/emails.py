import django.core.mail
from django.core.mail import EmailMultiAlternatives

from django.template.loader import get_template
import mimetypes
from django.conf import settings
import datetime

class EmailMessage(django.core.mail.EmailMessage):
    def send(self, fail_silently=False):
        MAX_RECIPIENTS = 50
        # N.B. the following assumes that to, cc and bcc are never used together, which is true *in the context of LAS*
        attrs = ['to', 'cc', 'bcc']
        for split_attr in attrs:
            if len(self.__dict__[split_attr]) > MAX_RECIPIENTS:
                break
        else:
            split_attr = None
        if split_attr:
            full_list = self.__dict__[split_attr]
            cnt = 0
            while cnt < len(full_list):
                 batch_size = min(MAX_RECIPIENTS, len(full_list) - cnt)
                 self.__dict__[split_attr] = full_list[cnt:cnt+batch_size]
                 super(EmailMessage, self).send(fail_silently)
                 cnt += batch_size
            self.__dict__[split_attr] = full_list
        else:
            super(EmailMessage, self).send(fail_silently)


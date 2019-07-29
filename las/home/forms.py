from django import forms
from .models import *
from captcha.fields import CaptchaField

class LoginForm(forms.Form):
    username = forms.CharField(max_length=30)
    password = forms.PasswordInput()


class CaptchaForm(forms.Form):
    """Form to add captchas during the registration process. Since the registration form is managed
    in a custom way (directly in the template), this form must be used in addition to the customised
    registration form"""
    
    captcha = CaptchaField(label="")
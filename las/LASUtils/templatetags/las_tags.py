from django import template

register = template.Library()


@register.filter(name='oid')
def oid(obj):
    return str(obj['_id'])
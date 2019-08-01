from django import template

register = template.Library()


@register.filter
def get_dict_item(dictionary, key):
    '''
    Oddly enough, Django templates cannot look up a dictionary value with a variable
    This custom filter does the trick.
    See:
     - https://stackoverflow.com/a/8000078/4820341
     - https://docs.djangoproject.com/en/dev/howto/custom-template-tags/#writing-custom-template-tags
    '''
    return dictionary.get(key) # use get to return None for no match (avoiding KeyError)


@register.filter
def get_class(value):
     '''
     This returns the class of an instance
     '''
     return value.__class__.__name__


@register.filter
def get_items_in_dict_of_lists(dictionary, value):
     '''
     This returns key of the list containing the value
     '''
     keys = list()
     for k,v in dictionary.items():
          if value in v:
               keys.append(k)
     return keys
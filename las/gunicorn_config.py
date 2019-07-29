# gunicorn WSGI server configuration
# You can specify the config file with .ini or a python script.
# E.g.,
#
# from multiprocessing import cpu_count
# from os import environ
#
# def max_workers():    
#     return cpu_count()
#
# workers = max_workers()
#

bind = "0.0.0.0:8000"
workers = 4 # See: http://docs.gunicorn.org/en/stable/design.html#how-many-workers


import os

from celery import Celery


# set the default Django settings module for the 'celery' program.
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'LAS.settings')

from django.conf import settings  # noqa

app = Celery('LAS')

# Using a string here means the worker will not have to
# pickle the object when using Windows.
app.config_from_object('django.conf:settings', namespace='CELERY')
app.autodiscover_tasks(lambda: settings.INSTALLED_APPS)
app.conf.update(
    task_routes = {
        'createPerm': {'queue': 'las'},
    },
)


@app.task(bind=True)
def debug_task(self):
    print(('Request: {0!r}'.format(self.request)))
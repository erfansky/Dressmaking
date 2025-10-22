from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path('admin/', admin.site.urls),

    # API routes from dreesapp
    path('', include('dressapp.urls', namespace='dressapp')),

    # Optional: browsable API login/logout
    path('api-auth/', include('rest_framework.urls')),
]

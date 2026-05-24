from django.urls import path
from . import views

urlpatterns = [
    path('', views.landing_view, name='landing'),
    path('entry/', views.entry_view, name='entry'),
    path('logout/', views.logout_view, name='logout'),
    path('api/explore/', views.api_explore_spots, name='api_explore'),
    path('api/itinerary/', views.api_generate_itinerary, name='api_itinerary'),
]

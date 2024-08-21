from django.urls import path
from . import views

urlpatterns = [
    path('', views.index, name='index'),
    path('login/', views.login, name='login'),
    path('register/', views.register, name='register'),
    path('forget-password/', views.forget_password, name='forget_password'),
    path('reset-password/<uidb64>/<token>/', views.reset_password, name='reset_password'),
    path('activate/', views.activate, name='activate'),
    path('main/', views.main, name='main'),
    path('start_new_session/', views.start_new_session, name='start_new_session'),
    path('send_message/', views.send_message, name='send_message'),
    path('update_session_title/', views.update_session_title, name='update_session_title'),
    path('delete_session/<int:session_id>/', views.delete_session, name='delete_session'),
    path('load_chat_history/<int:session_id>/', views.load_chat_history, name='load_chat_history'),
    path('load_chat_sessions/', views.load_chat_sessions, name='load_chat_sessions'),

    # Document management
    path('document_management/delete/<int:file_id>/', views.delete_file, name='delete_file'),
    path('document_management/view/<int:file_id>/', views.view_file, name='view_file'),
    path('document_management/download/<int:file_id>/', views.download_file, name='download_file'),
    path('document_management/upload/', views.upload_file, name='upload_file'),
    path('document_management/', views.upload_file, name='document_management'),  # Ensure this line is included
]

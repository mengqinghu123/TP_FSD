
import uuid
from django.conf import settings
from django.core.mail import send_mail
from django.shortcuts import render, redirect, get_object_or_404
from django.contrib.auth import authenticate, login as auth_login
from django.contrib.auth.decorators import login_required

from django.template.loader import render_to_string
from django.utils.http import urlsafe_base64_encode, urlsafe_base64_decode
from django.utils.encoding import force_bytes
from rest_framework.authtoken.models import Token
from django.contrib import messages


from django.utils.encoding import force_str
from django.utils.http import urlsafe_base64_decode
from django.contrib.auth.tokens import default_token_generator

from django.contrib.auth import authenticate, login, logout

from .models import ChatSession, Message, User
from django.views.decorators.csrf import csrf_exempt
import json

from django.http import JsonResponse, FileResponse
from django.contrib.auth.decorators import login_required
from django.core.paginator import Paginator
from django.shortcuts import render


def index(request):
    return render(request, 'index.html')


def forget_password(request):
    if request.method == 'POST':
        email = request.POST['email']
        user = get_object_or_404(User, email=email)
        token = default_token_generator.make_token(user)
        uid = urlsafe_base64_encode(force_bytes(user.pk))
        reset_url = request.build_absolute_uri(f'/reset-password/{uid}/{token}/')

        subject = "Reset your password"
        message = render_to_string('reset_email.html', {
            'user': user,
            'reset_url': reset_url,
        })
        send_mail(subject, message, settings.EMAIL_HOST_USER, [email], html_message=message)

        messages.success(request, 'Password reset email has been sent.')
        return redirect('login')
    return render(request, 'forgetPassword.html')


def reset_password(request, uidb64, token):
    if request.method == 'POST':
        password = request.POST.get('password')
        confirm_password = request.POST.get('confirmPassword')

        if password != confirm_password:
            messages.error(request, "Passwords do not match.")
            return redirect('reset_password', uidb64=uidb64, token=token)

        try:
            uid = force_str(urlsafe_base64_decode(uidb64))
            user = User.objects.get(pk=uid)
        except (TypeError, ValueError, OverflowError, User.DoesNotExist):
            user = None

        if user is not None and default_token_generator.check_token(user, token):
            user.set_password(password)
            user.save()
            messages.success(request, 'Your password has been reset successfully. You can now log in.')
            return redirect('login')
        else:
            messages.error(request, 'The reset password link is invalid.')
            return redirect('forget_password')

    return render(request, 'resetPassword.html', {'uidb64': uidb64, 'token': token})

def login(request):
    if request.method == 'POST':
        email = request.POST['email']
        password = request.POST['password']

        user = authenticate(username=email, password=password)
        if user is not None:
            auth_login(request, user)
            token, created = Token.objects.get_or_create(user=user)
            response = redirect('main')
            response.set_cookie('token', token.key)
            return response
        else:
            messages.error(request, 'Invalid email or password. Please try again.')
            return render(request, 'login.html')
    else:
        return render(request, 'login.html')

token_dict = {}

def register(request):
    if request.method == 'POST':
        first_name = request.POST['FirstName']
        last_name = request.POST['LastName']
        email = request.POST['email']
        password = request.POST['password']
        confirm_password = request.POST['confirmPassword']

        errors = []

        if password != confirm_password:
            errors.append("Passwords do not match.")

        if User.objects.filter(email=email).exists():
            errors.append("Email is already registered.")

        if errors:
            for error in errors:
                messages.error(request, error)
            return render(request, 'register.html')

        user = User.objects.create_user(email=email, password=password, first_name=first_name, last_name=last_name)
        user.is_active = False
        user.save()
        token = str(uuid.uuid4()).replace('-', '')
        token_dict[token] = user.id
        path = 'http://127.0.0.1:8000/activate?token={}'.format(token)

        subject = "Verify your email"
        message = '''
        <a href="{}">Verify your email</a>
        If the link does not work, please copy and paste the following URL into your browser: {}
        '''.format(path, path)

        send_mail(subject=subject, message=message, from_email=settings.EMAIL_HOST_USER, recipient_list=[email], html_message=message)

        messages.success(request, 'Registration successful. Check your email to verify your account.')
        return redirect('login')
    else:
        return render(request, 'register.html')

def activate(request):
    token = request.GET.get('token')
    uid = token_dict.get(token)
    if uid:
        user = User.objects.get(pk=uid)
        user.is_active = True
        user.save()
        del token_dict[token]
        messages.success(request, 'Your email has been verified. You can now log in.')
        return redirect('login')
    else:
        messages.error(request, 'Invalid activation link.')
        return redirect('index')

# 聊天配置
def main(request):
    context = {
        'is_admin': request.user.is_admin  # 根据用户的 is_admin 属性传递给模板
    }
    return render(request, 'main.html', context)


@login_required
@csrf_exempt
def start_new_session(request):
    if request.method == 'POST':
        session = ChatSession.objects.create(user=request.user, session_title="New Session")
        return JsonResponse({'id': session.id, 'session_title': session.session_title})
    return JsonResponse({'error': 'Invalid request'}, status=400)


@login_required
@csrf_exempt
def send_message(request):
    if request.method == 'POST':
        data = json.loads(request.body)
        content = data.get('content')
        session_id = data.get('session_id')
        sender_type = data.get('sender_type')
        session = ChatSession.objects.get(id=session_id, user=request.user)

        if sender_type == 'user':
            # 保存用户发送的消息
            message = Message.objects.create(session=session, sender=request.user.email, content=content, sender_type='user')

            # 模拟机器人响应
            bot_response = "This is a bot response."
            bot_message = Message.objects.create(session=session, sender="FSD Bot", content=bot_response, sender_type='bot')

            return JsonResponse({
                'user_message': {'id': message.id, 'content': message.content, 'sender': message.sender, 'timestamp': message.timestamp},
                'bot_message': {'id': bot_message.id, 'content': bot_message.content, 'sender': bot_message.sender, 'timestamp': bot_message.timestamp},
            })
        else:
            return JsonResponse({'error': 'Invalid sender type'}, status=400)

    return JsonResponse({'error': 'Invalid request'}, status=400)

@login_required
@csrf_exempt
def update_session_title(request):
    if request.method == 'POST':
        data = json.loads(request.body)
        session_id = data.get('session_id')
        title = data.get('title')
        session = ChatSession.objects.get(id=session_id, user=request.user)
        session.session_title = title
        session.save()
        return JsonResponse({'success': True})
    return JsonResponse({'error': 'Invalid request'}, status=400)

@login_required
@csrf_exempt
def delete_session(request, session_id):
    if request.method == 'DELETE':
        session = ChatSession.objects.get(id=session_id, user=request.user)
        session.delete()
        return JsonResponse({'success': True})
    return JsonResponse({'error': 'Invalid request'}, status=400)

@login_required
def load_chat_history(request, session_id):
    session = ChatSession.objects.get(id=session_id, user=request.user)
    messages = session.messages.all()
    message_list = [
        {'content': msg.content, 'sender': msg.sender, 'timestamp': msg.timestamp, 'sender_type': msg.sender_type}
        for msg in messages
    ]
    return JsonResponse({'messages': message_list})


@login_required
def load_chat_sessions(request):
    sessions = ChatSession.objects.filter(user=request.user)
    session_list = [{'id': session.id, 'session_title': session.session_title} for session in sessions]
    return JsonResponse(session_list, safe=False)


from django.shortcuts import render, redirect, get_object_or_404
from django.http import HttpResponse, FileResponse
from .models import UploadedFile
from django.views.decorators.http import require_http_methods
import os


def upload_file(request):
    if request.method == 'POST':
        uploaded_file = request.FILES['fileUpload']
        file_instance = UploadedFile(name=uploaded_file.name, file=uploaded_file)
        file_instance.save()
        return redirect('upload_file')

    files = UploadedFile.objects.all().order_by('-uploaded_at')
    paginator = Paginator(files, 10)  # Show 10 files per page
    page_number = request.GET.get('page')
    page_obj = paginator.get_page(page_number)

    return render(request, 'uploadFile.html', {'files': page_obj})
def view_file(request, file_id):
    file = get_object_or_404(UploadedFile, id=file_id)
    return FileResponse(file.file, as_attachment=False)


def download_file(request, file_id):
    file = get_object_or_404(UploadedFile, id=file_id)
    return FileResponse(file.file, as_attachment=True, filename=file.name)


def delete_file(request, file_id):
    file = get_object_or_404(UploadedFile, id=file_id)
    os.remove(file.file.path)
    file.delete()
    return redirect('upload_file')
